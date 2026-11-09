-- Hebrew explanations of APOD pictures, written by Gemini. A cache: one row
-- per picture, shared by every user, so Gemini is never paid twice for the
-- same picture. See docs/design.md.

create table if not exists public.apod_explanations (
  -- The picture's date as YYMMDD, e.g. '150314' for March 14, 2015.
  date text primary key check (date ~ '^[0-9]{6}$'),

  hebrew_title text not null,
  summary text not null,

  -- 1-5 tags, each from the list in shared/schemas/apod.ts (APOD_TAGS).
  -- The `case` makes sure jsonb_array_length only ever sees an array.
  tags jsonb not null check (
    case when jsonb_typeof(tags) = 'array' then
      jsonb_array_length(tags) between 1 and 5
      and tags <@ '["galaxy", "planet", "nebula", "earth", "sun", "star", "moon", "black_hole", "spacecraft"]'::jsonb
    else false end
  ),

  created_at timestamptz not null default now()
);

-- No extra index: every lookup is by `date`, which the primary key covers.

-- RLS on, no policies: only the server can read or write this table.
-- See docs/02-supabase-setup.md.
alter table public.apod_explanations enable row level security;
