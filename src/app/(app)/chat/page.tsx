import { ChatScreen } from "@/components/chat/ChatScreen";
import { NEW_CHAT_ID } from "@/queries/use-chat";

/**
 * The new-chat page, at the URL the reference uses. `NEW_CHAT_ID` is the id the send route accepts
 * in its path, not a route of its own — see UI-2.
 */
export default function NewChatPage() {
  return <ChatScreen chatId={NEW_CHAT_ID} />;
}
