"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(false);
    const timeout = setTimeout(() => {
      setIsVisible(true);
    }, 50);
    return () => clearTimeout(timeout);
  }, [pathname]);

  return (
    <div
      className={[
        "transition-all duration-300",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      ].join(" ")}
    >
      {children}
    </div>
  );
}
