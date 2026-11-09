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

**NASA's new APOD endpoint: `science.nasa.gov/wp-json/wp/v2/apod-basic`.**
Since September, `api.nasa.gov/planetary/apod` doesn't work as documented: with `count`
it answers placeholder "NASA Science" pictures, with `date` it often answers today's
explanation, and some requests fail or never answer. The new endpoint needs no API key,
answers a list of pictures newest first, takes `page` and `per_page` (at most 25), and
says how many pictures there are in the `X-WP-Total` header. One picture is
`apod-basic/YYMMDD`, which answers 404 if there is no picture on that date. The server
asks only for the fields it uses (`_fields=...`), because a full answer includes a large
HTML page per picture (about 300 KB for 25 pictures). `NASA_API_KEY` is no longer used.

**`GET /api/pictures` no longer takes `page`.**
The page shows random pictures, and a "page" of random results means nothing. The server
picks a random page between 1 and `X-WP-Total / 25` and fetches it. The total is kept in
memory for a few hours, since it only grows by one a day. The pictures are random as a
batch, but come from consecutive days: picking each picture separately at random would
take one call to NASA per picture. The "More pictures" button just asks again.

**`GET /api/pictures` answers clean text, not the raw explanation.**
NASA's explanation is HTML: it starts with `<strong>Explanation:</strong>`, is full of
links, and often ends with extra paragraphs such as "Tomorrow's picture: ..." after a
blank line. The server cleans it once (`server/lib/html.ts`): it keeps the text up to the
first blank line, removes the tags and the "Explanation:" label, and decodes entities.
The same cleaning is used before the text goes to Gemini. Cleaning on the server means
the browser never has to render HTML that came from another site.

**Videos are left out, and every batch is exactly 18 images.**
About 1 in 12 APOD entries is a video, and for those NASA's `hdurl` is a generic NASA
placeholder, not the picture. To leave them out and still always answer the same number of
pictures, the server overfetches: it asks NASA for 25 pictures (NASA's maximum: asking for
more, such as 30, quietly still answers 25), keeps only the images, and answers the first
18. A page of 25 has about 23 images, so one call is almost always enough. In the rare page
with 8 or more videos, the server reads the following page too and fills the batch up to
18, reading at most 4 pages and wrapping round to the first page after the last one. If
NASA fails during a top-up, the images already found are returned rather than an error.
Entries NASA sends in an unexpected shape (some old ones have no `media_type`) are skipped
one by one instead of failing the whole page, and a picture that shows up twice (NASA
published a new one between two calls) is kept once.

**`GET /api/pictures` also reads `apod_explanations`.**
The design said this endpoint touches no tables. It now looks up the batch's dates in
`apod_explanations` and attaches any saved Hebrew explanation, so a picture that anyone
already explained shows its Hebrew as soon as the page loads, at no extra cost. If that
lookup fails, the pictures are still returned, just without Hebrew. Each picture also
carries `id` (its date as `YYMMDD`, to ask `/api/explanations/:date` for) and NASA's
`alt` text, for screen readers.

**The `tags` check in `apod_explanations`.**
`jsonb_array_length` raises an error, rather than returning false, when `tags` isn't an
array, so the check is wrapped in `case when jsonb_typeof(tags) = 'array' ...`. The
`date` column also checks that it is six digits.

**Paying twice is still possible in one rare case.**
If two people ask for the same unexplained picture at the same moment, both requests miss
the cache and both call Gemini. Only the first answer is saved (the `date` primary key
refuses the second), and both people get the saved one. Preventing the second Gemini call
would need a "pending" row and a way to clean up stuck ones; for one extra call in a rare
race, it isn't worth it.
