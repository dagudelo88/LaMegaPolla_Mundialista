import Link from "next/link";
import { loadPublicPlayerPredictions } from "@/app/actions/player-predictions";
import { PronosticosShell } from "@/components/predictions/pronosticos-shell";
import { requireUser } from "@/lib/auth/require-admin";
import { es } from "@/lib/i18n/es";

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function PlayerPredictionsPage({ params }: PageProps) {
  await requireUser();
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername);
  const data = await loadPublicPlayerPredictions(username);

  return (
    <section className="space-y-4">
      <div>
        <Link
          href="/"
          className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          {es.playerPredictions.backToLeaderboard}
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{es.playerPredictions.title}</h1>
        <p className="mt-2 text-[var(--color-muted-foreground)]">
          {es.playerPredictions.subtitle}
        </p>
      </div>
      <PronosticosShell
        data={data}
        maxChangesPerDay={0}
        changeCosts={{}}
        mode="view"
        viewUsername={data.username}
        viewRank={data.rank}
      />
    </section>
  );
}
