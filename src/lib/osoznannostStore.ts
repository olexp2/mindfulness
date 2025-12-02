// src/lib/osoznannostStore.ts
export type ISODate = `${number}-${number}-${number}`; // "YYYY-MM-DD"

export type TimeHM = `${number}:${number}` | string; // "HH:MM"

export type BigRock = {
  id: string;
  text: string;
  dayOfWeek?: 1 | 2 | 3 | 4 | 5 | 6 | 7; // Mon..Sun
  done: boolean;
};

export type ScheduledItem = {
  id: string;
  title: string;
  start: TimeHM;
  end: TimeHM;
  done: boolean;
};

export type DayPlan = {
  // новое:
  schedule: ScheduledItem[]; // до 20
  // старое (можем не использовать, но не ломаем):
  top3: { id: string; text: string; done: boolean }[];
  reflection: string;
};

export type WeekPlan = {
  focus: string;
  roles: string[];
  goalsByRole: Record<string, string>;
  bigRocks: BigRock[];
  days: Record<ISODate, DayPlan>;
  review: { worked: string; blocked: string };
};

export type StoreV2 = {
  version: 2;
  weeks: Record<ISODate, WeekPlan>; // key = weekStart ISO (Mon)
};

const STORAGE_KEY = "osoznannost:v1";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function formatISODate(d: Date): ISODate {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}` as ISODate;
}

export function getWeekStartISO(d = new Date()): ISODate {
  // Monday-start week. JS: 0=Sun..6=Sat
  const date = new Date(d);
  const day = date.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day; // Sun -> -6, Mon->0, Tue->-1 ...
  date.setDate(date.getDate() + diffToMonday);
  date.setHours(0, 0, 0, 0);
  return formatISODate(date);
}

export function getDayOfWeekISO(
  weekStart: ISODate,
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7
): ISODate {
  const [y, m, d] = weekStart.split("-").map(Number);
  const base = new Date(y, m - 1, d);
  base.setDate(base.getDate() + (dayOfWeek - 1));
  base.setHours(0, 0, 0, 0);
  return formatISODate(base);
}

export function getTodayISO(): ISODate {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return formatISODate(d);
}

export const DOW_LABEL: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, string> = {
  1: "Пн",
  2: "Вт",
  3: "Ср",
  4: "Чт",
  5: "Пт",
  6: "Сб",
  7: "Вс",
};

export const DOW_LONG: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, string> = {
  1: "Понедельник",
  2: "Вторник",
  3: "Среда",
  4: "Четверг",
  5: "Пятница",
  6: "Суббота",
  7: "Воскресенье",
};

export function hmToMinutes(hm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return Number.POSITIVE_INFINITY;
  const hh = Math.max(0, Math.min(23, Number(m[1])));
  const mm = Math.max(0, Math.min(59, Number(m[2])));
  return hh * 60 + mm;
}

export function cap(text: string) {
  return text.length > 0 ? text[0].toUpperCase() + text.slice(1) : text;
}

export function defaultWeekPlan(): WeekPlan {
  const roles = ["Здоровье", "Работа", "Семья", "Развитие"];
  const goalsByRole: Record<string, string> = {};
  roles.forEach((r) => (goalsByRole[r] = ""));
  return {
    focus: "",
    roles,
    goalsByRole,
    bigRocks: [],
    days: {},
    review: { worked: "", blocked: "" },
  };
}

export function defaultDayPlan(): DayPlan {
  return { schedule: [], top3: [], reflection: "" };
}

function migrateToV2(parsed: any): StoreV2 {
  // если старая версия/непонятный формат — начинаем чисто
  const base: StoreV2 = { version: 2, weeks: {} };
  if (!parsed || typeof parsed !== "object" || typeof parsed.weeks !== "object") return base;

  // v2 уже ок
  if (parsed.version === 2) return parsed as StoreV2;

  // v1 -> v2
  const weeks: Record<ISODate, WeekPlan> = parsed.weeks ?? {};
  for (const ws of Object.keys(weeks) as ISODate[]) {
    const week = weeks[ws];
    if (!week || typeof week !== "object") continue;

    week.days = week.days ?? {};
    for (const dayKey of Object.keys(week.days) as ISODate[]) {
      const day = week.days[dayKey] as any;
      if (!day || typeof day !== "object") {
        week.days[dayKey] = defaultDayPlan();
        continue;
      }
      if (!Array.isArray(day.schedule)) day.schedule = [];
      if (!Array.isArray(day.top3)) day.top3 = [];
      if (typeof day.reflection !== "string") day.reflection = "";
    }
  }

  return { version: 2, weeks };
}

export function loadStore(): StoreV2 {
  if (typeof window === "undefined") {
    return { version: 2, weeks: {} };
  }
  const parsed = safeParse<any>(localStorage.getItem(STORAGE_KEY));
  const migrated = migrateToV2(parsed);
  return migrated;
}

export function saveStore(store: StoreV2) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getOrCreateWeek(store: StoreV2, weekStart: ISODate): WeekPlan {
  const existing = store.weeks[weekStart];
  if (existing) return existing;
  const created = defaultWeekPlan();
  store.weeks[weekStart] = created;
  return created;
}

export function getOrCreateDay(week: WeekPlan, date: ISODate): DayPlan {
  const existing = week.days[date];
  if (existing) return existing;
  const created = defaultDayPlan();
  week.days[date] = created;
  return created;
}

export function clampSchedule(items: ScheduledItem[]) {
  return items.slice(0, 20);
}

export function sortSchedule(items: ScheduledItem[]) {
  return [...items].sort((a, b) => hmToMinutes(a.start) - hmToMinutes(b.start));
}
