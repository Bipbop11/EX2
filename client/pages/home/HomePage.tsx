import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import styles from "./HomePage.module.css";

type Me = { id: string; email: string };

const PROJECTS = [
  {
    to: "/tic-tac-toe",
    title: "Tic-Tac-Toe",
    text: "A 4x4 tic-tac-toe game with saved game history.",
    needsLogin: true,
  },
  {
    to: "/nasa",
    title: "NASA API",
    text: "NASA's Astronomy Picture of the Day, explained in Hebrew.",
    needsLogin: true,
  },
  {
    to: "/design",
    title: "Responsive Design",
    text: "The SPLASH landing page, built 1:1 from Figma for every screen size.",
    needsLogin: false,
  },
] as const;

/**
 * The home page. Replace all of this with your own app.
 *
 * Once you are logged in, it shows the two halves of the system talking to
 * each other: the browser knows who you are from Supabase, and /api/me
 * proves the SERVER agrees - it checked your token before answering.
 */
export default function HomePage() {
  const { user } = useAuth();

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Me>("/api/me"),
    // Only ask once we know somebody is logged in.
    enabled: Boolean(user),
  });

  return (
    <main>
      <h2>Welcome to the Product Jam Starter Kit</h2>
      <p>
        Feel free to look around, edit the source code and navigate to the
        demos. This page is client/pages/home/HomePage.tsx.
      </p>

      <div className={styles.logos}>
        <img src="/huji.svg" alt="HUJI Logo" width="80" height="80" />
        <img src="/bezalel.svg" alt="Bezalel Logo" width="80" height="80" />
      </div>

      {user ? (
        <>
          <p>
            The server knows you as:{" "}
            <strong>
              {meQuery.isPending
                ? "Checking..."
                : meQuery.isError
                  ? "Error"
                  : meQuery.data.email}
            </strong>
          </p>
          <p>
            <Link to="/events">My events</Link>
          </p>
        </>
      ) : null}

      <h2>Projects</h2>
      <nav aria-label="Projects">
        <ul className={styles.projects}>
          {PROJECTS.map((project) => (
            <li key={project.to}>
              <Link to={project.to} className={styles.project}>
                <span className={styles.projectTitle}>{project.title}</span>
                <span className={styles.projectText}>{project.text}</span>
                <span className={styles.projectMeta}>
                  {project.to}
                  {project.needsLogin ? " · sign-in required" : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
