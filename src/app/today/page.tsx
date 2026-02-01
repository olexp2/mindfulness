"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  loadStore,
  saveStore,
  getOrCreateWeek,
  getOrCreateDay,
  sortSchedule,
  clampSchedule,
  getTodayISO,
  getWeekStartISO,
  getDayOfWeekISO,
  DOW_LABEL,
  type ISODate,
  type ScheduledItem,
} from "@/lib/osoznannostStore";
import { NotebookCard as Card } from "@/components/NotebookCard";
import ProgressBar from "@/components/ProgressBar";
import { getIconByKey } from "@/lib/constants";
import { Pencil, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { PageLoadingSkeleton } from "@/components/LoadingSkeleton";
import { triggerHaptic } from "@/lib/haptics";
import RippleButton from "@/components/RippleButton";
import TaskCheckbox from "@/components/TaskCheckbox";
import { ActionSheet } from "@/components/ActionSheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const SELECTED_DAY_KEY = "mindfulness:selectedDay";

const MONTHS = [
  "Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь",
];

function isoToDate(iso: ISODate) {
  return new Date(`${iso}T00:00:00`);
}

function formatMonthYear(d: Date) {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function TodayPage() {
  const router = useRouter();
  const todayISO = useMemo(() => getTodayISO(), []);

  const [selectedDate, setSelectedDate] = useState<ISODate>(() => {
    if (typeof window === "undefined") return todayISO;
    const saved = localStorage.getItem(SELECTED_DAY_KEY);
    if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) return saved as ISODate;
    return todayISO;
  });

  const weekStart = useMemo(
    () => getWeekStartISO(isoToDate(selectedDate)),
    [selectedDate]
  );

  const [schedule, setSchedule] = useState<ScheduledItem[]>([]);
  const [reflection, setReflection] = useState("");
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [goals, setGoals] = useState<Array<{ id: string; title: string; color?: string; icon?: string }>>([]);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ScheduledItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | undefined>(undefined);

  useEffect(() => {
    const store = loadStore();
    const week = getOrCreateWeek(store, weekStart);
    const day = getOrCreateDay(week, selectedDate);
    setSchedule(sortSchedule(day.schedule));
    setReflection(day.reflection);
    setIsEditingNote(!!day.reflection);
    setGoals(store.goals ?? []);
    saveStore(store);
    setLoaded(true);
  }, [selectedDate, weekStart]);

  function persist(nextSchedule = schedule, nextReflection = reflection) {
    const store = loadStore();
    const week = getOrCreateWeek(store, weekStart);
    const day = getOrCreateDay(week, selectedDate);
    day.schedule = clampSchedule(sortSchedule(nextSchedule));
    day.reflection = nextReflection;
    saveStore(store);
  }

  function handleChangeDay(date: ISODate) {
    setSelectedDate(date);
    localStorage.setItem(SELECTED_DAY_KEY, date);
    triggerHaptic('light');
  }

  function toggleDone(id: string) {
    const item = schedule.find((x) => x.id === id);
    const next = schedule.map((x) => (x.id === id ? { ...x, done: !x.done } : x));
    const sorted = sortSchedule(next);
    setSchedule(sorted);
    persist(sorted, reflection);
    
    if (item) {
      triggerHaptic(item.done ? 'light' : 'success');
    }
  }

  function removeTask(id: string) {
    const next = schedule.filter((x) => x.id !== id);
    setSchedule(next);
    persist(next, reflection);
    triggerHaptic('medium');
  }

  function cancelTask(id: string) {
    const next = schedule.map((x) => (x.id === id ? { ...x, status: "skipped" as const } : x));
    setSchedule(next);
    persist(next, reflection);
    triggerHaptic('medium');
  }

  function activateTask(id: string) {
    const next = schedule.map((x) => (x.id === id ? { ...x, status: "active" as const } : x));
    setSchedule(next);
    persist(next, reflection);
    triggerHaptic('medium');
  }

  function handleDuplicateTask(task: ScheduledItem) {
    const baseTitle = task.title.replace(/\s*\(\d+\)$/, '');
    
    const existingNumbers: number[] = [];
    schedule.forEach(t => {
      const match = t.title.match(new RegExp(`^${baseTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\((\\d+)\\)$`));
      if (match) {
        existingNumbers.push(parseInt(match[1], 10));
      }
    });
    
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    
    const duplicatedTask: ScheduledItem = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: `${baseTitle} (${nextNumber})`,
      done: false,
      streak: 0,
    };
    const next = clampSchedule(sortSchedule([...schedule, duplicatedTask]));
    setSchedule(next);
    persist(next, reflection);
    triggerHaptic('success');
  }

  function handleTaskClick(task: ScheduledItem, event: React.MouseEvent) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    setClickPosition({ x, y });
    setSelectedTask(task);
    setActionSheetOpen(true);
    triggerHaptic('light');
  }

  function updateReflection(text: string) {
    setReflection(text);
    persist(schedule, text);
  }

  function goToPreviousWeek() {
    const currentWeekStartDate = isoToDate(weekStart);
    currentWeekStartDate.setDate(currentWeekStartDate.getDate() - 7);
    const newWeekStart = getWeekStartISO(currentWeekStartDate);
    const newSelectedDate = getDayOfWeekISO(newWeekStart, 1);
    setSelectedDate(newSelectedDate);
    localStorage.setItem(SELECTED_DAY_KEY, newSelectedDate);
    triggerHaptic('light');
  }

  function goToNextWeek() {
    const currentWeekStartDate = isoToDate(weekStart);
    currentWeekStartDate.setDate(currentWeekStartDate.getDate() + 7);
    const newWeekStart = getWeekStartISO(currentWeekStartDate);
    const newSelectedDate = getDayOfWeekISO(newWeekStart, 1);
    setSelectedDate(newSelectedDate);
    localStorage.setItem(SELECTED_DAY_KEY, newSelectedDate);
    triggerHaptic('light');
  }

  const doneCount = schedule.filter((x) => x.done && x.status !== "skipped").length;
  const totalCount = schedule.filter((x) => x.status !== "skipped").length;
  const progress = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  const weekDates = ([1, 2, 3, 4, 5, 6, 7] as const).map((dow) => ({
    dow,
    date: getDayOfWeekISO(weekStart, dow),
  }));

  if (!loaded) return <PageLoadingSkeleton />;

  const monthYearLabel = formatMonthYear(isoToDate(selectedDate));

  return (
    <>
      <div className="space-y-5">
        {/* Заголовок периода + переключатель режима просмотра */}
        <div className="flex items-center justify-between">
          <div className="text-[28px] font-bold text-white dark:text-white">
            {monthYearLabel}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex rounded-full bg-neutral-700 p-1.5 dark:bg-slate-700">
              <button className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl active:scale-95">
                Неделя
              </button>
              <button className="rounded-full px-5 py-2.5 text-sm font-semibold text-neutral-300 transition-all duration-200 hover:bg-neutral-600/50 hover:text-white active:scale-95 dark:text-slate-300 dark:hover:bg-slate-600/50">
                Месяц
              </button>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={goToPreviousWeek}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-90"
                aria-label="Предыдущая неделя"
              >
                <ChevronLeft size={20} strokeWidth={2.5} />
              </button>
              <button 
                onClick={goToNextWeek}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-90"
                aria-label="Следующая неделя"
              >
                <ChevronRight size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Навигация по дням недели */}
        <Card variant="note-soft">
          <div className="flex justify-between gap-1.5">
            {weekDates.map(({ dow, date }) => {
              const isSelected = date === selectedDate;
              const isToday = date === todayISO;
              return (
                <RippleButton
                  key={date}
                  onClick={() => handleChangeDay(date)}
                  variant={isSelected ? "default" : "ghost"}
                  className={[
                    "flex flex-1 flex-col items-center rounded-[20px] py-3.5 transition-all duration-200 h-auto",
                    isSelected
                      ? "bg-[#6366f1] text-white shadow-lg shadow-indigo-500/30 scale-105 hover:bg-[#6366f1]"
                      : "text-neutral-500 hover:bg-neutral-100 hover:scale-105 active:scale-95 dark:text-slate-400 dark:hover:bg-white/5",
                  ].join(" ")}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                    {DOW_LABEL[dow]}
                  </span>
                  <span className="text-[19px] font-extrabold mt-1.5">
                    {isoToDate(date).getDate()}
                  </span>
                  {isToday && (
                    <div className={[
                      "mt-2 h-1.5 w-1.5 rounded-full",
                      isSelected ? "bg-white" : "bg-indigo-500"
                    ].join(" ")} />
                  )}
                </RippleButton>
              );
            })}
          </div>
        </Card>
        {/* Прогресс дня */}
        <Card variant="note-soft">
          <div className="mb-4 flex items-end justify-between px-1">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400">
                Прогресс дня
              </div>
              <div className="mt-1 text-sm font-medium text-neutral-600 dark:text-slate-300">
                {doneCount === totalCount && totalCount > 0 ? "Все задачи выполнены! 🎉" : `${doneCount} из ${totalCount}`}
              </div>
            </div>
            <div className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {progress}%
            </div>
          </div>
          <ProgressBar value={progress} />
        </Card>

        {/* Дела (Список) */}
        <div className="space-y-3">
          {schedule.length === 0 ? (
            <>
              <Card variant="note-soft">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-400/20 to-amber-400/20">
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-orange-500 dark:text-orange-400"
                    >
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                  </div>
                  <p className="text-base font-semibold text-neutral-700 dark:text-slate-200">
                    Задачи на сегодня пока не заданы 🛠️
                  </p>
                </div>
              </Card>
              
            </>
          ) : (
            <>
              {schedule.map((item, index) => {
                const linkedGoals = item.goalIds
                  ? goals.filter(g => item.goalIds?.includes(g.id))
                  : [];
                
                const primaryGoal = linkedGoals[0];
                const accent = item.color ?? primaryGoal?.color ?? "#38bdf8";
                const Icon = getIconByKey(item.icon ?? primaryGoal?.icon);
                
                const timeDisplay = (item.start && item.end && item.start !== "00:00" && item.end !== "00:00")
                  ? `${item.start}–${item.end}`
                  : "В течение дня";

                const isSkipped = item.status === "skipped";
                
                const cardBgColor = isSkipped ? "#9ca3af" : accent;
                const borderColor = isSkipped 
                  ? "transparent" 
                  : item.done 
                    ? "#10b981" 
                    : "#eab308";

                return (
                  <div
                    key={item.id}
                    onClick={(e) => handleTaskClick(item, e)}
                    className="relative flex items-center gap-3 rounded-[24px] p-4 shadow-md transition-all duration-300 hover:shadow-lg active:scale-[0.98] animate-in fade-in slide-in-from-bottom-2 cursor-pointer"
                    style={{
                      backgroundColor: cardBgColor,
                      border: `3px solid ${borderColor}`,
                      animationDelay: `${index * 50}ms`,
                      animationFillMode: 'backwards',
                      opacity: isSkipped ? 0.6 : 1,
                    }}
                  >
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ml-3">
                      <Icon size={32} strokeWidth={2} className="text-white" />
                    </div>

                    <div className="flex-1 min-w-0 ml-3">
                      <h3 className={[
                        "text-base font-semibold text-white transition-all duration-300",
                        item.done ? "line-through opacity-80" : ""
                      ].join(" ")}>
                        {item.title.length > 200 ? `${item.title.slice(0, 200)}...` : item.title}
                      </h3>
                      <p className="mt-0.5 text-sm text-white/80">
                        {timeDisplay}
                      </p>
                    </div>

                    <div className="flex-shrink-0 mr-3">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDone(item.id);
                        }}
                        className="cursor-pointer"
                      >
                        <TaskCheckbox done={item.done} onToggle={() => {}} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Графический разделитель */}
                <div className="flex items-center gap-4 my-8">
                  <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/30"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/30"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/30"></div>
                  </div>
                  <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                </div>

                {/* Заметка дня */}
                {isEditingNote && (
                  <Card title="Заметка дня" subtitle="" variant="note">
                    <Textarea
                      value={reflection}
                      onChange={(e) => updateReflection(e.target.value)}
                      placeholder="Напишите мысли или итоги дня..."
                      rows={4}
                      autoFocus={true}
                      onBlur={() => {
                        if (!reflection.trim()) setIsEditingNote(false);
                      }}
                      className="bg-transparent border-none shadow-none px-0 py-0 text-base resize-none"
                    />
                  </Card>
                )}

      </div>

      {/* Кнопки внизу - прикреплены к навигационному меню */}
      <div className="fixed bottom-[88px] left-0 right-0 max-w-[480px] mx-auto px-3 space-y-0 pointer-events-none">
        <div className="bg-gradient-to-t from-white via-white/95 to-white/80 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-900/80 pt-8 pb-4 pointer-events-none">
          <div className="pointer-events-auto w-full">
            <Card variant="note-soft" contentClassName="px-0">
              <RippleButton
                onClick={() => {
                  triggerHaptic('medium');
                  router.push("/today/new");
                }}
                variant="ghost"
                className="group flex w-full flex-col items-center justify-center rounded-[20px] py-6 text-neutral-500 transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.02] active:scale-95 dark:text-slate-400 dark:hover:bg-white/5 h-auto"
              >
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-110 dark:from-white/10 dark:to-white/5 dark:shadow-none">
                  <Plus size={24} className="opacity-70 transition-all duration-300 group-hover:opacity-100 group-hover:scale-110" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider opacity-70 transition-opacity duration-300 group-hover:opacity-100">Создать задачу</span>
              </RippleButton>
            </Card>
          </div>

          {!reflection && !isEditingNote && (
            <div className="pointer-events-auto w-full mt-3">
              <Card variant="note-soft" contentClassName="px-0">
                <RippleButton
                  onClick={() => {
                    triggerHaptic('light');
                    setIsEditingNote(true);
                  }}
                  variant="ghost"
                  className="group flex w-full flex-col items-center justify-center rounded-[20px] py-6 text-neutral-500 transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.02] active:scale-95 dark:text-slate-400 dark:hover:bg-white/5 h-auto"
                >
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-110 dark:from-white/10 dark:to-white/5 dark:shadow-none">
                    <Pencil size={24} className="opacity-70 transition-all duration-300 group-hover:opacity-100 group-hover:scale-110" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider opacity-70 transition-opacity duration-300 group-hover:opacity-100">Добавить заметку</span>
                </RippleButton>
              </Card>
            </div>
          )}
        </div>
      </div>

      <ActionSheet
        open={actionSheetOpen}
        onOpenChange={(open) => {
          setActionSheetOpen(open);
          if (!open) {
            setShowDeleteConfirm(false);
            setSelectedTask(null);
          }
        }}
        title={showDeleteConfirm ? "Удалить задачу?" : (selectedTask?.title ?? "")}
        triggerPosition={clickPosition}
        actions={
          showDeleteConfirm
            ? [
                {
                  label: "Удалить",
                  destructive: true,
                  onClick: () => {
                    if (selectedTask) {
                      console.log('Deleting task:', selectedTask.id);
                      removeTask(selectedTask.id);
                      setActionSheetOpen(false);
                      setShowDeleteConfirm(false);
                      setSelectedTask(null);
                    }
                  },
                },
              ]
            : [
                {
                  label: "Редактировать",
                  onClick: () => {
                    if (selectedTask) {
                      router.push(`/today/${selectedTask.id}`);
                    }
                  },
                },
                {
                  label: "Дублировать",
                  onClick: () => {
                    if (selectedTask) {
                      handleDuplicateTask(selectedTask);
                    }
                  },
                },
                ...(selectedTask?.status === "skipped"
                  ? [
                      {
                        label: "Активировать задачу",
                        onClick: () => {
                          if (selectedTask) {
                            activateTask(selectedTask.id);
                          }
                        },
                      },
                    ]
                  : [
                      {
                        label: "Отменить задачу",
                        onClick: () => {
                          if (selectedTask) {
                            cancelTask(selectedTask.id);
                          }
                        },
                      },
                    ]),
                {
                  label: "Удалить",
                  destructive: true,
                  preventClose: true,
                  onClick: () => {
                    console.log('Showing delete confirmation');
                    setShowDeleteConfirm(true);
                  },
                },
              ]
        }
      />
    </>
  );
}
