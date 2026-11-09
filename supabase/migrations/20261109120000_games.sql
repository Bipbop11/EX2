-- Finished tic-tac-toe games. See docs/05-adding-a-feature.md and
-- docs/design.md.
--
-- Only the result is stored, not the moves (see "One trade-off" in the
-- design). The server replays the moves with shared/game/ before saving, and
-- stores the result IT calculated.

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),

  -- Who played it. Deleting the user deletes their games.
  user_id uuid not null references auth.users (id) on delete cascade,

  -- 'X' or 'O' for a win, 'draw' when the board filled with no row.
  result text not null check (result in ('X', 'O', 'draw')),

  created_at timestamptz not null default now()
);

-- "My games, newest first" is the only query we run.
create index if not exists games_user_id_created_at_idx
  on public.games (user_id, created_at desc);

-- RLS on, no policies: only the server can read or write this table.
-- See docs/02-supabase-setup.md.
alter table public.games enable row level security;
