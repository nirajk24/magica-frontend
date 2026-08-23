import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { QuestionPanel } from "@/components/questions/QuestionPanel";
import { env } from "@/lib/env";
import { MAX_ATTACHMENTS, useUploadAttachments } from "@/queries/use-upload-attachments";
import { server } from "../msw/setup";
import { noActiveRun, uploadQuotaExceeded } from "../msw/handlers";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

function hookWrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/**
 * The Transloadit leg is mocked at the `lib/uploader` seam. MSW cannot intercept a tus upload to
 * Transloadit's own host, and the contract this side owns is what it does with the assembly's
 * answer — so the fake reports the shape a real assembly reports, `uploads[0]`, already mapped.
 */
const { uploadToAssembly } = vi.hoisted(() => ({ uploadToAssembly: vi.fn() }));

vi.mock("@/lib/uploader", () => ({ uploadToAssembly }));

const API = `${env.NEXT_PUBLIC_API_URL}/api/v1`;

function succeedingUpload(overrides: Record<string, unknown> = {}) {
  return {
    done: Promise.resolve({
      assemblyId: "assembly-1",
      url: "https://cdn.transloadit.com/fixtures/poster.png",
      contentType: "image/png",
      size: 2_048,
      metadata: { width: 1024, height: 1536 },
      ...overrides,
    }),
    cancel: vi.fn(),
  };
}

function pickImage(name = "poster.png") {
  return new File(["binary"], name, { type: "image/png" });
}

/** An upload the test finishes by hand, for asserting what the composer does mid-flight. */
function deferredUpload() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise<unknown>((settle) => {
    resolve = settle;
  });

  return { promise, resolve };
}

beforeEach(() => {
  uploadToAssembly.mockReset();
  uploadToAssembly.mockReturnValue(succeedingUpload());
});

describe("attaching a file in the composer", () => {
  it("signs one assembly per file and passes the signed params through verbatim", async () => {
    const user = userEvent.setup();
    let signed: { files?: { name: string; contentType: string; size: number }[] } | null = null;
    server.use(
      noActiveRun,
      http.post(`${API}/uploads/sign`, async ({ request }) => {
        signed = (await request.json()) as typeof signed;
        return HttpResponse.json({ data: fixtures.signUploadsResult });
      }),
    );
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    await user.click(await screen.findByRole("button", { name: "Attach a file" }));
    await user.upload(screen.getByLabelText("Message").parentElement!.querySelector("input[type=file]")!, pickImage());

    await waitFor(() =>
      expect(signed).toEqual({
        files: [{ name: "poster.png", contentType: "image/png", size: 6 }],
      }),
    );

    const assembly = fixtures.signUploadsResult.assemblies[0]!;
    await waitFor(() =>
      expect(uploadToAssembly).toHaveBeenCalledWith(
        expect.objectContaining({ assembly: { params: assembly.params, signature: assembly.signature } }),
      ),
    );
  });

  it("reports the finished assembly from uploads[0] and sends the attachment id", async () => {
    const user = userEvent.setup();
    let report: Record<string, unknown> | null = null;
    let sendBody: { attachmentIds?: string[] } | null = null;
    server.use(
      noActiveRun,
      http.post(`${API}/attachments`, async ({ request }) => {
        report = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          data: { attachment: { ...fixtures.attachment, id: "attachment-live" } },
        });
      }),
      http.post(`${API}/chats/:chatId/messages`, async ({ request }) => {
        sendBody = (await request.json()) as typeof sendBody;
        return HttpResponse.json({ data: fixtures.sendMessageResult });
      }),
    );
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    const field = await screen.findByLabelText("Message");
    await user.upload(field.parentElement!.querySelector("input[type=file]")!, pickImage());

    await waitFor(() =>
      expect(report).toEqual({
        assemblyId: "assembly-1",
        status: "ready",
        file: {
          name: "poster.png",
          contentType: "image/png",
          size: 2_048,
          url: "https://cdn.transloadit.com/fixtures/poster.png",
          metadata: { width: 1024, height: 1536 },
        },
      }),
    );

    await user.type(field, "edit this{Enter}");

    await waitFor(() => expect(sendBody?.attachmentIds).toEqual(["attachment-live"]));
  });

  it("holds the send until every chip has settled", async () => {
    const user = userEvent.setup();
    const pending = deferredUpload();
    uploadToAssembly.mockReturnValue({ done: pending.promise, cancel: vi.fn() });
    server.use(noActiveRun);
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    const field = await screen.findByLabelText("Message");
    await user.upload(field.parentElement!.querySelector("input[type=file]")!, pickImage());
    await user.type(field, "edit this");

    expect(screen.getByRole("button", { name: "Send message" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    pending.resolve({
      assemblyId: "assembly-1",
      url: "https://cdn.transloadit.com/fixtures/poster.png",
      contentType: "image/png",
      size: 2_048,
      metadata: undefined,
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Send message" })).toHaveAttribute(
        "aria-disabled",
        "false",
      ),
    );
  });

  it("puts a quota refusal on the chip that caused it, with a retry", async () => {
    const user = userEvent.setup();
    server.use(noActiveRun, uploadQuotaExceeded);
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    const field = await screen.findByLabelText("Message");
    await user.upload(field.parentElement!.querySelector("input[type=file]")!, pickImage());

    expect(await screen.findByRole("alert")).toHaveTextContent(/0\.5 GB per-file limit/);
    expect(screen.getByRole("button", { name: /Retry uploading poster\.png/ })).toBeInTheDocument();
  });

  it("removes a chip, and the send goes out with no attachment", async () => {
    const user = userEvent.setup();
    let sendBody: { attachmentIds?: string[] } | null = null;
    server.use(
      noActiveRun,
      http.post(`${API}/chats/:chatId/messages`, async ({ request }) => {
        sendBody = (await request.json()) as typeof sendBody;
        return HttpResponse.json({ data: fixtures.sendMessageResult });
      }),
    );
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    const field = await screen.findByLabelText("Message");
    await user.upload(field.parentElement!.querySelector("input[type=file]")!, pickImage());
    await user.click(await screen.findByRole("button", { name: "Remove poster.png" }));

    await user.type(field, "no attachment{Enter}");

    await waitFor(() => expect(sendBody?.attachmentIds).toEqual([]));
  });

  /**
   * The file input's `accept` filters the picker, so this cannot be produced through it — but accept
   * is a hint, not a guarantee, and the hook is the boundary that has to hold either way.
   */
  it("refuses a non-media file at the hook, without calling the server", async () => {
    const { result } = renderHook(() => useUploadAttachments(), { wrapper: hookWrapper });

    act(() => result.current.addFiles([new File(["text"], "notes.pdf", { type: "application/pdf" })]));

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0]?.status).toBe("failed");
    expect(result.current.items[0]?.error).toMatch(/image, video and audio/i);
    expect(result.current.readyIds).toEqual([]);
    expect(uploadToAssembly).not.toHaveBeenCalled();
  });

  it("stops accepting files at the cap, so a send can never carry more than five", async () => {
    const { result } = renderHook(() => useUploadAttachments(), { wrapper: hookWrapper });

    act(() => result.current.addFiles(Array.from({ length: 7 }, () => pickImage())));

    await waitFor(() => expect(result.current.items).toHaveLength(MAX_ATTACHMENTS));
    expect(result.current.full).toBe(true);
  });
});

describe("an image question", () => {
  it("answers with attachment ids, never URLs", async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    server.use(
      http.post(`${API}/attachments`, () =>
        HttpResponse.json({
          data: { attachment: { ...fixtures.attachment, id: "attachment-answer" } },
        }),
      ),
    );

    renderWithProviders(
      <QuestionPanel
        payload={{
          message: "A couple of questions before I start.",
          questions: [
            { id: "reference", type: "image", prompt: "Share the image", required: false, maxImages: 2 },
          ],
        }}
        resolving={false}
        onResolve={onResolve}
        onDismiss={vi.fn()}
      />,
    );

    await user.upload(
      document.querySelector("input[type=file]")!,
      pickImage("reference.png"),
    );

    const save = await screen.findByRole("button", { name: /Save & Next/ });
    await waitFor(() => expect(save).not.toBeDisabled());
    await user.click(save);

    expect(onResolve).toHaveBeenCalledWith({
      kind: "questions",
      answers: { reference: ["attachment-answer"] },
      skipped: [],
    });
  });

  it("can still be skipped, which is what an unanswerable image question needs", async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();

    renderWithProviders(
      <QuestionPanel
        payload={{
          message: "A couple of questions before I start.",
          questions: [
            { id: "reference", type: "image", prompt: "Share the image", required: true, maxImages: 1 },
          ],
        }}
        resolving={false}
        onResolve={onResolve}
        onDismiss={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Skip" }));

    expect(onResolve).toHaveBeenCalledWith({
      kind: "questions",
      answers: {},
      skipped: ["reference"],
    });
  });
});
