import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, Outlet, useLocation } from "react-router";
import { Spinner } from "../components";
import { useAuth } from "../lib/auth";
import {
  APP_NAME,
  COURSE_CREDITS,
  COURSE_GITHUB,
  SHOW_DEMOS,
} from "../lib/config";
import styles from "./Layout.module.css";

/**
 * The frame around every page: the bar at the top, the footer at the
 * bottom, and the current page in between. Change the links and the footer
 * freely - this is your app's, not part of the design system.
 *
 * Applied in client/App.tsx. Pages nested inside
 * <Route element={<Layout />}> get this header and footer, drawn where
 * <Outlet /> is. Pages that fill the whole screen on their own (like sign
 * in) are simply not nested inside it.
 *
 * React Router calls this a "layout route":
 * https://reactrouter.com/start/declarative/routing#layout-routes
 */
export function Layout() {
  return (
    <div className={styles.shell}>
      <SiteHeader />

      <div className={styles.content}>
        {/* Shows a spinner while the page downloads, under the header. */}
        <Suspense
          fallback={
            <main>
              <Spinner />
            </main>
          }
        >
          <Outlet />
        </Suspense>
      </div>

      <footer className={styles.footer}>
        <AuthAction />
        <span className={styles.separator} aria-hidden="true">
          |
        </span>
        <span>{COURSE_CREDITS}</span>
      </footer>
    </div>
  );
}

/** The header's links. Logged-in users get the two pages that need a login. */
function NavLinks() {
  const { user } = useAuth();
  return (
    <>
      <Link to="/">Home</Link>
      {user ? <Link to="/tic-tac-toe">Tic-tac-toe</Link> : null}
      {user ? <Link to="/nasa">Space pictures</Link> : null}
      <Link to="/design">Responsive design</Link>
      <a href={COURSE_GITHUB} target="_blank" rel="noreferrer">
        GitHub
      </a>
      {SHOW_DEMOS ? <Link to="/demos">Demos</Link> : null}
    </>
  );
}

/**
 * The bar at the top. The links sit in one line next to the app's name
 * while they fit. When they don't, they move into a menu behind a
 * hamburger button.
 *
 * "Fit" depends on the screen, the font, and whether you are logged in (two
 * more links), so it is measured, not guessed with a breakpoint: an
 * invisible copy of the links is always laid out in one line, inside a box
 * of zero size so it never takes up room, and its width is compared with the
 * room the header has.
 */
function SiteHeader() {
  const headerRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLAnchorElement>(null);
  const measureRef = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();

  /*
    The page the menu was opened on, or null when it is closed. The menu
    only counts as open on that same page and while the links don't fit, so
    moving to another page or widening the window closes it by itself.
  */
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = collapsed && openOn === pathname;
  const close = () => setOpenOn(null);

  useLayoutEffect(() => {
    const header = headerRef.current;
    const name = nameRef.current;
    const measure = measureRef.current;
    if (!header || !name || !measure) return;

    const check = () => {
      const style = getComputedStyle(header);
      const room =
        header.clientWidth -
        parseFloat(style.paddingInlineStart) -
        parseFloat(style.paddingInlineEnd);
      const needed =
        name.offsetWidth + parseFloat(style.columnGap) + measure.offsetWidth;
      setCollapsed(needed > room);
    };

    check();
    /* Re-measure when the window resizes, the font loads, or links change. */
    const observer = new ResizeObserver(check);
    observer.observe(header);
    observer.observe(measure);
    return () => observer.disconnect();
  }, []);

  /* Escape closes the menu. */
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenOn(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header ref={headerRef} className={styles.header}>
      <Link ref={nameRef} to="/" className={styles.appName}>
        {APP_NAME}
      </Link>

      {collapsed ? (
        <button
          type="button"
          className={styles.menuButton}
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpenOn(open ? null : pathname)}
        >
          <HamburgerIcon open={open} />
        </button>
      ) : (
        <nav className={styles.nav}>
          <NavLinks />
        </nav>
      )}

      {open ? (
        /* Clicking any link in the menu closes it, even the current page. */
        <nav id="site-menu" className={styles.menu} onClick={close}>
          <NavLinks />
        </nav>
      ) : null}

      <div className={styles.measureBox} aria-hidden="true" inert>
        <nav ref={measureRef} className={styles.measure}>
          <NavLinks />
        </nav>
      </div>
    </header>
  );
}

function HamburgerIcon({ open }: { open: boolean }): ReactNode {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      {open ? (
        <path
          d="M6 6 18 18M18 6 6 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M4 7h16M4 12h16M4 17h16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

/** "hey, you" and a way out - or a way in, if nobody is logged in. */
function AuthAction() {
  const { user, loading, signOut } = useAuth();

  if (loading) return null;
  if (!user) return <Link to="/signin">Log In</Link>;

  return (
    <span className={styles.authAction}>
      <span className={styles.greeting}>hey {user.email} :)</span>
      <button
        type="button"
        className={styles.linkButton}
        onClick={() => void signOut()}
      >
        Log Out
      </button>
    </span>
  );
}
