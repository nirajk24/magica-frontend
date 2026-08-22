import { useId } from "react";

/**
 * The Magica "M" — a chunky lowercase m drawn with round terminals, taken from the reference's own
 * mark. With `eyes` it is the empty state's mascot; without, it is the monochrome logo the sidebar
 * and the model pill carry. One path serves both, so the brand cannot drift between surfaces.
 *
 * The purple is `--accent` — sampled off the lossless capture, the mascot and the accent are the
 * same #4a3dd8. The eyes are literal white and near-black in both themes — they are part of the
 * mark, not of the page.
 */
export function MagicaMark({ eyes = false, className }: { eyes?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Magica" fill="none">
      <path
        d="M6 27 V11.5 a5.25 5.25 0 0 1 10.5 0 V18 M16.5 11.5 a5.25 5.25 0 0 1 10.5 0 V27"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {eyes && (
        <>
          <circle cx="11" cy="11.5" r="3.4" fill="#ffffff" />
          <circle cx="21.5" cy="11.5" r="3.4" fill="#ffffff" />
          <circle cx="11.6" cy="12" r="1.5" fill="#1a1a1a" />
          <circle cx="22.1" cy="12" r="1.5" fill="#1a1a1a" />
        </>
      )}
    </svg>
  );
}

/**
 * The wordmark's "M" — the sharp, slab-serif M with a four-point star cut out of its left stroke,
 * which is what the rail, the model pill and the picker rows carry. The star is a mask rather than a
 * painted shape, so whatever sits behind the mark (a black tile, the canvas) shows through the cut
 * exactly as the reference's does.
 */
export function MagicaLogo({ className }: { className?: string }) {
  const maskId = useId();

  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Magica" fill="none">
      <defs>
        <mask id={maskId}>
          <rect width="32" height="32" fill="#fff" />
          <path d="M10 10.5 11.6 14.4 15.5 16 11.6 17.6 10 21.5 8.4 17.6 4.5 16 8.4 14.4 Z" fill="#000" />
        </mask>
      </defs>
      <path
        d="M4.5 26 V6 h4.6 L16 17.8 22.9 6 h4.6 v20 h-4.8 V14.6 L16.9 24.4 h-1.8 L9.3 14.6 V26 Z"
        fill="currentColor"
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}
