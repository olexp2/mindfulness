"use client";

import { useEffect, useState, useMemo } from "react";
import { loadStore, type ISODate, type StoreV3, formatISODate, isoToDate, type GlobalGoal, type ScheduledItem } from "@/lib/osoznannostStore";
import { NotebookCard as Card } from "@/components/NotebookCard";
import { ListLoadingSkeleton } from "@/components/LoadingSkeleton";
import { getIconByKey, type IconKey } from "@/lib/constants";
import { ChevronDown } from "lucide-react";
import RippleButton from "@/components/RippleButton";

function ProgressCard({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section className={`rounded-2xl p-4 note ${className || ""}`} style={style}>
      {children}
    </section>
  );
}

type PeriodType = "week" | "month" | "quarter" | "year" | "all";

type GoalStats = {
  goal: GlobalGoal;
  completedTasks: number;
  incompleteTasks: number;
  avgTasksPerDay: number;
  heatmapData: { date: ISODate; count: number }[];
};

function getPeriodDates(period: PeriodType): { start: Date; end: Date } {
  const now = new Date();
  let end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case "week":
      const dayOfWeek = start.getDay();
      const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
      start.setDate(start.getDate() + diffToMonday);
      const diffToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      end.setDate(end.getDate() + diffToSunday);
      break;
    case "month":
      start.setDate(1);
      end.setMonth(end.getMonth() + 1, 0);
      break;
    case "quarter":
      const currentMonth = start.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      start.setMonth(quarterStartMonth, 1);
      break;
    case "year":
      start.setMonth(0, 1);
      break;
    case "all":
      start = new Date(2000, 0, 1);
      break;
  }

  return { start, end };
}

function doesGoalPeriodIntersect(goal: GlobalGoal, periodStart: Date, periodEnd: Date): boolean {
  if (!goal.deadline) return true;

  const goalDeadline = isoToDate(goal.deadline);
  return goalDeadline >= periodStart;
}

function getAllDatesInPeriod(start: Date, end: Date): ISODate[] {
  const dates: ISODate[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(formatISODate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function calculateGoalStats(
  goal: GlobalGoal,
  store: StoreV3,
  periodStart: Date,
  periodEnd: Date
): GoalStats {
  const dates = getAllDatesInPeriod(periodStart, periodEnd);
  const heatmapData: { date: ISODate; count: number }[] = [];
  let completedTasks = 0;
  let incompleteTasks = 0;

  for (const date of dates) {
    let dayCompletedCount = 0;

    for (const weekStart in store.weeks) {
      const week = store.weeks[weekStart as ISODate];
      const day = week.days[date];

      if (day && day.schedule) {
        for (const task of day.schedule) {
          if (task.status === "skipped") continue;

          const isLinkedToGoal = 
            task.goalIds?.includes(goal.id) || 
            task.goalId === goal.id;

          if (isLinkedToGoal) {
            if (task.done) {
              completedTasks++;
              dayCompletedCount++;
            } else {
              const taskDate = isoToDate(date);
              if (taskDate < new Date()) {
                incompleteTasks++;
              }
            }
          }
        }
      }
    }

    heatmapData.push({ date, count: dayCompletedCount });
  }

  const daysWithTasks = heatmapData.filter(d => d.count > 0).length;
  const avgTasksPerDay = daysWithTasks > 0 ? completedTasks / daysWithTasks : 0;

  return {
    goal,
    completedTasks,
    incompleteTasks,
    avgTasksPerDay,
    heatmapData,
  };
}

export default function ProgressPage() {
  const [store, setStore] = useState<StoreV3 | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("week");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const data = loadStore();
    setStore(data);
    setLoaded(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.period-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const goalStats = useMemo(() => {
    if (!store || !store.goals) return [];

    const { start, end } = getPeriodDates(selectedPeriod);
    
    return store.goals
      .filter(goal => doesGoalPeriodIntersect(goal, start, end))
      .map(goal => calculateGoalStats(goal, store, start, end))
      .filter(stats => stats.completedTasks > 0 || stats.incompleteTasks > 0);
  }, [store, selectedPeriod]);

  if (!loaded) return <ListLoadingSkeleton />;

  const periods: { value: PeriodType; label: string }[] = [
    { value: "week", label: "Текущая неделя" },
    { value: "month", label: "Текущий месяц" },
    { value: "quarter", label: "Текущий квартал" },
    { value: "year", label: "Текущий год" },
    { value: "all", label: "За все время" },
  ];

  const selectedPeriodLabel = periods.find(p => p.value === selectedPeriod)?.label || "Текущая неделя";

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Прогресс</h1>
      </div>

      <div className="relative period-dropdown">
        <RippleButton
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          variant="ghost"
          className="flex w-full items-center justify-between rounded-2xl bg-neutral-100 px-4 py-3 text-sm font-medium text-neutral-900 transition-all duration-200 hover:bg-neutral-200 active:scale-[0.98] dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 h-auto"
        >
          <span>{selectedPeriodLabel}</span>
          <ChevronDown 
            size={20} 
            className={[
              "transition-transform duration-200",
              isDropdownOpen ? "rotate-180" : ""
            ].join(" ")}
          />
        </RippleButton>

        {isDropdownOpen && (
          <div className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
            {periods.map(period => (
              <RippleButton
                key={period.value}
                onClick={() => {
                  setSelectedPeriod(period.value);
                  setIsDropdownOpen(false);
                }}
                variant="ghost"
                className={[
                  "flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-all duration-200 h-auto rounded-none",
                  selectedPeriod === period.value
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-black hover:bg-neutral-900 dark:hover:bg-white"
                    : "text-neutral-700 hover:bg-neutral-100 dark:text-slate-300 dark:hover:bg-slate-700",
                ].join(" ")}
              >
                <span>{period.label}</span>
                {selectedPeriod === period.value && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </RippleButton>
            ))}
          </div>
        )}
      </div>

      {goalStats.length === 0 ? (
        <Card variant="note-soft">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 text-6xl opacity-50">📊</div>
            <p className="text-lg font-medium text-neutral-700 dark:text-slate-300">
              Нет данных за выбранный период
            </p>
            <p className="mt-2 text-sm text-neutral-500 dark:text-slate-400">
              Выполняйте задачи, связанные с целями, чтобы увидеть статистику
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {goalStats.map((stats, index) => {
            const Icon = getIconByKey(stats.goal.icon as IconKey);
            const color = stats.goal.color || "#a855f7";
            const totalTasks = stats.completedTasks + stats.incompleteTasks;
            const completionRate = totalTasks > 0 
              ? Math.round((stats.completedTasks / totalTasks) * 100) 
              : 0;

            const heatmapWeeks: { date: ISODate; count: number }[][] = [];
            for (let i = 0; i < stats.heatmapData.length; i += 7) {
              heatmapWeeks.push(stats.heatmapData.slice(i, i + 7));
            }
            
            const gapSize = heatmapWeeks.length <= 4 ? 6 : heatmapWeeks.length <= 8 ? 4 : 3;

            return (
              <ProgressCard
                key={stats.goal.id}
                className="animate-in fade-in slide-in-from-bottom-4"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'backwards',
                }}
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
                      style={{ backgroundColor: color }}
                    >
                      <Icon size={24} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                        {stats.goal.title}
                      </h3>
                      {stats.goal.deadline && (
                        <p className="mt-1 text-sm text-neutral-600 dark:text-slate-400">
                          Дедлайн: {new Date(stats.goal.deadline).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-3 text-white shadow-md">
                      <div className="text-xs font-bold uppercase tracking-wider opacity-90">
                        Выполнено
                      </div>
                      <div className="mt-1 text-2xl font-extrabold">{stats.completedTasks}</div>
                    </div>

                    <div className="rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-3 text-white shadow-md">
                      <div className="text-xs font-bold uppercase tracking-wider opacity-90">
                        Не выполнено
                      </div>
                      <div className="mt-1 text-2xl font-extrabold">{stats.incompleteTasks}</div>
                    </div>

                    <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-3 text-white shadow-md">
                      <div className="text-xs font-bold uppercase tracking-wider opacity-90">
                        В день
                      </div>
                      <div className="mt-1 text-2xl font-extrabold">
                        {stats.avgTasksPerDay.toFixed(1)}
                      </div>
                    </div>
                  </div>

                  <div className="w-full">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-bold text-neutral-700 dark:text-slate-300">
                        Достижение цели
                      </h4>
                      <span className="text-xs text-neutral-600 dark:text-slate-400">
                        {completionRate}% выполнено
                      </span>
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: `${gapSize}px` }}>
                      {heatmapWeeks.length === 0 && (
                        <div className="text-sm text-neutral-500 dark:text-slate-400">
                          Нет данных за выбранный период
                        </div>
                      )}
                      {heatmapWeeks.map((week, weekIndex) => (
                        <div key={weekIndex} style={{ display: "flex", gap: `${gapSize}px` }}>
                          {week.map((day) => {
                            const date = isoToDate(day.date);
                            const isToday = day.date === formatISODate(new Date());
                            
                            let bgColor = "rgb(229, 231, 235)";
                            
                            if (day.count > 0) {
                              const intensity = Math.min(0.3 + (day.count * 0.15), 1);
                              const r = Math.round(59 + (255 - 59) * (1 - intensity));
                              const g = Math.round(130 + (255 - 130) * (1 - intensity));
                              const b = Math.round(246 + (255 - 246) * (1 - intensity));
                              bgColor = `rgb(${r}, ${g}, ${b})`;
                            }

                            const squareSize = `calc((100% - ${gapSize * 6}px) / 7)`;

                            return (
                              <div
                                key={day.date}
                                className="group relative rounded transition-all hover:scale-110"
                                style={{ 
                                  width: squareSize,
                                  aspectRatio: "1",
                                  minWidth: "12px",
                                  minHeight: "12px",
                                  backgroundColor: bgColor
                                }}
                                title={`${date.getDate()} ${["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"][date.getMonth()]}: ${day.count} ${day.count === 1 ? 'задача' : day.count < 5 ? 'задачи' : 'задач'}`}
                              >
                                {day.count > 0 && (
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                                    <div className="rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                      {day.count}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ProgressCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
