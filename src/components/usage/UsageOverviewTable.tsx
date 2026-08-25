"use client";

import { ChevronDown, ChevronUp, ChevronsUpDown, Eye } from "lucide-react";
import { useState } from "react";
import type { UsageCategory } from "@/contracts";
import { categoryAmount } from "@/components/usage/category-total";
import type { UsageSide } from "@/components/usage/UsagePage";
import { cn } from "@/lib/cn";
import { formatUsageCredits, formatUsageTimestamp } from "@/lib/format";

type SortKey = "label" | "amount" | "count" | "latestAt";
type Sort = { key: SortKey; dir: "asc" | "desc" };

/** Newest activity first, which is the order the reference lands on. */
const DEFAULT_SORT: Sort = { key: "latestAt", dir: "desc" };

const SKELETON_ROWS = 4;

/**
 * The Overview tab: one row per category, client-sorted. The rows are the page already fetched —
 * only the drill-down goes back to the server.
 */
export function UsageOverviewTable({
  categories,
  show,
  loading,
  onViewDetails,
}: {
  categories: readonly UsageCategory[];
  show: UsageSide;
  loading: boolean;
  onViewDetails: (key: string) => void;
}) {
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "label" ? "asc" : "desc" },
    );

  const sorted = sortCategories(categories, sort, show);

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-panel">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-fg">
            <SortHeader
              label="Tool Name"
              sort={sort}
              sortKey="label"
              onSort={toggleSort}
              className="text-left"
              iconAfter
            />
            <SortHeader
              label={show === "credited" ? "Total Credited" : "Total Debited"}
              sort={sort}
              sortKey="amount"
              onSort={toggleSort}
              className="text-right"
            />
            <SortHeader
              label="Records"
              sort={sort}
              sortKey="count"
              onSort={toggleSort}
              className="text-right"
            />
            <SortHeader
              label="Latest Usage"
              sort={sort}
              sortKey="latestAt"
              onSort={toggleSort}
              className="text-left"
              iconAfter
            />
            <th scope="col" className="px-6 py-4 text-right font-normal">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loading ? (
            <SkeletonRows />
          ) : sorted.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-14 text-center text-fg-muted">
                No usage in this period.
              </td>
            </tr>
          ) : (
            sorted.map((category) => (
              <tr key={category.key}>
                <td className="px-6 py-4 text-[15px] text-fg">{category.label}</td>
                <td className="px-6 py-4 text-right font-semibold text-fg">
                  {formatUsageCredits(categoryAmount(category, show))}
                </td>
                <td className="px-6 py-4 text-right font-semibold text-fg">{category.count}</td>
                <td className="px-6 py-4 text-fg">
                  {category.latestAt ? formatUsageTimestamp(category.latestAt) : "—"}
                </td>
                <td className="px-6 py-3.5 text-right">
                  <button
                    type="button"
                    onClick={() => onViewDetails(category.key)}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-sm text-fg transition-colors hover:bg-surface"
                  >
                    <Eye className="size-4" aria-hidden />
                    View details
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function sortCategories(
  categories: readonly UsageCategory[],
  sort: Sort,
  show: UsageSide,
): UsageCategory[] {
  const direction = sort.dir === "asc" ? 1 : -1;

  return [...categories].sort((a, b) => {
    switch (sort.key) {
      case "label":
        return direction * a.label.localeCompare(b.label);
      case "amount": {
        const diff = BigInt(categoryAmount(a, show)) - BigInt(categoryAmount(b, show));
        return direction * (diff > 0n ? 1 : diff < 0n ? -1 : 0);
      }
      case "count":
        return direction * (a.count - b.count);
      case "latestAt":
        // ISO-8601 sorts lexicographically; a category with no activity sinks to the end.
        return direction * (a.latestAt ?? "").localeCompare(b.latestAt ?? "");
    }
  });
}

function SortHeader({
  label,
  sort,
  sortKey,
  onSort,
  className,
  iconAfter = false,
}: {
  label: string;
  sort: Sort;
  sortKey: SortKey;
  onSort: (key: SortKey) => void;
  className?: string;
  iconAfter?: boolean;
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? ChevronsUpDown : sort.dir === "asc" ? ChevronUp : ChevronDown;
  const icon = <Icon className="size-3.5 text-fg-subtle" aria-hidden />;

  return (
    <th
      scope="col"
      aria-sort={!active ? undefined : sort.dir === "asc" ? "ascending" : "descending"}
      className={cn("px-6 py-4 font-normal", className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1.5 text-fg transition-colors hover:text-fg-muted"
      >
        {!iconAfter && icon}
        {label}
        {iconAfter && icon}
      </button>
    </th>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <tr key={index} aria-hidden>
          <td className="px-6 py-5">
            <div className="h-4 w-32 animate-pulse rounded bg-border" />
          </td>
          <td className="px-6 py-5">
            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-border" />
          </td>
          <td className="px-6 py-5">
            <div className="ml-auto h-4 w-8 animate-pulse rounded bg-border" />
          </td>
          <td className="px-6 py-5">
            <div className="h-4 w-40 animate-pulse rounded bg-border" />
          </td>
          <td className="px-6 py-5">
            <div className="ml-auto h-4 w-24 animate-pulse rounded bg-border" />
          </td>
        </tr>
      ))}
    </>
  );
}
