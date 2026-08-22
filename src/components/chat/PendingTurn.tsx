"use client";

import { ThinkingRow } from "@/components/blocks/ThinkingRow";

const NO_TOOLS = new Map();

/**
 * A turn that has been accepted but has reported nothing yet.
 *
 * The reference shows this the instant a send lands — the bubble top-right, a bare `Thinking` row
 * beneath it — and does not wait for the run to be dispatched. Rendering nothing until a
 * `triggerRunId` exists leaves the screen looking as though the send did not happen, which is
 * exactly when someone sends again.
 */
export function PendingTurn() {
  return (
    <ThinkingRow block={{ segment: 0, type: "thinking", thinking: "" }} tools={NO_TOOLS} streaming />
  );
}
