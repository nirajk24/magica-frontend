"use client";

import { useState } from "react";
import { TEMPLATES, TEMPLATE_CATEGORIES, type Template } from "@/templates/gallery";
import { cn } from "@/lib/cn";

const ALL = "All";

/**
 * The empty state's template grid: category tabs over a three-column masonry of cards.
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
        className="flex gap-6 overflow-x-auto pb-4 text-sm"
      >
        {[ALL, ...TEMPLATE_CATEGORIES].map((name) => (
          <button
            key={name}
            role="tab"
            type="button"
            aria-selected={category === name}
            onClick={() => setCategory(name)}
            className={cn(
              "shrink-0 whitespace-nowrap border-b-2 pb-1 transition-colors",
              category === name
                ? "border-fg text-fg"
                : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="columns-2 gap-4 md:columns-3 [&>*]:mb-4">
        {shown.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onPick(template)}
            className="block w-full break-inside-avoid overflow-hidden rounded-card text-left transition-opacity hover:opacity-90"
          >
            <div
              className={cn("w-full rounded-card", TILE_HEIGHTS[template.id.length % 3])}
              style={{
                backgroundImage: `linear-gradient(140deg, ${template.tile[0]}, ${template.tile[1]})`,
              }}
              aria-hidden
            />
            <p className="mt-2 text-sm font-medium text-fg">{template.title}</p>
            <p className="truncate text-sm text-fg-muted">{template.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/** The reference's grid is a masonry of unequal cards; varying the tile keeps that rhythm. */
const TILE_HEIGHTS = ["h-56", "h-72", "h-44"];
