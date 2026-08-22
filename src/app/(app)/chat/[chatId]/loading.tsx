import { Spinner } from "@/components/Spinner";

/** The reference answers a hard reload with a bare centred spinner before the shell paints. */
export default function ChatLoading() {
  return (
    <div className="flex h-dvh items-center justify-center">
      <Spinner className="size-5" />
    </div>
  );
}
