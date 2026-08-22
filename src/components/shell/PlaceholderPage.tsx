/**
 * A nav destination this build does not implement.
 *
 * The rows exist because the reference has them and the sidebar would be wrong without them; the
 * pages say so plainly rather than rendering an empty screen that reads as a bug.
 */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-lg font-semibold text-fg">{title}</h1>
      <p className="max-w-[420px] text-sm text-fg-muted">
        This section is part of the product but not of this build. The chat, task list and credits
        surfaces are the ones that work.
      </p>
    </div>
  );
}
