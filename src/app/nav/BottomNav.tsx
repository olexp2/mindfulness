"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Grid2X2, Target, TrendingUp, Settings } from "lucide-react";
import type { ComponentType } from "react";
type IconType = ComponentType<{ size?: number }>;

type Tab = { href: string; label: string; Icon: IconType };

const TABS: Tab[] = [
  { href: "/today", label: "Сегодня", Icon: CalendarDays },
  { href: "/week", label: "Неделя", Icon: Grid2X2 },
  { href: "/goals", label: "Цели", Icon: Target },
  { href: "/progress", label: "Прогресс", Icon: TrendingUp },
  { href: "/settings", label: "Настройки", Icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Навигация">
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname?.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={[
              "bottom-nav__item",
              active ? "bottom-nav__item--active" : "",
            ].join(" ")}
          >
            <Icon size={18} className="shrink-0" />
            <span className="text-[11px] leading-tight">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
