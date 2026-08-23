import {
  ActivePlan,
  PlanApprovalPayload,
  QuestionsPayload,
  type ActiveRun,
  type PlanApprovalPayload as Plan,
  type QuestionsPayload as Questions,
} from "@/contracts";

/** A pending waitpoint with its payload parsed into the shape its kind promises. */
export type PendingWaitpoint =
  | { kind: "plan_approval"; id: string; plan: Plan }
  | { kind: "questions"; id: string; questions: Questions };

/**
 * Parses the loose `payload` a waitpoint travels with.
 *
 * The envelope stays `z.json()` on the wire because the orchestrator's metadata store requires
 * serializable JSON — so the kind names the schema, and this is the one place that switch happens.
 * A payload that does not parse renders nothing rather than a broken card: the run is still parked,
 * and the send box stays usable.
 */
export function parseWaitpoint(
  pending: ActiveRun["pendingWaitpoint"],
): PendingWaitpoint | null {
  if (!pending) return null;

  if (pending.kind === "plan_approval") {
    const plan = PlanApprovalPayload.safeParse(pending.payload);

    return plan.success ? { kind: "plan_approval", id: pending.id, plan: plan.data } : null;
  }

  const questions = QuestionsPayload.safeParse(pending.payload);

  return questions.success ? { kind: "questions", id: pending.id, questions: questions.data } : null;
}

/**
 * Parses `Chat.activePlan`, which travels as loose JSON for the same reason the waitpoint payload
 * does. A shape this build does not recognise renders no card rather than a broken one.
 */
export function parseActivePlan(value: unknown): ActivePlan | null {
  if (value == null) return null;

  const plan = ActivePlan.safeParse(value);

  return plan.success ? plan.data : null;
}
