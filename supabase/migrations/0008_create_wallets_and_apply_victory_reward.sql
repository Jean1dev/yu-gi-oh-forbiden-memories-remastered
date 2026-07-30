-- free-duel/F07 — one persistent wallet and one atomic victory reward.
create table if not exists public.wallets (
  player_id uuid primary key references auth.users (id) on delete cascade,
  stars integer not null default 0 check (stars >= 0),
  updated_at timestamptz not null default now()
);

alter table public.wallets enable row level security;

create policy "wallets_select_own"
  on public.wallets
  for select
  to authenticated
  using (player_id = auth.uid());

grant select on public.wallets to authenticated;
grant select, insert, update, delete on public.wallets to service_role;

create or replace function public.apply_victory_reward(
  p_player_id uuid,
  p_duel_id text,
  p_card_numero text,
  p_stars integer
)
returns table (applied boolean, card_quantity integer, wallet_stars integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_card_quantity integer;
  v_wallet_stars integer;
begin
  if p_player_id <> auth.uid() then
    raise exception 'permission denied: p_player_id must match the caller''s own session';
  end if;

  if p_stars < 0 then
    raise exception 'p_stars must be non-negative';
  end if;

  insert into public.reward_ledger (duel_id, player_id, card_numero, stars)
  values (p_duel_id, p_player_id, p_card_numero, p_stars)
  on conflict (duel_id) do nothing;

  if found then
    insert into public.collections (player_id, numero, quantity)
    values (p_player_id, p_card_numero, 1)
    on conflict (player_id, numero)
    do update set quantity = public.collections.quantity + 1, updated_at = now()
    returning quantity into v_card_quantity;

    insert into public.wallets (player_id, stars)
    values (p_player_id, p_stars)
    on conflict (player_id)
    do update set stars = public.wallets.stars + excluded.stars, updated_at = now()
    returning stars into v_wallet_stars;

    return query select true, v_card_quantity, v_wallet_stars;
  else
    select c.quantity into v_card_quantity
    from public.collections c
    where c.player_id = p_player_id and c.numero = p_card_numero;

    select w.stars into v_wallet_stars
    from public.wallets w
    where w.player_id = p_player_id;

    return query select false, coalesce(v_card_quantity, 0), coalesce(v_wallet_stars, 0);
  end if;
end;
$$;

revoke execute on function public.apply_victory_reward(uuid, text, text, integer) from public;
revoke execute on function public.apply_victory_reward(uuid, text, text, integer) from anon;
grant execute on function public.apply_victory_reward(uuid, text, text, integer) to authenticated;
grant execute on function public.apply_victory_reward(uuid, text, text, integer) to service_role;
