import { RISK_COPY } from "../risk/engine";
import { RiskLevel, ScanResult } from "../types";

const ICON: Record<RiskLevel, string> = {
  safe: "🟢",
  review: "🟡",
  risky: "🟠",
  critical: "🔴",
};

function header(text: string, depth = 2) {
  return `${"#".repeat(depth)} ${text}`;
}

export function toMarkdown(result: ScanResult): string {
  const { summary, extensions, workspace, mcp, secrets } = result;
  const lines: string[] = [];

  lines.push("# TrustLens Scan Report");
  lines.push("");
  lines.push(
    `_Generated at ${summary.finishedAt} • took ${summary.durationMs}ms_`,
  );
  lines.push("");
  lines.push(
    `**Overall status:** ${ICON[summary.overall]} ${RISK_COPY[summary.overall].label} _(score ${summary.overallScore})_`,
  );
  lines.push("");
  lines.push(header("Summary"));
  lines.push("");
  lines.push("| Category | Count | Risky |");
  lines.push("|---|---|---|");
  lines.push(`| Extensions | ${summary.counts.extensions} | ${summary.counts.extensionsRisky} |`);
  lines.push(`| MCP servers | ${summary.counts.mcpServers} | ${summary.counts.mcpRisky} |`);
  lines.push(
    `| Workspace items | ${summary.counts.workspaceItems} | ${summary.counts.workspaceRisky} |`,
  );
  lines.push(`| Sensitive locations | ${summary.counts.secrets} | — |`);
  lines.push("");

  if (extensions.length) {
    lines.push(header("Extensions"));
    for (const e of extensions) {
      lines.push("");
      lines.push(`### ${ICON[e.level]} ${e.displayName} \`${e.id}\``);
      lines.push(
        `_${RISK_COPY[e.level].label} • score ${e.score} • v${e.version} • publisher ${e.publisher}_`,
      );
      lines.push("");
      lines.push(e.summary);
      if (e.signals.length) {
        lines.push("");
        lines.push("**Signals:**");
        for (const s of e.signals) {
          lines.push(`- ${s.label}${s.detail ? ` — ${s.detail}` : ""} _(weight ${s.weight})_`);
        }
      }
      lines.push("");
      lines.push(`**Recommendation:** ${e.recommendation}`);
    }
  }

  if (mcp.length) {
    lines.push("");
    lines.push(header("MCP Servers"));
    for (const m of mcp) {
      lines.push("");
      lines.push(`### ${ICON[m.level]} ${m.serverName}`);
      lines.push(`_${m.source} • ${RISK_COPY[m.level].label} • score ${m.score}_`);
      lines.push("");
      lines.push("```");
      lines.push(m.detail);
      lines.push("```");
      if (m.signals.length) {
        lines.push("**Signals:**");
        for (const s of m.signals) {
          lines.push(`- ${s.label}${s.detail ? ` — ${s.detail}` : ""}`);
        }
      }
      lines.push(`**Recommendation:** ${m.recommendation}`);
    }
  }

  if (workspace.length) {
    lines.push("");
    lines.push(header("Workspace"));
    for (const w of workspace) {
      lines.push("");
      lines.push(`### ${ICON[w.level]} ${w.title}`);
      lines.push(`_${w.file} • ${RISK_COPY[w.level].label} • score ${w.score}_`);
      lines.push("");
      lines.push("```");
      lines.push(w.detail);
      lines.push("```");
      if (w.signals.length) {
        for (const s of w.signals) {
          lines.push(`- ${s.label}${s.detail ? ` — ${s.detail}` : ""}`);
        }
      }
      lines.push(`**Recommendation:** ${w.recommendation}`);
    }
  }

  if (secrets.length) {
    lines.push("");
    lines.push(header("Sensitive Locations"));
    lines.push("");
    lines.push(
      "These files exist in locations your IDE process can read. Their _contents_ were not opened.",
    );
    lines.push("");
    for (const s of secrets) {
      lines.push(`- \`${s.path}\` — ${s.description}`);
    }
  }

  lines.push("");
  lines.push("---");
  lines.push("_TrustLens runs locally. No file contents were transmitted._");
  return lines.join("\n");
}

export function toJson(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}
