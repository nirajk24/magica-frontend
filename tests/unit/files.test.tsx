import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { TopBar } from "@/components/shell/TopBar";
import { env } from "@/lib/env";
import { attachmentKind, generationDetails } from "@/lib/task-files";
import { isAttachmentExpired } from "@/queries/use-attachments";
import { useUI } from "@/stores/ui";
import { server } from "../msw/setup";
import { noActiveRun } from "../msw/handlers";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

const API = `${env.NEXT_PUBLIC_API_URL}/api/v1`;

describe("attachment classification", () => {
  it("files an attachment by its MIME type, falling back to its media type", () => {
    expect(attachmentKind(fixtures.attachment)).toBe("image");
    expect(attachmentKind({ contentType: "video/mp4", type: "video" })).toBe("video");
    expect(attachmentKind({ contentType: "application/pdf", type: "image" })).toBe("document");
    expect(attachmentKind({ contentType: "application/json", type: "image" })).toBe("code");
    expect(attachmentKind({ contentType: "weird/thing", type: "audio" })).toBe("audio");
  });

  it("treats an upload past its window as expired, and a generated file as permanent", () => {
    expect(isAttachmentExpired(fixtures.attachment)).toBe(false);
    expect(isAttachmentExpired(fixtures.expiredAttachment)).toBe(true);
    expect(isAttachmentExpired(fixtures.generatedAttachment)).toBe(false);
  });
});

describe("generationDetails", () => {
  it("joins a generated file's URL to the prompt and model that produced it", () => {
    const withCallId = {
      ...fixtures.assistantMessage,
      assets: [{ ...fixtures.assistantMessage.assets![0]!, toolCallId: fixtures.TOOL_USE_ID }],
    };

    expect(generationDetails([withCallId], fixtures.IMAGE_URL)).toEqual({
      prompt: "a mountain at sunrise",
      model: "gpt_image_2",
    });
  });

  it("answers null for an upload, which no invocation produced", () => {
    expect(generationDetails([fixtures.userMessageWithAttachment], fixtures.attachment.url)).toBeNull();
    expect(generationDetails([fixtures.assistantMessage], null)).toBeNull();
  });
});

describe("the files modal", () => {
  it("opens from the top bar's folder icon and lists the chat's attachments", async () => {
    const user = userEvent.setup();
    server.use(noActiveRun);
    renderWithProviders(
      <>
        <TopBar chatId={fixtures.CHAT_ID} showFiles />
        <ChatScreen chatId={fixtures.CHAT_ID} />
      </>,
    );

    await user.click(await screen.findByRole("button", { name: "Files in this task" }));

    expect(await screen.findAllByText("All files in this task")).not.toHaveLength(0);
    expect(await screen.findByText(fixtures.attachment.name)).toBeInTheDocument();
    expect(screen.getByText(/1\.3 MB/)).toBeInTheDocument();
  });

  it("shows a dash for a generated file, whose byte size nothing reports", async () => {
    server.use(noActiveRun);
    useUI.setState({ filesOpen: true });
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    const row = await screen.findByText(fixtures.generatedAttachment.name);

    expect(row.parentElement?.textContent).toContain("—");
  });

  it("labels an expired upload instead of fetching its dead URL", async () => {
    server.use(
      noActiveRun,
      http.get(`${API}/attachments`, () =>
        HttpResponse.json({
          data: { attachments: [fixtures.expiredAttachment], nextCursor: null },
        }),
      ),
    );
    useUI.setState({ filesOpen: true });
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    const row = await screen.findByText(fixtures.expiredAttachment.name);

    expect(row.parentElement?.textContent).toContain("Expired");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("filters by type through the tab pills, with counts", async () => {
    const user = userEvent.setup();
    server.use(noActiveRun);
    useUI.setState({ filesOpen: true });
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);
    await screen.findByText(fixtures.attachment.name);

    expect(await screen.findByRole("tab", { name: /Images/ })).toHaveTextContent("2");

    await user.click(screen.getByRole("tab", { name: /Videos/ }));

    expect(await screen.findByText("Nothing of that type here.")).toBeInTheDocument();
  });

  it("selects everything shown from the header control", async () => {
    const user = userEvent.setup();
    server.use(noActiveRun);
    useUI.setState({ filesOpen: true });
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);
    await screen.findByText(fixtures.attachment.name);

    await user.click(screen.getByRole("button", { name: "Select all" }));

    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).toHaveAttribute("aria-checked", "true");
    }
  });
});

describe("the image preview", () => {
  it("shows a generated file's prompt and model, and says where it came from", async () => {
    const withCallId = {
      ...fixtures.assistantMessage,
      assets: [{ ...fixtures.assistantMessage.assets![0]!, toolCallId: fixtures.TOOL_USE_ID }],
    };
    server.use(noActiveRun, fixtures.chatHandlerWith([withCallId]));
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);
    await screen.findByText(/Here is your mountain/);

    useUI.setState({ previewFileKey: fixtures.IMAGE_URL });

    expect(await screen.findByText("Generated in chat")).toBeInTheDocument();
    expect(screen.getByText("a mountain at sunrise")).toBeInTheDocument();
    expect(screen.getByText("gpt_image_2")).toBeInTheDocument();
  });

  it("renames a file against the attachment route", async () => {
    const user = userEvent.setup();
    let sent: { name?: string } | null = null;
    server.use(
      noActiveRun,
      http.patch(`${API}/attachments/:attachmentId`, async ({ request }) => {
        sent = (await request.json()) as { name?: string };
        return HttpResponse.json({
          data: { attachment: { ...fixtures.attachment, name: "renamed.png" } },
        });
      }),
    );
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);
    useUI.setState({ previewFileKey: fixtures.attachment.id });

    await user.click(await screen.findByRole("button", { name: "Rename file" }));
    const field = screen.getByLabelText("File name");
    await user.clear(field);
    await user.type(field, "renamed.png{Enter}");

    await waitFor(() => expect(sent).toEqual({ name: "renamed.png" }));
  });

  it("deletes a file and closes, because the row it was showing is gone", async () => {
    const user = userEvent.setup();
    let deleted: string | null = null;
    server.use(
      noActiveRun,
      http.delete(`${API}/attachments/:attachmentId`, ({ params }) => {
        deleted = String(params.attachmentId);
        return HttpResponse.json({ data: { ok: true } });
      }),
    );
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);
    useUI.setState({ previewFileKey: fixtures.attachment.id });

    await user.click(await screen.findByRole("button", { name: /Delete File/ }));

    await waitFor(() => expect(deleted).toBe(fixtures.attachment.id));
    await waitFor(() => expect(useUI.getState().previewFileKey).toBeNull());
  });

  it("keeps favorite disabled, which no route carries", async () => {
    const user = userEvent.setup();
    server.use(noActiveRun);
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);
    useUI.setState({ previewFileKey: fixtures.attachment.id });

    const favorite = await screen.findByRole("button", { name: "Add to Favorite" });

    expect(favorite).toHaveAttribute("aria-disabled", "true");

    await user.hover(favorite);

    expect(await screen.findByRole("tooltip")).toHaveTextContent(/aren't part of this build/i);
  });

  it("opens straight from a generated image in the transcript", async () => {
    const user = userEvent.setup();
    server.use(noActiveRun, fixtures.chatHandlerWith([fixtures.assistantMessage]));
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    await user.click(await screen.findByRole("button", { name: "Preview image" }));

    await waitFor(() => expect(useUI.getState().previewFileKey).toBe(fixtures.IMAGE_URL));
    expect(await screen.findByText("Generated in chat")).toBeInTheDocument();
  });
});
