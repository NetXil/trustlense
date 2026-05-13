import { motion } from "framer-motion";
import { KeyRound } from "lucide-react";
import { SecretFinding } from "../types";

interface Props {
  findings: SecretFinding[];
}

export function SecretsCard({ findings }: Props) {
  if (!findings.length) {
    return (
      <div className="card p-5 text-sm text-ink-300">
        No secret-bearing locations detected near this workspace.
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="card overflow-hidden"
    >
      <div className="border-b border-white/5 p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-accent-400" />
          <h4 className="text-sm font-semibold text-white">
            Sensitive file locations
          </h4>
        </div>
        <p className="mt-1 text-xs text-ink-300">
          These files exist in locations your IDE process can read.{" "}
          <span className="text-ink-200">Their contents were never opened.</span>{" "}
          Review extensions and MCP servers before trusting unknown tools.
        </p>
      </div>
      <ul className="divide-y divide-white/5">
        {findings.map((f, i) => (
          <motion.li
            key={f.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: 0.03 * i }}
            className="flex items-center justify-between gap-3 p-4 hover:bg-white/[0.02]"
          >
            <div className="min-w-0">
              <div className="font-mono text-sm text-ink-100">{f.path}</div>
              <div className="text-xs text-ink-300">{f.description}</div>
            </div>
            <span className="chip border-white/10 text-ink-200 uppercase tracking-wide">
              {f.kind}
            </span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
