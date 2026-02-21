function parseEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export function getClientAdminEmails(): string[] {
  return parseEmails(process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL);
}

export function isClientAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = getClientAdminEmails();
  if (admins.length === 0) return false;
  return admins.includes(email.toLowerCase());
}
