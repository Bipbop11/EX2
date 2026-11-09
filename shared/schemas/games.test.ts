import { describe, expect, it } from "vitest";
import { saveGameSchema } from "./games";

describe("saveGameSchema", () => {
  it("accepts a list of cells", () => {
    expect(saveGameSchema.safeParse({ moves: [0, 4, 1] }).success).toBe(true);
  });

  it("rejects a result sent instead of moves", () => {
    expect(saveGameSchema.safeParse({ result: "X" }).success).toBe(false);
  });

  it.each([[[]], [[16]], [[-1]], [[1.5]], [["0"]]])(
    "rejects moves %j",
    (moves) => {
      expect(saveGameSchema.safeParse({ moves }).success).toBe(false);
    },
  );

  it("rejects more than 16 moves", () => {
    const moves = Array.from({ length: 17 }, (_, i) => i % 16);
    expect(saveGameSchema.safeParse({ moves }).success).toBe(false);
  });
});
