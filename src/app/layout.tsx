// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "./nav/BottomNav";

export const metadata: Metadata = {
  title: "Осознанность",
  description: "Еженедельник: фокус → big rocks → top-3 → обзор",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen">
        <div className="mx-auto max-w-md px-3 py-6">
          <div className="notebook overflow-hidden rounded-[28px]">
            <header className="sticky top-0 z-10 border-b border-black/5 bg-white/70 backdrop-blur">
              <div className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold tracking-tight">Осознанность</div>
                    <div className="text-xs text-neutral-600">Еженедельник, который приведет тебя к выполнению твоих целей</div>
                  </div>
                  <div className="rounded-2xl bg-black/5 px-3 py-1 text-xs text-neutral-700">
                    v0
                  </div>
                </div>
              </div>
            </header>

            <main className="ruled px-5 pb-28 pt-5">{children}</main>
            <BottomNav />
          </div>
        </div>
      </body>
    </html>
  );
}
