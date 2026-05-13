import { motion } from "framer-motion";
import { AlertTriangle, ChevronRight, Info } from "lucide-react";
import { RiskSignal } from "../types";

function weightColor(w: number): string {
  if (w >= 5) return "text-risk-critical";
  if (w >= 3) return "text-risk-risky";
  if (w >= 2) return "text-risk-review";
  return "text-ink-300";
}

function IconFor({ weight }: { weight: number }) {
  if (weight >= 3) return <AlertTriangle className="h-3.5 w-3.5" />;
  return <Info className="h-3.5 w-3.5" />;
}

interface Props {
  signals: RiskSignal[];
}

export function SignalList({ signals }: Props) {
  if (!signals.length) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-ink-300">
        No risk signals detected.
      </div>
    );
  }
  return (
    <ul className="space-y-1.5">
      {signals.map((s, i) => (
        <motion.li
          key={s.id + i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: 0.02 * i }}
          className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
        >
          <span className={`mt-0.5 ${weightColor(s.weight)}`}>
            <IconFor weight={s.weight} />
          </span>
          <span className="flex-1">
            <span className="text-sm text-ink-100">{s.label}</span>
            {s.detail && (
              <span className="mt-0.5 block break-all font-mono text-[11px] text-ink-300">
                {s.detail}
              </span>
            )}
          </span>
          <span className={`flex items-center gap-0.5 text-xs font-medium ${weightColor(s.weight)}`}>
            +{s.weight}
            <ChevronRight className="h-3 w-3 opacity-0" />
          </span>
        </motion.li>
      ))}
    </ul>
  );
}
