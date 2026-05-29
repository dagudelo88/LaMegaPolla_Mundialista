/**
 * One-time generator for data/fifa-2026/*.json from official WC 2026 draw.
 * Run: npx tsx scripts/generate-fifa-json.ts
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

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

/** [matchNum, home, away, group, round 1|2|3, kickoff UTC ISO, venue] */
const GROUP_MATCHES: [number, string, string, string, number, string, string][] = [
  [1, "MEX", "RSA", "A", 1, "2026-06-11T19:00:00Z", "Estadio Azteca, Ciudad de México"],
  [2, "KOR", "CZE", "A", 1, "2026-06-12T02:00:00Z", "Estadio Akron, Guadalajara"],
  [3, "CAN", "BIH", "B", 1, "2026-06-12T19:00:00Z", "BMO Field, Toronto"],
  [4, "USA", "PAR", "D", 1, "2026-06-13T01:00:00Z", "SoFi Stadium, Los Ángeles"],
  [5, "HAI", "SCO", "C", 1, "2026-06-14T01:00:00Z", "Gillette Stadium, Boston"],
  [6, "AUS", "TUR", "D", 1, "2026-06-13T04:00:00Z", "BC Place, Vancouver"],
  [7, "BRA", "MAR", "C", 1, "2026-06-13T22:00:00Z", "MetLife Stadium, Nueva York"],
  [8, "QAT", "SUI", "B", 1, "2026-06-13T19:00:00Z", "Levi's Stadium, Santa Clara"],
  [9, "CIV", "ECU", "E", 1, "2026-06-14T23:00:00Z", "Lincoln Financial Field, Filadelfia"],
  [10, "GER", "CUW", "E", 1, "2026-06-14T17:00:00Z", "NRG Stadium, Houston"],
  [11, "NED", "JPN", "F", 1, "2026-06-14T20:00:00Z", "AT&T Stadium, Dallas"],
  [12, "SWE", "TUN", "F", 1, "2026-06-15T02:00:00Z", "Estadio BBVA, Monterrey"],
  [13, "KSA", "URU", "H", 1, "2026-06-15T22:00:00Z", "Hard Rock Stadium, Miami"],
  [14, "ESP", "CPV", "H", 1, "2026-06-15T17:00:00Z", "Mercedes-Benz Stadium, Atlanta"],
  [15, "IRN", "NZL", "G", 1, "2026-06-16T01:00:00Z", "SoFi Stadium, Los Ángeles"],
  [16, "BEL", "EGY", "G", 1, "2026-06-15T20:00:00Z", "Lumen Field, Seattle"],
  [17, "FRA", "SEN", "I", 1, "2026-06-16T20:00:00Z", "MetLife Stadium, Nueva York"],
  [18, "IRQ", "NOR", "I", 1, "2026-06-16T23:00:00Z", "Gillette Stadium, Boston"],
  [19, "ARG", "ALG", "J", 1, "2026-06-17T02:00:00Z", "Arrowhead Stadium, Kansas City"],
  [20, "AUT", "JOR", "J", 1, "2026-06-17T04:00:00Z", "Levi's Stadium, Santa Clara"],
  [21, "GHA", "PAN", "L", 1, "2026-06-18T00:00:00Z", "BMO Field, Toronto"],
  [22, "ENG", "CRO", "L", 1, "2026-06-17T21:00:00Z", "AT&T Stadium, Dallas"],
  [23, "POR", "COD", "K", 1, "2026-06-17T18:00:00Z", "NRG Stadium, Houston"],
  [24, "UZB", "COL", "K", 1, "2026-06-18T02:00:00Z", "Estadio Azteca, Ciudad de México"],
  [25, "CZE", "RSA", "A", 2, "2026-06-18T17:00:00Z", "Mercedes-Benz Stadium, Atlanta"],
  [26, "SUI", "BIH", "B", 2, "2026-06-18T20:00:00Z", "SoFi Stadium, Los Ángeles"],
  [27, "CAN", "QAT", "B", 2, "2026-06-18T23:00:00Z", "BC Place, Vancouver"],
  [28, "MEX", "KOR", "A", 2, "2026-06-19T02:00:00Z", "Estadio Akron, Guadalajara"],
  [29, "BRA", "HAI", "C", 2, "2026-06-20T02:00:00Z", "Lincoln Financial Field, Filadelfia"],
  [30, "SCO", "MAR", "C", 2, "2026-06-19T23:00:00Z", "Gillette Stadium, Boston"],
  [31, "TUR", "PAR", "D", 2, "2026-06-20T03:00:00Z", "Levi's Stadium, Santa Clara"],
  [32, "USA", "AUS", "D", 2, "2026-06-19T20:00:00Z", "Lumen Field, Seattle"],
  [33, "GER", "CIV", "E", 2, "2026-06-20T21:00:00Z", "BMO Field, Toronto"],
  [34, "ECU", "CUW", "E", 2, "2026-06-21T01:00:00Z", "Arrowhead Stadium, Kansas City"],
  [35, "NED", "SWE", "F", 2, "2026-06-20T18:00:00Z", "NRG Stadium, Houston"],
  [36, "TUN", "JPN", "F", 2, "2026-06-21T05:00:00Z", "Estadio BBVA, Monterrey"],
  [37, "URU", "CPV", "H", 2, "2026-06-21T23:00:00Z", "Hard Rock Stadium, Miami"],
  [38, "ESP", "KSA", "H", 2, "2026-06-21T17:00:00Z", "Mercedes-Benz Stadium, Atlanta"],
  [39, "BEL", "IRN", "G", 2, "2026-06-21T20:00:00Z", "SoFi Stadium, Los Ángeles"],
  [40, "NZL", "EGY", "G", 2, "2026-06-22T02:00:00Z", "BC Place, Vancouver"],
  [41, "NOR", "SEN", "I", 2, "2026-06-23T01:00:00Z", "MetLife Stadium, Nueva York"],
  [42, "FRA", "IRQ", "I", 2, "2026-06-22T22:00:00Z", "Lincoln Financial Field, Filadelfia"],
  [43, "ARG", "AUT", "J", 2, "2026-06-22T17:00:00Z", "AT&T Stadium, Dallas"],
  [44, "JOR", "ALG", "J", 2, "2026-06-23T03:00:00Z", "Levi's Stadium, Santa Clara"],
  [45, "ENG", "GHA", "L", 2, "2026-06-23T21:00:00Z", "Gillette Stadium, Boston"],
  [46, "PAN", "CRO", "L", 2, "2026-06-24T00:00:00Z", "BMO Field, Toronto"],
  [47, "POR", "UZB", "K", 2, "2026-06-23T18:00:00Z", "NRG Stadium, Houston"],
  [48, "COL", "COD", "K", 2, "2026-06-24T03:00:00Z", "Estadio Akron, Guadalajara"],
  [49, "SCO", "BRA", "C", 3, "2026-06-24T23:00:00Z", "Hard Rock Stadium, Miami"],
  [50, "MAR", "HAI", "C", 3, "2026-06-24T23:00:00Z", "Mercedes-Benz Stadium, Atlanta"],
  [51, "SUI", "CAN", "B", 3, "2026-06-24T20:00:00Z", "BC Place, Vancouver"],
  [52, "BIH", "QAT", "B", 3, "2026-06-24T20:00:00Z", "Lumen Field, Seattle"],
  [53, "CZE", "MEX", "A", 3, "2026-06-25T02:00:00Z", "Estadio Azteca, Ciudad de México"],
  [54, "RSA", "KOR", "A", 3, "2026-06-25T02:00:00Z", "Estadio BBVA, Monterrey"],
  [55, "CUW", "CIV", "E", 3, "2026-06-25T21:00:00Z", "Lincoln Financial Field, Filadelfia"],
  [56, "ECU", "GER", "E", 3, "2026-06-25T21:00:00Z", "MetLife Stadium, Nueva York"],
  [57, "JPN", "SWE", "F", 3, "2026-06-26T00:00:00Z", "AT&T Stadium, Dallas"],
  [58, "TUN", "NED", "F", 3, "2026-06-26T00:00:00Z", "Arrowhead Stadium, Kansas City"],
  [59, "TUR", "USA", "D", 3, "2026-06-26T03:00:00Z", "SoFi Stadium, Los Ángeles"],
  [60, "PAR", "AUS", "D", 3, "2026-06-26T03:00:00Z", "Levi's Stadium, Santa Clara"],
  [61, "NOR", "FRA", "I", 3, "2026-06-26T20:00:00Z", "Gillette Stadium, Boston"],
  [62, "SEN", "IRQ", "I", 3, "2026-06-26T20:00:00Z", "BMO Field, Toronto"],
  [63, "EGY", "IRN", "G", 3, "2026-06-27T04:00:00Z", "Lumen Field, Seattle"],
  [64, "NZL", "BEL", "G", 3, "2026-06-27T04:00:00Z", "BC Place, Vancouver"],
  [65, "CPV", "KSA", "H", 3, "2026-06-27T01:00:00Z", "NRG Stadium, Houston"],
  [66, "URU", "ESP", "H", 3, "2026-06-27T01:00:00Z", "Estadio Akron, Guadalajara"],
  [67, "PAN", "ENG", "L", 3, "2026-06-27T22:00:00Z", "MetLife Stadium, Nueva York"],
  [68, "CRO", "GHA", "L", 3, "2026-06-27T22:00:00Z", "Lincoln Financial Field, Filadelfia"],
  [69, "ALG", "AUT", "J", 3, "2026-06-28T03:00:00Z", "Arrowhead Stadium, Kansas City"],
  [70, "JOR", "ARG", "J", 3, "2026-06-28T03:00:00Z", "AT&T Stadium, Dallas"],
  [71, "COL", "POR", "K", 3, "2026-06-28T00:30:00Z", "Hard Rock Stadium, Miami"],
  [72, "COD", "UZB", "K", 3, "2026-06-28T00:30:00Z", "Mercedes-Benz Stadium, Atlanta"],
];

type Slot =
  | { type: "group_rank"; group: string; rank: number }
  | { type: "third_best"; eligible_groups: string[] }
  | { type: "match_winner"; match_number: number }
  | { type: "match_loser"; match_number: number };

const KNOCKOUT: {
  fifa_match_number: number;
  phase: string;
  kickoff_at: string;
  venue: string;
  home_source: Slot;
  away_source: Slot;
}[] = [
  { fifa_match_number: 73, phase: "round_of_32", kickoff_at: "2026-06-28T20:00:00Z", venue: "SoFi Stadium, Los Ángeles", home_source: { type: "group_rank", group: "A", rank: 2 }, away_source: { type: "group_rank", group: "B", rank: 2 } },
  { fifa_match_number: 74, phase: "round_of_32", kickoff_at: "2026-06-29T21:30:00Z", venue: "Gillette Stadium, Boston", home_source: { type: "group_rank", group: "E", rank: 1 }, away_source: { type: "third_best", eligible_groups: ["A", "B", "C", "D", "F"] } },
  { fifa_match_number: 75, phase: "round_of_32", kickoff_at: "2026-06-30T02:00:00Z", venue: "Estadio BBVA, Monterrey", home_source: { type: "group_rank", group: "F", rank: 1 }, away_source: { type: "group_rank", group: "C", rank: 2 } },
  { fifa_match_number: 76, phase: "round_of_32", kickoff_at: "2026-06-29T18:00:00Z", venue: "NRG Stadium, Houston", home_source: { type: "group_rank", group: "C", rank: 1 }, away_source: { type: "group_rank", group: "F", rank: 2 } },
  { fifa_match_number: 77, phase: "round_of_32", kickoff_at: "2026-06-30T22:00:00Z", venue: "MetLife Stadium, Nueva York", home_source: { type: "group_rank", group: "I", rank: 1 }, away_source: { type: "third_best", eligible_groups: ["C", "D", "F", "G", "H"] } },
  { fifa_match_number: 78, phase: "round_of_32", kickoff_at: "2026-06-30T18:00:00Z", venue: "AT&T Stadium, Dallas", home_source: { type: "group_rank", group: "E", rank: 2 }, away_source: { type: "group_rank", group: "I", rank: 2 } },
  { fifa_match_number: 79, phase: "round_of_32", kickoff_at: "2026-07-01T02:00:00Z", venue: "Estadio Azteca, Ciudad de México", home_source: { type: "group_rank", group: "A", rank: 1 }, away_source: { type: "third_best", eligible_groups: ["C", "E", "F", "H", "I"] } },
  { fifa_match_number: 80, phase: "round_of_32", kickoff_at: "2026-07-01T17:00:00Z", venue: "Mercedes-Benz Stadium, Atlanta", home_source: { type: "group_rank", group: "L", rank: 1 }, away_source: { type: "third_best", eligible_groups: ["E", "H", "I", "J", "K"] } },
  { fifa_match_number: 81, phase: "round_of_32", kickoff_at: "2026-07-02T01:00:00Z", venue: "Levi's Stadium, Santa Clara", home_source: { type: "group_rank", group: "D", rank: 1 }, away_source: { type: "third_best", eligible_groups: ["B", "E", "F", "I", "J"] } },
  { fifa_match_number: 82, phase: "round_of_32", kickoff_at: "2026-07-01T21:00:00Z", venue: "Lumen Field, Seattle", home_source: { type: "group_rank", group: "G", rank: 1 }, away_source: { type: "third_best", eligible_groups: ["A", "E", "H", "I", "J"] } },
  { fifa_match_number: 83, phase: "round_of_32", kickoff_at: "2026-07-03T00:00:00Z", venue: "BMO Field, Toronto", home_source: { type: "group_rank", group: "K", rank: 2 }, away_source: { type: "group_rank", group: "L", rank: 2 } },
  { fifa_match_number: 84, phase: "round_of_32", kickoff_at: "2026-07-02T20:00:00Z", venue: "SoFi Stadium, Los Ángeles", home_source: { type: "group_rank", group: "H", rank: 1 }, away_source: { type: "group_rank", group: "J", rank: 2 } },
  { fifa_match_number: 85, phase: "round_of_32", kickoff_at: "2026-07-03T04:00:00Z", venue: "BC Place, Vancouver", home_source: { type: "group_rank", group: "B", rank: 1 }, away_source: { type: "third_best", eligible_groups: ["E", "F", "G", "I", "J"] } },
  { fifa_match_number: 86, phase: "round_of_32", kickoff_at: "2026-07-03T23:00:00Z", venue: "Hard Rock Stadium, Miami", home_source: { type: "group_rank", group: "J", rank: 1 }, away_source: { type: "group_rank", group: "H", rank: 2 } },
  { fifa_match_number: 87, phase: "round_of_32", kickoff_at: "2026-07-04T02:30:00Z", venue: "Arrowhead Stadium, Kansas City", home_source: { type: "group_rank", group: "K", rank: 1 }, away_source: { type: "third_best", eligible_groups: ["D", "E", "I", "J", "L"] } },
  { fifa_match_number: 88, phase: "round_of_32", kickoff_at: "2026-07-03T19:00:00Z", venue: "AT&T Stadium, Dallas", home_source: { type: "group_rank", group: "D", rank: 2 }, away_source: { type: "group_rank", group: "G", rank: 2 } },
  { fifa_match_number: 89, phase: "round_of_16", kickoff_at: "2026-07-04T22:00:00Z", venue: "Lincoln Financial Field, Filadelfia", home_source: { type: "match_winner", match_number: 74 }, away_source: { type: "match_winner", match_number: 77 } },
  { fifa_match_number: 90, phase: "round_of_16", kickoff_at: "2026-07-04T18:00:00Z", venue: "NRG Stadium, Houston", home_source: { type: "match_winner", match_number: 73 }, away_source: { type: "match_winner", match_number: 75 } },
  { fifa_match_number: 91, phase: "round_of_16", kickoff_at: "2026-07-05T21:00:00Z", venue: "MetLife Stadium, Nueva York", home_source: { type: "match_winner", match_number: 76 }, away_source: { type: "match_winner", match_number: 78 } },
  { fifa_match_number: 92, phase: "round_of_16", kickoff_at: "2026-07-06T01:00:00Z", venue: "Estadio Azteca, Ciudad de México", home_source: { type: "match_winner", match_number: 79 }, away_source: { type: "match_winner", match_number: 80 } },
  { fifa_match_number: 93, phase: "round_of_16", kickoff_at: "2026-07-06T20:00:00Z", venue: "AT&T Stadium, Dallas", home_source: { type: "match_winner", match_number: 83 }, away_source: { type: "match_winner", match_number: 84 } },
  { fifa_match_number: 94, phase: "round_of_16", kickoff_at: "2026-07-07T01:00:00Z", venue: "Lumen Field, Seattle", home_source: { type: "match_winner", match_number: 81 }, away_source: { type: "match_winner", match_number: 82 } },
  { fifa_match_number: 95, phase: "round_of_16", kickoff_at: "2026-07-07T17:00:00Z", venue: "Mercedes-Benz Stadium, Atlanta", home_source: { type: "match_winner", match_number: 86 }, away_source: { type: "match_winner", match_number: 88 } },
  { fifa_match_number: 96, phase: "round_of_16", kickoff_at: "2026-07-07T20:00:00Z", venue: "BC Place, Vancouver", home_source: { type: "match_winner", match_number: 85 }, away_source: { type: "match_winner", match_number: 87 } },
  { fifa_match_number: 97, phase: "quarter_final", kickoff_at: "2026-07-09T21:00:00Z", venue: "Gillette Stadium, Boston", home_source: { type: "match_winner", match_number: 89 }, away_source: { type: "match_winner", match_number: 90 } },
  { fifa_match_number: 98, phase: "quarter_final", kickoff_at: "2026-07-10T20:00:00Z", venue: "SoFi Stadium, Los Ángeles", home_source: { type: "match_winner", match_number: 93 }, away_source: { type: "match_winner", match_number: 94 } },
  { fifa_match_number: 99, phase: "quarter_final", kickoff_at: "2026-07-11T22:00:00Z", venue: "Hard Rock Stadium, Miami", home_source: { type: "match_winner", match_number: 91 }, away_source: { type: "match_winner", match_number: 92 } },
  { fifa_match_number: 100, phase: "quarter_final", kickoff_at: "2026-07-12T02:00:00Z", venue: "Arrowhead Stadium, Kansas City", home_source: { type: "match_winner", match_number: 95 }, away_source: { type: "match_winner", match_number: 96 } },
  { fifa_match_number: 101, phase: "semi_final", kickoff_at: "2026-07-14T20:00:00Z", venue: "AT&T Stadium, Dallas", home_source: { type: "match_winner", match_number: 97 }, away_source: { type: "match_winner", match_number: 98 } },
  { fifa_match_number: 102, phase: "semi_final", kickoff_at: "2026-07-15T20:00:00Z", venue: "Mercedes-Benz Stadium, Atlanta", home_source: { type: "match_winner", match_number: 99 }, away_source: { type: "match_winner", match_number: 100 } },
  { fifa_match_number: 103, phase: "third_place", kickoff_at: "2026-07-18T22:00:00Z", venue: "Hard Rock Stadium, Miami", home_source: { type: "match_loser", match_number: 101 }, away_source: { type: "match_loser", match_number: 102 } },
  { fifa_match_number: 104, phase: "final", kickoff_at: "2026-07-19T20:00:00Z", venue: "MetLife Stadium, Nueva York", home_source: { type: "match_winner", match_number: 101 }, away_source: { type: "match_winner", match_number: 102 } },
];

const dir = resolve(process.cwd(), "data/fifa-2026");
mkdirSync(dir, { recursive: true });

writeFileSync(resolve(dir, "teams.json"), JSON.stringify(TEAMS, null, 2));

const groupMatches = GROUP_MATCHES.map(([num, home, away, group, round, kickoff, venue]) => ({
  fifa_match_number: num,
  group_letter: group,
  home_code: home,
  away_code: away,
  matchday_key: `group_${group}_r${round}`,
  kickoff_at: kickoff,
  venue,
}));

writeFileSync(resolve(dir, "group-matches.json"), JSON.stringify(groupMatches, null, 2));
writeFileSync(resolve(dir, "knockout-matches.json"), JSON.stringify(KNOCKOUT, null, 2));

console.log(`Generated ${TEAMS.length} teams, ${groupMatches.length} group matches, ${KNOCKOUT.length} knockout matches.`);
