"use client";

import { useState } from "react";
import { TEMPLATES, TEMPLATE_CATEGORIES, type Template } from "@/templates/gallery";
import { cn } from "@/lib/cn";

const ALL = "All";

/**
 * The empty state's template grid: category tabs over a three-column masonry of cards.
 *
 * The rhythm is measured: 32px from the composer to the tab row, a 33px-tall row, 32px to the first
 * card. The row's band exists in ONE theme — the dark capture shows a `#191919` strip, the light
 * capture shows bare text on the canvas — so it sits on `--tab-strip`, which is transparent in
 * light. The active tab is the inverse: a white pill with a faint shadow in light, and in dark that
 * same `--panel` fill vanishes into the strip, leaving the white text the capture shows.
 *
 * A card is **one tile**: the artwork runs flush to its top and side edges and the title and
 * description sit on a `--surface` panel beneath, inside the same rounded container. Measured — the
 * panel is 52px tall on roughly 10px of padding.
 *
 * Clicking a card **prefills the composer and does not send** — the reference shows the grid still in
 * place with the prompt sitting in the composer, so this is a starting point the user edits, not a
 * one-click submit.
 */
export function TemplateGallery({ onPick }: { onPick: (template: Template) => void }) {
  const [category, setCategory] = useState<string>(ALL);

  const shown = TEMPLATES.filter(
    (template) => category === ALL || template.category === category,
  );

  return (
    <div className="mt-8 w-full">
      <div
        role="tablist"
        aria-label="Template categories"
        className="flex h-9 items-center gap-4 overflow-x-auto rounded-card bg-tab-strip px-1 text-sm"
      >
        {[ALL, ...TEMPLATE_CATEGORIES].map((name) => (
          <button
            key={name}
            role="tab"
            type="button"
            aria-selected={category === name}
            onClick={() => setCategory(name)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 whitespace-nowrap transition-colors",
              category === name
                ? "bg-panel font-semibold text-fg shadow-sm"
                : "text-fg-muted hover:text-fg",
            )}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="mt-8 columns-2 gap-4 md:columns-3 [&>*]:mb-4">
        {shown.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onPick(template)}
            className="block w-full break-inside-avoid overflow-hidden rounded-card bg-surface text-left transition-opacity hover:opacity-90"
          >
            <div
              className={cn("w-full", TILE_HEIGHTS[template.id.length % 3])}
              style={{
                backgroundImage: `linear-gradient(140deg, ${template.tile[0]}, ${template.tile[1]})`,
              }}
              aria-hidden
            />
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-fg">{template.title}</p>
              <p className="truncate text-sm text-fg-muted">{template.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/** The reference's grid is a masonry of unequal cards; varying the tile keeps that rhythm. */
const TILE_HEIGHTS = ["h-56", "h-72", "h-44"];
