import { motion } from "framer-motion";
import { Shield, Sparkles } from "lucide-react";
import { postToExtension } from "../api";

interface Props {
  scanning: boolean;
  phase: string;
  percent: number;
}

export function EmptyState({ scanning, phase, percent }: Props) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="card relative w-full max-w-xl overflow-hidden p-10 text-center"
      >
        <div className="absolute inset-x-0 -top-24 h-48 bg-hero-glow pointer-events-none" />
        <div className="relative">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.6, type: "spring" }}
            className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-accent-500/30 bg-accent-500/10 shadow-glow"
          >
            <Shield className="h-7 w-7 text-accent-400" strokeWidth={2} />
          </motion.div>
          <h2 className="mt-5 text-2xl font-semibold text-white">
            See what your AI-powered IDE can access.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-200">
            TrustLens scans your installed extensions, MCP servers, workspace
            automation, devcontainers, scripts, and secret-bearing files —
            then explains the risk in plain English. All locally.
          </p>

          {scanning ? (
            <div className="mt-7">
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent-500 to-accent-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(8, percent)}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-ink-200">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-accent-400" />
                <span>{phase || "Preparing scan…"}</span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn-primary mt-7"
              onClick={() => postToExtension({ type: "rescan" })}
            >
              <Sparkles className="h-4 w-4" />
              Scan my dev environment
            </button>
          )}

          <div className="mt-8 grid grid-cols-3 gap-2 text-[11px] text-ink-300">
            <div className="rounded-lg border border-white/5 bg-white/[0.02] py-2">
              <div className="text-ink-100 font-semibold">Local-first</div>
              <div>no uploads</div>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/[0.02] py-2">
              <div className="text-ink-100 font-semibold">Plain English</div>
              <div>not vague CVEs</div>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/[0.02] py-2">
              <div className="text-ink-100 font-semibold">All surfaces</div>
              <div>ext + MCP + workspace</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
