import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, Check, CheckCheck, Trash2, Filter, ExternalLink, AlertTriangle, FileText, ClipboardCheck } from '../components/Icons';
import { Notification, NotificationType, RoleContext } from '../types';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

interface InboxProps {
    currentUserId: string;
    roleContext: RoleContext;
    onBack: () => void;
    onNavigateToTicket?: (ticketId: string) => void;
    onNavigateToEvidence?: (evidenceId: string) => void;
}

const Inbox: React.FC<InboxProps> = ({
    currentUserId,
    roleContext,
    onBack,
    onNavigateToTicket,
    onNavigateToEvidence
}) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterUnread, setFilterUnread] = useState(false);

    const fetchNotifications = async () => {
        if (!isSupabaseConfigured || !supabase) return;

        setIsLoading(true);
        try {
            let query = supabase
                .from('notifications')
                .select('*')
                .eq('user_id', currentUserId)
                .eq('role_context', roleContext)
                .order('created_at', { ascending: false })
                .limit(50);

            if (filterUnread) {
                query = query.eq('is_read', false);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching notifications:', error);
            } else {
                const mapped: Notification[] = (data || []).map(row => ({
                    id: row.id,
                    userId: row.user_id,
                    roleContext: row.role_context,
                    type: row.type,
                    title: row.title,
                    body: row.body,
                    referenceId: row.reference_id,
                    referenceType: row.reference_type,
                    emailSent: row.email_sent,
                    isRead: row.is_read,
                    createdAt: row.created_at
                }));
                setNotifications(mapped);
            }
        } catch (err) {
            console.error('Exception fetching notifications:', err);
        }
        setIsLoading(false);
    };

    const markAsRead = async (notificationId: string) => {
        if (!isSupabaseConfigured || !supabase) return;

        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
    };

    const markAllAsRead = async () => {
        if (!isSupabaseConfigured || !supabase) return;

        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', currentUserId)
            .eq('role_context', roleContext)
            .eq('is_read', false);

        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const deleteNotification = async (notificationId: string) => {
        if (!isSupabaseConfigured || !supabase) return;

        await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId);

        setNotifications(prev => prev.filter(n => n.id !== notificationId));
    };

    const handleNotificationClick = (notification: Notification) => {
        markAsRead(notification.id);

        if (notification.referenceId && notification.referenceType === 'ticket' && onNavigateToTicket) {
            onNavigateToTicket(notification.referenceId);
        } else if (notification.referenceId && notification.referenceType === 'evidence' && onNavigateToEvidence) {
            onNavigateToEvidence(notification.referenceId);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [roleContext, filterUnread]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const getNotificationIcon = (type: NotificationType) => {
        switch (type) {
            case NotificationType.TicketCreated:
            case NotificationType.TicketResponse:
            case NotificationType.TicketStatusChange:
                return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            case NotificationType.FormSigned:
                return <FileText className="w-5 h-5 text-green-500" />;
            case NotificationType.ARCPOutcome:
                return <ClipboardCheck className="w-5 h-5 text-indigo-500" />;
            default:
                return <Bell className="w-5 h-5 text-slate-500" />;
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    const getRoleLabel = (role: RoleContext) => {
        switch (role) {
            case 'trainee': return 'Trainee';
            case 'supervisor': return 'Supervisor';
            case 'arcp_panel': return 'ARCP Panel';
            case 'admin': return 'Admin';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
            {/* Header */}
            <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 border-b border-slate-200/50">
                <div className="max-w-3xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onBack}
                                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-600" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900">Inbox</h1>
                                <p className="text-sm text-slate-500">{getRoleLabel(roleContext)} notifications</p>
                            </div>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                                <CheckCheck className="w-4 h-4" />
                                Mark all read
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-8">
                {/* Filter Toggle */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-500" />
                        <button
                            onClick={() => setFilterUnread(!filterUnread)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterUnread
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            Unread only {unreadCount > 0 && `(${unreadCount})`}
                        </button>
                    </div>
                </div>

                {/* Notifications List */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-500">
                            <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
                            Loading notifications...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <Bell className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                            <h3 className="font-medium text-slate-700">No notifications</h3>
                            <p className="text-sm mt-1">
                                {filterUnread ? 'No unread notifications' : 'Your inbox is empty'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`group flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors cursor-pointer ${!notification.isRead ? 'bg-indigo-50/50' : ''
                                        }`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    {/* Icon */}
                                    <div className="flex-shrink-0 mt-1">
                                        {getNotificationIcon(notification.type)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h4 className={`text-sm ${!notification.isRead ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                                                    {notification.title}
                                                </h4>
                                                {notification.body && (
                                                    <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{notification.body}</p>
                                                )}
                                            </div>
                                            <span className="text-xs text-slate-400 whitespace-nowrap">
                                                {formatDate(notification.createdAt)}
                                            </span>
                                        </div>

                                        {/* Unread indicator */}
                                        {!notification.isRead && (
                                            <div className="w-2 h-2 rounded-full bg-indigo-500 absolute right-4 top-1/2 -translate-y-1/2" />
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!notification.isRead && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Mark as read"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        {notification.referenceId && (
                                            <ExternalLink className="w-4 h-4 text-slate-400" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Inbox;
