-- build-deck/F07 — Save and persist the active deck.
--
-- `active_decks` already exists (build-deck/F02, migration
-- 0004_create_active_decks_and_rpc_persist_initial_deck.sql) with RLS and a
-- `select`-only policy for the owning player. This migration adds a second
-- writer function, `save_active_deck`, whose `EXECUTE` grant deliberately
-- includes `authenticated` — unlike `persist_initial_deck` (Decision 4 of the
-- spec): the deck's content here is the player's own legitimate choice, not
-- something that must be provably random, so the defense is validating the
-- choice (structure + ownership), not restricting who may call the function.
--
-- Because this function is `SECURITY DEFINER` *and* callable directly by
-- `authenticated`, it carries the same broken-access-control risk that
-- `apply_card_reward` shipped with in 0005 and had to be patched for in 0006
-- (an authenticated caller could pass an arbitrary `p_player_id` and
-- overwrite another player's deck). The `p_player_id = auth.uid()` guard
-- below is written in from the start this time instead of being a follow-up
-- fix.
create or replace function public.save_active_deck(p_player_id uuid, p_cards jsonb)
returns table (updated_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text;
  v_value text;
  v_quantity integer;
  v_owned integer;
  v_total integer := 0;
begin
  if p_player_id <> auth.uid() then
    raise exception 'permission denied: p_player_id must match the caller''s own session';
  end if;

  -- Structural validation (spec Decision 5): every key a three-digit card
  -- number, every value an integer 1-3, total exactly 40 — the same checkup
  -- `persist_initial_deck` already does for the signup deck.
  for v_key, v_value in select "key", "value" from jsonb_each_text(p_cards)
  loop
    if v_key !~ '^[0-9]{3}$' then
      raise exception 'save_active_deck: invalid deck, malformed card number %', v_key;
    end if;

    v_quantity := v_value::integer;
    if v_quantity < 1 or v_quantity > 3 then
      raise exception 'save_active_deck: invalid deck, invalid quantity % for card %', v_quantity, v_key;
    end if;

    v_total := v_total + v_quantity;
  end loop;

  if v_total <> 40 then
    raise exception 'save_active_deck: invalid deck, total must be exactly 40, got %', v_total;
  end if;

  -- Ownership validation (spec Decision 6): the player can only save copies
  -- they actually own in `collections` — defense in depth against a client
  -- that bypasses F06's own client-side check.
  for v_key, v_value in select "key", "value" from jsonb_each_text(p_cards)
  loop
    v_quantity := v_value::integer;
    select quantity into v_owned
    from public.collections
    where player_id = p_player_id and numero = v_key;

    if v_quantity > coalesce(v_owned, 0) then
      raise exception 'save_active_deck: invalid deck, quantity % for card % exceeds owned quantity %',
        v_quantity, v_key, coalesce(v_owned, 0);
    end if;
  end loop;

  -- Single active deck, always overwritten (spec: "1 deck unico, sempre
  -- sobrescrito") — the RPC never rejects on `updated_at` staleness; the
  -- last valid write always wins (spec Decision 2).
  insert into public.active_decks (player_id, cards, updated_at)
  values (p_player_id, p_cards, now())
  on conflict (player_id) do update
    set cards = excluded.cards,
        updated_at = excluded.updated_at;

  return query
    select ad.updated_at
    from public.active_decks ad
    where ad.player_id = p_player_id;
end;
$$;

-- Every newly created function grants EXECUTE to PUBLIC by default in
-- Postgres — revoke it explicitly, same rule every prior migration in this
-- project follows, before granting only to the roles that should call it.
revoke execute on function public.save_active_deck(uuid, jsonb) from public;
revoke execute on function public.save_active_deck(uuid, jsonb) from anon;
grant execute on function public.save_active_deck(uuid, jsonb) to authenticated;
grant execute on function public.save_active_deck(uuid, jsonb) to service_role;
