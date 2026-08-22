import { create } from "zustand";
import { persist } from "zustand/middleware";

type UIState = {
  drafts: Record<string, string>;
  sidebarCollapsed: boolean;
  openPanel: { type: "tool"; invocationId: string } | null;
  stoppingRuns: string[];
  setDraft: (chatId: string, text: string) => void;
  clearDraft: (chatId: string) => void;
  toggleSidebar: () => void;
  setOpenPanel: (panel: UIState["openPanel"]) => void;
  markStopping: (runId: string) => void;
  clearStopping: (runId: string) => void;
};

/**
 * Browser-only state. Anything the server knows belongs in TanStack Query instead — a
 * message list kept here would go stale and never refetch.
 *
 * `partialize` is load-bearing: without it the transient fields are written to localStorage
 * and an open tool panel or a stale "stopping" run is restored on reload. Drafts persist
 * because the reference product's send-message PATCH is a presence heartbeat with no content
 * field, so server-side draft sync would be inventing a feature.
 */
export const useUI = create<UIState>()(
  persist(
    (set) => ({
      drafts: {},
      sidebarCollapsed: false,
      openPanel: null,
      stoppingRuns: [],

      setDraft: (chatId, text) =>
        set((s) => ({ drafts: { ...s.drafts, [chatId]: text } })),

      clearDraft: (chatId) =>
        set((s) => {
          const drafts = { ...s.drafts };
          delete drafts[chatId];
          return { drafts };
        }),

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setOpenPanel: (openPanel) => set({ openPanel }),

      markStopping: (runId) =>
        set((s) => ({
          stoppingRuns: s.stoppingRuns.includes(runId)
            ? s.stoppingRuns
            : [...s.stoppingRuns, runId],
        })),

      clearStopping: (runId) =>
        set((s) => ({ stoppingRuns: s.stoppingRuns.filter((id) => id !== runId) })),
    }),
    {
      name: "magica-ui",
      partialize: (s) => ({ drafts: s.drafts, sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);
