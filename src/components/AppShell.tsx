"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/app/nav/BottomNav";
import PageTransition from "@/components/PageTransition";

type Theme = "light" | "dark";
const THEME_KEY = "mindfulness:theme";

function ExitIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 7V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M3 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M7 8l-4 4 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_KEY) as Theme | null;
    const initial: Theme = saved === "light" || saved === "dark" ? saved : "dark";
    setTheme(initial);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }

  function handleLogout() {
    alert("Выход из аккаунта появится после добавления авторизации.");
  }

  return (
    <div className={theme === "light" ? "theme-light" : "theme-dark"}>
      <div className="app-shell">
        <header className="header-card">
          <div className="flex items-center gap-2.5">
            <img 
              src="/mindfulness_thinker_28px.svg" 
              alt="Mindfulness Logo" 
              width={28} 
              height={28}
              className="shrink-0"
            />
            <div className="text-xl font-bold tracking-tight">Mindfulness</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-full border border-white/30 bg-white/10 px-2 py-1 text-sm backdrop-blur hover:bg-white/20 dark:border-slate-700"
              aria-label="Переключить тему"
              title="Тема"
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>

            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white/90 backdrop-blur hover:bg-white/20 dark:border-slate-700"
              aria-label="Выйти"
              title="Выйти"
            >
              <ExitIcon />
            </button>
          </div>
        </header>

        <main className="app-main">
          <PageTransition>{children}</PageTransition>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
