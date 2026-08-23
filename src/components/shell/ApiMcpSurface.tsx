"use client";

import { ExternalLink, KeyRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { env } from "@/lib/env";

/**
 * The API / MCP destination.
 *
 * The public REST API is real in this build, so this page points at it rather than saying the
 * section is unimplemented. MCP is not built, and the copy says which half is which instead of
 * letting one absence imply the other.
 */
export function ApiMcpSurface() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="mx-auto flex h-full w-full max-w-[720px] flex-col justify-center gap-6 px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-semibold text-fg">API / MCP</h1>
        <p className="text-sm text-fg-muted">
          A versioned REST API exposes conversations, run status and direct tool execution, with
          signed webhooks for turn and tool lifecycle events. An MCP server is not part of this
          build.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => router.replace(`${pathname}?settings=api-keys`, { scroll: false })}
          className="flex items-center gap-2 rounded-full bg-fg px-4 py-2 text-sm font-semibold text-bg"
        >
          <KeyRound className="size-4" strokeWidth={2.2} />
          Manage API keys
        </button>

        {env.NEXT_PUBLIC_API_DOCS_URL ? (
          <a
            href={env.NEXT_PUBLIC_API_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-fg transition-colors hover:bg-surface"
          >
            API documentation
            <ExternalLink className="size-3.5" strokeWidth={2.2} />
          </a>
        ) : null}
      </div>
    </div>
  );
}
