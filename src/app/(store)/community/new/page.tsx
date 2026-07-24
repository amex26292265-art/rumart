import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ensureForumSeeded } from "@/app/actions/forum";
import { prisma } from "@/lib/prisma";
import { NewTopicForm } from "../NewTopicForm";

export const dynamic = "force-dynamic";

export default async function NewTopicPage() {
  const session = await auth();
  if (!(session?.user as { id?: string } | undefined)?.id) {
    redirect("/login?next=/community/new");
  }
  await ensureForumSeeded().catch(() => {});
  const categories = await prisma.forumCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true },
  });
  return <NewTopicForm categories={categories} />;
}
