import { describe, expect, it } from "vitest";
import { apodIdToIso, isoToApodId } from "../apod";
import { apodDateParamSchema, hebrewExplanationSchema } from "./apod";

describe("APOD dates", () => {
  it("translates both ways", () => {
    expect(isoToApodId("2015-03-14")).toBe("150314");
    expect(apodIdToIso("150314")).toBe("2015-03-14");
    expect(apodIdToIso("950616")).toBe("1995-06-16");
  });

  it.each(["950615", "150231", "151301", "15031", "abcdef"])(
    "rejects %s",
    (id) => {
      expect(apodIdToIso(id)).toBeNull();
      expect(apodDateParamSchema.safeParse({ date: id }).success).toBe(false);
    },
  );
});

describe("hebrewExplanationSchema", () => {
  const valid = {
    hebrew_title: "ערפילית ראש המכשפה",
    summary: "זו ערפילית כחולה. היא נראית כמו ראש של מכשפה.",
    tags: ["nebula", "star"],
  };

  it("accepts a Hebrew answer", () => {
    expect(hebrewExplanationSchema.safeParse(valid).success).toBe(true);
  });

  it("drops repeated tags", () => {
    const result = hebrewExplanationSchema.parse({
      ...valid,
      tags: ["star", "star"],
    });
    expect(result.tags).toEqual(["star"]);
  });

  it.each([
    ["an English summary", { summary: "A blue nebula." }],
    ["a tag not on the list", { tags: ["comet"] }],
    ["no tags", { tags: [] }],
    [
      "six tags",
      { tags: ["sun", "moon", "star", "earth", "planet", "nebula"] },
    ],
  ])("rejects %s", (_name, change) => {
    expect(
      hebrewExplanationSchema.safeParse({ ...valid, ...change }).success,
    ).toBe(false);
  });
});
