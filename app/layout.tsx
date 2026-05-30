import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { SiteBackground } from "@/components/layout/site-background";
import { MainNav } from "@/components/nav/main-nav";
import { getSessionUser, getProfile } from "@/lib/auth/require-admin";
import { isAdminProfile } from "@/lib/auth/roles";
import { es } from "@/lib/i18n/es";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: es.appName,
  description: es.tagline,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();

  let isAdmin = false;
  let username: string | null = null;
  let inviteComplete = false;
  if (user) {
    const profile = await getProfile(user.id);
    isAdmin = isAdminProfile(profile);
    username = profile?.username ?? null;
    inviteComplete = Boolean(profile?.invite_redeemed_at);
  }

  return (
    <html lang="es">
      <body className={`${geistSans.variable} relative min-h-dvh antialiased`}>
        <SiteBackground />
        <MainNav
          isAuthenticated={Boolean(user)}
          inviteComplete={inviteComplete}
          isAdmin={isAdmin}
          username={username}
        />
        <main className="mx-auto min-h-[calc(100dvh-3.5rem)] max-w-6xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
