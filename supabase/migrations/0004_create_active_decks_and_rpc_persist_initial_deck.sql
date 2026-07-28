-- build-deck/F02 — Signup deck generation.
--
-- `active_decks` holds the player's single active deck: one row per player,
-- `cards jsonb` in the same `numero -> quantity` shape as `collections`
-- (spec build-deck/F02 §5). F07 will later overwrite `cards` on every save;
-- this migration only creates the table it inherits.
--
-- Written straight into its final shape (table + RLS + RPC + grants) in one
-- migration, instead of discovering the grant gap live like 0002/0003 did:
-- this project's `public` schema ships with no default privilege grants to
-- `anon`/`authenticated`/`service_role` on new objects (confirmed against the
-- `yugioh` test project during build-deck/F01), and Postgres checks
-- table/routine-level privilege *before* RLS or `SECURITY DEFINER` even runs.
create table if not exists public.active_decks (
  player_id uuid primary key references auth.users (id) on delete cascade,
  cards jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.active_decks enable row level security;

-- Each player reads only their own row. No write policy is created: the only
-- writer is `persist_initial_deck` below, a SECURITY DEFINER RPC whose EXECUTE
-- grant excludes `authenticated`/`anon` entirely (Decision 11) — a direct
-- client INSERT/UPDATE/DELETE has no policy to satisfy either way.
create policy "active_decks_select_own"
  on public.active_decks
  for select
  to authenticated
  using (player_id = auth.uid());

grant select on public.active_decks to authenticated;
grant select, insert, update, delete on public.active_decks to service_role;

-- Persists the signup deck atomically: inserts `active_decks` and, only when
-- that insert actually happens, sums `cards` into `collections` in the same
-- transaction (spec build-deck/F02 §5, §3 step 13). `ON CONFLICT (player_id)
-- DO NOTHING` is both the idempotency guard (a second call for a player who
-- already has a deck is a no-op) and the race guard (two concurrent calls for
-- the same player: exactly one inserts, the other reads back what the first
-- one wrote) — `FOUND` after the INSERT tells the two cases apart.
--
-- Validates `p_cards` structurally before writing anything: every key a
-- three-digit card number, every value an integer 1-3, total exactly 40.
-- Defense in depth (spec Decision 11) — the EXECUTE grant below already keeps
-- ordinary clients out, but a forged payload from the trusted caller itself
-- (a bug, not an attack) still can't corrupt the table.
--
-- `SET search_path = public, pg_temp` pins name resolution for this
-- SECURITY DEFINER function so a `public` schema object crafted by an
-- unprivileged role can never shadow what this function calls.
create or replace function public.persist_initial_deck(p_player_id uuid, p_cards jsonb)
returns table (created_now boolean, cards jsonb)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text;
  v_value text;
  v_quantity integer;
  v_total integer := 0;
begin
  for v_key, v_value in select "key", "value" from jsonb_each_text(p_cards)
  loop
    if v_key !~ '^[0-9]{3}$' then
      raise exception 'persist_initial_deck: invalid card number %', v_key;
    end if;

    v_quantity := v_value::integer;
    if v_quantity < 1 or v_quantity > 3 then
      raise exception 'persist_initial_deck: invalid quantity % for card %', v_quantity, v_key;
    end if;

    v_total := v_total + v_quantity;
  end loop;

  if v_total <> 40 then
    raise exception 'persist_initial_deck: total must be exactly 40, got %', v_total;
  end if;

  insert into public.active_decks (player_id, cards)
  values (p_player_id, p_cards)
  on conflict (player_id) do nothing;

  if found then
    insert into public.collections (player_id, numero, quantity)
    select p_player_id, entry."key", entry."value"::integer
    from jsonb_each_text(p_cards) as entry
    on conflict (player_id, numero)
    do update set quantity = public.collections.quantity + excluded.quantity,
                  updated_at = now();

    return query select true, p_cards;
  else
    return query
      select false, ad.cards
      from public.active_decks ad
      where ad.player_id = p_player_id;
  end if;
end;
$$;

-- Every newly created function grants EXECUTE to PUBLIC by default in
-- Postgres — revoke it explicitly before granting only to the trusted
-- execution role (Decision 11): the deck's content is computed by the caller
-- before this RPC runs, unlike a reward RPC where the server decides the
-- card, so an ordinary client calling this directly could persist a forged
-- (non-random) deck that still passes the structural check above.
revoke execute on function public.persist_initial_deck(uuid, jsonb) from public;
revoke execute on function public.persist_initial_deck(uuid, jsonb) from authenticated;
revoke execute on function public.persist_initial_deck(uuid, jsonb) from anon;
grant execute on function public.persist_initial_deck(uuid, jsonb) to service_role;
