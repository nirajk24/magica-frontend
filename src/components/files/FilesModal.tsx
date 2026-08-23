"use client";

import { Download, FileText, Music, Video, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { MessageDTO } from "@/contracts";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/Spinner";
import { cn } from "@/lib/cn";
import { formatBytes, formatMessageTime } from "@/lib/format";
import {
  FILE_CATEGORIES,
  collectTaskFiles,
  type TaskFile,
  type TaskFileKind,
} from "@/lib/task-files";
import { useHydrated } from "@/lib/use-hydrated";
import { useUI } from "@/stores/ui";

/**
 * `All files in this task` — a view over the transcript already in the cache, so it needs no route
 * and it is exactly as fresh as the conversation behind it.
 *
 * The header sits between two hairlines — one under the title row, one under the tabs — which is
 * what makes the reference's boundary read clean. The active pill is the mid-grey, not black.
 *
 * `Download all` walks every shown file; a row's own click opens the preview. Downloads go through
 * an anchor with the `download` attribute — a cross-origin CDN may open the file instead of saving
 * it, which is the browser's call, not ours.
 */
export function FilesModal({ messages, pending }: { messages: readonly MessageDTO[]; pending: boolean }) {
  const open = useUI((state) => state.filesOpen);
  const setOpen = useUI((state) => state.setFilesOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent title="All files in this task" showTitle={false} className="w-[660px] rounded-2xl p-0">
        <ModalBody messages={messages} pending={pending} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ModalBody({
  messages,
  pending,
  onClose,
}: {
  messages: readonly MessageDTO[];
  pending: boolean;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<TaskFileKind | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const setPreviewFile = useUI((state) => state.setPreviewFile);
  const files = useMemo(() => collectTaskFiles(messages), [messages]);
  const shown = category ? files.filter((file) => file.kind === category) : files;
  const allSelected = shown.length > 0 && shown.every((file) => selected.has(file.key));

  const toggleSelect = (key: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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
              setSelected(allSelected ? new Set() : new Set(shown.map((file) => file.key)))
            }
            className="rounded-md px-2 py-1 transition-colors hover:text-fg disabled:opacity-50"
          >
            Select all
          </button>
          <button
            type="button"
            disabled={shown.length === 0}
            onClick={() => {
              const targets = selected.size > 0 ? shown.filter((f) => selected.has(f.key)) : shown;
              for (const file of targets) downloadFile(file);
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
          const count = kind ? files.filter((file) => file.kind === kind).length : files.length;
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
        {pending ? (
          <div className="grid h-full place-items-center">
            <Spinner className="size-5" />
          </div>
        ) : shown.length === 0 ? (
          <p className="px-2 py-10 text-center text-sm text-fg-subtle">
            {files.length === 0 ? "No files in this task yet." : "Nothing of that type here."}
          </p>
        ) : (
          <FileRows
            files={shown}
            selected={selected}
            onToggleSelect={toggleSelect}
            onOpen={(file) => setPreviewFile(file.key)}
          />
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
  files,
  selected,
  onToggleSelect,
  onOpen,
}: {
  files: readonly TaskFile[];
  selected: ReadonlySet<string>;
  onToggleSelect: (key: string) => void;
  onOpen: (file: TaskFile) => void;
}) {
  const hydrated = useHydrated();
  const groups = new Map<string, TaskFile[]>();
  for (const file of files) {
    const label = dayLabel(file.createdAt);
    groups.set(label, [...(groups.get(label) ?? []), file]);
  }

  return (
    <div className="flex flex-col gap-1">
      {[...groups.entries()].map(([label, rows]) => (
        <div key={label}>
          <p className="px-2 pt-2 pb-1 text-xs text-fg-subtle">{hydrated ? label : ""}</p>
          {rows.map((file) => (
            <button
              key={file.key}
              type="button"
              onClick={() => onOpen(file)}
              className="group/row flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface"
            >
              <span
                role="checkbox"
                aria-checked={selected.has(file.key)}
                aria-label={`Select ${file.name}`}
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleSelect(file.key);
                }}
                onKeyDown={(event) => {
                  if (event.key !== " " && event.key !== "Enter") return;
                  event.preventDefault();
                  event.stopPropagation();
                  onToggleSelect(file.key);
                }}
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded border text-[10px] transition-opacity",
                  selected.has(file.key)
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border-strong opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100",
                  selected.size > 0 && "opacity-100",
                )}
              >
                {selected.has(file.key) && "✓"}
              </span>
              <FileThumb file={file} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-fg">{file.name}</span>
                <span className="block text-xs text-fg-subtle">
                  {[
                    extensionLabel(file),
                    hydrated ? formatMessageTime(file.createdAt) : null,
                    file.size !== null ? formatBytes(file.size) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function FileThumb({ file }: { file: TaskFile }) {
  if (file.kind === "image" && file.url) {
    return <img src={file.url} alt="" className="size-11 shrink-0 rounded-lg bg-surface object-cover" />;
  }

  const Icon = file.kind === "video" ? Video : file.kind === "audio" ? Music : FileText;

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

function extensionLabel(file: TaskFile): string {
  const dot = file.name.lastIndexOf(".");

  return dot > 0 ? file.name.slice(dot + 1).toUpperCase() : file.kind.toUpperCase();
}

/** An anchor click with `download`; a cross-origin CDN may open instead of saving — browser's call. */
export function downloadFile(file: TaskFile): void {
  if (!file.url) return;

  const anchor = document.createElement("a");
  anchor.href = file.url;
  anchor.download = file.name;
  anchor.target = "_blank";
  anchor.rel = "noreferrer";
  anchor.click();
}
