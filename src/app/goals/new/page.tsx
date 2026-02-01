"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  loadStore,
  saveStore,
  addGoal,
  type ISODate,
} from "@/lib/osoznannostStore";
import { NotebookCard as Card } from "@/components/NotebookCard";
import { ArrowLeft, Check } from "lucide-react";
import { COLOR_PRESETS, ICONS, type IconKey } from "@/lib/constants";
import { triggerHaptic } from "@/lib/haptics";

function isISODate(v: string): v is ISODate {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export default function NewGoalPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState<string>(COLOR_PRESETS[1]);
  const [iconKey, setIconKey] = useState<IconKey>("target");

  function handleSave() {
    const t = title.trim();
    if (!t) return;

    const store = loadStore();
    const goal = addGoal(
      store,
      t,
      isISODate(deadline) ? (deadline as ISODate) : undefined
    );

    goal.color = color;
    goal.icon = iconKey;

    saveStore(store);
    triggerHaptic("medium");
    router.push("/goals");
  }

  function handleCancel() {
    triggerHaptic("light");
    router.back();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <button
          onClick={handleCancel}
          className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 transition-all duration-200 hover:bg-neutral-100 active:scale-90 dark:text-slate-400 dark:hover:bg-white/5"
          aria-label="Назад"
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
          Новая цель
        </h1>
        <button
          onClick={handleSave}
          disabled={!title.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:scale-110 hover:shadow-xl hover:shadow-indigo-500/40 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          aria-label="Сохранить"
        >
          <Check size={20} strokeWidth={2.5} />
        </button>
      </div>

      <Card variant="note-soft" contentClassName="px-3">
        <div className="space-y-6">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <label className="mb-2 block text-sm font-bold text-neutral-600 dark:text-slate-300 uppercase tracking-wider">
              Название
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Выучить английский"
              className="w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-base font-medium text-neutral-900 outline-none transition-all duration-200 placeholder:text-neutral-400 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
              autoFocus
            />
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '50ms', animationFillMode: 'backwards' }}>
            <label className="mb-2 block text-sm font-bold text-neutral-600 dark:text-slate-300 uppercase tracking-wider">
              Дедлайн (необязательно)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-base font-medium text-neutral-900 outline-none transition-all duration-200 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400"
            />
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
            <span className="mb-3 block text-sm font-bold text-neutral-600 dark:text-slate-300 uppercase tracking-wider">
              Цвет
            </span>
            <div className="flex flex-wrap gap-4">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-14 w-14 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
                  style={{
                    backgroundColor: c,
                    boxShadow: color === c 
                      ? `0 0 0 3px white, 0 0 0 5px ${c}, 0 4px 12px ${c}40` 
                      : "0 2px 8px rgba(0,0,0,0.1)",
                    opacity: color === c ? 1 : 0.6,
                    transform: color === c ? "scale(1.05)" : "scale(1)"
                  }}
                  aria-label={`Цвет ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}>
            <span className="mb-3 block text-sm font-bold text-neutral-600 dark:text-slate-300 uppercase tracking-wider">
              Иконка
            </span>
            <div className="grid grid-cols-5 gap-3">
              {ICONS.map(({ key, label, Icon }) => {
                const active = iconKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIconKey(key)}
                    className={[
                      "flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 transition-all duration-200",
                      active
                        ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black scale-105 shadow-lg"
                        : "border-transparent bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:scale-105 active:scale-95 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
                    ].join(" ")}
                    title={label}
                  >
                    <Icon size={28} strokeWidth={active ? 2.5 : 2} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-3 px-1 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
        <button
          onClick={handleCancel}
          className="flex-1 rounded-xl border-2 border-neutral-200 bg-white px-6 py-3 text-sm font-medium text-neutral-600 transition-all hover:bg-neutral-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          Отмена
        </button>
        <button
          onClick={handleSave}
          disabled={!title.trim()}
          className="flex-1 rounded-xl bg-neutral-900 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:hover:scale-100 dark:bg-white dark:text-black"
        >
          Создать
        </button>
      </div>
    </div>
  );
}
