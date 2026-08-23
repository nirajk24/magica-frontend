import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { UsagePage } from "@/components/usage/UsagePage";

/**
 * The usage aggregation is the user's own spend, so unlike `/chat` it cannot be seen anonymously.
 * The Suspense boundary exists for `useSearchParams` — the Show side lives in the URL.
 */
export default async function UsageRoute() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) redirectToSignIn();

  return (
    <Suspense fallback={<FullPageSpinner />}>
      <UsagePage />
    </Suspense>
  );
}
