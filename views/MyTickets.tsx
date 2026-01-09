import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, MessageSquare, AlertTriangle, Clock, CheckCircle2, XCircle, ChevronRight, Filter } from '../components/Icons';
import { Ticket, TicketMessage, TicketStatus } from '../types';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

interface MyTicketsProps {
    currentUserId: string;
    currentUserName: string;
    onBack: () => void;
    onRaiseTicket: () => void;
    onViewTicket: (ticket: Ticket) => void;
}

const MyTickets: React.FC<MyTicketsProps> = ({
    currentUserId,
    currentUserName,
    onBack,
    onRaiseTicket,
    onViewTicket
}) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<TicketStatus | 'ALL'>('ALL');

    const fetchTickets = async () => {
        if (!isSupabaseConfigured || !supabase) return;

        setIsLoading(true);
        try {
            let query = supabase
                .from('tickets')
                .select('*')
                .eq('user_id', currentUserId)
                .order('created_at', { ascending: false });

            if (filterStatus !== 'ALL') {
                query = query.eq('status', filterStatus);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching tickets:', error);
            } else {
                const mapped: Ticket[] = (data || []).map(row => ({
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
                setTickets(mapped);
            }
        } catch (err) {
            console.error('Exception fetching tickets:', err);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchTickets();
    }, [filterStatus]);

    const getStatusIcon = (status: TicketStatus) => {
        switch (status) {
            case TicketStatus.Open: return <Clock className="w-4 h-4 text-blue-500" />;
            case TicketStatus.InProgress: return <MessageSquare className="w-4 h-4 text-yellow-500" />;
            case TicketStatus.Resolved: return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case TicketStatus.Closed: return <XCircle className="w-4 h-4 text-slate-400" />;
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
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const openCount = tickets.filter(t => t.status === TicketStatus.Open || t.status === TicketStatus.InProgress).length;

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
                                <h1 className="text-xl font-bold text-slate-900">My Tickets</h1>
                                <p className="text-sm text-slate-500">
                                    {openCount > 0 ? `${openCount} open ticket${openCount !== 1 ? 's' : ''}` : 'No open tickets'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onRaiseTicket}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            New Ticket
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-8">
                {/* Filters */}
                <div className="flex items-center gap-2 mb-6">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <div className="flex flex-wrap gap-2">
                        {['ALL', TicketStatus.Open, TicketStatus.InProgress, TicketStatus.Resolved, TicketStatus.Closed].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status as TicketStatus | 'ALL')}
                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterStatus === status
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {status === 'ALL' ? 'All' : status.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tickets List */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-500">
                            <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
                            Loading tickets...
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="p-12 text-center">
                            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-700">No tickets found</h3>
                            <p className="text-slate-500 mt-1">
                                {filterStatus !== 'ALL' ? 'Try changing the filter' : "You haven't submitted any tickets yet"}
                            </p>
                            <button
                                onClick={onRaiseTicket}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Raise a Ticket
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {tickets.map(ticket => (
                                <button
                                    key={ticket.id}
                                    onClick={() => onViewTicket(ticket)}
                                    className="w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center gap-4"
                                >
                                    <div className="flex-shrink-0">
                                        {getStatusIcon(ticket.status)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            {ticket.isUrgent && (
                                                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                            )}
                                            <h3 className="font-medium text-slate-900 truncate">{ticket.subject}</h3>
                                        </div>
                                        <p className="text-sm text-slate-500 mt-1">
                                            Created {formatDate(ticket.createdAt)}
                                            {ticket.updatedAt !== ticket.createdAt && (
                                                <span> · Updated {formatDate(ticket.updatedAt)}</span>
                                            )}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                        {ticket.status.replace('_', ' ')}
                                    </span>
                                    <ChevronRight className="w-5 h-5 text-slate-400" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MyTickets;
