import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, Clock, CheckCircle2, XCircle, Send, User, Calendar, MessageSquare } from '../components/Icons';
import { Ticket, TicketMessage, TicketStatus, NotificationType } from '../types';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

interface TicketDetailProps {
    ticket: Ticket;
    currentUserId: string;
    currentUserName: string;
    isAdmin?: boolean;
    onBack: () => void;
    onTicketUpdated?: (ticket: Ticket) => void;
}

const TicketDetail: React.FC<TicketDetailProps> = ({
    ticket: initialTicket,
    currentUserId,
    currentUserName,
    isAdmin = false,
    onBack,
    onTicketUpdated
}) => {
    const [ticket, setTicket] = useState<Ticket>(initialTicket);
    const [messages, setMessages] = useState<TicketMessage[]>([]);
    const [replyText, setReplyText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    const fetchMessages = async () => {
        if (!isSupabaseConfigured || !supabase) return;

        setIsLoading(true);
        const { data, error } = await supabase
            .from('ticket_messages')
            .select('*')
            .eq('ticket_id', ticket.id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
        } else {
            const mapped: TicketMessage[] = (data || []).map(row => ({
                id: row.id,
                ticketId: row.ticket_id,
                senderId: row.sender_id,
                senderName: row.sender_name,
                senderRole: row.sender_role,
                message: row.message,
                createdAt: row.created_at
            }));
            setMessages(mapped);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchMessages();
    }, [ticket.id]);

    const handleSendReply = async () => {
        if (!replyText.trim() || !isSupabaseConfigured || !supabase) return;

        setIsSending(true);
        try {
            const senderRole = isAdmin ? 'admin' : 'user';

            // Insert message
            const { error: msgError } = await supabase
                .from('ticket_messages')
                .insert({
                    ticket_id: ticket.id,
                    sender_id: currentUserId,
                    sender_name: currentUserName,
                    sender_role: senderRole,
                    message: replyText.trim()
                });

            if (msgError) {
                console.error('Error sending message:', msgError);
                alert('Failed to send message');
                setIsSending(false);
                return;
            }

            // Create notification for the other party
            if (isAdmin) {
                // Notify ticket owner
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: ticket.userId,
                        role_context: 'trainee',
                        type: NotificationType.TicketResponse,
                        title: 'New response to your ticket',
                        body: ticket.subject,
                        reference_id: ticket.id,
                        reference_type: 'ticket'
                    });
            }
            // Note: User replies don't create notifications for admins in this version
            // Admins see new messages when they open tickets

            setReplyText('');
            fetchMessages();
        } catch (err) {
            console.error('Exception sending reply:', err);
        }
        setIsSending(false);
    };

    const getStatusIcon = (status: TicketStatus) => {
        switch (status) {
            case TicketStatus.Open: return <Clock className="w-5 h-5 text-blue-500" />;
            case TicketStatus.InProgress: return <MessageSquare className="w-5 h-5 text-yellow-500" />;
            case TicketStatus.Resolved: return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case TicketStatus.Closed: return <XCircle className="w-5 h-5 text-slate-400" />;
        }
    };

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
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const canReply = ticket.status === TicketStatus.Open || ticket.status === TicketStatus.InProgress;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
            {/* Header */}
            <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 border-b border-slate-200/50">
                <div className="max-w-3xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                {ticket.isUrgent && (
                                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> URGENT
                                    </span>
                                )}
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                    {ticket.status.replace('_', ' ')}
                                </span>
                            </div>
                            <h1 className="text-lg font-bold text-slate-900 mt-1 line-clamp-1">{ticket.subject}</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-8">
                {/* Ticket Info */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                            <User className="w-4 h-4" /> {ticket.userName}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" /> Created {formatDate(ticket.createdAt)}
                        </span>
                    </div>
                </div>

                {/* Messages */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-slate-50">
                        <h2 className="font-medium text-slate-700">Conversation</h2>
                    </div>

                    <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
                        {isLoading ? (
                            <div className="text-center py-8 text-slate-500">
                                <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
                                Loading messages...
                            </div>
                        ) : messages.length === 0 ? (
                            <p className="text-center py-8 text-slate-500">No messages yet</p>
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
                                                ({msg.senderRole === 'admin' ? 'Admin' : 'You'})
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
                    {canReply ? (
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
                    ) : (
                        <div className="p-4 border-t border-slate-200 bg-slate-50 text-center text-slate-500">
                            This ticket is {ticket.status.toLowerCase().replace('_', ' ')} and cannot receive new replies.
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default TicketDetail;
