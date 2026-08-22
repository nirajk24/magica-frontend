"use client";

import type { AttachmentDTO } from "@/contracts";

/**
 * Sent attachments, which the reference renders above the bubble text and considerably larger than
 * a chip. A ready attachment with no URL yet keeps its box, so the transcript does not reflow as
 * images arrive after a reload.
 */
export function AttachmentGallery({ attachments }: { attachments: readonly AttachmentDTO[] }) {
  if (attachments.length === 0) return null;

  return (
    <div className="mb-2 flex flex-col gap-2">
      {attachments.map((attachment) =>
        attachment.url && attachment.type === "image" ? (
          <img
            key={attachment.id}
            src={attachment.url}
            alt={attachment.name}
            className="w-full rounded-card bg-surface"
            loading="lazy"
          />
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
