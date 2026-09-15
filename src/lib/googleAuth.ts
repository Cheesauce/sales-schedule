import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

function getOAuthClient() {
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * The admin whose connected Google account backs both Calendar and Drive
 * integrations. Falls back to any admin with a refresh token on file.
 */
export async function getConnectedAdmin(): Promise<User | null> {
  return prisma.user.findFirst({
    where: { role: "ADMIN", googleRefreshToken: { not: null } },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Returns an authenticated OAuth2 client for the given user, refreshing
 * (and persisting) the access token if it has expired. Shared by every
 * Google API we call on behalf of the connected admin (Calendar, Drive).
 */
export async function getAuthorizedClientForUser(user: User) {
  if (!user.googleRefreshToken) {
    throw new Error(`${user.email} has not connected Google (no refresh token on file).`);
  }

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({
    access_token: user.googleAccessToken ?? undefined,
    refresh_token: user.googleRefreshToken,
    expiry_date: user.googleTokenExpiry ? user.googleTokenExpiry.getTime() : undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(tokens.access_token ? { googleAccessToken: tokens.access_token } : {}),
        ...(tokens.refresh_token ? { googleRefreshToken: tokens.refresh_token } : {}),
        ...(tokens.expiry_date ? { googleTokenExpiry: new Date(tokens.expiry_date) } : {}),
      },
    });
  });

  return oauth2Client;
}
