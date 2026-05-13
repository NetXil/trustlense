import * as vscode from "vscode";
import { ScanResult } from "../types";
import { RISK_COPY } from "../risk/engine";

type Node =
  | { kind: "root"; label: string }
  | { kind: "section"; section: string; label: string; count: number };

export class SummaryTreeProvider implements vscode.TreeDataProvider<Node> {
  private _onDidChangeTreeData = new vscode.EventEmitter<Node | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private latest: ScanResult | null = null;

  setResult(result: ScanResult | null) {
    this.latest = result;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: Node): vscode.TreeItem {
    if (element.kind === "root") {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
      item.iconPath = new vscode.ThemeIcon("shield");
      item.command = {
        command: "trustlens.openDashboard",
        title: "Open TrustLens Dashboard",
      };
      return item;
    }
    const item = new vscode.TreeItem(
      `${element.label} — ${element.count}`,
      vscode.TreeItemCollapsibleState.None,
    );
    item.iconPath = new vscode.ThemeIcon(iconFor(element.section));
    item.command = {
      command: "trustlens.openDashboard",
      title: "Open TrustLens Dashboard",
    };
    return item;
  }

  getChildren(element?: Node): Node[] {
    if (!element) {
      if (!this.latest) {
        return [
          { kind: "root", label: "Run a scan to populate TrustLens" },
        ];
      }
      const overall = RISK_COPY[this.latest.summary.overall].label;
      return [
        { kind: "root", label: `Overall: ${overall}` },
        {
          kind: "section",
          section: "extensions",
          label: "Risky extensions",
          count: this.latest.summary.counts.extensionsRisky,
        },
        {
          kind: "section",
          section: "mcp",
          label: "Risky MCP servers",
          count: this.latest.summary.counts.mcpRisky,
        },
        {
          kind: "section",
          section: "workspace",
          label: "Risky workspace items",
          count: this.latest.summary.counts.workspaceRisky,
        },
        {
          kind: "section",
          section: "secrets",
          label: "Sensitive locations",
          count: this.latest.summary.counts.secrets,
        },
      ];
    }
    return [];
  }
}

function iconFor(section: string): string {
  switch (section) {
    case "extensions":
      return "extensions";
    case "mcp":
      return "plug";
    case "workspace":
      return "folder-opened";
    case "secrets":
      return "key";
    default:
      return "shield";
  }
}
