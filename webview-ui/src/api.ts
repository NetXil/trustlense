import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from "./types";

declare global {
  interface Window {
    acquireVsCodeApi?: () => {
      postMessage: (msg: unknown) => void;
      setState: (state: unknown) => void;
      getState: () => unknown;
    };
  }
}

const vscode = window.acquireVsCodeApi
  ? window.acquireVsCodeApi()
  : {
      postMessage: (m: unknown) => console.log("[mock vscode]", m),
      setState: () => undefined,
      getState: () => undefined,
    };

export function postToExtension(msg: WebviewToExtensionMessage): void {
  vscode.postMessage(msg);
}

export function onExtensionMessage(
  handler: (msg: ExtensionToWebviewMessage) => void,
): () => void {
  const listener = (event: MessageEvent<ExtensionToWebviewMessage>) => {
    if (event.data && typeof event.data === "object" && "type" in event.data) {
      handler(event.data);
    }
  };
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}
