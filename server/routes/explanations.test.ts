import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bindings } from "../env";
import { explanations } from "./explanations";

/*
 * GET /api/explanations/:date, with NASA, Gemini and the database all faked.
 * The point: when Gemini answers something invalid, the user is told so in
 * plain words, and nothing is saved - so the next click asks Gemini again
 * instead of serving the bad answer forever.
 */

const fakeDb = vi.hoisted(() => ({
  saved: null as Record<string, unknown> | null,
  insert: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: fakeDb.saved, error: null }),
        }),
      }),
      insert: (row: Record<string, unknown>) => {
        fakeDb.insert(row);
        return {
          select: () => ({
            single: () => Promise.resolve({ data: row, error: null }),
          }),
        };
      },
    }),
  }),
}));

const ENV = { GEMINI_API_KEY: "test-key" } as Bindings;

const NASA_PICTURE = {
  date: "2015-03-14",
  title: "Return at Sunrise",
  media_type: "image",
  hdurl: "https://example.test/soyuz.jpg",
  alt: null,
  explanation:
    "<strong>Explanation:</strong> A <a href='#'>Soyuz</a> floated over clouds." +
    "<br><br><strong>Tomorrow's picture:</strong> open space",
};

const VALID = {
  hebrew_title: "חזרה בזריחה",
  summary: "חללית סויוז ירדה מהחלל. היא ריחפה מעל העננים.",
  tags: ["spacecraft", "earth"],
};

/** Answers NASA's URL with a picture, and Gemini's with `geminiText`. */
function fakeServices(geminiText: string) {
  const fetchMock = vi.fn((input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes("science.nasa.gov")) {
      return Promise.resolve(Response.json(NASA_PICTURE));
    }
    return Promise.resolve(
      Response.json({
        candidates: [{ content: { parts: [{ text: geminiText }] } }],
      }),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function get(date: string) {
  return explanations.request(`/${date}`, {}, ENV);
}

beforeEach(() => {
  fakeDb.saved = null;
  fakeDb.insert.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/explanations/:date", () => {
  it("saves and returns a valid answer", async () => {
    const fetchMock = fakeServices(JSON.stringify(VALID));
    const response = await get("150314");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ date: "150314", ...VALID });
    expect(fakeDb.insert).toHaveBeenCalledWith({ date: "150314", ...VALID });

    /* Gemini got NASA's text, already cleaned. */
    const geminiCall = fetchMock.mock.calls.find(
      ([url]) => !String(url).includes("nasa"),
    ) as unknown as [string, RequestInit];
    const sent = String(geminiCall[1].body);
    expect(sent).toContain("A Soyuz floated over clouds.");
    expect(sent).not.toContain("<a");
    expect(sent).not.toContain("Tomorrow");
  });

  it.each([
    ["not JSON", "Here you go: a spacecraft over clouds."],
    ["English", JSON.stringify({ ...VALID, summary: "A Soyuz over clouds." })],
    ["a made-up tag", JSON.stringify({ ...VALID, tags: ["rocket"] })],
  ])(
    "tells the user and saves nothing when Gemini answers %s",
    async (_name, text) => {
      fakeServices(text);
      const response = await get("150314");

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: {
          code: "gemini_invalid_answer",
          message:
            "Gemini's explanation didn't come out right, so we didn't save it. Please try again.",
        },
      });
      expect(fakeDb.insert).not.toHaveBeenCalled();
    },
  );

  it("answers a saved explanation without calling NASA or Gemini", async () => {
    fakeDb.saved = { date: "150314", ...VALID };
    const fetchMock = fakeServices("never used");

    const response = await get("150314");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ date: "150314", ...VALID });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fakeDb.insert).not.toHaveBeenCalled();
  });

  it("rejects a date that isn't one, before calling anyone", async () => {
    const fetchMock = fakeServices("never used");
    const response = await get("150231");
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
