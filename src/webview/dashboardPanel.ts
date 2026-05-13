import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";
import { ExtensionToWebviewMessage, ScanResult, WebviewToExtensionMessage } from "../types";

export class DashboardPanel {
  public static current: DashboardPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];
  private latestResult: ScanResult | null = null;
  private onMessage: (msg: WebviewToExtensionMessage) => void;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    onMessage: (msg: WebviewToExtensionMessage) => void,
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.onMessage = onMessage;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (msg: WebviewToExtensionMessage) => this.onMessage(msg),
      null,
      this.disposables,
    );
  }

  static async show(
    extensionUri: vscode.Uri,
    onMessage: (msg: WebviewToExtensionMessage) => void,
  ): Promise<DashboardPanel> {
    if (DashboardPanel.current) {
      DashboardPanel.current.panel.reveal();
      DashboardPanel.current.onMessage = onMessage;
      return DashboardPanel.current;
    }
    const panel = vscode.window.createWebviewPanel(
      "trustlens.dashboard",
      "TrustLens Dashboard",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "webview-ui", "dist"),
          vscode.Uri.joinPath(extensionUri, "media"),
        ],
      },
    );
    const instance = new DashboardPanel(panel, extensionUri, onMessage);
    await instance.render();
    DashboardPanel.current = instance;
    return instance;
  }

  private async render(): Promise<void> {
    const distRoot = vscode.Uri.joinPath(this.extensionUri, "webview-ui", "dist");
    const indexPath = vscode.Uri.joinPath(distRoot, "index.html");
    let html: string;
    try {
      html = await fs.readFile(indexPath.fsPath, "utf8");
    } catch {
      html = this.fallbackHtml(
        "TrustLens webview has not been built yet. Run `npm install && npm run build`.",
      );
      this.panel.webview.html = html;
      return;
    }

    const nonce = makeNonce();
    const webview = this.panel.webview;

    html = html.replace(/(src|href)="(\/[^"]+)"/g, (_match, attr, p) => {
      const asset = vscode.Uri.joinPath(distRoot, p.replace(/^\//, ""));
      return `${attr}="${webview.asWebviewUri(asset)}"`;
    });
    html = html.replace(/(src|href)="(\.?\/?assets\/[^"]+)"/g, (_m, attr, p) => {
      const clean = p.replace(/^\.?\//, "");
      const asset = vscode.Uri.joinPath(distRoot, clean);
      return `${attr}="${webview.asWebviewUri(asset)}"`;
    });

    html = html.replace(
      /<script /g,
      `<script nonce="${nonce}" `,
    );

    const csp = [
      `default-src 'none'`,
      `img-src ${webview.cspSource} data: https:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource} data:`,
      `script-src 'nonce-${nonce}'`,
      `connect-src ${webview.cspSource}`,
    ].join("; ");

    if (/<meta[^>]+Content-Security-Policy/i.test(html)) {
      html = html.replace(
        /<meta[^>]+Content-Security-Policy[^>]*>/i,
        `<meta http-equiv="Content-Security-Policy" content="${csp}" />`,
      );
    } else {
      html = html.replace(
        /<head>/i,
        `<head>\n<meta http-equiv="Content-Security-Policy" content="${csp}" />`,
      );
    }

    this.panel.webview.html = html;
  }

  public post(message: ExtensionToWebviewMessage): void {
    this.panel.webview.postMessage(message);
  }

  public setLatestResult(result: ScanResult | null) {
    this.latestResult = result;
    if (result) this.post({ type: "scanResult", result });
  }

  public getLatestResult(): ScanResult | null {
    return this.latestResult;
  }

  public reveal() {
    this.panel.reveal();
  }

  private fallbackHtml(message: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>TrustLens</title>
      <style>body{font-family:-apple-system,Segoe UI,sans-serif;padding:32px;background:#0b0d12;color:#e6e8ee}</style>
    </head><body><h1>TrustLens</h1><p>${escapeHtml(message)}</p></body></html>`;
  }

  private dispose() {
    DashboardPanel.current = undefined;
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }
}

function makeNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
