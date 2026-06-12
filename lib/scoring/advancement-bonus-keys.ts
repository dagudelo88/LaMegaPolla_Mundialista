export const MATCH_ADVANCEMENT_BONUS_PREFIX = "match:";
export const ROUND_ADVANCEMENT_BONUS_PREFIX = "round:";

export function matchAdvancementBonusKey(matchId: string): string {
  return `${MATCH_ADVANCEMENT_BONUS_PREFIX}${matchId}`;
}

export function roundAdvancementBonusKey(roundKey: string): string {
  return `${ROUND_ADVANCEMENT_BONUS_PREFIX}${roundKey}`;
}

export function parseAdvancementBonusKey(bonusKey: string): {
  type: "match" | "round" | "unknown";
  id: string;
} {
  if (bonusKey.startsWith(MATCH_ADVANCEMENT_BONUS_PREFIX)) {
    return {
      type: "match",
      id: bonusKey.slice(MATCH_ADVANCEMENT_BONUS_PREFIX.length),
    };
  }
  if (bonusKey.startsWith(ROUND_ADVANCEMENT_BONUS_PREFIX)) {
    return {
      type: "round",
      id: bonusKey.slice(ROUND_ADVANCEMENT_BONUS_PREFIX.length),
    };
  }
  return { type: "unknown", id: bonusKey };
}
