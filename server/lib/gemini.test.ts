import { afterEach, describe, expect, it, vi } from "vitest";
import { explainInHebrew, GeminiError } from "./gemini";

/*
 * Gemini is never called here. `fetch` is replaced with a fake that answers
 * whatever each test needs, including the ways an LLM gets it wrong: not
 * JSON, English instead of Hebrew, a tag that isn't on the list.
 */

const PICTURE = {
  title: "Rigel and the Witch Head Nebula",
  explanation: "Does the blue nebula look like the head of a witch?",
};

const VALID = {
  hebrew_title: "ריגל וערפילית ראש המכשפה",
  summary: "זו ערפילית כחולה בחלל. היא נראית כמו ראש של מכשפה.",
  tags: ["nebula", "star"],
};

/** A Gemini HTTP answer whose generated text is `text`. */
function geminiAnswer(text: string, status = 200) {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

/** Makes the next fetch answer `response` (or throw it, if it's an Error). */
function fakeFetch(response: Response | Error) {
  const fetchMock = vi.fn(() =>
    response instanceof Error
      ? Promise.reject(response)
      : Promise.resolve(response),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Calls explainInHebrew and returns the GeminiError kind it throws. */
async function failureKind() {
  const error: unknown = await explainInHebrew("test-key", PICTURE).catch(
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(GeminiError);
  return (error as GeminiError).kind;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("explainInHebrew", () => {
  it("returns a valid answer", async () => {
    fakeFetch(geminiAnswer(JSON.stringify(VALID)));
    await expect(explainInHebrew("test-key", PICTURE)).resolves.toEqual(VALID);
  });

  it("asks for JSON with structured output, sending the key and the text", async () => {
    const fetchMock = fakeFetch(geminiAnswer(JSON.stringify(VALID)));
    await explainInHebrew("test-key", PICTURE);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toContain("gemini-3.6-flash:generateContent");
    expect(new Headers(init.headers).get("x-goog-api-key")).toBe("test-key");

    const body = JSON.parse(init.body as string) as {
      contents: { parts: { text: string }[] }[];
      generationConfig: {
        responseMimeType: string;
        responseSchema: { required: string[] };
      };
    };
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseSchema.required).toEqual([
      "hebrew_title",
      "summary",
      "tags",
    ]);
    expect(body.contents[0]?.parts[0]?.text).toContain(PICTURE.title);
    expect(body.contents[0]?.parts[0]?.text).toContain(PICTURE.explanation);
  });

  it("drops a repeated tag instead of failing", async () => {
    fakeFetch(
      geminiAnswer(JSON.stringify({ ...VALID, tags: ["nebula", "nebula"] })),
    );
    const answer = await explainInHebrew("test-key", PICTURE);
    expect(answer.tags).toEqual(["nebula"]);
  });

  describe("rejects an answer that is", () => {
    it.each([
      ["not JSON", "Sure! Here is the explanation: ..."],
      ["JSON cut off halfway", '{"hebrew_title": "ריגל", "summ'],
      ["empty", ""],
      ["English", JSON.stringify({ ...VALID, summary: "A blue nebula." })],
      ["using a made-up tag", JSON.stringify({ ...VALID, tags: ["comet"] })],
      ["without tags", JSON.stringify({ ...VALID, tags: [] })],
      [
        "using too many tags",
        JSON.stringify({
          ...VALID,
          tags: ["sun", "moon", "star", "earth", "planet", "nebula"],
        }),
      ],
      [
        "missing the title",
        JSON.stringify({ summary: VALID.summary, tags: VALID.tags }),
      ],
      ["a list instead of an object", JSON.stringify([VALID])],
    ])("%s", async (_name, text) => {
      fakeFetch(geminiAnswer(text));
      expect(await failureKind()).toBe("invalid_answer");
    });

    it("blocked, with no candidates", async () => {
      fakeFetch(
        new Response(
          JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } }),
        ),
      );
      expect(await failureKind()).toBe("invalid_answer");
    });
  });

  it("reports Gemini answering an error status as unavailable", async () => {
    fakeFetch(new Response('{"error":{"code":429}}', { status: 429 }));
    expect(await failureKind()).toBe("unavailable");
  });

  it("reports a network failure as unavailable", async () => {
    fakeFetch(new TypeError("fetch failed"));
    expect(await failureKind()).toBe("unavailable");
  });

  it("reports a timeout as a timeout", async () => {
    fakeFetch(new DOMException("The operation timed out.", "TimeoutError"));
    expect(await failureKind()).toBe("timeout");
  });
});
