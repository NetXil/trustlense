import { motion } from "framer-motion";
import { Folder, KeyRound, Plug, Puzzle } from "lucide-react";
import { ScanResult } from "../types";

interface Props {
  result: ScanResult;
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  index,
}: {
  icon: typeof Folder;
  label: string;
  value: number;
  sub?: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.08 * index, ease: [0.22, 1, 0.36, 1] }}
      className="card card-hover p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-300">{label}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-white tabular-nums">
              {value}
            </span>
            {sub && <span className="text-xs text-ink-300">{sub}</span>}
          </div>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/5 bg-white/[0.03]">
          <Icon className="h-4 w-4 text-accent-400" strokeWidth={2} />
        </div>
      </div>
    </motion.div>
  );
}

export function StatsBar({ result }: Props) {
  const c = result.summary.counts;
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Stat
        icon={Puzzle}
        label="Extensions"
        value={c.extensions}
        sub={c.extensionsRisky ? `${c.extensionsRisky} risky` : "all clear"}
        index={0}
      />
      <Stat
        icon={Plug}
        label="MCP Servers"
        value={c.mcpServers}
        sub={c.mcpRisky ? `${c.mcpRisky} risky` : c.mcpServers ? "all clear" : "none configured"}
        index={1}
      />
      <Stat
        icon={Folder}
        label="Workspace Files"
        value={c.workspaceItems}
        sub={c.workspaceRisky ? `${c.workspaceRisky} risky` : c.workspaceItems ? "all clear" : "no automation"}
        index={2}
      />
      <Stat
        icon={KeyRound}
        label="Secret Locations"
        value={c.secrets}
        sub={c.secrets ? "credentials nearby" : "none detected"}
        index={3}
      />
    </div>
  );
}
