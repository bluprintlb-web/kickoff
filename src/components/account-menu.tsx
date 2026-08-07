"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  User,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

const rowClass =
  "flex items-center gap-3 rounded-lg px-3 py-3 text-start text-sm font-medium text-popover-foreground transition-all duration-200 hover:translate-x-1 hover:bg-muted rtl:hover:-translate-x-1";

// The hamburger sits at the header's start (next to the logo) — left in
// English, right in Arabic, same as everything else that mirrors with the
// storefront's dir="rtl" system. Opens a full-height sheet sliding in from
// that same edge, rather than a small popup dropdown, per the user's
// explicit ask (2026-08-07) for "a whole bar on the left" showing these
// same items (profile/admin/log out).
//
// <DialogPrimitive.Popup> hard-requires being inside a <DialogPrimitive.
// Portal> (it throws otherwise), but the default portal target is
// document.body — outside the storefront layout's dir="rtl" wrapper, which
// would silently break the "start" edge from flipping correctly in Arabic
// (the exact class of physical-vs-logical bug this app has hit before, see
// LanguageToggle/ThemeToggle in CONTEXT_HANDOFF.md). Pointing `container`
// at that wrapper (given the stable id="storefront-root" in
// (storefront)/layout.tsx) keeps the portaled content a real DOM
// descendant of the dir-bearing element, so `start-0`/`rtl:` inherit it
// for free instead of needing a manual sign-flip like the toggles needed.
export function AccountMenu({
  locale,
  isLoggedIn,
  isAdmin,
}: {
  locale: Locale;
  isLoggedIn: boolean;
  isAdmin: boolean;
}) {
  const dict = dictionaries[locale];
  const [open, setOpen] = useState(false);
  const container = useMemo(
    () => ({
      current:
        typeof document !== "undefined"
          ? document.getElementById("storefront-root")
          : null,
    }),
    []
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        aria-label={dict.nav.menu}
        className="flex items-center transition-all duration-200 hover:scale-110 hover:text-accent"
      >
        <Menu className="size-5" />
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal container={container}>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed inset-y-0 start-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-popover text-popover-foreground shadow-2xl outline-none duration-300 data-open:animate-in data-open:slide-in-from-left data-open:rtl:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-left data-closed:rtl:slide-out-to-right">
          <div className="flex items-center justify-between border-b px-4 py-4">
            <Logo />
            <DialogPrimitive.Close
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <X />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
            {isLoggedIn ? (
              <>
                <Link
                  href="/profile"
                  className={rowClass}
                  onClick={() => setOpen(false)}
                >
                  <User className="size-4.5 shrink-0" />
                  {dict.nav.profile}
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={rowClass}
                    onClick={() => setOpen(false)}
                  >
                    <LayoutDashboard className="size-4.5 shrink-0" />
                    {dict.nav.admin}
                  </Link>
                )}
                <div className="mt-auto border-t pt-3">
                  <form action={logout}>
                    <button
                      type="submit"
                      className={cn(rowClass, "w-full text-destructive")}
                    >
                      <LogOut className="size-4.5 shrink-0" />
                      {dict.nav.logOut}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={rowClass}
                  onClick={() => setOpen(false)}
                >
                  <LogIn className="size-4.5 shrink-0" />
                  {dict.nav.logIn}
                </Link>
                <Link
                  href="/register"
                  className={rowClass}
                  onClick={() => setOpen(false)}
                >
                  <UserPlus className="size-4.5 shrink-0" />
                  {dict.auth.signUp}
                </Link>
              </>
            )}
          </nav>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
