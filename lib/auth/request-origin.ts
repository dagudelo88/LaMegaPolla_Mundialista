import "server-only";
import { headers } from "next/headers";

/** Origin for Supabase auth redirect URLs (password reset, etc.). */
export async function getRequestOrigin(): Promise<string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    return siteUrl.replace(/\/$/, "");
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");

  if (host) {
    return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}

export function isSafeRelativePath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}
