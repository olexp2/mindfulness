"use client";

import { useEffect, useMemo, useState } from "react";
import { getWeekStartISO, loadStore, saveStore, getOrCreateWeek } from "@/lib/osoznannostStore";
import { NotebookCard as Card } from "@/components/NotebookCard";
import { ListLoadingSkeleton } from "@/components/LoadingSkeleton";
import { Textarea } from "@/components/ui/textarea";

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

  if (!loaded) return <ListLoadingSkeleton />;

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
            <Textarea
              value={worked}
              onChange={(e) => {
                setWorked(e.target.value);
                persist(e.target.value, blocked);
              }}
              placeholder="Например: планировал big rocks утром, не вечером"
              rows={4}
              className="w-full resize-none rounded-xl border border-black/5 bg-white/70 p-3 text-sm"
            />
          </div>

          <div>
            <div className="text-sm font-medium">Что мешало?</div>
            <Textarea
              value={blocked}
              onChange={(e) => {
                setBlocked(e.target.value);
                persist(worked, e.target.value);
              }}
              placeholder="Например: хаотичные чаты и созвоны без цели"
              rows={4}
              className="w-full resize-none rounded-xl border border-black/5 bg-white/70 p-3 text-sm"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
