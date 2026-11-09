import {
  newGame,
  play,
  SIZE,
  type GameResult,
  type GameState,
} from "@shared/game/tictactoe";
import { useState } from "react";
import { Button, Card, Spinner } from "../../components";
import { useGames, useSaveGame } from "../../features/games/hooks";
import { cx } from "../../lib/cx";
import { LANG } from "../../lib/config";
import styles from "./TicTacToePage.module.css";

/**
 * Two players, one screen, X first. The rules all live in shared/game/; this
 * page only draws the state those functions return and passes clicks to them.
 */
export default function TicTacToePage() {
  const [game, setGame] = useState<GameState>(newGame);
  const saveGame = useSaveGame();

  const { status } = game;
  const winningCells = status.kind === "won" ? status.line : [];

  function handleCell(cell: number) {
    const result = play(game, cell);
    /* The button is disabled, so this shouldn't happen. */
    if (!result.ok) return;
    setGame(result.state);
    /*
     * Save the moment the game ends. Done here rather than in an effect, so
     * it runs exactly once per game.
     */
    if (result.state.status.kind !== "playing") {
      saveGame.mutate({ moves: [...result.state.moves] });
    }
  }

  function handleNewGame() {
    setGame(newGame());
    saveGame.reset();
  }

  return (
    <main className={styles.page}>
      <h1>Tic-tac-toe</h1>
      <p className={styles.rules}>
        {SIZE}×{SIZE} board. Four in a row wins: across, down or diagonally.
      </p>

      <section className={styles.game} aria-label="Game">
        <p className={styles.status} aria-live="polite">
          {status.kind === "playing" ? (
            <>
              <Mark player={status.turn} />
              &rsquo;s turn
            </>
          ) : status.kind === "won" ? (
            <>
              <Mark player={status.winner} /> wins!
            </>
          ) : (
            "It's a draw."
          )}
        </p>

        <div
          className={styles.board}
          style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}
        >
          {game.board.map((cell, index) => {
            const row = Math.floor(index / SIZE) + 1;
            const col = (index % SIZE) + 1;
            return (
              <button
                key={index}
                type="button"
                className={cx(
                  styles.cell,
                  cell === "X" && styles.x,
                  cell === "O" && styles.o,
                  winningCells.includes(index) && styles.winning,
                )}
                aria-label={`Row ${row}, column ${col}: ${cell ?? "empty"}`}
                disabled={cell !== null || status.kind !== "playing"}
                onClick={() => handleCell(index)}
              >
                {cell}
              </button>
            );
          })}
        </div>

        <div className={styles.footer}>
          <SaveState
            pending={saveGame.isPending}
            error={saveGame.isError ? saveGame.error.message : null}
            saved={saveGame.isSuccess}
            onRetry={() => saveGame.mutate({ moves: [...game.moves] })}
          />
          <Button
            variant={status.kind === "playing" ? "secondary" : "primary"}
            onClick={handleNewGame}
          >
            New game
          </Button>
        </div>
      </section>

      <GameHistory />
    </main>
  );
}

function Mark({ player }: { player: "X" | "O" }) {
  return (
    <span className={cx(styles.mark, player === "X" ? styles.x : styles.o)}>
      {player}
    </span>
  );
}

function SaveState({
  pending,
  error,
  saved,
  onRetry,
}: {
  pending: boolean;
  error: string | null;
  saved: boolean;
  onRetry: () => void;
}) {
  if (pending) {
    return (
      <p className={styles.saveNote} aria-live="polite">
        <Spinner size="sm" /> Saving…
      </p>
    );
  }
  if (error !== null) {
    return (
      <div className={styles.saveError} role="alert">
        <p>Couldn&rsquo;t save this game. {error}</p>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }
  if (saved) {
    return (
      <p className={styles.saveNote} aria-live="polite">
        Game saved.
      </p>
    );
  }
  /* Keeps "New game" in the same place whether or not there's a note. */
  return <span />;
}

function GameHistory() {
  const gamesQuery = useGames();

  return (
    <section className={styles.history} aria-labelledby="history-title">
      <h2 id="history-title">Your games</h2>

      {gamesQuery.isPending ? (
        <div className={styles.centered}>
          <Spinner />
        </div>
      ) : gamesQuery.isError ? (
        <Card padding="lg">
          <p role="alert">Could not load your games.</p>
          <Button variant="secondary" onClick={() => void gamesQuery.refetch()}>
            Try again
          </Button>
        </Card>
      ) : gamesQuery.data.length === 0 ? (
        <Card padding="lg">
          <p className={styles.muted}>
            No games yet. Finish one and it will show up here.
          </p>
        </Card>
      ) : (
        <ul className={styles.list}>
          {gamesQuery.data.map((saved) => (
            <li key={saved.id} className={styles.item}>
              <span className={styles.result}>
                {describeResult(saved.result)}
              </span>
              <time dateTime={saved.created_at} className={styles.muted}>
                {formatPlayedAt(saved.created_at)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function describeResult(result: GameResult): string {
  return result === "draw" ? "Draw" : `${result} won`;
}

function formatPlayedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(LANG, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
