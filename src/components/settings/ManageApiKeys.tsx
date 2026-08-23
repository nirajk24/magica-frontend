"use client";

import { CalendarDays, Check, ChevronDown, Copy, Gauge, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { MAX_ACTIVE_API_KEYS, MINUTES_PER_DAY } from "@/contracts";
import { formatRelativeTime } from "@/lib/format";
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "@/queries/use-api-keys";

/**
 * Create, list and revoke API keys.
 *
 * INVARIANT: the plaintext key is held in local state for exactly as long as it is on screen and is
 * never written into the query cache. The listing it invalidates does not contain it, and cannot —
 * the server stores only a hash.
 */
const DEFAULT_PER_MINUTE = 100;
const DEFAULT_PER_DAY = 10_000;

export function ManageApiKeys() {
  const keys = useApiKeys();
  const create = useCreateApiKey();
  const revoke = useRevokeApiKey();

  const [name, setName] = useState("Default");
  const [issued, setIssued] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [perMinute, setPerMinute] = useState(String(DEFAULT_PER_MINUTE));
  const [perDay, setPerDay] = useState(String(DEFAULT_PER_DAY));
  const [expires, setExpires] = useState("");

  const active = keys.data?.apiKeys.filter((key) => key.revokedAt === null).length ?? 0;
  const full = active >= MAX_ACTIVE_API_KEYS;

  const minute = Number.parseInt(perMinute, 10);
  const day = Number.parseInt(perDay, 10);
  const maxPerDay = Number.isInteger(minute) && minute > 0 ? minute * MINUTES_PER_DAY : undefined;
  const limitsValid =
    Number.isInteger(minute) &&
    minute > 0 &&
    Number.isInteger(day) &&
    day > 0 &&
    (maxPerDay === undefined || day <= maxPerDay);

  const submit = () => {
    if (name.trim() === "" || create.isPending || full || !limitsValid) return;

    create.mutate(
      {
        name: name.trim(),
        rateLimitPerMinute: minute,
        rateLimitPerDay: day,
        ...(expires === "" ? {} : { expiresAt: new Date(`${expires}T00:00:00Z`).toISOString() }),
      },
      {
        onSuccess: (result) => {
          setIssued(result.key);
          setName("Default");
          setExpires("");
        },
      },
    );
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-fg">API Keys</h2>
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-fg-muted">
            {active}/{MAX_ACTIVE_API_KEYS}
          </span>
        </div>
        <p className="text-sm text-fg-muted">
          Create and manage API keys for REST API access. A key carries the same access your account
          has, within the limits you set it.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
            maxLength={100}
            aria-label="Key name"
            className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-border-strong"
          />
          <button
            type="button"
            onClick={submit}
            disabled={name.trim() === "" || create.isPending || full || !limitsValid}
            className="flex items-center gap-2 rounded-lg bg-fg px-4 py-2 text-sm font-semibold text-bg transition-opacity disabled:opacity-40"
          >
            {create.isPending ? <Spinner className="size-4" /> : <Plus className="size-4" strokeWidth={2.4} />}
            Create Key
          </button>
        </div>

        <button
          type="button"
          onClick={() => setAdvanced(!advanced)}
          aria-expanded={advanced}
          className="flex w-fit items-center gap-1 text-xs text-fg-muted transition-colors hover:text-fg"
        >
          <ChevronDown
            className={advanced ? "size-3.5 rotate-180 transition-transform" : "size-3.5 transition-transform"}
            strokeWidth={2.2}
          />
          Advanced options
        </button>

        {advanced ? (
          <div className="flex flex-col gap-3 border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-fg-muted">
                <Gauge className="size-3.5" strokeWidth={2.2} />
                Per min
                <input
                  value={perMinute}
                  onChange={(event) => setPerMinute(event.target.value)}
                  inputMode="numeric"
                  aria-label="Requests per minute"
                  className="w-20 rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-fg outline-none focus:border-border-strong"
                />
              </label>

              <label className="flex items-center gap-2 text-xs text-fg-muted">
                Per day
                <input
                  value={perDay}
                  onChange={(event) => setPerDay(event.target.value)}
                  inputMode="numeric"
                  aria-label="Requests per day"
                  className="w-24 rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-fg outline-none focus:border-border-strong"
                />
              </label>

              {maxPerDay === undefined ? null : (
                <span className="text-xs text-fg-subtle">max {maxPerDay.toLocaleString("en-US")}</span>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs text-fg-muted">
              <CalendarDays className="size-3.5" strokeWidth={2.2} />
              Expires
              <input
                type="date"
                value={expires}
                onChange={(event) => setExpires(event.target.value)}
                aria-label="Expiry date"
                className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-fg outline-none focus:border-border-strong"
              />
              <span className="text-fg-subtle">Optional</span>
            </label>

            {!limitsValid ? (
              <p role="alert" className="text-xs text-danger">
                A daily limit cannot exceed the per-minute limit sustained for a whole day.
              </p>
            ) : null}
          </div>
        ) : null}

        {full ? (
          <p className="text-xs text-fg-subtle">
            You are holding the maximum of {MAX_ACTIVE_API_KEYS} keys. Revoke one to create another.
          </p>
        ) : null}
      </div>

      {issued ? <IssuedKey value={issued} onDismiss={() => setIssued(null)} /> : null}

      {keys.isPending ? (
        <div className="py-6 text-center">
          <Spinner className="mx-auto size-5" />
        </div>
      ) : keys.data && keys.data.apiKeys.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {keys.data.apiKeys.map((key) => (
            <li key={key.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate text-sm font-semibold text-fg">{key.name}</p>
                <p className="text-xs text-fg-muted">
                  <code className="font-mono">{key.fingerprint}••••••••</code>
                  {" · "}
                  {formatRelativeTime(key.createdAt)}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
                  <Gauge className="size-3" strokeWidth={2.2} />
                  {key.rateLimitPerMinute === null && key.rateLimitPerDay === null
                    ? "No rate limit"
                    : `${key.rateLimitPerMinute ?? "∞"}/min | ${key.rateLimitPerDay ?? "∞"}/day`}
                  {key.expiresAt ? ` · expires ${formatRelativeTime(key.expiresAt)}` : null}
                </p>
              </div>

              {key.revokedAt ? (
                <span className="shrink-0 text-xs text-fg-subtle">Revoked</span>
              ) : (
                <button
                  type="button"
                  onClick={() => revoke.mutate(key.id)}
                  disabled={revoke.isPending}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <Trash2 className="size-3.5" strokeWidth={2.2} />
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted">
          No keys yet. Create one to call the public API.
        </p>
      )}
    </section>
  );
}

/** Shown once. There is no second chance to read it, so the copy says so before it disappears. */
function IssuedKey({ value, onDismiss }: { value: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div role="alert" className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <p className="text-sm font-semibold text-fg">Copy this key now</p>
      <p className="text-sm text-fg-muted">
        This is the only time it will be shown. Only a hash is stored, so it cannot be recovered.
      </p>

      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg border border-border bg-bg px-3 py-2 font-mono text-xs text-fg">
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy key"
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-fg transition-colors hover:bg-panel"
        >
          {copied ? <Check className="size-3.5" strokeWidth={2.4} /> : <Copy className="size-3.5" strokeWidth={2.2} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="w-fit text-xs font-semibold text-fg-muted transition-colors hover:text-fg"
      >
        Stored it
      </button>
    </div>
  );
}
