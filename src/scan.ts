import * as vscode from "vscode";
import { ScanResult } from "./types";
import { scanExtensions } from "./scanners/extensions";
import { scanWorkspace } from "./scanners/workspace";
import { scanMCP } from "./scanners/mcp";
import { scanSecrets } from "./scanners/secrets";
import { aggregateLevel } from "./risk/engine";

export async function runScan(
  onProgress: (msg: string, percent: number) => void,
  opts: { selfExtensionId?: string; selfPublisher?: string } = {},
): Promise<ScanResult> {
  const config = vscode.workspace.getConfiguration("trustlens");
  const includeBuiltin = config.get<boolean>("includeBuiltinExtensions", false);
  const ignoredPublishers = config.get<string[]>("ignoredExtensionPublishers", ["netxil"]);
  const verifyPublishersOnline = config.get<boolean>("verifyPublishersOnline", true);

  const start = Date.now();
  onProgress("Inventorying installed extensions", 5);
  const extensions = await scanExtensions({
    includeBuiltin,
    ignoredPublishers,
    selfExtensionId: opts.selfExtensionId,
    selfPublisher: opts.selfPublisher,
    verifyPublishersOnline,
    onProgress,
  });
  onProgress("Scanning workspace files", 82);
  const workspace = await scanWorkspace({ onProgress });
  onProgress("Inspecting MCP configurations", 88);
  const mcp = await scanMCP({ onProgress });
  onProgress("Checking secret-bearing locations", 95);
  const secrets = await scanSecrets({ onProgress });
  onProgress("Computing overall trust", 99);

  const allScores = [
    ...extensions.map((e) => e.score),
    ...workspace.map((w) => w.score),
    ...mcp.map((m) => m.score),
  ];
  const { level, score } = aggregateLevel(allScores);

  const finished = Date.now();
  const folder =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;

  const result: ScanResult = {
    summary: {
      startedAt: new Date(start).toISOString(),
      finishedAt: new Date(finished).toISOString(),
      durationMs: finished - start,
      workspaceFolder: folder,
      overall: level,
      overallScore: score,
      counts: {
        extensions: extensions.length,
        extensionsRisky: extensions.filter((e) => e.level !== "safe").length,
        mcpServers: mcp.length,
        mcpRisky: mcp.filter((m) => m.level !== "safe").length,
        workspaceItems: workspace.length,
        workspaceRisky: workspace.filter((w) => w.level !== "safe").length,
        secrets: secrets.length,
      },
    },
    extensions,
    workspace,
    mcp,
    secrets,
  };
  onProgress("Done", 100);
  return result;
}
