import React from 'react';
import { Coins, Zap } from 'lucide-react';

interface CurrencyBadgeProps {
  type: 'NEX' | 'NXA';
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const CurrencyBadge: React.FC<CurrencyBadgeProps> = ({
  type,
  amount,
  size = 'md',
  showLabel = true,
}) => {
  const isNEX = type === 'NEX';

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3.5 py-1.5 font-bold',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg font-mono font-bold tracking-tight border backdrop-blur-md ${sizeClasses[size]} ${
        isNEX
          ? 'bg-amber-950/40 text-amber-300 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
          : 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
      }`}
    >
      {isNEX ? (
        <Coins className={`${iconSizes[size]} text-amber-400`} />
      ) : (
        <Zap className={`${iconSizes[size]} text-cyan-400`} />
      )}
      <span>{Number(amount || 0).toLocaleString()}</span>
      {showLabel && (
        <span className={`text-[10px] font-sans opacity-75 uppercase tracking-wider ${isNEX ? 'text-amber-400' : 'text-cyan-400'}`}>
          {type}
        </span>
      )}
    </div>
  );
};
