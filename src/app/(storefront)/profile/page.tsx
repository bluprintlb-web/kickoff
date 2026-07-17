import { ProfileForm } from "@/components/profile-form";
import { verifySession } from "@/lib/dal";
import { getLocale } from "@/lib/i18n/get-locale";
import { trpcCaller } from "@/trpc/server";

export default async function ProfilePage() {
  await verifySession();
  const [trpc, locale] = await Promise.all([trpcCaller(), getLocale()]);
  const user = await trpc.user.me();

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <ProfileForm user={user} locale={locale} variant="customer" />
    </div>
  );
}
