import { describe, expect, it } from "vitest";
import {
  LINES,
  newGame,
  play,
  replay,
  resultOf,
  type GameState,
} from "./tictactoe";

/** Plays a list of moves and fails the test if any of them is wrong. */
function playAll(moves: number[]): GameState {
  const result = replay(moves);
  if (!result.ok) throw new Error(`move ${result.moveIndex}: ${result.error}`);
  return result.state;
}

describe("LINES", () => {
  it("has 4 rows, 4 columns and 2 diagonals on a 4×4 board", () => {
    expect(LINES).toHaveLength(10);
  });
});

describe("newGame", () => {
  it("starts empty, with X to play", () => {
    const game = newGame();
    expect(game.board.every((cell) => cell === null)).toBe(true);
    expect(game.status).toEqual({ kind: "playing", turn: "X" });
  });
});

describe("play", () => {
  it("alternates X and O", () => {
    const afterX = play(newGame(), 5);
    expect(afterX.ok && afterX.state.board[5]).toBe("X");
    expect(afterX.ok && afterX.state.status).toEqual({
      kind: "playing",
      turn: "O",
    });
  });

  it("does not change the state it was given", () => {
    const game = newGame();
    play(game, 0);
    expect(game.board[0]).toBeNull();
    expect(game.moves).toEqual([]);
  });

  it("rejects a cell that is already taken", () => {
    expect(play(playAll([0]), 0)).toEqual({ ok: false, error: "cell_taken" });
  });

  it.each([-1, 16, 1.5, Number.NaN])("rejects cell %s", (cell) => {
    expect(play(newGame(), cell)).toEqual({
      ok: false,
      error: "out_of_range",
    });
  });

  it("rejects a move after the game is won", () => {
    const won = playAll([0, 4, 1, 5, 2, 6, 3]);
    expect(play(won, 15)).toEqual({ ok: false, error: "game_over" });
  });
});

describe("winning", () => {
  it("X wins across the top row", () => {
    const game = playAll([0, 4, 1, 5, 2, 6, 3]);
    expect(game.status).toEqual({
      kind: "won",
      winner: "X",
      line: [0, 1, 2, 3],
    });
  });

  it("O wins down a column", () => {
    const game = playAll([0, 3, 1, 7, 5, 11, 9, 15]);
    expect(game.status).toEqual({
      kind: "won",
      winner: "O",
      line: [3, 7, 11, 15],
    });
  });

  it("X wins on the diagonal down to the right", () => {
    const game = playAll([0, 1, 5, 2, 10, 3, 15]);
    expect(resultOf(game.status)).toBe("X");
  });

  it("X wins on the diagonal down to the left", () => {
    const game = playAll([3, 0, 6, 1, 9, 2, 12]);
    expect(resultOf(game.status)).toBe("X");
  });

  it("three in a row is not enough", () => {
    const game = playAll([0, 4, 1, 5, 2, 6]);
    expect(game.status.kind).toBe("playing");
  });
});

describe("draw", () => {
  // X O X O
  // X O X O
  // O X O X
  // O X O X
  const draw = [0, 1, 2, 3, 4, 5, 6, 7, 9, 8, 11, 10, 13, 12, 15, 14];

  it("is a draw when the board fills with no row", () => {
    expect(playAll(draw).status).toEqual({ kind: "draw" });
    expect(resultOf(playAll(draw).status)).toBe("draw");
  });
});

describe("replay", () => {
  it("reports which move was wrong", () => {
    expect(replay([0, 1, 1])).toEqual({
      ok: false,
      error: "cell_taken",
      moveIndex: 2,
    });
  });

  it("rejects moves after the end", () => {
    expect(replay([0, 4, 1, 5, 2, 6, 3, 7])).toEqual({
      ok: false,
      error: "game_over",
      moveIndex: 7,
    });
  });

  it("leaves an unfinished game playing", () => {
    const result = replay([0, 1]);
    expect(result.ok && result.state.status.kind).toBe("playing");
  });
});
