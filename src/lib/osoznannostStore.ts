// src/lib/osoznannostStore.ts
export type ISODate = `${number}-${number}-${number}`; // "YYYY-MM-DD"

export type TimeHM = `${number}:${number}` | string; // "HH:MM"

export type BigRock = {
  id: string;
  text: string;
  dayOfWeek?: 1 | 2 | 3 | 4 | 5 | 6 | 7; // Mon..Sun
  done: boolean;
};

export type RecurrenceType = "once" | "daily" | "weekly" | "monthly";

export type Recurrence = {
  type: RecurrenceType;
  daysOfWeek?: (1 | 2 | 3 | 4 | 5 | 6 | 7)[];
};

export type ScheduledItem = {
  id: string;
  title: string;
  start: TimeHM;
  end: TimeHM;
  done: boolean;
  goalId?: string;
  goalIds?: string[];
  color?: string;
  icon?: string;
  streak?: number;
  recurrence?: Recurrence;
  status?: "active" | "completed" | "skipped";
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

export type Milestone = {
  id: string;
  date: ISODate;
  description: string;
  completed: boolean;
};

export type GlobalGoal = {
  id: string;
  title: string;
  deadline?: ISODate;
  progress: number;
  status: "active" | "completed" | "paused";
  milestones?: Milestone[];
  color?: string;
  icon?: string;
};

export type StoreV3 = {
  version: 3;
  weeks: Record<ISODate, WeekPlan>;
  goals: GlobalGoal[];
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

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function migrateToV2(parsed: unknown): StoreV2 {
  // если старая версия/непонятный формат — начинаем чисто
  const base: StoreV2 = { version: 2, weeks: {} };
  if (!isRecord(parsed) || !isRecord(parsed.weeks)) return base;

  // v2 уже ок
  if ((parsed as { version?: unknown }).version === 2) return parsed as StoreV2;

  // v1 -> v2
  const weeks: Record<ISODate, WeekPlan> =
    ((parsed.weeks as Record<string, unknown>) as unknown as Record<ISODate, WeekPlan>) ?? {};
  for (const ws of Object.keys(weeks) as ISODate[]) {
    const week = weeks[ws];
    if (!week || typeof week !== "object") continue;

    week.days = week.days ?? {};
    for (const dayKey of Object.keys(week.days) as ISODate[]) {
      const dayUnknown = week.days[dayKey] as unknown;
      if (!isRecord(dayUnknown)) {
        week.days[dayKey] = defaultDayPlan();
        continue;
      }
      const day = dayUnknown as Partial<DayPlan>;
      if (!Array.isArray(day.schedule)) (day as DayPlan).schedule = [];
      if (!Array.isArray(day.top3)) (day as DayPlan).top3 = [];
      if (typeof day.reflection !== "string") (day as DayPlan).reflection = "";
      week.days[dayKey] = day as DayPlan;
    }
  }

  return { version: 2, weeks };
}

function migrateToV3(parsed: unknown): StoreV3 {
  const v2 = migrateToV2(parsed);
  const rawGoals =
    isRecord(parsed) && Array.isArray((parsed as { goals?: unknown }).goals)
      ? ((parsed as { goals?: unknown }).goals as unknown[])
      : [];
  const goals: GlobalGoal[] = rawGoals.length
    ? rawGoals.map((g) => {
        const r = isRecord(g) ? (g as Record<string, unknown>) : {};
        const id = typeof r.id === "string" ? r.id : uid("goal");
        const title = typeof r.title === "string" ? r.title : "";
        const deadline =
          typeof r.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.deadline as string)
            ? (r.deadline as ISODate)
            : undefined;
        const progress =
          typeof r.progress === "number" ? Math.max(0, Math.min(100, r.progress)) : 0;
        const status =
          r.status === "completed" || r.status === "paused" ? (r.status as GlobalGoal["status"]) : "active";
        const milestones = Array.isArray(r.milestones)
          ? (r.milestones as unknown[]).map((m) => {
              const mr = isRecord(m) ? (m as Record<string, unknown>) : {};
              return {
                id: typeof mr.id === "string" ? mr.id : uid("milestone"),
                date: typeof mr.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(mr.date as string)
                  ? (mr.date as ISODate)
                  : getTodayISO(),
                description: typeof mr.description === "string" ? mr.description : "",
                completed: typeof mr.completed === "boolean" ? mr.completed : false,
              };
            })
          : [];
        const color = typeof r.color === "string" ? r.color : undefined;
        const icon = typeof r.icon === "string" ? r.icon : undefined;
        return { id, title, deadline, progress, status, milestones, color, icon };
      })
    : [];
  return { version: 3, weeks: v2.weeks, goals };
}

export function loadStore(): StoreV3 {
  if (typeof window === "undefined") {
    return { version: 3, weeks: {}, goals: [] };
  }
  const parsed = safeParse<unknown>(localStorage.getItem(STORAGE_KEY));
  const migrated = migrateToV3(parsed);
  return migrated;
}

export function saveStore(store: StoreV3) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getOrCreateWeek(store: StoreV3, weekStart: ISODate): WeekPlan {
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

export function addGoal(
  store: StoreV3,
  title: string,
  deadline?: ISODate,
  color?: string,
  icon?: string
): GlobalGoal {
  const goal: GlobalGoal = {
    id: uid("goal"),
    title,
    deadline,
    progress: 0,
    status: "active",
    milestones: [],
    color,
    icon,
  };
  store.goals = [...(store.goals ?? []), goal];
  return goal;
}

export function updateGoal(store: StoreV3, id: string, patch: Partial<GlobalGoal>) {
  store.goals = (store.goals ?? []).map((g) =>
    g.id === id
      ? {
          ...g,
          ...patch,
          progress:
            patch.progress != null
              ? Math.max(0, Math.min(100, patch.progress))
              : g.progress,
        }
      : g
  );
}

export function removeGoal(store: StoreV3, id: string) {
  store.goals = (store.goals ?? []).filter((g) => g.id !== id);
}

export function addMilestone(
  store: StoreV3,
  goalId: string,
  date: ISODate,
  description: string
): Milestone | null {
  const goal = store.goals?.find((g) => g.id === goalId);
  if (!goal) return null;

  const milestone: Milestone = {
    id: uid("milestone"),
    date,
    description,
    completed: false,
  };

  goal.milestones = [...(goal.milestones ?? []), milestone];
  goal.milestones.sort((a, b) => a.date.localeCompare(b.date));

  return milestone;
}

export function updateMilestone(
  store: StoreV3,
  goalId: string,
  milestoneId: string,
  patch: Partial<Milestone>
) {
  const goal = store.goals?.find((g) => g.id === goalId);
  if (!goal || !goal.milestones) return;

  goal.milestones = goal.milestones.map((m) =>
    m.id === milestoneId ? { ...m, ...patch } : m
  );

  goal.milestones.sort((a, b) => a.date.localeCompare(b.date));
}

export function removeMilestone(store: StoreV3, goalId: string, milestoneId: string) {
  const goal = store.goals?.find((g) => g.id === goalId);
  if (!goal || !goal.milestones) return;

  goal.milestones = goal.milestones.filter((m) => m.id !== milestoneId);
}

export function isoToDate(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function shouldShowTaskOnDate(task: ScheduledItem, date: ISODate): boolean {
  if (!task.recurrence || task.recurrence.type === "once") return true;

  const taskDate = isoToDate(date);
  const dayOfWeek = ((taskDate.getDay() + 6) % 7) + 1;

  switch (task.recurrence.type) {
    case "daily":
      return true;
    case "weekly":
      return task.recurrence.daysOfWeek?.includes(dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7) ?? false;
    case "monthly":
      return true;
    default:
      return true;
  }
}
