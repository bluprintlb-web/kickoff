"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/auth";

export async function logout() {
  await signOut({ redirectTo: "/" });
}

export type AuthFormState =
  | {
      errors?: { name?: string[]; email?: string[]; password?: string[] };
      message?: string;
    }
  | undefined;

const signupSchema = z.object({
  name: z.string().min(2, { error: "Name must be at least 2 characters." }),
  email: z.email({ error: "Enter a valid email address." }),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters." }),
});

export async function signup(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { message: "An account with this email already exists." };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { name, email, password: hashedPassword } });

  await signIn("credentials", { email, password, redirectTo: "/" });
}

const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  password: z.string().min(1, { error: "Password is required." }),
});

export async function login(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { message: "Invalid email or password." };
    }
    // NextAuth signals a successful sign-in redirect by throwing —
    // let Next.js handle that one.
    throw error;
  }
}
