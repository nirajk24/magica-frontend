"use client";

import { useEffect, useRef, useState } from "react";
import { TEMPLATES, TEMPLATE_CATEGORIES, type Template } from "@/templates/gallery";
import { cn } from "@/lib/cn";
import { FadeImage } from "@/components/FadeImage";

const ALL = "All";
/** The reference serves 30 cards a tab and keeps the rest behind `See more ideas`. */
const INITIAL = 30;
const WIDE = "(min-width: 768px)";

/**
 * The empty state's explore grid: category tabs over a masonry of prompt cards.
 *
 * The rhythm is measured: 32px from the composer to the tab row, a 33px-tall row, 32px to the first
 * card. The row's band exists in ONE theme — the dark capture shows a `#191919` strip, the light
 * capture shows bare text on the canvas — so it sits on `--tab-strip`, which is transparent in
 * light. The active tab is the inverse: a white pill with a faint shadow in light, and in dark that
 * same `--panel` fill vanishes into the strip, leaving the white text the capture shows.
 *
 * A card is **one tile**: the artwork runs flush to its top and side edges and the title and
 * description sit on a `--surface` panel beneath, inside the same rounded container.
 *
 * Clicking a card **prefills the composer and does not send** — the reference shows the grid still in
 * place with the prompt sitting in the composer, so this is a starting point the user edits, not a
 * one-click submit.
 */
export function TemplateGallery({ onPick }: { onPick: (template: Template) => void }) {
  const [category, setCategory] = useState<string>(ALL);
  const [expanded, setExpanded] = useState(false);
  const columns = useColumnCount();

  const shown = TEMPLATES.filter(
    (template) =>
      category === ALL || (template.categories as readonly string[]).includes(category),
  );
  const visible = expanded ? shown : shown.slice(0, INITIAL);

  const pick = (name: string) => {
    setCategory(name);
    setExpanded(false);
  };

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
            onClick={() => pick(name)}
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

      <div
        className="mt-8 grid items-start gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {deal(visible, columns).map((column, index) => (
          <div key={index} className="flex flex-col gap-4">
            {column.map((template) => (
              <TemplateCard key={template.id} template={template} onPick={onPick} />
            ))}
          </div>
        ))}
      </div>

      {expanded || shown.length <= INITIAL ? null : (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-card border border-border bg-surface px-4 py-2 text-sm font-semibold text-fg transition-colors hover:bg-panel"
          >
            See more ideas
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Three columns wide, two narrow. The server has no viewport, so it renders the wide layout and the
 * effect corrects it after hydration — reading the media query during render would make the server
 * and client markup disagree.
 */
function useColumnCount(): number {
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const sync = () => setColumns(query.matches ? 3 : 2);

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return columns;
}

/**
 * Deals the cards across columns in order, each one going to whichever column is currently shortest.
 *
 * The reference reads left-to-right — card 1 heads the first column, card 2 the second — which a CSS
 * multi-column layout cannot do, because it fills each column to the bottom before starting the
 * next. Height is estimated from the tile's aspect ratio, the same information the browser uses to
 * reserve the space, so the deal does not wait on a measurement.
 */
function deal(templates: readonly Template[], columns: number): Template[][] {
  const dealt: Template[][] = Array.from({ length: columns }, () => []);
  const heights = new Array<number>(columns).fill(0);

  for (const template of templates) {
    const shortest = heights.indexOf(Math.min(...heights));
    dealt[shortest]!.push(template);
    heights[shortest] = heights[shortest]! + template.height / template.width;
  }

  return dealt;
}

function TemplateCard({
  template,
  onPick,
}: {
  template: Template;
  onPick: (template: Template) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  /** The clip is fetched only once the pointer arrives, which is why it is `preload="none"`. */
  const play = () => {
    const node = video.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void node.play().catch(() => undefined);
  };

  const stop = () => {
    const node = video.current;
    if (!node) return;
    node.pause();
    node.currentTime = 0;
  };

  return (
    <button
      type="button"
      onClick={() => onPick(template)}
      onMouseEnter={play}
      onMouseLeave={stop}
      onFocus={play}
      onBlur={stop}
      className="block w-full overflow-hidden rounded-card bg-surface text-left transition-opacity hover:opacity-90"
    >
      <div
        className="w-full bg-panel"
        style={{ aspectRatio: `${template.width} / ${template.height}` }}
      >
        {failed ? null : template.clip ? (
          <video
            ref={video}
            src={template.clip}
            poster={template.poster}
            onError={() => setFailed(true)}
            muted
            loop
            playsInline
            preload="none"
            className="block h-full w-full object-cover"
          />
        ) : (
          <FadeImage
            src={template.poster}
            alt={template.title}
            onError={() => setFailed(true)}
            loading="lazy"
            className="block h-full w-full object-cover"
          />
        )}
      </div>

      <div className="px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-fg">{template.title}</p>
        <p className="truncate text-sm text-fg-muted">{template.description}</p>
      </div>
    </button>
  );
}
