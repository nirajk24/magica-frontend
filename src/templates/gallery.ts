/**
 * The prompts behind the empty state's template grid.
 *
 * The reference's cards are led by generated artwork served from its own CDN, which is not ours to
 * ship. Ours carry a tinted tile in that slot instead — same grid, same card anatomy, no borrowed
 * assets. The categories and the card shape are the reference's.
 */
export type TemplateCategory =
  | "Viral Video Formats"
  | "Video Special Effects"
  | "Content Creation"
  | "Branding & Design"
  | "Image & Editing";

export type Template = {
  id: string;
  title: string;
  description: string;
  category: TemplateCategory;
  prompt: string;
  /** Two stops for the card's tile, so the grid reads as varied without any image assets. */
  tile: [string, string];
};

export const TEMPLATE_CATEGORIES: readonly TemplateCategory[] = [
  "Viral Video Formats",
  "Video Special Effects",
  "Content Creation",
  "Branding & Design",
  "Image & Editing",
];

export const TEMPLATES: readonly Template[] = [
  {
    id: "stamp-sheet",
    title: "Collectible Stamp Sheet",
    description: "Design a postage-stamp collection for your favourite place.",
    category: "Branding & Design",
    prompt:
      "Design a collectible postage-stamp sheet celebrating the landmarks of Switzerland. Six stamps in a grid, each with a denomination and a perforated edge, muted vintage print colours, fine engraved detail.",
    tile: ["#b8c6e8", "#e8dcc8"],
  },
  {
    id: "city-poster",
    title: "Swiss-Style City Poster",
    description: "Create a Swiss graphic poster with bold typography.",
    category: "Branding & Design",
    prompt:
      "Create a Swiss-style travel poster for New York. Huge condensed type bleeding off the edges, a duotone photograph beneath it, a strict grid, one accent colour against black and white.",
    tile: ["#d8d8d8", "#8a8a8a"],
  },
  {
    id: "storybook",
    title: "Animated Storybook",
    description: "Turn a child's drawing into a hand-drawn scene.",
    category: "Content Creation",
    prompt:
      "Turn this child's drawing into a warm hand-painted storybook illustration, keeping every original shape and character exactly where the child put them.",
    tile: ["#a9c8a2", "#6f9bd1"],
  },
  {
    id: "asmr-loop",
    title: "Jello World ASMR",
    description: "Create a viral jello ASMR video.",
    category: "Viral Video Formats",
    prompt:
      "Create a short looping ASMR video of a translucent amber jelly cube wobbling on a marble counter in soft daylight, extreme close-up, shallow depth of field.",
    tile: ["#e6b45c", "#c97b3c"],
  },
  {
    id: "street-illusion",
    title: "Street Art Illusion",
    description: "Street illusions that fool pedestrians.",
    category: "Video Special Effects",
    prompt:
      "Generate a photorealistic anamorphic street painting that reads as a deep circular hole in a city square, with passers-by walking carefully around its edge.",
    tile: ["#7d8fa6", "#3d4a5c"],
  },
  {
    id: "banner-reveal",
    title: "Giant Banner Reveal",
    description: "Reveal a banner across a building facade.",
    category: "Video Special Effects",
    prompt:
      "Create a night-time video of an enormous illuminated banner unfurling down the facade of a modern glass building, lights tracing its edge as it falls.",
    tile: ["#2f4a7a", "#111a2e"],
  },
  {
    id: "product-relight",
    title: "Product Relight",
    description: "Relight a product photo for a campaign.",
    category: "Image & Editing",
    prompt:
      "Relight this product photograph as a premium campaign shot: single soft key from the upper left, deep falloff, a subtle rim to separate it from the background. Keep the product untouched.",
    tile: ["#c9b8a8", "#6d5c4e"],
  },
  {
    id: "background-swap",
    title: "Background Swap",
    description: "Move a subject into a new setting.",
    category: "Image & Editing",
    prompt:
      "Cut the subject out of this photo and place them on a windswept coastal cliff at golden hour, matching the light direction and colour temperature on the subject.",
    tile: ["#8fb3c9", "#d9b58f"],
  },
  {
    id: "explainer-short",
    title: "Explainer Short",
    description: "Script and storyboard a 30-second explainer.",
    category: "Content Creation",
    prompt:
      "Write and storyboard a 30-second explainer about how a credit ledger stays consistent: six beats, one sentence of narration each, and a described visual per beat.",
    tile: ["#a3a8d8", "#5b5f9e"],
  },
];
