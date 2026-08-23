import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveRun, RunMetadata, RunPhase } from "@/contracts";
import { LiveRun } from "@/components/chat/LiveRun";
import { qk } from "@/lib/query-client";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

const realtime = vi.hoisted(() => ({ metadata: undefined as unknown }));

vi.mock("@trigger.dev/react-hooks", () => ({
  useRealtimeRun: () => ({
    run: { metadata: realtime.metadata },
    error: undefined,
    stop: () => {},
  }),
  useRealtimeStream: () => ({ parts: [], error: undefined, stop: () => {} }),
}));

const snapshot = (phase: RunPhase): RunMetadata => ({
  phase,
  phaseStartedAt: 1_756_000_000_000,
  stepsCompleted: 1,
  blocks: [],
  invocations: [],
  waitpoint: {
    id: fixtures.WAITPOINT_ID,
    kind: "plan_approval",
    payload: fixtures.planApprovalPayload,
  },
});

const parkedRun: ActiveRun = { ...fixtures.activeRun, status: "waiting" };

/** Serialised so a key can be counted without reaching into the spy's argument types. */
let invalidated: string[] = [];

const activeRunInvalidations = () =>
  invalidated.filter((key) => key === JSON.stringify(qk.activeRun(fixtures.CHAT_ID))).length;

describe("LiveRun", () => {
  beforeEach(() => {
    realtime.metadata = undefined;
    invalidated = [];
    vi.spyOn(QueryClient.prototype, "invalidateQueries").mockImplementation((filters) => {
      invalidated.push(JSON.stringify(filters?.queryKey));

      return Promise.resolve();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  /**
   * The refetch this signal triggers mints a new realtime token, and the transcript keys this subtree
   * on that token — so signalling a waitpoint `active-run` already carries remounts, re-signals, and
   * refetches again for as long as the run stays parked.
   */
  it("signals a waitpoint the active run does not carry yet", () => {
    realtime.metadata = snapshot("waiting");
    renderWithProviders(<LiveRun chatId={fixtures.CHAT_ID} run={parkedRun} />);

    expect(activeRunInvalidations()).toBe(1);
  });

  it("does not signal one it already carries, however many updates arrive", () => {
    realtime.metadata = snapshot("waiting");
    const carried: ActiveRun = {
      ...parkedRun,
      pendingWaitpoint: {
        id: fixtures.WAITPOINT_ID,
        kind: "plan_approval",
        payload: fixtures.planApprovalPayload,
      },
    };

    const { rerender, queryClient } = renderWithProviders(
      <LiveRun chatId={fixtures.CHAT_ID} run={carried} />,
    );

    // A fresh snapshot object every update is what realtime actually delivers.
    realtime.metadata = snapshot("waiting");
    rerender(
      <QueryClientProvider client={queryClient}>
        <LiveRun chatId={fixtures.CHAT_ID} run={carried} />
      </QueryClientProvider>,
    );

    expect(activeRunInvalidations()).toBe(0);
  });

  it("leaves a parked run alone instead of treating its silence as a dead transport", () => {
    vi.useFakeTimers();
    realtime.metadata = snapshot("waiting");

    renderWithProviders(<LiveRun chatId={fixtures.CHAT_ID} run={parkedRun} />);
    invalidated = [];

    act(() => void vi.advanceTimersByTime(45_000));

    expect(invalidated).toEqual([]);
  });

  /**
   * Resubscribing is a remount by design, so the replacement mounts with nothing delivered yet.
   * Falling back to the pending row there blanks a turn that is mid-flight.
   */
  it("keeps the turn on screen across the remount a resubscribe costs", () => {
    realtime.metadata = snapshot("working");
    const first = renderWithProviders(<LiveRun chatId={fixtures.CHAT_ID} run={parkedRun} />);
    expect(first.getByTestId("streaming-overlay")).toBeInTheDocument();
    first.unmount();

    realtime.metadata = undefined;
    const resubscribed = renderWithProviders(
      <LiveRun chatId={fixtures.CHAT_ID} run={parkedRun} />,
    );

    expect(resubscribed.getByTestId("streaming-overlay")).toBeInTheDocument();
  });

  it("does not carry one run's snapshot into another", () => {
    realtime.metadata = snapshot("working");
    renderWithProviders(<LiveRun chatId={fixtures.CHAT_ID} run={parkedRun} />).unmount();

    realtime.metadata = undefined;
    const next = renderWithProviders(
      <LiveRun chatId={fixtures.CHAT_ID} run={{ ...parkedRun, runId: "run_other" }} />,
    );

    expect(next.queryByTestId("streaming-overlay")).not.toBeInTheDocument();
  });

  /**
   * Metadata reports reasoning for the current block only, so every earlier one is remembered as it
   * goes past. Keeping that history in the overlay's own state loses it on the remount a resubscribe
   * costs — which empties every thinking row the turn has already written.
   */
  it("keeps earlier reasoning readable across a resubscribe", () => {
    const thinking = {
      ...snapshot("working"),
      waitpoint: undefined,
      blocks: [{ segment: 0, type: "thinking" as const }],
      reasoningText: "weighing the options",
    };

    const first = renderWithProviders(<LiveRun chatId={fixtures.CHAT_ID} run={parkedRun} />);
    realtime.metadata = thinking;
    first.rerender(
      <QueryClientProvider client={first.queryClient}>
        <LiveRun chatId={fixtures.CHAT_ID} run={parkedRun} />
      </QueryClientProvider>,
    );
    expect(first.getByText("weighing the options")).toBeInTheDocument();
    first.unmount();

    // A tool call lands, so the thinking block is no longer the one metadata reports on.
    realtime.metadata = {
      ...thinking,
      blocks: [
        { segment: 0, type: "thinking" as const },
        { segment: 0, type: "tool_use" as const, toolUseId: "call_1", name: "ask_questions" },
      ],
      reasoningText: undefined,
    };

    const resubscribed = renderWithProviders(
      <LiveRun chatId={fixtures.CHAT_ID} run={parkedRun} />,
    );

    expect(resubscribed.getByText("weighing the options")).toBeInTheDocument();
  });

  it("still re-reads a run that goes quiet while it is meant to be working", () => {
    vi.useFakeTimers();
    realtime.metadata = { ...snapshot("working"), waitpoint: undefined };

    renderWithProviders(<LiveRun chatId={fixtures.CHAT_ID} run={fixtures.activeRun} />);
    invalidated = [];

    act(() => void vi.advanceTimersByTime(45_000));

    expect(invalidated.length).toBeGreaterThan(0);
  });
});
