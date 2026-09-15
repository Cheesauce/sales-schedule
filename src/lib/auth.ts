import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

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
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      const role = adminEmails.includes(user.email.toLowerCase()) ? "ADMIN" : "SALES";
      await prisma.user
        .update({
          where: { email: user.email },
          data: {
            role,
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
      const role = adminEmails.includes(user.email.toLowerCase()) ? "ADMIN" : "SALES";
      await prisma.user.update({ where: { id: user.id }, data: { role } });
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
