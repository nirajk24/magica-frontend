"use client";

import { FileText, Images, Music, Paperclip, RotateCcw, Upload, Video, X } from "lucide-react";
import { useRef } from "react";
import { DisabledAction } from "@/components/DisabledAction";
import { Spinner } from "@/components/Spinner";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import type { UploadAttachments, UploadItem } from "@/queries/use-upload-attachments";

const ACCEPT = "image/*,video/*,audio/*";

/**
 * The composer's paperclip: the reference opens a small popover offering the device upload and the
 * asset library. Upload is live; Select Asset needs the library picker, which this build does not
 * have, so it renders disabled with the reason (UI-7).
 */
export function AttachButton({
  uploads,
  disabled = false,
}: {
  uploads: UploadAttachments;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        aria-hidden
        tabIndex={-1}
        onChange={(event) => {
          uploads.addFiles([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
      />

      <Popover>
        <PopoverTrigger
          aria-label="Attach a file"
          disabled={disabled || uploads.full}
          className="text-fg-subtle transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Paperclip className="size-4" aria-hidden />
        </PopoverTrigger>
        <PopoverContent align="start" side="top" className="w-[240px] rounded-2xl p-3">
          <p className="px-1 text-xs leading-5 text-fg-muted">
            Add a file from your device or select one from your library
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            <DisabledAction
              icon={Images}
              label="Select Asset"
              reason="The asset picker isn't part of this build."
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm"
              showLabel
            />
            <PopoverClose asChild>
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-fg text-sm font-semibold text-bg transition-opacity hover:opacity-90"
              >
                <Upload className="size-4" aria-hidden />
                Upload
              </button>
            </PopoverClose>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

/**
 * The chips for files being attached: a square thumbnail per file with a ✕ badge overlapping its
 * corner, the way the reference draws a pending attachment. A failing chip keeps its reason on the
 * tooltip and inline below the strip, with a retry.
 */
export function UploadChips({ uploads }: { uploads: UploadAttachments }) {
  if (uploads.items.length === 0) return null;

  const firstError = uploads.items.find((item) => item.error !== null)?.error ?? null;

  return (
    <div className="mb-2">
      <div className="flex flex-wrap gap-2">
        {uploads.items.map((item) => (
          <Chip key={item.localId} item={item} uploads={uploads} />
        ))}
      </div>
      {firstError && (
        <p role="alert" className="mt-1.5 text-xs text-danger">
          {firstError}
        </p>
      )}
    </div>
  );
}

function Chip({ item, uploads }: { item: UploadItem; uploads: UploadAttachments }) {
  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "grid size-14 place-items-center overflow-hidden rounded-xl border bg-surface",
              item.status === "failed" ? "border-danger" : "border-border",
            )}
          >
            {item.previewUrl ? (
              <img
                src={item.previewUrl}
                alt={item.name}
                className={cn("size-full object-cover", item.status === "uploading" && "opacity-50")}
              />
            ) : (
              <ChipGlyph contentType={item.contentType} />
            )}

            {item.status === "uploading" && (
              <span className="absolute inset-0 grid place-items-center">
                <Spinner className="size-4 text-fg" />
              </span>
            )}

            {item.status === "failed" && (
              <button
                type="button"
                aria-label={`Retry uploading ${item.name}`}
                onClick={() => uploads.retry(item.localId)}
                className="absolute inset-0 grid place-items-center bg-bg/60 text-fg"
              >
                <RotateCcw className="size-4" aria-hidden />
              </button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>{item.error ?? item.name}</TooltipContent>
      </Tooltip>

      <button
        type="button"
        aria-label={`Remove ${item.name}`}
        onClick={() => uploads.remove(item.localId)}
        className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full border border-border bg-panel text-fg-muted shadow-sm transition-colors hover:text-fg"
      >
        <X className="size-3" aria-hidden />
      </button>
    </div>
  );
}

function ChipGlyph({ contentType }: { contentType: string }) {
  const Icon = contentType.startsWith("video/")
    ? Video
    : contentType.startsWith("audio/")
      ? Music
      : FileText;

  return <Icon className="size-5 text-fg-subtle" aria-hidden />;
}
