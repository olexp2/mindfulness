"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loadStore,
  saveStore,
  getOrCreateWeek,
  getOrCreateDay,
  uid,
  sortSchedule,
  clampSchedule,
  hmToMinutes,
  getTodayISO,
  getWeekStartISO,
  type ISODate,
  type ScheduledItem,
} from "@/lib/osoznannostStore";
import { Card, Checkbox, GhostButton, PrimaryButton, RuledTextarea } from "@/components/NotebookUI";

const SELECTED_DAY_KEY = "osoznannost:selectedDay";

function prettyDate(iso: ISODate) {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

function isoToDate(iso: ISODate) {
  return new Date(`${iso}T00:00:00`);
}

function isBeforeISO(a: ISODate, b: ISODate) {
  // ISO YYYY-MM-DD сравнивается лексикографически корректно
  return a < b;
}

export default function TodayPage() {
  const todayISO = useMemo(() => getTodayISO(), []);

  const [selectedDate, setSelectedDate] = useState<ISODate>(() => {
    if (typeof window === "undefined") return todayISO;
    const saved = localStorage.getItem(SELECTED_DAY_KEY);
    if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) return saved as ISODate;
    return todayISO;
  });

  const weekStart = useMemo(() => getWeekStartISO(isoToDate(selectedDate)), [selectedDate]);

  const [schedule, setSchedule] = useState<ScheduledItem[]>([]);
  const [reflection, setReflection] = useState("");
  const [loaded, setLoaded] = useState(false);

  // форма добавления
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("09:30");

  useEffect(() => {
    const store = loadStore();
    const week = getOrCreateWeek(store, weekStart);
    const day = getOrCreateDay(week, selectedDate);
    setSchedule(sortSchedule(day.schedule));
    setReflection(day.reflection);
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

  function addItem() {
    const t = title.trim();
    if (!t) return;

    const s = hmToMinutes(start);
    const e = hmToMinutes(end);
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return;

    if (schedule.length >= 20) return;

    const next: ScheduledItem[] = [
      ...schedule,
      { id: uid("si"), title: t, start, end, done: false },
    ];
    const sorted = sortSchedule(next);
    setSchedule(sorted);
    persist(sorted, reflection);
    setTitle("");
  }

  function toggleDone(id: string) {
    const next = schedule.map((x) => (x.id === id ? { ...x, done: !x.done } : x));
    const sorted = sortSchedule(next);
    setSchedule(sorted);
    persist(sorted, reflection);
  }

  function markDone(id: string) {
    const next = schedule.map((x) => (x.id === id ? { ...x, done: true } : x));
    const sorted = sortSchedule(next);
    setSchedule(sorted);
    persist(sorted, reflection);
  }

  function markUndone(id: string) {
    const next = schedule.map((x) => (x.id === id ? { ...x, done: false } : x));
    const sorted = sortSchedule(next);
    setSchedule(sorted);
    persist(sorted, reflection);
  }

  function remove(id: string) {
    const next = schedule.filter((x) => x.id !== id);
    setSchedule(next);
    persist(next, reflection);
  }

  function updateItem(id: string, patch: Partial<ScheduledItem>) {
    const next = schedule.map((x) => (x.id === id ? { ...x, ...patch } : x));
    const sorted = sortSchedule(next);
    setSchedule(sorted);
    persist(sorted, reflection);
  }

  function updateReflection(text: string) {
    setReflection(text);
    persist(schedule, text);
  }

  const doneCount = schedule.filter((x) => x.done).length;
  const timeOk = hmToMinutes(end) > hmToMinutes(start);

  // Жёлтое — только если выбранный день в прошлом (т.е. “наступило завтра”), и задача не выполнена
  const pastDay = isBeforeISO(selectedDate, todayISO);

  if (!loaded) return <div className="text-sm text-neutral-600">Загружаю...</div>;

  return (
    <div className="space-y-4">
      <Card
        variant="sticky"
        title={`День · ${prettyDate(selectedDate)}`}
        subtitle="Зелёное — выполнено. Жёлтое — не выполнено (после завершения дня)."
        right={
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                const v = e.target.value as ISODate;
                setSelectedDate(v);
                localStorage.setItem(SELECTED_DAY_KEY, v);
              }}
              className="rounded-xl border border-black/10 bg-white/70 px-2 py-1 text-xs outline-none"
              aria-label="select date"
            />
            <div className="rounded-full bg-black/5 px-3 py-1 text-xs text-neutral-700">
              {doneCount}/{schedule.length || 0}
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          {/* Добавление */}
          <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-neutral-600">
                Начало
                <input
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none"
                />
              </label>
              <label className="text-xs text-neutral-600">
                Конец
                <input
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className={[
                    "mt-1 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none",
                    timeOk ? "border-black/10" : "border-red-300",
                  ].join(" ")}
                />
              </label>
            </div>

            <label className="mt-2 block text-xs text-neutral-600">
              Дело
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: тренировка / созвон / чтение"
                className="mt-1 w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none"
              />
            </label>

            <div className="mt-3 flex items-center gap-2">
              <PrimaryButton onClick={addItem} disabled={!title.trim() || !timeOk || schedule.length >= 20}>
                + Добавить
              </PrimaryButton>
              <div className="text-xs text-neutral-600">
                {schedule.length >= 20 ? "Лимит 20 дел на день" : !timeOk ? "Конец должен быть позже начала" : " "}
              </div>
            </div>
          </div>

          {/* Список дел */}
          <div className="space-y-2">
            {schedule.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 p-4 text-sm text-neutral-700">
                Пока пусто.
              </div>
            ) : (
              schedule.map((item) => {
                const overdue = pastDay && !item.done;

                const frameCls = item.done
                  ? "bg-green-50 border-green-200"
                  : overdue
                    ? "bg-amber-50 border-amber-200"
                    : "bg-white/85 border-black/5";

                return (
                  <div key={item.id} className={`rounded-2xl border p-3 shadow-sm ${frameCls}`}>
                    <div className="flex items-start gap-3">
                      <Checkbox on={item.done} onToggle={() => toggleDone(item.id)} />

                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="time"
                            value={item.start}
                            onChange={(e) => updateItem(item.id, { start: e.target.value })}
                            className="w-[92px] rounded-xl border border-black/10 bg-white/70 px-2 py-1 text-sm outline-none"
                          />
                          <span className="text-xs text-neutral-500">—</span>
                          <input
                            type="time"
                            value={item.end}
                            onChange={(e) => updateItem(item.id, { end: e.target.value })}
                            className="w-[92px] rounded-xl border border-black/10 bg-white/70 px-2 py-1 text-sm outline-none"
                          />

                          {overdue && (
                            <span className="ml-1 rounded-full bg-amber-200/70 px-2 py-0.5 text-[11px] text-amber-900">
                              не выполнено
                            </span>
                          )}
                          {item.done && (
                            <span className="ml-1 rounded-full bg-green-200/70 px-2 py-0.5 text-[11px] text-green-900">
                              выполнено
                            </span>
                          )}

                          {!item.done ? (
                            <button
                              onClick={() => markDone(item.id)}
                              className="ml-auto rounded-xl bg-green-600/90 px-3 py-1.5 text-xs text-white shadow-sm"
                            >
                              ✓ Выполнено
                            </button>
                          ) : (
                            <button
                              onClick={() => markUndone(item.id)}
                              className="ml-auto rounded-xl bg-white/80 px-3 py-1.5 text-xs text-neutral-800 shadow-sm ring-1 ring-black/10"
                            >
                              ↩ Не выполнено
                            </button>
                          )}
                        </div>

                        <input
                          value={item.title}
                          onChange={(e) => updateItem(item.id, { title: e.target.value })}
                          className={[
                            "mt-2 w-full bg-transparent text-[15px] outline-none underline decoration-black/20 decoration-dashed underline-offset-[10px]",
                            item.done ? "line-through text-neutral-500" : "text-neutral-900",
                          ].join(" ")}
                        />
                      </div>

                      <GhostButton onClick={() => remove(item.id)}>✕</GhostButton>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>

      <Card
        title="Заметка дня"
        subtitle="1–3 предложения. Что приблизило к цели?"
        variant="note"
      >
        <RuledTextarea
          value={reflection}
          onChange={(e) => updateReflection(e.target.value)}
          placeholder="Например: сделал сложное дело первым — день стал легче"
          rows={4}
        />
      </Card>
    </div>
  );
}
