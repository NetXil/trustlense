import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ReactNode, useState } from "react";

interface Props {
  title: string;
  subtitle?: string;
  count?: number;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function Section({
  title,
  subtitle,
  count,
  icon,
  defaultOpen = true,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mt-8">
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-center justify-between gap-3 rounded-xl border border-transparent px-1 py-2 text-left hover:border-white/5 hover:bg-white/[0.02]"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/5 bg-white/[0.03] text-accent-400">
              {icon}
            </div>
          )}
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-white">
              {title}
              {typeof count === "number" && (
                <span className="rounded-full border border-white/5 bg-white/[0.04] px-2 py-0.5 text-xs font-medium text-ink-200">
                  {count}
                </span>
              )}
            </h3>
            {subtitle && (
              <p className="text-xs text-ink-300">{subtitle}</p>
            )}
          </div>
        </div>
        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.2 }}
          className="text-ink-300"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
