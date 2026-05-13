import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { SecretFinding } from "../types";

interface Probe {
  id: string;
  rel: string;
  base: "home" | "workspace";
  kind: SecretFinding["kind"];
  description: string;
}

const PROBES: Probe[] = [
  { id: "env", rel: ".env", base: "workspace", kind: "env", description: "Workspace .env file (likely application secrets)" },
  { id: "env-local", rel: ".env.local", base: "workspace", kind: "env", description: "Workspace .env.local file" },
  { id: "env-prod", rel: ".env.production", base: "workspace", kind: "env", description: "Workspace .env.production file" },
  { id: "npmrc-ws", rel: ".npmrc", base: "workspace", kind: "npmrc", description: "Workspace .npmrc (may contain registry tokens)" },
  { id: "ssh-dir", rel: ".ssh", base: "home", kind: "ssh", description: "SSH directory with private keys" },
  { id: "aws", rel: ".aws/credentials", base: "home", kind: "aws", description: "AWS credentials file" },
  { id: "gcp", rel: ".config/gcloud/application_default_credentials.json", base: "home", kind: "gcp", description: "Google Cloud ADC credentials" },
  { id: "azure", rel: ".azure/credentials", base: "home", kind: "azure", description: "Azure CLI credentials" },
  { id: "npmrc-home", rel: ".npmrc", base: "home", kind: "npmrc", description: "Global .npmrc (registry tokens)" },
  { id: "pypirc", rel: ".pypirc", base: "home", kind: "pypirc", description: "PyPI credentials (.pypirc)" },
  { id: "docker", rel: ".docker/config.json", base: "home", kind: "docker", description: "Docker registry credentials" },
  { id: "gh", rel: ".config/gh/hosts.yml", base: "home", kind: "github", description: "GitHub CLI auth tokens" },
  { id: "kube", rel: ".kube/config", base: "home", kind: "kube", description: "Kubernetes cluster credentials" },
];

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function scanSecrets(opts: {
  onProgress?: (msg: string, percent: number) => void;
}): Promise<SecretFinding[]> {
  opts.onProgress?.("Checking secret-bearing locations", 95);
  const findings: SecretFinding[] = [];
  const home = os.homedir();
  const workspaceRoots = (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath);

  for (const probe of PROBES) {
    if (probe.base === "home") {
      const full = path.join(home, probe.rel);
      const e = await exists(full);
      if (e) {
        findings.push({
          id: probe.id,
          path: `~/${probe.rel}`,
          kind: probe.kind,
          description: probe.description,
          exists: true,
          reachableByWorkspace: true,
        });
      }
    } else {
      for (const root of workspaceRoots) {
        const full = path.join(root, probe.rel);
        const e = await exists(full);
        if (e) {
          findings.push({
            id: `${probe.id}:${root}`,
            path: path.relative(home, full).startsWith("..") ? full : `~/${path.relative(home, full)}`,
            kind: probe.kind,
            description: probe.description,
            exists: true,
            reachableByWorkspace: true,
          });
        }
      }
    }
  }

  return findings;
}
