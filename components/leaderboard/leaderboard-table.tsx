import { es } from "@/lib/i18n/es";

export interface LeaderboardTableRow {
  username: string;
  total_points: number;
}

interface LeaderboardTableProps {
  rows: LeaderboardTableRow[];
  highlightTop?: number;
  highlightUsername?: string | null;
}

export function LeaderboardTable({
  rows,
  highlightTop = 3,
  highlightUsername,
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
            <th className="py-2">{es.landing.leaderboardPoints}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rank = index + 1;
            const isPodium = rank <= highlightTop;
            const isMe = highlightUsername != null && row.username === highlightUsername;
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
                <td className="py-2 pr-4 font-medium tabular-nums">{rank}</td>
                <td className="py-2 pr-4 font-medium">@{row.username}</td>
                <td className="py-2 tabular-nums">{row.total_points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
