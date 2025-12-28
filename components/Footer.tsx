
import React from 'react';
import { Users } from './Icons';

interface FooterProps {
  onNavigateToSupervisorDashboard: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateToSupervisorDashboard }) => {
  return (
    <footer className="mt-auto border-t border-slate-200 backdrop-blur-xl bg-white/40 dark:bg-white/5">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            © {new Date().getFullYear()} OphthaPortfolio. All rights reserved.
          </div>
          <button
            onClick={onNavigateToSupervisorDashboard}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-700 text-sm font-semibold hover:bg-indigo-600/20 transition-all"
          >
            <Users size={16} />
            Educational Supervisor Dashboard
          </button>
        </div>
      </div>
    </footer>
  );
};

