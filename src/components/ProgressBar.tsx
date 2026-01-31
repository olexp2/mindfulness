"use client";

import { useEffect, useState } from "react";

export default function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimatedValue(v);
    }, 100);
    return () => clearTimeout(timeout);
  }, [v]);

  return (
    <div className="progress">
      <div className="progress__track">
        <div 
          className="progress__fill transition-all duration-700 ease-out" 
          style={{ 
            width: `${animatedValue}%`,
          }} 
        />
        {animatedValue > 0 && (
          <div 
            className="absolute right-0 top-0 h-full w-2 bg-white/30 rounded-full blur-sm animate-pulse"
            style={{ 
              right: `${100 - animatedValue}%`,
              transition: 'right 700ms ease-out',
            }}
          />
        )}
      </div>
    </div>
  );
}
