import { es } from "@/lib/i18n/es";

export function AdvancementCorrectionCardBody() {
  const n = es.transparency.advancementCorrectionNotice;

  return (
    <div className="mt-3 space-y-3 text-sm text-[var(--color-muted-foreground)]">
      <p>{n.intro}</p>
      <p>{n.whatHappened}</p>
      <p className="font-medium text-[var(--color-foreground)]">{n.impactedHeading}</p>
      <ul className="list-inside list-disc space-y-1">
        {n.impactedGroups.map((group) => (
          <li key={group.label}>
            <span className="text-[var(--color-foreground)]">{group.label}:</span>{" "}
            {group.players}
          </li>
        ))}
      </ul>
      <p className="font-medium text-[var(--color-foreground)]">{n.fixHeading}</p>
      <ul className="list-inside list-disc space-y-1">
        {n.fixes.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="font-medium text-[var(--color-foreground)]">{n.uxHeading}</p>
      <ul className="list-inside list-disc space-y-1">
        {n.uxImprovements.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="text-xs">{n.footer}</p>
    </div>
  );
}
