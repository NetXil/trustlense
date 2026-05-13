import { RiskLevel, RiskSignal } from "../types";

export function scoreFromSignals(signals: RiskSignal[]): number {
  return signals.reduce((acc, s) => acc + Math.max(0, s.weight), 0);
}

export function levelFromScore(score: number): RiskLevel {
  if (score >= 14) return "critical";
  if (score >= 8) return "risky";
  if (score >= 3) return "review";
  return "safe";
}

export function aggregateLevel(scores: number[]): {
  level: RiskLevel;
  score: number;
} {
  if (scores.length === 0) return { level: "safe", score: 0 };
  const top = Math.max(...scores);
  const sumExtra = scores.reduce((a, b) => a + b, 0) - top;
  const score = top + Math.min(sumExtra * 0.15, 10);
  return { level: levelFromScore(score), score: Math.round(score) };
}

export function signal(
  id: string,
  label: string,
  weight: number,
  detail?: string,
): RiskSignal {
  return { id, label, weight, detail };
}

export const RISK_COPY: Record<RiskLevel, { label: string; description: string }> = {
  safe: {
    label: "Safe",
    description: "No notable risk signals detected.",
  },
  review: {
    label: "Needs Review",
    description: "A few signals worth confirming before fully trusting.",
  },
  risky: {
    label: "Risky",
    description: "Multiple signals — review before running in unknown workspaces.",
  },
  critical: {
    label: "Critical",
    description: "Strong indicators of high-impact capability or supply-chain risk.",
  },
};
