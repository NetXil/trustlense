import { RiskLevel } from "./types";

export const RISK_META: Record<
  RiskLevel,
  {
    label: string;
    bg: string;
    border: string;
    text: string;
    dot: string;
    stroke: string;
    glow: string;
    description: string;
  }
> = {
  safe: {
    label: "Safe",
    bg: "bg-risk-safe/10",
    border: "border-risk-safe/30",
    text: "text-risk-safe",
    dot: "bg-risk-safe",
    stroke: "stroke-risk-safe",
    glow: "shadow-[0_0_24px_-4px_rgba(61,220,151,0.4)]",
    description: "No notable risk signals detected.",
  },
  review: {
    label: "Needs Review",
    bg: "bg-risk-review/10",
    border: "border-risk-review/30",
    text: "text-risk-review",
    dot: "bg-risk-review",
    stroke: "stroke-risk-review",
    glow: "shadow-[0_0_24px_-4px_rgba(250,204,21,0.45)]",
    description: "A few signals worth confirming before fully trusting.",
  },
  risky: {
    label: "Risky",
    bg: "bg-risk-risky/10",
    border: "border-risk-risky/30",
    text: "text-risk-risky",
    dot: "bg-risk-risky",
    stroke: "stroke-risk-risky",
    glow: "shadow-[0_0_28px_-4px_rgba(251,146,60,0.5)]",
    description: "Multiple signals — review before granting trust.",
  },
  critical: {
    label: "Critical",
    bg: "bg-risk-critical/10",
    border: "border-risk-critical/30",
    text: "text-risk-critical",
    dot: "bg-risk-critical",
    stroke: "stroke-risk-critical",
    glow: "shadow-[0_0_32px_-4px_rgba(244,63,94,0.55)]",
    description: "Strong indicators of high-impact capability.",
  },
};

export function compareLevel(a: RiskLevel, b: RiskLevel): number {
  const order: RiskLevel[] = ["critical", "risky", "review", "safe"];
  return order.indexOf(a) - order.indexOf(b);
}
