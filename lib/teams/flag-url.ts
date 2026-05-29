/** FIFA 3-letter code → flagcdn.com ISO slug (Windows no renderiza emojis 🇲🇽). */
const FIFA_TO_FLAGCDN: Record<string, string> = {
  ALG: "dz",
  ARG: "ar",
  AUS: "au",
  AUT: "at",
  BEL: "be",
  BIH: "ba",
  BRA: "br",
  CAN: "ca",
  CIV: "ci",
  COL: "co",
  COD: "cd",
  CPV: "cv",
  CRO: "hr",
  CUW: "cw",
  CZE: "cz",
  ECU: "ec",
  EGY: "eg",
  ENG: "gb-eng",
  ESP: "es",
  FRA: "fr",
  GER: "de",
  GHA: "gh",
  HAI: "ht",
  IRN: "ir",
  IRQ: "iq",
  JOR: "jo",
  JPN: "jp",
  KOR: "kr",
  KSA: "sa",
  MAR: "ma",
  MEX: "mx",
  NED: "nl",
  NOR: "no",
  NZL: "nz",
  PAN: "pa",
  PAR: "py",
  POR: "pt",
  QAT: "qa",
  RSA: "za",
  SCO: "gb-sct",
  SEN: "sn",
  SUI: "ch",
  SWE: "se",
  TUN: "tn",
  TUR: "tr",
  URU: "uy",
  USA: "us",
  UZB: "uz",
};

export function getFlagCdnSlug(fifaCode: string): string | null {
  const key = fifaCode.trim().toUpperCase();
  return FIFA_TO_FLAGCDN[key] ?? null;
}

const VALID_FLAGCDN_WIDTHS = [20, 40, 80, 160, 320, 640] as const;

function normalizeFlagcdnWidth(width: number): (typeof VALID_FLAGCDN_WIDTHS)[number] {
  for (const candidate of VALID_FLAGCDN_WIDTHS) {
    if (width <= candidate) return candidate;
  }
  return 640;
}

export function getFlagUrl(fifaCode: string, width = 40): string | null {
  const slug = getFlagCdnSlug(fifaCode);
  if (!slug) return null;
  const normalized = normalizeFlagcdnWidth(width);
  return `https://flagcdn.com/w${normalized}/${slug}.png`;
}
