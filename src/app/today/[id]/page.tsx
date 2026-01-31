"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  loadStore,
  saveStore,
  getWeekStartISO,
  hmToMinutes,
  sortSchedule,
  clampSchedule,
  formatISODate,
  getOrCreateWeek,
  getOrCreateDay,
  uid,
  type ScheduledItem,
  type GlobalGoal,
  type ISODate,
} from "@/lib/osoznannostStore";
import { COLOR_PRESETS, ICONS, type IconKey } from "@/lib/constants";
import { MoreVertical, Trash2, Copy } from "lucide-react";
import { ActionSheet } from "@/components/ActionSheet";
import { triggerHaptic } from "@/lib/haptics";

const SELECTED_DAY_KEY = "mindfulness:selectedDay";

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [loaded, setLoaded] = useState(false);
  const [task, setTask] = useState<ScheduledItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<ISODate | null>(null);

  const [title, setTitle] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("09:30");
  const [isAllDay, setIsAllDay] = useState(false);
  const [color, setColor] = useState<(typeof COLOR_PRESETS)[number]>(COLOR_PRESETS[0]);
  const [iconKey, setIconKey] = useState<IconKey>("target");
  const [goals, setGoals] = useState<GlobalGoal[]>([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [recurrenceType, setRecurrenceType] = useState<"once" | "daily" | "weekly" | "monthly">("once");
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<(1 | 2 | 3 | 4 | 5 | 6 | 7)[]>([]);

  const [titleError, setTitleError] = useState("");
  const [timeError, setTimeError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  useEffect(() => {
    const store = loadStore();
    setGoals(store.goals ?? []);

    const savedDate = localStorage.getItem(SELECTED_DAY_KEY);
    const dateToUse = (savedDate && /^\d{4}-\d{2}-\d{2}$/.test(savedDate) ? savedDate : null) as ISODate | null;
    
    if (!dateToUse) {
      router.back();
      return;
    }

    setSelectedDate(dateToUse);

    const weekStart = getWeekStartISO(new Date(`${dateToUse}T00:00:00`));
    const week = store.weeks[weekStart];
    const day = week?.days[dateToUse];
    const foundTask = day?.schedule?.find(t => t.id === taskId);

    if (!foundTask) {
      router.back();
      return;
    }

    setTask(foundTask);
    setTitle(foundTask.title);
    setStart(foundTask.start);
    setEnd(foundTask.end);
    setIsAllDay(foundTask.start === "00:00" && foundTask.end === "23:59");
    const taskColor = foundTask.color && COLOR_PRESETS.includes(foundTask.color as any) 
      ? (foundTask.color as typeof COLOR_PRESETS[number])
      : COLOR_PRESETS[0];
    setColor(taskColor);
    const taskIcon = foundTask.icon && ICONS.some(i => i.key === foundTask.icon)
      ? (foundTask.icon as IconKey)
      : "target";
    setIconKey(taskIcon);
    setSelectedGoalIds(foundTask.goalIds ?? []);
    setRecurrenceType(foundTask.recurrence?.type ?? "once");
    setSelectedDaysOfWeek(foundTask.recurrence?.daysOfWeek ?? []);
    setLoaded(true);
  }, [taskId, router]);

  const timeOk = isAllDay || hmToMinutes(end) > hmToMinutes(start);

  useEffect(() => {
    if (title.trim() && titleError) {
      setTitleError("");
    }
  }, [title, titleError]);

  useEffect(() => {
    if (timeOk && timeError) {
      setTimeError("");
    }
  }, [start, end, timeOk, timeError]);

  function handleSave() {
    const t = title.trim();
    if (!t) {
      setTitleError("Введите название задачи");
      return;
    }

    if (!isAllDay) {
      const s = hmToMinutes(start);
      const e = hmToMinutes(end);
      if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) {
        setTimeError("Время окончания должно быть позже начала");
        return;
      }
    }

    if (recurrenceType === "weekly" && selectedDaysOfWeek.length === 0) {
      setTimeError("Выберите хотя бы один день недели");
      return;
    }

    if (!selectedDate || !task) return;

    setIsSaving(true);

    const store = loadStore();

    const datesToUpdate: ISODate[] = [];

    if (recurrenceType === "once") {
      datesToUpdate.push(selectedDate);
    } else if (recurrenceType === "daily") {
      const baseDate = new Date(`${selectedDate}T00:00:00`);
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(baseDate);
        currentDate.setDate(baseDate.getDate() + i);
        datesToUpdate.push(formatISODate(currentDate));
      }
    } else if (recurrenceType === "weekly") {
      const baseDate = new Date(`${selectedDate}T00:00:00`);
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(baseDate);
        currentDate.setDate(baseDate.getDate() + i);
        const dayOfWeek = ((currentDate.getDay() + 6) % 7) + 1;
        if (selectedDaysOfWeek.includes(dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7)) {
          datesToUpdate.push(formatISODate(currentDate));
        }
      }
    }

    for (const targetDate of datesToUpdate) {
      const weekStart = getWeekStartISO(new Date(`${targetDate}T00:00:00`));
      const week = getOrCreateWeek(store, weekStart);
      const day = getOrCreateDay(week, targetDate);

      const existingTaskIndex = day.schedule.findIndex(item => item.id === taskId);

      if (existingTaskIndex !== -1) {
        const updatedTask: ScheduledItem = {
          ...day.schedule[existingTaskIndex],
          title: t,
          start: isAllDay ? "00:00" : start,
          end: isAllDay ? "23:59" : end,
          color,
          icon: iconKey,
          goalIds: selectedGoalIds.length > 0 ? selectedGoalIds : undefined,
        };

        day.schedule = clampSchedule(
          sortSchedule(
            day.schedule.map(item => item.id === taskId ? updatedTask : item)
          )
        );
      } else {
        if (day.schedule.length >= 20) {
          continue;
        }

        const newTask: ScheduledItem = {
          id: uid("si"),
          title: t,
          start: isAllDay ? "00:00" : start,
          end: isAllDay ? "23:59" : end,
          done: false,
          color,
          icon: iconKey,
          goalIds: selectedGoalIds.length > 0 ? selectedGoalIds : undefined,
          status: "active",
        };

        day.schedule = clampSchedule(sortSchedule([...day.schedule, newTask]));
      }
    }

    saveStore(store);
    
    setTimeout(() => {
      router.back();
    }, 100);
  }

  function handleDelete() {
    if (!selectedDate || !task) return;

    const store = loadStore();
    const weekStart = getWeekStartISO(new Date(`${selectedDate}T00:00:00`));
    const week = store.weeks[weekStart];
    const day = week?.days[selectedDate];

    if (!week || !day) return;

    day.schedule = day.schedule.filter(item => item.id !== taskId);
    saveStore(store);
    
    triggerHaptic("medium");
    router.back();
  }

  function handleDuplicate() {
    if (!selectedDate || !task) return;

    const store = loadStore();
    const weekStart = getWeekStartISO(new Date(`${selectedDate}T00:00:00`));
    const week = store.weeks[weekStart];
    const day = week?.days[selectedDate];

    if (!week || !day) return;

    const duplicatedTask: ScheduledItem = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: `${task.title} (копия)`,
      done: false,
      streak: 0,
    };

    day.schedule = clampSchedule(sortSchedule([...day.schedule, duplicatedTask]));
    saveStore(store);
    
    triggerHaptic("success");
    router.back();
  }

  if (!loaded || !task) return null;

  return (
    <>
      <div className="flex flex-col h-full bg-white dark:bg-[#1f2937] animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-white/10 animate-in fade-in slide-in-from-top duration-300">
            <button 
                onClick={() => router.back()}
                className="text-base font-medium text-neutral-500 transition-all duration-200 hover:text-neutral-900 hover:scale-105 active:scale-95 dark:text-slate-400 dark:hover:text-white"
            >
                Отмена
            </button>
            <div className="text-lg font-bold text-neutral-900 dark:text-white">Редактировать</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  triggerHaptic("light");
                  setIsActionSheetOpen(true);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition-all duration-200 hover:bg-neutral-100 hover:text-neutral-900 active:scale-90 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Меню"
              >
                <MoreVertical size={20} strokeWidth={2.5} />
              </button>
              <button 
                  onClick={handleSave}
                  disabled={!title.trim() || !timeOk || isSaving}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100 dark:bg-white dark:text-neutral-900"
              >
                  {isSaving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-24">
            <div className="space-y-6 max-w-lg mx-auto">
                 <label className="block animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '50ms', animationFillMode: 'backwards' }}>
                    <span className="mb-2 block text-sm font-bold text-neutral-600 dark:text-slate-300 uppercase tracking-wider">
                      Название
                    </span>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Например: Медитация"
                      className={[
                        "w-full rounded-2xl border-2 bg-neutral-100 px-5 py-4 text-lg font-medium text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:outline-none dark:bg-slate-800 dark:text-white dark:focus:border-white dark:focus:bg-slate-800 transition-all",
                        titleError ? "border-red-500 bg-red-50 dark:bg-red-900/20" : "border-transparent"
                      ].join(" ")}
                      autoFocus
                    />
                    {titleError && (
                      <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 animate-in slide-in-from-top-1 duration-200">
                        {titleError}
                      </p>
                    )}
                  </label>

                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
                    <label className="flex items-center justify-between rounded-2xl border-2 border-transparent bg-neutral-100 px-5 py-4 cursor-pointer transition-all duration-200 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700">
                      <span className="text-base font-medium text-neutral-900 dark:text-white">
                        Задача на весь день
                      </span>
                      <input
                        type="checkbox"
                        checked={isAllDay}
                        onChange={(e) => setIsAllDay(e.target.checked)}
                        className="h-6 w-6 rounded-lg border-2 border-neutral-300 text-neutral-900 focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 transition-all dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:ring-white"
                      />
                    </label>
                  </div>

                  {!isAllDay && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}>
                    <div className="grid grid-cols-2 gap-5">
                      <label>
                        <span className="mb-2 block text-sm font-bold text-neutral-600 dark:text-slate-300 uppercase tracking-wider">
                          Начало
                        </span>
                        <input
                          type="time"
                          value={start}
                          onChange={(e) => setStart(e.target.value)}
                          className={[
                            "w-full rounded-2xl border-2 bg-neutral-100 px-4 py-4 text-lg font-medium text-neutral-900 focus:border-neutral-900 focus:bg-white focus:outline-none dark:bg-slate-800 dark:text-white dark:focus:border-white transition-all",
                            timeError ? "border-red-500 bg-red-50 dark:bg-red-900/20" : "border-transparent"
                          ].join(" ")}
                        />
                      </label>
                      <label>
                        <span className="mb-2 block text-sm font-bold text-neutral-600 dark:text-slate-300 uppercase tracking-wider">
                          Конец
                        </span>
                        <input
                          type="time"
                          value={end}
                          onChange={(e) => setEnd(e.target.value)}
                          className={[
                            "w-full rounded-2xl border-2 bg-neutral-100 px-4 py-4 text-lg font-medium text-neutral-900 focus:border-neutral-900 focus:bg-white focus:outline-none dark:bg-slate-800 dark:text-white dark:focus:border-white transition-all",
                            timeError ? "border-red-500 bg-red-50 dark:bg-red-900/20" : "border-transparent"
                          ].join(" ")}
                        />
                      </label>
                    </div>
                    {timeError && (
                      <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 animate-in slide-in-from-top-1 duration-200">
                        {timeError}
                      </p>
                    )}
                  </div>
                  )}

                  {selectedDate && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '175ms', animationFillMode: 'backwards' }}>
                    <label>
                      <span className="mb-2 block text-sm font-bold text-neutral-600 dark:text-slate-300 uppercase tracking-wider">
                        День
                      </span>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value as ISODate)}
                        className="w-full rounded-2xl border-2 border-transparent bg-neutral-100 px-5 py-4 text-lg font-medium text-neutral-900 focus:border-neutral-900 focus:bg-white focus:outline-none dark:bg-slate-800 dark:text-white dark:focus:border-white transition-all"
                      />
                    </label>
                  </div>
                  )}

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

                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
                    <span className="mb-3 block text-sm font-bold text-neutral-600 dark:text-slate-300 uppercase tracking-wider">
                      Частота выполнения
                    </span>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "once", label: "1 раз" },
                        { value: "daily", label: "каждый день" },
                        { value: "weekly", label: "по дням недели" },
                      ].map(({ value, label }) => {
                        const active = recurrenceType === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setRecurrenceType(value as typeof recurrenceType)}
                            className={[
                              "rounded-2xl border-2 px-4 py-3 text-sm font-bold transition-all duration-200",
                              active
                                ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black scale-105 shadow-lg"
                                : "border-transparent bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:scale-105 active:scale-95 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
                            ].join(" ")}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {recurrenceType === "weekly" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '350ms', animationFillMode: 'backwards' }}>
                      <span className="mb-3 block text-sm font-bold text-neutral-600 dark:text-slate-300 uppercase tracking-wider">
                        Дни недели
                      </span>
                      <div className="grid grid-cols-7 gap-2">
                        {[
                          { day: 1, label: "Пн" },
                          { day: 2, label: "Вт" },
                          { day: 3, label: "Ср" },
                          { day: 4, label: "Чт" },
                          { day: 5, label: "Пт" },
                          { day: 6, label: "Сб" },
                          { day: 7, label: "Вс" },
                        ].map(({ day, label }) => {
                          const active = selectedDaysOfWeek.includes(day as 1 | 2 | 3 | 4 | 5 | 6 | 7);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                const dayValue = day as 1 | 2 | 3 | 4 | 5 | 6 | 7;
                                setSelectedDaysOfWeek(prev =>
                                  active
                                    ? prev.filter(d => d !== dayValue)
                                    : [...prev, dayValue].sort()
                                );
                              }}
                              className={[
                                "aspect-square rounded-xl border-2 text-xs font-bold transition-all duration-200",
                                active
                                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black scale-110 shadow-lg"
                                  : "border-transparent bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:scale-105 active:scale-95 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
                              ].join(" ")}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {goals.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '350ms', animationFillMode: 'backwards' }}>
                      <span className="mb-3 block text-sm font-bold text-neutral-600 dark:text-slate-300 uppercase tracking-wider">
                        Привязать к целям <span className="text-xs font-normal opacity-60">(опционально)</span>
                      </span>
                      <div className="space-y-2">
                        {goals
                          .filter((g) => g.status !== "completed")
                          .map((g) => {
                            const active = selectedGoalIds.includes(g.id);
                            return (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => {
                                  setSelectedGoalIds(prev =>
                                    active
                                      ? prev.filter(id => id !== g.id)
                                      : [...prev, g.id]
                                  );
                                }}
                                className={[
                                  "w-full rounded-2xl border-2 px-5 py-3 text-left text-base font-medium transition-all duration-200",
                                  active
                                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black scale-105 shadow-lg"
                                    : "border-transparent bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:scale-105 active:scale-95 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                                ].join(" ")}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{g.title}</span>
                                  {active && (
                                    <svg
                                      width="20"
                                      height="20"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="animate-in zoom-in duration-200"
                                    >
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
            </div>
        </div>
      </div>

      <ActionSheet
        open={isActionSheetOpen}
        onOpenChange={setIsActionSheetOpen}
        title="Действия с задачей"
        actions={[
          {
            label: "Дублировать задачу",
            onClick: handleDuplicate,
          },
          {
            label: "Удалить задачу",
            onClick: handleDelete,
            destructive: true,
          },
        ]}
      />
    </>
  );
}
