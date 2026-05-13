import { motion } from "framer-motion";
import { Activity, Clock } from "lucide-react";
import { ScanResult } from "../types";
import { RISK_META } from "../risk";
import { ScoreRing } from "./ScoreRing";

interface Props {
  result: ScanResult;
}

export function HeroSummary({ result }: Props) {
  const meta = RISK_META[result.summary.overall];
  const finished = new Date(result.summary.finishedAt);
  const timeAgo = formatRelative(finished);

  const headline =
    result.summary.overall === "safe"
      ? "Your environment looks routine."
      : result.summary.overall === "review"
        ? "A few things to confirm before granting trust."
        : result.summary.overall === "risky"
          ? "Several tools have notable capability — review them."
          : "Strong indicators of high-impact capability. Investigate now.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="card relative overflow-hidden p-6 sm:p-8"
    >
      <div
        className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full opacity-50 blur-3xl"
        style={{
          background:
            result.summary.overall === "safe"
              ? "radial-gradient(circle, rgba(61,220,151,0.25), transparent 70%)"
              : result.summary.overall === "review"
                ? "radial-gradient(circle, rgba(250,204,21,0.22), transparent 70%)"
                : result.summary.overall === "risky"
                  ? "radial-gradient(circle, rgba(251,146,60,0.28), transparent 70%)"
                  : "radial-gradient(circle, rgba(244,63,94,0.32), transparent 70%)",
        }}
      />
      <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <div
            className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${meta.bg} ${meta.border} ${meta.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            Overall: {meta.label}
          </div>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            {headline}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-200">
            {meta.description} TrustLens looked at extensions, MCP servers,
            workspace automation, devcontainers, and secret-bearing locations
            on your machine — all locally.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ink-300">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> {timeAgo}
            </span>
            <span className="text-ink-500">•</span>
            <span className="inline-flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" /> {result.summary.durationMs}ms
            </span>
            {result.summary.workspaceFolder && (
              <>
                <span className="text-ink-500">•</span>
                <span className="font-mono text-[11px] text-ink-300">
                  {compactPath(result.summary.workspaceFolder)}
                </span>
              </>
            )}
          </div>
        </div>
        <ScoreRing
          level={result.summary.overall}
          score={result.summary.overallScore}
          size={148}
        />
      </div>
    </motion.div>
  );
}

function compactPath(p: string): string {
  const home = "/Users/";
  if (p.startsWith(home)) {
    const rest = p.slice(home.length).split("/").slice(1).join("/");
    return `~/${rest}`;
  }
  return p;
}

function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  const m = Math.round(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return d.toLocaleDateString();
}
