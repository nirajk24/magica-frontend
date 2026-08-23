import type { AttachmentDTO, MessageDTO } from "@/contracts";

export type TaskFileKind = "image" | "video" | "audio" | "document" | "code";

/** The files modal's tabs, in the reference's order. */
export const FILE_CATEGORIES = [
  { label: "All", kind: null },
  { label: "Documents", kind: "document" },
  { label: "Images", kind: "image" },
  { label: "Videos", kind: "video" },
  { label: "Audio", kind: "audio" },
  { label: "Code files", kind: "code" },
] as const satisfies readonly { label: string; kind: TaskFileKind | null }[];

/** The tab an attachment files under, derived from its MIME type first and its media type second. */
export function attachmentKind(attachment: Pick<AttachmentDTO, "contentType" | "type">): TaskFileKind {
  const { contentType } = attachment;

  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.startsWith("text/") || contentType.includes("json")) return "code";
  if (contentType.includes("pdf") || contentType.startsWith("application/")) return "document";

  return attachment.type;
}

/**
 * What produced a generated file, joined from the transcript already in the cache. Attachment rows
 * carry no prompt or model — the invocation that made the file does, keyed by the asset's URL.
 */
export function generationDetails(
  messages: readonly MessageDTO[],
  url: string | null,
): { prompt: string | null; model: string | null } | null {
  if (!url) return null;

  for (const message of messages) {
    const asset = (message.assets ?? []).find((candidate) => candidate.url === url);
    if (!asset) continue;

    const invocation = asset.toolCallId
      ? message.toolInvocations.find((candidate) => candidate.toolUseId === asset.toolCallId)
      : undefined;
    const input = invocation?.input;
    const prompt =
      input && typeof input === "object" && "prompt" in input && typeof input.prompt === "string"
        ? input.prompt
        : null;

    return { prompt, model: asset.model ?? invocation?.subModelId ?? null };
  }

  return null;
}
