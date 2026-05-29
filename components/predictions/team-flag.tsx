"use client";

import Image from "next/image";
import { useState } from "react";
import { getFlagUrl } from "@/lib/teams/flag-url";

interface TeamFlagProps {
  fifaCode?: string;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CONFIG = {
  sm: { display: 24, cdn: 40 },
  md: { display: 32, cdn: 40 },
  lg: { display: 48, cdn: 80 },
} as const;

export function TeamFlag({ fifaCode, name, size = "sm", className = "" }: TeamFlagProps) {
  const [failed, setFailed] = useState(false);

  if (!fifaCode) return null;

  const { display, cdn } = SIZE_CONFIG[size];
  const flagUrl = getFlagUrl(fifaCode, cdn);
  const alt = name ? `Bandera de ${name}` : `Bandera ${fifaCode}`;

  if (flagUrl && !failed) {
    const height = Math.round(display * 0.67);
    return (
      <Image
        src={flagUrl}
        width={display}
        height={height}
        alt={alt}
        className={`inline-block shrink-0 rounded-sm border border-[var(--color-border)]/60 object-cover shadow-sm ${className}`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-muted)] px-1.5 text-[10px] font-bold text-[var(--color-muted-foreground)] ${className}`}
      style={{ minWidth: display, height: Math.round(display * 0.67) }}
      aria-label={alt}
    >
      {fifaCode}
    </span>
  );
}

interface TeamWithFlagProps {
  name: string;
  fifaCode?: string;
  align?: "left" | "center" | "right";
  flagSize?: "sm" | "md" | "lg";
}

export function TeamWithFlag({
  name,
  fifaCode,
  align = "center",
  flagSize = "sm",
}: TeamWithFlagProps) {
  const alignClass =
    align === "right" ? "sm:items-end" : align === "left" ? "sm:items-start" : "items-center";

  return (
    <div className={`flex flex-col items-center gap-1.5 ${alignClass}`}>
      <TeamFlag fifaCode={fifaCode} name={name} size={flagSize} />
      <p className="max-w-[9rem] text-center text-sm font-medium leading-tight">{name}</p>
    </div>
  );
}
