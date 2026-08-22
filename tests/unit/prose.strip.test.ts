import { describe, expect, it } from "vitest";
import { stripSuppressedUrls } from "@/lib/prose";

const URL = "https://cdn.magica.com/gen/abc.png";
const suppressed = new Set([URL]);

describe("stripSuppressedUrls", () => {
  it("leaves prose that mentions nothing suppressed exactly as it was", () => {
    const text = "Here is your poster: [not a url] (and a note)";

    expect(stripSuppressedUrls(text, suppressed)).toBe(text);
  });

  it("takes the label with the url, rather than leaving it pointing at nothing", () => {
    expect(stripSuppressedUrls(`[Image URL: ${URL}]`, suppressed)).toBe("");
  });

  it("keeps the sentence that introduced the image", () => {
    const text = [
      "Here's your mountain poster:",
      `[Image URL: ${URL}]`,
      "",
      "Let me know if you'd like adjustments!",
    ].join("\n");

    expect(stripSuppressedUrls(text, suppressed)).toBe(
      "Here's your mountain poster:\n\nLet me know if you'd like adjustments!",
    );
  });

  it("leaves a markdown link alone, so the renderer can keep its words", () => {
    const text = `See [the poster](${URL}) above.`;

    expect(stripSuppressedUrls(text, suppressed)).toBe(text);
  });

  it("does not mangle an image construct into a broken one", () => {
    const text = `![the poster](${URL})`;

    expect(stripSuppressedUrls(text, suppressed)).toBe(text);
  });

  it("removes a bare autolinked url", () => {
    expect(stripSuppressedUrls(`Done. ${URL}`, suppressed)).toBe("Done.");
  });

  it("does nothing when there is nothing to suppress", () => {
    const text = `[Image URL: ${URL}]`;

    expect(stripSuppressedUrls(text, new Set())).toBe(text);
  });

  it("leaves a url the turn does not render as media", () => {
    const text = "See https://example.com/docs for details";

    expect(stripSuppressedUrls(text, suppressed)).toBe(text);
  });
});
