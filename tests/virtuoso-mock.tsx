import type { ReactNode } from "react";

type VirtuosoProps<T> = {
  data?: readonly T[];
  itemContent: (index: number, item: T) => ReactNode;
  computeItemKey?: (index: number, item: T) => string | number;
  className?: string;
};

/**
 * A plain list standing in for `react-virtuoso`.
 *
 * jsdom reports every element as zero-height, so the real virtualizer renders nothing there and
 * every list assertion would fail on the environment rather than the component. Virtualization is a
 * rendering optimization with no behaviour of its own; it is verified in a browser, not here.
 */
export function Virtuoso<T>({ data, itemContent, computeItemKey, className }: VirtuosoProps<T>) {
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
