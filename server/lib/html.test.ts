import { describe, expect, it } from "vitest";
import { cleanExplanation, htmlToText } from "./html";

describe("cleanExplanation", () => {
  it("drops the label, the links and the trailer", () => {
    const html =
      '<strong>Explanation:</strong> Does the <a href="https://x.test/?a=1&amp;b=2">blue nebula</a> look like a witch?' +
      "<br><br><strong>Tomorrow's picture:</strong> suddenly Saturn";
    expect(cleanExplanation(html)).toBe(
      "Does the blue nebula look like a witch?",
    );
  });

  it("handles the older <br /> trailers and spaces between them", () => {
    const html =
      "<strong> Explanation: </strong> Stars.<br /> &nbsp; <br /><b> Gallery: </b> more";
    expect(cleanExplanation(html)).toBe("Stars.");
  });

  it("keeps the text when there is no trailer", () => {
    expect(cleanExplanation("<strong>Explanation:</strong> Just this.")).toBe(
      "Just this.",
    );
  });
});

describe("htmlToText", () => {
  it("decodes entities and squeezes whitespace", () => {
    expect(htmlToText("Earth &amp; Moon\n\n &#8211; <i>now</i>&#x21;")).toBe(
      "Earth & Moon – now!",
    );
  });

  it("drops the space a link leaves before punctuation", () => {
    expect(htmlToText('in <a href="#">Dorado</a> . Wide , too')).toBe(
      "in Dorado. Wide, too",
    );
  });

  it("does not turn decoded text back into tags", () => {
    expect(htmlToText("&lt;script&gt;")).toBe("<script>");
  });
});
