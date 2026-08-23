"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { uploadToAssembly, type UploadHandle } from "@/lib/uploader";
import { useApi } from "@/lib/use-api";

export const MAX_ATTACHMENTS = 5;

export type UploadAttachments = ReturnType<typeof useUploadAttachments>;

const MEDIA_TYPE = /^(image|video|audio)\//;

export type UploadItem = {
  localId: string;
  name: string;
  contentType: string;
  size: number;
  /** An object URL for image thumbnails; revoked when the chip goes away. */
  previewUrl: string | null;
  status: "uploading" | "ready" | "failed";
  progress: number;
  attachmentId: string | null;
  error: string | null;
};

let uploadSequence = 0;

/**
 * The composer's upload pipeline: sign → Transloadit assembly → report the attachment → hand back
 * the id. One item per file, each with its own signed assembly, failures kept on screen with the
 * reason and a retry.
 *
 * Signing happens per file rather than per batch so a quota refusal (413, field `files.0.size`)
 * lands on the one file that caused it instead of failing the batch.
 */
export function useUploadAttachments(maxItems: number = MAX_ATTACHMENTS) {
  const api = useApi();
  const [items, setItems] = useState<readonly UploadItem[]>([]);
  const filesRef = useRef(new Map<string, { file: File; handle: UploadHandle | null }>());

  const patch = useCallback((localId: string, change: Partial<UploadItem>) => {
    setItems((current) =>
      current.map((item) => (item.localId === localId ? { ...item, ...change } : item)),
    );
  }, []);

  const run = useCallback(
    async (localId: string, file: File) => {
      try {
        const signed = await api.signUploads({
          files: [{ name: file.name, contentType: file.type, size: file.size }],
        });
        const assembly = signed.assemblies[0];
        if (!assembly) throw new Error("The server signed no assembly for this file.");

        const handle = uploadToAssembly({
          file,
          assembly,
          onProgress: (percent) => patch(localId, { progress: percent }),
        });
        const entry = filesRef.current.get(localId);
        if (entry) entry.handle = handle;

        const uploaded = await handle.done;

        const { attachment } = await api.createAttachment({
          assemblyId: uploaded.assemblyId,
          status: "ready",
          file: {
            name: file.name,
            contentType: uploaded.contentType,
            size: uploaded.size,
            url: uploaded.url,
            metadata: uploaded.metadata,
          },
        });

        patch(localId, { status: "ready", progress: 100, attachmentId: attachment.id });
      } catch (error) {
        patch(localId, { status: "failed", error: uploadFailureMessage(error) });
      }
    },
    [api, patch],
  );

  const addFiles = useCallback(
    (files: readonly File[]) => {
      setItems((current) => {
        const room = Math.max(0, maxItems - current.length);
        const accepted = files.slice(0, room);

        const added = accepted.map((file) => {
          const localId = `upload-${(uploadSequence += 1)}`;
          const media = MEDIA_TYPE.test(file.type);

          filesRef.current.set(localId, { file, handle: null });

          if (media) void run(localId, file);

          return {
            localId,
            name: file.name,
            contentType: file.type,
            size: file.size,
            previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
            status: media ? ("uploading" as const) : ("failed" as const),
            progress: 0,
            attachmentId: null,
            error: media ? null : "Only image, video and audio files can be attached.",
          };
        });

        return [...current, ...added];
      });
    },
    [maxItems, run],
  );

  const remove = useCallback((localId: string) => {
    const entry = filesRef.current.get(localId);
    entry?.handle?.cancel();
    filesRef.current.delete(localId);

    setItems((current) => {
      const item = current.find((candidate) => candidate.localId === localId);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return current.filter((candidate) => candidate.localId !== localId);
    });
  }, []);

  const retry = useCallback(
    (localId: string) => {
      const entry = filesRef.current.get(localId);
      if (!entry) return;

      patch(localId, { status: "uploading", progress: 0, error: null });
      void run(localId, entry.file);
    },
    [patch, run],
  );

  const reset = useCallback(() => {
    for (const { handle } of filesRef.current.values()) handle?.cancel();
    filesRef.current.clear();

    setItems((current) => {
      for (const item of current) if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return [];
    });
  }, []);

  useEffect(() => reset, [reset]);

  const readyIds = items
    .filter((item) => item.status === "ready" && item.attachmentId !== null)
    .map((item) => item.attachmentId as string);

  return {
    items,
    /** In chip order, which is the order the message renders them in. */
    readyIds,
    settled: items.every((item) => item.status !== "uploading"),
    full: items.length >= maxItems,
    addFiles,
    remove,
    retry,
    reset,
  };
}

/** Quota refusals (413) carry the server's own copy about the limit; anything else is transport. */
function uploadFailureMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;

  return "The upload failed. Check your connection and try again.";
}
