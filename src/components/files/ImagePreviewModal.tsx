"use client";

import {
  Calendar,
  Copy,
  Download,
  ExternalLink,
  File as FileIcon,
  Heart,
  Link2,
  Pencil,
  Ruler,
  Sparkles,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { DisabledAction } from "@/components/DisabledAction";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import { downloadFile } from "@/components/files/FilesModal";
import { useHydrated } from "@/lib/use-hydrated";
import type { TaskFile } from "@/lib/task-files";

/**
 * The preview modal: media on the left, a source-aware detail column on the right. A generated file
 * leads with the prompt that produced it — the reference's own order — then name, date, source and
 * model, all read from the invocation the asset names, which is why the panel never has to guess.
 * An upload has no prompt and shows name/date/source/size instead. The whole detail column sits on
 * an inset rounded panel — `--panel-inset`, the same two-level trick as the search palette — with
 * its value boxes and actions raised back to `--panel`.
 *
 * Dimensions are measured off the loaded image itself; no contract carries them. Favorite, rename
 * and delete need asset routes this build does not have, so they render disabled with that reason
 * rather than pretending (UI-7).
 */
export function ImagePreviewModal({ file, onClose }: { file: TaskFile; onClose: () => void }) {
  const [dimensions, setDimensions] = useState<string | null>(null);
  const hydrated = useHydrated();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title="Image Preview"
        showTitle={false}
        className="w-[1080px] rounded-2xl p-0"
      >
        <div className="flex min-h-[560px]">
          <div className="flex min-w-0 flex-1 flex-col p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-fg">
                {file.kind === "image" ? "Image Preview" : "File Preview"}
              </h2>
              <div className="flex items-center gap-1 text-fg-subtle">
                {file.url && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open in a new tab"
                        className="rounded-md p-1.5 transition-colors hover:text-fg"
                      >
                        <ExternalLink className="size-4" aria-hidden />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>Open in a new tab</TooltipContent>
                  </Tooltip>
                )}
                <button
                  type="button"
                  aria-label="Close preview"
                  onClick={onClose}
                  className="rounded-md p-1.5 transition-colors hover:text-fg"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            </div>

            <div className="mt-4 grid min-h-0 flex-1 place-items-center">
              <Media file={file} onDimensions={setDimensions} />
            </div>
          </div>

          <div className="m-5 ml-0 flex w-[400px] shrink-0 flex-col gap-4 rounded-2xl bg-panel-inset p-5">
            {file.prompt && <PromptBlock prompt={file.prompt} />}

            <DetailRow icon={FileIcon} label="File Name">
              <span className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm text-fg">{file.name}</span>
                <DisabledAction
                  icon={Pencil}
                  label="Rename file"
                  reason="Renaming needs an asset route this build doesn't have."
                />
              </span>
            </DetailRow>

            <DetailRow icon={Calendar} label="Created on" inline>
              {hydrated
                ? new Date(file.createdAt)
                    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                    .replaceAll(" ", "-")
                : ""}
            </DetailRow>

            <DetailRow icon={Sparkles} label="Source" inline>
              {file.source === "generated" ? "Generated in chat" : "Uploaded"}
            </DetailRow>

            {file.model && (
              <DetailRow icon={Sparkles} label="Model" inline>
                {file.model}
              </DetailRow>
            )}

            {file.size !== null && (
              <DetailRow icon={FileIcon} label="Size" inline>
                {formatBytes(file.size)}
              </DetailRow>
            )}

            {dimensions && (
              <DetailRow icon={Ruler} label="Dimensions" inline>
                {dimensions}
              </DetailRow>
            )}

            <div className="mt-auto grid grid-cols-2 gap-2">
              <DisabledAction
                icon={Heart}
                label="Add to Favorite"
                reason="Favorites need an asset route this build doesn't have."
                className={actionClass}
                showLabel
              />
              <CopyLink url={file.url} />
              <button
                type="button"
                disabled={!file.url}
                onClick={() => downloadFile(file)}
                className={cn(actionClass, "transition-colors hover:bg-surface disabled:opacity-50")}
              >
                <Download className="size-4" aria-hidden />
                Download
              </button>
              <DisabledAction
                icon={Trash2}
                label="Delete File"
                reason="Deleting needs an asset route this build doesn't have."
                className={cn(actionClass, "!text-danger")}
                showLabel
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const actionClass =
  "flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-panel px-3 text-sm whitespace-nowrap";

function Media({ file, onDimensions }: { file: TaskFile; onDimensions: (value: string) => void }) {
  if (!file.url) {
    return <p className="text-sm text-fg-subtle">This file has no preview.</p>;
  }

  if (file.kind === "video") {
    return <video controls src={file.url} className="max-h-[420px] max-w-full rounded-card" />;
  }

  if (file.kind === "audio") {
    return <audio controls src={file.url} className="w-full" />;
  }

  if (file.kind !== "image") {
    return <p className="text-sm text-fg-subtle">No inline preview for this type.</p>;
  }

  return (
    <img
      src={file.url}
      alt={file.name}
      onLoad={(event) =>
        onDimensions(`${event.currentTarget.naturalWidth} X ${event.currentTarget.naturalHeight}`)
      }
      className="max-h-[420px] max-w-full rounded-card shadow-sm"
    />
  );
}

function DetailRow({
  icon: Icon,
  label,
  inline = false,
  children,
}: {
  icon: LucideIcon;
  label: string;
  inline?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn(inline && "flex items-center justify-between gap-3")}>
      <p className="flex items-center gap-2 text-sm text-fg-muted">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </p>
      {inline ? (
        <span className="text-sm text-fg">{children}</span>
      ) : (
        <div className="mt-2">{children}</div>
      )}
    </div>
  );
}

/** The generated-asset extra: the prompt that produced the file, with its own copy control. */
function PromptBlock({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <Copy className="size-3.5" aria-hidden />
          Prompt
        </p>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 1_500);
          }}
          className="text-xs text-fg-muted transition-colors hover:text-fg"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-2 max-h-28 overflow-y-auto rounded-lg border border-border bg-panel px-3 py-2 text-xs leading-5 text-fg-muted">
        {prompt}
      </p>
    </div>
  );
}

function CopyLink({ url }: { url: string | null }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      disabled={!url}
      onClick={() => {
        if (!url) return;
        void navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1_500);
      }}
      className={cn(actionClass, "transition-colors hover:bg-surface disabled:opacity-50")}
    >
      <Link2 className="size-4" aria-hidden />
      {copied ? "Copied" : "Copy Link"}
    </button>
  );
}
