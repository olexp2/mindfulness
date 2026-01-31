"use client";

import * as React from "react";
import { Drawer } from "vaul";

export interface ActionSheetAction {
  label: string;
  destructive?: boolean;
  onClick: () => void;
  preventClose?: boolean;
}

interface ActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  actions: ActionSheetAction[];
  triggerPosition?: { x: number; y: number };
}

export function ActionSheet({ open, onOpenChange, title, actions, triggerPosition }: ActionSheetProps) {
  const [position, setPosition] = React.useState<{ top?: number; bottom?: number; left: number } | null>(null);
  
  React.useEffect(() => {
    if (open && triggerPosition) {
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      const sheetHeight = 400;
      
      const spaceBelow = windowHeight - triggerPosition.y;
      const spaceAbove = triggerPosition.y;
      
      let newPosition: { top?: number; bottom?: number; left: number };
      
      if (spaceBelow >= sheetHeight || spaceBelow > spaceAbove) {
        newPosition = {
          top: triggerPosition.y + 10,
          left: Math.max(16, Math.min(triggerPosition.x - 150, windowWidth - 316)),
        };
      } else {
        newPosition = {
          bottom: windowHeight - triggerPosition.y + 10,
          left: Math.max(16, Math.min(triggerPosition.x - 150, windowWidth - 316)),
        };
      }
      
      setPosition(newPosition);
    }
  }, [open, triggerPosition]);
  
  if (!open) {
    return null;
  }

  const contentStyle: React.CSSProperties = {
    touchAction: 'none',
    ...(position && {
      top: position.top !== undefined ? `${position.top}px` : 'auto',
      bottom: position.bottom !== undefined ? `${position.bottom}px` : 'auto',
      left: `${position.left}px`,
      right: 'auto',
      width: '300px',
    }),
  };

  return (
    <Drawer.Root 
      open={open} 
      onOpenChange={onOpenChange}
    >
      <Drawer.Overlay className="fixed inset-0 z-[9999] bg-black/40" onClick={() => onOpenChange(false)} />
      <Drawer.Content 
        className={`fixed z-[10000] flex flex-col bg-white rounded-[20px] max-h-[400px] outline-none focus:outline-none shadow-2xl ${
          !triggerPosition ? 'bottom-0 left-0 right-0 rounded-b-none' : ''
        }`}
        style={contentStyle}
      >
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-neutral-300 mt-3 mb-2" />
          
          {title ? (
            <Drawer.Title className="px-4 py-3 text-center text-sm font-medium text-neutral-500">
              {title}
            </Drawer.Title>
          ) : (
            <Drawer.Title className="sr-only">Действия</Drawer.Title>
          )}
          
          <Drawer.Description className="sr-only">
            Выберите действие из списка
          </Drawer.Description>
          
          <div className="flex flex-col">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  console.log('Action clicked:', action.label);
                  action.onClick();
                  if (!action.preventClose) {
                    onOpenChange(false);
                  }
                }}
                className={`w-full px-4 py-4 text-left text-base font-medium transition-colors active:bg-neutral-100 ${
                  action.destructive
                    ? "text-red-600"
                    : "text-neutral-900"
                } ${index !== actions.length - 1 ? "border-b border-neutral-200" : ""}`}
              >
                {action.label}
              </button>
            ))}
          </div>
          
          <div className="h-2 bg-neutral-100" />
          
          <button
            onClick={() => {
              console.log('Cancel clicked');
              onOpenChange(false);
            }}
            className="w-full px-4 py-4 text-base font-semibold text-neutral-900 transition-colors active:bg-neutral-100"
          >
            Отмена
          </button>
        </div>
        
        <div className="h-[env(safe-area-inset-bottom)]" />
      </Drawer.Content>
    </Drawer.Root>
  );
}
