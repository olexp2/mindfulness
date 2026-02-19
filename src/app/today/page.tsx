"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Plus } from "lucide-react";
import { PageLoadingSkeleton } from "@/components/LoadingSkeleton";
import { triggerHaptic } from "@/lib/haptics";
import TaskCheckbox from "@/components/TaskCheckbox";
import { ActionSheet } from "@/components/ActionSheet";
import { Textarea } from "@/components/ui/textarea";

const SELECTED_DAY_KEY = "mindfulness:selectedDay";
const SWIPE_THRESHOLD = 50;

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
  const [weekTaskStatus, setWeekTaskStatus] = useState<Record<string, "all_done" | "has_pending" | "none">>({});
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevWeekStartRef = useRef<ISODate | null>(null);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const store = loadStore();
    const week = getOrCreateWeek(store, weekStart);
    const day = getOrCreateDay(week, selectedDate);
    setSchedule(sortSchedule(day.schedule));
    setReflection(day.reflection);
    setIsEditingNote(!!day.reflection);
    setGoals(store.goals ?? []);

    const status: Record<string, "all_done" | "has_pending" | "none"> = {};
    for (const dow of [1, 2, 3, 4, 5, 6, 7] as const) {
      const dateISO = getDayOfWeekISO(weekStart, dow);
      const dayData = week.days[dateISO];
      if (!dayData || dayData.schedule.length === 0) {
        status[dateISO] = "none";
      } else {
        const nonSkipped = dayData.schedule.filter(t => t.status !== "skipped");
        if (nonSkipped.length === 0) {
          status[dateISO] = "none";
        } else {
          status[dateISO] = nonSkipped.every(t => t.done) ? "all_done" : "has_pending";
        }
      }
    }
    setWeekTaskStatus(status);

    saveStore(store);
    setLoaded(true);
  }, [selectedDate, weekStart]);

  function recalcWeekTaskStatus() {
    const store = loadStore();
    const week = getOrCreateWeek(store, weekStart);
    const status: Record<string, "all_done" | "has_pending" | "none"> = {};
    for (const dow of [1, 2, 3, 4, 5, 6, 7] as const) {
      const dateISO = getDayOfWeekISO(weekStart, dow);
      const dayData = week.days[dateISO];
      if (!dayData || dayData.schedule.length === 0) {
        status[dateISO] = "none";
      } else {
        const nonSkipped = dayData.schedule.filter(t => t.status !== "skipped");
        if (nonSkipped.length === 0) {
          status[dateISO] = "none";
        } else {
          status[dateISO] = nonSkipped.every(t => t.done) ? "all_done" : "has_pending";
        }
      }
    }
    setWeekTaskStatus(status);
  }

  function persist(nextSchedule = schedule, nextReflection = reflection) {
    const store = loadStore();
    const week = getOrCreateWeek(store, weekStart);
    const day = getOrCreateDay(week, selectedDate);
    day.schedule = clampSchedule(sortSchedule(nextSchedule));
    day.reflection = nextReflection;
    saveStore(store);
    recalcWeekTaskStatus();
  }

  function handleChangeDay(date: ISODate) {
    setSelectedDate(date);
    localStorage.setItem(SELECTED_DAY_KEY, date);
    triggerHaptic('light');
  }

  function goToToday() {
    setSelectedDate(todayISO);
    localStorage.setItem(SELECTED_DAY_KEY, todayISO);
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

  const goToPreviousWeek = useCallback(() => {
    prevWeekStartRef.current = weekStart;
    setSlideDirection("right");
    setIsAnimating(true);
    const currentWeekStartDate = isoToDate(weekStart);
    currentWeekStartDate.setDate(currentWeekStartDate.getDate() - 7);
    const newWeekStart = getWeekStartISO(currentWeekStartDate);
    const newSelectedDate = getDayOfWeekISO(newWeekStart, 1);
    setSelectedDate(newSelectedDate);
    localStorage.setItem(SELECTED_DAY_KEY, newSelectedDate);
    triggerHaptic('light');
    setTimeout(() => setIsAnimating(false), 300);
  }, [weekStart]);

  const goToNextWeek = useCallback(() => {
    prevWeekStartRef.current = weekStart;
    setSlideDirection("left");
    setIsAnimating(true);
    const currentWeekStartDate = isoToDate(weekStart);
    currentWeekStartDate.setDate(currentWeekStartDate.getDate() + 7);
    const newWeekStart = getWeekStartISO(currentWeekStartDate);
    const newSelectedDate = getDayOfWeekISO(newWeekStart, 1);
    setSelectedDate(newSelectedDate);
    localStorage.setItem(SELECTED_DAY_KEY, newSelectedDate);
    triggerHaptic('light');
    setTimeout(() => setIsAnimating(false), 300);
  }, [weekStart]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaY) > Math.abs(deltaX)) return;

    if (deltaX < 0) {
      goToNextWeek();
    } else {
      goToPreviousWeek();
    }
  }, [goToNextWeek, goToPreviousWeek]);

  const activeTasks = schedule.filter((x) => !x.done && x.status !== "skipped");
  const doneTasks = schedule.filter((x) => x.done && x.status !== "skipped");
  const skippedTasks = schedule.filter((x) => x.status === "skipped");
  const allActive = [...activeTasks, ...skippedTasks];

  const doneCount = doneTasks.length;
  const totalCount = schedule.filter((x) => x.status !== "skipped").length;
  const progress = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  const weekDates = ([1, 2, 3, 4, 5, 6, 7] as const).map((dow) => ({
    dow,
    date: getDayOfWeekISO(weekStart, dow),
  }));

  if (!loaded) return <PageLoadingSkeleton />;

  const monthYearLabel = formatMonthYear(isoToDate(selectedDate));

  function renderTaskCard(item: ScheduledItem, index: number, isDone: boolean) {
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

    return (
      <div
        key={item.id}
        onClick={(e) => handleTaskClick(item, e)}
        className="relative flex items-center cursor-pointer transition-all duration-200 active:scale-[0.98] animate-in fade-in slide-in-from-bottom-2"
        style={{
          animationDelay: `${index * 50}ms`,
          animationFillMode: 'backwards',
          opacity: isSkipped ? 0.5 : 1,
          backgroundColor: isDone ? 'rgba(156, 163, 175, 0.08)' : undefined,
          minHeight: '72px',
          gap: '24px',
          paddingTop: '20px',
          paddingBottom: '20px',
          paddingLeft: '28px',
          paddingRight: '28px',
        }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-r-sm"
          style={{ backgroundColor: isDone || isSkipped ? '#9ca3af' : accent }}
        />

        <div
          className="flex shrink-0 items-center justify-center rounded-2xl"
          style={{
            width: '56px',
            height: '56px',
            backgroundColor: isDone || isSkipped ? 'rgba(156, 163, 175, 0.15)' : `${accent}20`,
          }}
        >
          <Icon
            size={32}
            strokeWidth={1.8}
            style={{
              color: isDone || isSkipped ? '#9ca3af' : accent,
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <span
            className={[
              "font-bold transition-all duration-300",
              isDone
                ? "line-through text-neutral-400 dark:text-slate-500"
                : isSkipped
                  ? "text-neutral-400 dark:text-slate-500"
                  : "text-neutral-900 dark:text-white",
            ].join(" ")}
            style={{
              fontSize: '22px',
              lineHeight: '28px',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}
          >
            {item.title}
          </span>
          <span
            style={{ fontSize: '13px', lineHeight: '18px', color: '#9ca3af' }}
          >
            {timeDisplay}
          </span>
        </div>

        <div
          className="shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            toggleDone(item.id);
          }}
        >
          <TaskCheckbox done={item.done} onToggle={() => {}} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div>
        <span
          onClick={goToToday}
          className="text-[28px] font-bold text-neutral-900 dark:text-white cursor-pointer"
        >
          {monthYearLabel}
        </span>

        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="select-none"
          style={{ marginTop: '20px' }}
        >
          <div
            className="flex justify-between gap-1.5"
            style={{
              animation: isAnimating
                ? slideDirection === "left"
                  ? "slideInFromRight 300ms ease-out forwards"
                  : "slideInFromLeft 300ms ease-out forwards"
                : undefined,
            }}
          >
            {weekDates.map(({ dow, date }) => {
              const isSelected = date === selectedDate;
              const isToday = date === todayISO;
              const taskStatus = weekTaskStatus[date];
              return (
                <div
                  key={date}
                  onClick={() => handleChangeDay(date)}
                  className="relative flex flex-1 flex-col items-center py-5 cursor-pointer transition-all duration-200 active:scale-95"
                >
                  {isSelected && (
                    <div
                      className="absolute rounded-full bg-gradient-to-br from-[var(--color-dark-from)] to-[var(--color-dark-to)] shadow-lg shadow-purple-500/25"
                      style={{
                        width: '46px',
                        height: '46px',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  )}
                  <span className={[
                    "relative z-10 text-[10px] font-bold uppercase tracking-wider",
                    isSelected ? "text-white" : "text-neutral-400 dark:text-slate-500",
                  ].join(" ")}>
                    {DOW_LABEL[dow]}
                  </span>
                  <span className={[
                    "relative z-10 text-[19px] font-extrabold mt-1",
                    isSelected
                      ? "text-white"
                      : isToday
                        ? "text-[var(--color-dark-from)]"
                        : "text-neutral-700 dark:text-slate-300",
                  ].join(" ")}>
                    {isoToDate(date).getDate()}
                  </span>
                  {taskStatus && taskStatus !== "none" && (
                    <div className="relative z-10 mt-3 flex items-center justify-center" style={{ minHeight: '8px' }}>
                      <div
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          backgroundColor: taskStatus === "all_done" ? '#10b981' : '#9ca3af',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-1" style={{ marginTop: '20px' }}>
          <div className="mb-4 flex items-end justify-between">
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
        </div>

        <div>
          {allActive.length === 0 && doneTasks.length === 0 ? (
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
          ) : (
            <>
              {allActive.length > 0 && (
                <div className="overflow-hidden divide-y divide-neutral-200 dark:divide-slate-700 border-y border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                  {allActive.map((item, index) => renderTaskCard(item, index, false))}
                </div>
              )}

              {doneTasks.length > 0 && (
                <div className="mt-5">
                  <div className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-500">
                    Выполнено
                  </div>
                  <div className="overflow-hidden divide-y divide-neutral-200 dark:divide-slate-700 border-y border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                    {doneTasks.map((item, index) => renderTaskCard(item, index, true))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

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

      <button
        onClick={() => {
          triggerHaptic('medium');
          router.push("/today/new");
        }}
        className="fixed z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-dark-from)] to-[var(--color-dark-to)] shadow-xl shadow-purple-500/30 transition-all duration-200 hover:scale-110 active:scale-95"
        style={{
          bottom: '100px',
          right: 'max(20px, calc(50% - 220px))',
        }}
        aria-label="Создать задачу"
      >
        <Plus size={32} strokeWidth={2.5} style={{ color: '#ffffff' }} />
      </button>

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
                    setShowDeleteConfirm(true);
                  },
                },
              ]
        }
      />
    </div>
  );
}
