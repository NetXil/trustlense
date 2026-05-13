import * as vscode from "vscode";
import { runScan } from "./scan";
import { DashboardPanel } from "./webview/dashboardPanel";
import { SummaryTreeProvider } from "./views/treeView";
import { toJson, toMarkdown } from "./reports/generator";
import { ScanResult, WebviewToExtensionMessage } from "./types";

let latestResult: ScanResult | null = null;
let treeProvider: SummaryTreeProvider | undefined;
let statusBar: vscode.StatusBarItem | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  treeProvider = new SummaryTreeProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("trustlens.summary", treeProvider),
  );

  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.text = "$(shield) TrustLens";
  statusBar.tooltip = "Open TrustLens Dashboard";
  statusBar.command = "trustlens.openDashboard";
  statusBar.show();
  context.subscriptions.push(statusBar);

  context.subscriptions.push(
    vscode.commands.registerCommand("trustlens.openDashboard", async () => {
      const panel = await DashboardPanel.show(context.extensionUri, handleMessage);
      if (latestResult) {
        panel.setLatestResult(latestResult);
      } else {
        await performScan(context, panel);
      }
    }),
    vscode.commands.registerCommand("trustlens.scanEnvironment", async () => {
      const panel = await DashboardPanel.show(context.extensionUri, handleMessage);
      await performScan(context, panel);
    }),
    vscode.commands.registerCommand("trustlens.exportMarkdown", async () => {
      await exportReport("md");
    }),
    vscode.commands.registerCommand("trustlens.exportJson", async () => {
      await exportReport("json");
    }),
  );

  const config = vscode.workspace.getConfiguration("trustlens");
  if (config.get<boolean>("scanOnStartup", false)) {
    setTimeout(() => {
      vscode.commands.executeCommand("trustlens.openDashboard");
    }, 1500);
  }

  function handleMessage(msg: WebviewToExtensionMessage): void {
    switch (msg.type) {
      case "ready":
        if (latestResult) {
          DashboardPanel.current?.post({ type: "scanResult", result: latestResult });
        }
        break;
      case "rescan":
        if (DashboardPanel.current) performScan(context, DashboardPanel.current);
        break;
      case "exportMarkdown":
        exportReport("md");
        break;
      case "exportJson":
        exportReport("json");
        break;
      case "openFile": {
        const ws = vscode.workspace.workspaceFolders?.[0];
        if (ws) {
          const target = vscode.Uri.joinPath(ws.uri, msg.path);
          vscode.window.showTextDocument(target, { preview: true }).then(
            () => undefined,
            () => vscode.window.showWarningMessage(`TrustLens: cannot open ${msg.path}`),
          );
        }
        break;
      }
      case "openExternal":
        vscode.env.openExternal(vscode.Uri.parse(msg.url));
        break;
    }
  }
}

async function performScan(
  context: vscode.ExtensionContext,
  panel: DashboardPanel,
): Promise<void> {
  panel.post({ type: "scanStarted" });
  if (statusBar) statusBar.text = "$(sync~spin) TrustLens scanning";
  try {
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: "TrustLens",
        cancellable: false,
      },
      async (progress) => {
        return await runScan(
          (message, percent) => {
            progress.report({ message, increment: 0 });
            panel.post({ type: "scanProgress", phase: message, percent });
          },
          {
            selfExtensionId: context.extension.id,
            selfPublisher: context.extension.packageJSON.publisher,
          },
        );
      },
    );
    latestResult = result;
    treeProvider?.setResult(result);
    panel.setLatestResult(result);
    if (statusBar) {
      const icon = result.summary.overall === "safe" ? "$(shield)" :
        result.summary.overall === "review" ? "$(warning)" :
        "$(error)";
      statusBar.text = `${icon} TrustLens: ${result.summary.overall}`;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    panel.post({ type: "scanError", error: msg });
    vscode.window.showErrorMessage(`TrustLens scan failed: ${msg}`);
    if (statusBar) statusBar.text = "$(shield) TrustLens";
  }
}

async function exportReport(kind: "md" | "json") {
  if (!latestResult) {
    vscode.window.showInformationMessage("Run a TrustLens scan first.");
    return;
  }
  const content = kind === "md" ? toMarkdown(latestResult) : toJson(latestResult);
  const filename = `trustlens-report.${kind}`;
  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(filename),
    filters: kind === "md" ? { Markdown: ["md"] } : { JSON: ["json"] },
  });
  if (!uri) return;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf8"));
  const open = await vscode.window.showInformationMessage(
    `Saved ${kind.toUpperCase()} report.`,
    "Open",
  );
  if (open === "Open") {
    await vscode.window.showTextDocument(uri);
  }
}

export function deactivate(): void {
  // nothing
}
