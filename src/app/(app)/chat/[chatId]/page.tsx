import { ChatScreen } from "@/components/chat/ChatScreen";

/** `params` is a promise in the App Router, which is why the screen itself is a child component. */
export default async function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;

  return <ChatScreen chatId={chatId} />;
}
