import React from 'react';
import { useGameState } from '../../contexts/GameStateContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { notifications, dismissNotification } = useGameState();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {notifications.map((note) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
          error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
          info: <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />,
        };

        const borderColors = {
          success: 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100',
          error: 'border-rose-500/40 bg-rose-950/90 text-rose-100',
          warning: 'border-amber-500/40 bg-amber-950/90 text-amber-100',
          info: 'border-cyan-500/40 bg-cyan-950/90 text-cyan-100',
        };

        return (
          <div
            key={note.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${borderColors[note.type]}`}
          >
            {icons[note.type]}
            <div className="flex-1 min-w-0">
              <h5 className="font-heading font-bold text-sm leading-tight text-white">
                {note.title}
              </h5>
              <p className="text-xs opacity-90 mt-0.5 leading-relaxed break-words">
                {note.message}
              </p>
            </div>
            <button
              onClick={() => dismissNotification(note.id)}
              className="text-white/60 hover:text-white transition-colors p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
