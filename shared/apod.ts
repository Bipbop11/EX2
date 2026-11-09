/*
 * APOD dates. NASA's answers use ISO dates ("2015-03-14"), but its URL for
 * one picture, and our apod_explanations table, use YYMMDD ("150314").
 * These two functions translate, in one place.
 *
 * APOD started on June 16, 1995, so "95".."99" are the 1990s and everything
 * else is 20xx.
 */

/** The first APOD ever published. */
export const FIRST_APOD_DATE = "1995-06-16";

/** "2015-03-14" -> "150314". */
export function isoToApodId(iso: string): string {
  return iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10);
}

/**
 * "150314" -> "2015-03-14", or null if it is not a real calendar date on or
 * after the first APOD. Days in the future are allowed through: NASA answers
 * 404 for those, which is the honest answer.
 */
export function apodIdToIso(id: string): string | null {
  if (!/^\d{6}$/.test(id)) return null;
  const yy = Number(id.slice(0, 2));
  const year = yy >= 95 ? 1900 + yy : 2000 + yy;
  const month = Number(id.slice(2, 4));
  const day = Number(id.slice(4, 6));

  /*
   * Date.UTC rolls 31 February over into March; checking it round-trips
   * catches that.
   */
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  const iso = date.toISOString().slice(0, 10);
  return iso < FIRST_APOD_DATE ? null : iso;
}
