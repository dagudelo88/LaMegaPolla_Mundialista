import { formatBracketSlotLabel, parseBracketSlot } from "@/lib/matches/slot-label";
import { es } from "@/lib/i18n/es";

export interface FixtureTeamSide {
  id?: number;
  fifa_code?: string;
  name_es: string;
  flag_emoji?: string | null;
  placeholder?: string;
}

export function matchToFixtureSides(match: {
  home_team?: { id: number; fifa_code: string; name_es: string; flag_emoji: string | null } | null;
  away_team?: { id: number; fifa_code: string; name_es: string; flag_emoji: string | null } | null;
  home_source: unknown;
  away_source: unknown;
}): { home: FixtureTeamSide; away: FixtureTeamSide } {
  const homeSlot = parseBracketSlot(match.home_source);
  const awaySlot = parseBracketSlot(match.away_source);

  const home: FixtureTeamSide = match.home_team
    ? {
        id: match.home_team.id,
        fifa_code: match.home_team.fifa_code,
        name_es: match.home_team.name_es,
        flag_emoji: match.home_team.flag_emoji,
      }
    : {
        name_es: homeSlot ? formatBracketSlotLabel(homeSlot) : es.fixture.tbd,
        placeholder: homeSlot ? formatBracketSlotLabel(homeSlot) : es.fixture.tbd,
      };

  const away: FixtureTeamSide = match.away_team
    ? {
        id: match.away_team.id,
        fifa_code: match.away_team.fifa_code,
        name_es: match.away_team.name_es,
        flag_emoji: match.away_team.flag_emoji,
      }
    : {
        name_es: awaySlot ? formatBracketSlotLabel(awaySlot) : es.fixture.tbd,
        placeholder: awaySlot ? formatBracketSlotLabel(awaySlot) : es.fixture.tbd,
      };

  return { home, away };
}
