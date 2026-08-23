"use client";

import { Check, Copy, Plus } from "lucide-react";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { WebhookEvent } from "@/contracts";
import { formatRelativeTime } from "@/lib/format";
import {
  useCreateWebhookEndpoint,
  useDeleteWebhookEndpoint,
  useWebhookDeliveries,
  useWebhookEndpoints,
} from "@/queries/use-webhooks";

const EVENTS = WebhookEvent.options;

/**
 * Webhook endpoints and their delivery log.
 *
 * A deliberate divergence: the reference has no webhooks surface, but this build emits signed
 * lifecycle events, and a delivery log readable only through `curl` is a feature nobody can see.
 * It sits inside API Keys — the same "programmatic access" idea — rather than claiming a rail row
 * the reference does not have.
 */
export function WebhookEndpoints() {
  const endpoints = useWebhookEndpoints();
  const create = useCreateWebhookEndpoint();
  const remove = useDeleteWebhookEndpoint();

  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState<string[]>(["agent.completed", "agent.failed"]);
  const [secret, setSecret] = useState<string | null>(null);
  const [openLog, setOpenLog] = useState<string | null>(null);

  const valid = url.trim().startsWith("https://") && selected.length > 0;

  const submit = () => {
    if (!valid || create.isPending) return;

    create.mutate(
      { url: url.trim(), events: selected as typeof EVENTS[number][] },
      {
        onSuccess: (result) => {
          setSecret(result.secret);
          setUrl("");
        },
      },
    );
  };

  const toggle = (event: string) =>
    setSelected((current) =>
      current.includes(event) ? current.filter((e) => e !== event) : [...current, event],
    );

  return (
    <section className="flex flex-col gap-4 border-t border-border pt-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-fg">Webhooks</h2>
        <p className="text-sm text-fg-muted">
          Receive signed events when a turn starts, finishes, fails, or a tool completes. Receivers
          must be HTTPS and should answer 2xx immediately.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com/hooks/magica"
          maxLength={2000}
          aria-label="Receiver URL"
          className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-border-strong"
        />

        <div className="flex flex-wrap gap-2">
          {EVENTS.map((event) => (
            <button
              key={event}
              type="button"
              aria-pressed={selected.includes(event)}
              onClick={() => toggle(event)}
              className={
                selected.includes(event)
                  ? "rounded-full bg-fg px-3 py-1 font-mono text-xs font-semibold text-bg"
                  : "rounded-full border border-border px-3 py-1 font-mono text-xs text-fg-muted transition-colors hover:text-fg"
              }
            >
              {event}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!valid || create.isPending}
          className="flex w-fit items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-fg transition-colors hover:bg-surface disabled:opacity-40"
        >
          {create.isPending ? <Spinner className="size-4" /> : <Plus className="size-4" strokeWidth={2.4} />}
          Add endpoint
        </button>
      </div>

      {secret ? <IssuedSecret value={secret} onDismiss={() => setSecret(null)} /> : null}

      {endpoints.isPending ? (
        <Spinner className="mx-auto size-5" />
      ) : endpoints.data && endpoints.data.endpoints.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {endpoints.data.endpoints.map((endpoint) => (
            <li key={endpoint.id} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-sm text-fg">{endpoint.url}</p>
                  <p className="truncate font-mono text-xs text-fg-muted">
                    {endpoint.events.join(" · ")}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenLog(openLog === endpoint.id ? null : endpoint.id)}
                    aria-expanded={openLog === endpoint.id}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-surface"
                  >
                    Deliveries
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.mutate(endpoint.id)}
                    disabled={remove.isPending}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-surface disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {openLog === endpoint.id ? <DeliveryLog endpointId={endpoint.id} /> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted">
          No endpoints registered.
        </p>
      )}
    </section>
  );
}

function DeliveryLog({ endpointId }: { endpointId: string }) {
  const deliveries = useWebhookDeliveries(endpointId);

  if (deliveries.isPending) return <Spinner className="my-2 size-4" />;
  if (!deliveries.data || deliveries.data.deliveries.length === 0) {
    return <p className="py-2 text-xs text-fg-muted">Nothing delivered yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-1 border-t border-border pt-2">
      {deliveries.data.deliveries.map((delivery) => (
        <li key={delivery.id} className="flex items-center justify-between gap-3 text-xs">
          <span className="font-mono text-fg-muted">{delivery.event}</span>
          <span className="flex items-center gap-2">
            <span className={delivery.status === "delivered" ? "text-fg-muted" : "text-danger"}>
              {delivery.status}
            </span>
            <span className="text-fg-subtle">
              {delivery.attempts} {delivery.attempts === 1 ? "attempt" : "attempts"}
              {delivery.lastAttemptAt ? ` · ${formatRelativeTime(delivery.lastAttemptAt)}` : ""}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Same one-time rule as an API key: only a receiver's copy can verify a signature. */
function IssuedSecret({ value, onDismiss }: { value: string; onDismiss: () => void }) {
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
      <p className="text-sm font-semibold text-fg">Copy this signing secret now</p>
      <p className="text-sm text-fg-muted">
        Your receiver needs it to verify signatures. It is shown only once.
      </p>

      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg border border-border bg-bg px-3 py-2 font-mono text-xs text-fg">
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy signing secret"
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
