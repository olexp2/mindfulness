"use client";

interface TaskCheckboxProps {
  done: boolean;
  onToggle: () => void;
}

export default function TaskCheckbox({ done, onToggle }: TaskCheckboxProps) {
  return (
    <button
      onClick={onToggle}
      className="group flex items-center justify-center gap-2 rounded-[20px] bg-white/15 backdrop-blur-md px-5 py-3 transition-all duration-300 hover:bg-white/25 hover:scale-105 active:scale-95 shadow-lg min-w-[100px]"
      aria-label={done ? "Отменить" : "Выполнить"}
    >
      {done ? (
        <>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22c55e"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-in zoom-in duration-300 drop-shadow-lg flex-shrink-0"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-sm font-semibold text-white">Готово</span>
        </>
      ) : (
        <>
          <div className="h-5 w-5 rounded-full border-[2.5px] border-white/70 bg-white/10 transition-all duration-300 group-hover:border-white group-hover:bg-white/20 flex-shrink-0" />
          <span className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors duration-300">Готово</span>
        </>
      )}
    </button>
  );
}
