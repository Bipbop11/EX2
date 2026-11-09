/*
 * Turns NASA's HTML into plain text. There is no DOM on Cloudflare Workers,
 * so this is done with string rules, tuned to what NASA actually sends:
 *
 *   <strong>Explanation:</strong> The nebula is <a href="...">here</a>.
 *   <br><br><strong>Tomorrow's picture:</strong> open space
 *
 * The result is only ever shown as text (React escapes it) or sent to
 * Gemini, never put back into a page as HTML.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  deg: "°",
  times: "×",
};

function decodeEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (match, name: string) => {
      if (name[0] === "#") {
        const code =
          name[1] === "x" || name[1] === "X"
            ? parseInt(name.slice(2), 16)
            : parseInt(name.slice(1), 10);
        return code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : match;
      }
      return NAMED_ENTITIES[name.toLowerCase()] ?? match;
    },
  );
}

/** Any HTML -> plain text on one line. */
export function htmlToText(html: string): string {
  const text = html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, "");
  return (
    decodeEntities(text)
      .replace(/\s+/g, " ")
      /*
       * NASA often writes "<a>Dorado</a> ." - drop the space a link left
       * before punctuation.
       */
      .replace(/ ([.,;:!?)])/g, "$1")
      .trim()
  );
}

/**
 * An APOD explanation -> plain text: drops the "Explanation:" label and
 * everything after the first blank line ("Tomorrow's picture: ...",
 * "Gallery: ...", "Follow APOD on: ..."), which is not about the picture.
 */
export function cleanExplanation(html: string): string {
  const [body = ""] = html.split(/<br\s*\/?>(?:\s|&nbsp;)*<br\s*\/?>/i);
  return htmlToText(body).replace(/^Explanation:\s*/i, "");
}
