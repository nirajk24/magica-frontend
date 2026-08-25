import { notFound } from "next/navigation";
import { ExampleScreen } from "@/components/examples/ExampleScreen";
import { exampleChat } from "@/examples/chats";

/**
 * The only importer of `examples/chats`, which is what keeps the conversations out of the bundle
 * every other page loads. The sidebar reads `examples/titles` instead.
 */
export default async function ExamplePage({
  params,
}: {
  params: Promise<{ exampleId: string }>;
}) {
  const { exampleId } = await params;
  const example = exampleChat(exampleId);

  if (!example) notFound();

  return <ExampleScreen example={example} />;
}
