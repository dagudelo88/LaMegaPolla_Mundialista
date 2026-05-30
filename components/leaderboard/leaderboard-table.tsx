import Link from "next/link";
import { es } from "@/lib/i18n/es";
import type { RankedLeaderboardRow } from "@/lib/pool/load-leaderboard";

interface LeaderboardTableProps {
  rows: RankedLeaderboardRow[];
  highlightTop?: number;
  highlightUsername?: string | null;
  playerLinksEnabled?: boolean;
}

export function LeaderboardTable({
  rows,
  highlightTop = 3,
  highlightUsername,
  playerLinksEnabled = false,
}: LeaderboardTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">{es.landing.leaderboardEmpty}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="py-2 pr-4">#</th>
            <th className="py-2 pr-4">{es.landing.leaderboardNickname}</th>
            <th className="py-2 pr-4">{es.landing.leaderboardPoints}</th>
            <th className="py-2">{es.landing.leaderboardPlenos}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isPodium = row.rank <= highlightTop;
            const isMe = highlightUsername != null && row.username === highlightUsername;
            const playerHref = `/jugador/${encodeURIComponent(row.username)}`;

            return (
              <tr
                key={row.username}
                className={`border-b border-[var(--color-border)] ${
                  isMe
                    ? "bg-[var(--color-accent)]/10"
                    : isPodium
                      ? "bg-[var(--color-primary)]/5"
                      : ""
                }`}
              >
                <td className="py-2 pr-4 font-medium tabular-nums">
                  {playerLinksEnabled ? (
                    <Link
                      href={playerHref}
                      className="text-[var(--color-primary)] underline-offset-2 hover:underline"
                    >
                      {row.rank}
                    </Link>
                  ) : (
                    row.rank
                  )}
                </td>
                <td className="py-2 pr-4 font-medium">
                  {playerLinksEnabled ? (
                    <Link
                      href={playerHref}
                      className="text-[var(--color-primary)] underline-offset-2 hover:underline"
                    >
                      @{row.username}
                    </Link>
                  ) : (
                    <>@{row.username}</>
                  )}
                </td>
                <td className="py-2 pr-4 tabular-nums">{row.total_points}</td>
                <td className="py-2 tabular-nums">{row.plenos_count}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
