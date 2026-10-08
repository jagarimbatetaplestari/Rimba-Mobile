'use client';

import React, { useEffect } from 'react';
import { useGameStore } from '@/lib/game/useGameStore';
import { CheckCircle2, AlertCircle, Info, Sparkles, X } from 'lucide-react';

export function NotificationToast() {
  const notification = useGameStore((state) => state.notification);
  const dismiss = useGameStore((state) => state.dismissNotification);
  const timeOfDay = useGameStore((state) => state.timeOfDay);

  const isNight = false;

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      dismiss();
    }, 4500);
    return () => clearTimeout(timer);
  }, [notification, dismiss]);

  if (!notification) return null;

  const getStyle = () => {
    switch (notification.type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />,
        };
      case 'reclamation':
        return {
          icon: <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />,
        };
      default:
        return {
          icon: <Info className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
        };
    }
  };

  const style = getStyle();

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-md w-[92%] animate-in fade-in slide-in-from-top-3 duration-200">
      <div className="flex items-center gap-3 p-3.5 px-4 rounded-full liquid-glass-elevated shadow-lg">
        <div className="flex-shrink-0">{style.icon}</div>
        <p
          className={`text-xs leading-snug flex-1 font-medium ${
            isNight ? 'text-emerald-950' : 'text-white'
          }`}
        >
          {notification.message}
        </p>
        <button
          onClick={dismiss}
          className={`p-1 rounded-full transition-all ${
            isNight
              ? 'text-slate-400 hover:text-slate-700 hover:bg-black/5'
              : 'text-emerald-200/80 hover:text-white hover:bg-white/10'
          }`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
