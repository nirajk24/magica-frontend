"use client";

import { BookOpen, ChevronLeft, ChevronRight, ExternalLink, KeyRound } from "lucide-react";
import { useState } from "react";
import { ManageApiKeys } from "@/components/settings/ManageApiKeys";
import { WebhookEndpoints } from "@/components/settings/WebhookEndpoints";
import { env } from "@/lib/env";

/**
 * The API Keys section: a landing view describing what keys are for, and a manage view behind it.
 *
 * The split follows the reference, and it is also the safer shape — the list is only fetched once
 * someone asks for it, so opening settings does not spend a request on data most visits ignore.
 */
export function ApiKeysSection() {
  const [managing, setManaging] = useState(false);

  if (managing) {
    return (
      <div className="flex flex-col gap-5">
        <button
          type="button"
          onClick={() => setManaging(false)}
          className="flex w-fit items-center gap-1 text-sm text-fg-muted transition-colors hover:text-fg"
        >
          <ChevronLeft className="size-4" strokeWidth={2.2} />
          API Keys
        </button>

        <ManageApiKeys />
        <WebhookEndpoints />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-fg">API Keys</h1>

      <div className="flex items-start justify-between gap-6 border-b border-border pb-6">
        <p className="max-w-[520px] text-sm text-fg-muted">
          Generate, label, and revoke API keys for programmatic access to your account. Use these
          keys with the public REST API.
        </p>

        <button
          type="button"
          onClick={() => setManaging(true)}
          className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-fg transition-colors hover:bg-panel"
        >
          <KeyRound className="size-4" strokeWidth={2.2} />
          Manage
          <ChevronRight className="size-4" strokeWidth={2.2} />
        </button>
      </div>

      <div className="flex items-start justify-between gap-6">
        <div className="flex gap-3">
          <BookOpen className="mt-0.5 size-5 shrink-0 text-fg-muted" strokeWidth={2} />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-fg">API documentation</p>
            <p className="max-w-[460px] text-sm text-fg-muted">
              Review REST API usage before creating production keys.
            </p>
          </div>
        </div>

        {env.NEXT_PUBLIC_API_DOCS_URL ? (
          <a
            href={env.NEXT_PUBLIC_API_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-fg transition-colors hover:bg-surface"
          >
            View
            <ExternalLink className="size-3.5" strokeWidth={2.2} />
          </a>
        ) : null}
      </div>
    </div>
  );
}
