"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/today", label: "Сегодня", icon: "✍️" },
  { href: "/week", label: "Неделя", icon: "📓" },
  { href: "/review", label: "Обзор", icon: "✅" },
  { href: "/profile", label: "Профиль", icon: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0">
      <div className="mx-auto max-w-md px-3 pb-4">
        <div className="rounded-2xl border border-black/5 bg-white/80 p-2 shadow-[0_12px_30px_rgba(0,0,0,0.12)] backdrop-blur">
          <div className="grid grid-cols-4 gap-2">
            {tabs.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={[
                    "flex flex-col items-center justify-center rounded-xl px-2 py-2 text-xs transition",
                    active ? "bg-neutral-900 text-white shadow-sm" : "text-neutral-700 hover:bg-neutral-100",
                  ].join(" ")}
                >
                  <div className="text-base leading-none">{t.icon}</div>
                  <div className="mt-1">{t.label}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
