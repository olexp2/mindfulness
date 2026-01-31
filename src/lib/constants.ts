
import {
  Dumbbell,
  BookOpen,
  BriefcaseBusiness,
  Target,
  Brain,
  HeartPulse,
  Timer,
  PhoneCall,
  Pencil,
  Code2,
  type LucideIcon,
} from "lucide-react";

export const COLOR_PRESETS = [
  "#2dd4bf", // Teal
  "#a855f7", // Purple
  "#f43f5e", // Rose
  "#eab308", // Yellow
  "#38bdf8", // Sky
  "#f97316", // Orange
  "#10b981", // Emerald
] as const;

export type IconKey =
  | "dumbbell"
  | "book"
  | "work"
  | "target"
  | "brain"
  | "health"
  | "timer"
  | "call"
  | "pencil"
  | "code";

export const ICONS: { key: IconKey; label: string; Icon: LucideIcon }[] = [
  { key: "target", label: "Цель", Icon: Target },
  { key: "work", label: "Работа", Icon: BriefcaseBusiness },
  { key: "brain", label: "Фокус", Icon: Brain },
  { key: "dumbbell", label: "Спорт", Icon: Dumbbell },
  { key: "book", label: "Учёба", Icon: BookOpen },
  { key: "health", label: "Здоровье", Icon: HeartPulse },
  { key: "timer", label: "Таймер", Icon: Timer },
  { key: "call", label: "Звонок", Icon: PhoneCall },
  { key: "pencil", label: "Заметка", Icon: Pencil },
  { key: "code", label: "Код", Icon: Code2 },
];

export function getIconByKey(key?: string): LucideIcon {
  const found = ICONS.find((x) => x.key === key);
  return found?.Icon ?? Target;
}
