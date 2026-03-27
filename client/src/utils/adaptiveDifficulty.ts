// utils/adaptiveDifficulty.ts

export type DifficultyLevel = "Easy" | "Moderate" | "Hard";

export interface AbilityScore {
  theta: number;        // 0.0 to 1.0
  streak: number;
  total_seen: number;
  total_correct: number;
}

// ── Theta → difficulty mapping ──────────────────────────────────────────────
export function getDifficultyFromTheta(theta: number): DifficultyLevel {
  if (theta < 0.40) return "Easy";
  if (theta < 0.70) return "Moderate";
  return "Hard";
}

// ── Recompute theta after each answer ───────────────────────────────────────
export function updateTheta(
  current: AbilityScore,
  wasCorrect: boolean,
  wasSkipped: boolean,
  timeSpentSeconds: number,
  questionDifficulty: DifficultyLevel
): AbilityScore {
  const difficultyWeight = { Easy: 0.8, Moderate: 1.0, Hard: 1.3 };
  const weight = difficultyWeight[questionDifficulty];

  // learning rate — harder questions move theta more
  const lr = 0.08 * weight;

  let delta = 0;

  if (wasSkipped) {
    delta = -0.04;                    // small penalty for skipping
  } else if (wasCorrect) {
    delta = lr;
    // speed bonus — answered quickly on a hard question
    if (timeSpentSeconds < 30 && questionDifficulty === "Hard") {
      delta += 0.02;
    }
  } else {
    delta = -(lr * 0.8);              // wrong answer drops theta
  }

  const newTheta = Math.min(1.0, Math.max(0.0, current.theta + delta));
  const newStreak = wasCorrect ? current.streak + 1 : 0;

  return {
    theta: parseFloat(newTheta.toFixed(4)),
    streak: newStreak,
    total_seen: current.total_seen + (wasSkipped ? 0 : 1),
    total_correct: current.total_correct + (wasCorrect ? 1 : 0),
  };
}

// ── Live session adjustment — called after every answer ────────────────────
export function getLiveAdjustedDifficulty(
  baseTheta: number,
  sessionCorrect: number,
  sessionWrong: number,
  currentDifficulty: DifficultyLevel
): DifficultyLevel {
  const levels: DifficultyLevel[] = ["Easy", "Moderate", "Hard"];
  const currentIdx = levels.indexOf(currentDifficulty);

  // 3 consecutive correct → bump up
  if (sessionCorrect >= 3 && currentIdx < 2) {
    return levels[currentIdx + 1];
  }

  // 2 consecutive wrong → drop down
  if (sessionWrong >= 2 && currentIdx > 0) {
    return levels[currentIdx - 1];
  }

  return currentDifficulty;
}
