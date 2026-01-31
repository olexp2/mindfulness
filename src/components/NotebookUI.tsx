// src/components/NotebookUI.tsx
import React from "react";

export function Card({
  title,
  subtitle,
  variant = "note",
  children,
  right,
}: {
  title?: string;
  subtitle?: string;
  variant?: "note" | "note-soft" | "sticky";
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  const cls =
    variant === "sticky" ? "sticky" : variant === "note-soft" ? "note-soft" : "note";

  return (
    <section className={`rounded-2xl p-4 ${cls}`}>
      {(title || subtitle || right) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && <div className="text-base font-semibold tracking-tight">{title}</div>}
            {subtitle && <div className="text-xs text-neutral-600">{subtitle}</div>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-neutral-900/20 transition-all hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none dark:bg-white dark:text-black dark:shadow-white/10"
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl px-4 py-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 active:scale-[0.98] dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
    >
      {children}
    </button>
  );
}

export function Checkbox({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className={`checkbox ${on ? "checkbox--on" : ""}`} aria-label="toggle" />
  );
}

export function UnderlineInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "ink-input w-full text-sm",
        "underline py-1",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

export function RuledTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "w-full resize-none rounded-xl border border-black/5 bg-white/70 p-3 text-sm outline-none",
        props.className ?? "",
      ].join(" ")}
    />
  );
}
