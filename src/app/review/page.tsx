"use client";

import { useEffect, useMemo, useState } from "react";
import { getWeekStartISO, loadStore, saveStore, getOrCreateWeek } from "@/lib/osoznannostStore";
import { Card, RuledTextarea } from "@/components/NotebookUI";

export default function ReviewPage() {
  const weekStart = useMemo(() => getWeekStartISO(new Date()), []);
  const [worked, setWorked] = useState("");
  const [blocked, setBlocked] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const store = loadStore();
    const week = getOrCreateWeek(store, weekStart);
    setWorked(week.review.worked);
    setBlocked(week.review.blocked);
    saveStore(store);
    setLoaded(true);
  }, [weekStart]);

  function persist(nextWorked = worked, nextBlocked = blocked) {
    const store = loadStore();
    const week = getOrCreateWeek(store, weekStart);
    week.review.worked = nextWorked;
    week.review.blocked = nextBlocked;
    saveStore(store);
  }

  if (!loaded) return <div className="text-sm text-neutral-600">Загружаю страницу...</div>;

  return (
    <div className="space-y-4">
      <Card
        variant="note"
        title="Обзор недели"
        subtitle="5 минут. Закрепляем успехи и убираем помехи."
      >
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium">Что сработало?</div>
            <RuledTextarea
              value={worked}
              onChange={(e) => {
                setWorked(e.target.value);
                persist(e.target.value, blocked);
              }}
              placeholder="Например: планировал big rocks утром, не вечером"
              rows={4}
            />
          </div>

          <div>
            <div className="text-sm font-medium">Что мешало?</div>
            <RuledTextarea
              value={blocked}
              onChange={(e) => {
                setBlocked(e.target.value);
                persist(worked, e.target.value);
              }}
              placeholder="Например: хаотичные чаты и созвоны без цели"
              rows={4}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
