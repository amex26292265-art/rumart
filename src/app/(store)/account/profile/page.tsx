import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileEditForm } from "./ProfileEditForm";

export const dynamic = "force-dynamic";

export default async function ProfileEditPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login?next=/account/profile");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      username: true,
      name: true,
      bio: true,
      discord: true,
      telegram: true,
      website: true,
      country: true,
      avatarUrl: true,
      bannerUrl: true,
    },
  });

  return <ProfileEditForm initial={user} />;
}
