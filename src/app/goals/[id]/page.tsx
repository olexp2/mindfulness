"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  loadStore,
  saveStore,
  updateGoal,
  removeGoal,
  addMilestone,
  updateMilestone,
  removeMilestone,
  type GlobalGoal,
  type ISODate,
} from "@/lib/osoznannostStore";
import { NotebookCard as Card } from "@/components/NotebookCard";
import { ArrowLeft, Check, Trash2, Plus, Circle, CheckCircle2, Play, Pause, MoreVertical, Copy } from "lucide-react";
import { COLOR_PRESETS, ICONS, type IconKey } from "@/lib/constants";
import { triggerHaptic } from "@/lib/haptics";
import { ActionSheet } from "@/components/ActionSheet";

function isISODate(v: string): v is ISODate {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export default function EditGoalPage() {
  const router = useRouter();
  const params = useParams();
  const goalId = params.id as string;

  const [goal, setGoal] = useState<GlobalGoal | null>(null);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState<string>(COLOR_PRESETS[1]);
  const [iconKey, setIconKey] = useState<IconKey>("target");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"active" | "completed" | "paused">("active");
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  useEffect(() => {
    const store = loadStore();
    const foundGoal = store.goals?.find((g) => g.id === goalId);
    if (!foundGoal) {
      router.push("/goals");
      return;
    }
    setGoal(foundGoal);
    setTitle(foundGoal.title);
    setDeadline(foundGoal.deadline || "");
    setColor(foundGoal.color || COLOR_PRESETS[1]);
    setIconKey((foundGoal.icon as IconKey) || "target");
    setProgress(foundGoal.progress || 0);
    setStatus(foundGoal.status || "active");
  }, [goalId, router]);

  function handleSave() {
    const t = title.trim();
    if (!t || !goal) return;

    const store = loadStore();
    updateGoal(store, goalId, {
      title: t,
      deadline: isISODate(deadline) ? (deadline as ISODate) : undefined,
      color,
      icon: iconKey,
      progress,
      status,
    });
    saveStore(store);
    triggerHaptic("medium");
    router.push("/goals");
  }

  function handleDelete() {
    const store = loadStore();
    removeGoal(store, goalId);
    saveStore(store);
    triggerHaptic("medium");
    router.push("/goals");
  }

  function handleDuplicate() {
    if (!goal) return;
    
    const store = loadStore();
    const duplicatedGoal: GlobalGoal = {
      ...goal,
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: `${goal.title} (копия)`,
      progress: 0,
      milestones: goal.milestones?.map(m => ({
        ...m,
        id: `milestone-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        completed: false,
      })),
    };

    store.goals = [...(store.goals ?? []), duplicatedGoal];
    saveStore(store);
    
    triggerHaptic("success");
    router.push("/goals");
  }

  function handleCancel() {
    triggerHaptic("light");
    router.back();
  }

  function handleAddMilestone() {
    const t = newMilestoneTitle.trim();
    if (!t) return;

    const store = loadStore();
    const today = new Date().toISOString().split("T")[0] as ISODate;
    addMilestone(store, goalId, today, t);
    saveStore(store);
    
    const updatedGoal = store.goals?.find((g) => g.id === goalId);
    if (updatedGoal) {
      setGoal(updatedGoal);
    }
    setNewMilestoneTitle("");
    triggerHaptic("light");
  }

  function handleToggleMilestone(milestoneId: string) {
    if (!goal) return;
    const milestone = goal.milestones?.find((m) => m.id === milestoneId);
    if (!milestone) return;

    const store = loadStore();
    updateMilestone(store, goalId, milestoneId, { completed: !milestone.completed });
    saveStore(store);

    const updatedGoal = store.goals?.find((g) => g.id === goalId);
    if (updatedGoal) {
      setGoal(updatedGoal);
    }
    triggerHaptic("light");
  }

  function handleDeleteMilestone(milestoneId: string) {
    const store = loadStore();
    removeMilestone(store, goalId, milestoneId);
    saveStore(store);

    const updatedGoal = store.goals?.find((g) => g.id === goalId);
    if (updatedGoal) {
      setGoal(updatedGoal);
    }
    triggerHaptic("light");
  }

  if (!goal) return null;

  return (
    <>
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
            Редактировать цель
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                triggerHaptic("light");
                setIsActionSheetOpen(true);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 transition-all duration-200 hover:bg-neutral-100 active:scale-90 dark:text-slate-400 dark:hover:bg-white/5"
              aria-label="Меню"
            >
              <MoreVertical size={20} strokeWidth={2.5} />
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:scale-110 hover:shadow-xl hover:shadow-indigo-500/40 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              aria-label="Сохранить"
            >
              <Check size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>

      <Card variant="note-soft">
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
            <label className="mb-2 block text-sm font-bold text-neutral-600 dark:text-slate-300 uppercase tracking-wider">
              Прогресс: {progress}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${color} 0%, ${color} ${progress}%, #e5e7eb ${progress}%, #e5e7eb 100%)`,
              }}
            />
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}>
            <span className="mb-3 block text-sm font-bold text-neutral-600 dark:text-slate-300 uppercase tracking-wider">
              Статус
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setStatus("active")}
                className={[
                  "flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  status === "active"
                    ? "bg-green-500 text-white shadow-lg scale-105"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
                ].join(" ")}
              >
                <Play size={16} strokeWidth={2.5} />
                Активна
              </button>
              <button
                onClick={() => setStatus("paused")}
                className={[
                  "flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  status === "paused"
                    ? "bg-yellow-500 text-white shadow-lg scale-105"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
                ].join(" ")}
              >
                <Pause size={16} strokeWidth={2.5} />
                Пауза
              </button>
              <button
                onClick={() => setStatus("completed")}
                className={[
                  "flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  status === "completed"
                    ? "bg-blue-500 text-white shadow-lg scale-105"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
                ].join(" ")}
              >
                <CheckCircle2 size={16} strokeWidth={2.5} />
                Завершена
              </button>
            </div>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
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

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}>
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

      <Card variant="note-soft">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              Этапы
            </h2>
            <span className="text-sm text-neutral-600 dark:text-slate-400">
              {goal.milestones?.filter(m => m.completed).length || 0} / {goal.milestones?.length || 0}
            </span>
          </div>

          {goal.milestones && goal.milestones.length > 0 && (
            <div className="space-y-2">
              {goal.milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3 transition-all hover:bg-neutral-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  <button
                    onClick={() => handleToggleMilestone(milestone.id)}
                    className="shrink-0 text-neutral-400 transition-colors hover:text-neutral-600 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    {milestone.completed ? (
                      <CheckCircle2 size={24} strokeWidth={2.5} className="text-green-500" />
                    ) : (
                      <Circle size={24} strokeWidth={2.5} />
                    )}
                  </button>
                  <span
              className={[
                "flex-1 text-sm font-medium",
                milestone.completed
                  ? "text-neutral-400 line-through dark:text-slate-500"
                  : "text-neutral-900 dark:text-white",
              ].join(" ")}
            >
              {milestone.description}
            </span>
                  <button
                    onClick={() => handleDeleteMilestone(milestone.id)}
                    className="shrink-0 text-neutral-400 transition-colors hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
                  >
                    <Trash2 size={18} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newMilestoneTitle}
              onChange={(e) => setNewMilestoneTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddMilestone()}
              placeholder="Добавить этап..."
              className="flex-1 rounded-xl border-2 border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 outline-none transition-all duration-200 placeholder:text-neutral-400 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
            />
            <button
              onClick={handleAddMilestone}
              disabled={!newMilestoneTitle.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 dark:bg-white dark:text-black"
            >
              <Plus size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </Card>

      <div className="flex gap-3 px-1 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
        <button
          onClick={handleSave}
          disabled={!title.trim()}
          className="flex-1 rounded-xl bg-neutral-900 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:hover:scale-100 dark:bg-white dark:text-black"
        >
          Сохранить
        </button>
      </div>
      </div>

      <ActionSheet
        open={isActionSheetOpen}
        onOpenChange={setIsActionSheetOpen}
        title="Действия с целью"
        actions={[
          {
            label: "Дублировать цель",
            onClick: handleDuplicate,
          },
          {
            label: "Удалить цель",
            onClick: handleDelete,
            destructive: true,
          },
        ]}
      />
    </>
  );
}
