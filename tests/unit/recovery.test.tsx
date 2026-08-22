import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import type { ActiveRun, MessageDTO } from "@/contracts";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { env } from "@/lib/env";
import { qk } from "@/lib/query-client";
import { server } from "../msw/setup";
import { noActiveRun } from "../msw/handlers";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

const API = `${env.NEXT_PUBLIC_API_URL}/api/v1`;

const partial: MessageDTO = {
  ...fixtures.assistantMessage,
  status: "streaming",
  content: "half an answer",
  contentBlocks: [{ segment: 0, type: "text", text: "half an answer" }],
  assets: null,
  runId: fixtures.RUN_ID,
};

const activeRunHandler = (run: ActiveRun | null) =>
  http.get(`${API}/chats/:chatId/active-run`, () => HttpResponse.json({ data: run }));

describe("reloading into a running turn", () => {
  it("restores the persisted history from REST", async () => {
    server.use(fixtures.chatHandlerWith([fixtures.userMessage, partial]));

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByText(fixtures.userMessage.content)).toBeInTheDocument();
  });

  it("asks the server which run to resume, and mints exactly one token doing it", async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/chats/:chatId/active-run`, () => {
        calls += 1;
        return HttpResponse.json({ data: fixtures.activeRun });
      }),
    );

    const { queryClient } = renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    await waitFor(() =>
      expect(queryClient.getQueryData(qk.activeRun(fixtures.CHAT_ID))).toBeTruthy(),
    );
    expect(calls).toBe(1);
  });

  it("lets the overlay own the run, so the persisted partial is not also shown", async () => {
    server.use(fixtures.chatHandlerWith([fixtures.userMessage, partial]));

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    await screen.findByText(fixtures.userMessage.content);

    expect(screen.queryByText("half an answer")).not.toBeInTheDocument();
  });

  it("blocks a second send while the recovered run is still going", async () => {
    server.use(fixtures.chatHandlerWith([fixtures.userMessage, partial]));

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    expect(
      await screen.findByRole("button", { name: "A run is already in progress" }),
    ).toHaveAttribute("aria-disabled", "true");
  });
});

describe("handover to the persisted row", () => {
  it("keeps the overlay mounted until the assistant row has actually landed", async () => {
    server.use(fixtures.chatHandlerWith([fixtures.userMessage, partial]));

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    await screen.findByText(fixtures.userMessage.content);

    expect(screen.getByRole("button", { name: "A run is already in progress" })).toBeInTheDocument();
    expect(screen.queryByText(/^Here is your mountain/)).not.toBeInTheDocument();
  });

  it("shows the settled row and drops the overlay once the turn is stored", async () => {
    server.use(activeRunHandler(fixtures.activeRun));

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByText("Here is your mountain at sunrise.")).toBeInTheDocument();
  });

  it("does not resume anything for a chat with no active run", async () => {
    server.use(noActiveRun);

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByText("Here is your mountain at sunrise.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send message" })).toBeInTheDocument();
  });
});

describe("a run that has been created but not dispatched", () => {
  it("polls until there is a triggerRunId to subscribe to", async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/chats/:chatId/active-run`, () => {
        calls += 1;
        return HttpResponse.json({
          data: { ...fixtures.activeRun, triggerRunId: calls > 1 ? fixtures.TRIGGER_RUN_ID : null },
        });
      }),
    );

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    await waitFor(() => expect(calls).toBeGreaterThan(1), { timeout: 3_000 });
  });
});
