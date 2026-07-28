-- build-deck/F03 — Reward: add a card to the collection.
--
-- `reward_ledger` is the idempotency mechanism the feature's Capability
-- requires ("cada evento de recompensa é aplicado exatamente uma vez"): one
-- row per reward/duel identifier, `duel_id` as primary key. Only `duel_id`,
-- `player_id` and `card_numero` are written by this feature; `stars` keeps
-- its `DEFAULT 0` and is never read nor written here (spec build-deck/F03,
-- Decision 3) — it is reserved for whichever future feature unifies the
-- `onVictory` handler across `free-duel` and `password`
-- (`docs/arquitetura.md` §5.3, ADR-006 needs-input).
--
-- `card_numero` keeps the column name from the canonical card schema
-- (`docs/arquitetura.md` §5.1), same rule `collections.numero` already
-- follows: it identifies a card, not a name this feature is free to
-- translate.
--
-- Written straight into its final shape (table + RLS + RPC + grants) in one
-- migration, applying the grant lesson learned live in build-deck/F01/F02:
-- this project's `public` schema ships with no default privilege grants to
-- `anon`/`authenticated`/`service_role` on new objects, and Postgres checks
-- table/routine-level privilege *before* RLS or `SECURITY DEFINER` even runs.
create table if not exists public.reward_ledger (
  duel_id text primary key,
  player_id uuid not null references auth.users (id) on delete cascade,
  card_numero text not null check (card_numero ~ '^[0-9]{3}$'),
  stars integer not null default 0 check (stars >= 0),
  applied_at timestamptz not null default now()
);

alter table public.reward_ledger enable row level security;

-- Each player reads only their own rows (enables a future reward-history
-- screen, not required yet). No write policy is created: the only writer is
-- `apply_card_reward` below, a SECURITY DEFINER RPC — a direct client
-- INSERT/UPDATE/DELETE has no policy to satisfy either way.
create policy "reward_ledger_select_own"
  on public.reward_ledger
  for select
  to authenticated
  using (player_id = auth.uid());

grant select on public.reward_ledger to authenticated;
grant select, insert, update, delete on public.reward_ledger to service_role;

-- Applies one card reward atomically and idempotently by `duel_id` (spec
-- build-deck/F03 §5): tries to insert `reward_ledger`; only when that insert
-- actually happens (`FOUND`) does it increment `collections`, in the same
-- transaction. A repeated `duel_id` hits the `PRIMARY KEY` and is absorbed by
-- `ON CONFLICT ... DO NOTHING`, never surfaced as an error to the caller —
-- concurrent calls for the same `duel_id` (two devices, or a retry) resolve
-- to exactly one applying and the rest reading back the current quantity
-- (spec Decision 4, "Concorrência entre dispositivos").
--
-- Unlike `persist_initial_deck` (whose caller computes the full deck content
-- before the RPC runs, so only `service_role` may call it), this RPC's only
-- input is a single card credit: `numeroCarta` is a credit, never a debit
-- (spec Decision 10) — it only ever adds a copy to the caller's own
-- collection, under their own `auth.uid()`, and can't spend or forge a
-- balance. It is safe to grant `EXECUTE` to `authenticated` directly, so
-- `apps/web` can call it from the player's own session without a
-- service-role hop (spec build-deck/F03 §3, step 4).
--
-- `SET search_path = public, pg_temp` pins name resolution for this
-- SECURITY DEFINER function, same rule `persist_initial_deck` follows.
create or replace function public.apply_card_reward(
  p_player_id uuid,
  p_duel_id text,
  p_card_numero text
)
returns table (applied boolean, current_quantity integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quantity integer;
begin
  insert into public.reward_ledger (duel_id, player_id, card_numero)
  values (p_duel_id, p_player_id, p_card_numero)
  on conflict (duel_id) do nothing;

  if found then
    insert into public.collections (player_id, numero, quantity)
    values (p_player_id, p_card_numero, 1)
    on conflict (player_id, numero)
    do update set quantity = public.collections.quantity + 1, updated_at = now();

    select c.quantity into v_quantity
    from public.collections c
    where c.player_id = p_player_id and c.numero = p_card_numero;

    return query select true, v_quantity;
  else
    select c.quantity into v_quantity
    from public.collections c
    where c.player_id = p_player_id and c.numero = p_card_numero;

    return query select false, coalesce(v_quantity, 0);
  end if;
end;
$$;

revoke execute on function public.apply_card_reward(uuid, text, text) from public;
revoke execute on function public.apply_card_reward(uuid, text, text) from anon;
grant execute on function public.apply_card_reward(uuid, text, text) to authenticated;
grant execute on function public.apply_card_reward(uuid, text, text) to service_role;
