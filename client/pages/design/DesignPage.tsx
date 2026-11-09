import type { CSSProperties } from "react";
import ringUrl from "./assets/ring.svg";
import stopUrl from "./assets/stop.svg";
import styles from "./DesignPage.module.css";
import { SPLASH_LETTERS } from "./splashLetters";

/**
 * The SPLASH landing page, built 1:1 from the Figma file
 * "גלילה מובייל ורספונסיבי": the "mobile" frame (440px, node 8:434) and the
 * "Desktop" frame (1440px, node 19:24). Sizes scale smoothly between the two
 * widths, and the layout switches to the desktop arrangement at 1024px.
 *
 * It is outside <RequireAuth> and outside <Layout> in client/App.tsx, so it
 * is public and fills the whole screen like the Figma frames do.
 */
export default function DesignPage() {
  return (
    <main className={styles.page} dir="rtl" lang="he">
      <Hero />
      <StopBand />
      <Problems />
      <About />
      <Features />
      <Footer />
    </main>
  );
}

function Hero() {
  return (
    <section className={styles.hero}>
      <h1 className={styles.heroLogo}>
        <SplashLogo />
      </h1>
      <BeadDivider className={styles.heroDivider} tone="yellow" />
      <div className={styles.equation}>
        <span className={styles.wolt} dir="ltr">
          WOLT
        </span>
        <span className={styles.equals} aria-label="=" role="img">
          <span />
          <span />
        </span>
        <h2 className={styles.equationTitle}>
          <span className={styles.equationTitleTop}>אפליקציית</span>
          משלוחים
        </h2>
      </div>
      <p className={styles.heroText}>
        משלוחי אוכל, שתייה, ציוד חירום ישירות לעמדת המציל - במינימום מאמץ!
      </p>
    </section>
  );
}

function StopBand() {
  return (
    <section className={styles.stop}>
      <div className={styles.stopWords}>
        <img src={stopUrl} alt="STOP!" />
        <img src={stopUrl} alt="STOP!" />
        <img src={stopUrl} alt="STOP!" />
      </div>
      <p className={styles.stopText}>מציל לא יכול להיות בטלפון בעמדה.</p>
    </section>
  );
}

const PROBLEMS = [
  ["חוסר", "גמישות"],
  ["חיפוש", "מיושן"],
  [
    "בלגאן",
    <>
      <span className={styles.wideOnly}>ב</span>הכשרות
    </>,
  ],
] as const;

function Problems() {
  return (
    <section className={styles.problems}>
      <p className={styles.kicker}>אז בדקנו:</p>
      <h2 className={styles.problemsTitle}>
        מה האתגר של מצילים דווקא כשהם לא בעבודה?
      </h2>
      <ul className={styles.rings}>
        {PROBLEMS.map(([first, second], i) => (
          <li key={i} className={styles.ring}>
            <img src={ringUrl} alt="" />
            <span>
              {first}
              <br />
              {second}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function About() {
  return (
    <section className={styles.about}>
      <p className={styles.aboutKicker}>וכך נולדה אפליקציית</p>
      <h2 className={styles.aboutLogo}>
        <SplashLogo />
      </h2>
      <p className={styles.aboutLead}>
        אפליקציה שמחברת בין מצילים מוסמכים לבריכות הזקוקות למציל לפי מיקום,
        זמינות, וההכשרה שלהם
      </p>
      <BeadDivider className={styles.aboutDivider} tone="red" />
      <div className={styles.columns}>
        <p className={styles.colWolt}>
          בוולט, שליחים עובדים לפי זמינות, ללא התחייבות, תוך התאמה לפי מיקום
          וזמינות. לקחנו את המודל הזה, ותרגמנו אותו לשוק המצילים.
        </p>
        <p className={styles.colSplash}>
          ספלאש היא אפליקציה שמחברת בין מצילים פרילנסרים לבין עסקים שצריכים מציל
          לבריכה שלהם בטווח זמן קצר, בלי להתפשר על הכשרה ואחריות, ושמה את המציל
          במרכז.
        </p>{" "}
        <p className={styles.colPromise}>
          היא מבטיחה למציל שלושה דברים: לעבוד כשנוח לו, לדעת מראש כמה ירוויח,
          ולהחזיק את כל ההכשרות שלו מאומתות במקום אחד.
        </p>
      </div>
    </section>
  );
}

/*
  wd is the text box width in the desktop frame; on mobile every box is
  147px wide. The order puts the cells where the mobile 2x2 grid has them.
*/
const FEATURES = [
  {
    tone: "pink",
    wd: 287,
    order: 3,
    text: "שכר גלוי ושקוף בכל משמרת, בכל משמרת המציל רואה מראש מה השכר",
  },
  {
    tone: "sky",
    wd: 269,
    order: 4,
    text: "אפשרות לעקוב אחרי תוקף ההכשרות ולהעלות חדשות בהתאם",
  },
  {
    tone: "yellow",
    wd: 268,
    order: 1,
    text: "פיד אוטומטי ומותאם אישית, לפי זמינות, מיקום והכשרות מתאימות",
  },
  {
    tone: "red",
    wd: 233,
    order: 2,
    text: "פרופיל מאומת שכולל את כל ההכשרות עובר ולידציה ידנית",
  },
] as const;

function Features() {
  return (
    <ul className={styles.features}>
      {FEATURES.map((f) => (
        <li
          key={f.tone}
          className={`${styles.feature} ${styles[f.tone]}`}
          style={{ "--wd": f.wd, "--order": f.order } as CSSProperties}
        >
          <p>{f.text}</p>
        </li>
      ))}
    </ul>
  );
}

const TEAM = ["שירה", "אורי", "הילה", "אור"];

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerLogo}>
        <SplashLogo />
      </div>
      <ul className={styles.team}>
        {TEAM.map((name, i) => (
          <li key={name}>
            {i > 0 ? <NameSeparator /> : null}
            <span>{name}</span>
          </li>
        ))}
      </ul>
    </footer>
  );
}

function SplashLogo() {
  return (
    <span className={styles.logo} dir="ltr" role="img" aria-label="SPLASH">
      {SPLASH_LETTERS.map((l, i) => (
        <svg
          key={i}
          viewBox={`0 0 ${l.width} ${l.height}`}
          style={{ aspectRatio: `${l.width} / ${l.height}` }}
          aria-hidden="true"
        >
          <path d={l.d} fill="currentColor" />
        </svg>
      ))}
    </span>
  );
}

const BEAD_W = 14.32;
const BEAD_H = 20.05;
const BEAD_STEP = 19.074;
const BEADS = Array.from({ length: 24 }, (_, i) => i);

/*
  A 3px line threaded with beads in a two-plus-one pattern: yellow-yellow-
  cream on blue, red-red-yellow on cream. One group on mobile, three on
  desktop.
*/
function BeadDivider({
  className,
  tone,
}: {
  className: string;
  tone: "yellow" | "red";
}) {
  const [main, accent] =
    tone === "yellow" ? ["#feb706", "#fdf0cd"] : ["#f64513", "#feb706"];
  const group = (
    <svg
      className={styles.beadGroup}
      viewBox={`0 0 ${BEAD_STEP * 23 + BEAD_W} ${BEAD_H}`}
      aria-hidden="true"
    >
      {BEADS.map((i) => (
        <rect
          key={i}
          x={i * BEAD_STEP}
          width={BEAD_W}
          height={BEAD_H}
          rx={4}
          fill={i % 3 === 2 ? accent : main}
        />
      ))}
    </svg>
  );
  return (
    <div
      className={`${styles.divider} ${className}`}
      style={{ "--line": main } as CSSProperties}
      role="separator"
    >
      <div className={styles.dividerCell}>{group}</div>
      <div className={`${styles.dividerCell} ${styles.wideOnly}`}>{group}</div>
      <div className={`${styles.dividerCell} ${styles.wideOnly}`}>{group}</div>
    </div>
  );
}

const SEP_NARROW = [0, 15, 29];
const SEP_WIDE = [0, 14, 29, 45, 59, 76, 90];

function NameSeparator() {
  const draw = (xs: number[], className: string) => {
    const last = xs[xs.length - 1];
    return (
      <svg
        className={className}
        viewBox={`0 0 ${last + 12} 17`}
        width={last + 12}
        height={17}
        aria-hidden="true"
      >
        <line
          x1={6}
          x2={last + 6}
          y1={8.5}
          y2={8.5}
          stroke="#feb706"
          strokeWidth={3}
        />
        {xs.map((x, i) => (
          <rect
            key={x}
            x={x}
            width={12}
            height={17}
            rx={4}
            fill={i % 2 ? "#fdf0cd" : "#feb706"}
          />
        ))}
      </svg>
    );
  };
  return (
    <>
      {draw(SEP_NARROW, styles.narrowOnly)}
      {draw(SEP_WIDE, styles.wideOnly)}
    </>
  );
}
