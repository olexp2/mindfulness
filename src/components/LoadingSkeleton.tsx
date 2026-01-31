"use client";

export function TaskCardSkeleton() {
  return (
    <div className="relative flex aspect-[4/3] flex-col rounded-[24px] bg-neutral-200 dark:bg-slate-700 animate-pulse">
      <div className="absolute left-2 top-2 h-6 w-12 rounded-full bg-neutral-300 dark:bg-slate-600" />
      <div className="absolute right-2 top-2 h-8 w-8 rounded-full bg-neutral-300 dark:bg-slate-600" />
      <div className="flex h-full flex-col">
        <div className="flex flex-1 items-center justify-center pt-3">
          <div className="h-9 w-9 rounded-full bg-neutral-300 dark:bg-slate-600" />
        </div>
        <div className="flex flex-1 items-end justify-center pb-2 px-1">
          <div className="h-4 w-3/4 rounded bg-neutral-300 dark:bg-slate-600" />
        </div>
      </div>
    </div>
  );
}

export function PageLoadingSkeleton() {
  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#1f2937] animate-in fade-in duration-300">
      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
        <div className="mx-auto max-w-md space-y-6">
          <div className="h-8 w-32 rounded-lg bg-neutral-200 dark:bg-slate-700 animate-pulse" />
          
          <div className="h-12 w-full rounded-2xl bg-neutral-200 dark:bg-slate-700 animate-pulse" />
          
          <div className="grid grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <TaskCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ListLoadingSkeleton() {
  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#1f2937] animate-in fade-in duration-300">
      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
        <div className="mx-auto max-w-md space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 w-full rounded-2xl bg-neutral-200 dark:bg-slate-700 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
