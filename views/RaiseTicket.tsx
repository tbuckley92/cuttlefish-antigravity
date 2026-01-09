import React, { useState } from 'react';
import { ArrowLeft, Send, AlertTriangle, HelpCircle } from '../components/Icons';
import { Ticket, TicketStatus, NotificationType } from '../types';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { uuidv4 } from '../utils/uuid';

interface RaiseTicketProps {
    currentUserId: string;
    currentUserName: string;
    currentUserEmail?: string;
    onBack: () => void;
    onTicketCreated?: (ticketId: string) => void;
}

const RaiseTicket: React.FC<RaiseTicketProps> = ({
    currentUserId,
    currentUserName,
    currentUserEmail,
    onBack,
    onTicketCreated
}) => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!subject.trim() || !message.trim()) {
            setError('Please fill in all required fields');
            return;
        }

        if (!isSupabaseConfigured || !supabase) {
            setError('Database not configured');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const ticketId = uuidv4();

            // Create the ticket
            const { error: ticketError } = await supabase
                .from('tickets')
                .insert({
                    id: ticketId,
                    user_id: currentUserId,
                    user_name: currentUserName,
                    user_email: currentUserEmail,
                    subject: subject.trim(),
                    status: TicketStatus.Open,
                    is_urgent: isUrgent,
                    status_history: [{ status: TicketStatus.Open, changedBy: currentUserId, changedAt: new Date().toISOString() }]
                });

            if (ticketError) {
                console.error('Error creating ticket:', ticketError);
                setError('Failed to create ticket. Please try again.');
                setIsSubmitting(false);
                return;
            }

            // Create the first message
            const { error: msgError } = await supabase
                .from('ticket_messages')
                .insert({
                    ticket_id: ticketId,
                    sender_id: currentUserId,
                    sender_name: currentUserName,
                    sender_role: 'user',
                    message: message.trim()
                });

            if (msgError) {
                console.error('Error creating message:', msgError);
                // Ticket was created but message failed - still continue
            }

            // Create notification for admins (multiple admins will receive this)
            // For simplicity, we'll notify via a single notification that admins query
            // In production, you'd query all admin users and create one per admin
            await supabase
                .from('notifications')
                .insert({
                    user_id: currentUserId, // Self-notify (will be filtered in admin dashboard)
                    role_context: 'admin',
                    type: NotificationType.TicketCreated,
                    title: isUrgent ? '🔴 URGENT: New ticket submitted' : 'New ticket submitted',
                    body: `${currentUserName}: ${subject}`,
                    reference_id: ticketId,
                    reference_type: 'ticket'
                });

            if (onTicketCreated) {
                onTicketCreated(ticketId);
            } else {
                onBack();
            }
        } catch (err) {
            console.error('Exception creating ticket:', err);
            setError('An unexpected error occurred');
        }
        setIsSubmitting(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
            {/* Header */}
            <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 border-b border-slate-200/50">
                <div className="max-w-2xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Raise a Ticket</h1>
                            <p className="text-sm text-slate-500">Submit a support request</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-6 py-8">
                <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Subject */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Subject <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Brief description of your issue"
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Message <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Please describe your issue in detail..."
                            rows={6}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                            required
                        />
                    </div>

                    {/* Urgent Toggle */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isUrgent}
                                onChange={(e) => setIsUrgent(e.target.checked)}
                                className="mt-1 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                            />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    <span className="font-medium text-amber-800">Mark as Urgent</span>
                                </div>
                                <p className="text-sm text-amber-700 mt-1">
                                    Only flag as urgent if you need a response within 48 hours.
                                </p>
                            </div>
                        </label>
                    </div>

                    {/* Help Text */}
                    <div className="flex items-start gap-3 text-sm text-slate-500 bg-slate-50 rounded-lg p-4">
                        <HelpCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p>Your ticket will be reviewed by our admin team. You'll receive a notification when there's a response.</p>
                            <p className="mt-2">You can track your ticket status in <strong>My Tickets</strong>.</p>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onBack}
                            className="px-6 py-3 text-slate-600 font-medium rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !subject.trim() || !message.trim()}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-4 h-4" />
                            {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default RaiseTicket;
