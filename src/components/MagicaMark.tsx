import { useId } from "react";

/**
 * The Magica mascot — a blobby capital M: a solid two-humped head, two legs, and the centre V
 * hanging between them as a wedge that stops short of the ground. With `eyes` it is the empty
 * state's character; the body takes `currentColor`, while the eyes are literal white and
 * near-black in both themes — they belong to the mark, not the page.
 *
 * Geometry is read off the empty-state capture: eyes at ~45% height and nearly touching, the
 * wedge tip at ~80%, the left leg wider than the right, the right cheek bulging past its leg.
 */
export function MagicaMark({ eyes = false, className }: { eyes?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 33 33" className={className} role="img" aria-label="Magica" fill="none">
      <path
        d="M2 13
           C2 7 5.5 3 10.5 3.2
           C12.8 3.1 14.6 3.9 16.2 5.2
           C17.8 3.7 19.6 3 21.8 3.1
           C26.5 3.4 30 6.8 30 12.5
           C30 16.5 29.5 18.5 28.4 20.5
           L28.4 28.7 Q28.4 31.5 25.6 31.5 L23.6 31.5 Q21 31.5 21 28.9
           L21 24.2 L19.8 23.2 Q17.6 25.6 16.5 26.8 Q15.4 25.6 13.2 23.2 L12.2 24.2
           L12.2 28.9 Q12.2 31.5 9.6 31.5 L5 31.5 Q2 31.5 2 28.7 Z"
        fill="currentColor"
      />
      {eyes && (
        <>
          <circle cx="10.3" cy="13.2" r="3.8" fill="#ffffff" />
          <circle cx="21.7" cy="13.2" r="3.8" fill="#ffffff" />
          <circle cx="9.9" cy="13.9" r="1.4" fill="#1a1a1a" />
          <circle cx="21.2" cy="13.9" r="1.4" fill="#1a1a1a" />
        </>
      )}
    </svg>
  );
}

/**
 * The wordmark's "M" — sharp, half again as wide as it is tall, its centre V truncated before the
 * vertex with a small detached diamond floating in the gap, bottom point almost on the baseline.
 * The severing is a mask rather than a painted notch, so whatever sits behind the mark shows
 * through the gap exactly as the reference's does.
 */
export function MagicaLogo({ className }: { className?: string }) {
  const maskId = useId();

  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Magica" fill="none">
      <defs>
        <mask id={maskId}>
          <rect width="32" height="32" fill="#fff" />
          <path d="M16 17 L20.2 21.2 L16 25.4 L11.8 21.2 Z" fill="#000" />
        </mask>
      </defs>
      <path
        d="M2 25 V7 h2.8 L16 20.6 27.2 7 H30 v18 h-2.8 V11 L16 24.6 4.8 11 V25 Z"
        fill="currentColor"
        mask={`url(#${maskId})`}
      />
      <path d="M16 18.4 L18.8 21.2 L16 24 L13.2 21.2 Z" fill="currentColor" />
    </svg>
  );
}
