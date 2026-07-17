import { ProfileForm } from "@/components/profile-form";
import { trpcCaller } from "@/trpc/server";

export default async function AdminProfilePage() {
  const trpc = await trpcCaller();
  const user = await trpc.user.me();

  return <ProfileForm user={user} locale="en" variant="admin" />;
}
