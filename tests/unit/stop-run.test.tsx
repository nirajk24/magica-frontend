import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { env } from "@/lib/env";
import { useUI } from "@/stores/ui";
import { server } from "../msw/setup";
import { cancelFails, noActiveRun } from "../msw/handlers";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

const API = `${env.NEXT_PUBLIC_API_URL}/api/v1`;

/** Trigger.dev is unreachable from a test, so a running turn is set up through the REST routes. */
const runningChat = () =>
  server.use(
    fixtures.chatHandlerWith([
      fixtures.userMessage,
      { ...fixtures.assistantMessage, status: "streaming" },
    ]),
  );

describe("stopping a run", () => {
  it("shows the stop control instead of the send arrow while a run is active", async () => {
    runningChat();
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByRole("button", { name: "Stop run" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send message" })).not.toBeInTheDocument();
  });

  it("asks the cancel route for our own run id, never Trigger.dev's", async () => {
    const user = userEvent.setup();
    const cancelled = vi.fn();

    runningChat();
    server.use(
      http.post(`${API}/runs/:runId/cancel`, ({ params }) => {
        cancelled(params.runId);

        return HttpResponse.json({ data: { ok: true } });
      }),
    );

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    await user.click(await screen.findByRole("button", { name: "Stop run" }));

    await waitFor(() => expect(cancelled).toHaveBeenCalledWith(fixtures.RUN_ID));
    expect(cancelled).not.toHaveBeenCalledWith(fixtures.TRIGGER_RUN_ID);
  });

  it("marks the run stopping on click, which is what holds the control red", async () => {
    const user = userEvent.setup();

    runningChat();
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    await user.click(await screen.findByRole("button", { name: "Stop run" }));

    await waitFor(() => expect(useUI.getState().stoppingRuns).toContain(fixtures.RUN_ID));
    expect(await screen.findByRole("button", { name: "Stopping" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("does not send a second cancel while the first is still settling", async () => {
    const user = userEvent.setup();
    const cancelled = vi.fn();

    runningChat();
    server.use(
      http.post(`${API}/runs/:runId/cancel`, () => {
        cancelled();

        return HttpResponse.json({ data: { ok: true } });
      }),
    );

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    const stop = await screen.findByRole("button", { name: "Stop run" });

    await user.click(stop);
    await screen.findByRole("button", { name: "Stopping" });
    await user.click(screen.getByRole("button", { name: "Stopping" }));

    expect(cancelled).toHaveBeenCalledTimes(1);
  });

  it("releases the control once the run is gone and the cancelled turn has been read back", async () => {
    const user = userEvent.setup();
    let cancelled = false;

    server.use(
      http.get(`${API}/chats/:chatId`, () =>
        HttpResponse.json({
          data: {
            ...fixtures.chatWithMessages,
            messages: [
              fixtures.userMessage,
              cancelled
                ? fixtures.cancelledAssistantMessage
                : { ...fixtures.assistantMessage, status: "streaming" },
            ],
          },
        }),
      ),
      http.get(`${API}/chats/:chatId/active-run`, () =>
        HttpResponse.json({ data: cancelled ? null : fixtures.activeRun }),
      ),
      http.post(`${API}/runs/:runId/cancel`, () => {
        cancelled = true;

        return HttpResponse.json({ data: { ok: true } });
      }),
    );

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    await user.click(await screen.findByRole("button", { name: "Stop run" }));

    expect(await screen.findByRole("button", { name: "Send message" })).toBeInTheDocument();
    await waitFor(() => expect(useUI.getState().stoppingRuns).not.toContain(fixtures.RUN_ID));
    expect(screen.getByText("Response was interrupted")).toBeInTheDocument();
  });

  it("reports a cancel the server refused, with its trace id", async () => {
    const user = userEvent.setup();

    runningChat();
    server.use(cancelFails);

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    await user.click(await screen.findByRole("button", { name: "Stop run" }));

    expect(await screen.findByText("Something went wrong on our side.")).toBeInTheDocument();
    expect(screen.getByText("req_fixture")).toBeInTheDocument();
  });
});

describe("an idle chat", () => {
  it("shows the send arrow, with nothing to stop", async () => {
    server.use(noActiveRun);
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByRole("button", { name: "Send message" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stop run" })).not.toBeInTheDocument();
  });
});
