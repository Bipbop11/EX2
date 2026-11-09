import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * getRandomImages against a fake NASA. Each test describes NASA's pages
 * (how many pictures, which are videos) and checks the batch is always
 * exactly 18 images, topping up from the next page only when needed.
 *
 * nasa.ts keeps NASA's total in memory, so each test imports a fresh copy.
 */

type FakePicture = { date: string; media_type: string | null };

let pages: Record<number, FakePicture[] | "fail">;
let total: number;
let listCalls: number[];

function picture(day: number, media_type: string | null = "image") {
  return { date: `2020-01-${String(day).padStart(2, "0")}`, media_type };
}

/** n pictures starting at day `from`, with the given indexes as videos. */
function page(from: number, n = 25, videos: number[] = []): FakePicture[] {
  return Array.from({ length: n }, (_, i) =>
    picture(from + i, videos.includes(i) ? "video" : "image"),
  );
}

function fakeNasa() {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string) => {
      const url = new URL(input);
      if (url.searchParams.get("per_page") === "1") {
        return Promise.resolve(
          Response.json([], { headers: { "X-WP-Total": String(total) } }),
        );
      }
      expect(url.searchParams.get("per_page")).toBe("25");
      const number = Number(url.searchParams.get("page"));
      listCalls.push(number);
      const items = pages[number];
      if (items === "fail") {
        return Promise.resolve(new Response("oops", { status: 503 }));
      }
      return Promise.resolve(
        Response.json(
          (items ?? []).map((item) => ({
            ...item,
            title: `Picture ${item.date}`,
            hdurl: `https://example.test/${item.date}.jpg`,
            alt: null,
            explanation: "<strong>Explanation:</strong> Stars.",
          })),
        ),
      );
    }),
  );
}

/** Makes Math.random pick `pageNumber` out of `lastPage` pages. */
function pickPage(pageNumber: number, lastPage: number) {
  vi.spyOn(Math, "random").mockReturnValue((pageNumber - 0.5) / lastPage);
}

async function load() {
  return import("./nasa");
}

beforeEach(() => {
  vi.resetModules();
  pages = {};
  total = 100;
  listCalls = [];
  fakeNasa();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getRandomImages", () => {
  it("answers exactly 18 images from one page of 25", async () => {
    pages = { 2: page(1, 25, [0, 5, 9]) };
    pickPage(2, 4);
    const { getRandomImages } = await load();

    const images = await getRandomImages();
    expect(images).toHaveLength(18);
    expect(images.every((image) => image.media_type === "image")).toBe(true);
    expect(listCalls).toEqual([2]);
  });

  it("keeps the first 18 images, in NASA's order", async () => {
    pages = { 1: page(1, 25, [0]) };
    pickPage(1, 4);
    const { getRandomImages } = await load();

    const images = await getRandomImages();
    expect(images[0]?.date).toBe("2020-01-02");
    expect(images.at(-1)?.date).toBe("2020-01-19");
  });

  it("tops up from the next page when a page has too many videos", async () => {
    pages = {
      2: page(1, 25, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
      3: page(26),
    };
    pickPage(2, 4);
    const { getRandomImages } = await load();

    const images = await getRandomImages();
    expect(images).toHaveLength(18);
    expect(listCalls).toEqual([2, 3]);
  });

  it("wraps round to the first page after the last one", async () => {
    pages = { 4: page(1, 5), 1: page(10) };
    pickPage(4, 4);
    const { getRandomImages } = await load();

    expect(await getRandomImages()).toHaveLength(18);
    expect(listCalls).toEqual([4, 1]);
  });

  it("skips entries with no media_type, and pictures seen twice", async () => {
    pages = {
      1: [...page(1, 15), picture(50, null)],
      2: page(10, 25),
    };
    pickPage(1, 4);
    const { getRandomImages } = await load();

    const images = await getRandomImages();
    const dates = images.map((image) => image.date);
    expect(images).toHaveLength(18);
    expect(new Set(dates).size).toBe(18);
    expect(dates).not.toContain("2020-01-50");
    expect(dates.at(-1)).toBe("2020-01-18");
  });

  it("stops after 4 pages even if the batch is still short", async () => {
    const allVideos = page(
      1,
      25,
      Array.from({ length: 25 }, (_, i) => i),
    );
    pages = { 1: allVideos, 2: allVideos, 3: allVideos, 4: allVideos };
    total = 1000;
    pickPage(1, 40);
    const { getRandomImages } = await load();

    expect(await getRandomImages()).toEqual([]);
    expect(listCalls).toEqual([1, 2, 3, 4]);
  });

  it("throws a NasaError when the first page fails", async () => {
    pages = { 2: "fail" };
    pickPage(2, 4);
    const { getRandomImages, NasaError } = await load();

    await expect(getRandomImages()).rejects.toBeInstanceOf(NasaError);
  });

  it("answers the images it has when a top-up fails", async () => {
    pages = { 2: page(1, 25, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), 3: "fail" };
    pickPage(2, 4);
    const { getRandomImages } = await load();

    expect(await getRandomImages()).toHaveLength(15);
  });
});
