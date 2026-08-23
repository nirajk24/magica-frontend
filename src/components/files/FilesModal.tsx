"use client";

import { Download, FileText, Music, Video, X } from "lucide-react";
import { useState } from "react";
import type { AttachmentDTO } from "@/contracts";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/Spinner";
import { cn } from "@/lib/cn";
import { formatBytes, formatMessageTime } from "@/lib/format";
import { FILE_CATEGORIES, attachmentKind, type TaskFileKind } from "@/lib/task-files";
import { useHydrated } from "@/lib/use-hydrated";
import { isAttachmentExpired, useAttachmentList } from "@/queries/use-attachments";
import { useUI } from "@/stores/ui";

/**
 * `All files in this task` — the attachments route scoped to this chat, uploads and generated media
 * in one list. The type tabs filter the fetched rows client-side; the route owns order and paging.
 *
 * The header sits between two hairlines — one under the title row, one under the tabs — which is
 * what makes the reference's boundary read clean. The active pill is the mid-grey, not black.
 *
 * `Download all` walks every shown file; a row's own click opens the preview. Downloads go through
 * an anchor with the `download` attribute — a cross-origin CDN may open the file instead of saving
 * it, which is the browser's call, not ours. An expired upload's URL is dead, so its row says so
 * and downloads skip it.
 */
export function FilesModal({ chatId }: { chatId: string }) {
  const open = useUI((state) => state.filesOpen);
  const setOpen = useUI((state) => state.setFilesOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent title="All files in this task" showTitle={false} className="w-[660px] rounded-2xl p-0">
        <ModalBody chatId={chatId} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ModalBody({ chatId, onClose }: { chatId: string; onClose: () => void }) {
  const [category, setCategory] = useState<TaskFileKind | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const setPreviewFile = useUI((state) => state.setPreviewFile);
  const { query, attachments } = useAttachmentList({ chatId });
  const shown = category
    ? attachments.filter((attachment) => attachmentKind(attachment) === category)
    : attachments;
  const allSelected = shown.length > 0 && shown.every((attachment) => selected.has(attachment.id));

  const toggleSelect = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex h-[640px] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-[15px] font-semibold text-fg">All files in this task</h2>
        <div className="flex items-center gap-1 text-sm text-fg-muted">
          <button
            type="button"
            disabled={shown.length === 0}
            aria-pressed={allSelected}
            onClick={() =>
              setSelected(
                allSelected ? new Set() : new Set(shown.map((attachment) => attachment.id)),
              )
            }
            className="rounded-md px-2 py-1 transition-colors hover:text-fg disabled:opacity-50"
          >
            Select all
          </button>
          <button
            type="button"
            disabled={shown.length === 0}
            onClick={() => {
              const targets =
                selected.size > 0 ? shown.filter((a) => selected.has(a.id)) : shown;
              for (const attachment of targets) downloadAttachment(attachment);
            }}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:text-fg disabled:opacity-50"
          >
            <Download className="size-3.5" aria-hidden />
            Download all
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1 text-fg-subtle transition-colors hover:text-fg"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="File types"
        className="flex items-center gap-1.5 overflow-x-auto border-b border-border px-5 py-3"
      >
        {FILE_CATEGORIES.map(({ label, kind }) => {
          const count = kind
            ? attachments.filter((attachment) => attachmentKind(attachment) === kind).length
            : attachments.length;
          const active = category === kind;

          return (
            <button
              key={label}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setCategory(kind)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors",
                active ? "bg-fg-subtle text-bg" : "bg-surface text-fg-muted hover:text-fg",
              )}
            >
              {label}
              {count > 0 && <span className={active ? "opacity-70" : "text-fg-subtle"}>{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {query.isPending ? (
          <div className="grid h-full place-items-center">
            <Spinner className="size-5" />
          </div>
        ) : shown.length === 0 ? (
          <p className="px-2 py-10 text-center text-sm text-fg-subtle">
            {attachments.length === 0 ? "No files in this task yet." : "Nothing of that type here."}
          </p>
        ) : (
          <>
            <FileRows
              attachments={shown}
              selected={selected}
              onToggleSelect={toggleSelect}
              onOpen={(attachment) => setPreviewFile(attachment.id)}
            />
            {query.hasNextPage && (
              <button
                type="button"
                onClick={() => query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
                className="mt-2 w-full rounded-md py-2 text-sm text-fg-muted transition-colors hover:text-fg"
              >
                {query.isFetchingNextPage ? "Loading..." : "Load more"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Rows grouped under day labels, `Today` first, exactly the way the capture groups them. Once
 * anything is selected each row shows its checkbox; `Download all` then takes the selection.
 */
function FileRows({
  attachments,
  selected,
  onToggleSelect,
  onOpen,
}: {
  attachments: readonly AttachmentDTO[];
  selected: ReadonlySet<string>;
  onToggleSelect: (id: string) => void;
  onOpen: (attachment: AttachmentDTO) => void;
}) {
  const hydrated = useHydrated();
  const groups = new Map<string, AttachmentDTO[]>();
  for (const attachment of attachments) {
    const label = dayLabel(attachment.createdAt);
    groups.set(label, [...(groups.get(label) ?? []), attachment]);
  }

  return (
    <div className="flex flex-col gap-1">
      {[...groups.entries()].map(([label, rows]) => (
        <div key={label}>
          <p className="px-2 pt-2 pb-1 text-xs text-fg-subtle">{hydrated ? label : ""}</p>
          {rows.map((attachment) => {
            const expired = isAttachmentExpired(attachment);

            return (
              <button
                key={attachment.id}
                type="button"
                onClick={() => onOpen(attachment)}
                className="group/row flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface"
              >
                <span
                  role="checkbox"
                  aria-checked={selected.has(attachment.id)}
                  aria-label={`Select ${attachment.name}`}
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleSelect(attachment.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== " " && event.key !== "Enter") return;
                    event.preventDefault();
                    event.stopPropagation();
                    onToggleSelect(attachment.id);
                  }}
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded border text-[10px] transition-opacity",
                    selected.has(attachment.id)
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border-strong opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100",
                    selected.size > 0 && "opacity-100",
                  )}
                >
                  {selected.has(attachment.id) && "✓"}
                </span>
                <FileThumb attachment={attachment} expired={expired} />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-sm font-semibold",
                      expired ? "text-fg-subtle" : "text-fg",
                    )}
                  >
                    {attachment.name}
                  </span>
                  <span className="block text-xs text-fg-subtle">
                    {[
                      extensionLabel(attachment),
                      hydrated ? formatMessageTime(attachment.createdAt) : null,
                      attachment.size > 0 ? formatBytes(attachment.size) : "—",
                      expired ? "Expired" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function FileThumb({ attachment, expired }: { attachment: AttachmentDTO; expired: boolean }) {
  if (attachmentKind(attachment) === "image" && attachment.url && !expired) {
    return (
      <img
        src={attachment.url}
        alt=""
        className="size-11 shrink-0 rounded-lg bg-surface object-cover"
      />
    );
  }

  const kind = attachmentKind(attachment);
  const Icon = kind === "video" ? Video : kind === "audio" ? Music : FileText;

  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface text-fg-subtle">
      <Icon className="size-4" aria-hidden />
    </span>
  );
}

function dayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function extensionLabel(attachment: AttachmentDTO): string {
  const dot = attachment.name.lastIndexOf(".");

  return dot > 0
    ? attachment.name.slice(dot + 1).toUpperCase()
    : attachmentKind(attachment).toUpperCase();
}

/** An anchor click with `download`; a cross-origin CDN may open instead of saving — browser's call. */
export function downloadAttachment(
  attachment: Pick<AttachmentDTO, "url" | "name" | "expiresAt">,
): void {
  if (!attachment.url || isAttachmentExpired(attachment)) return;

  const anchor = document.createElement("a");
  anchor.href = attachment.url;
  anchor.download = attachment.name;
  anchor.target = "_blank";
  anchor.rel = "noreferrer";
  anchor.click();
}
