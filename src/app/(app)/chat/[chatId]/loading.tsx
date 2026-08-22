import { FullPageSpinner } from "@/components/FullPageSpinner";

/** The reference answers a hard reload with a bare centred spinner before the shell paints. */
export default function ChatLoading() {
  return <FullPageSpinner />;
}
