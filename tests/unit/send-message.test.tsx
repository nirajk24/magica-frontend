import { describe, expect, it } from "vitest";
import { delay, http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { env } from "@/lib/env";
import { qk } from "@/lib/query-client";
import { useUI } from "@/stores/ui";
import { server } from "../msw/setup";
import { errors, noActiveRun } from "../msw/handlers";
import { routerMock } from "../router-mock";
import { clerkMock } from "../clerk-mock";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

const API = `${env.NEXT_PUBLIC_API_URL}/api/v1`;
const MESSAGES = `${API}/chats/:chatId/messages`;

const send = async (chatId: string, text: string) => {
  const user = userEvent.setup();
  server.use(noActiveRun);
  const rendered = renderWithProviders(<ChatScreen chatId={chatId} />);

  await user.type(screen.getByLabelText("Message"), `${text}{Enter}`);

  return rendered;
};

describe("sending a message", () => {
  it("shows the prompt while the send is still in flight", async () => {
    server.use(
      http.post(MESSAGES, async () => {
        await delay("infinite");
        return HttpResponse.json({ data: fixtures.sendMessageResult });
      }),
    );

    await send(fixtures.CHAT_ID, "generate a mountain");

    expect(await screen.findByText("generate a mountain")).toBeInTheDocument();
  });

  it("hands the prompt over to the persisted row without leaving two of it", async () => {
    server.use(
      http.get(`${API}/chats/:chatId`, () =>
        HttpResponse.json({
          data: {
            ...fixtures.chatWithMessages,
            messages: [
              { ...fixtures.userMessage, content: "generate a mountain" },
              fixtures.assistantMessage,
            ],
          },
        }),
      ),
    );

    await send(fixtures.CHAT_ID, "generate a mountain");

    await waitFor(() =>
      expect(screen.getAllByText("generate a mountain")).toHaveLength(1),
    );
    expect(await screen.findByText("Here is your mountain at sunrise.")).toBeInTheDocument();
  });

  it("clears the draft on send", async () => {
    await send(fixtures.CHAT_ID, "generate a mountain");

    await waitFor(() => expect(useUI.getState().drafts[fixtures.CHAT_ID]).toBeUndefined());
  });

  it("sends plan mode as the composer had it", async () => {
    const user = userEvent.setup();
    let body: unknown = null;
    server.use(
      noActiveRun,
      http.post(MESSAGES, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: fixtures.sendMessageResult });
      }),
    );

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);
    await user.click(screen.getByRole("button", { name: "Plan mode" }));
    await user.type(screen.getByLabelText("Message"), "make a poster{Enter}");

    await waitFor(() =>
      expect(body).toEqual({ content: "make a poster", planMode: true }),
    );
  });

  it("seeds the active run from the response rather than minting a second token", async () => {
    const { queryClient } = await send(fixtures.CHAT_ID, "generate a mountain");

    await waitFor(() =>
      expect(queryClient.getQueryData(qk.activeRun(fixtures.CHAT_ID))).toMatchObject({
        runId: fixtures.RUN_ID,
        triggerRunId: fixtures.TRIGGER_RUN_ID,
        publicAccessToken: fixtures.sendMessageResult.publicAccessToken,
        status: "queued",
      }),
    );
  });
});

describe("starting a conversation at /chat/new", () => {
  it("moves to the chat the server created", async () => {
    await send("new", "start something");

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith(`/chat/${fixtures.CHAT_ID}`),
    );
  });

  it("has the new chat's history cached before it navigates", async () => {
    const { queryClient } = await send("new", "start something");

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalled());
    expect(queryClient.getQueryData(qk.chat(fixtures.CHAT_ID))).toBeDefined();
  });
});

describe("sending while signed out", () => {
  it("asks for an account instead of calling the API", async () => {
    clerkMock.isSignedIn = false;
    server.use(
      http.post(MESSAGES, () => {
        throw new Error("an anonymous visitor must not reach the send route");
      }),
    );

    await send("new", "let me try this first");

    expect(clerkMock.openSignIn).toHaveBeenCalledOnce();
  });

  it("keeps the draft, so signing in does not cost the visitor their prompt", async () => {
    clerkMock.isSignedIn = false;

    await send("new", "a prompt worth keeping");

    expect(useUI.getState().drafts.new).toBe("a prompt worth keeping");
    expect(routerMock.replace).not.toHaveBeenCalled();
  });
});

describe("a send that fails", () => {
  it("says nothing about a run that was already active, and keeps the text", async () => {
    server.use(http.post(MESSAGES, () => errors.runAlreadyActive()));

    await send(fixtures.CHAT_ID, "second thoughts");

    await waitFor(() =>
      expect(useUI.getState().drafts[fixtures.CHAT_ID]).toBe("second thoughts"),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("names the credit problem without a traceId, because it is not a bug", async () => {
    server.use(http.post(MESSAGES, () => errors.insufficientCredits()));

    await send(fixtures.CHAT_ID, "one more image");

    expect(await screen.findByRole("alert")).toHaveTextContent(/out of credits/i);
    expect(screen.queryByText("req_fixture")).not.toBeInTheDocument();
  });

  it("passes a validation message through as the server wrote it", async () => {
    server.use(http.post(MESSAGES, () => errors.validation()));

    await send(fixtures.CHAT_ID, "x");

    expect(await screen.findByRole("alert")).toHaveTextContent("Some fields are invalid.");
  });

  it("carries the traceId on an unexpected failure", async () => {
    server.use(http.post(MESSAGES, () => errors.internal()));

    await send(fixtures.CHAT_ID, "anything");

    expect(await screen.findByRole("alert")).toHaveTextContent("req_fixture");
  });

  it("puts the draft back so nothing typed is lost", async () => {
    server.use(http.post(MESSAGES, () => errors.internal()));

    await send(fixtures.CHAT_ID, "a long and careful prompt");

    await waitFor(() =>
      expect(useUI.getState().drafts[fixtures.CHAT_ID]).toBe("a long and careful prompt"),
    );
  });
});
