/**
 * An open book with a small gear at its lower corner — the reference's API / MCP glyph. Lucide has
 * a closed-book-with-cog and an open book, but not this composite, so it is drawn to match the
 * capture: `BookOpen`'s geometry with a six-toothed gear replacing the right page's outer corner.
 */
export function ApiMcpIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 7v12" />
      <path d="M12 7a4 4 0 0 0-4-3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h5a3 3 0 0 1 3 2" />
      <path d="M12 7a4 4 0 0 1 4-3h4a1 1 0 0 1 1 1v8" />
      <circle cx="18.5" cy="18.5" r="2.2" />
      <path d="M18.5 14.9v1.2M18.5 20.9v1.2M15.4 16.7l1 .6M20.6 19.7l1 .6M15.4 20.3l1-.6M20.6 17.3l1-.6" />
    </svg>
  );
}
