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
  /**
   * Two stops for the card's tile. Deliberately desaturated: these stand in for artwork, and a
   * saturated block reads as a component rather than as a placeholder for one.
   */
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
    tile: ["#d4d7dc", "#c7c3bb"],
  },
  {
    id: "city-poster",
    title: "Swiss-Style City Poster",
    description: "Create a Swiss graphic poster with bold typography.",
    category: "Branding & Design",
    prompt:
      "Create a Swiss-style travel poster for New York. Huge condensed type bleeding off the edges, a duotone photograph beneath it, a strict grid, one accent colour against black and white.",
    tile: ["#d9d9d9", "#b4b4b4"],
  },
  {
    id: "storybook",
    title: "Animated Storybook",
    description: "Turn a child's drawing into a hand-drawn scene.",
    category: "Content Creation",
    prompt:
      "Turn this child's drawing into a warm hand-painted storybook illustration, keeping every original shape and character exactly where the child put them.",
    tile: ["#cdd3cc", "#bcc2c7"],
  },
  {
    id: "asmr-loop",
    title: "Jello World ASMR",
    description: "Create a viral jello ASMR video.",
    category: "Viral Video Formats",
    prompt:
      "Create a short looping ASMR video of a translucent amber jelly cube wobbling on a marble counter in soft daylight, extreme close-up, shallow depth of field.",
    tile: ["#d9d0c1", "#c2b5a4"],
  },
  {
    id: "street-illusion",
    title: "Street Art Illusion",
    description: "Street illusions that fool pedestrians.",
    category: "Video Special Effects",
    prompt:
      "Generate a photorealistic anamorphic street painting that reads as a deep circular hole in a city square, with passers-by walking carefully around its edge.",
    tile: ["#c4c9ce", "#aab1b8"],
  },
  {
    id: "banner-reveal",
    title: "Giant Banner Reveal",
    description: "Reveal a banner across a building facade.",
    category: "Video Special Effects",
    prompt:
      "Create a night-time video of an enormous illuminated banner unfurling down the facade of a modern glass building, lights tracing its edge as it falls.",
    tile: ["#bdc2cb", "#9ba2ac"],
  },
  {
    id: "product-relight",
    title: "Product Relight",
    description: "Relight a product photo for a campaign.",
    category: "Image & Editing",
    prompt:
      "Relight this product photograph as a premium campaign shot: single soft key from the upper left, deep falloff, a subtle rim to separate it from the background. Keep the product untouched.",
    tile: ["#d3cdc6", "#bab3ab"],
  },
  {
    id: "background-swap",
    title: "Background Swap",
    description: "Move a subject into a new setting.",
    category: "Image & Editing",
    prompt:
      "Cut the subject out of this photo and place them on a windswept coastal cliff at golden hour, matching the light direction and colour temperature on the subject.",
    tile: ["#ccd1d4", "#cac2b7"],
  },
  {
    id: "explainer-short",
    title: "Explainer Short",
    description: "Script and storyboard a 30-second explainer.",
    category: "Content Creation",
    prompt:
      "Write and storyboard a 30-second explainer about how a credit ledger stays consistent: six beats, one sentence of narration each, and a described visual per beat.",
    tile: ["#cccdd6", "#b4b6c1"],
  },
];
