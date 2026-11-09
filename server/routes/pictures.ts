import { isoToApodId } from "@shared/apod";
import type { Explanation, Picture } from "@shared/schemas/apod";
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { fail } from "../lib/errors";
import { cleanExplanation, htmlToText } from "../lib/html";
import { getRandomImages, NasaError, nasaErrorMessage } from "../lib/nasa";
import { createAdminClient } from "../lib/supabase";

/*
 * GET /api/pictures - exactly 18 random APOD images (see getRandomImages),
 * with clean text explanations and any Hebrew explanation already saved.
 */
export const pictures = new Hono<AppEnv>().get("/", async (c) => {
  let fromNasa;
  try {
    fromNasa = await getRandomImages();
  } catch (error) {
    if (error instanceof NasaError) {
      return fail(c, 500, "nasa_error", nasaErrorMessage(error));
    }
    throw error;
  }
  const images = fromNasa.map((image) => ({
    ...image,
    id: isoToApodId(image.date),
  }));

  /*
   * Attach the Hebrew explanations someone already paid for. If this lookup
   * fails, the pictures are still worth showing: their cards just offer the
   * "Explain" button, which reads the same table again.
   */
  const saved = new Map<string, Explanation>();
  if (images.length > 0) {
    const { data, error } = await createAdminClient(c.env)
      .from("apod_explanations")
      .select("date, hebrew_title, summary, tags")
      .in(
        "date",
        images.map((image) => image.id),
      );
    if (error) console.error("loading saved explanations failed:", error);
    for (const row of (data ?? []) as Explanation[]) saved.set(row.date, row);
  }

  const answer: Picture[] = images.map((image) => ({
    id: image.id,
    date: image.date,
    title: htmlToText(image.title),
    hdurl: image.hdurl,
    alt: image.alt ? htmlToText(image.alt) : null,
    explanation: cleanExplanation(image.explanation),
    hebrew: saved.get(image.id) ?? null,
  }));
  return c.json(answer);
});
