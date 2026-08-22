import { useEffect, useImperativeHandle, type ReactNode, type Ref } from "react";
import { vi } from "vitest";

type ScrollToIndex = { index: number; align?: string; behavior?: string };

type VirtuosoProps<T> = {
  data?: readonly T[];
  itemContent: (index: number, item: T) => ReactNode;
  computeItemKey?: (index: number, item: T) => string | number;
  className?: string;
  ref?: Ref<{ scrollToIndex: (location: ScrollToIndex) => void }>;
  atBottomStateChange?: (atBottom: boolean) => void;
};

/** The scroll the jump-to-latest button asks for, so a test can assert it was requested. */
export const scrollToIndex = vi.fn<(location: ScrollToIndex) => void>();

let notifyAtBottom: ((atBottom: boolean) => void) | null = null;

/**
 * Drives the list's `atBottomStateChange` from a test. jsdom reports every element as zero-height, so
 * nothing here ever scrolls on its own — this exercises our wiring, not the virtualizer's.
 */
export function emitAtBottom(atBottom: boolean) {
  notifyAtBottom?.(atBottom);
}

/**
 * A plain list standing in for `react-virtuoso`.
 *
 * jsdom reports every element as zero-height, so the real virtualizer renders nothing there and
 * every list assertion would fail on the environment rather than the component. Virtualization is a
 * rendering optimization with no behaviour of its own; it is verified in a browser, not here.
 */
export function Virtuoso<T>({
  data,
  itemContent,
  computeItemKey,
  className,
  ref,
  atBottomStateChange,
}: VirtuosoProps<T>) {
  useImperativeHandle(ref, () => ({ scrollToIndex }), []);
  useEffect(() => {
    notifyAtBottom = atBottomStateChange ?? null;
  }, [atBottomStateChange]);

  return (
    <div className={className} data-testid="virtuoso">
      {(data ?? []).map((item, index) => (
        <div key={computeItemKey ? computeItemKey(index, item) : index}>
          {itemContent(index, item)}
        </div>
      ))}
    </div>
  );
}
