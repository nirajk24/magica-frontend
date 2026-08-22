/** Stands in for a markdown construct while bare URLs are removed around it. */
const OPEN = "⁣MD";
const CLOSE = "⁣";

/**
 * Removes bare URLs the turn already renders as media, along with whatever the model wrapped them in.
 *
 * Dropping only the anchor is not enough. A model writes `[Image URL: <url>]`, and taking the URL out
 * leaves `[Image URL: ]` on screen — a label pointing at nothing — so the bracket goes with it.
 *
 * INVARIANT: markdown link and image constructs are left alone. `[your mountain](url)` is prose with
 * a href, and the renderer keeps its words while dropping the anchor; rewriting it here would delete
 * the words. Only *bare* occurrences of a suppressed URL are removed, and only a line left holding
 * nothing but a label and punctuation is dropped.
 */
export function stripSuppressedUrls(text: string, urls: ReadonlySet<string>): string {
  if (urls.size === 0) return text;

  const constructs: string[] = [];
  let out = text.replace(/!?\[[^\]]*\]\([^)]*\)/g, (match) => {
    constructs.push(match);

    return `${OPEN}${constructs.length - 1}${CLOSE}`;
  });

  for (const url of urls) {
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`<?${escaped}>?`, "g"), "");
  }

  return out
    .split("\n")
    .filter((line) => !isEmptyWrapper(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(
      new RegExp(`${OPEN}(\\d+)${CLOSE}`, "g"),
      (_, index: string) => constructs[Number(index)] ?? "",
    )
    .trim();
}

/** A line the URL was carrying: brackets, a label and punctuation, and nothing else left. */
function isEmptyWrapper(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0 || !/[[\]()]/.test(trimmed)) return false;

  const remaining = trimmed.replace(/[[\]()<>:*_`\-\s]/g, "");

  return /^(image|url|link|imageurl|output|here)?$/i.test(remaining);
}
