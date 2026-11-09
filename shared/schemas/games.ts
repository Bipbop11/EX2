import { z } from "zod";
import { CELL_COUNT } from "../game/tictactoe";

/*
 * What a saved tic-tac-toe game looks like. Note the page sends only the
 * moves: the server works out the result itself, by replaying them with the
 * rules in shared/game/. A result sent by the browser could be anything.
 */

/** A saved game, as the API returns it. */
export const gameSchema = z.object({
  id: z.string(),
  result: z.enum(["X", "O", "draw"]),
  created_at: z.string(),
});

/** What the page sends to save a finished game. */
export const saveGameSchema = z.object({
  moves: z
    .array(
      z
        .number("Each move must be a cell number")
        .int("Each move must be a whole cell number")
        .min(0, "That cell is not on the board")
        .max(CELL_COUNT - 1, "That cell is not on the board"),
      "Please send the list of moves",
    )
    .min(1, "The game has no moves")
    .max(CELL_COUNT, "A game cannot have more moves than the board has cells"),
});

export type Game = z.infer<typeof gameSchema>;
export type SaveGameInput = z.infer<typeof saveGameSchema>;
