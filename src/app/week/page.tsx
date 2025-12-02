"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DOW_LABEL,
  DOW_LONG,
  getWeekStartISO,
  getDayOfWeekISO,
  loadStore,
  saveStore,
  getOrCreateWeek,
  getOrCreateDay,
  uid,
  sortSchedule,
  clampSchedule,
  hmToMinutes,
  type ISODate,
  type ScheduledItem,
} from "@/lib/osoznannostStore";
import { Card, PrimaryButton, GhostButton, Checkbox } from "@/components/NotebookUI";

const SELECTED_WEEK_KEY = "osoznannost:selectedWeekStart";

function ddmm(iso: ISODate) {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

function isoToDate(iso: string) {
  // важно для TZ, чтобы не съезжало
  return new Date(`${iso}T00:00:00`);
}

function persistSelectedWeek(weekStart: ISODate) {
  localStorage.setItem(SELECTED_WEEK_KEY, weekStart);
}

function loadSelectedWeek(): ISODate | null {
  const v = localStorage.getItem(SELECTED_WEEK_KEY);
  return (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? (v as ISODate) : null);
}

export default function WeekPage() {
  const currentWeekStart = useMemo(() => getWeekStartISO(new Date()), []);

  const [selectedWeekStart, setSelectedWeekStart] = useState<ISODate>(currentWeekStart);
  const [loaded, setLoaded] = useState(false);

  const [weekDates, setWeekDates] = useState<{ dow: 1|2|3|4|5|6|7; date: ISODate }[]>([]);
  const [scheduleByDate, setScheduleByDate] = useState<Record<ISODate, ScheduledItem[]>>({});

  // форма добавления на любую дату
  const [datePick, setDatePick] = useState<ISODate>(() => {
    const t = new Date();
    const yyyy = t.getFullYear();
    const mm = String(t.getMonth() + 1).padStart(2, "0");
    const dd = String(t.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}` as ISODate;
  });
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("09:30");

  // при первом входе — текущая неделя, потом — последняя выбранная
  useEffect(() => {
    const remembered = loadSelectedWeek();
    if (remembered) setSelectedWeekStart(remembered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const dates = ([1,2,3,4,5,6,7] as const).map((dow) => ({
      dow,
      date: getDayOfWeekISO(selectedWeekStart, dow),
    }));
    setWeekDates(dates);

    const store = loadStore();
    const week = getOrCreateWeek(store, selectedWeekStart);

    const nextMap: Record<ISODate, ScheduledItem[]> = {};
    for (const { date } of dates) {
      const day = getOrCreateDay(week, date);
      nextMap[date] = sortSchedule(day.schedule);
    }
    setScheduleByDate(nextMap);

    saveStore(store);
    setLoaded(true);

    if (typeof window !== "undefined") persistSelectedWeek(selectedWeekStart);
  }, [selectedWeekStart]);

  function persistDay(date: ISODate, items: ScheduledItem[]) {
    // сохраняем в неделе, соответствующей этой дате
    const ws = getWeekStartISO(isoToDate(date));
    const store = loadStore();
    const week = getOrCreateWeek(store, ws);
    const day = getOrCreateDay(week, date);
    day.schedule = clampSchedule(sortSchedule(items));
    saveStore(store);
  }

  function addToDate() {
    const t = title.trim();
    if (!t) return;

    const s = hmToMinutes(start);
    const e = hmToMinutes(end);
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return;

    // читаем конкретный день из БД-стора, так как это может быть НЕ текущая выбранная неделя
    const store = loadStore();
    const ws = getWeekStartISO(isoToDate(datePick));
    const week = getOrCreateWeek(store, ws);
    const day = getOrCreateDay(week, datePick);
    const current = sortSchedule(day.schedule);

    if (current.length >= 20) return;

    const next = sortSchedule([
      ...current,
      { id: uid("si"), title: t, start, end, done: false },
    ]);

    day.schedule = clampSchedule(next);
    saveStore(store);

    // если добавили в видимую неделю — обновим UI
    const inVisible = scheduleByDate[datePick] != null;
    if (inVisible) {
      setScheduleByDate((prev) => ({ ...prev, [datePick]: next }));
    }

    setTitle("");
  }

  function toggle(date: ISODate, id: string) {
    const current = scheduleByDate[date] ?? [];
    const next = sortSchedule(current.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
    setScheduleByDate((prev) => ({ ...prev, [date]: next }));
    persistDay(date, next);
  }

  function remove(date: ISODate, id: string) {
    const current = scheduleByDate[date] ?? [];
    const next = current.filter((x) => x.id !== id);
    setScheduleByDate((prev) => ({ ...prev, [date]: next }));
    persistDay(date, next);
  }

  function goPrevWeek() {
    const d = isoToDate(selectedWeekStart);
    d.setDate(d.getDate() - 7);
    setSelectedWeekStart(getWeekStartISO(d));
  }

  function goNextWeek() {
    const d = isoToDate(selectedWeekStart);
    d.setDate(d.getDate() + 7);
    setSelectedWeekStart(getWeekStartISO(d));
  }

  function jumpToWeekByDate(anyDateISO: ISODate) {
    setSelectedWeekStart(getWeekStartISO(isoToDate(anyDateISO)));
  }

  const timeOk = hmToMinutes(end) > hmToMinutes(start);

  if (!loaded) return <div className="text-sm text-neutral-600">Загружаю неделю...</div>;

  return (
    <div className="space-y-4">
      <Card
        variant="note"
        title="Неделя"
        subtitle={`С ${selectedWeekStart}`}
        right={
          <div className="flex items-center gap-2">
            <GhostButton onClick={goPrevWeek}>←</GhostButton>
            <GhostButton onClick={goNextWeek}>→</GhostButton>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-neutral-600">
            Перейти к дате (откроет неделю)
            <input
              type="date"
              value={datePick}
              onChange={(e) => {
                const v = e.target.value as ISODate;
                setDatePick(v);
                jumpToWeekByDate(v);
              }}
              className="mt-1 w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none"
            />
          </label>

          <label className="text-xs text-neutral-600">
            Добавить дело на дату
            <input
              type="date"
              value={datePick}
              onChange={(e) => setDatePick(e.target.value as ISODate)}
              className="mt-1 w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none"
            />
          </label>
        </div>
      </Card>

      <Card
        variant="note"
        title="Добавить дело"
        subtitle="Можно добавлять на любой календарный день (включая следующие недели)."
      >
        <div className="rounded-2xl bg-white/75 p-3 shadow-sm">
          <label className="block text-xs text-neutral-600">
            Дело
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: спорт / учёба"
              className="mt-1 w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none"
            />
          </label>

          <div className="mt-2 grid grid-cols-2 gap-2">
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

          <div className="mt-3 flex items-center gap-2">
            <PrimaryButton onClick={addToDate} disabled={!title.trim() || !timeOk}>
              + Добавить
            </PrimaryButton>
            <div className="text-xs text-neutral-600">{!timeOk ? "Конец позже начала" : " "}</div>
          </div>
        </div>
      </Card>

      {/* 7 дней */}
      <div className="space-y-3">
        {weekDates.map(({ dow, date }) => {
          const items = scheduleByDate[date] ?? [];
          const done = items.filter((x) => x.done).length;
          return (
            <Card
              key={date}
              variant="note-soft"
              title={`${DOW_LABEL[dow]} · ${ddmm(date)}`}
              subtitle={items.length ? `${done}/${items.length} выполнено` : "Пока пусто"}
              right={
                <div className="rounded-full bg-black/5 px-3 py-1 text-xs text-neutral-700">
                  {done}/{items.length}
                </div>
              }
            >
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="note rounded-2xl p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox on={it.done} onToggle={() => toggle(date, it.id)} />
                      <div className="flex-1">
                        <div className="text-xs text-neutral-600">
                          {it.start}–{it.end}
                        </div>
                        <div className={it.done ? "text-neutral-400 line-through" : "text-neutral-900"}>
                          {it.title}
                        </div>
                      </div>
                      <GhostButton onClick={() => remove(date, it.id)}>✕</GhostButton>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
