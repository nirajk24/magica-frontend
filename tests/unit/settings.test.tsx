import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { createKeyFails, noApiKeys, noWebhookEndpoints } from "../msw/handlers";
import * as fixtures from "../msw/fixtures";
import { locationMock, routerMock } from "../router-mock";
import { renderWithProviders } from "../render";
import { server } from "../msw/setup";

/** Puts the app on `/chat?settings=<section>`, which is how the modal is addressed. */
function openAt(section: string) {
  locationMock.pathname = "/chat";
  locationMock.search = `settings=${section}`;
}

const manage = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole("button", { name: /manage/i }));
};

describe("addressing the settings modal", () => {
  it("stays closed when the query parameter is absent", () => {
    renderWithProviders(<SettingsModal />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens on the section the URL names", async () => {
    openAt("api-keys");
    renderWithProviders(<SettingsModal />);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "API Keys" })).toBeInTheDocument();
  });

  it("closing removes only the settings parameter, keeping the rest of the query", async () => {
    const user = userEvent.setup();
    locationMock.pathname = "/chat";
    locationMock.search = "settings=api-keys&show=credited";
    renderWithProviders(<SettingsModal />);

    // Two, one per breakpoint — the section rail is dropped below `md`, and only one is ever
    // painted. No stylesheet runs here, so both are in the tree.
    await user.click(screen.getAllByRole("button", { name: /close settings/i })[0]!);

    expect(routerMock.replace).toHaveBeenCalledWith(
      expect.stringContaining("show=credited"),
      expect.anything(),
    );
    expect(routerMock.replace).toHaveBeenCalledWith(
      expect.not.stringContaining("settings="),
      expect.anything(),
    );
  });

  it("lists every section, and the unbuilt ones say why rather than vanishing", async () => {
    openAt("api-keys");
    renderWithProviders(<SettingsModal />);

    const nav = await screen.findByRole("navigation", { name: /settings sections/i });

    for (const label of ["Account", "Billing", "Memory", "Integrations", "Shortcuts"]) {
      const row = within(nav).getByRole("button", { name: label });
      expect(row, `${label} must be present but disabled`).toHaveAttribute("aria-disabled", "true");
    }

    expect(within(nav).getByRole("button", { name: "API Keys" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("a section the URL names but this build lacks says so instead of rendering nothing", async () => {
    openAt("billing");
    renderWithProviders(<SettingsModal />);

    expect(await screen.findByText(/not part of this build/i)).toBeInTheDocument();
  });
});

describe("API keys", () => {
  it("does not fetch the list until someone asks to manage", async () => {
    const user = userEvent.setup();
    openAt("api-keys");
    renderWithProviders(<SettingsModal />);

    expect(await screen.findByText(/generate, label, and revoke/i)).toBeInTheDocument();
    expect(screen.queryByText("production")).toBeNull();

    await manage(user);
    expect(await screen.findByText("production")).toBeInTheDocument();
  });

  it("shows a revoked key as revoked rather than offering to revoke it again", async () => {
    const user = userEvent.setup();
    openAt("api-keys");
    renderWithProviders(<SettingsModal />);
    await manage(user);

    const revoked = (await screen.findByText("laptop")).closest("li");
    expect(revoked).not.toBeNull();
    expect(within(revoked as HTMLElement).queryByRole("button", { name: "Revoke" })).toBeNull();
    expect(within(revoked as HTMLElement).getByText("Revoked")).toBeInTheDocument();
  });

  it("reveals a new key exactly once, with the warning that it cannot be recovered", async () => {
    const user = userEvent.setup();
    openAt("api-keys");
    renderWithProviders(<SettingsModal />);
    await manage(user);

    await user.type(await screen.findByLabelText(/key name/i), "integration");
    await user.click(screen.getByRole("button", { name: /create key/i }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(fixtures.createdApiKey.key)).toBeInTheDocument();
    expect(alert).toHaveTextContent(/only time it will be shown/i);

    await user.click(within(alert).getByRole("button", { name: /stored it/i }));
    expect(screen.queryByText(fixtures.createdApiKey.key)).toBeNull();
  });

  it("never leaves the plaintext key in the listing it refetches", async () => {
    const user = userEvent.setup();
    openAt("api-keys");
    const { queryClient } = renderWithProviders(<SettingsModal />);
    await manage(user);

    await user.type(await screen.findByLabelText(/key name/i), "integration");
    await user.click(screen.getByRole("button", { name: /create key/i }));
    await screen.findByRole("alert");

    const cached = JSON.stringify(queryClient.getQueryData(["api-keys"]));
    expect(cached ?? "").not.toContain(fixtures.createdApiKey.key);
  });

  it("surfaces a refused creation instead of appearing to succeed", async () => {
    server.use(createKeyFails);
    const user = userEvent.setup();
    openAt("api-keys");
    renderWithProviders(<SettingsModal />);
    await manage(user);

    await user.type(await screen.findByLabelText(/key name/i), "integration");
    await user.click(screen.getByRole("button", { name: /create key/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong on our side/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/only time it will be shown/i)).toBeNull();
  });

  it("refuses to create a key with no name", async () => {
    const user = userEvent.setup();
    openAt("api-keys");
    renderWithProviders(<SettingsModal />);
    await manage(user);

    await user.clear(await screen.findByLabelText(/key name/i));

    expect(screen.getByRole("button", { name: /create key/i })).toBeDisabled();
  });

  it("refuses a daily ceiling the per-minute one could never sustain", async () => {
    const user = userEvent.setup();
    openAt("api-keys");
    renderWithProviders(<SettingsModal />);
    await manage(user);

    await user.click(await screen.findByRole("button", { name: /advanced options/i }));
    await user.clear(screen.getByLabelText(/requests per minute/i));
    await user.type(screen.getByLabelText(/requests per minute/i), "1");

    expect(screen.getByRole("button", { name: /create key/i })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/cannot exceed/i);
  });

  it("shows each key's ceilings, and says so plainly when it has none", async () => {
    const user = userEvent.setup();
    openAt("api-keys");
    renderWithProviders(<SettingsModal />);
    await manage(user);

    expect(await screen.findByText(/100\/min \| 10000\/day/)).toBeInTheDocument();
    expect(screen.getByText(/no rate limit/i)).toBeInTheDocument();
  });

  it("counts keys against the cap", async () => {
    const user = userEvent.setup();
    openAt("api-keys");
    renderWithProviders(<SettingsModal />);
    await manage(user);

    // One of the two fixtures is revoked, so only the live one counts toward the cap.
    expect(await screen.findByText("1/10")).toBeInTheDocument();
  });

  it("has an empty state rather than a bare panel", async () => {
    server.use(noApiKeys, noWebhookEndpoints);
    const user = userEvent.setup();
    openAt("api-keys");
    renderWithProviders(<SettingsModal />);
    await manage(user);

    expect(await screen.findByText(/no keys yet/i)).toBeInTheDocument();
    expect(await screen.findByText(/no endpoints registered/i)).toBeInTheDocument();
  });
});

describe("webhooks", () => {
  it("requires an HTTPS receiver before it will register one", async () => {
    const user = userEvent.setup();
    openAt("api-keys");
    renderWithProviders(<SettingsModal />);
    await manage(user);

    const add = await screen.findByRole("button", { name: /add endpoint/i });
    await user.type(screen.getByLabelText(/receiver url/i), "http://receiver.test/hook");
    expect(add).toBeDisabled();

    await user.clear(screen.getByLabelText(/receiver url/i));
    await user.type(screen.getByLabelText(/receiver url/i), "https://receiver.test/hook");
    expect(add).toBeEnabled();
  });

  it("reveals the signing secret once, because a receiver cannot verify without it", async () => {
    const user = userEvent.setup();
    openAt("api-keys");
    renderWithProviders(<SettingsModal />);
    await manage(user);

    await user.type(screen.getByLabelText(/receiver url/i), "https://example.com/hooks/magica");
    await user.click(await screen.findByRole("button", { name: /add endpoint/i }));

    const alerts = await screen.findAllByRole("alert");
    const secretAlert = alerts.find((node) =>
      node.textContent?.includes(fixtures.createdWebhookEndpoint.secret),
    );
    expect(secretAlert, "the signing secret must be shown").toBeDefined();
    expect(secretAlert).toHaveTextContent(/shown only once/i);
  });

  it("opens a delivery log that distinguishes a failure from a success", async () => {
    const user = userEvent.setup();
    openAt("api-keys");
    renderWithProviders(<SettingsModal />);
    await manage(user);

    await user.click(await screen.findByRole("button", { name: /deliveries/i }));

    expect(await screen.findByText("delivered")).toBeInTheDocument();
    expect(screen.getByText("failed")).toBeInTheDocument();
    expect(screen.getByText(/3 attempts/)).toBeInTheDocument();
  });
});
