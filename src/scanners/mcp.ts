import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { MCPFinding, RiskSignal } from "../types";
import { levelFromScore, scoreFromSignals, signal } from "../risk/engine";

const KNOWN_GOOD_PACKAGES = new Set([
  "@modelcontextprotocol/server-filesystem",
  "@modelcontextprotocol/server-github",
  "@modelcontextprotocol/server-postgres",
  "@modelcontextprotocol/server-sqlite",
  "@modelcontextprotocol/server-brave-search",
  "@modelcontextprotocol/server-memory",
]);

const SECRET_LIKE_KEYS = [
  "TOKEN",
  "SECRET",
  "KEY",
  "PASSWORD",
  "PASS",
  "API_KEY",
  "CREDENTIAL",
];

async function readJsonSafe<T = any>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(file, "utf8");
    const cleaned = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

interface MCPServerDef {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

function packageNameFromArgs(command: string, args: string[]): string | null {
  if (/^npx$/i.test(command) || /\bnpx\b/i.test(command)) {
    const pkg = args.find((a) => a.startsWith("@") || (!a.startsWith("-") && a.length > 2));
    return pkg ?? null;
  }
  if (/^uvx$/i.test(command) || /^pipx$/i.test(command)) {
    return args.find((a) => !a.startsWith("-")) ?? null;
  }
  return null;
}

function buildSignals(
  server: MCPServerDef,
  envFromConfig: Record<string, string> | undefined,
): { signals: RiskSignal[]; pkg: string | null; pinned: boolean } {
  const signals: RiskSignal[] = [];
  const command = server.command ?? "";
  const args = server.args ?? [];
  const fullCmd = [command, ...args].join(" ");

  const pkg = packageNameFromArgs(command, args);
  let pinned = false;

  if (/\bnpx\b/.test(fullCmd)) {
    signals.push(signal("npx", "Runs via npx (downloads on demand)", 3));
    if (/-y\b/.test(fullCmd)) {
      signals.push(signal("npx-y", "npx -y auto-confirms install", 2));
    }
    if (pkg && /@\d/.test(pkg)) {
      pinned = true;
    } else if (pkg) {
      signals.push(signal("unpinned", `Package version not pinned: ${pkg}`, 4));
    }
    if (pkg && !KNOWN_GOOD_PACKAGES.has(pkg.replace(/@\d.*$/, ""))) {
      signals.push(signal("unknown-pkg", `Package not in known-good list: ${pkg}`, 2));
    }
  }
  if (/\buvx\b|\bpipx\b/.test(fullCmd)) {
    signals.push(signal("py-runner", "Runs via uvx/pipx (downloads on demand)", 3));
    if (pkg && !/==/.test(pkg)) {
      signals.push(signal("unpinned-py", `Python package not version-pinned: ${pkg}`, 3));
    } else {
      pinned = true;
    }
  }
  if (/\b(bash|sh|zsh)\b/.test(command) || /\bcurl\b.*\|.*\b(bash|sh)\b/.test(fullCmd)) {
    signals.push(signal("shell-runner", "Executes a shell directly", 6));
  }
  if (/^node$/.test(command) && args.some((a) => /\.(js|cjs|mjs|ts)$/.test(a))) {
    signals.push(signal("local-node", "Runs a local Node.js script", 2));
  }
  if (server.url && /^https?:\/\//.test(server.url)) {
    signals.push(signal("remote-url", `Remote MCP endpoint: ${server.url}`, 2));
  }

  const env = { ...(server.env ?? {}), ...(envFromConfig ?? {}) };
  for (const [k, v] of Object.entries(env)) {
    if (SECRET_LIKE_KEYS.some((s) => k.toUpperCase().includes(s))) {
      const looksHardcoded = v && !/^\$\{|^\$[A-Z_]/.test(v) && v.length > 12;
      if (looksHardcoded) {
        signals.push(
          signal(
            "hardcoded-secret",
            `Likely hardcoded secret in env var: ${k}`,
            6,
            "Value redacted",
          ),
        );
      }
    }
  }

  return { signals, pkg, pinned };
}

interface ParsedSource {
  servers: Record<string, MCPServerDef>;
  envOverride?: Record<string, string>;
}

function parseConfig(raw: any): ParsedSource {
  if (!raw || typeof raw !== "object") return { servers: {} };
  if (raw.mcpServers && typeof raw.mcpServers === "object") {
    return { servers: raw.mcpServers, envOverride: raw.env };
  }
  if (raw.servers && typeof raw.servers === "object") {
    return { servers: raw.servers, envOverride: raw.env };
  }
  return { servers: {} };
}

const SOURCES: Array<{ name: string; resolve: () => string }> = [
  { name: "VS Code workspace mcp.json", resolve: () => path.join(".vscode", "mcp.json") },
  {
    name: "Cursor MCP config (global)",
    resolve: () => path.join(os.homedir(), ".cursor", "mcp.json"),
  },
  {
    name: "Claude Desktop MCP config (macOS)",
    resolve: () =>
      path.join(
        os.homedir(),
        "Library",
        "Application Support",
        "Claude",
        "claude_desktop_config.json",
      ),
  },
  {
    name: "Claude Desktop MCP config (Linux)",
    resolve: () =>
      path.join(os.homedir(), ".config", "Claude", "claude_desktop_config.json"),
  },
  {
    name: "Windsurf MCP config",
    resolve: () => path.join(os.homedir(), ".codeium", "windsurf", "mcp_config.json"),
  },
  {
    name: "Continue MCP config",
    resolve: () => path.join(os.homedir(), ".continue", "config.json"),
  },
];

export async function scanMCP(opts: {
  onProgress?: (msg: string, percent: number) => void;
}): Promise<MCPFinding[]> {
  const findings: MCPFinding[] = [];
  const folders = vscode.workspace.workspaceFolders ?? [];
  const candidates: Array<{ name: string; file: string }> = [];

  for (const f of folders) {
    candidates.push({
      name: `Workspace mcp.json (${f.name})`,
      file: path.join(f.uri.fsPath, ".vscode", "mcp.json"),
    });
    candidates.push({
      name: `Workspace mcp.json root (${f.name})`,
      file: path.join(f.uri.fsPath, "mcp.json"),
    });
  }
  for (const s of SOURCES.slice(1)) {
    candidates.push({ name: s.name, file: s.resolve() });
  }

  opts.onProgress?.("Reading MCP configs", 88);

  for (const c of candidates) {
    const raw = await readJsonSafe(c.file);
    if (!raw) continue;
    const parsed = parseConfig(raw);
    for (const [serverName, def] of Object.entries(parsed.servers)) {
      const { signals, pkg, pinned } = buildSignals(def, parsed.envOverride);
      const score = scoreFromSignals(signals);
      const level = levelFromScore(score);

      const details: string[] = [];
      details.push(`command: ${def.command ?? "(none)"}`);
      if (def.args?.length) details.push(`args: ${def.args.join(" ")}`);
      if (def.url) details.push(`url: ${def.url}`);
      if (pkg) details.push(`package: ${pkg}${pinned ? " (pinned)" : " (unpinned)"}`);

      const envKeys = Object.keys({ ...(def.env ?? {}), ...(parsed.envOverride ?? {}) });
      if (envKeys.length) details.push(`env: ${envKeys.join(", ")}`);

      findings.push({
        id: `${c.file}#${serverName}`,
        source: c.name,
        serverName,
        command: def.command ?? "",
        args: def.args ?? [],
        envKeys,
        pinned,
        signals,
        score,
        level,
        detail: details.join("\n"),
        recommendation:
          score === 0
            ? "Looks routine. Keep package versions pinned."
            : "Pin the package version and only enable for trusted workspaces.",
      });
    }
  }

  findings.sort((a, b) => b.score - a.score);
  return findings;
}
