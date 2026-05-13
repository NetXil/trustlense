import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";
import { ExtensionFinding, RiskSignal } from "../types";
import { levelFromScore, scoreFromSignals, signal } from "../risk/engine";

type ExtensionSignalId =
  | "publisher-unverified"
  | "no-repo"
  | "broad-activation"
  | "child-process"
  | "network"
  | "fs-access"
  | "native-binary"
  | "postinstall"
  | "obfuscation"
  | "invisible-unicode"
  | "suspicious-domain"
  | "webview";

interface ExtensionTrustContext {
  verifiedPublisher: boolean;
  publisherId?: string;
}

const VERIFIED_PUBLISHER_ROUTINE_SIGNALS = new Set<ExtensionSignalId>([
  "publisher-unverified",
  "no-repo",
  "broad-activation",
  "child-process",
  "network",
  "fs-access",
  "native-binary",
  "obfuscation",
  "webview",
]);

const SUSPICIOUS_DOMAINS = [
  "pastebin.com",
  "transfer.sh",
  "0x0.st",
  "ngrok.io",
  "discord.gg",
  "telegram.me",
];

const INVISIBLE_UNICODE_RE = /[​-‏‪-‮⁠-⁯﻿]/;
const OBFUSCATION_HINTS = [
  /eval\s*\(\s*atob\s*\(/,
  /Function\s*\(\s*['"`]return/,
  /\\x[0-9a-f]{2}\\x[0-9a-f]{2}\\x[0-9a-f]{2}/i,
];

const MARKETPLACE_QUERY_URL =
  "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery?api-version=7.2-preview.1";

const marketplaceVerificationCache = new Map<string, Promise<ExtensionTrustContext>>();
let skipMarketplaceLookups = false;

function normalizeId(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function metadataPublisherId(manifest: any, ext: vscode.Extension<unknown>): string | undefined {
  return readString(manifest?.__metadata?.publisherId) ??
    readString(ext.packageJSON?.__metadata?.publisherId);
}

function publisherFromManifest(manifest: any, ext: vscode.Extension<unknown>): string {
  return normalizeId(manifest?.publisher ?? ext.packageJSON.publisher) || "unknown";
}

function marketplaceFlagsAreVerified(flags: unknown): boolean {
  return typeof flags === "string" &&
    flags.split(",").map((f) => f.trim().toLowerCase()).includes("verified");
}

async function marketplaceTrustForExtension(
  extensionId: string,
  timeoutMs = 1500,
): Promise<ExtensionTrustContext> {
  const cacheKey = normalizeId(extensionId);
  if (!cacheKey || skipMarketplaceLookups || typeof fetch !== "function") {
    return { verifiedPublisher: false };
  }

  const cached = marketplaceVerificationCache.get(cacheKey);
  if (cached) return cached;

  const lookup = (async (): Promise<ExtensionTrustContext> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(MARKETPLACE_QUERY_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json;api-version=7.2-preview.1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filters: [{ criteria: [{ filterType: 7, value: extensionId }] }],
          flags: 0,
        }),
        signal: controller.signal,
      });
      if (!response.ok) return { verifiedPublisher: false };

      const payload = await response.json() as any;
      const publisher = payload?.results?.[0]?.extensions?.[0]?.publisher;
      const publisherId = readString(publisher?.publisherId);
      return {
        verifiedPublisher: !!publisherId && marketplaceFlagsAreVerified(publisher?.flags),
        publisherId,
      };
    } catch {
      skipMarketplaceLookups = true;
      return { verifiedPublisher: false };
    } finally {
      clearTimeout(timeout);
    }
  })();

  marketplaceVerificationCache.set(cacheKey, lookup);
  return lookup;
}

async function trustContextForExtension(
  ext: vscode.Extension<unknown>,
  manifest: any,
  verifyPublishersOnline: boolean,
): Promise<ExtensionTrustContext> {
  const localPublisherId = metadataPublisherId(manifest, ext);
  if (localPublisherId) {
    return { verifiedPublisher: true, publisherId: localPublisherId };
  }

  if (!verifyPublishersOnline) {
    return { verifiedPublisher: false };
  }

  return marketplaceTrustForExtension(ext.id);
}

function addSignal(
  signals: RiskSignal[],
  trust: ExtensionTrustContext,
  id: ExtensionSignalId,
  label: string,
  weight: number,
  detail?: string,
): void {
  if (trust.verifiedPublisher && VERIFIED_PUBLISHER_ROUTINE_SIGNALS.has(id)) {
    return;
  }
  signals.push(signal(id, label, weight, detail));
}

async function readJsonSafe<T = any>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function walkExtensionFiles(
  root: string,
  maxFiles = 80,
  maxBytesPerFile = 256 * 1024,
): Promise<{ files: string[]; concatenated: string }> {
  const files: string[] = [];
  const queue = [root];
  while (queue.length && files.length < maxFiles) {
    const dir = queue.shift()!;
    let entries: import("fs").Dirent[] = [];
    try {
      entries = (await fs.readdir(dir, { withFileTypes: true })) as any;
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name.startsWith(".")) continue;
        queue.push(full);
      } else if (/\.(js|cjs|mjs|ts)$/i.test(e.name)) {
        files.push(full);
        if (files.length >= maxFiles) break;
      }
    }
  }
  let blob = "";
  for (const f of files) {
    try {
      const buf = await fs.readFile(f);
      const slice = buf.subarray(0, maxBytesPerFile).toString("utf8");
      blob += "\n" + slice;
    } catch {
      // ignore
    }
  }
  return { files, concatenated: blob };
}

function hasNativeBinary(files: string[]): boolean {
  return files.some((f) => /\.(node|dylib|so|dll)$/i.test(f));
}

function detectStaticSignals(blob: string): {
  usesChildProcess: boolean;
  usesNetwork: boolean;
  usesFsAccess: boolean;
  containsObfuscatedCode: boolean;
  containsInvisibleUnicode: boolean;
  suspiciousDomains: string[];
} {
  const usesChildProcess =
    /require\(['"`]child_process['"`]\)|from\s+['"`]child_process['"`]|spawn\s*\(|execSync\s*\(|exec\s*\(/.test(
      blob,
    );
  const usesNetwork =
    /\bhttps?:\/\/|require\(['"`](https?|node-fetch|axios|got)['"`]\)|fetch\s*\(/.test(
      blob,
    );
  const usesFsAccess =
    /require\(['"`]fs(\/promises)?['"`]\)|from\s+['"`]fs['"`]|readFileSync|writeFileSync/.test(
      blob,
    );
  const containsObfuscatedCode = OBFUSCATION_HINTS.some((re) => re.test(blob));
  const containsInvisibleUnicode = INVISIBLE_UNICODE_RE.test(blob);
  const suspiciousDomains = SUSPICIOUS_DOMAINS.filter((d) => blob.includes(d));
  return {
    usesChildProcess,
    usesNetwork,
    usesFsAccess,
    containsObfuscatedCode,
    containsInvisibleUnicode,
    suspiciousDomains,
  };
}

function buildSignals(
  ext: vscode.Extension<unknown>,
  manifest: any,
  staticInfo: ReturnType<typeof detectStaticSignals>,
  nativeBinary: boolean,
  trust: ExtensionTrustContext,
): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const publisher = publisherFromManifest(manifest, ext);

  if (!trust.verifiedPublisher) {
    addSignal(
      signals,
      trust,
      "publisher-unverified",
      "Publisher is not verified by Marketplace metadata",
      2,
      `Publisher: ${publisher}`,
    );
  }

  if (!manifest?.repository) {
    addSignal(signals, trust, "no-repo", "No public repository link in manifest", 2);
  }

  const activationEvents: string[] = manifest?.activationEvents ?? [];
  const broadActivation = activationEvents.some((e) =>
    ["*", "onStartupFinished"].includes(e),
  );
  if (broadActivation) {
    addSignal(
      signals,
      trust,
      "broad-activation",
      "Activates broadly (startup or always)",
      3,
      activationEvents.join(", "),
    );
  }

  if (staticInfo.usesChildProcess) {
    addSignal(signals, trust, "child-process", "Can spawn shell/child processes", 4);
  }
  if (staticInfo.usesNetwork) {
    addSignal(signals, trust, "network", "Makes outbound network requests", 2);
  }
  if (staticInfo.usesFsAccess) {
    addSignal(signals, trust, "fs-access", "Reads or writes files on disk", 1);
  }
  if (nativeBinary) {
    addSignal(
      signals,
      trust,
      "native-binary",
      "Ships native binary code (.node/.so/.dll)",
      4,
    );
  }
  if (manifest?.scripts?.postinstall) {
    addSignal(signals, trust, "postinstall", "Defines a postinstall script", 3);
  }
  if (staticInfo.containsObfuscatedCode) {
    addSignal(
      signals,
      trust,
      "obfuscation",
      "Contains obfuscation patterns (eval/atob/hex strings)",
      5,
    );
  }
  if (staticInfo.containsInvisibleUnicode) {
    addSignal(
      signals,
      trust,
      "invisible-unicode",
      "Contains invisible Unicode characters",
      5,
    );
  }
  if (staticInfo.suspiciousDomains.length) {
    addSignal(
      signals,
      trust,
      "suspicious-domain",
      "References suspicious domains",
      4,
      staticInfo.suspiciousDomains.join(", "),
    );
  }

  const contributes = manifest?.contributes ?? {};
  const webviewCount =
    (contributes.viewsContainers ? 1 : 0) + (contributes.customEditors?.length ?? 0);
  if (webviewCount > 0) {
    addSignal(signals, trust, "webview", "Contributes webviews or custom editors", 1);
  }

  return signals;
}

function summarize(
  finding: Omit<ExtensionFinding, "summary" | "recommendation" | "level" | "score">,
  trust: ExtensionTrustContext,
): {
  summary: string;
  recommendation: string;
} {
  const reasons: string[] = [];
  if (finding.usesChildProcess) reasons.push("can run shell commands");
  if (finding.usesNetwork) reasons.push("makes network requests");
  if (finding.hasNativeBinary) reasons.push("ships native binaries");
  if (finding.containsObfuscatedCode) reasons.push("contains obfuscated code");
  if (finding.activationEvents.includes("*") || finding.activationEvents.includes("onStartupFinished"))
    reasons.push("activates broadly");
  if (!reasons.length) reasons.push("no notable capabilities detected");

  const summary = `${finding.displayName} ${reasons.join(", ")}.`;
  const recommendation =
    finding.signals.length === 0
      ? trust.verifiedPublisher
        ? "Publisher identity is verified by Marketplace metadata. Keep updates current."
        : "Looks routine. Keep updates current."
      : "Review the highlighted signals before granting workspace trust.";
  return { summary, recommendation };
}

function shouldOmitExtension(
  ext: vscode.Extension<unknown>,
  manifest: any,
  opts: {
    ignoredPublishers: Set<string>;
    selfExtensionId?: string;
    selfPublisher?: string;
  },
): boolean {
  const publisher = publisherFromManifest(manifest, ext);
  const selfExtensionId = normalizeId(opts.selfExtensionId);
  const selfPublisher = normalizeId(opts.selfPublisher);

  return (
    opts.ignoredPublishers.has(publisher) ||
    (!!selfPublisher && publisher === selfPublisher) ||
    (!!selfExtensionId && normalizeId(ext.id) === selfExtensionId)
  );
}

export async function scanExtensions(opts: {
  includeBuiltin: boolean;
  ignoredPublishers?: string[];
  selfExtensionId?: string;
  selfPublisher?: string;
  verifyPublishersOnline?: boolean;
  onProgress?: (msg: string, percent: number) => void;
}): Promise<ExtensionFinding[]> {
  const all = vscode.extensions.all.filter(
    (e) => opts.includeBuiltin || !e.packageJSON.isBuiltin,
  );
  const findings: ExtensionFinding[] = [];
  const ignoredPublishers = new Set(
    (opts.ignoredPublishers ?? []).map((p) => normalizeId(p)).filter(Boolean),
  );
  const verifyPublishersOnline = opts.verifyPublishersOnline ?? true;

  let i = 0;
  for (const ext of all) {
    i += 1;
    opts.onProgress?.(
      `Analyzing ${ext.packageJSON.displayName ?? ext.id}`,
      Math.min(80, Math.round((i / all.length) * 80)),
    );

    const root = ext.extensionPath;
    const manifest = (await readJsonSafe(path.join(root, "package.json"))) ?? ext.packageJSON;
    if (shouldOmitExtension(ext, manifest, {
      ignoredPublishers,
      selfExtensionId: opts.selfExtensionId,
      selfPublisher: opts.selfPublisher,
    })) {
      continue;
    }

    const { files, concatenated } = await walkExtensionFiles(root);
    const staticInfo = detectStaticSignals(concatenated);
    const nativeBinary = hasNativeBinary(files);
    const trust = await trustContextForExtension(ext, manifest, verifyPublishersOnline);

    const signals = buildSignals(ext, manifest, staticInfo, nativeBinary, trust);
    const score = scoreFromSignals(signals);
    const level = levelFromScore(score);

    const partial: Omit<ExtensionFinding, "summary" | "recommendation" | "level" | "score"> = {
      id: ext.id,
      displayName: manifest.displayName ?? ext.packageJSON.displayName ?? ext.id,
      publisher: manifest.publisher ?? "unknown",
      version: manifest.version ?? ext.packageJSON.version ?? "0.0.0",
      isBuiltin: !!ext.packageJSON.isBuiltin,
      description: manifest.description,
      repository:
        typeof manifest.repository === "string"
          ? manifest.repository
          : manifest.repository?.url,
      activationEvents: manifest.activationEvents ?? [],
      commandsContributed: manifest.contributes?.commands?.length ?? 0,
      webviewsContributed:
        (manifest.contributes?.viewsContainers ? 1 : 0) +
        (manifest.contributes?.customEditors?.length ?? 0),
      hasNativeBinary: nativeBinary,
      hasPostinstall: !!manifest.scripts?.postinstall,
      usesChildProcess: staticInfo.usesChildProcess,
      usesNetwork: staticInfo.usesNetwork,
      usesFsAccess: staticInfo.usesFsAccess,
      containsObfuscatedCode: staticInfo.containsObfuscatedCode,
      containsInvisibleUnicode: staticInfo.containsInvisibleUnicode,
      signals,
    };
    const { summary, recommendation } = summarize(partial, trust);
    findings.push({ ...partial, score, level, summary, recommendation });
  }

  findings.sort((a, b) => b.score - a.score);
  return findings;
}
