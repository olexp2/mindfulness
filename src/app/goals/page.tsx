"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  loadStore,
  saveStore,
  addGoal,
  updateGoal,
  removeGoal,
  type ISODate,
  type GlobalGoal,
} from "@/lib/osoznannostStore";
import { NotebookCard as Card } from "@/components/NotebookCard";
import { ListLoadingSkeleton } from "@/components/LoadingSkeleton";
import { Plus, ChevronRight } from "lucide-react";
import { getIconByKey } from "@/lib/constants";
import { triggerHaptic } from "@/lib/haptics";
import { ActionSheet } from "@/components/ActionSheet";
import RippleButton from "@/components/RippleButton";

function isISODate(v: string): v is ISODate {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export default function GoalsPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<GlobalGoal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GlobalGoal | null>(null);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | undefined>(undefined);

  useEffect(() => {
    const store = loadStore();
    setGoals(store.goals ?? []);
    saveStore(store);
    setLoaded(true);
  }, []);

  function getGoalTaskStats(goalId: string) {
    const store = loadStore();
    let completedTasks = 0;
    let totalTasks = 0;

    for (const weekStart in store.weeks) {
      const week = store.weeks[weekStart as ISODate];
      for (const date in week.days) {
        const day = week.days[date as ISODate];
        if (day && day.schedule) {
          for (const task of day.schedule) {
            if (task.status === "skipped") continue;
            
            const isLinkedToGoal = task.goalIds?.includes(goalId);
            
            if (isLinkedToGoal) {
              totalTasks++;
              if (task.done) {
                completedTasks++;
              }
            }
          }
        }
      }
    }

    return { completedTasks, totalTasks };
  }

  function handleCreateGoal() {
    triggerHaptic("light");
    router.push("/goals/new");
  }

  function handleEditGoal(id: string) {
    triggerHaptic("light");
    router.push(`/goals/${id}`);
  }

  function handleGoalClick(goal: GlobalGoal, event: React.MouseEvent) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    setClickPosition({ x, y });
    setSelectedGoal(goal);
    setActionSheetOpen(true);
    triggerHaptic('light');
  }

  function handleMarkCompleted() {
    if (!selectedGoal) return;
    
    const store = loadStore();
    const updatedGoal = { ...selectedGoal, status: "completed" as const };
    updateGoal(store, selectedGoal.id, updatedGoal);
    saveStore(store);
    setGoals(store.goals ?? []);
    setActionSheetOpen(false);
    triggerHaptic('success');
  }

  if (!loaded) return <ListLoadingSkeleton />;

  const activeGoals = goals.filter(g => g.status === "active");
  const completedGoals = goals.filter(g => g.status === "completed");
  const pausedGoals = goals.filter(g => g.status === "paused");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Цели</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-slate-400">
            {activeGoals.length} активных
          </p>
        </div>
        <RippleButton
          onClick={handleCreateGoal}
          variant="default"
          size="icon"
          className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:scale-110 hover:shadow-xl hover:shadow-indigo-500/40 active:scale-95 hover:bg-gradient-to-br hover:from-indigo-500 hover:to-purple-600"
          ariaLabel="Создать цель"
        >
          <Plus size={24} strokeWidth={2.5} />
        </RippleButton>
      </div>

      {goals.length === 0 ? (
        <Card variant="note-soft">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30">
              <Plus size={40} className="text-indigo-600 dark:text-indigo-400" strokeWidth={2} />
            </div>
            <h3 className="mb-2 text-lg font-bold text-neutral-900 dark:text-white">
              Нет целей
            </h3>
            <p className="mb-6 max-w-xs text-sm text-neutral-600 dark:text-slate-400">
              Создайте свою первую цель и начните отслеживать прогресс
            </p>
            <RippleButton
              onClick={handleCreateGoal}
              variant="default"
              className="rounded-xl bg-neutral-900 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95 dark:bg-white dark:text-black hover:bg-neutral-900 dark:hover:bg-white"
            >
              Создать цель
            </RippleButton>
          </div>
        </Card>
      ) : (
        <>
          {activeGoals.length > 0 && (
            <div className="space-y-3">
              <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400">
                Активные
              </h2>
              <div className="grid gap-3">
                {activeGoals.map((goal, index) => {
                  const Icon = getIconByKey(goal.icon);
                  const color = goal.color || "#a855f7";
                  const { completedTasks, totalTasks } = getGoalTaskStats(goal.id);
                  
                  return (
                    <RippleButton
                      key={goal.id}
                      onClick={(e) => handleGoalClick(goal, e)}
                      variant="ghost"
                      className="group relative w-full justify-start overflow-visible rounded-[24px] p-4 text-left whitespace-normal shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] animate-in fade-in slide-in-from-bottom-4 h-auto hover:bg-transparent"
                      style={{
                        backgroundColor: color,
                        boxShadow: `0 8px 20px -6px ${color}`,
                        animationDelay: `${index * 50}ms`,
                        animationFillMode: 'backwards',
                      }}
                    >
                      <div className="flex items-center">
                        {/* Область для Иконки (слева) */}
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                          <Icon size={48} strokeWidth={2.5} className="text-white" />
                        </div>

                        {/* Жесткий разделитель */}
                        <div className="w-6 shrink-0" />

                        {/* Область для Заголовка и дедлайна (справа) */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-white leading-tight break-words hyphens-auto" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                            {goal.title.length > 200 ? `${goal.title.slice(0, 200)}...` : goal.title}
                          </h3>
                          {goal.deadline && (
                            <p className="text-xs font-medium text-white/80 mt-1">
                              До {new Date(goal.deadline).toLocaleDateString("ru-RU", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    </RippleButton>
                  );
                })}
              </div>
            </div>
          )}

          {pausedGoals.length > 0 && (
            <div className="space-y-3">
              <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400">
                На паузе
              </h2>
              <div className="grid gap-3">
                {pausedGoals.map((goal, index) => {
                  const Icon = getIconByKey(goal.icon);
                  const color = goal.color || "#a855f7";
                  const { completedTasks, totalTasks } = getGoalTaskStats(goal.id);
                  
                  return (
                    <RippleButton
                      key={goal.id}
                      onClick={(e) => handleGoalClick(goal, e)}
                      variant="ghost"
                      className="group relative w-full justify-start overflow-visible rounded-[24px] p-4 text-left whitespace-normal opacity-60 shadow-md transition-all duration-300 hover:opacity-100 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] h-auto hover:bg-transparent"
                      style={{
                        backgroundColor: color,
                        boxShadow: `0 8px 20px -6px ${color}`,
                      }}
                    >
                      <div className="flex items-center">
                        {/* Область для Иконки (слева) */}
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                          <Icon size={48} strokeWidth={2.5} className="text-white" />
                        </div>

                        {/* Жесткий разделитель */}
                        <div className="w-6 shrink-0" />

                        {/* Область для Заголовка и статуса (справа) */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-white leading-tight break-words hyphens-auto" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                            {goal.title.length > 200 ? `${goal.title.slice(0, 200)}...` : goal.title}
                          </h3>
                          <p className="text-xs font-medium text-white/80 mt-1">
                            На паузе
                          </p>
                        </div>
                      </div>
                    </RippleButton>
                  );
                })}
              </div>
            </div>
          )}

          {completedGoals.length > 0 && (
            <div className="space-y-3">
              <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400">
                Завершённые
              </h2>
              <div className="grid gap-3">
                {completedGoals.map((goal, index) => {
                  const Icon = getIconByKey(goal.icon);
                  const color = goal.color || "#a855f7";
                  const { completedTasks, totalTasks } = getGoalTaskStats(goal.id);
                  
                  return (
                    <RippleButton
                      key={goal.id}
                      onClick={(e) => handleGoalClick(goal, e)}
                      variant="ghost"
                      className="group relative w-full justify-start overflow-visible rounded-[24px] p-4 text-left whitespace-normal opacity-50 shadow-md transition-all duration-300 hover:opacity-100 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] h-auto hover:bg-transparent"
                      style={{
                        backgroundColor: color,
                        boxShadow: `0 8px 20px -6px ${color}`,
                      }}
                    >
                      <div className="flex items-center">
                        {/* Область для Иконки (слева) */}
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                          <Icon size={48} strokeWidth={2.5} className="text-white" />
                        </div>

                        {/* Жесткий разделитель */}
                        <div className="w-6 shrink-0" />

                        {/* Область для Заголовка и статуса (справа) */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-white leading-tight break-words hyphens-auto" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                            {goal.title.length > 200 ? `${goal.title.slice(0, 200)}...` : goal.title}
                          </h3>
                          <p className="text-xs font-medium text-white/80 mt-1">
                            Завершена ✓
                          </p>
                        </div>
                      </div>
                    </RippleButton>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <ActionSheet
        open={actionSheetOpen}
        onOpenChange={setActionSheetOpen}
        title={selectedGoal?.title ?? ""}
        triggerPosition={clickPosition}
        actions={[
          {
            label: "Редактировать",
            onClick: () => {
              if (selectedGoal) {
                router.push(`/goals/${selectedGoal.id}`);
              }
            },
          },
          {
            label: "Отметить выполненной",
            onClick: handleMarkCompleted,
          },
        ]}
      />
    </div>
  );
}
