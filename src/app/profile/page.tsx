"use client";

import { useEffect, useMemo, useState } from "react";
import { getWeekStartISO, loadStore, saveStore, getOrCreateWeek, type ISODate } from "@/lib/osoznannostStore";

export default function ProfilePage() {
  const currentWeekStart = useMemo(() => getWeekStartISO(new Date()), []);
  const [roles, setRoles] = useState<string[]>([]);
  const [newRole, setNewRole] = useState("");
  const [weeks, setWeeks] = useState<ISODate[]>([]);
  const [loaded, setLoaded] = useState(false);

  function reload() {
    const store = loadStore();
    const week = getOrCreateWeek(store, currentWeekStart);
    const weekStarts = Object.keys(store.weeks) as ISODate[];
    weekStarts.sort((a, b) => (a > b ? -1 : 1));
    setWeeks(weekStarts);
    setRoles(week.roles);
    saveStore(store);
    setLoaded(true);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeekStart]);

  function persist(nextRoles: string[]) {
    const store = loadStore();
    const week = getOrCreateWeek(store, currentWeekStart);
    week.roles = nextRoles;
    // гарантируем, что goalsByRole есть на каждую роль
    nextRoles.forEach((r) => {
      if (week.goalsByRole[r] == null) week.goalsByRole[r] = "";
    });
    // удаляем цели удалённых ролей
    Object.keys(week.goalsByRole).forEach((r) => {
      if (!nextRoles.includes(r)) delete week.goalsByRole[r];
    });

    saveStore(store);
    setRoles(nextRoles);
  }

  function addRole() {
    const r = newRole.trim();
    if (!r) return;
    if (roles.includes(r)) return;
    const next = [...roles, r].slice(0, 5);
    persist(next);
    setNewRole("");
  }

  function removeRole(r: string) {
    const next = roles.filter((x) => x !== r);
    persist(next);
  }

  if (!loaded) return <div className="text-sm text-neutral-500">Загружаю...</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-base font-semibold">Роли (MVP)</div>
        <div className="text-xs text-neutral-500">3–5 ролей достаточно. Не превращаем в список “всего на свете”.</div>

        <div className="mt-3 flex gap-2">
          <input
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            placeholder="Добавить роль (например: Финансы)"
            className="flex-1 rounded-xl border p-3 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
          />
          <button onClick={addRole} className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white">
            +
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {roles.map((r) => (
            <div key={r} className="flex items-center gap-2 rounded-full border bg-neutral-50 px-3 py-1 text-sm">
              <span>{r}</span>
              <button onClick={() => removeRole(r)} className="text-neutral-500 hover:text-neutral-900">
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-base font-semibold">История недель</div>
        <div className="text-xs text-neutral-500">Пока просто список. Дальше сделаем открытие любой недели.</div>

        <div className="mt-3 space-y-2">
          {weeks.length === 0 ? (
            <div className="text-sm text-neutral-500">Пока нет недель.</div>
          ) : (
            weeks.map((ws) => (
              <div key={ws} className="rounded-xl border px-3 py-2 text-sm">
                Неделя с <span className="font-medium">{ws}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <button
        onClick={() => {
          localStorage.removeItem("osoznannost:v1");
          reload();
        }}
        className="w-full rounded-2xl border bg-white px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-100"
      >
        Сбросить данные (только localStorage)
      </button>
    </div>
  );
}
