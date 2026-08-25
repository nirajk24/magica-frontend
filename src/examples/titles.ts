/**
 * The example list, kept apart from the conversations themselves.
 *
 * The sidebar shows this on every page, so anything it imports is downloaded by every visitor.
 * Titles are a few hundred bytes; the conversations are tens of kilobytes and are only worth
 * fetching when someone opens one. Two files is what keeps that split honest — see `chats.ts`.
 */
export type ExampleSummary = {
  id: string;
  title: string;
  /** Ordering only, resolved to a date at render so the list reads like a real one. */
  hoursAgo: number;
};

export const EXAMPLE_TITLES: readonly ExampleSummary[] = [
  { id: "swiss-city-poster", title: "Swiss-style city poster", hoursAgo: 2 },
  { id: "three-poster-campaign", title: "Three-poster campaign", hoursAgo: 6 },
  { id: "poster-that-got-blocked", title: "Poster that got blocked", hoursAgo: 70 },
];

export const isExampleId = (id: string): boolean =>
  EXAMPLE_TITLES.some((example) => example.id === id);
