
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
        bg-white/40 dark:bg-white/5 
        border border-slate-200 dark:border-white/10 
        rounded-2xl 
        shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] 
        transition-all duration-300
        ${onClick ? 'cursor-pointer hover:bg-white/60 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 active:scale-[0.98]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
