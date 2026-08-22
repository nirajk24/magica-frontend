"use client";

import { useQuery } from "@tanstack/react-query";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useApi } from "@/lib/use-api";
import { qk } from "@/lib/query-client";
import { ApiError } from "@/lib/api-client";

const TOKENS = [
  ["bg", "canvas"],
  ["bg-subtle", "sidebar / recessed"],
  ["surface", "composer, cards"],
  ["border", "hairlines"],
  ["fg", "primary text"],
  ["fg-muted", "secondary text"],
  ["fg-subtle", "placeholder"],
  ["accent", "brand"],
] as const;

export default function Page() {
  const api = useApi();
  const health = useQuery({ queryKey: qk.health(), queryFn: () => api.getHealth() });

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Phase 0</h1>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <UserButton />
        </div>
      </header>

      <section className="rounded-composer border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-medium text-fg-muted">Backend health</h2>
        {health.isPending && <p className="text-fg-subtle">Checking…</p>}
        {health.isError && (
          <p className="text-fg">
            {health.error instanceof ApiError
              ? `${health.error.code}: ${health.error.message} (${health.error.traceId})`
              : String(health.error)}
          </p>
        )}
        {health.data && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
            <dt className="text-fg-muted">ok</dt>
            <dd>{String(health.data.ok)}</dd>
            <dt className="text-fg-muted">env</dt>
            <dd>{health.data.env}</dd>
            <dt className="text-fg-muted">db latency</dt>
            <dd>{health.data.dbLatencyMs} ms</dd>
          </dl>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-fg-muted">
          Theme tokens — every swatch must change when the toggle flips
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {TOKENS.map(([token, role]) => (
            <li
              key={token}
              className="flex items-center gap-3 rounded-card border border-border p-3"
            >
              <span
                className="size-8 shrink-0 rounded-card border border-border"
                style={{ backgroundColor: `var(--${token})` }}
              />
              <span className="font-mono text-sm">--{token}</span>
              <span className="ml-auto text-sm text-fg-subtle">{role}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
