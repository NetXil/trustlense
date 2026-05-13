import { motion } from "framer-motion";
import { Download, FileJson, FileText, RefreshCw, Shield } from "lucide-react";
import { postToExtension } from "../api";

interface Props {
  scanning: boolean;
  hasResult: boolean;
}

export function Header({ scanning, hasResult }: Props) {
  return (
    <header className="relative overflow-hidden border-b border-white/5">
      <div className="absolute inset-0 bg-hero-glow opacity-90 pointer-events-none" />
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-8 py-7">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <div className="relative grid h-11 w-11 place-items-center rounded-2xl border border-accent-500/30 bg-accent-500/10 shadow-glow">
            <Shield className="h-5 w-5 text-accent-400" strokeWidth={2.2} />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-500/20 to-transparent" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">
              TrustLens
            </h1>
            <p className="text-xs text-ink-300">
              See what your AI-powered IDE can access.
            </p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            className="btn"
            disabled={!hasResult}
            onClick={() => postToExtension({ type: "exportMarkdown" })}
            title="Export Markdown report"
          >
            <FileText className="h-4 w-4" />
            <span>Markdown</span>
          </button>
          <button
            type="button"
            className="btn"
            disabled={!hasResult}
            onClick={() => postToExtension({ type: "exportJson" })}
            title="Export JSON report"
          >
            <FileJson className="h-4 w-4" />
            <span>JSON</span>
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={scanning}
            onClick={() => postToExtension({ type: "rescan" })}
          >
            <RefreshCw
              className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`}
            />
            <span>{scanning ? "Scanning…" : hasResult ? "Re-scan" : "Scan"}</span>
            {!scanning && hasResult && <Download className="h-3.5 w-3.5 opacity-0" />}
          </button>
        </motion.div>
      </div>
    </header>
  );
}
