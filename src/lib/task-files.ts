import type { MessageDTO } from "@/contracts";

export type TaskFileKind = "image" | "video" | "audio" | "document" | "code";

/** One file the task has produced or been given, flattened out of the transcript. */
export type TaskFile = {
  /** Stable identity: the asset's url, or the attachment's id. */
  key: string;
  url: string | null;
  name: string;
  kind: TaskFileKind;
  size: number | null;
  createdAt: string;
  source: "generated" | "uploaded";
  model: string | null;
  prompt: string | null;
};

/** The files modal's tabs, in the reference's order. */
export const FILE_CATEGORIES = [
  { label: "All", kind: null },
  { label: "Documents", kind: "document" },
  { label: "Images", kind: "image" },
  { label: "Videos", kind: "video" },
  { label: "Audio", kind: "audio" },
  { label: "Code files", kind: "code" },
] as const satisfies readonly { label: string; kind: TaskFileKind | null }[];

/**
 * Every file in a task, newest first: generated assets and ready uploads, read out of the messages
 * already in the cache — "files in this task" is a view over the transcript, not a route.
 *
 * A generated file's prompt is joined from the tool invocation its `toolCallId` names, which is how
 * the preview can show what produced an image without the asset carrying its own copy.
 */
export function collectTaskFiles(messages: readonly MessageDTO[]): TaskFile[] {
  const files: TaskFile[] = [];

  for (const message of messages) {
    for (const attachment of message.attachments ?? []) {
      if (attachment.status !== "ready") continue;

      files.push({
        key: attachment.id,
        url: attachment.url,
        name: attachment.name,
        kind: kindFromContentType(attachment.contentType, attachment.type),
        size: attachment.size,
        createdAt: message.createdAt,
        source: "uploaded",
        model: null,
        prompt: null,
      });
    }

    for (const asset of message.assets ?? []) {
      const invocation = asset.toolCallId
        ? message.toolInvocations.find((candidate) => candidate.toolUseId === asset.toolCallId)
        : undefined;
      const input = invocation?.input;
      const prompt =
        input && typeof input === "object" && "prompt" in input && typeof input.prompt === "string"
          ? input.prompt
          : null;

      files.push({
        key: asset.url,
        url: asset.url,
        name: nameFromUrl(asset.url),
        kind: asset.type,
        size: null,
        createdAt: message.createdAt,
        source: "generated",
        model: asset.model ?? invocation?.subModelId ?? null,
        prompt,
      });
    }
  }

  return files.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function findTaskFile(messages: readonly MessageDTO[], key: string): TaskFile | null {
  return collectTaskFiles(messages).find((file) => file.key === key) ?? null;
}

/** The url's basename, which is the only name a generated asset has. */
function nameFromUrl(url: string): string {
  try {
    const segments = new URL(url).pathname.split("/");
    const last = segments[segments.length - 1];

    return last ? decodeURIComponent(last) : url;
  } catch {
    return url;
  }
}

function kindFromContentType(contentType: string, fallback: TaskFile["kind"]): TaskFileKind {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.startsWith("text/") || contentType.includes("json")) return "code";
  if (contentType.includes("pdf") || contentType.startsWith("application/")) return "document";

  return fallback;
}
