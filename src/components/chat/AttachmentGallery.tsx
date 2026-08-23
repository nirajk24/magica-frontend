"use client";

import type { AttachmentDTO } from "@/contracts";
import { isAttachmentExpired } from "@/queries/use-attachments";
import { useUI } from "@/stores/ui";

/**
 * Sent attachments, which the reference renders above the bubble text and considerably larger than
 * a chip. A ready attachment with no URL yet keeps its box, so the transcript does not reflow as
 * images arrive after a reload. An expired upload keeps its box too — its URL is dead, so the
 * placeholder says so instead of fetching it.
 */
export function AttachmentGallery({ attachments }: { attachments: readonly AttachmentDTO[] }) {
  const setPreviewFile = useUI((state) => state.setPreviewFile);

  if (attachments.length === 0) return null;

  return (
    <div className="mb-2 flex flex-col gap-2">
      {attachments.map((attachment) =>
        isAttachmentExpired(attachment) ? (
          <div
            key={attachment.id}
            className="flex h-40 w-full items-center justify-center rounded-card bg-surface text-xs text-fg-subtle"
          >
            {attachment.name} — expired
          </div>
        ) : attachment.url && attachment.type === "image" ? (
          <button
            key={attachment.id}
            type="button"
            aria-label={`Preview ${attachment.name}`}
            onClick={() => setPreviewFile(attachment.id)}
          >
            <img
              src={attachment.url}
              alt={attachment.name}
              className="w-full rounded-card bg-surface"
              loading="lazy"
            />
          </button>
        ) : (
          <div
            key={attachment.id}
            className="flex h-40 w-full items-center justify-center rounded-card bg-surface text-xs text-fg-subtle"
          >
            {attachment.status === "failed" ? "Attachment unavailable" : attachment.name}
          </div>
        ),
      )}
    </div>
  );
}
