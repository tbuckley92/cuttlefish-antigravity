
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = "", onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`
        backdrop-blur-md 
        bg-[rgb(var(--color-surface-glass))] dark:bg-white/5 
        border border-theme-border dark:border-white/10 
        rounded-theme-card 
        shadow-theme-card dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] 
        transition-all duration-300
        ${onClick ? 'cursor-pointer hover:bg-theme-surface/80 dark:hover:bg-white/10 hover:border-theme-border dark:hover:border-white/20 active:scale-[0.98]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

