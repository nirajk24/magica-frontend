import { redirect } from "next/navigation";

/** The reference serves its new-chat page from `/chat` and redirects the root to it. */
export default function RootPage() {
  redirect("/chat");
}
