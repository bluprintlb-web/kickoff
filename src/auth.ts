import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { verifyFirebaseIdToken } from "@/lib/firebase/verify-id-token";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

// Firebase has no email for phone-only sign-ins, but `User.email` is a
// required unique column shared with the email/password provider — rather
// than making every existing `user.email` usage in the app handle `null`,
// phone-only accounts get a synthetic, clearly-fake placeholder email in
// this reserved domain. Real email/password login is unaffected (Firebase
// Google sign-in always has a real email; only phone sign-in hits this).
const PHONE_PLACEHOLDER_EMAIL_DOMAIN = "phone-user.kickoff.internal";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (rawCredentials) => {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user?.password) return null;

        const passwordValid = await bcrypt.compare(
          parsed.data.password,
          user.password
        );
        if (!passwordValid) return null;

        return user;
      },
    }),
    Credentials({
      id: "firebase",
      name: "Firebase",
      credentials: {
        idToken: { label: "Firebase ID token", type: "text" },
      },
      authorize: async (rawCredentials) => {
        const idToken =
          typeof rawCredentials?.idToken === "string"
            ? rawCredentials.idToken
            : null;
        if (!idToken) return null;

        let claims;
        try {
          claims = await verifyFirebaseIdToken(idToken);
        } catch {
          return null;
        }

        // Match an existing account by whichever identity Firebase actually
        // verified, so a customer who already has a password-based account
        // and then signs in with Google/phone using the same email/number
        // lands on the same account instead of a duplicate.
        const existing = await prisma.user.findFirst({
          where: {
            OR: [
              { firebaseUid: claims.uid },
              ...(claims.email ? [{ email: claims.email }] : []),
              ...(claims.phoneNumber ? [{ phone: claims.phoneNumber }] : []),
            ],
          },
        });

        if (existing) {
          if (existing.firebaseUid === claims.uid) return existing;
          // First time this particular Firebase identity has signed in on
          // an account matched by email/phone — link it going forward.
          return prisma.user.update({
            where: { id: existing.id },
            data: {
              firebaseUid: claims.uid,
              phone: claims.phoneNumber ?? existing.phone,
            },
          });
        }

        return prisma.user.create({
          data: {
            email: claims.email ?? `${claims.uid}@${PHONE_PLACEHOLDER_EMAIL_DOMAIN}`,
            name: claims.name,
            image: claims.picture,
            phone: claims.phoneNumber,
            firebaseUid: claims.uid,
            emailVerified: claims.emailVerified ? new Date() : null,
          },
        });
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
});
