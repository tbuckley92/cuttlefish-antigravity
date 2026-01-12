import React from 'react';
import { FileText, Clock, ShieldCheck } from './Icons';
import { EvidenceStatus } from '../types';
import { useTheme } from '../utils/ThemeContext';

interface StatusBadgeProps {
    status: EvidenceStatus;
    showIcon?: boolean;
    className?: string;
}

/**
 * Theme-aware status badge component.
 * - Default theme: Uses icon + colored background (existing style)
 * - Notion theme: Uses colored dot + muted text (Notion style)
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    showIcon = true,
    className = ''
}) => {
    const { theme } = useTheme();

    if (theme === 'notion') {
        return <NotionStatusBadge status={status} className={className} />;
    }

    return <DefaultStatusBadge status={status} showIcon={showIcon} className={className} />;
};

// Default theme status badge (current style)
const DefaultStatusBadge: React.FC<StatusBadgeProps> = ({ status, showIcon, className }) => {
    const getStatusColors = () => {
        switch (status) {
            case EvidenceStatus.SignedOff:
                return 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20';
            case EvidenceStatus.Submitted:
                return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
            case EvidenceStatus.Draft:
                return 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-white/40 border border-slate-200 dark:border-white/10';
            default:
                return 'bg-white/5 text-white/40';
        }
    };

    const getStatusIcon = () => {
        if (!showIcon) return null;
        switch (status) {
            case EvidenceStatus.SignedOff: return <ShieldCheck size={12} />;
            case EvidenceStatus.Submitted: return <Clock size={12} />;
            case EvidenceStatus.Draft: return <FileText size={12} />;
            default: return null;
        }
    };

    return (
        <span className={`
      inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium
      ${getStatusColors()}
      ${className}
    `}>
            {getStatusIcon()}
            {status}
        </span>
    );
};

// Notion theme status badge (dot + text style)
const NotionStatusBadge: React.FC<{ status: EvidenceStatus; className?: string }> = ({ status, className }) => {
    const getNotionStyles = () => {
        switch (status) {
            case EvidenceStatus.SignedOff:
                return {
                    bg: 'rgb(var(--status-complete-bg, 219 237 219))',
                    text: 'rgb(var(--status-complete-text, 28 56 41))',
                    dot: 'rgb(var(--status-complete-dot, 15 123 108))',
                    label: 'Complete'
                };
            case EvidenceStatus.Submitted:
                return {
                    bg: 'rgb(var(--status-submitted-bg, 211 229 239))',
                    text: 'rgb(var(--status-submitted-text, 24 51 71))',
                    dot: 'rgb(var(--status-submitted-dot, 35 131 226))',
                    label: 'Submitted'
                };
            case EvidenceStatus.Draft:
            default:
                return {
                    bg: 'rgb(var(--status-draft-bg, 227 226 224))',
                    text: 'rgb(var(--status-draft-text, 120 119 116))',
                    dot: 'rgb(var(--status-draft-dot, 120 119 116))',
                    label: 'Draft'
                };
        }
    };

    const styles = getNotionStyles();

    return (
        <span
            className={`
        inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium
        ${className}
      `}
            style={{
                backgroundColor: styles.bg,
                color: styles.text,
            }}
        >
            <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: styles.dot }}
            />
            {styles.label}
        </span>
    );
};

export default StatusBadge;
