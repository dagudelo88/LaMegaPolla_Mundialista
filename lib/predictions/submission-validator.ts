import { REQUIRED_THIRD_PLACE_COUNT, validateThirdPlaceSelection } from "@/lib/bracket/third-place-advancement";
import type { PredictionScore } from "@/lib/bracket/types";

export interface SubmissionValidationInput {
  globalDeadline: string;
  now?: Date;
  alreadySubmitted: boolean;
  groupPredictions: PredictionScore[];
  knockoutPredictions: PredictionScore[];
  advancingThirdGroups: string[];
  expectedGroupCount?: number;
  expectedKnockoutCount?: number;
}

export interface SubmissionValidationResult {
  valid: boolean;
  errors: string[];
}

function isCompleteScore(h: number | undefined, a: number | undefined): boolean {
  return (
    h != null &&
    a != null &&
    Number.isInteger(h) &&
    Number.isInteger(a) &&
    h >= 0 &&
    h <= 20 &&
    a >= 0 &&
    a <= 20
  );
}

export function validateFullSubmission(
  input: SubmissionValidationInput,
  options?: { skipDeadlineCheck?: boolean }
): SubmissionValidationResult {
  const errors: string[] = [];
  const now = input.now ?? new Date();
  const expectedGroup = input.expectedGroupCount ?? 72;
  const expectedKnockout = input.expectedKnockoutCount ?? 32;

  if (input.alreadySubmitted) {
    errors.push("already_submitted");
  }

  if (!options?.skipDeadlineCheck && now >= new Date(input.globalDeadline)) {
    errors.push("deadline_passed");
  }

  if (input.groupPredictions.length < expectedGroup) {
    errors.push(`group_incomplete:${input.groupPredictions.length}/${expectedGroup}`);
  }

  for (const p of input.groupPredictions) {
    if (!isCompleteScore(p.predictedHome, p.predictedAway)) {
      errors.push(`group_invalid:${p.matchNumber}`);
    }
  }

  const thirdCheck = validateThirdPlaceSelection(input.advancingThirdGroups);
  if (!thirdCheck.valid && thirdCheck.error) {
    errors.push(thirdCheck.error);
  }

  if (input.knockoutPredictions.length < expectedKnockout) {
    errors.push(`knockout_incomplete:${input.knockoutPredictions.length}/${expectedKnockout}`);
  }

  for (const p of input.knockoutPredictions) {
    if (!isCompleteScore(p.predictedHome, p.predictedAway)) {
      errors.push(`knockout_invalid:${p.matchNumber}`);
    }
    if (
      p.predictedHome === p.predictedAway &&
      (p.predictedAdvancesTeamId == null || p.predictedAdvancesTeamId === undefined)
    ) {
      errors.push(`knockout_missing_advance:${p.matchNumber}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export { REQUIRED_THIRD_PLACE_COUNT };
