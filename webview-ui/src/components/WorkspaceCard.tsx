import { motion, AnimatePresence } from "framer-motion";
import { FileCode, FolderOpen } from "lucide-react";
import { useState } from "react";
import { postToExtension } from "../api";
import { WorkspaceFinding } from "../types";
import { RiskBadge } from "./RiskBadge";
import { SignalList } from "./SignalList";

interface Props {
  finding: WorkspaceFinding;
  index: number;
}

export function WorkspaceCard({ finding, index }: Props) {
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
              <FolderOpen className="h-4 w-4 text-accent-400" />
              <h4 className="truncate text-sm font-semibold text-white">
                {finding.title}
              </h4>
              <RiskBadge level={finding.level} size="sm" />
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                postToExtension({ type: "openFile", path: finding.file });
              }}
              className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs text-ink-300 underline-offset-2 hover:text-accent-400 hover:underline"
            >
              <FileCode className="h-3 w-3" />
              {finding.file}
            </button>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-white/5 bg-black/30 p-3 font-mono text-[11px] leading-relaxed text-ink-100">
              {finding.detail.length > 600
                ? finding.detail.slice(0, 600) + "\n…"
                : finding.detail}
            </pre>
          </div>
          <div className="grid place-items-center rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1 text-xs font-medium text-ink-200 tabular-nums">
            {finding.score}
          </div>
        </div>
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
