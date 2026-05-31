/** Server-only: invite URL for the participants WhatsApp group. */
export function getWhatsAppGroupInviteUrl(): string | null {
  const raw = process.env.WHATSAPP_GROUP_INVITE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !url.hostname.endsWith("whatsapp.com")) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}
