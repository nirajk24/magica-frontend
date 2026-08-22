import type { ChatWithMessages, MessageDTO } from "@/contracts";

const TRANSCRIPT_ROLES: ReadonlySet<MessageDTO["role"]> = new Set<MessageDTO["role"]>([
  "user",
  "assistant",
]);

/**
 * Flattens message pages into one chronological list.
 *
 * Each page is oldest-first internally, but `messagesNextCursor` walks backwards in time, so page
 * order has to be reversed before concatenating or the history interleaves.
 */
export function flattenMessagePages(pages: readonly ChatWithMessages[]): MessageDTO[] {
  return [...pages].reverse().flatMap((page) => page.messages);
}

/**
 * The rows the transcript shows.
 *
 * INVARIANT: while a streaming overlay owns `overlayRunId`, the persisted row for that run is
 * filtered out here and nowhere else. Two places holding this rule is how the duplicate bubble at
 * handover comes back.
 */
export function selectTranscript(
  messages: readonly MessageDTO[],
  options: { overlayRunId?: string | null } = {},
): MessageDTO[] {
  const overlayRunId = options.overlayRunId ?? null;

  return messages.filter((message) => {
    if (!TRANSCRIPT_ROLES.has(message.role)) return false;

    return !(overlayRunId !== null && message.status === "streaming" && message.runId === overlayRunId);
  });
}
