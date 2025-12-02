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
      className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white shadow-sm transition active:scale-[0.99] disabled:opacity-40"
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
      className="rounded-xl px-3 py-2 text-sm text-neutral-700 transition hover:bg-neutral-100 active:scale-[0.99]"
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
        "focus:ring-2 focus:ring-neutral-200",
        props.className ?? "",
      ].join(" ")}
    />
  );
}
