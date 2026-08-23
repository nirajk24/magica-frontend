"use client";

import type { AttachmentDTO } from "@/contracts";
import { isAttachmentExpired } from "@/queries/use-attachments";
import { useUI } from "@/stores/ui";

/**
 * How wide a sent attachment renders. The reference draws an attachment and a generated asset at the
 * same width, so this matches `AssetStrip`'s.
 */
const ATTACHMENT_WIDTH = 340;

/**
 * Sent attachments, which the reference renders above the bubble text and considerably larger than
 * a chip. A ready attachment with no URL yet keeps its box, so the transcript does not reflow as
 * images arrive after a reload. An expired upload keeps its box too — its URL is dead, so the
 * placeholder says so instead of fetching it.
 *
 * INVARIANT: the width cap lives on the container, so every branch below is bounded by it — an
 * image, a placeholder and an expiry notice cannot size differently.
 */
export function AttachmentGallery({ attachments }: { attachments: readonly AttachmentDTO[] }) {
  const setPreviewFile = useUI((state) => state.setPreviewFile);

  if (attachments.length === 0) return null;

  return (
    <div className="mb-2 flex flex-col gap-2" style={{ maxWidth: ATTACHMENT_WIDTH }}>
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
              className="max-h-[320px] w-auto max-w-full rounded-card bg-surface"
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
