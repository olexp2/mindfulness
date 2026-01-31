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
  sortSchedule,
  clampSchedule,
  type ISODate,
  type ScheduledItem,
} from "@/lib/osoznannostStore";
import { NotebookCard as Card } from "@/components/NotebookCard";
import { PageLoadingSkeleton } from "@/components/LoadingSkeleton";
import RippleButton from "@/components/RippleButton";
import { Input } from "@/components/ui/input";

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

  const [datePick, setDatePick] = useState<ISODate>(() => {
    const t = new Date();
    const yyyy = t.getFullYear();
    const mm = String(t.getMonth() + 1).padStart(2, "0");
    const dd = String(t.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}` as ISODate;
  });

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
    const ws = getWeekStartISO(isoToDate(date));
    const store = loadStore();
    const week = getOrCreateWeek(store, ws);
    const day = getOrCreateDay(week, date);
    day.schedule = clampSchedule(sortSchedule(items));
    saveStore(store);
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

  if (!loaded) return <PageLoadingSkeleton />;

  return (
    <div className="space-y-4">
      <Card
        variant="note"
        title={
          <div className="text-center">
            <div className="text-2xl font-bold text-neutral-900 dark:text-white">Неделя</div>
            <div className="text-sm text-neutral-600 dark:text-slate-400 mt-1">С {selectedWeekStart}</div>
          </div>
        }
        right={
          <div className="flex items-center gap-2">
            <RippleButton onClick={goPrevWeek} variant="ghost" size="sm">←</RippleButton>
            <RippleButton onClick={goNextWeek} variant="ghost" size="sm">→</RippleButton>
          </div>
        }
      >
        <label className="text-xs text-neutral-600">
          Перейти к дате (откроет неделю)
          <Input
            type="date"
            value={datePick}
            onChange={(e) => {
              const v = e.target.value as ISODate;
              setDatePick(v);
              jumpToWeekByDate(v);
            }}
            className="mt-1 w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm h-auto"
          />
        </label>
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
                {items.map((it) => {
                  const isSkipped = it.status === "skipped";
                  return (
                    <div 
                      key={it.id} 
                      className={`note rounded-2xl p-3 ${isSkipped ? "opacity-40 pointer-events-none" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <RippleButton 
                          onClick={() => !isSkipped && toggle(date, it.id)} 
                          variant="ghost" 
                          size="sm"
                          className={isSkipped ? "text-red-400" : it.done ? "text-green-600" : "text-neutral-400"}
                        >
                          {isSkipped ? "⊘" : it.done ? "✓" : "○"}
                        </RippleButton>
                        <div className="flex-1">
                          <div className={isSkipped ? "text-neutral-400 line-through" : it.done ? "text-neutral-400 line-through" : "text-neutral-900"}>
                            {it.title}
                          </div>
                          <div className="text-xs text-neutral-600 mt-1">
                            {it.start}–{it.end}
                          </div>
                          {isSkipped && (
                            <div className="text-xs text-red-400 mt-1">Отменена</div>
                          )}
                        </div>
                        <RippleButton 
                          onClick={() => !isSkipped && remove(date, it.id)} 
                          variant="ghost" 
                          size="sm"
                        >
                          ✕
                        </RippleButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
