import { getConfig, getConfigNumber } from "@/lib/config/get-config";
import type { MatchPhase } from "@/lib/scoring/calculate-match-points";

const KNOCKOUT_PHASES: MatchPhase[] = [
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
];

/** REGLAS §5 — cost from app_config */
export async function getPaidChangeCost(phase: MatchPhase): Promise<number> {
  const groupCost = await getConfigNumber("changes.cost.group", 3);
  const knockoutCost = await getConfigNumber("changes.cost.knockout", 9);
  const fromPhase = (await getConfig<string>("changes.knockout_from_phase"));

  const knockoutFrom =
    fromPhase === "round_of_32"
      ? (["round_of_32", ...KNOCKOUT_PHASES] as MatchPhase[])
      : KNOCKOUT_PHASES;

  if (phase === "group_stage") return groupCost;
  if (knockoutFrom.includes(phase)) return knockoutCost;
  return groupCost;
}
