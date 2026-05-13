import { motion } from "framer-motion";
import { FolderTree, KeyRound, Plug, Puzzle } from "lucide-react";
import { ScanResult } from "../types";
import { HeroSummary } from "./HeroSummary";
import { StatsBar } from "./StatsBar";
import { Section } from "./Section";
import { ExtensionCard } from "./ExtensionCard";
import { MCPCard } from "./MCPCard";
import { WorkspaceCard } from "./WorkspaceCard";
import { SecretsCard } from "./SecretsCard";

interface Props {
  result: ScanResult;
}

export function Dashboard({ result }: Props) {
  const sortedExtensions = result.extensions;
  const noisyExtensions = sortedExtensions.filter((e) => e.level !== "safe");
  const safeExtensions = sortedExtensions.filter((e) => e.level === "safe");

  return (
    <motion.main
      key={result.summary.finishedAt}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-6xl px-6 pb-24 pt-8 sm:px-8"
    >
      <HeroSummary result={result} />
      <div className="mt-6">
        <StatsBar result={result} />
      </div>

      <Section
        title="Extensions"
        subtitle="Capability and supply-chain risk for installed VS Code extensions"
        count={result.extensions.length}
        icon={<Puzzle className="h-4 w-4" />}
      >
        {noisyExtensions.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {noisyExtensions.map((e, i) => (
              <ExtensionCard key={e.id} finding={e} index={i} />
            ))}
          </div>
        )}
        {safeExtensions.length > 0 && (
          <details className="group mt-4 rounded-xl border border-white/5 bg-white/[0.02]">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm text-ink-200 hover:text-white">
              Show {safeExtensions.length} routine extension
              {safeExtensions.length === 1 ? "" : "s"}
              <span className="text-ink-300"> ↓</span>
            </summary>
            <div className="grid gap-3 p-4 pt-0 md:grid-cols-2">
              {safeExtensions.map((e, i) => (
                <ExtensionCard key={e.id} finding={e} index={i} />
              ))}
            </div>
          </details>
        )}
        {result.extensions.length === 0 && (
          <div className="card p-5 text-sm text-ink-300">
            No third-party extensions scanned. Enable{" "}
            <code className="font-mono text-ink-100">
              trustlens.includeBuiltinExtensions
            </code>{" "}
            to inspect built-ins.
          </div>
        )}
      </Section>

      <Section
        title="MCP Servers"
        subtitle="Model Context Protocol configurations across VS Code, Cursor, Claude, and more"
        count={result.mcp.length}
        icon={<Plug className="h-4 w-4" />}
      >
        {result.mcp.length === 0 ? (
          <div className="card p-5 text-sm text-ink-300">
            No MCP configurations detected.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {result.mcp.map((m, i) => (
              <MCPCard key={m.id} finding={m} index={i} />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Workspace Automation"
        subtitle="Tasks, launch configs, devcontainer, npm scripts, and workspace overrides"
        count={result.workspace.length}
        icon={<FolderTree className="h-4 w-4" />}
      >
        {result.workspace.length === 0 ? (
          <div className="card p-5 text-sm text-ink-300">
            No risky workspace automation detected.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {result.workspace.map((w, i) => (
              <WorkspaceCard key={w.id} finding={w} index={i} />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Sensitive Locations"
        subtitle="Files in places your IDE process can read — contents never opened"
        count={result.secrets.length}
        icon={<KeyRound className="h-4 w-4" />}
      >
        <SecretsCard findings={result.secrets} />
      </Section>

      <footer className="mt-16 text-center text-xs text-ink-300">
        TrustLens scanned everything locally. Source code, file contents, and
        secrets stayed on your machine.
      </footer>
    </motion.main>
  );
}
