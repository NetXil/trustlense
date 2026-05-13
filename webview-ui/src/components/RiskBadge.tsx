import { motion } from "framer-motion";
import { RiskLevel } from "../types";
import { RISK_META } from "../risk";

interface Props {
  level: RiskLevel;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
}

export function RiskBadge({ level, size = "md", pulse = false }: Props) {
  const meta = RISK_META[level];
  const padding = size === "sm" ? "px-2 py-0.5 text-[11px]" : size === "lg" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs";
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wide ${meta.bg} ${meta.border} ${meta.text} ${padding}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {pulse && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${meta.dot}`}
          />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      </span>
      {meta.label}
    </motion.span>
  );
}
