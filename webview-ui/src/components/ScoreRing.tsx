import { motion } from "framer-motion";
import { RiskLevel } from "../types";
import { RISK_META } from "../risk";

interface Props {
  level: RiskLevel;
  score: number;
  size?: number;
}

export function ScoreRing({ level, score, size = 132 }: Props) {
  const meta = RISK_META[level];
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const max = 30;
  const clamped = Math.min(score, max);
  const fraction = clamped / max;
  const dash = circumference * fraction;

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/[0.04] to-transparent" />
      <svg width={size} height={size} className={`-rotate-90 ${meta.glow}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-white/[0.06]"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={meta.stroke}
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${dash} ${circumference - dash}` }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="flex flex-col items-center">
          <motion.span
            key={score}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-3xl font-semibold ${meta.text}`}
          >
            {score}
          </motion.span>
          <span className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-ink-300">
            trust score
          </span>
        </div>
      </div>
    </div>
  );
}
