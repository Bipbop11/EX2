# Design

## The database

**Table `games`** - one row per tic-tac-toe game played, used to show the user's game history.

| Column | Type | Rules |
| :--- | :--- | :--- |
| `id` | `uuid` | primary key, set by the database |
| `user_id` | `uuid` | foreign key to `auth.users`, not null |
| `result` | `text` | not null, `check (result in ('X', 'O', 'draw'))` |
| `created_at` | `timestamptz` | not null, set by the database |

**Table `apod_explanations`** - one row per explained NASA picture, acting as a cache to prevent calling the Gemini API twice for the same picture.

| Column | Type | Rules |
| :--- | :--- | :--- |
| `date` | `text` | primary key, represents the APOD date in `YYMMDD` format |
| `hebrew_title` | `text` | not null |
| `summary` | `text` | not null |
| `tags` | `jsonb` | not null<br/> `check (jsonb_array_length(tags) >= 1 and jsonb_array_length(tags) <= 5`<br>`and`<br>`tags <@ '["galaxy", "planet", "nebula", "earth", "sun", "star", "moon", "black_hole", "spacecraft"]'::jsonb)` |
| `created_at` | `timestamptz` | not null, set by the database |

## The API

**`POST /api/games`** - save a finished game.

- Receives: an array of moves.
- Answers: `201` with the saved game object.
- Errors: `400` if the moves are missing, invalid, or represent an illegal game. `500` if the database fails.
- Tables: writes `games`, using the logged-in user as `user_id`.

**`GET /api/games`** - get the logged-in user's game history.

- Receives: nothing.
- Answers: `200` with an array of the user's games, sorted newest first.
- Errors: `500` if the database fails.
- Tables: reads `games`, filtering by the logged-in user's `id`.

**`GET /api/pictures`** - fetch random space pictures from NASA's API.

- Receives: an optional `page` query parameter (for fetching different sets of pictures).
- Answers: `200` with an array of picture objects (including date, hdurl, title, and raw explanation).
- Errors: `500` if NASA's API fails, times out, or returns a server error. Our server intercepts this and returns a clean, user-friendly error message.
- Tables: none (this endpoint acts as a proxy to the external NASA API).

**`GET /api/explanations/:date`** - get the Hebrew explanation for a specific APOD date.

- Receives: the picture's date in the path (e.g., `YYMMDD`).
- Answers: `200` with the Hebrew title, summary, and tags.
- Errors: `400` if the date format is invalid. `404` if NASA returns no picture for this date. `500` if NASA, Gemini, or the database fails.
- Tables: reads `apod_explanations`. If the explanation is not found, writes a new row to `apod_explanations`.

## One trade-off

For the Tic-tac-toe game, I chose not to save the actual list of moves in the database, 
but only the final verified result. 

The advantage of this approach is saving storage space and simplifying the database schema. 

The trade-off is giving up the ability to implement a "game replay" feature in the future, 
and losing the ability to resume an active, unfinished game from a different device. 

Additionally, since the server is only notified at the end, 
it opens a loophole where users can abandon a losing game before it concludes to avoid recording a loss. 

However, since strict anti-cheat tracking is not currently required, 
this remains a worthwhile optimization.

## What changed and why

Two additions to the `games` table that the original design did not mention.

**`user_id` deletes with its user: `references auth.users (id) on delete cascade`.**
A game only means something to the person who played it. Without `on delete cascade`,
Postgres would refuse to delete a user account while that user still had saved games,
so deleting an account would first need a separate step to clear their history.
With it, deleting the user removes their games in the same step, and no game is ever
left pointing at a user who no longer exists.

**An index on `(user_id, created_at desc)`.**
`GET /api/games` runs exactly one query: this user's games, newest first. Without an
index, Postgres has to read every row of `games` and sort the matches on every request,
which gets slower as more games are saved by everyone. The index stores the rows already
grouped by user and sorted by date, so the query reads only the requesting user's rows,
already in the order the page shows them.
