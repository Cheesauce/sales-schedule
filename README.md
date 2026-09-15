# Revlv Sales Scheduler

Internal tool for scheduling supplier/client meetings with the sales
department, with admin confirmation and automatic Google Calendar sync.

## Stack

- Next.js (App Router, TypeScript, Tailwind)
- Prisma + SQLite (`prisma/schema.prisma`)
- NextAuth v5 with Google sign-in (roles: `ADMIN` / `SALES`)
- Google Calendar API (via the admin's connected Google account)

## How it works

1. **Supplier Information Form** (`/supplier-form`) — no login required.
   Required before requesting a meeting; mirrors the company's paper form
   (company info, contacts, owners/officers, products/services, financial
   info, declarations, authorized representative, final consent +
   signature). For Section VIII, the requestor uploads all their
   documents to a Google Drive folder themselves and pastes one shareable
   link, checking off which document types it covers — we don't handle
   file uploads. On submit, the supplier gets a private edit link
   (`/supplier-form/edit/[token]`) — save it, there's no email delivery —
   to come back and update their submission or Drive link later.
2. **Public request form** (`/`) — gated behind having a completed
   Supplier Information Form (via `?submissionId=` after finishing it, or
   by pasting a saved edit link). A supplier/client then picks a topic,
   sales contact, date, and time. The form only allows Tuesday–Friday,
   10:30 AM–3:00 PM, and live-checks availability against confirmed
   meetings and admin blackout windows. Monday is always blocked.
3. **Admin dashboard** (`/admin`, login required, `ADMIN` role) — review
   pending requests and Confirm or Reject them. Confirming opens a modal
   to choose who on the sales side gets invited (the whole team via
   `sales@revlv.com`, or specific people), re-validates the slot, then
   creates a Google Calendar event on the calendar of whichever admin
   connected Google Calendar. Confirmed/Rejected requests can be reverted
   to Pending, and any request can be deleted.
4. **Sales contacts** (`/admin/contacts`) — manage the roster of sales
   people selectable on the public form.
5. **Manual schedule / availability** (`/admin/availability`) — add
   custom blackout windows (e.g. a rep on leave) or explicit open windows,
   scoped to one sales contact or the whole department.
6. **Suppliers** (`/admin/suppliers`) — browse every Supplier Information
   Form submission and view full details, including their attachments'
   Google Drive link.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in real values, never commit this file
```

Also create a plain `.env` (Prisma CLI only reads `.env`, not
`.env.local`) with just the database URL:

```
DATABASE_URL="file:./dev.db"
```

### Google OAuth + Calendar API

1. In Google Cloud Console, create an OAuth 2.0 Client ID (Web
   application) and enable the **Google Calendar API** on the same
   project.
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   (add your production URL too when deploying).
3. Put the client ID/secret into `.env.local` as `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET`. Never commit real values — use your secrets
   manager for any deployed environment.
4. Set `ADMIN_EMAILS` in `.env.local` to a comma-separated list of emails
   that should get the `ADMIN` role on sign-in.
5. Generate `AUTH_SECRET` with `npx auth secret`.

### Database

```bash
npx prisma db push    # creates dev.db and applies the schema
```

### Run

```bash
npm run dev
```

Then:

1. Sign in at `/login` with an admin email (from `ADMIN_EMAILS`) and
   grant Calendar access when prompted — this connects the calendar that
   confirmed meetings get written to.
2. Add sales contacts at `/admin/contacts`.
3. Share the `/` link with suppliers/clients to request meetings.

## Business rules (`src/lib/scheduling.ts`)

- Meetings only Tuesday–Friday.
- Monday is always unavailable.
- Meeting time must fall within 10:30 AM–3:00 PM.
- Admin `AvailabilityBlock` rows can layer blackouts or extra open windows
  on top of the above, per sales contact or department-wide.
- Only **one confirmed meeting per sales contact per day** — any existing
  confirmed meeting blocks the rest of that day for that contact,
  regardless of time.
- Section VIII attachments aren't uploaded to this app — the requestor
  shares one Google Drive link covering all their documents, plus which
  requirement types it includes.
