import React from 'react';
import { Rarity } from '../../types';
import { RARITY_CONFIG } from '../../config/designTokens';

interface RarityBadgeProps {
  rarity: Rarity;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const RarityBadge: React.FC<RarityBadgeProps> = ({ rarity, size = 'md', showDot = true }) => {
  const config = RARITY_CONFIG[rarity] || RARITY_CONFIG.Comum;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 tracking-wider',
    md: 'text-xs px-2.5 py-1 tracking-wider',
    lg: 'text-sm px-3.5 py-1.5 font-semibold tracking-wide',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-mono uppercase font-bold border transition-colors ${config.badge} ${sizeClasses[size]}`}
      style={{
        boxShadow: `0 0 10px ${config.bgGlow}`,
      }}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: config.color }}
        />
      )}
      {config.label}
    </span>
  );
};
