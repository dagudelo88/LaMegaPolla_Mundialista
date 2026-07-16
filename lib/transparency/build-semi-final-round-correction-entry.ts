import type { TransparencyEntry } from "@/types/database";
import { PHASE_LABELS } from "@/types/database";

/** Fixed id so the entry is never duplicated when merging history pages. */
export const SEMI_FINAL_ROUND_CORRECTION_ENTRY_ID =
  "scoring-correction-2026-07-16-semi-final-round";

/** When the semi-final round +2 repair was applied (UTC). */
export const SEMI_FINAL_ROUND_CORRECTION_CREATED_AT = "2026-07-16T12:48:20.000Z";

const EMPTY_SCORE_CHANGE = {
  beforeHome: null,
  beforeAway: null,
  afterHome: null,
  afterAway: null,
  beforeAdvancesTeam: null,
  afterAdvancesTeam: null,
};

const CONCEPT_LABEL = "Semifinales · avance +2";

/** Players who had round:semi_final stuck at 0 and received the correct bonus on recalc. */
export const SEMI_FINAL_ROUND_CORRECTION_PLAYERS: Array<{
  username: string;
  pointsAdded: number;
}> = [
  { username: "Martin_Monsalve29", pointsAdded: 8 },
  { username: "Boomergamer", pointsAdded: 6 },
  { username: "JoFeGo", pointsAdded: 6 },
  { username: "Julio", pointsAdded: 6 },
  { username: "ManuelEsc", pointsAdded: 6 },
  { username: "Nicopz9", pointsAdded: 6 },
  { username: "Simon_G", pointsAdded: 6 },
  { username: "santiagopenac", pointsAdded: 6 },
  { username: "Bruce_Wayne26", pointsAdded: 4 },
  { username: "Martinator_Gonzalez", pointsAdded: 4 },
  { username: "Murcilui_EL_Oraculo", pointsAdded: 4 },
  { username: "Rarda", pointsAdded: 4 },
  { username: "Santiago110", pointsAdded: 4 },
  { username: "vicegopu", pointsAdded: 4 },
];

export function buildSemiFinalRoundCorrectionEntry(): TransparencyEntry {
  return {
    id: SEMI_FINAL_ROUND_CORRECTION_ENTRY_ID,
    kind: "scoring_correction",
    createdAt: SEMI_FINAL_ROUND_CORRECTION_CREATED_AT,
    playerUsername: "—",
    matchNumber: null,
    matchLabel: "Semifinales · Bono +2 por avance (REGLAS §4)",
    phaseLabel: PHASE_LABELS.semi_final ?? "Semifinales",
    homeTeam: null,
    awayTeam: null,
    beforeScore: "—",
    afterScore: "—",
    scoreChange: EMPTY_SCORE_CHANGE,
    reason: "Corrección del bono +2 de semifinales (round:semi_final)",
    semiFinalRoundImpact: {
      impactedPlayers: SEMI_FINAL_ROUND_CORRECTION_PLAYERS.map((p) => ({
        username: p.username,
        pointsAdded: p.pointsAdded,
        label: CONCEPT_LABEL,
      })),
    },
  };
}
