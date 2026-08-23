import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { TopBar } from "@/components/shell/TopBar";
import { collectTaskFiles } from "@/lib/task-files";
import { useUI } from "@/stores/ui";
import { server } from "../msw/setup";
import { noActiveRun } from "../msw/handlers";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

describe("collectTaskFiles", () => {
  it("flattens generated assets and ready uploads out of the transcript", () => {
    const files = collectTaskFiles([fixtures.userMessageWithAttachment, fixtures.assistantMessage]);

    expect(files).toHaveLength(2);
    expect(files.map((file) => file.source).sort()).toEqual(["generated", "uploaded"]);
  });

  it("joins a generated file to the prompt and model that produced it", () => {
    const withCallId = {
      ...fixtures.assistantMessage,
      assets: [{ ...fixtures.assistantMessage.assets![0]!, toolCallId: fixtures.TOOL_USE_ID }],
    };

    const [file] = collectTaskFiles([withCallId]);

    expect(file?.prompt).toBe("a mountain at sunrise");
    expect(file?.model).toBe("gpt_image_2");
  });

  it("leaves an attachment still uploading out of the list", () => {
    const uploading = {
      ...fixtures.userMessageWithAttachment,
      attachments: [{ ...fixtures.attachment, status: "uploading" as const }],
    };

    expect(collectTaskFiles([uploading])).toHaveLength(0);
  });
});

describe("the files modal", () => {
  it("opens from the top bar's folder icon, which is no longer a placeholder", async () => {
    const user = userEvent.setup();
    server.use(noActiveRun, fixtures.chatHandlerWith([fixtures.userMessageWithAttachment, fixtures.assistantMessage]));
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

  it("filters by type through the tab pills, with counts", async () => {
    const user = userEvent.setup();
    server.use(noActiveRun, fixtures.chatHandlerWith([fixtures.userMessageWithAttachment, fixtures.assistantMessage]));
    useUI.setState({ filesOpen: true });
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);
    await screen.findByText(fixtures.attachment.name);

    const images = await screen.findByRole("tab", { name: /Images/ });

    expect(images).toHaveTextContent("2");

    await user.click(screen.getByRole("tab", { name: /Videos/ }));

    expect(await screen.findByText("Nothing of that type here.")).toBeInTheDocument();
  });

  it("opens the preview from a row, with the file's own details", async () => {
    const user = userEvent.setup();
    server.use(noActiveRun, fixtures.chatHandlerWith([fixtures.userMessageWithAttachment]));
    useUI.setState({ filesOpen: true });
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    await user.click(await screen.findByText(fixtures.attachment.name));

    expect(await screen.findByText("Uploaded")).toBeInTheDocument();
    expect(screen.getByText("1.3 MB")).toBeInTheDocument();
  });
});

describe("the files modal selection", () => {
  it("selects everything shown from the header control", async () => {
    const user = userEvent.setup();
    server.use(noActiveRun, fixtures.chatHandlerWith([fixtures.userMessageWithAttachment, fixtures.assistantMessage]));
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

  it("keeps destructive and unrouted actions disabled with a reason", async () => {
    const user = userEvent.setup();
    server.use(noActiveRun, fixtures.chatHandlerWith([fixtures.userMessageWithAttachment]));
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);
    await screen.findByAltText(fixtures.attachment.name);

    useUI.setState({ previewFileKey: fixtures.attachment.id });

    const remove = await screen.findByRole("button", { name: "Delete File" });

    expect(remove).toHaveAttribute("aria-disabled", "true");

    await user.hover(remove);

    expect(await screen.findByRole("tooltip")).toHaveTextContent(/asset route/i);
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
