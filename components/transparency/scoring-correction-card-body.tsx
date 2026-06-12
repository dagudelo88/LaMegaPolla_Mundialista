import { es } from "@/lib/i18n/es";

export function ScoringCorrectionCardBody() {
  const n = es.transparency.scoringCorrectionNotice;

  return (
    <div className="mt-3 space-y-2 text-sm text-[var(--color-muted-foreground)]">
      <p>{n.intro}</p>
      <p>{n.fix}</p>
      <p className="font-medium text-[var(--color-foreground)]">{n.correctedHeading}</p>
      <ul className="list-inside list-disc space-y-1">
        {n.correctedGroups.map((group) => (
          <li key={group.label}>
            <span className="text-[var(--color-foreground)]">{group.label}:</span>{" "}
            {group.players}
          </li>
        ))}
      </ul>
      <p className="text-xs">{n.footer}</p>
    </div>
  );
}
