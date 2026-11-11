import { createMiddleware } from "hono/factory";
import { afterEach, describe, expect, it, vi } from "vitest";

/*
 * The whole server, with the login check and the database faked. The point:
 * a bad request from the user is answered 400, never 500 - whether the body
 * is valid JSON with a wrong value in it, or not valid JSON at all. A real
 * failure on our side is still a 500.
 */

vi.mock("./middleware/auth", () => ({
  requireAuth: createMiddleware(async (c, next) => {
    c.set("user", { id: "user-1", email: "a@test" });
    await next();
  }),
}));

const fakeDb = vi.hoisted(() => ({ fail: false }));

vi.mock("./lib/supabase", () => ({
  createAdminClient: () => {
    if (fakeDb.fail) throw new Error("database is down");
    return {
      from: () => ({
        insert: (row: Record<string, unknown>) => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: { id: "game-1", created_at: "now", ...row },
                error: null,
              }),
          }),
        }),
      }),
    };
  },
}));

const { default: app } = await import("./index");

function saveGame(body: string) {
  return app.request(
    "/api/games",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    },
    {},
  );
}

/** The JSON the server answered, typed for the test that reads it. */
function body<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

afterEach(() => {
  fakeDb.fail = false;
  vi.restoreAllMocks();
});

describe("POST /api/games with input the user got wrong", () => {
  it("answers 400 when a move is a string", async () => {
    const res = await saveGame('{"moves":[0,"2",1]}');

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: {
        code: "invalid_input",
        message: "Each move must be a cell number",
        fields: { "moves.1": "Each move must be a cell number" },
      },
    });
  });

  it("answers 400, not 500, when the body is not valid JSON", async () => {
    const res = await saveGame("{\"moves\":[0,'2',1]}");

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: {
        code: "invalid_input",
        message: "The request body is not valid JSON.",
      },
    });
  });

  it("answers 400 when the body is not JSON at all", async () => {
    const res = await saveGame("moves=0,2,1");

    expect(res.status).toBe(400);
    expect((await body<{ error: { code: string } }>(res)).error.code).toBe(
      "invalid_input",
    );
  });
});

describe("POST /api/games when the server itself fails", () => {
  it("still answers 500", async () => {
    fakeDb.fail = true;
    vi.spyOn(console, "error").mockImplementation(() => {});

    /* X fills the top row: a real, finished game. */
    const res = await saveGame('{"moves":[0,4,1,5,2,6,3]}');

    expect(res.status).toBe(500);
    expect((await body<{ error: { code: string } }>(res)).error.code).toBe(
      "internal_error",
    );
  });
});

describe("POST /api/games with a good game", () => {
  it("saves it and answers 201", async () => {
    const res = await saveGame('{"moves":[0,4,1,5,2,6,3]}');

    expect(res.status).toBe(201);
    expect((await body<{ result: string }>(res)).result).toBe("X");
  });
});
