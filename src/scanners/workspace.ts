import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";
import { RiskSignal, WorkspaceFinding } from "../types";
import { levelFromScore, scoreFromSignals, signal } from "../risk/engine";

const RISKY_COMMAND_PATTERNS: { re: RegExp; label: string; weight: number }[] = [
  { re: /curl\s+[^|]+\|\s*(bash|sh|zsh)/i, label: "curl pipe to shell", weight: 8 },
  { re: /wget\s+[^|]+\|\s*(bash|sh)/i, label: "wget pipe to shell", weight: 8 },
  { re: /\bsudo\b/i, label: "uses sudo", weight: 3 },
  { re: /\brm\s+-rf\b/i, label: "rm -rf in command", weight: 5 },
  { re: /\bnpx\s+-y\b/i, label: "npx -y (auto-confirm install)", weight: 3 },
  { re: /\beval\s+/i, label: "shell eval", weight: 5 },
  { re: /\$\(curl\b/i, label: "command substitution from curl", weight: 6 },
  { re: /\bnc\s+-l/i, label: "opens netcat listener", weight: 6 },
];

async function readText(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

async function readJson<T = any>(p: string): Promise<T | null> {
  const t = await readText(p);
  if (t === null) return null;
  try {
    const cleaned = t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

function analyzeCommand(cmd: string): RiskSignal[] {
  const out: RiskSignal[] = [];
  for (const p of RISKY_COMMAND_PATTERNS) {
    if (p.re.test(cmd)) {
      out.push(signal(`cmd-${p.label}`, p.label, p.weight, cmd.slice(0, 200)));
    }
  }
  return out;
}

function relPath(root: string, p: string) {
  return path.relative(root, p).replace(/\\/g, "/");
}

async function scanTasksJson(
  root: string,
  file: string,
): Promise<WorkspaceFinding | null> {
  const tasks = await readJson<any>(file);
  if (!tasks?.tasks?.length) return null;
  const signals: RiskSignal[] = [];
  const details: string[] = [];
  for (const t of tasks.tasks) {
    if (t.type === "shell" || t.type === "process") {
      signals.push(signal("shell-task", `Shell task: ${t.label ?? "(unnamed)"}`, 2));
    }
    const cmd = [t.command, ...(t.args ?? [])].filter(Boolean).join(" ");
    if (cmd) {
      details.push(`${t.label ?? "(unnamed)"}: ${cmd}`);
      signals.push(...analyzeCommand(cmd));
    }
    if (t.runOptions?.runOn === "folderOpen") {
      signals.push(signal("autorun", "Runs automatically when folder opens", 5));
    }
  }
  const score = scoreFromSignals(signals);
  return {
    id: `ws:tasks:${file}`,
    file: relPath(root, file),
    kind: "tasks",
    title: ".vscode/tasks.json — workspace tasks",
    signals,
    score,
    level: levelFromScore(score),
    detail: details.join("\n") || "No commands defined.",
    recommendation:
      score === 0
        ? "Tasks look routine."
        : "Open and read each task before granting workspace trust.",
  };
}

async function scanLaunchJson(
  root: string,
  file: string,
): Promise<WorkspaceFinding | null> {
  const data = await readJson<any>(file);
  if (!data?.configurations?.length) return null;
  const signals: RiskSignal[] = [];
  const details: string[] = [];
  for (const c of data.configurations) {
    const prog: string = c.program ?? c.runtimeExecutable ?? "";
    details.push(`${c.name ?? "(unnamed)"}: ${prog}`);
    if (prog && !/^\$\{workspaceFolder\}/.test(prog) && /^\//.test(prog)) {
      signals.push(signal("abs-program", "Launch config runs an absolute-path binary", 2));
    }
    signals.push(...analyzeCommand(prog));
    if (c.preLaunchTask) {
      signals.push(signal("prelaunch", "Has preLaunch task hook", 1, String(c.preLaunchTask)));
    }
  }
  const score = scoreFromSignals(signals);
  return {
    id: `ws:launch:${file}`,
    file: relPath(root, file),
    kind: "launch",
    title: ".vscode/launch.json — debug launch configs",
    signals,
    score,
    level: levelFromScore(score),
    detail: details.join("\n"),
    recommendation: score === 0 ? "Launch configs look routine." : "Verify launch configs before debugging.",
  };
}

async function scanSettingsJson(
  root: string,
  file: string,
): Promise<WorkspaceFinding | null> {
  const data = await readJson<any>(file);
  if (!data) return null;
  const signals: RiskSignal[] = [];
  const details: string[] = [];
  if (data["security.workspace.trust.enabled"] === false) {
    signals.push(signal("trust-disabled", "Workspace Trust disabled in settings", 5));
  }
  if (data["security.workspace.trust.untrustedFiles"] === "open") {
    signals.push(signal("trust-bypass", "Auto-opens untrusted files without prompt", 4));
  }
  if (data["terminal.integrated.allowChords"] === true) {
    details.push("Terminal chords enabled");
  }
  if (data["python.terminal.activateEnvironment"] === true) {
    details.push("Auto-activates Python env on terminal open");
  }
  const score = scoreFromSignals(signals);
  if (score === 0 && !details.length) return null;
  return {
    id: `ws:settings:${file}`,
    file: relPath(root, file),
    kind: "settings",
    title: ".vscode/settings.json — workspace settings",
    signals,
    score,
    level: levelFromScore(score),
    detail: details.join("\n") || "Workspace overrides detected.",
    recommendation:
      score === 0
        ? "Settings look routine."
        : "Workspace overrides security defaults — review before trusting.",
  };
}

async function scanExtensionsJson(
  root: string,
  file: string,
): Promise<WorkspaceFinding | null> {
  const data = await readJson<any>(file);
  if (!data?.recommendations?.length) return null;
  const recs: string[] = data.recommendations;
  const signals: RiskSignal[] = [];
  if (recs.length > 8) {
    signals.push(signal("many-recs", "Many recommended extensions (>8)", 2));
  }
  for (const r of recs) {
    if (!r.includes(".")) {
      signals.push(signal("bad-rec", `Unusual extension id: ${r}`, 3));
    }
  }
  const score = scoreFromSignals(signals);
  return {
    id: `ws:extensions:${file}`,
    file: relPath(root, file),
    kind: "extensions",
    title: ".vscode/extensions.json — recommended extensions",
    signals,
    score,
    level: levelFromScore(score),
    detail: recs.join(", "),
    recommendation:
      score === 0
        ? "Recommendations look routine."
        : "Review each recommendation before installing.",
  };
}

async function scanDevContainer(
  root: string,
  file: string,
): Promise<WorkspaceFinding | null> {
  const data = await readJson<any>(file);
  if (!data) return null;
  const signals: RiskSignal[] = [];
  const details: string[] = [];
  if (data.postCreateCommand) {
    details.push(`postCreateCommand: ${data.postCreateCommand}`);
    signals.push(...analyzeCommand(String(data.postCreateCommand)));
    signals.push(signal("post-create", "Runs commands when container is created", 2));
  }
  if (data.postStartCommand) {
    details.push(`postStartCommand: ${data.postStartCommand}`);
    signals.push(...analyzeCommand(String(data.postStartCommand)));
  }
  if (data.features) {
    const feats = Object.keys(data.features);
    details.push(`features: ${feats.join(", ")}`);
    if (feats.some((f) => f.includes("docker-in-docker"))) {
      signals.push(signal("dind", "Uses docker-in-docker feature", 3));
    }
  }
  if (data.runArgs?.some?.((a: string) => /privileged/i.test(a))) {
    signals.push(signal("privileged", "Container runs in privileged mode", 6));
  }
  const score = scoreFromSignals(signals);
  return {
    id: `ws:devcontainer:${file}`,
    file: relPath(root, file),
    kind: "devcontainer",
    title: ".devcontainer/devcontainer.json — dev container",
    signals,
    score,
    level: levelFromScore(score),
    detail: details.join("\n") || "Devcontainer present.",
    recommendation:
      score === 0
        ? "Devcontainer looks routine."
        : "Review lifecycle commands and feature installs.",
  };
}

async function scanPackageScripts(
  root: string,
  file: string,
): Promise<WorkspaceFinding | null> {
  const data = await readJson<any>(file);
  if (!data?.scripts) return null;
  const signals: RiskSignal[] = [];
  const details: string[] = [];
  for (const [name, value] of Object.entries<string>(data.scripts)) {
    details.push(`${name}: ${value}`);
    if (name === "postinstall" || name === "preinstall") {
      signals.push(
        signal(`pkg-${name}`, `Lifecycle script: ${name}`, 4, value),
      );
    }
    signals.push(...analyzeCommand(value));
  }
  const score = scoreFromSignals(signals);
  return {
    id: `ws:pkg:${file}`,
    file: relPath(root, file),
    kind: "packageScripts",
    title: "package.json — npm scripts",
    signals,
    score,
    level: levelFromScore(score),
    detail: details.join("\n"),
    recommendation:
      score === 0
        ? "npm scripts look routine."
        : "Avoid running install/lifecycle scripts in untrusted clones.",
  };
}

export async function scanWorkspace(opts: {
  onProgress?: (msg: string, percent: number) => void;
}): Promise<WorkspaceFinding[]> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (!folders.length) return [];
  const findings: WorkspaceFinding[] = [];

  for (const folder of folders) {
    const root = folder.uri.fsPath;
    opts.onProgress?.(`Reading workspace ${folder.name}`, 82);

    const candidates: [string, (r: string, f: string) => Promise<WorkspaceFinding | null>][] = [
      [path.join(root, ".vscode", "tasks.json"), scanTasksJson],
      [path.join(root, ".vscode", "launch.json"), scanLaunchJson],
      [path.join(root, ".vscode", "settings.json"), scanSettingsJson],
      [path.join(root, ".vscode", "extensions.json"), scanExtensionsJson],
      [path.join(root, ".devcontainer", "devcontainer.json"), scanDevContainer],
      [path.join(root, "devcontainer.json"), scanDevContainer],
      [path.join(root, "package.json"), scanPackageScripts],
    ];

    for (const [file, fn] of candidates) {
      const f = await fn(root, file);
      if (f) findings.push(f);
    }
  }

  findings.sort((a, b) => b.score - a.score);
  return findings;
}
