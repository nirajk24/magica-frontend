import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountMenu } from "@/components/shell/AccountMenu";
import { AppShell } from "@/components/shell/AppShell";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { clerkMock } from "../clerk-mock";
import { server } from "../msw/setup";
import { renderWithProviders } from "../render";
import { useUI } from "@/stores/ui";
import * as fixtures from "../msw/fixtures";
import { http, HttpResponse } from "msw";
import { env } from "@/lib/env";

const API = `${env.NEXT_PUBLIC_API_URL}/api/v1`;

describe("the collapsed rail", () => {
  it("keeps search reachable and pins settings at the bottom", async () => {
    useUI.setState({ sidebarCollapsed: true });
    renderWithProviders(<Sidebar />);

    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("expands from the logo slot, which is the toggle in disguise", async () => {
    const user = userEvent.setup();
    useUI.setState({ sidebarCollapsed: true });
    renderWithProviders(<Sidebar />);

    await user.click(screen.getByRole("button", { name: "Expand sidebar" }));

    expect(useUI.getState().sidebarCollapsed).toBe(false);
  });

  it("toggles on the keyboard chord the tooltip advertises", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sidebar />);

    await user.keyboard("{Meta>}b{/Meta}");

    expect(useUI.getState().sidebarCollapsed).toBe(true);

    await user.keyboard("{Meta>}b{/Meta}");

    expect(useUI.getState().sidebarCollapsed).toBe(false);
  });

  it("names a collapsed row on hover, since the rail has no room for labels", async () => {
    const user = userEvent.setup();
    useUI.setState({ sidebarCollapsed: true });
    renderWithProviders(<Sidebar />);

    await user.hover(screen.getByRole("link", { name: "Tasks" }));

    expect(await screen.findByRole("tooltip")).toHaveTextContent("Tasks");
  });
});

describe("the sidebar", () => {
  it("lists the reference's nav in its order", async () => {
    renderWithProviders(<Sidebar />);

    const labels = ["New task", "Tasks", "Projects", "Library", "Tools", "API / MCP"];
    for (const label of labels) {
      expect(await screen.findByRole("link", { name: label }).catch(() => null)).toBeDefined();
    }
    expect(screen.getByRole("link", { name: "New task" })).toHaveAttribute("href", "/chat");
    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute("href", "/chat/recent");
  });

  it("sends API / MCP straight out to the published reference, as the product does", () => {
    renderWithProviders(<Sidebar />);

    const docs = screen.getByRole("link", { name: "API / MCP" });

    expect(docs).toHaveAttribute("href", env.NEXT_PUBLIC_API_DOCS_URL);
    expect(docs).toHaveAttribute("target", "_blank");
  });

  it("renders the sections we do not implement as disabled with a reason", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sidebar />);

    const projects = screen.getByRole("button", { name: "Projects" });

    expect(projects).toHaveAttribute("aria-disabled", "true");

    await user.hover(projects);

    expect(await screen.findByRole("tooltip")).toHaveTextContent(/isn't part of this build/i);
  });

  it("shows recent tasks newest first, so a chat sent to lifts to the top", async () => {
    const older = { ...fixtures.chat, id: "older", title: "Older task", updatedAt: "2026-08-20T10:00:00.000Z" };
    const newer = { ...fixtures.chat, id: "newer", title: "Newer task", updatedAt: "2026-08-22T10:00:00.000Z" };

    server.use(
      http.get(`${API}/chats`, () => HttpResponse.json({ data: { chats: [older, newer], nextCursor: null } })),
    );

    renderWithProviders(<Sidebar />);

    await screen.findByRole("link", { name: "Newer task" });
    const rows = screen.getAllByRole("link", { name: /^(Newer|Older) task$/ });

    expect(rows.map((row) => row.textContent)).toEqual(["Newer task", "Older task"]);
  });

  it("shows skeleton bars rather than a blank column while the list loads", () => {
    renderWithProviders(<Sidebar />);

    expect(screen.queryByText("No tasks yet")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("collapses to an icon rail, keeping the nav reachable by name", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sidebar />);

    await user.click(screen.getByRole("button", { name: "Close sidebar" }));

    await waitFor(() => expect(useUI.getState().sidebarCollapsed).toBe(true));
    expect(screen.getByRole("link", { name: "New task" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
  });
});

describe("the sidebar, signed out", () => {
  it("keeps the nav and offers sign-in instead of an account row", async () => {
    clerkMock.isSignedIn = false;
    renderWithProviders(<Sidebar />);

    expect(screen.getByRole("link", { name: "New task" })).toBeInTheDocument();
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("does not offer a balance it cannot read", async () => {
    clerkMock.isSignedIn = false;
    const user = userEvent.setup();
    renderWithProviders(<Sidebar />);

    await user.click(screen.getByRole("button", { name: /More/ }));

    expect(screen.queryByText("Available Credits")).not.toBeInTheDocument();
  });
});

describe("the top bar", () => {
  it("shows the balance to four significant digits", async () => {
    renderWithProviders(<TopBar />);

    expect(await screen.findByText("29.99M")).toBeInTheDocument();
  });

  it("names the model the turn runs on", () => {
    renderWithProviders(<TopBar />);

    expect(screen.getByText("OpenRouter Auto")).toBeInTheDocument();
  });

  it("offers sign in and sign up instead of credits when signed out", () => {
    clerkMock.isSignedIn = false;
    renderWithProviders(<TopBar />);

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Available credits" })).not.toBeInTheDocument();
  });

  it("hides the files control outside a conversation, having nothing to scope it to", () => {
    renderWithProviders(<TopBar showFiles={false} />);

    expect(screen.queryByRole("button", { name: "Files in this task" })).not.toBeInTheDocument();
  });

  it("offers the files control inside a conversation", () => {
    renderWithProviders(<TopBar showFiles />);

    expect(screen.getByRole("button", { name: "Files in this task" })).toBeInTheDocument();
  });
});

describe("before Clerk has resolved", () => {
  it("shows a spinner rather than a signed-out shell the user would see swapped away", () => {
    clerkMock.isLoaded = false;
    renderWithProviders(<AppShell>content</AppShell>);

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign up" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "New task" })).not.toBeInTheDocument();
  });

  it("paints the shell once it has", async () => {
    renderWithProviders(<AppShell>content</AppShell>);

    expect(await screen.findByRole("link", { name: "New task" })).toBeInTheDocument();
  });
});

describe("the account row", () => {
  it("names the account without spilling out of the sidebar", async () => {
    renderWithProviders(<AccountMenu />);

    const trigger = await screen.findByRole("button", { name: "Account" });

    expect(trigger).toHaveTextContent("Niraj Kumar");
    expect(trigger.querySelector(".truncate")).not.toBeNull();
  });

  it("opens Clerk's account management rather than a rebuild of it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AccountMenu />);

    await user.click(screen.getByRole("button", { name: "Account" }));
    await user.click(await screen.findByRole("menuitem", { name: /Manage account/ }));

    expect(clerkMock.openUserProfile).toHaveBeenCalled();
  });

  it("signs out through Clerk", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AccountMenu />);

    await user.click(screen.getByRole("button", { name: "Account" }));
    await user.click(await screen.findByRole("menuitem", { name: /Sign out/ }));

    expect(clerkMock.signOut).toHaveBeenCalled();
  });

  it("shows the email beside the name in the menu", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AccountMenu />);

    await user.click(screen.getByRole("button", { name: "Account" }));

    expect(await screen.findByText("niraj@example.com")).toBeInTheDocument();
  });
});
