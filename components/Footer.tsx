
import React from 'react';
import { Users, ClipboardCheck, Settings } from './Icons';
import { UserRole } from '../types';

interface FooterProps {
  onNavigateToSupervisorDashboard: () => void;
  onNavigateToARCPPanel?: () => void;
  onNavigateToAdminDashboard?: () => void;
  currentUserRoles?: UserRole[];
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateToSupervisorDashboard,
  onNavigateToARCPPanel,
  onNavigateToAdminDashboard,
  currentUserRoles = []
}) => {
  // Check if user has ARCP Panel access (Admin, ARCPPanelMember, or ARCPSuperuser)
  const hasARCPPanelAccess = currentUserRoles.some(role =>
    role === UserRole.Admin ||
    role === UserRole.ARCPPanelMember ||
    role === UserRole.ARCPSuperuser
  );

  // Check if user has Admin access
  const hasAdminAccess = currentUserRoles.some(role => role === UserRole.Admin);

  return (
    <footer className="mt-auto border-t border-slate-200 backdrop-blur-xl bg-white/40 dark:bg-white/5">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            © {new Date().getFullYear()} EyePortfolio. All rights reserved.
          </div>
          <div className="flex items-center gap-3">
            {hasAdminAccess && onNavigateToAdminDashboard && (
              <button
                onClick={onNavigateToAdminDashboard}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/10 border border-red-500/20 text-red-700 text-sm font-semibold hover:bg-red-600/20 transition-all"
              >
                <Settings size={16} />
                Admin Dashboard
              </button>
            )}
            {hasARCPPanelAccess && onNavigateToARCPPanel && (
              <button
                onClick={onNavigateToARCPPanel}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-700 text-sm font-semibold hover:bg-purple-600/20 transition-all"
              >
                <ClipboardCheck size={16} />
                ARCP Panel
              </button>
            )}
            <button
              onClick={onNavigateToSupervisorDashboard}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-700 text-sm font-semibold hover:bg-indigo-600/20 transition-all"
            >
              <Users size={16} />
              Educational Supervisor Dashboard
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

