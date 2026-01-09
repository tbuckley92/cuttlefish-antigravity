import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Inbox, AlertTriangle, Clock, CheckCircle2, MessageSquare, Send, Filter, RefreshCw, User, Calendar, ChevronRight } from '../../components/Icons';
import { Ticket, TicketMessage, TicketStatus, UserRole, Notification, NotificationType } from '../../types';
import { supabase, isSupabaseConfigured } from '../../utils/supabaseClient';

interface AdminDashboardProps {
    currentUserId: string;
    currentUserName: string;
    onBack: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
    currentUserId,
    currentUserName,
    onBack
}) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<TicketMessage[]>([]);
    const [replyText, setReplyText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [filterStatus, setFilterStatus] = useState<TicketStatus | 'ALL'>('ALL');
    const [filterUrgent, setFilterUrgent] = useState(false);

    // Fetch tickets
    const fetchTickets = async () => {
        if (!isSupabaseConfigured || !supabase) return;

        setIsLoading(true);
        try {
            let query = supabase
                .from('tickets')
                .select('*')
                .neq('user_id', currentUserId) // Exclude own tickets from admin queue
                .order('is_urgent', { ascending: false })
                .order('created_at', { ascending: false });

            if (filterStatus !== 'ALL') {
                query = query.eq('status', filterStatus);
            }

            if (filterUrgent) {
                query = query.eq('is_urgent', true);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching tickets:', error);
            } else {
                const mappedTickets: Ticket[] = (data || []).map(row => ({
                    id: row.id,
                    userId: row.user_id,
                    userName: row.user_name,
                    userEmail: row.user_email,
                    subject: row.subject,
                    status: row.status as TicketStatus,
                    isUrgent: row.is_urgent,
                    statusHistory: row.status_history,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                }));
                setTickets(mappedTickets);
            }
        } catch (err) {
            console.error('Exception fetching tickets:', err);
        }
        setIsLoading(false);
    };

    // Fetch messages for selected ticket
    const fetchMessages = async (ticketId: string) => {
        if (!isSupabaseConfigured || !supabase) return;

        const { data, error } = await supabase
            .from('ticket_messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
        } else {
            const mappedMessages: TicketMessage[] = (data || []).map(row => ({
                id: row.id,
                ticketId: row.ticket_id,
                senderId: row.sender_id,
                senderName: row.sender_name,
                senderRole: row.sender_role,
                message: row.message,
                createdAt: row.created_at
            }));
            setMessages(mappedMessages);
        }
    };

    // Send reply
    const handleSendReply = async () => {
        if (!selectedTicket || !replyText.trim() || !isSupabaseConfigured || !supabase) return;

        setIsSending(true);
        try {
            // Insert message
            const { error: msgError } = await supabase
                .from('ticket_messages')
                .insert({
                    ticket_id: selectedTicket.id,
                    sender_id: currentUserId,
                    sender_name: currentUserName,
                    sender_role: 'admin',
                    message: replyText.trim()
                });

            if (msgError) {
                console.error('Error sending message:', msgError);
                alert('Failed to send message');
                setIsSending(false);
                return;
            }

            // Update ticket status to IN_PROGRESS if currently OPEN
            if (selectedTicket.status === TicketStatus.Open) {
                const newHistory = [
                    ...(selectedTicket.statusHistory || []),
                    { status: TicketStatus.InProgress, changedBy: currentUserId, changedAt: new Date().toISOString() }
                ];

                await supabase
                    .from('tickets')
                    .update({
                        status: TicketStatus.InProgress,
                        status_history: newHistory
                    })
                    .eq('id', selectedTicket.id);

                setSelectedTicket({ ...selectedTicket, status: TicketStatus.InProgress, statusHistory: newHistory });
            }

            // Create notification for ticket owner
            await supabase
                .from('notifications')
                .insert({
                    user_id: selectedTicket.userId,
                    role_context: 'trainee',
                    type: NotificationType.TicketResponse,
                    title: 'New response to your ticket',
                    body: `Admin replied to: ${selectedTicket.subject}`,
                    reference_id: selectedTicket.id,
                    reference_type: 'ticket'
                });

            setReplyText('');
            fetchMessages(selectedTicket.id);
        } catch (err) {
            console.error('Exception sending reply:', err);
        }
        setIsSending(false);
    };

    // Update ticket status
    const handleStatusChange = async (newStatus: TicketStatus) => {
        if (!selectedTicket || !isSupabaseConfigured || !supabase) return;

        const newHistory = [
            ...(selectedTicket.statusHistory || []),
            { status: newStatus, changedBy: currentUserId, changedAt: new Date().toISOString() }
        ];

        const { error } = await supabase
            .from('tickets')
            .update({
                status: newStatus,
                status_history: newHistory
            })
            .eq('id', selectedTicket.id);

        if (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
            return;
        }

        // Notify user of status change
        await supabase
            .from('notifications')
            .insert({
                user_id: selectedTicket.userId,
                role_context: 'trainee',
                type: NotificationType.TicketStatusChange,
                title: `Ticket status changed to ${newStatus}`,
                body: selectedTicket.subject,
                reference_id: selectedTicket.id,
                reference_type: 'ticket'
            });

        setSelectedTicket({ ...selectedTicket, status: newStatus, statusHistory: newHistory });
        fetchTickets();
    };

    useEffect(() => {
        fetchTickets();
    }, [filterStatus, filterUrgent]);

    useEffect(() => {
        if (selectedTicket) {
            fetchMessages(selectedTicket.id);
        }
    }, [selectedTicket?.id]);

    // Stats
    const stats = useMemo(() => {
        const open = tickets.filter(t => t.status === TicketStatus.Open).length;
        const inProgress = tickets.filter(t => t.status === TicketStatus.InProgress).length;
        const urgent = tickets.filter(t => t.isUrgent && t.status !== TicketStatus.Closed).length;
        return { open, inProgress, urgent, total: tickets.length };
    }, [tickets]);

    const getStatusColor = (status: TicketStatus) => {
        switch (status) {
            case TicketStatus.Open: return 'bg-blue-100 text-blue-700';
            case TicketStatus.InProgress: return 'bg-yellow-100 text-yellow-700';
            case TicketStatus.Resolved: return 'bg-green-100 text-green-700';
            case TicketStatus.Closed: return 'bg-slate-100 text-slate-600';
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
            {/* Header */}
            <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onBack}
                                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-600" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900">Admin Dashboard</h1>
                                <p className="text-sm text-slate-500">Manage support tickets</p>
                            </div>
                        </div>
                        <button
                            onClick={fetchTickets}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Inbox className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{stats.open}</p>
                                <p className="text-sm text-slate-500">Open</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{stats.inProgress}</p>
                                <p className="text-sm text-slate-500">In Progress</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{stats.urgent}</p>
                                <p className="text-sm text-slate-500">Urgent</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                <MessageSquare className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                                <p className="text-sm text-slate-500">Total</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-6">
                    {/* Ticket List */}
                    <div className="w-1/3">
                        {/* Filters */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Filter className="w-4 h-4 text-slate-500" />
                                <span className="text-sm font-medium text-slate-700">Filters</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {['ALL', TicketStatus.Open, TicketStatus.InProgress, TicketStatus.Resolved, TicketStatus.Closed].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(status as TicketStatus | 'ALL')}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterStatus === status
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        {status === 'ALL' ? 'All' : status.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                            <label className="flex items-center gap-2 mt-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filterUrgent}
                                    onChange={(e) => setFilterUrgent(e.target.checked)}
                                    className="rounded border-slate-300"
                                />
                                <span className="text-sm text-slate-600">Urgent only</span>
                            </label>
                        </div>

                        {/* Ticket List */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            {isLoading ? (
                                <div className="p-8 text-center text-slate-500">
                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    Loading tickets...
                                </div>
                            ) : tickets.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    No tickets found
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                                    {tickets.map(ticket => (
                                        <button
                                            key={ticket.id}
                                            onClick={() => setSelectedTicket(ticket)}
                                            className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${selectedTicket?.id === ticket.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        {ticket.isUrgent && (
                                                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                                        )}
                                                        <h3 className="font-medium text-slate-900 truncate">{ticket.subject}</h3>
                                                    </div>
                                                    <p className="text-sm text-slate-500 mt-1">{ticket.userName}</p>
                                                    <p className="text-xs text-slate-400 mt-1">{formatDate(ticket.createdAt)}</p>
                                                </div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                                    {ticket.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Ticket Detail */}
                    <div className="flex-1">
                        {selectedTicket ? (
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                {/* Ticket Header */}
                                <div className="p-6 border-b border-slate-200">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                {selectedTicket.isUrgent && (
                                                    <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium flex items-center gap-1">
                                                        <AlertTriangle className="w-3 h-3" /> URGENT
                                                    </span>
                                                )}
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                                                    {selectedTicket.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <h2 className="text-xl font-bold text-slate-900 mt-2">{selectedTicket.subject}</h2>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <User className="w-4 h-4" /> {selectedTicket.userName}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" /> {formatDate(selectedTicket.createdAt)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Status Actions */}
                                        <div className="flex gap-2">
                                            {selectedTicket.status === TicketStatus.InProgress && (
                                                <button
                                                    onClick={() => handleStatusChange(TicketStatus.Resolved)}
                                                    className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" /> Resolve
                                                </button>
                                            )}
                                            {selectedTicket.status === TicketStatus.Resolved && (
                                                <button
                                                    onClick={() => handleStatusChange(TicketStatus.Closed)}
                                                    className="px-3 py-2 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                                                >
                                                    Close
                                                </button>
                                            )}
                                            {selectedTicket.status === TicketStatus.Open && (
                                                <button
                                                    onClick={() => handleStatusChange(TicketStatus.InProgress)}
                                                    className="px-3 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
                                                >
                                                    Mark In Progress
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="p-6 max-h-[400px] overflow-y-auto space-y-4">
                                    {messages.length === 0 ? (
                                        <p className="text-center text-slate-500 py-8">No messages yet</p>
                                    ) : (
                                        messages.map(msg => (
                                            <div
                                                key={msg.id}
                                                className={`p-4 rounded-lg ${msg.senderRole === 'admin'
                                                    ? 'bg-indigo-50 border border-indigo-100 ml-8'
                                                    : 'bg-slate-50 border border-slate-100 mr-8'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium text-sm text-slate-700">
                                                        {msg.senderName}
                                                        <span className={`ml-2 text-xs ${msg.senderRole === 'admin' ? 'text-indigo-600' : 'text-slate-500'}`}>
                                                            ({msg.senderRole === 'admin' ? 'Admin' : 'User'})
                                                        </span>
                                                    </span>
                                                    <span className="text-xs text-slate-400">{formatDate(msg.createdAt)}</span>
                                                </div>
                                                <p className="text-slate-700 whitespace-pre-wrap">{msg.message}</p>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Reply Input */}
                                {selectedTicket.status !== TicketStatus.Closed && (
                                    <div className="p-4 border-t border-slate-200 bg-slate-50">
                                        <div className="flex gap-3">
                                            <textarea
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                placeholder="Type your reply..."
                                                rows={3}
                                                className="flex-1 px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                                            />
                                            <button
                                                onClick={handleSendReply}
                                                disabled={!replyText.trim() || isSending}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end flex items-center gap-2"
                                            >
                                                <Send className="w-4 h-4" />
                                                {isSending ? 'Sending...' : 'Send'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-slate-700">Select a ticket</h3>
                                <p className="text-slate-500 mt-1">Choose a ticket from the list to view details and respond</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
