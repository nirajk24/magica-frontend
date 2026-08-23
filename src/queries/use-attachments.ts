"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { AttachmentDTO } from "@/contracts";
import type { AttachmentsQueryInput } from "@/lib/api-client";
import { qk } from "@/lib/query-client";
import { useApi } from "@/lib/use-api";

type AttachmentsFilter = Omit<AttachmentsQueryInput, "cursor">;

/** The media library, cursor-paginated: every file the account uploaded or a run generated. */
export function useAttachments(filter: AttachmentsFilter = {}, { enabled = true } = {}) {
  const api = useApi();

  return useInfiniteQuery({
    queryKey: qk.attachments(filter),
    queryFn: ({ pageParam }) => api.getAttachments({ ...filter, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
}

/** The pages flattened in server order — the route already answers newest first. */
export function useAttachmentList(filter: AttachmentsFilter = {}, options?: { enabled?: boolean }) {
  const query = useAttachments(filter, options);
  const pages = query.data?.pages;

  const attachments = useMemo(
    () => (pages ?? []).flatMap((page) => page.attachments),
    [pages],
  );

  return { query, attachments };
}

export function useRenameAttachment() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ attachmentId, name }: { attachmentId: string; name: string }) =>
      api.updateAttachment(attachmentId, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attachments"] }),
  });
}

export function useDeleteAttachment() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attachmentId: string) => api.deleteAttachment(attachmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attachments"] }),
  });
}

/** Whether a Transloadit temp-stored upload has outlived its 24h URL. Generated files never expire. */
export function isAttachmentExpired(
  attachment: Pick<AttachmentDTO, "expiresAt">,
  now: Date = new Date(),
): boolean {
  return attachment.expiresAt !== null && new Date(attachment.expiresAt).getTime() <= now.getTime();
}
