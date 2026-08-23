"use client";

import {
  Calendar,
  Check,
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
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { DisabledAction } from "@/components/DisabledAction";
import { Spinner } from "@/components/Spinner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AttachmentDTO } from "@/contracts";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import { attachmentKind } from "@/lib/task-files";
import { downloadAttachment } from "@/components/files/FilesModal";
import { useHydrated } from "@/lib/use-hydrated";
import {
  isAttachmentExpired,
  useDeleteAttachment,
  useRenameAttachment,
} from "@/queries/use-attachments";

/**
 * The preview modal: media on the left, a source-aware detail column on the right. A generated file
 * leads with the prompt that produced it — the reference's own order — then name, date, source and
 * model; the prompt and model are joined from the transcript, because attachment rows carry neither.
 * The whole detail column sits on an inset rounded panel — `--panel-inset`, the same two-level trick
 * as the search palette — with its value boxes and actions raised back to `--panel`.
 *
 * Rename and delete are live against the attachment routes. Favorite stays disabled — no route
 * carries it (UI-7). An expired upload renders as expired; its URL is a dead link and is not fetched.
 */
export function ImagePreviewModal({
  attachment,
  prompt,
  model,
  onClose,
}: {
  attachment: AttachmentDTO;
  prompt: string | null;
  model: string | null;
  onClose: () => void;
}) {
  const [dimensions, setDimensions] = useState<string | null>(null);
  const hydrated = useHydrated();
  const remove = useDeleteAttachment();
  const expired = isAttachmentExpired(attachment);
  const kind = attachmentKind(attachment);

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
                {kind === "image" ? "Image Preview" : "File Preview"}
              </h2>
              <div className="flex items-center gap-1 text-fg-subtle">
                {attachment.url && !expired && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={attachment.url}
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
              <Media attachment={attachment} expired={expired} onDimensions={setDimensions} />
            </div>
          </div>

          <div className="m-5 ml-0 flex w-[400px] shrink-0 flex-col gap-4 rounded-2xl bg-panel-inset p-5">
            {prompt && <PromptBlock prompt={prompt} />}

            <DetailRow icon={FileIcon} label="File Name">
              <FileNameRow attachment={attachment} />
            </DetailRow>

            <DetailRow icon={Calendar} label="Created on" inline>
              {hydrated
                ? new Date(attachment.createdAt)
                    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                    .replaceAll(" ", "-")
                : ""}
            </DetailRow>

            <DetailRow icon={Sparkles} label="Source" inline>
              {attachment.source === "generated" ? "Generated in chat" : "Uploaded"}
            </DetailRow>

            {model && (
              <DetailRow icon={Sparkles} label="Model" inline>
                {model}
              </DetailRow>
            )}

            <DetailRow icon={FileIcon} label="Size" inline>
              {attachment.size > 0 ? formatBytes(attachment.size) : "—"}
            </DetailRow>

            {dimensions && (
              <DetailRow icon={Ruler} label="Dimensions" inline>
                {dimensions}
              </DetailRow>
            )}

            <div className="mt-auto grid grid-cols-2 gap-2">
              <DisabledAction
                icon={Heart}
                label="Add to Favorite"
                reason="Favorites aren't part of this build."
                className={actionClass}
                showLabel
              />
              <CopyLink url={expired ? null : attachment.url} />
              <button
                type="button"
                disabled={!attachment.url || expired}
                onClick={() => downloadAttachment(attachment)}
                className={cn(actionClass, "transition-colors hover:bg-surface disabled:opacity-50")}
              >
                <Download className="size-4" aria-hidden />
                Download
              </button>
              <button
                type="button"
                disabled={remove.isPending}
                onClick={() => remove.mutate(attachment.id, { onSuccess: onClose })}
                className={cn(
                  actionClass,
                  "text-danger transition-colors hover:bg-surface disabled:opacity-50",
                )}
              >
                {remove.isPending ? (
                  <Spinner className="size-4" />
                ) : (
                  <Trash2 className="size-4" aria-hidden />
                )}
                Delete File
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const actionClass =
  "flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-panel px-3 text-sm whitespace-nowrap";

/** The name box, with the pencil flipping it into an inline rename against the attachment route. */
function FileNameRow({ attachment }: { attachment: AttachmentDTO }) {
  const rename = useRenameAttachment();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(attachment.name);

  const save = () => {
    const name = value.trim();
    if (!name || name === attachment.name) {
      setEditing(false);
      setValue(attachment.name);
      return;
    }

    rename.mutate(
      { attachmentId: attachment.id, name },
      { onSettled: () => setEditing(false) },
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") save();
    if (event.key === "Escape") {
      setEditing(false);
      setValue(attachment.name);
    }
  };

  return (
    <span className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2">
      {editing ? (
        <input
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          aria-label="File name"
          className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm text-fg">{attachment.name}</span>
      )}
      {rename.isPending ? (
        <Spinner className="size-4 shrink-0" />
      ) : editing ? (
        <button
          type="button"
          aria-label="Save name"
          onClick={save}
          className="shrink-0 text-fg-muted transition-colors hover:text-fg"
        >
          <Check className="size-4" aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          aria-label="Rename file"
          onClick={() => setEditing(true)}
          className="shrink-0 text-fg-subtle transition-colors hover:text-fg"
        >
          <Pencil className="size-4" aria-hidden />
        </button>
      )}
    </span>
  );
}

function Media({
  attachment,
  expired,
  onDimensions,
}: {
  attachment: AttachmentDTO;
  expired: boolean;
  onDimensions: (value: string) => void;
}) {
  if (expired) {
    return (
      <p className="text-sm text-fg-subtle">
        This upload has expired — uploaded files are kept for 24 hours.
      </p>
    );
  }

  if (!attachment.url) {
    return <p className="text-sm text-fg-subtle">This file has no preview.</p>;
  }

  const kind = attachmentKind(attachment);

  if (kind === "video") {
    return <video controls src={attachment.url} className="max-h-[420px] max-w-full rounded-card" />;
  }

  if (kind === "audio") {
    return <audio controls src={attachment.url} className="w-full" />;
  }

  if (kind !== "image") {
    return <p className="text-sm text-fg-subtle">No inline preview for this type.</p>;
  }

  return (
    <img
      src={attachment.url}
      alt={attachment.name}
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
