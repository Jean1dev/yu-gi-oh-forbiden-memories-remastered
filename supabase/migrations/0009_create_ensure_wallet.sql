-- password/F01 — Wallet creation on signup.
--
-- `wallets` (0008) is adopted as-is: no table change, no RLS change. This
-- migration only adds `ensure_wallet`, the idempotent bootstrap RPC
-- `onAccountCreated` calls alongside `persist_initial_deck`.
--
-- Unlike `apply_victory_reward` (0008), whose `p_stars` is the server's own
-- computed reward, this RPC's `p_initial_stars` is chosen by the caller
-- before the call — the same shape `persist_initial_deck` (0004) has, and the
-- same reason it is restricted to `service_role`: an ordinary client able to
-- call this directly could choose its own starting balance and mint stars.
-- `EXECUTE` is therefore revoked from `public`/`anon`/`authenticated` and
-- granted only to `service_role`, deliberately more restrictive than
-- `apply_victory_reward`.
--
-- `SET search_path = public, pg_temp` pins name resolution for this
-- SECURITY DEFINER function, the same rule every prior SECURITY DEFINER
-- function in this schema follows.
create or replace function public.ensure_wallet(p_player_id uuid, p_initial_stars integer)
returns table (stars integer, created_now boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_stars integer;
begin
  if p_initial_stars < 0 then
    raise exception 'ensure_wallet: p_initial_stars must be non-negative';
  end if;

  insert into public.wallets (player_id, stars)
  values (p_player_id, p_initial_stars)
  on conflict (player_id) do nothing;

  if found then
    return query select p_initial_stars, true;
  else
    select w.stars into v_stars
    from public.wallets w
    where w.player_id = p_player_id;

    return query select v_stars, false;
  end if;
end;
$$;

-- Every newly created function grants EXECUTE to PUBLIC by default in
-- Postgres — revoke it explicitly before granting only to the trusted
-- execution role, the same rule `persist_initial_deck` (0004) follows.
revoke execute on function public.ensure_wallet(uuid, integer) from public;
revoke execute on function public.ensure_wallet(uuid, integer) from authenticated;
revoke execute on function public.ensure_wallet(uuid, integer) from anon;
grant execute on function public.ensure_wallet(uuid, integer) to service_role;
