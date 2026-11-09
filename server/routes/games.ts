import { describeMoveError, replay, resultOf } from "@shared/game/tictactoe";
import { saveGameSchema } from "@shared/schemas/games";
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { fail, validate } from "../lib/errors";
import { createAdminClient } from "../lib/supabase";

/*
 * Saved tic-tac-toe games. A game belongs to the user who saved it, so every
 * query is filtered or stamped with `c.get("user").id`. RLS will not do it
 * for us: the server's key bypasses it.
 */

const COLUMNS = "id, result, created_at";

export const games = new Hono<AppEnv>()

  // GET /api/games - the logged-in user's games, newest first.
  .get("/", async (c) => {
    const { data, error } = await createAdminClient(c.env)
      .from("games")
      .select(COLUMNS)
      .eq("user_id", c.get("user").id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("list games failed:", error);
      return fail(c, 500, "database_error", "Could not load your games.");
    }
    return c.json(data);
  })

  // POST /api/games - save a finished game. The body is only the moves; we
  // replay them with the shared rules and save only the result WE calculated
  // (the moves themselves are not stored - see "One trade-off" in the design).
  .post("/", validate("json", saveGameSchema), async (c) => {
    const { moves } = c.req.valid("json");

    const replayed = replay(moves);
    if (!replayed.ok) {
      return fail(
        c,
        400,
        "invalid_game",
        `Move ${replayed.moveIndex + 1} is not allowed: ${describeMoveError(replayed.error)}`,
      );
    }

    const result = resultOf(replayed.state.status);
    if (result === null) {
      return fail(
        c,
        400,
        "game_not_finished",
        "This game is not over yet, so it cannot be saved.",
      );
    }

    const { data, error } = await createAdminClient(c.env)
      .from("games")
      // user_id comes from the verified token, never from the request body.
      .insert({ user_id: c.get("user").id, result })
      .select(COLUMNS)
      .single();

    if (error) {
      console.error("save game failed:", error);
      return fail(c, 500, "database_error", "Could not save the game.");
    }
    return c.json(data, 201);
  });
