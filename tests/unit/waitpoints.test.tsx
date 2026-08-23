import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { env } from "@/lib/env";
import { server } from "../msw/setup";
import { waitingOnPlan, waitingOnQuestions, waitpointExpired } from "../msw/handlers";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

const API = `${env.NEXT_PUBLIC_API_URL}/api/v1`;

/** Captures what the screen actually submits, and answers ok so the flow can finish. */
function captureResolution() {
  const sent: unknown[] = [];
  server.use(
    http.post(`${API}/waitpoints/:waitpointId/resolve`, async ({ request }) => {
      sent.push(await request.json());
      return HttpResponse.json({ data: { ok: true } });
    }),
  );

  return sent;
}

describe("the plan card", () => {
  it("renders the server's plan with its own credit estimates", async () => {
    server.use(waitingOnPlan);
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByText("Poster in three steps")).toBeInTheDocument();
    expect(screen.getByText("Generate the base image")).toBeInTheDocument();
    expect(screen.getByText(/~0\.42M/)).toBeInTheDocument();
    expect(screen.getByText(/~0\.43M/)).toBeInTheDocument();
    expect(screen.getByText("Estimated total")).toBeInTheDocument();
  });

  it("approves the whole plan on Run All", async () => {
    const user = userEvent.setup();
    server.use(waitingOnPlan);
    const sent = captureResolution();

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);
    await user.click(await screen.findByRole("button", { name: "Run All" }));

    await waitFor(() =>
      expect(sent).toEqual([
        { kind: "plan_approval", approved: true, executionMode: "auto" },
      ]),
    );
  });

  it("approves step-by-step through its own control", async () => {
    const user = userEvent.setup();
    server.use(waitingOnPlan);
    const sent = captureResolution();

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);
    await user.click(await screen.findByRole("button", { name: "Step by Step" }));

    await waitFor(() =>
      expect(sent).toEqual([
        { kind: "plan_approval", approved: true, executionMode: "step_by_step" },
      ]),
    );
  });

  it("sends feedback as a rejection from the in-card textarea", async () => {
    const user = userEvent.setup();
    server.use(waitingOnPlan);
    const sent = captureResolution();

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);
    await user.click(await screen.findByRole("button", { name: "Request Changes" }));
    await user.type(
      screen.getByRole("textbox", { name: "Requested changes" }),
      "Also add a bit of flair",
    );
    await user.keyboard("{Meta>}{Enter}{/Meta}");

    await waitFor(() =>
      expect(sent).toEqual([
        { kind: "plan_approval", approved: false, feedback: "Also add a bit of flair" },
      ]),
    );
  });

  it("runs all on Enter, which is the hint the card carries", async () => {
    const user = userEvent.setup();
    server.use(waitingOnPlan);
    const sent = captureResolution();

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);
    await screen.findByRole("button", { name: "Run All" });

    await user.keyboard("{Enter}");

    await waitFor(() => expect(sent).toHaveLength(1));
  });

  it("yields Enter to a focused control, so one keystroke cannot also approve the plan", async () => {
    const user = userEvent.setup();
    server.use(waitingOnPlan);
    const sent = captureResolution();

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);
    const changes = await screen.findByRole("button", { name: /Request Changes/i });

    changes.focus();
    await user.keyboard("{Enter}");

    expect(sent).toHaveLength(0);
  });

  it("says an expired waitpoint expired, instead of retrying it forever", async () => {
    const user = userEvent.setup();
    server.use(waitingOnPlan, waitpointExpired);

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);
    await user.click(await screen.findByRole("button", { name: "Run All" }));

    expect(await screen.findByText(/expired while it waited/i)).toBeInTheDocument();
  });
});

describe("the question panel", () => {
  it("replaces the composer while the agent waits", async () => {
    server.use(waitingOnQuestions);
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByText("Any style preferences?")).toBeInTheDocument();
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    expect(screen.queryByLabelText("Message")).not.toBeInTheDocument();
  });

  it("accumulates answers and submits exactly once, after the last question", async () => {
    const user = userEvent.setup();
    server.use(waitingOnQuestions);
    const sent = captureResolution();

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    await user.type(await screen.findByLabelText("Your answer"), "Swiss typographic{Enter}");

    expect(await screen.findByText(/Click to upload an image/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Skip" }));

    await user.click(await screen.findByRole("option", { name: /4:5 portrait/ }));

    await waitFor(() =>
      expect(sent).toEqual([
        {
          kind: "questions",
          answers: { style: "Swiss typographic", ratio: "4:5" },
          skipped: ["refs"],
        },
      ]),
    );
  });

  it("marks the recommended option so the escape hatch is visible", async () => {
    server.use(waitingOnQuestions);
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("Your answer"), "any{Enter}");
    await user.click(screen.getByRole("button", { name: "Skip" }));

    expect(await screen.findByText("Recommended")).toBeInTheDocument();
    expect(screen.getByText("Something else")).toBeInTheDocument();
  });

  it("dismisses without resolving and leaves a way back in", async () => {
    const user = userEvent.setup();
    server.use(waitingOnQuestions);
    const sent = captureResolution();

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);
    await user.click(await screen.findByRole("button", { name: "Dismiss questions" }));

    expect(await screen.findByLabelText("Message")).toBeInTheDocument();
    expect(sent).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: /resume answering/i }));

    expect(await screen.findByText("Any style preferences?")).toBeInTheDocument();
  });

  it("skips everything and still resolves, because skip is never blocked", async () => {
    const user = userEvent.setup();
    server.use(waitingOnQuestions);
    const sent = captureResolution();

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);
    await screen.findByText("Any style preferences?");

    await user.click(screen.getByRole("button", { name: "Skip" }));
    await user.click(await screen.findByRole("button", { name: "Skip" }));
    await user.click(await screen.findByRole("button", { name: "Skip" }));

    await waitFor(() =>
      expect(sent).toEqual([
        { kind: "questions", answers: {}, skipped: ["style", "refs", "ratio"] },
      ]),
    );
  });
});
