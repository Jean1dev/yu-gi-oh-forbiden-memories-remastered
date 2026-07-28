-- build-deck/F01 — Player collection ("the chest").
--
-- One row per (player_id, numero): the quantity of that card the player owns.
-- Read-only in this feature (spec build-deck/F01, Decision 2) — F02 seeds it
-- at signup, F03 increments it on victory, both via SECURITY DEFINER RPCs
-- (docs/arquitetura.md §5.2, ADR-006), never a direct client write. This
-- migration therefore creates the table, its constraints and RLS with a
-- SELECT-only policy — no INSERT/UPDATE/DELETE policy exists yet.
--
-- `numero` keeps the column name from the canonical card schema
-- (docs/arquitetura.md §5.1) instead of an English translation: it identifies
-- a card, the same way `Card.numero` does everywhere else in the project.
create table if not exists public.collections (
  player_id uuid not null references auth.users (id) on delete cascade,
  numero text not null check (numero ~ '^[0-9]{3}$'),
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (player_id, numero)
);

alter table public.collections enable row level security;

-- Each player reads only their own rows. No write policy is created here:
-- writes arrive through SECURITY DEFINER RPCs owned by F02/F03, never a
-- direct client INSERT/UPDATE/DELETE (docs/arquitetura.md §5.2, Decision 8).
create policy "collections_select_own"
  on public.collections
  for select
  to authenticated
  using (player_id = auth.uid());
