import { z } from "zod";
import { apodIdToIso } from "../apod";

/*
 * NASA pictures and their Hebrew explanations, as both sides see them.
 *
 * `hebrewExplanationSchema` is also how the server checks Gemini's answer.
 * Gemini is asked for exactly this JSON, but LLMs don't always do what they
 * are told, so nothing it says is saved or shown until it passes this check.
 */

/** The tags Gemini may choose from. Must match the check in the migration. */
export const APOD_TAGS = [
  "galaxy",
  "planet",
  "nebula",
  "earth",
  "sun",
  "star",
  "moon",
  "black_hole",
  "spacecraft",
] as const;

export const apodTagSchema = z.enum(APOD_TAGS);

/** Any Hebrew letter. Used to catch Gemini answering in English. */
const HEBREW = /[֐-׿]/;

/** What Gemini must answer, and what we store in apod_explanations. */
export const hebrewExplanationSchema = z.object({
  hebrew_title: z
    .string()
    .trim()
    .min(1, "The title is empty")
    .max(200, "The title is too long")
    .regex(HEBREW, "The title is not in Hebrew"),
  summary: z
    .string()
    .trim()
    .min(1, "The summary is empty")
    .max(1000, "The summary is too long")
    .regex(HEBREW, "The summary is not in Hebrew"),
  tags: z
    .array(apodTagSchema)
    .min(1, "There are no tags")
    .max(5, "There are too many tags")
    /* A repeated tag says nothing new. Drop it rather than fail the answer. */
    .transform((tags) => [...new Set(tags)]),
});

/** A saved explanation, as GET /api/explanations/:date answers it. */
export const explanationSchema = z.object({
  /** YYMMDD, e.g. "150314". */
  date: z.string(),
  hebrew_title: z.string(),
  summary: z.string(),
  tags: z.array(apodTagSchema),
});

/** One picture, as GET /api/pictures answers it. */
export const pictureSchema = z.object({
  /** YYMMDD, the id to ask /api/explanations/:date for. */
  id: z.string(),
  /** ISO date, e.g. "2015-03-14". */
  date: z.string(),
  title: z.string(),
  /** The image itself. */
  hdurl: z.string(),
  /** NASA's description of the image for screen readers, if it has one. */
  alt: z.string().nullable(),
  /** Plain text: the HTML has already been cleaned by the server. */
  explanation: z.string(),
  /** The saved Hebrew explanation, if anyone has asked for one already. */
  hebrew: explanationSchema.nullable(),
});

/** The :date in /api/explanations/:date. */
export const apodDateParamSchema = z.object({
  date: z
    .string()
    .refine(
      (value) => apodIdToIso(value) !== null,
      "The date must be a real date since June 16, 1995, written YYMMDD",
    ),
});

export type ApodTag = z.infer<typeof apodTagSchema>;
export type HebrewExplanation = z.infer<typeof hebrewExplanationSchema>;
export type Explanation = z.infer<typeof explanationSchema>;
export type Picture = z.infer<typeof pictureSchema>;
