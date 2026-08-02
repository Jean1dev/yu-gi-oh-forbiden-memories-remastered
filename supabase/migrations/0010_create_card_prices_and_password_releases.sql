create table public.card_prices (
  numero text primary key check (numero ~ '^[0-9]{3}$'),
  password_digits text not null unique check (password_digits ~ '^[0-9]{8}$'),
  stars integer not null check (stars >= 0), dataset_version text not null
);
alter table public.card_prices enable row level security;
revoke all on public.card_prices from anon, authenticated;
grant select, insert, update, delete on public.card_prices to service_role;

create table public.password_releases (
  redemption_id uuid primary key, player_id uuid not null references auth.users(id) on delete cascade,
  numero text not null, stars_spent integer not null check (stars_spent >= 0), dataset_version text not null,
  created_at timestamptz not null default now()
);
create index password_releases_player_created_idx on public.password_releases(player_id, created_at desc);
alter table public.password_releases enable row level security;
create policy "password_releases_select_own" on public.password_releases for select to authenticated using (player_id = auth.uid());
grant select on public.password_releases to authenticated;
grant all on public.password_releases to service_role;

create or replace function public.redeem_card_by_password(p_player_id uuid, p_redemption_id uuid, p_password text, p_expected_numero text, p_expected_stars integer)
returns table(status text, card_numero text, stars_spent integer, wallet_stars integer, card_quantity integer, dataset_version text, redeemed_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_price public.card_prices%rowtype; v_release public.password_releases%rowtype; v_stars integer; v_quantity integer;
begin
  if p_player_id <> auth.uid() then raise exception 'permission denied: p_player_id must match the caller''s own session'; end if;
  select * into v_price from public.card_prices where password_digits = regexp_replace(p_password, '\\s', '', 'g');
  if not found then return query select 'unknown_password', p_expected_numero, null::integer, null::integer, null::integer, null::text, null::timestamptz; return; end if;
  if v_price.numero <> p_expected_numero or v_price.stars <> p_expected_stars then return query select 'preview_mismatch', v_price.numero, v_price.stars, null::integer, null::integer, v_price.dataset_version, null::timestamptz; return; end if;
  select * into v_release from public.password_releases where redemption_id = p_redemption_id;
  if found then
    if v_release.player_id <> p_player_id then raise exception 'redemption belongs to another player'; end if;
    select stars into v_stars from public.wallets where player_id=p_player_id; select quantity into v_quantity from public.collections where player_id=p_player_id and numero=v_release.numero;
    return query select 'already_applied', v_release.numero, v_release.stars_spent, coalesce(v_stars,0), coalesce(v_quantity,0), v_release.dataset_version, v_release.created_at; return;
  end if;
  select stars into v_stars from public.wallets where player_id=p_player_id for update;
  if not found or v_stars < v_price.stars then return query select 'insufficient_stars', v_price.numero, v_price.stars, coalesce(v_stars,0), null::integer, v_price.dataset_version, null::timestamptz; return; end if;
  insert into public.password_releases(redemption_id,player_id,numero,stars_spent,dataset_version) values(p_redemption_id,p_player_id,v_price.numero,v_price.stars,v_price.dataset_version) returning * into v_release;
  update public.wallets set stars=stars-v_price.stars,updated_at=now() where player_id=p_player_id returning stars into v_stars;
  insert into public.collections(player_id,numero,quantity) values(p_player_id,v_price.numero,1) on conflict(player_id,numero) do update set quantity=public.collections.quantity+1,updated_at=now() returning quantity into v_quantity;
  return query select 'applied',v_price.numero,v_price.stars,v_stars,v_quantity,v_price.dataset_version,v_release.created_at;
end $$;
revoke execute on function public.redeem_card_by_password(uuid,uuid,text,text,integer) from public, anon;
grant execute on function public.redeem_card_by_password(uuid,uuid,text,text,integer) to authenticated, service_role;
