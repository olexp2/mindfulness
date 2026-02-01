import React from "react";
import {
  Card as ShadcnCard,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function NotebookCard({
  title,
  subtitle,
  variant = "note",
  children,
  right,
  className,
  contentClassName,
}: {
  title?: React.ReactNode;
  subtitle?: string;
  variant?: "note" | "note-soft" | "sticky";
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const variantClasses = {
    note: "bg-white/90 border-black/5 shadow-sm",
    "note-soft": "bg-white/50 border-black/5 shadow-none",
    sticky: "bg-yellow-50/90 border-yellow-200/50 shadow-sm",
  };

  return (
    <ShadcnCard
      className={cn(
        "rounded-2xl",
        variantClasses[variant],
        className
      )}
    >
      {(title || subtitle || right) && (
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              {title && (
                <CardTitle className="text-base font-semibold tracking-tight">
                  {title}
                </CardTitle>
              )}
              {subtitle && (
                <div className="text-xs text-neutral-600 mt-1">{subtitle}</div>
              )}
            </div>
            {right}
          </div>
        </CardHeader>
      )}
      <CardContent className={cn(title || subtitle || right ? "pt-0" : "", contentClassName)}>
        {children}
      </CardContent>
    </ShadcnCard>
  );
}
