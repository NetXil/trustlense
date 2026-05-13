import { motion, AnimatePresence } from "framer-motion";
import { Lock, Pin, Server, Unlock } from "lucide-react";
import { useState } from "react";
import { MCPFinding } from "../types";
import { RiskBadge } from "./RiskBadge";
import { SignalList } from "./SignalList";

interface Props {
  finding: MCPFinding;
  index: number;
}

export function MCPCard({ finding, index }: Props) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="card card-hover overflow-hidden"
    >
      <button
        type="button"
        className="block w-full p-5 text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-accent-400" />
              <h4 className="truncate text-sm font-semibold text-white">
                {finding.serverName}
              </h4>
              <RiskBadge level={finding.level} size="sm" />
            </div>
            <div className="mt-1 text-xs text-ink-300">{finding.source}</div>
            <div className="mt-3 overflow-x-auto rounded-lg border border-white/5 bg-black/30 p-3">
              <code className="text-xs text-ink-100">
                <span className="text-accent-400">{finding.command}</span>{" "}
                <span className="text-ink-200">{finding.args.join(" ")}</span>
              </code>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="grid place-items-center rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1 text-xs font-medium text-ink-200 tabular-nums">
              {finding.score}
            </div>
            {finding.pinned ? (
              <span className="chip text-risk-safe" title="Version pinned">
                <Pin className="h-3 w-3" /> pinned
              </span>
            ) : (
              <span className="chip text-risk-review" title="Unpinned package">
                <Unlock className="h-3 w-3" /> unpinned
              </span>
            )}
          </div>
        </div>
        {finding.envKeys.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-ink-300">env:</span>
            {finding.envKeys.map((k) => (
              <span key={k} className="chip">
                <Lock className="h-3 w-3 opacity-60" /> {k}
              </span>
            ))}
          </div>
        )}
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="border-t border-white/5 bg-black/20"
          >
            <div className="space-y-4 p-5">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-300">
                  Risk signals
                </div>
                <SignalList signals={finding.signals} />
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-300">
                  Recommendation
                </div>
                <p className="rounded-lg border border-accent-500/20 bg-accent-500/[0.06] p-3 text-sm text-ink-100">
                  {finding.recommendation}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
