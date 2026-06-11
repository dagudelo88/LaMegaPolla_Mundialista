/**
 * Generator for data/fifa-2026/*.json from official WC 2026 draw.
 * Kickoffs: FIFA venue-local civil time → UTC via IANA zones (openfootball + FIFA schedule).
 * Run: npx tsx scripts/generate-fifa-json.ts
 */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  bogotaLocalToUtc,
  venueLabel,
  venueLocalToUtc,
  type VenueKey,
} from "../lib/matches/venue-timezone";

const TEAMS = [
  { fifa_code: "MEX", name_es: "México", name_en: "Mexico", group_letter: "A", flag_emoji: "🇲🇽" },
  { fifa_code: "RSA", name_es: "Sudáfrica", name_en: "South Africa", group_letter: "A", flag_emoji: "🇿🇦" },
  { fifa_code: "KOR", name_es: "Corea del Sur", name_en: "Korea Republic", group_letter: "A", flag_emoji: "🇰🇷" },
  { fifa_code: "CZE", name_es: "Chequia", name_en: "Czechia", group_letter: "A", flag_emoji: "🇨🇿" },
  { fifa_code: "CAN", name_es: "Canadá", name_en: "Canada", group_letter: "B", flag_emoji: "🇨🇦" },
  { fifa_code: "BIH", name_es: "Bosnia y Herzegovina", name_en: "Bosnia and Herzegovina", group_letter: "B", flag_emoji: "🇧🇦" },
  { fifa_code: "QAT", name_es: "Catar", name_en: "Qatar", group_letter: "B", flag_emoji: "🇶🇦" },
  { fifa_code: "SUI", name_es: "Suiza", name_en: "Switzerland", group_letter: "B", flag_emoji: "🇨🇭" },
  { fifa_code: "BRA", name_es: "Brasil", name_en: "Brazil", group_letter: "C", flag_emoji: "🇧🇷" },
  { fifa_code: "MAR", name_es: "Marruecos", name_en: "Morocco", group_letter: "C", flag_emoji: "🇲🇦" },
  { fifa_code: "HAI", name_es: "Haití", name_en: "Haiti", group_letter: "C", flag_emoji: "🇭🇹" },
  { fifa_code: "SCO", name_es: "Escocia", name_en: "Scotland", group_letter: "C", flag_emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { fifa_code: "USA", name_es: "Estados Unidos", name_en: "United States", group_letter: "D", flag_emoji: "🇺🇸" },
  { fifa_code: "PAR", name_es: "Paraguay", name_en: "Paraguay", group_letter: "D", flag_emoji: "🇵🇾" },
  { fifa_code: "AUS", name_es: "Australia", name_en: "Australia", group_letter: "D", flag_emoji: "🇦🇺" },
  { fifa_code: "TUR", name_es: "Turquía", name_en: "Türkiye", group_letter: "D", flag_emoji: "🇹🇷" },
  { fifa_code: "GER", name_es: "Alemania", name_en: "Germany", group_letter: "E", flag_emoji: "🇩🇪" },
  { fifa_code: "CUW", name_es: "Curazao", name_en: "Curaçao", group_letter: "E", flag_emoji: "🇨🇼" },
  { fifa_code: "CIV", name_es: "Costa de Marfil", name_en: "Côte d'Ivoire", group_letter: "E", flag_emoji: "🇨🇮" },
  { fifa_code: "ECU", name_es: "Ecuador", name_en: "Ecuador", group_letter: "E", flag_emoji: "🇪🇨" },
  { fifa_code: "NED", name_es: "Países Bajos", name_en: "Netherlands", group_letter: "F", flag_emoji: "🇳🇱" },
  { fifa_code: "JPN", name_es: "Japón", name_en: "Japan", group_letter: "F", flag_emoji: "🇯🇵" },
  { fifa_code: "TUN", name_es: "Túnez", name_en: "Tunisia", group_letter: "F", flag_emoji: "🇹🇳" },
  { fifa_code: "SWE", name_es: "Suecia", name_en: "Sweden", group_letter: "F", flag_emoji: "🇸🇪" },
  { fifa_code: "BEL", name_es: "Bélgica", name_en: "Belgium", group_letter: "G", flag_emoji: "🇧🇪" },
  { fifa_code: "EGY", name_es: "Egipto", name_en: "Egypt", group_letter: "G", flag_emoji: "🇪🇬" },
  { fifa_code: "IRN", name_es: "Irán", name_en: "Iran", group_letter: "G", flag_emoji: "🇮🇷" },
  { fifa_code: "NZL", name_es: "Nueva Zelanda", name_en: "New Zealand", group_letter: "G", flag_emoji: "🇳🇿" },
  { fifa_code: "ESP", name_es: "España", name_en: "Spain", group_letter: "H", flag_emoji: "🇪🇸" },
  { fifa_code: "CPV", name_es: "Cabo Verde", name_en: "Cape Verde", group_letter: "H", flag_emoji: "🇨🇻" },
  { fifa_code: "KSA", name_es: "Arabia Saudita", name_en: "Saudi Arabia", group_letter: "H", flag_emoji: "🇸🇦" },
  { fifa_code: "URU", name_es: "Uruguay", name_en: "Uruguay", group_letter: "H", flag_emoji: "🇺🇾" },
  { fifa_code: "FRA", name_es: "Francia", name_en: "France", group_letter: "I", flag_emoji: "🇫🇷" },
  { fifa_code: "SEN", name_es: "Senegal", name_en: "Senegal", group_letter: "I", flag_emoji: "🇸🇳" },
  { fifa_code: "NOR", name_es: "Noruega", name_en: "Norway", group_letter: "I", flag_emoji: "🇳🇴" },
  { fifa_code: "IRQ", name_es: "Irak", name_en: "Iraq", group_letter: "I", flag_emoji: "🇮🇶" },
  { fifa_code: "ARG", name_es: "Argentina", name_en: "Argentina", group_letter: "J", flag_emoji: "🇦🇷" },
  { fifa_code: "ALG", name_es: "Argelia", name_en: "Algeria", group_letter: "J", flag_emoji: "🇩🇿" },
  { fifa_code: "AUT", name_es: "Austria", name_en: "Austria", group_letter: "J", flag_emoji: "🇦🇹" },
  { fifa_code: "JOR", name_es: "Jordania", name_en: "Jordan", group_letter: "J", flag_emoji: "🇯🇴" },
  { fifa_code: "POR", name_es: "Portugal", name_en: "Portugal", group_letter: "K", flag_emoji: "🇵🇹" },
  { fifa_code: "UZB", name_es: "Uzbekistán", name_en: "Uzbekistan", group_letter: "K", flag_emoji: "🇺🇿" },
  { fifa_code: "COL", name_es: "Colombia", name_en: "Colombia", group_letter: "K", flag_emoji: "🇨🇴" },
  { fifa_code: "COD", name_es: "Rep. Dem. del Congo", name_en: "Congo DR", group_letter: "K", flag_emoji: "🇨🇩" },
  { fifa_code: "ENG", name_es: "Inglaterra", name_en: "England", group_letter: "L", flag_emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { fifa_code: "CRO", name_es: "Croacia", name_en: "Croatia", group_letter: "L", flag_emoji: "🇭🇷" },
  { fifa_code: "GHA", name_es: "Ghana", name_en: "Ghana", group_letter: "L", flag_emoji: "🇬🇭" },
  { fifa_code: "PAN", name_es: "Panamá", name_en: "Panama", group_letter: "L", flag_emoji: "🇵🇦" },
];

/** [matchNum, home, away, group, round 1|2|3, localDate, localTime, venueKey] — openfootball WC 2026 draw */
const GROUP_MATCHES: [
  number,
  string,
  string,
  string,
  number,
  string,
  string,
  VenueKey,
][] = [
  [1, "MEX", "RSA", "A", 1, "2026-06-11", "13:00", "mexico_city"],
  [2, "KOR", "CZE", "A", 1, "2026-06-11", "20:00", "guadalajara"],
  [3, "CAN", "BIH", "B", 1, "2026-06-12", "15:00", "toronto"],
  [4, "USA", "PAR", "D", 1, "2026-06-12", "18:00", "los_angeles"],
  [5, "HAI", "SCO", "C", 1, "2026-06-13", "21:00", "boston"],
  [6, "AUS", "TUR", "D", 1, "2026-06-13", "21:00", "vancouver"],
  [7, "BRA", "MAR", "C", 1, "2026-06-13", "18:00", "new_york"],
  [8, "QAT", "SUI", "B", 1, "2026-06-13", "12:00", "santa_clara"],
  [9, "CIV", "ECU", "E", 1, "2026-06-14", "19:00", "philadelphia"],
  [10, "GER", "CUW", "E", 1, "2026-06-14", "12:00", "houston"],
  [11, "NED", "JPN", "F", 1, "2026-06-14", "15:00", "dallas"],
  [12, "SWE", "TUN", "F", 1, "2026-06-14", "20:00", "monterrey"],
  [13, "KSA", "URU", "H", 1, "2026-06-15", "18:00", "miami"],
  [14, "ESP", "CPV", "H", 1, "2026-06-15", "12:00", "atlanta"],
  [15, "IRN", "NZL", "G", 1, "2026-06-15", "18:00", "los_angeles"],
  [16, "BEL", "EGY", "G", 1, "2026-06-15", "12:00", "seattle"],
  [17, "FRA", "SEN", "I", 1, "2026-06-16", "15:00", "new_york"],
  [18, "IRQ", "NOR", "I", 1, "2026-06-16", "18:00", "boston"],
  [19, "ARG", "ALG", "J", 1, "2026-06-16", "20:00", "kansas_city"],
  [20, "AUT", "JOR", "J", 1, "2026-06-16", "21:00", "santa_clara"],
  [21, "GHA", "PAN", "L", 1, "2026-06-17", "19:00", "toronto"],
  [22, "ENG", "CRO", "L", 1, "2026-06-17", "15:00", "dallas"],
  [23, "POR", "COD", "K", 1, "2026-06-17", "12:00", "houston"],
  [24, "UZB", "COL", "K", 1, "2026-06-17", "20:00", "mexico_city"],
  [25, "CZE", "RSA", "A", 2, "2026-06-18", "12:00", "atlanta"],
  [26, "SUI", "BIH", "B", 2, "2026-06-18", "12:00", "los_angeles"],
  [27, "CAN", "QAT", "B", 2, "2026-06-18", "15:00", "vancouver"],
  [28, "MEX", "KOR", "A", 2, "2026-06-18", "19:00", "guadalajara"],
  [29, "BRA", "HAI", "C", 2, "2026-06-19", "20:30", "philadelphia"],
  [30, "SCO", "MAR", "C", 2, "2026-06-19", "18:00", "boston"],
  [31, "TUR", "PAR", "D", 2, "2026-06-19", "20:00", "santa_clara"],
  [32, "USA", "AUS", "D", 2, "2026-06-19", "12:00", "seattle"],
  [33, "GER", "CIV", "E", 2, "2026-06-20", "16:00", "toronto"],
  [34, "ECU", "CUW", "E", 2, "2026-06-20", "19:00", "kansas_city"],
  [35, "NED", "SWE", "F", 2, "2026-06-20", "12:00", "houston"],
  [36, "TUN", "JPN", "F", 2, "2026-06-20", "22:00", "monterrey"],
  [37, "URU", "CPV", "H", 2, "2026-06-21", "18:00", "miami"],
  [38, "ESP", "KSA", "H", 2, "2026-06-21", "12:00", "atlanta"],
  [39, "BEL", "IRN", "G", 2, "2026-06-21", "12:00", "los_angeles"],
  [40, "NZL", "EGY", "G", 2, "2026-06-21", "18:00", "vancouver"],
  [41, "NOR", "SEN", "I", 2, "2026-06-22", "20:00", "new_york"],
  [42, "FRA", "IRQ", "I", 2, "2026-06-22", "17:00", "philadelphia"],
  [43, "ARG", "AUT", "J", 2, "2026-06-22", "12:00", "dallas"],
  [44, "JOR", "ALG", "J", 2, "2026-06-22", "20:00", "santa_clara"],
  [45, "ENG", "GHA", "L", 2, "2026-06-23", "16:00", "boston"],
  [46, "PAN", "CRO", "L", 2, "2026-06-23", "19:00", "toronto"],
  [47, "POR", "UZB", "K", 2, "2026-06-23", "12:00", "houston"],
  [48, "COL", "COD", "K", 2, "2026-06-23", "20:00", "guadalajara"],
  [49, "SCO", "BRA", "C", 3, "2026-06-24", "18:00", "miami"],
  [50, "MAR", "HAI", "C", 3, "2026-06-24", "18:00", "atlanta"],
  [51, "SUI", "CAN", "B", 3, "2026-06-24", "12:00", "vancouver"],
  [52, "BIH", "QAT", "B", 3, "2026-06-24", "12:00", "seattle"],
  [53, "CZE", "MEX", "A", 3, "2026-06-24", "19:00", "mexico_city"],
  [54, "RSA", "KOR", "A", 3, "2026-06-24", "19:00", "monterrey"],
  [55, "CUW", "CIV", "E", 3, "2026-06-25", "16:00", "philadelphia"],
  [56, "ECU", "GER", "E", 3, "2026-06-25", "16:00", "new_york"],
  [57, "JPN", "SWE", "F", 3, "2026-06-25", "18:00", "dallas"],
  [58, "TUN", "NED", "F", 3, "2026-06-25", "18:00", "kansas_city"],
  [59, "TUR", "USA", "D", 3, "2026-06-25", "19:00", "los_angeles"],
  [60, "PAR", "AUS", "D", 3, "2026-06-25", "19:00", "santa_clara"],
  [61, "NOR", "FRA", "I", 3, "2026-06-26", "15:00", "boston"],
  [62, "SEN", "IRQ", "I", 3, "2026-06-26", "15:00", "toronto"],
  [63, "EGY", "IRN", "G", 3, "2026-06-26", "20:00", "seattle"],
  [64, "NZL", "BEL", "G", 3, "2026-06-26", "20:00", "vancouver"],
  [65, "CPV", "KSA", "H", 3, "2026-06-26", "19:00", "houston"],
  [66, "URU", "ESP", "H", 3, "2026-06-26", "18:00", "guadalajara"],
  [67, "PAN", "ENG", "L", 3, "2026-06-27", "17:00", "new_york"],
  [68, "CRO", "GHA", "L", 3, "2026-06-27", "17:00", "philadelphia"],
  [69, "ALG", "AUT", "J", 3, "2026-06-27", "21:00", "kansas_city"],
  [70, "JOR", "ARG", "J", 3, "2026-06-27", "21:00", "dallas"],
  [71, "COL", "POR", "K", 3, "2026-06-27", "19:30", "miami"],
  [72, "COD", "UZB", "K", 3, "2026-06-27", "19:30", "atlanta"],
];

type Slot =
  | { type: "group_rank"; group: string; rank: number }
  | { type: "third_best"; eligible_groups: string[] }
  | { type: "match_winner"; match_number: number }
  | { type: "match_loser"; match_number: number };

/** Knockout bracket slots — kickoffs from official-knockout-co-schedule.json (FIFA country=CO). */
const KNOCKOUT_RAW: {
  fifa_match_number: number;
  phase: string;
  venueKey: VenueKey;
  home_source: Slot;
  away_source: Slot;
}[] = [
  { fifa_match_number: 73, phase: "round_of_32", venueKey: "los_angeles", home_source: { type: "group_rank", group: "A", rank: 2 }, away_source: { type: "group_rank", group: "B", rank: 2 } },
  { fifa_match_number: 74, phase: "round_of_32", venueKey: "boston", home_source: { type: "group_rank", group: "E", rank: 1 }, away_source: { type: "third_best", eligible_groups: ["A", "B", "C", "D", "F"] } },
  { fifa_match_number: 75, phase: "round_of_32", venueKey: "monterrey", home_source: { type: "group_rank", group: "F", rank: 1 }, away_source: { type: "group_rank", group: "C", rank: 2 } },
  { fifa_match_number: 76, phase: "round_of_32", venueKey: "houston", home_source: { type: "group_rank", group: "C", rank: 1 }, away_source: { type: "group_rank", group: "F", rank: 2 } },
  { fifa_match_number: 77, phase: "round_of_32", venueKey: "new_york", home_source: { type: "group_rank", group: "I", rank: 1 }, away_source: { type: "third_best", eligible_groups: ["C", "D", "F", "G", "H"] } },
  { fifa_match_number: 78, phase: "round_of_32", venueKey: "dallas", home_source: { type: "group_rank", group: "E", rank: 2 }, away_source: { type: "group_rank", group: "I", rank: 2 } },
  { fifa_match_number: 79, phase: "round_of_32", venueKey: "mexico_city", home_source: { type: "group_rank", group: "A", rank: 1 }, away_source: { type: "third_best", eligible_groups: ["C", "E", "F", "H", "I"] } },
  { fifa_match_number: 80, phase: "round_of_32", venueKey: "atlanta", home_source: { type: "group_rank", group: "L", rank: 1 }, away_source: { type: "third_best", eligible_groups: ["E", "H", "I", "J", "K"] } },
  { fifa_match_number: 81, phase: "round_of_32", venueKey: "santa_clara", home_source: { type: "group_rank", group: "D", rank: 1 }, away_source: { type: "third_best", eligible_groups: ["B", "E", "F", "I", "J"] } },
  { fifa_match_number: 82, phase: "round_of_32", venueKey: "seattle", home_source: { type: "group_rank", group: "G", rank: 1 }, away_source: { type: "third_best", eligible_groups: ["A", "E", "H", "I", "J"] } },
  { fifa_match_number: 83, phase: "round_of_32", venueKey: "toronto", home_source: { type: "group_rank", group: "K", rank: 2 }, away_source: { type: "group_rank", group: "L", rank: 2 } },
  { fifa_match_number: 84, phase: "round_of_32", venueKey: "los_angeles", home_source: { type: "group_rank", group: "H", rank: 1 }, away_source: { type: "group_rank", group: "J", rank: 2 } },
  { fifa_match_number: 85, phase: "round_of_32", venueKey: "vancouver", home_source: { type: "group_rank", group: "B", rank: 1 }, away_source: { type: "third_best", eligible_groups: ["E", "F", "G", "I", "J"] } },
  { fifa_match_number: 86, phase: "round_of_32", venueKey: "miami", home_source: { type: "group_rank", group: "J", rank: 1 }, away_source: { type: "group_rank", group: "H", rank: 2 } },
  { fifa_match_number: 87, phase: "round_of_32", venueKey: "kansas_city", home_source: { type: "group_rank", group: "K", rank: 1 }, away_source: { type: "third_best", eligible_groups: ["D", "E", "I", "J", "L"] } },
  { fifa_match_number: 88, phase: "round_of_32", venueKey: "dallas", home_source: { type: "group_rank", group: "D", rank: 2 }, away_source: { type: "group_rank", group: "G", rank: 2 } },
  { fifa_match_number: 89, phase: "round_of_16", venueKey: "philadelphia", home_source: { type: "match_winner", match_number: 74 }, away_source: { type: "match_winner", match_number: 77 } },
  { fifa_match_number: 90, phase: "round_of_16", venueKey: "houston", home_source: { type: "match_winner", match_number: 73 }, away_source: { type: "match_winner", match_number: 75 } },
  { fifa_match_number: 91, phase: "round_of_16", venueKey: "new_york", home_source: { type: "match_winner", match_number: 76 }, away_source: { type: "match_winner", match_number: 78 } },
  { fifa_match_number: 92, phase: "round_of_16", venueKey: "mexico_city", home_source: { type: "match_winner", match_number: 79 }, away_source: { type: "match_winner", match_number: 80 } },
  { fifa_match_number: 93, phase: "round_of_16", venueKey: "dallas", home_source: { type: "match_winner", match_number: 83 }, away_source: { type: "match_winner", match_number: 84 } },
  { fifa_match_number: 94, phase: "round_of_16", venueKey: "seattle", home_source: { type: "match_winner", match_number: 81 }, away_source: { type: "match_winner", match_number: 82 } },
  { fifa_match_number: 95, phase: "round_of_16", venueKey: "atlanta", home_source: { type: "match_winner", match_number: 86 }, away_source: { type: "match_winner", match_number: 88 } },
  { fifa_match_number: 96, phase: "round_of_16", venueKey: "vancouver", home_source: { type: "match_winner", match_number: 85 }, away_source: { type: "match_winner", match_number: 87 } },
  { fifa_match_number: 97, phase: "quarter_final", venueKey: "boston", home_source: { type: "match_winner", match_number: 89 }, away_source: { type: "match_winner", match_number: 90 } },
  { fifa_match_number: 98, phase: "quarter_final", venueKey: "los_angeles", home_source: { type: "match_winner", match_number: 93 }, away_source: { type: "match_winner", match_number: 94 } },
  { fifa_match_number: 99, phase: "quarter_final", venueKey: "miami", home_source: { type: "match_winner", match_number: 91 }, away_source: { type: "match_winner", match_number: 92 } },
  { fifa_match_number: 100, phase: "quarter_final", venueKey: "kansas_city", home_source: { type: "match_winner", match_number: 95 }, away_source: { type: "match_winner", match_number: 96 } },
  { fifa_match_number: 101, phase: "semi_final", venueKey: "dallas", home_source: { type: "match_winner", match_number: 97 }, away_source: { type: "match_winner", match_number: 98 } },
  { fifa_match_number: 102, phase: "semi_final", venueKey: "atlanta", home_source: { type: "match_winner", match_number: 99 }, away_source: { type: "match_winner", match_number: 100 } },
  { fifa_match_number: 103, phase: "third_place", venueKey: "miami", home_source: { type: "match_loser", match_number: 101 }, away_source: { type: "match_loser", match_number: 102 } },
  { fifa_match_number: 104, phase: "final", venueKey: "new_york", home_source: { type: "match_winner", match_number: 101 }, away_source: { type: "match_winner", match_number: 102 } },
];

const dir = resolve(process.cwd(), "data/fifa-2026");
mkdirSync(dir, { recursive: true });

type CoScheduleEntry = { co_date: string; co_time: string };
const knockoutCoSchedule = JSON.parse(
  readFileSync(resolve(dir, "official-knockout-co-schedule.json"), "utf8")
) as Record<string, CoScheduleEntry>;

writeFileSync(resolve(dir, "teams.json"), JSON.stringify(TEAMS, null, 2));

const groupMatches = GROUP_MATCHES.map(
  ([num, home, away, group, round, localDate, localTime, venueKey]) => ({
    fifa_match_number: num,
    group_letter: group,
    home_code: home,
    away_code: away,
    matchday_key: `group_${group}_r${round}`,
    fifa_schedule_date: localDate,
    kickoff_at: venueLocalToUtc(localDate, localTime, venueKey),
    venue: venueLabel(venueKey),
  })
);

const knockoutMatches = KNOCKOUT_RAW.map(
  ({ fifa_match_number, phase, venueKey, home_source, away_source }) => {
    const co = knockoutCoSchedule[String(fifa_match_number)];
    if (!co) {
      throw new Error(`Missing official-knockout-co-schedule.json entry for M${fifa_match_number}`);
    }
    return {
      fifa_match_number,
      phase,
      fifa_schedule_date: co.co_date,
      kickoff_at: bogotaLocalToUtc(co.co_date, co.co_time),
      venue: venueLabel(venueKey),
      home_source,
      away_source,
    };
  }
);

const allMatches = [...groupMatches, ...knockoutMatches].sort(
  (a, b) => a.fifa_match_number - b.fifa_match_number
);

const officialKickoffs = allMatches.map(({ fifa_match_number, kickoff_at }) => ({
  fifa_match_number,
  kickoff_at,
}));

const scheduleByDay: Record<string, number[]> = {};
for (const m of allMatches) {
  const list = scheduleByDay[m.fifa_schedule_date] ?? [];
  list.push(m.fifa_match_number);
  scheduleByDay[m.fifa_schedule_date] = list;
}

writeFileSync(resolve(dir, "group-matches.json"), JSON.stringify(groupMatches, null, 2));
writeFileSync(resolve(dir, "knockout-matches.json"), JSON.stringify(knockoutMatches, null, 2));
writeFileSync(
  resolve(dir, "official-kickoffs-utc.json"),
  JSON.stringify(officialKickoffs, null, 2)
);
writeFileSync(
  resolve(dir, "official-fifa-schedule-by-day.json"),
  JSON.stringify(scheduleByDay, null, 2)
);

console.log(
  `Generated ${TEAMS.length} teams, ${groupMatches.length} group matches, ${knockoutMatches.length} knockout matches, ${officialKickoffs.length} official kickoffs, ${Object.keys(scheduleByDay).length} schedule days.`
);
