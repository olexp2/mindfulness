"use client";

import { Settings, User, Bell, Palette, Info } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
        <div className="mb-6 flex items-center gap-3">
          <Settings className="text-neutral-900 dark:text-white" size={24} />
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Настройки</h1>
        </div>

        <div className="space-y-1">
          <SettingsItem icon={User} label="Профиль" description="Управление ролями и личными данными" />
          <SettingsItem icon={Bell} label="Уведомления" description="Настройка напоминаний и оповещений" />
          <SettingsItem icon={Palette} label="Оформление" description="Тема, шрифты и цветовая схема" />
          <SettingsItem icon={Info} label="О приложении" description="Версия и информация о разработке" />
        </div>
      </div>

      <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-slate-800">
        <p className="text-center text-sm text-neutral-500 dark:text-slate-400">
          Страница в разработке
        </p>
      </div>
    </div>
  );
}

function SettingsItem({ icon: Icon, label, description }: { icon: typeof Settings; label: string; description: string }) {
  return (
    <button className="flex w-full items-center gap-4 rounded-xl p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-slate-800">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-slate-700">
        <Icon size={20} className="text-neutral-600 dark:text-slate-300" />
      </div>
      <div className="flex-1 text-left">
        <div className="text-sm font-medium text-neutral-900 dark:text-white">{label}</div>
        <div className="text-xs text-neutral-500 dark:text-slate-400">{description}</div>
      </div>
    </button>
  );
}
