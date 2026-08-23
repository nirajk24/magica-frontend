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
 * INVARIANT: while an overlay is live, a `streaming` row is not one of them — it is being written
 * on screen already. This is the only place that rule lives; two places holding it is how the
 * duplicate bubble at handover comes back.
 *
 * INVARIANT: `liveOverlay` defaults to true and goes false only once `active-run` has actually
 * answered "nothing is running". Treating an unanswered request as "no overlay" paints the
 * half-written row for the several seconds that request takes — it mints a realtime token, so it
 * lands long after the transcript beside it — and then pulls the row back out, which reads as the
 * reasoning appearing and vanishing as a chat opens.
 */
export function selectTranscript(
  messages: readonly MessageDTO[],
  options: { liveOverlay?: boolean } = {},
): MessageDTO[] {
  const liveOverlay = options.liveOverlay ?? true;

  return messages.filter((message) => {
    if (!TRANSCRIPT_ROLES.has(message.role)) return false;

    return !(liveOverlay && message.status === "streaming");
  });
}
