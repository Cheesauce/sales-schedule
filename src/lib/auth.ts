import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

import { isEnvAdmin } from "@/lib/roles";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          // request Calendar write access + Drive file access (only files
          // this app creates — not the admin's whole Drive) + offline
          // access so we get a refresh token we can use later
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file",
          // "offline" asks Google for a refresh token the first time someone
          // grants access. We deliberately don't force prompt: "consent" —
          // that re-showed the full permissions screen on every login. The
          // token is saved on first consent (see signIn/linkAccount below);
          // if it's ever revoked, Google asks for consent again by itself.
          access_type: "offline",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      await prisma.user
        .update({
          where: { email: user.email },
          data: {
            // Only ever promote here (ADMIN_EMAILS). Never reset a role the
            // admin set on the Users page back to SALES on every login.
            ...(isEnvAdmin(user.email) ? { role: "ADMIN" as const } : {}),
            // Google only returns a refresh_token on the first consent;
            // keep it if a fresh one isn't sent this time.
            ...(account?.access_token ? { googleAccessToken: account.access_token } : {}),
            ...(account?.refresh_token ? { googleRefreshToken: account.refresh_token } : {}),
            ...(account?.expires_at
              ? { googleTokenExpiry: new Date(account.expires_at * 1000) }
              : {}),
          },
        })
        .catch(() => {
          // user row not created yet on very first pass; the adapter and
          // linkAccount event will populate everything right after
        });
      return true;
    },
    async session({ session, user }) {
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (dbUser && session.user) {
        (session.user as typeof session.user & { role: string; id: string }).role = dbUser.role;
        (session.user as typeof session.user & { role: string; id: string }).id = dbUser.id;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email) return;
      await prisma.user.update({ where: { id: user.id }, data: { role: isEnvAdmin(user.email) ? "ADMIN" : "SALES" } });
    },
    async linkAccount({ user, account }) {
      // Persist Google tokens on the User row so we can call the Calendar
      // API later on behalf of whoever connected their account.
      if (account.provider !== "google") return;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          googleAccessToken: account.access_token ?? undefined,
          googleRefreshToken: account.refresh_token ?? undefined,
          googleTokenExpiry: account.expires_at
            ? new Date(account.expires_at * 1000)
            : undefined,
        },
      });
    },
  },
  pages: {
    signIn: "/login",
  },
});
