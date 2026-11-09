import { apodDateParamSchema, type Explanation } from "@shared/schemas/apod";
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { fail, validate } from "../lib/errors";
import {
  explainInHebrew,
  GeminiError,
  geminiErrorMessage,
} from "../lib/gemini";
import { cleanExplanation, htmlToText } from "../lib/html";
import { getPicture, NasaError, nasaErrorMessage } from "../lib/nasa";
import { createAdminClient } from "../lib/supabase";

/*
 * GET /api/explanations/:date - the Hebrew explanation of one picture.
 *
 * The browser sends only the date. The title and explanation come from NASA
 * itself, so nobody can make us pay Gemini to explain text they wrote.
 *
 * Never pay twice: a saved explanation is returned straight from the
 * database. If two people ask for the same new picture at the same moment,
 * both may call Gemini, but only the first answer is saved and both get it.
 */

const COLUMNS = "date, hebrew_title, summary, tags";

export const explanations = new Hono<AppEnv>().get(
  "/:date",
  validate("param", apodDateParamSchema),
  async (c) => {
    const { date } = c.req.valid("param");
    const supabase = createAdminClient(c.env);

    const cached = await supabase
      .from("apod_explanations")
      .select(COLUMNS)
      .eq("date", date)
      .maybeSingle();
    if (cached.error) {
      console.error("reading explanation failed:", cached.error);
      return fail(c, 500, "database_error", "Could not load the explanation.");
    }
    if (cached.data) return c.json(cached.data as Explanation);

    let hebrew;
    try {
      const picture = await getPicture(date);
      hebrew = await explainInHebrew(c.env.GEMINI_API_KEY, {
        title: htmlToText(picture.title),
        explanation: cleanExplanation(picture.explanation),
      });
    } catch (error) {
      if (error instanceof NasaError) {
        return error.kind === "not_found"
          ? fail(c, 404, "not_found", nasaErrorMessage(error))
          : fail(c, 500, "nasa_error", nasaErrorMessage(error));
      }
      if (error instanceof GeminiError) {
        return fail(c, 500, `gemini_${error.kind}`, geminiErrorMessage(error));
      }
      throw error;
    }

    const inserted = await supabase
      .from("apod_explanations")
      .insert({ date, ...hebrew })
      .select(COLUMNS)
      .single();
    if (!inserted.error) return c.json(inserted.data as Explanation);

    /*
     * 23505 = unique violation: someone else saved this date while we were
     * asking Gemini. Theirs is the saved one, so answer with that.
     */
    if (inserted.error.code === "23505") {
      const existing = await supabase
        .from("apod_explanations")
        .select(COLUMNS)
        .eq("date", date)
        .single();
      if (!existing.error) return c.json(existing.data as Explanation);
    }
    console.error("saving explanation failed:", inserted.error);
    return fail(c, 500, "database_error", "Could not save the explanation.");
  },
);
