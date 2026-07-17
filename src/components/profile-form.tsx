"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { trpc } from "@/trpc/react";

type ProfileUser = { id: string; name: string | null; email: string };

export function ProfileForm({
  user,
  locale,
  variant,
}: {
  user: ProfileUser;
  locale: Locale;
  variant: "customer" | "admin";
}) {
  const dict = dictionaries[locale].profile;

  const [name, setName] = useState(user.name ?? "");
  const [newEmail, setNewEmail] = useState(user.email);
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  const updateName = trpc.user.updateName.useMutation({
    onSuccess: () => toast.success(dict.nameUpdated),
    onError: (error) => toast.error(error.message),
  });

  const updateEmail = trpc.user.updateEmail.useMutation({
    onSuccess: async () => {
      setEmailPassword("");
      await signOut({ redirectTo: "/login" });
    },
    onError: (error) => toast.error(error.message),
  });

  const updatePassword = trpc.user.updatePassword.useMutation({
    onSuccess: async () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await signOut({ redirectTo: "/login" });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteAccount = trpc.user.deleteAccount.useMutation({
    onSuccess: async () => {
      await signOut({ redirectTo: "/" });
    },
    onError: (error) => toast.error(error.message),
  });

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(dict.passwordMismatch);
      return;
    }
    updatePassword.mutate({ currentPassword, newPassword });
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{dict.title}</h1>
        <p className="text-sm text-muted-foreground">{dict.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{dict.nameTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              updateName.mutate({ name });
            }}
          >
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="profile-name">{dict.nameLabel}</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <Button type="submit" disabled={updateName.isPending}>
              {updateName.isPending ? dict.savingName : dict.saveName}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dict.emailTitle}</CardTitle>
          <CardDescription>
            {dict.currentEmailLabel}: {user.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              updateEmail.mutate({ newEmail, currentPassword: emailPassword });
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-email">{dict.newEmailLabel}</Label>
              <Input
                id="profile-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-email-password">
                {dict.currentPasswordLabel}
              </Label>
              <Input
                id="profile-email-password"
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">{dict.reauthNotice}</p>
            <Button
              type="submit"
              disabled={updateEmail.isPending}
              className="self-start"
            >
              {updateEmail.isPending ? dict.updatingEmail : dict.updateEmail}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dict.passwordTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={handlePasswordSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-current-password">
                {dict.currentPasswordLabel}
              </Label>
              <Input
                id="profile-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-new-password">
                {dict.newPasswordLabel}
              </Label>
              <Input
                id="profile-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-confirm-password">
                {dict.confirmPasswordLabel}
              </Label>
              <Input
                id="profile-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <p className="text-xs text-muted-foreground">{dict.reauthNotice}</p>
            <Button
              type="submit"
              disabled={updatePassword.isPending}
              className="self-start"
            >
              {updatePassword.isPending
                ? dict.updatingPassword
                : dict.updatePassword}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">{dict.dangerTitle}</CardTitle>
          <CardDescription>{dict.dangerDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {variant === "admin" && (
            <p className="text-sm text-destructive">
              You are the only admin account. Deleting it will remove all
              admin access to this site, and there is no in-app way to create
              a new admin afterward.
            </p>
          )}
          <Button
            type="button"
            variant="destructive"
            className="self-start"
            onClick={() => setDeleteOpen(true)}
          >
            {dict.deleteAccount}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dict.deleteConfirmTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {dict.deleteConfirmBody}
          </p>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              deleteAccount.mutate({ currentPassword: deletePassword });
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="delete-password">
                {dict.deleteConfirmPasswordLabel}
              </Label>
              <Input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteOpen(false)}
              >
                {dict.cancel}
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={deleteAccount.isPending}
              >
                {deleteAccount.isPending
                  ? dict.deleting
                  : dict.deleteConfirmButton}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
