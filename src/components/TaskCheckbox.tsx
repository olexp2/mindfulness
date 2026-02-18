"use client";

import { Check } from "lucide-react";

interface TaskCheckboxProps {
  done: boolean;
  onToggle: () => void;
}

export default function TaskCheckbox({ done, onToggle }: TaskCheckboxProps) {
  return (
    <button
      onClick={onToggle}
      className={[
        "flex shrink-0 items-center justify-center w-7 h-7 rounded-full border-2 transition-colors",
        done
          ? "border-transparent bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
          : "border-neutral-300/50 text-transparent hover:border-neutral-400/70 dark:border-slate-600/50 dark:hover:border-slate-500/70",
      ].join(" ")}
      aria-label={done ? "Отметить как невыполненное" : "Отметить как выполненное"}
    >
      <Check className="w-4 h-4" />
    </button>
  );
}
