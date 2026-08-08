import type { Metadata } from "next";
import { PwaRegister } from "@/components/admin/pwa-register";
import { LoginForm } from "@/components/login-form";
import { getLocale } from "@/lib/i18n/get-locale";

type Props = {
  searchParams: Promise<{ admin?: string }>;
};

// /login is shared by customers and admins (the proxy redirects a
// logged-out /admin/* request here, tagged with ?admin=1 — see
// src/proxy.ts). Only that tagged visit gets the admin manifest link and
// service worker registration below, so an installability crawler (e.g.
// PWABuilder) hitting /admin without a session still lands on a page that
// exposes them, without every ordinary customer login visit picking up an
// unrelated "Kick Off Admin" manifest/service worker. No admin data or
// functionality is exposed either way — this page is still just the plain
// login form.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { admin } = await searchParams;
  if (admin !== "1") return {};

  return {
    manifest: "/admin/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: "Kick Off Admin",
      statusBarStyle: "black-translucent",
    },
  };
}

export default async function LoginPage({ searchParams }: Props) {
  const { admin } = await searchParams;
  const locale = await getLocale();

  return (
    <>
      <LoginForm locale={locale} />
      {admin === "1" && (
        <div className="fixed right-4 bottom-4">
          <PwaRegister />
        </div>
      )}
    </>
  );
}
