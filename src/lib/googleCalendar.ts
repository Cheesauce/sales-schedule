import { google } from "googleapis";
import { getConnectedAdmin, getAuthorizedClientForUser } from "@/lib/googleAuth";

export interface CreateMeetingEventInput {
  summary: string;
  description: string;
  location: string;
  startDateTime: string; // ISO 8601 with timezone
  endDateTime: string; // ISO 8601 with timezone
  attendeeEmails: string[];
  timeZone?: string;
}

export async function createMeetingEvent(input: CreateMeetingEventInput): Promise<string> {
  const owner = await getConnectedAdmin();
  if (!owner) {
    throw new Error(
      "No admin has connected a Google account yet. Sign in as an admin and grant Calendar access first."
    );
  }

  const authClient = await getAuthorizedClientForUser(owner);
  const calendar = google.calendar({ version: "v3", auth: authClient });
  const timeZone = input.timeZone ?? "Asia/Manila";

  const res = await calendar.events.insert({
    calendarId: owner.googleCalendarId ?? "primary",
    sendUpdates: "all",
    requestBody: {
      summary: input.summary,
      description: input.description,
      location: input.location,
      start: { dateTime: input.startDateTime, timeZone },
      end: { dateTime: input.endDateTime, timeZone },
      attendees: input.attendeeEmails.map((email) => ({ email })),
    },
  });

  if (!res.data.id) {
    throw new Error("Google Calendar did not return an event id.");
  }
  return res.data.id;
}

export async function deleteMeetingEvent(eventId: string): Promise<void> {
  const owner = await getConnectedAdmin();
  if (!owner) return;
  const authClient = await getAuthorizedClientForUser(owner);
  const calendar = google.calendar({ version: "v3", auth: authClient });
  await calendar.events
    .delete({ calendarId: owner.googleCalendarId ?? "primary", eventId, sendUpdates: "all" })
    .catch(() => {
      // event may already be gone; nothing else to do
    });
}
