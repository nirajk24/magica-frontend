import type { ReactNode } from "react";

/**
 * The signed-in shell. It carries no auth check: the reference lets an anonymous visitor reach the
 * chat screen and only asks for an account when they act, so a blanket boundary here would gate a
 * screen the product leaves open. Surfaces that read a user's own data protect themselves — see
 * `chat/[chatId]/layout.tsx`.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
