import Link from "next/link";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { es } from "@/lib/i18n/es";
import { createClient } from "@/lib/supabase/server";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("profiles")
    .select("username, total_points, joined_at")
    .not("username", "is", null)
    .not("invite_redeemed_at", "is", null)
    .order("total_points", { ascending: false })
    .order("joined_at", { ascending: true });

  const leaderboard = (rows ?? []).filter(
    (r): r is { username: string; total_points: number; joined_at: string } =>
      r.username != null
  );

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">{es.nav.leaderboard}</h1>
      <p className="text-sm text-[var(--color-muted-foreground)]">
        {es.landing.leaderboardHint}
      </p>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <LeaderboardTable rows={leaderboard} />
      </div>
      <p className="text-sm">
        <Link href="/" className="text-[var(--color-accent)] hover:underline">
          {es.nav.home}
        </Link>
      </p>
    </section>
  );
}
