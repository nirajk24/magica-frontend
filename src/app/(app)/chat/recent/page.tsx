import { auth } from "@clerk/nextjs/server";
import { TasksPage } from "@/components/tasks/TasksPage";

/**
 * The task list reads a user's own chats, so unlike `/chat` it cannot be seen anonymously. The check
 * runs because the route rendered, not because a path pattern matched.
 */
export default async function RecentTasksPage() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) redirectToSignIn();

  return <TasksPage />;
}
