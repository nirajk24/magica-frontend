"use client";

import { Check, ChevronDown, Eye } from "lucide-react";
import { DisabledAction } from "@/components/DisabledAction";
import type { UsageCategory } from "@/contracts";
import { categorySide, categoryTotal } from "@/components/usage/category-total";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatUsageCredits, formatUsageTimestamp } from "@/lib/format";

const SKELETON_ROWS = 4;

/**
 * The Detailed View tab: a category picker over the page's categories, and that category's bounded
 * record list from the drill-down query. `detail` is the drilled category — the one whose `records`
 * the server attached — and is undefined until that query answers.
 */
export function UsageDetailedView({
  categories,
  categoryKey,
  detail,
  loading,
  onSelectCategory,
}: {
  categories: readonly UsageCategory[];
  categoryKey: string | null;
  detail: UsageCategory | undefined;
  loading: boolean;
  onSelectCategory: (key: string) => void;
}) {
  const chosen = categories.find((category) => category.key === categoryKey);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border px-6 py-4">
        <div>
          <p className="font-semibold text-fg">Detailed records</p>
          <p className="mt-0.5 text-sm text-fg-muted">
            Select a usage category, then open a record to inspect step costs.
          </p>
        </div>

        {chosen && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-11 items-center gap-6 rounded-xl border border-border bg-panel px-4 text-sm font-semibold text-fg transition-colors hover:bg-surface">
              {categoryOptionLabel(chosen)}
              <ChevronDown className="size-3.5 text-fg-subtle" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[14rem]">
              {categories.map((category) => (
                <DropdownMenuItem
                  key={category.key}
                  onSelect={() => onSelectCategory(category.key)}
                >
                  <Check
                    className={category.key === categoryKey ? "size-3.5" : "size-3.5 opacity-0"}
                    aria-hidden
                  />
                  {categoryOptionLabel(category)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {!chosen && !loading ? (
        <p className="rounded-2xl border border-border px-6 py-14 text-center text-fg-muted">
          No usage in this period.
        </p>
      ) : (
        <div className="rounded-2xl border border-border">
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-5">
            <div>
              <h2 className="text-2xl font-semibold text-fg">
                {chosen ? `${chosen.label} usage records` : " "}
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                {chosen ? `${chosen.count} records in the selected period` : " "}
                {detail?.truncated && " — showing the most recent"}
              </p>
            </div>
            {chosen && (
              <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-fg">
                {categorySide(chosen)}
              </span>
            )}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border text-fg">
                <th scope="col" className="px-6 py-4 text-left font-normal">
                  Credits Used
                </th>
                <th scope="col" className="px-6 py-4 text-left font-normal">
                  Timestamp
                </th>
                <th scope="col" className="px-6 py-4 text-right font-normal">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading || !detail ? (
                <SkeletonRows />
              ) : (detail.records ?? []).length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-14 text-center text-fg-muted">
                    No records in this period.
                  </td>
                </tr>
              ) : (
                (detail.records ?? []).map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 font-semibold text-fg">
                      {formatUsageCredits(record.amount)}
                    </td>
                    <td className="px-6 py-4 text-fg">{formatUsageTimestamp(record.at)}</td>
                    <td className="px-6 py-3.5 text-right">
                      <DisabledAction
                        icon={Eye}
                        label="View details"
                        reason="Per-step record costs aren't part of this build."
                        className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-sm"
                        showLabel
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function categoryOptionLabel(category: UsageCategory): string {
  return `${category.label} - ${formatUsageCredits(categoryTotal(category))}`;
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <tr key={index} aria-hidden>
          <td className="px-6 py-5">
            <div className="h-4 w-16 animate-pulse rounded bg-surface" />
          </td>
          <td className="px-6 py-5">
            <div className="h-4 w-44 animate-pulse rounded bg-surface" />
          </td>
          <td className="px-6 py-5">
            <div className="ml-auto h-4 w-24 animate-pulse rounded bg-surface" />
          </td>
        </tr>
      ))}
    </>
  );
}
