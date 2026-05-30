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
  layout?: "stack" | "inline";
}

export function TeamWithFlag({
  name,
  fifaCode,
  align = "center",
  flagSize = "sm",
  layout = "stack",
}: TeamWithFlagProps) {
  const alignClass =
    align === "right"
      ? layout === "inline"
        ? "justify-end text-right"
        : "sm:items-end"
      : align === "left"
        ? layout === "inline"
          ? "justify-start text-left"
          : "sm:items-start"
        : layout === "inline"
          ? "justify-center text-center"
          : "items-center";

  const nameClass =
    flagSize === "lg" ? "text-base" : flagSize === "md" ? "text-sm sm:text-base" : "text-sm";

  if (layout === "inline") {
    return (
      <div className={`flex items-center gap-2 ${alignClass}`}>
        <TeamFlag fifaCode={fifaCode} name={name} size={flagSize} />
        <span className={`font-medium leading-tight ${nameClass}`}>{name}</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-1.5 ${alignClass}`}>
      <TeamFlag fifaCode={fifaCode} name={name} size={flagSize} />
      <p className={`max-w-[9rem] text-center font-medium leading-tight ${nameClass}`}>
        {name}
      </p>
    </div>
  );
}
