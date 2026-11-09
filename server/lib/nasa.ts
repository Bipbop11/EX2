import { z } from "zod";

/*
 * Talking to NASA's APOD endpoint. NASA is another server: it can be slow,
 * be down, or answer something unexpected. Every way that can go wrong
 * becomes a NasaError with a `kind`, so the routes can give the user a clear
 * answer instead of passing NASA's error along.
 *
 * Uses the new endpoint (science.nasa.gov/wp-json/wp/v2/apod-basic), not
 * api.nasa.gov/planetary/apod, which has answered placeholders since
 * September. See "What changed and why" in docs/design.md.
 */

const BASE_URL = "https://science.nasa.gov/wp-json/wp/v2/apod-basic";
/** Ask only for what we use: the full answer includes a large HTML page per picture. */
const FIELDS = "date,title,media_type,hdurl,alt,explanation";
const TIMEOUT_MS = 10_000;
/** How many images GET /api/pictures always answers. */
export const IMAGES_PER_BATCH = 18;
/** The most NASA sends in one answer: asking for more still gets 25. */
const NASA_PAGE_SIZE = 25;
/** How many pages to read at most while filling one batch. */
const MAX_PAGES_PER_BATCH = 4;

export class NasaError extends Error {
  constructor(readonly kind: "timeout" | "unavailable" | "not_found") {
    super(`NASA request failed: ${kind}`);
    this.name = "NasaError";
  }
}

/** One picture as NASA sends it. Lenient on purpose: we only need these. */
const nasaPictureSchema = z.object({
  date: z.string(),
  title: z.string(),
  /* Usually "image" or "video", but some old entries have null. */
  media_type: z.string().nullish(),
  hdurl: z.string().nullish(),
  alt: z.string().nullish(),
  explanation: z.string(),
});

export type NasaPicture = z.infer<typeof nasaPictureSchema>;

async function nasaFetch(url: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    console.error("NASA request failed:", url, error);
    throw new NasaError(
      error instanceof Error && error.name === "TimeoutError"
        ? "timeout"
        : "unavailable",
    );
  }
  if (response.status === 404) throw new NasaError("not_found");
  if (!response.ok) {
    console.error("NASA answered", response.status, url);
    throw new NasaError("unavailable");
  }
  return response;
}

async function readJson<T>(response: Response, schema: z.ZodType<T>) {
  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    console.error("NASA answered something unexpected:", parsed.error);
    throw new NasaError("unavailable");
  }
  return parsed.data;
}

/**
 * How many pictures NASA has. Kept in memory for a few hours: it grows by one
 * a day, and asking every time would double our calls to NASA.
 */
let cachedTotal: { value: number; until: number } | null = null;
const TOTAL_TTL_MS = 6 * 60 * 60 * 1000;

async function getTotal(): Promise<number> {
  if (cachedTotal && cachedTotal.until > Date.now()) return cachedTotal.value;
  const response = await nasaFetch(`${BASE_URL}?per_page=1&_fields=date`);
  const total = Number(response.headers.get("X-WP-Total"));
  if (!Number.isInteger(total) || total < 1) {
    console.error("NASA sent no usable X-WP-Total header");
    throw new NasaError("unavailable");
  }
  cachedTotal = { value: total, until: Date.now() + TOTAL_TTL_MS };
  return total;
}

/** One page of NASA's list, with each picture checked on its own. */
async function getPage(page: number): Promise<NasaPicture[]> {
  const response = await nasaFetch(
    `${BASE_URL}?page=${page}&per_page=${NASA_PAGE_SIZE}&_fields=${FIELDS}`,
  );
  const items = await readJson(response, z.array(z.unknown()));

  /*
   * One odd entry should cost us that one picture, not the whole page.
   */
  return items.flatMap((item) => {
    const parsed = nasaPictureSchema.safeParse(item);
    if (parsed.success) return [parsed.data];
    console.warn("skipping a picture NASA sent in an unexpected shape:", item);
    return [];
  });
}

/** A picture that is an image, so its hdurl is the image itself. */
export type NasaImage = NasaPicture & { hdurl: string };

/*
 * Videos have a generic NASA placeholder in hdurl, not the picture.
 */
function isImage(picture: NasaPicture): picture is NasaImage {
  return picture.media_type === "image" && Boolean(picture.hdurl);
}

/**
 * Exactly IMAGES_PER_BATCH random images, by overfetching: read a random page
 * of NASA_PAGE_SIZE pictures, keep only the images, and keep the first
 * IMAGES_PER_BATCH. A page has about 23 images, so one call is almost always
 * enough. When it isn't, the following pages top the batch up, wrapping round
 * to the first page after the last one.
 *
 * If a top-up call fails, the images already found are returned rather than
 * nothing; only when no image was found at all does the NasaError reach the
 * route.
 */
export async function getRandomImages(): Promise<NasaImage[]> {
  const lastPage = Math.max(1, Math.ceil((await getTotal()) / NASA_PAGE_SIZE));
  const firstPage = 1 + Math.floor(Math.random() * lastPage);
  const pagesToRead = Math.min(MAX_PAGES_PER_BATCH, lastPage);

  const images: NasaImage[] = [];
  const seen = new Set<string>();
  for (
    let step = 0;
    step < pagesToRead && images.length < IMAGES_PER_BATCH;
    step++
  ) {
    const page = ((firstPage - 1 + step) % lastPage) + 1;
    let pictures: NasaPicture[];
    try {
      pictures = await getPage(page);
    } catch (error) {
      if (images.length === 0) throw error;
      console.warn("topping up the batch failed; answering it short:", error);
      break;
    }
    for (const picture of pictures) {
      /*
       * The same date can show up twice if NASA publishes a new picture
       * between two calls and every page shifts by one.
       */
      if (isImage(picture) && !seen.has(picture.date)) {
        seen.add(picture.date);
        images.push(picture);
      }
    }
  }

  if (images.length < IMAGES_PER_BATCH) {
    console.warn(
      `only ${images.length} images found for a batch of ${IMAGES_PER_BATCH}`,
    );
  }
  return images.slice(0, IMAGES_PER_BATCH);
}

/** The picture of one date. `id` is YYMMDD. Throws NasaError("not_found") if there is none. */
export async function getPicture(id: string): Promise<NasaPicture> {
  const response = await nasaFetch(`${BASE_URL}/${id}?_fields=${FIELDS}`);
  return readJson(response, nasaPictureSchema);
}

/** What to tell the user when NASA fails. */
export function nasaErrorMessage(error: NasaError): string {
  switch (error.kind) {
    case "timeout":
      return "NASA took too long to answer. Please try again.";
    case "not_found":
      return "NASA has no picture for this date.";
    case "unavailable":
      return "NASA's picture service isn't working right now. Please try again in a few minutes.";
  }
}
