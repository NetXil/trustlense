import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { onExtensionMessage, postToExtension } from "./api";
import { Header } from "./components/Header";
import { Dashboard } from "./components/Dashboard";
import { EmptyState } from "./components/EmptyState";
import { ScanResult } from "./types";

export default function App() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [phase, setPhase] = useState("");
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const off = onExtensionMessage((msg) => {
      switch (msg.type) {
        case "scanStarted":
          setScanning(true);
          setError(null);
          setPercent(0);
          setPhase("Starting scan…");
          break;
        case "scanProgress":
          setPhase(msg.phase);
          setPercent(msg.percent);
          break;
        case "scanResult":
          setResult(msg.result);
          setScanning(false);
          setPercent(100);
          break;
        case "scanError":
          setScanning(false);
          setError(msg.error);
          break;
      }
    });
    postToExtension({ type: "ready" });
    return () => off();
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-ink-950 text-ink-100">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(80% 60% at 50% -10%, rgba(124,58,237,0.18), transparent 70%), radial-gradient(50% 40% at 100% 100%, rgba(45,212,191,0.10), transparent 70%)",
        }}
      />
      <div className="relative">
        <Header scanning={scanning} hasResult={!!result} />

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mt-6 max-w-6xl px-6"
          >
            <div className="rounded-xl border border-risk-critical/30 bg-risk-critical/10 px-4 py-3 text-sm text-risk-critical">
              Scan failed: {error}
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {result ? (
            <Dashboard key="dash" result={result} />
          ) : (
            <motion.div key="empty" exit={{ opacity: 0 }}>
              <EmptyState
                scanning={scanning}
                phase={phase}
                percent={percent}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
