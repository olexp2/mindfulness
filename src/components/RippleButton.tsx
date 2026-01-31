"use client";

import { useState, useRef, MouseEvent, forwardRef } from "react";
import { Button, type buttonVariants } from "@/components/ui/button";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

interface RippleButtonProps extends React.ComponentProps<typeof Button>, VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

interface Ripple {
  x: number;
  y: number;
  size: number;
  id: number;
}

const RippleButton = forwardRef<HTMLButtonElement, RippleButtonProps>(
  ({ children, onClick, className = "", disabled = false, ariaLabel, variant, size, ...props }, ref) => {
    const [ripples, setRipples] = useState<Ripple[]>([]);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const nextId = useRef(0);

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;

      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const rippleSize = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - rippleSize / 2;
      const y = e.clientY - rect.top - rippleSize / 2;

      const newRipple: Ripple = {
        x,
        y,
        size: rippleSize,
        id: nextId.current++,
      };

      setRipples((prev) => [...prev, newRipple]);

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 600);

      onClick?.(e);
    };

    return (
      <Button
        ref={(node) => {
          buttonRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        onClick={handleClick}
        className={cn("relative overflow-hidden", className)}
        disabled={disabled}
        aria-label={ariaLabel}
        variant={variant}
        size={size}
        {...props}
      >
        {children}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute rounded-full bg-white/30 pointer-events-none animate-ripple"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
            }}
          />
        ))}
      </Button>
    );
  }
);

RippleButton.displayName = "RippleButton";

export default RippleButton;
