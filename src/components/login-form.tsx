"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

export function LoginForm({ locale }: { locale: Locale }) {
  const dict = dictionaries[locale].auth;
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-24">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{dict.welcomeBack}</h1>
        <p className="text-sm text-muted-foreground">{dict.loginSubtitle}</p>
      </div>

      <Card className="px-6">
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{dict.email}</Label>
            <Input id="email" name="email" type="email" required />
            {state?.errors?.email && (
              <p className="text-sm text-destructive">{state.errors.email[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{dict.password}</Label>
            <Input id="password" name="password" type="password" required />
            {state?.errors?.password && (
              <p className="text-sm text-destructive">
                {state.errors.password[0]}
              </p>
            )}
          </div>
          {state?.message && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? dict.loggingIn : dict.logIn}
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        {dict.noAccount}{" "}
        <Link href="/register" className="font-medium text-foreground underline underline-offset-2">
          {dict.signUp}
        </Link>
      </p>
    </div>
  );
}
