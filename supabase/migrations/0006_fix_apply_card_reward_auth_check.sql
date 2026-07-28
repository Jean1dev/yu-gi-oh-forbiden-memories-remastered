-- build-deck/F03 — closes a broken-access-control gap in `apply_card_reward`
-- found in code review of the PR that introduced it (0005): the function is
-- `security definer` (bypasses RLS entirely) and its `EXECUTE` grant includes
-- `authenticated`, but the body never checked that `p_player_id` matches the
-- caller's own session. Any authenticated user could call the RPC directly
-- (supabase-js/PostgREST, not just through `apps/web`) with an arbitrary
-- UUID as `p_player_id` and credit a card to another player's `collections`
-- row, or forge a `reward_ledger` row under someone else's identity.
--
-- `apps/web` (`createSupabaseRewardRepository`) already only ever passes the
-- caller's own id (`getAuthenticatedPlayerId`), so this guard changes nothing
-- for the honest path — it only closes the direct-RPC-call attack surface.
-- Kept `p_player_id` as an explicit parameter rather than dropping it in
-- favor of reading `auth.uid()` internally: this is a whole-function
-- `create or replace`, so it doubles as the smallest possible diff against
-- 0005 and keeps the client-side call shape unchanged.
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
  if p_player_id <> auth.uid() then
    raise exception 'permission denied: p_player_id must match the caller''s own session';
  end if;

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

-- `create or replace function` preserves the existing grants (0005 already
-- granted EXECUTE to `authenticated` and revoked it from `public`/`anon`), so
-- no grant/revoke statements are repeated here.
