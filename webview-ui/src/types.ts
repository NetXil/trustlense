export type RiskLevel = "safe" | "review" | "risky" | "critical";

export interface RiskSignal {
  id: string;
  label: string;
  detail?: string;
  weight: number;
}

export interface ExtensionFinding {
  id: string;
  displayName: string;
  publisher: string;
  version: string;
  isBuiltin: boolean;
  description?: string;
  repository?: string;
  activationEvents: string[];
  commandsContributed: number;
  webviewsContributed: number;
  hasNativeBinary: boolean;
  hasPostinstall: boolean;
  usesChildProcess: boolean;
  usesNetwork: boolean;
  usesFsAccess: boolean;
  containsObfuscatedCode: boolean;
  containsInvisibleUnicode: boolean;
  signals: RiskSignal[];
  score: number;
  level: RiskLevel;
  summary: string;
  recommendation: string;
}

export interface WorkspaceFinding {
  id: string;
  file: string;
  kind: string;
  title: string;
  signals: RiskSignal[];
  score: number;
  level: RiskLevel;
  detail: string;
  recommendation: string;
}

export interface MCPFinding {
  id: string;
  source: string;
  serverName: string;
  command: string;
  args: string[];
  envKeys: string[];
  pinned: boolean;
  signals: RiskSignal[];
  score: number;
  level: RiskLevel;
  detail: string;
  recommendation: string;
}

export interface SecretFinding {
  id: string;
  path: string;
  kind: string;
  description: string;
  exists: boolean;
  reachableByWorkspace: boolean;
}

export interface ScanSummary {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  workspaceFolder: string | null;
  overall: RiskLevel;
  overallScore: number;
  counts: {
    extensions: number;
    extensionsRisky: number;
    mcpServers: number;
    mcpRisky: number;
    workspaceItems: number;
    workspaceRisky: number;
    secrets: number;
  };
}

export interface ScanResult {
  summary: ScanSummary;
  extensions: ExtensionFinding[];
  workspace: WorkspaceFinding[];
  mcp: MCPFinding[];
  secrets: SecretFinding[];
}

export type ExtensionToWebviewMessage =
  | { type: "scanStarted" }
  | { type: "scanProgress"; phase: string; percent: number }
  | { type: "scanResult"; result: ScanResult }
  | { type: "scanError"; error: string };

export type WebviewToExtensionMessage =
  | { type: "ready" }
  | { type: "rescan" }
  | { type: "exportMarkdown" }
  | { type: "exportJson" }
  | { type: "openFile"; path: string }
  | { type: "openExternal"; url: string };
