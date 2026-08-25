"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  ListTree,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UsageDetailedView } from "@/components/usage/UsageDetailedView";
import { categoriesOn } from "@/components/usage/category-total";
import { UsageOverviewTable } from "@/components/usage/UsageOverviewTable";
import { formatUsageCredits, formatUsagePeriod } from "@/lib/format";
import { previousPeriodOf, useUsage } from "@/queries/use-usage";

export type UsageSide = "debited" | "credited";

type Period = "current" | "previous";
type Tab = "overview" | "detailed";

const PERIOD_OPTIONS = [
  { value: "current", label: "Current Period" },
  { value: "previous", label: "Previous Period" },
] as const satisfies readonly { value: Period; label: string }[];

const SIDE_OPTIONS = [
  { value: "debited", label: "Debited Credits" },
  { value: "credited", label: "Credited Credits" },
] as const satisfies readonly { value: UsageSide; label: string }[];

/**
 * The AI Credits Overview at `/usage` — stat cards, the Show/Period filters, and the two tabs over
 * one aggregation query.
 *
 * The server owns the current window: the default query names no bounds, and "Previous Period" is
 * derived from the answer rather than from the client's clock. The Show side lives in the URL
 * (`?show=credited`), which is where the reference keeps it.
 */
export function UsagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const show: UsageSide = searchParams.get("show") === "credited" ? "credited" : "debited";

  const [period, setPeriod] = useState<Period>("current");
  const [tab, setTab] = useState<Tab>("overview");
  const [chosenCategory, setChosenCategory] = useState<string | null>(null);

  const currentQuery = useUsage();
  const previousRange = previousPeriodOf(currentQuery.data);
  const previousQuery = useUsage(previousRange ?? {}, {
    enabled: period === "previous" && previousRange !== null,
  });

  const pageQuery = period === "current" ? currentQuery : previousQuery;
  const page = pageQuery.data;
  // Filtered by the side being shown: the toggle used to change only the headline figure, so the
  // Credited view listed every tool that had ever run and priced them by what they had debited.
  const categories = categoriesOn(page?.categories ?? [], show);

  const categoryKey =
    chosenCategory !== null && categories.some((category) => category.key === chosenCategory)
      ? chosenCategory
      : (categories[0]?.key ?? null);

  const detailRange = period === "previous" && previousRange ? previousRange : {};
  const detailQuery = useUsage(
    { ...detailRange, category: categoryKey ?? undefined },
    { enabled: tab === "detailed" && categoryKey !== null },
  );

  const setShow = (side: UsageSide) =>
    router.replace(side === "credited" ? "/usage?show=credited" : "/usage", { scroll: false });

  const openDetails = (key: string) => {
    setChosenCategory(key);
    setTab("detailed");
  };

  return (
    <div className="h-full overflow-y-auto">
      <main className="mx-auto flex w-full max-w-[1520px] flex-col gap-6 px-10 py-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-fg">AI Credits Overview</h1>
          <p className="mt-1.5 text-fg-muted">Track your AI usage and optimize credit spend</p>
        </header>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            icon={CircleDollarSign}
            label={show === "credited" ? "Total credited" : "Total debited"}
            value={
              page &&
              `${formatUsageCredits(show === "credited" ? page.totalCredited : page.totalDebited)} credits`
            }
          />
          <StatCard
            icon={ReceiptText}
            label="Records"
            value={page && String(categories.reduce((total, category) => total + category.count, 0))}
          />
          <StatCard icon={ListTree} label="Categories" value={page && String(categories.length)} />
          <StatCard
            icon={CalendarDays}
            label="Period"
            value={page && formatUsagePeriod(page.from, page.to)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-border bg-panel px-5 py-3">
          <FilterDropdown
            label="Show"
            value={SIDE_OPTIONS.find((option) => option.value === show)?.label ?? ""}
          >
            {SIDE_OPTIONS.map((option) => (
              <DropdownMenuItem key={option.value} onSelect={() => setShow(option.value)}>
                <Check
                  className={option.value === show ? "size-3.5" : "size-3.5 opacity-0"}
                  aria-hidden
                />
                {option.label}
              </DropdownMenuItem>
            ))}
          </FilterDropdown>

          <FilterDropdown
            label="Period"
            value={PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? ""}
          >
            {PERIOD_OPTIONS.map((option) => (
              <DropdownMenuItem key={option.value} onSelect={() => setPeriod(option.value)}>
                <Check
                  className={option.value === period ? "size-3.5" : "size-3.5 opacity-0"}
                  aria-hidden
                />
                {option.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem disabled aria-disabled>
              <Check className="size-3.5 opacity-0" aria-hidden />
              Custom Period
            </DropdownMenuItem>
          </FilterDropdown>

          <span className="ml-auto text-sm text-fg">
            {page && formatUsagePeriod(page.from, page.to)}
          </span>
        </div>

        <div role="tablist" aria-label="Usage view" className="grid grid-cols-2 rounded-full bg-panel-inset">
          {(
            [
              { value: "overview", label: "Overview" },
              { value: "detailed", label: "Detailed View" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              id={`usage-tab-${option.value}`}
              aria-selected={tab === option.value}
              aria-controls={`usage-panel-${option.value}`}
              onClick={() => setTab(option.value)}
              className={
                tab === option.value
                  ? "rounded-full bg-panel py-2.5 text-sm text-fg shadow-sm"
                  : "rounded-full py-2.5 text-sm text-fg-muted transition-colors hover:text-fg"
              }
            >
              {option.label}
            </button>
          ))}
        </div>

        {pageQuery.isError ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-panel py-14">
            <p className="text-fg">Couldn&apos;t load your usage.</p>
            <button
              type="button"
              onClick={() => pageQuery.refetch()}
              className="rounded-full border border-border px-4 py-1.5 text-sm text-fg transition-colors hover:bg-surface"
            >
              Try again
            </button>
          </div>
        ) : tab === "overview" ? (
          <div role="tabpanel" id="usage-panel-overview" aria-labelledby="usage-tab-overview">
            <UsageOverviewTable
              categories={categories}
              show={show}
              loading={pageQuery.isPending}
              onViewDetails={openDetails}
            />
          </div>
        ) : (
          <div role="tabpanel" id="usage-panel-detailed" aria-labelledby="usage-tab-detailed">
            <UsageDetailedView
              categories={categories}
              categoryKey={categoryKey}
              detail={detailQuery.data?.categories.find((category) => category.key === categoryKey)}
              show={show}
              loading={pageQuery.isPending || (categoryKey !== null && detailQuery.isPending)}
              onSelectCategory={setChosenCategory}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | undefined | false;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-panel px-5 py-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-border">
        <Icon className="size-5 text-fg" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-fg-muted uppercase">{label}</p>
        {value ? (
          <p className="truncate text-xl font-bold text-fg">{value}</p>
        ) : (
          <div aria-hidden className="mt-1.5 h-5 w-24 animate-pulse rounded bg-border" />
        )}
      </div>
    </div>
  );
}

function FilterDropdown({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-fg-muted">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-11 items-center gap-6 rounded-xl border border-border bg-panel px-4 text-sm font-semibold text-fg transition-colors hover:bg-surface">
          {value}
          <ChevronDown className="size-3.5 text-fg-subtle" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[11rem]">
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
