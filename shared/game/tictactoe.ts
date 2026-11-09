/*
 * The rules of our tic-tac-toe variant ("four"): a 4×4 board, and four in a
 * row wins.
 *
 * Everything here is a pure function: no React, no database, no `Date`, no
 * randomness. The same input always gives the same output. That is what lets
 * the page use these functions to play, and the server use the very same
 * functions to check that a saved game could really have been played.
 *
 * A cell is addressed by its index, 0 to 15, reading left to right and top to
 * bottom:
 *
 *    0  1  2  3
 *    4  5  6  7
 *    8  9 10 11
 *   12 13 14 15
 */

/** The board is SIZE × SIZE cells. */
export const SIZE = 4;
/** How many cells next to each other in a straight line win the game. */
export const WIN_LENGTH = 4;
/** How many cells the board has. */
export const CELL_COUNT = SIZE * SIZE;

export type Player = "X" | "O";
export type Cell = Player | null;

/** Where the game is up to. */
export type GameStatus =
  | { kind: "playing"; turn: Player }
  | { kind: "won"; winner: Player; line: readonly number[] }
  | { kind: "draw" };

export type GameState = {
  /** CELL_COUNT cells, indexed as in the picture at the top of this file. */
  readonly board: readonly Cell[];
  /** Every cell played so far, in order. X played the even ones. */
  readonly moves: readonly number[];
  readonly status: GameStatus;
};

/** Every way a move can be wrong. */
export type MoveError =
  /** The game has already been won or drawn. */
  | "game_over"
  /** The cell is not a whole number from 0 to CELL_COUNT - 1. */
  | "out_of_range"
  /** Someone has already played in that cell. */
  | "cell_taken";

export type MoveResult =
  { ok: true; state: GameState } | { ok: false; error: MoveError };

export type ReplayResult =
  | { ok: true; state: GameState }
  /** `moveIndex` is the position in the list of the first move that was wrong. */
  | { ok: false; error: MoveError; moveIndex: number };

/** The final result of a finished game. */
export type GameResult = Player | "draw";

/**
 * Every line of WIN_LENGTH cells on the board: across, down, and both
 * diagonals. Worked out once, from SIZE and WIN_LENGTH, so changing either
 * one changes the rules everywhere.
 */
export const LINES: readonly (readonly number[])[] = (() => {
  const directions = [
    [0, 1], // across
    [1, 0], // down
    [1, 1], // diagonal, down to the right
    [1, -1], // diagonal, down to the left
  ] as const;
  const lines: number[][] = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      for (const [dRow, dCol] of directions) {
        const endRow = row + dRow * (WIN_LENGTH - 1);
        const endCol = col + dCol * (WIN_LENGTH - 1);
        if (endRow < 0 || endRow >= SIZE || endCol < 0 || endCol >= SIZE) {
          continue;
        }
        const line: number[] = [];
        for (let step = 0; step < WIN_LENGTH; step++) {
          line.push((row + dRow * step) * SIZE + (col + dCol * step));
        }
        lines.push(line);
      }
    }
  }
  return lines;
})();

/** A fresh game: an empty board, and X to play. */
export function newGame(): GameState {
  return {
    board: Array<Cell>(CELL_COUNT).fill(null),
    moves: [],
    status: { kind: "playing", turn: "X" },
  };
}

/** The line a player has filled, or null if nobody has one. */
export function findWinningLine(
  board: readonly Cell[],
): { winner: Player; line: readonly number[] } | null {
  for (const line of LINES) {
    const first = board[line[0]!];
    if (first && line.every((index) => board[index] === first)) {
      return { winner: first, line };
    }
  }
  return null;
}

/** Works out the status from the board alone. */
export function statusOf(board: readonly Cell[]): GameStatus {
  const win = findWinningLine(board);
  if (win) return { kind: "won", ...win };
  const played = board.filter((cell) => cell !== null).length;
  if (played === board.length) return { kind: "draw" };
  return { kind: "playing", turn: played % 2 === 0 ? "X" : "O" };
}

/**
 * Plays one move for whoever's turn it is. Returns a new state, and never
 * changes the one it was given.
 */
export function play(state: GameState, cell: number): MoveResult {
  if (state.status.kind !== "playing") return { ok: false, error: "game_over" };
  if (!Number.isInteger(cell) || cell < 0 || cell >= CELL_COUNT) {
    return { ok: false, error: "out_of_range" };
  }
  if (state.board[cell] !== null) return { ok: false, error: "cell_taken" };

  const board = state.board.slice();
  board[cell] = state.status.turn;
  return {
    ok: true,
    state: { board, moves: [...state.moves, cell], status: statusOf(board) },
  };
}

/**
 * Plays a list of moves from an empty board. Stops at the first move that is
 * wrong, including any move after the game has ended.
 */
export function replay(moves: readonly number[]): ReplayResult {
  let state = newGame();
  for (const [moveIndex, cell] of moves.entries()) {
    const result = play(state, cell);
    if (!result.ok) return { ok: false, error: result.error, moveIndex };
    state = result.state;
  }
  return { ok: true, state };
}

/** The result of a finished game, or null if it is still being played. */
export function resultOf(status: GameStatus): GameResult | null {
  if (status.kind === "won") return status.winner;
  if (status.kind === "draw") return "draw";
  return null;
}

/** Explains a MoveError in words a player understands. */
export function describeMoveError(error: MoveError): string {
  switch (error) {
    case "game_over":
      return "The game is already over.";
    case "out_of_range":
      return "That cell is not on the board.";
    case "cell_taken":
      return "That cell is already taken.";
  }
}
