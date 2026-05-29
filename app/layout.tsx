import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { MainNav } from "@/components/nav/main-nav";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/require-admin";
import { isAdminProfile } from "@/lib/auth/roles";
import { es } from "@/lib/i18n/es";

export const dynamic = "force-dynamic";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
      <body className={`${geistSans.variable} antialiased`}>
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
