import { motion, AnimatePresence } from "framer-motion";
import {
  Boxes,
  Cpu,
  ExternalLink,
  EyeOff,
  Globe,
  HardDrive,
  Terminal,
} from "lucide-react";
import { useState } from "react";
import { postToExtension } from "../api";
import { ExtensionFinding } from "../types";
import { RiskBadge } from "./RiskBadge";
import { SignalList } from "./SignalList";

interface Props {
  finding: ExtensionFinding;
  index: number;
}

function Capability({
  active,
  icon: Icon,
  label,
}: {
  active: boolean;
  icon: typeof Globe;
  label: string;
}) {
  return (
    <span
      className={`chip ${
        active ? "border-white/15 text-ink-50" : "opacity-50"
      }`}
      title={label}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export function ExtensionCard({ finding, index }: Props) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.03, ease: [0.22, 1, 0.36, 1] }}
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
              <h4 className="truncate text-sm font-semibold text-white">
                {finding.displayName}
              </h4>
              <RiskBadge level={finding.level} size="sm" />
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-ink-300">
              <span className="font-mono">{finding.id}</span>
              <span className="text-ink-500">·</span>
              <span>v{finding.version}</span>
              <span className="text-ink-500">·</span>
              <span>{finding.publisher}</span>
            </div>
            <p className="mt-3 text-sm text-ink-200">{finding.summary}</p>
          </div>
          <div className="grid place-items-center rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1 text-xs font-medium text-ink-200 tabular-nums">
            {finding.score}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Capability active={finding.usesChildProcess} icon={Terminal} label="Shell" />
          <Capability active={finding.usesNetwork} icon={Globe} label="Network" />
          <Capability active={finding.usesFsAccess} icon={HardDrive} label="Files" />
          <Capability active={finding.hasNativeBinary} icon={Cpu} label="Native" />
          <Capability active={finding.containsObfuscatedCode} icon={EyeOff} label="Obfuscated" />
          <Capability
            active={finding.activationEvents.includes("*") || finding.activationEvents.includes("onStartupFinished")}
            icon={Boxes}
            label="Auto-activates"
          />
          {finding.repository && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                postToExtension({ type: "openExternal", url: finding.repository! });
              }}
              className="chip border-white/10 text-ink-100 hover:bg-white/[0.05]"
            >
              <ExternalLink className="h-3 w-3" />
              Repo
            </button>
          )}
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
