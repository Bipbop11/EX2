import type { Picture } from "@shared/schemas/apod";
import { useState } from "react";
import { Button, Card, Spinner } from "../../components";
import {
  TAG_LABELS,
  useExplainPicture,
  usePictures,
} from "../../features/nasa/hooks";
import { LANG } from "../../lib/config";
import styles from "./NasaPage.module.css";

/**
 * Random pictures from NASA's Astronomy Picture of the Day, each of which can
 * be explained in Hebrew by Gemini.
 */
export default function NasaPage() {
  const picturesQuery = usePictures();
  /* True while "More pictures" fetches a new batch over the old one. */
  const refreshing = picturesQuery.isFetching && !picturesQuery.isPending;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Space pictures</h1>
          <p className={styles.muted}>
            Random pictures from NASA&rsquo;s Astronomy Picture of the Day.
          </p>
        </div>
        {picturesQuery.isSuccess ? (
          <Button
            variant="secondary"
            loading={refreshing}
            onClick={() => void picturesQuery.refetch()}
          >
            More pictures
          </Button>
        ) : null}
      </header>

      {picturesQuery.isPending ? (
        <div className={styles.centered} aria-live="polite">
          <Spinner size="lg" />
          <p className={styles.muted}>Asking NASA for pictures…</p>
        </div>
      ) : picturesQuery.isError ? (
        <Card padding="lg" className={styles.message}>
          <p role="alert">{picturesQuery.error.message}</p>
          <Button
            variant="secondary"
            loading={picturesQuery.isFetching}
            onClick={() => void picturesQuery.refetch()}
          >
            Try again
          </Button>
        </Card>
      ) : picturesQuery.data.length === 0 ? (
        <Card padding="lg" className={styles.message}>
          <p className={styles.muted}>NASA sent no pictures this time.</p>
          <Button
            variant="secondary"
            onClick={() => void picturesQuery.refetch()}
          >
            Try another batch
          </Button>
        </Card>
      ) : (
        <ul
          className={styles.grid}
          aria-busy={refreshing}
          data-refreshing={refreshing || undefined}
        >
          {picturesQuery.data.map((picture) => (
            <li key={picture.id}>
              <PictureCard picture={picture} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function PictureCard({ picture }: { picture: Picture }) {
  const explain = useExplainPicture();
  const [expanded, setExpanded] = useState(false);

  return (
    <Card padding="none" className={styles.card}>
      <a href={picture.hdurl} target="_blank" rel="noreferrer">
        <img
          src={picture.hdurl}
          alt={picture.alt ?? picture.title}
          className={styles.image}
          loading="lazy"
        />
      </a>

      <div className={styles.body}>
        <h2 className={styles.title}>{picture.title}</h2>
        <time dateTime={picture.date} className={styles.date}>
          {formatDate(picture.date)}
        </time>

        <p className={styles.explanation} data-expanded={expanded || undefined}>
          {picture.explanation}
        </p>
        <button
          type="button"
          className={styles.more}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show less" : "Read more"}
        </button>

        {picture.hebrew ? (
          <section className={styles.hebrew} lang="he" dir="rtl">
            <h3 className={styles.hebrewTitle}>
              {picture.hebrew.hebrew_title}
            </h3>
            <p>{picture.hebrew.summary}</p>
            <ul className={styles.tags} aria-label="תגיות">
              {picture.hebrew.tags.map((tag) => (
                <li key={tag} className={styles.tag}>
                  {TAG_LABELS[tag]}
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <div className={styles.actions}>
            <Button
              variant="primary"
              size="sm"
              loading={explain.isPending}
              onClick={() => explain.mutate(picture.id)}
            >
              {explain.isError ? "Try again" : "Explain it in Hebrew"}
            </Button>
            {explain.isPending ? (
              <p className={styles.muted} aria-live="polite">
                Gemini is thinking… this can take a few seconds.
              </p>
            ) : explain.isError ? (
              <p className={styles.error} role="alert">
                {explain.error.message}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );
}

function formatDate(iso: string): string {
  /* Noon UTC, so no timezone can move the date to the day before. */
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(LANG, { dateStyle: "long" }).format(date);
}
