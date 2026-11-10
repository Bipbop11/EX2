import type { CSSProperties } from "react";
import { Link } from "react-router";
import styles from "./HomePage.module.css";

/**
 * The home page: three full-height panels, one per project, separated by
 * diagonal lines. Each whole panel is a link to its project.
 *
 * The diagonals get steeper as the screen narrows, and on phones the panels
 * stack into three plain rectangles. All of that is in HomePage.module.css.
 */
export default function HomePage() {
  return (
    <main className={styles.home}>
      <nav className={styles.panels} aria-label="Projects">
        <Link
          to="/tic-tac-toe"
          className={`${styles.panel} ${styles.ticTacToe}`}
        >
          <PressShadow />
          <h2 className={styles.title}>TiC-TAC-Toe</h2>
          <p className={styles.text}>
            Get nostalgic with a good o&apos; tick-tac-toe game
          </p>
        </Link>

        <Link to="/nasa" className={`${styles.panel} ${styles.space}`}>
          <PressShadow />
          <h2 className={styles.title}>Space images</h2>
          <p className={styles.text}>Get inspired with the vastnes of space</p>
        </Link>

        <Link to="/design" className={`${styles.panel} ${styles.design}`}>
          <PressShadow />
          <h2 className={styles.title}>Responsive design</h2>
          <p className={styles.text}>
            Get creative wit a <StretchyWord /> design
          </p>
        </Link>
      </nav>
    </main>
  );
}

/*
  The shadow along a panel's diagonal edges when it is pressed. It is a
  black shape covering exactly what the diagonals cut off, blurred so the
  dark bleeds in across the edge. See .press in HomePage.module.css.
*/
function PressShadow() {
  return (
    <span className={styles.press} aria-hidden="true">
      <span />
    </span>
  );
}

/*
  "ReSponSiVE" with each letter squeezed or stretched, as in the sketch.
  The number is how wide that letter is drawn: below 1 is narrower, above 1
  is wider. Screen readers get the plain word instead of single letters.
*/
const STRETCHY_LETTERS: [string, number][] = [
  ["R", 1.45],
  ["e", 0.6],
  ["S", 0.7],
  ["p", 1.35],
  ["o", 1],
  ["n", 0.6],
  ["S", 1.4],
  ["i", 0.6],
  ["V", 1.35],
  ["E", 1.5],
];

function StretchyWord() {
  return (
    <span className={styles.stretchy}>
      <span className={styles.srOnly}>ReSponSiVE</span>
      <span aria-hidden="true">
        {STRETCHY_LETTERS.map(([letter, scale], i) => (
          <span key={i} style={{ "--sx": scale } as CSSProperties}>
            {letter}
          </span>
        ))}
      </span>
    </span>
  );
}
