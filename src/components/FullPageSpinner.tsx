import { Spinner } from "@/components/Spinner";

/**
 * What a hard reload shows before anything else can be known: a bare centred spinner on the canvas,
 * which is what the reference answers with.
 *
 * Used wherever a screen would otherwise paint a confident wrong answer — most importantly the shell,
 * which cannot know whether there is an account until Clerk has resolved.
 */
export function FullPageSpinner() {
  return (
    <div className="flex h-dvh items-center justify-center">
      <Spinner className="size-5" />
    </div>
  );
}
