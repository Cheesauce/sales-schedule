// Emails in ADMIN_EMAILS are always admins — a bootstrap/safety net that
// can't be demoted from the UI (so the app can never be locked out).
// Everyone else's role lives in the database and is managed on the admin
// Users page; new sign-ins default to staff (SALES).
const envAdmins = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isEnvAdmin(email: string | null | undefined): boolean {
  return !!email && envAdmins.includes(email.toLowerCase());
}
