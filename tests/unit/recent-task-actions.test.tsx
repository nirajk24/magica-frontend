import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Sidebar } from "@/components/shell/Sidebar";
import { env } from "@/lib/env";
import * as fixtures from "../msw/fixtures";
import { server } from "../msw/setup";
import { renderWithProviders } from "../render";

const API = `${env.NEXT_PUBLIC_API_URL}/api/v1`;

const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  renderWithProviders(<Sidebar />);
  await user.click(await screen.findByRole("button", { name: `Actions for ${fixtures.chat.title}` }));
};

describe("the Recent tasks row menu", () => {
  it("offers the three actions this build supports", async () => {
    await openMenu(userEvent.setup());

    expect(await screen.findByRole("menuitem", { name: /Pin to top/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Rename/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Delete/ })).toBeInTheDocument();
  });

  it("pins through PATCH rather than a second field of its own", async () => {
    const user = userEvent.setup();
    let body: { isFavorite?: boolean } | null = null;
    server.use(
      http.patch(`${API}/chats/:chatId`, async ({ request }) => {
        body = (await request.json()) as typeof body;
        return HttpResponse.json({ data: { chat: fixtures.chat } });
      }),
    );
    await openMenu(user);

    await user.click(await screen.findByRole("menuitem", { name: /Pin to top/ }));

    await waitFor(() => expect(body?.isFavorite).toBe(true));
  });

  it("renames in place and saves on Enter", async () => {
    const user = userEvent.setup();
    let body: { title?: string } | null = null;
    server.use(
      http.patch(`${API}/chats/:chatId`, async ({ request }) => {
        body = (await request.json()) as typeof body;
        return HttpResponse.json({ data: { chat: fixtures.chat } });
      }),
    );
    await openMenu(user);

    await user.click(await screen.findByRole("menuitem", { name: /Rename/ }));
    const field = await screen.findByLabelText("Task name");
    await user.clear(field);
    await user.type(field, "Renamed{Enter}");

    await waitFor(() => expect(body?.title).toBe("Renamed"));
  });

  it("deletes the chat the menu was opened on", async () => {
    const user = userEvent.setup();
    const deleted: string[] = [];
    server.use(
      http.delete(`${API}/chats/:chatId`, ({ params }) => {
        deleted.push(String(params.chatId));
        return HttpResponse.json({ data: { ok: true } });
      }),
    );
    await openMenu(user);

    await user.click(await screen.findByRole("menuitem", { name: /Delete/ }));

    await waitFor(() => expect(deleted).toEqual([fixtures.chat.id]));
  });

  it("does not navigate when the trigger is clicked", async () => {
    const user = userEvent.setup();
    await openMenu(user);

    expect(window.location.pathname).not.toBe(`/chat/${fixtures.chat.id}`);
  });
});
