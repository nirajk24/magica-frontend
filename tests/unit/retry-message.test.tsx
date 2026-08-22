import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { env } from "@/lib/env";
import { qk } from "@/lib/query-client";
import { server } from "../msw/setup";
import { noActiveRun, retryFails } from "../msw/handlers";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

const API = `${env.NEXT_PUBLIC_API_URL}/api/v1`;

/** An idle chat whose last turn failed: the only state from which Retry is offered. */
const failedChat = () =>
  server.use(
    noActiveRun,
    fixtures.chatHandlerWith([fixtures.userMessage, fixtures.failedAssistantMessage]),
  );

describe("retrying a failed turn", () => {
  it("posts to the retry route with the assistant message that failed", async () => {
    const user = userEvent.setup();
    const retried = vi.fn();

    failedChat();
    server.use(
      http.post(`${API}/messages/:messageId/retry`, ({ params }) => {
        retried(params.messageId);

        return HttpResponse.json({ data: fixtures.retryResult });
      }),
    );

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    await user.click(await screen.findByRole("button", { name: /retry/i }));

    await waitFor(() =>
      expect(retried).toHaveBeenCalledWith(fixtures.failedAssistantMessage.id),
    );
  });

  it("attaches to the new run through the send path rather than a parallel one", async () => {
    const user = userEvent.setup();

    failedChat();
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    await user.click(await screen.findByRole("button", { name: /retry/i }));

    expect(await screen.findByRole("button", { name: "Stop run" })).toBeInTheDocument();
  });

  it("seeds the active run from the response instead of minting a second realtime token", async () => {
    const user = userEvent.setup();

    failedChat();
    const { queryClient } = renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    await user.click(await screen.findByRole("button", { name: /retry/i }));

    await waitFor(() =>
      expect(queryClient.getQueryData(qk.activeRun(fixtures.CHAT_ID))).toMatchObject({
        runId: fixtures.retryResult.runId,
        triggerRunId: fixtures.retryResult.triggerRunId,
        status: "queued",
        publicAccessToken: fixtures.retryResult.publicAccessToken,
      }),
    );
  });

  it("reports a refused retry instead of leaving the turn looking untouched", async () => {
    const user = userEvent.setup();

    failedChat();
    server.use(retryFails);

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    await user.click(await screen.findByRole("button", { name: /retry/i }));

    expect(
      await screen.findByText("A run is already active in this chat."),
    ).toBeInTheDocument();
  });
});
