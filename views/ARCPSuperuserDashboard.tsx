import React, { useState, useEffect, useMemo } from 'react';
import {
    ArrowLeft, Inbox, FileText, Send, Trash2, Plus, Search, X, Users,
    Calendar, Clock, CheckCircle2, AlertTriangle, Paperclip
} from '../components/Icons';
import { GlassCard } from '../components/GlassCard';
import {
    DeaneryMessage, DeaneryUser, MessageStatus, UserRole, NotificationType, Notification, MessageAttachment
} from '../types';

import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { uuidv4 } from '../utils/uuid';

// ============================================
// TYPES
// ============================================

type MessageFolder = 'inbox' | 'drafts' | 'sent' | 'scheduled' | 'deleted';

interface RecipientChip {
    id: string;
    name: string;
    email: string;
    roles: UserRole[];
}

interface ARCPSuperuserDashboardProps {
    currentUserId: string;
    currentUserName: string;
    currentUserDeanery: string;
    onBack: () => void;
}

// ============================================
// COMPONENT
// ============================================

const ARCPSuperuserDashboard: React.FC<ARCPSuperuserDashboardProps> = ({
    currentUserId,
    currentUserName,
    currentUserDeanery,
    onBack
}) => {
    // ============================================
    // STATE
    // ============================================
    const [activeFolder, setActiveFolder] = useState<MessageFolder>('inbox');
    const [messages, setMessages] = useState<DeaneryMessage[]>([]);
    const [inboxNotifications, setInboxNotifications] = useState<Notification[]>([]);
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Compose state
    const [recipients, setRecipients] = useState<RecipientChip[]>([]);
    const [recipientSearch, setRecipientSearch] = useState('');
    const [searchResults, setSearchResults] = useState<DeaneryUser[]>([]);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [scheduleMode, setScheduleMode] = useState<'now' | 'scheduled'>('now');
    const [scheduledAt, setScheduledAt] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Deanery users cache
    const [deaneryUsers, setDeaneryUsers] = useState<DeaneryUser[]>([]);

    // ============================================
    // DATA FETCHING
    // ============================================

    // Process scheduled messages on mount (triggers background processing)
    useEffect(() => {
        const processScheduled = async () => {
            if (!isSupabaseConfigured || !supabase) return;
            try {
                // Call the database function to move SCHEDULED -> SENT and create notifications
                const { error } = await supabase.rpc('process_scheduled_messages');
                if (error) console.error('Error processing scheduled messages:', error);
            } catch (err) {
                console.error('Failed to invoke process_scheduled_messages:', err);
            }
        };
        processScheduled();
    }, []);

    // Fetch deanery users (for recipient selection)
    useEffect(() => {
        const fetchDeaneryUsers = async () => {
            if (!isSupabaseConfigured || !supabase) return;

            const { data, error } = await supabase
                .from('user_profile')
                .select('user_id, name, email, roles, deanery')
                .eq('deanery', currentUserDeanery);

            if (error) {
                console.error('Error fetching deanery users:', error);
                return;
            }

            if (data) {
                const users: DeaneryUser[] = data.map(u => ({
                    id: u.user_id,
                    name: u.name || 'Unknown',
                    email: u.email || '',
                    roles: u.roles || [UserRole.Trainee],
                    deanery: u.deanery
                }));
                setDeaneryUsers(users);
            }
        };

        fetchDeaneryUsers();
    }, [currentUserDeanery]);

    // Fetch messages based on active folder
    useEffect(() => {
        const fetchMessages = async () => {
            setIsLoading(true);

            if (!isSupabaseConfigured || !supabase) {
                setIsLoading(false);
                return;
            }

            if (activeFolder === 'inbox') {
                // Inbox shows notifications received
                const { data, error } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', currentUserId)
                    .eq('type', 'deanery_broadcast')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Error fetching inbox:', error);
                } else if (data) {
                    setInboxNotifications(data.map(n => ({
                        id: n.id,
                        userId: n.user_id,
                        roleContext: n.role_context,
                        type: n.type as NotificationType,
                        title: n.title,
                        body: n.body,
                        referenceId: n.reference_id,
                        referenceType: n.reference_type,
                        emailSent: n.email_sent,
                        isRead: n.is_read,
                        createdAt: n.created_at,
                        metadata: n.metadata || {}
                    })));
                }
            } else {
                // Other folders show sent messages
                let query = supabase
                    .from('deanery_messages')
                    .select('*')
                    .eq('sender_id', currentUserId);

                if (activeFolder === 'drafts') {
                    query = query.eq('status', 'DRAFT');
                } else if (activeFolder === 'sent') {
                    query = query.eq('status', 'SENT');
                } else if (activeFolder === 'scheduled') {
                    query = query.eq('status', 'SCHEDULED');
                } else if (activeFolder === 'deleted') {
                    query = query.eq('status', 'DELETED');
                }

                query = query.order('created_at', { ascending: false });

                const { data, error } = await query;

                if (error) {
                    console.error('Error fetching messages:', error);
                } else if (data) {
                    setMessages(data.map(m => ({
                        id: m.id,
                        senderId: m.sender_id,
                        senderName: m.sender_name,
                        deanery: m.deanery,
                        recipientIds: m.recipient_ids || [],
                        recipientListType: m.recipient_list_type,
                        subject: m.subject,
                        body: m.body,
                        status: m.status as MessageStatus,
                        scheduledAt: m.scheduled_at,
                        sentAt: m.sent_at,
                        deletedAt: m.deleted_at,
                        createdAt: m.created_at,
                        updatedAt: m.updated_at,
                        attachments: m.attachments || []
                    })));
                }
            }

            setIsLoading(false);
        };

        fetchMessages();
    }, [activeFolder, currentUserId]);

    // ============================================
    // RECIPIENT SEARCH
    // ============================================

    useEffect(() => {
        // Trigger processing of any due scheduled messages when dashboard loads
        const processScheduled = async () => {
            if (!supabase) return;
            const { error } = await supabase.rpc('process_scheduled_messages');
            if (error) {
                console.error('Error processing scheduled messages:', error);
            } else {
                console.log('Processed scheduled messages check complete');
                // Refresh messages if we are in scheduled or sent folder
                if (activeFolder === 'scheduled' || activeFolder === 'sent') {
                    // We could trigger a refresh here, but let's leave it for now
                }
            }
        };
        processScheduled();
    }, []); // Run once on mount

    useEffect(() => {
        if (!recipientSearch.trim()) {
            setSearchResults([]);
            return;
        }

        const search = recipientSearch.toLowerCase();
        const filtered = deaneryUsers.filter(u =>
            !recipients.find(r => r.id === u.id) &&
            (u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search))
        );
        setSearchResults(filtered.slice(0, 8));
    }, [recipientSearch, deaneryUsers, recipients]);

    // ============================================
    // MAILING LIST HELPERS
    // ============================================

    const addMailingList = (type: 'trainees' | 'supervisors' | 'arcp_panel') => {
        let roleFilter: UserRole[];
        if (type === 'trainees') {
            roleFilter = [UserRole.Trainee];
        } else if (type === 'supervisors') {
            roleFilter = [UserRole.Supervisor, UserRole.EducationalSupervisor];
        } else {
            roleFilter = [UserRole.ARCPPanelMember];
        }

        const usersToAdd = deaneryUsers.filter(u =>
            u.roles.some(role => roleFilter.includes(role)) && !recipients.find(r => r.id === u.id)
        );

        const newRecipients: RecipientChip[] = usersToAdd.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            roles: u.roles
        }));

        setRecipients(prev => [...prev, ...newRecipients]);
    };

    const addRecipient = (user: DeaneryUser) => {
        if (!recipients.find(r => r.id === user.id)) {
            setRecipients(prev => [...prev, { id: user.id, name: user.name, email: user.email, roles: user.roles }]);
        }
        setRecipientSearch('');
        setSearchResults([]);
    };

    const removeRecipient = (id: string) => {
        setRecipients(prev => prev.filter(r => r.id !== id));
    };

    // ============================================
    // MESSAGE ACTIONS
    // ============================================

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !isSupabaseConfigured || !supabase) return;

        setIsUploading(true);
        const files: File[] = Array.from(e.target.files);

        // Process each file
        for (const file of files) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${uuidv4()}.${fileExt}`;
            const filePath = `${currentUserId}/${fileName}`;

            try {
                // Use message-attachments bucket
                const { error } = await supabase.storage
                    .from('message-attachments')
                    .upload(filePath, file);

                if (error) throw error;

                setAttachments(prev => [...prev, {
                    id: uuidv4(),
                    name: file.name,
                    url: filePath, // Storing storage path
                    type: file.type,
                    size: file.size
                }]);

            } catch (err: any) {
                console.error('Upload error:', err);
                alert(`Failed to upload ${file.name}: ${err.message}`);
            }
        }
        setIsUploading(false);
        // clear input
        e.target.value = '';
    };

    const removeAttachment = (id: string) => {
        setAttachments(prev => prev.filter(a => a.id !== id));
    };

    const resetCompose = () => {
        setRecipients([]);
        setRecipientSearch('');
        setSubject('');
        setBody('');
        setAttachments([]);
        setScheduleMode('now');
        setScheduledAt('');
        setIsComposing(false);
        setSelectedMessageId(null);
    };

    const handleSaveDraft = async () => {
        if (!isSupabaseConfigured || !supabase) return;

        const messageId = selectedMessageId || uuidv4();
        const payload = {
            id: messageId,
            sender_id: currentUserId,
            sender_name: currentUserName,
            deanery: currentUserDeanery,
            recipient_ids: recipients.map(r => r.id),
            recipient_list_type: 'custom',
            subject: subject || '(No Subject)',
            body: body,
            status: 'DRAFT',
            scheduled_at: scheduleMode === 'scheduled' && scheduledAt ? scheduledAt : null,
            attachments: attachments
        };

        const { error } = await supabase
            .from('deanery_messages')
            .upsert(payload);

        if (error) {
            console.error('Error saving draft:', error);
            alert('Failed to save draft');
        } else {
            resetCompose();
            setActiveFolder('drafts');
        }
    };

    const handleSend = async () => {
        if (recipients.length === 0) {
            alert('Please add at least one recipient');
            return;
        }
        if (!subject.trim()) {
            alert('Please enter a subject');
            return;
        }

        setIsSending(true);

        if (!isSupabaseConfigured || !supabase) {
            setIsSending(false);
            return;
        }

        try {
            const messageId = selectedMessageId || uuidv4();
            const isScheduled = scheduleMode === 'scheduled' && scheduledAt;
            const now = new Date().toISOString();

            // Save/update the message
            const messagePayload = {
                id: messageId,
                sender_id: currentUserId,
                sender_name: currentUserName,
                deanery: currentUserDeanery,
                recipient_ids: recipients.map(r => r.id),
                recipient_list_type: 'custom',
                subject: subject,
                body: body,
                status: isScheduled ? 'SCHEDULED' : 'SENT',
                scheduled_at: isScheduled ? new Date(scheduledAt).toISOString() : null,
                sent_at: isScheduled ? null : now,
                attachments: attachments
            };

            const { error: msgError } = await supabase
                .from('deanery_messages')
                .upsert(messagePayload);

            if (msgError) throw msgError;

            // If sending now (not scheduled), create notifications for recipients
            if (!isScheduled) {
                const notifications = recipients.map(r => {
                    // Determine role context based on user roles
                    // Prioritize Supervisor context if the user has supervisor roles
                    let roleContext: 'trainee' | 'supervisor' | 'arcp_panel' | 'admin' = 'trainee';

                    if (r.roles.some(role => [UserRole.Supervisor, UserRole.EducationalSupervisor].includes(role))) {
                        roleContext = 'supervisor';
                    } else if (r.roles.includes(UserRole.ARCPPanelMember)) {
                        roleContext = 'arcp_panel';
                    } else if (r.roles.includes(UserRole.Admin)) {
                        roleContext = 'admin';
                    } else {
                        roleContext = 'trainee';
                    }

                    return {
                        id: uuidv4(),
                        user_id: r.id,
                        role_context: roleContext,
                        type: 'deanery_broadcast',
                        title: subject,
                        body: body, // Provide a snippet? Body is full text. Inbox handles truncation.
                        // Attachments are stored in Notification too so recipient can see them easily
                        attachments: attachments,
                        reference_id: messageId,
                        reference_type: 'deanery_message',
                        metadata: {
                            sender: currentUserName,
                            senderId: currentUserId
                        },
                        email_sent: false,
                        is_read: false
                    };
                });

                const { error: notifError } = await supabase
                    .from('notifications')
                    .insert(notifications);

                if (notifError) {
                    console.error('Error creating notifications:', notifError);
                }
            }

            resetCompose();
            setActiveFolder('sent');
        } catch (err) {
            console.error('Error sending message:', err);
            alert('Failed to send message');
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteMessage = async (id: string) => {
        if (!isSupabaseConfigured || !supabase) return;

        const { error } = await supabase
            .from('deanery_messages')
            .update({ status: 'DELETED', deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error('Error deleting message:', error);
        } else {
            setMessages(prev => prev.filter(m => m.id !== id));
            setSelectedMessageId(null);
        }
    };

    const handleOpenDraft = (message: DeaneryMessage) => {
        // Load draft into compose panel
        const recipientChips: RecipientChip[] = message.recipientIds
            .map(id => {
                const user = deaneryUsers.find(u => u.id === id);
                return user ? { id: user.id, name: user.name, email: user.email } : null;
            })
            .filter((r): r is RecipientChip => r !== null);

        setRecipients(recipientChips);
        setSubject(message.subject);
        setBody(message.body);
        setAttachments(message.attachments || []);
        setScheduleMode(message.scheduledAt ? 'scheduled' : 'now');
        setScheduledAt(message.scheduledAt || '');
        setSelectedMessageId(message.id);
        setIsComposing(true);
    };

    // ============================================
    // FOLDER COUNTS
    // ============================================

    const folderCounts = useMemo(() => {
        // These would ideally come from separate count queries, but for now we'll show indicators
        return {
            inbox: inboxNotifications.filter(n => !n.isRead).length,
            drafts: 0,
            sent: 0,
            scheduled: 0,
            deleted: 0
        };
    }, [inboxNotifications]);

    // ============================================
    // RENDER HELPERS
    // ============================================

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        if (isToday) {
            return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    const getStatusBadge = (status: MessageStatus) => {
        switch (status) {
            case 'SCHEDULED':
                return <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 flex items-center gap-1"><Clock className="w-3 h-3" /> Scheduled</span>;
            case 'SENT':
                return <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Sent</span>;
            case 'DRAFT':
                return <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">Draft</span>;
            default:
                return null;
        }
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">

                <div>
                    <h1 className="text-xl font-bold text-slate-800">Message Centre</h1>
                    <p className="text-sm text-slate-500">{currentUserDeanery}</p>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex gap-4">
                {/* Folder Sidebar */}
                <div className="w-48 flex-shrink-0">
                    <GlassCard className="p-2">
                        <button
                            onClick={() => { setIsComposing(true); setSelectedMessageId(null); }}
                            className="w-full mb-3 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg shadow-blue-500/25"
                        >
                            <Plus className="w-4 h-4" />
                            New Message
                        </button>

                        <nav className="space-y-1">
                            {[
                                { id: 'inbox' as MessageFolder, icon: Inbox, label: 'Inbox', count: folderCounts.inbox },
                                { id: 'drafts' as MessageFolder, icon: FileText, label: 'Drafts', count: folderCounts.drafts },
                                { id: 'sent' as MessageFolder, icon: Send, label: 'Sent', count: folderCounts.sent },
                                { id: 'scheduled' as MessageFolder, icon: Clock, label: 'Scheduled', count: folderCounts.scheduled },
                                { id: 'deleted' as MessageFolder, icon: Trash2, label: 'Deleted Items', count: folderCounts.deleted },
                            ].map(folder => (
                                <button
                                    key={folder.id}
                                    onClick={() => { setActiveFolder(folder.id); setIsComposing(false); setSelectedMessageId(null); }}
                                    className={`w-full px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${activeFolder === folder.id && !isComposing
                                        ? 'bg-blue-100 text-blue-700 font-medium'
                                        : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    <folder.icon className="w-4 h-4" />
                                    <span className="flex-1 text-left">{folder.label}</span>
                                    {folder.count > 0 && (
                                        <span className="px-1.5 py-0.5 text-xs rounded-full bg-blue-500 text-white font-medium">
                                            {folder.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </nav>
                    </GlassCard>
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    <GlassCard className="h-[calc(100vh-180px)] flex flex-col">
                        {isComposing ? (
                            /* Compose Panel */
                            <div className="flex-1 flex flex-col p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-slate-800">
                                        {selectedMessageId ? 'Edit Draft' : 'New Message'}
                                    </h2>
                                    <button
                                        onClick={resetCompose}
                                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Recipients */}
                                <div className="mb-3">
                                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">To</label>
                                    <div className="border border-slate-200 rounded-xl p-2 bg-white/50 min-h-[44px]">
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {recipients.map(r => (
                                                <span
                                                    key={r.id}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                                                >
                                                    {r.name}
                                                    <button
                                                        onClick={() => removeRecipient(r.id)}
                                                        className="hover:bg-blue-200 rounded-full p-0.5"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={recipientSearch}
                                                onChange={(e) => setRecipientSearch(e.target.value)}
                                                placeholder="Type to search..."
                                                className="w-full bg-transparent text-sm outline-none placeholder-slate-400"
                                            />
                                            {searchResults.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-10 max-h-48 overflow-y-auto">
                                                    {searchResults.map(user => (
                                                        <button
                                                            key={user.id}
                                                            onClick={() => addRecipient(user)}
                                                            className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-sm"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-medium">
                                                                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-slate-800">{user.name}</div>
                                                                <div className="text-xs text-slate-500">{user.email}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Mailing list buttons */}
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={() => addMailingList('trainees')}
                                            className="px-3 py-1.5 text-xs rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 flex items-center gap-1"
                                        >
                                            <Users className="w-3 h-3" /> Trainees
                                        </button>
                                        <button
                                            onClick={() => addMailingList('supervisors')}
                                            className="px-3 py-1.5 text-xs rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 flex items-center gap-1"
                                        >
                                            <Users className="w-3 h-3" /> Supervisors
                                        </button>
                                        <button
                                            onClick={() => addMailingList('arcp_panel')}
                                            className="px-3 py-1.5 text-xs rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 flex items-center gap-1"
                                        >
                                            <Users className="w-3 h-3" /> ARCP Panel
                                        </button>
                                    </div>
                                </div>

                                {/* Subject */}
                                <div className="mb-3">
                                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Subject</label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="Message subject..."
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white/50 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>

                                {/* Body */}
                                <div className="mb-3">
                                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Message</label>
                                    <textarea
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                        placeholder="Write your message..."
                                        className="w-full h-64 px-3 py-2 border border-slate-200 rounded-xl bg-white/50 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 resize-none"
                                    />
                                </div>

                                {/* Attachments List */}
                                {attachments.length > 0 && (
                                    <div className="mb-4 flex flex-wrap gap-2">
                                        {attachments.map(att => (
                                            <div key={att.id} className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-sm border border-slate-200">
                                                <Paperclip className="w-3 h-3 text-slate-500" />
                                                <span className="text-slate-700 truncate max-w-[200px]">{att.name}</span>
                                                <button onClick={() => removeAttachment(att.id)} className="text-slate-400 hover:text-red-500">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Footer Actions */}
                                <div className="mt-auto border-t border-slate-100 pt-4 flex items-center justify-between">
                                    {/* Left: Attachments & Schedule */}
                                    <div className="flex items-center gap-4">
                                        <label className={`p-2 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors text-slate-500 hover:text-blue-500 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`} title="Attach File">
                                            <Paperclip className="w-5 h-5" />
                                            <input
                                                type="file"
                                                multiple
                                                className="hidden"
                                                onChange={handleFileSelect}
                                                disabled={isUploading}
                                            />
                                        </label>

                                        <div className="flex items-center gap-4 border-l border-slate-200 pl-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="schedule"
                                                    checked={scheduleMode === 'now'}
                                                    onChange={() => setScheduleMode('now')}
                                                    className="text-blue-500"
                                                />
                                                <span className="text-sm text-slate-700">Send Now</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="schedule"
                                                    checked={scheduleMode === 'scheduled'}
                                                    onChange={() => setScheduleMode('scheduled')}
                                                    className="text-blue-500"
                                                />
                                                <span className="text-sm text-slate-700">Schedule</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Right: Action Buttons and Date Picker */}
                                    <div className="flex items-center gap-3">
                                        {scheduleMode === 'scheduled' && (
                                            <input
                                                type="datetime-local"
                                                value={scheduledAt}
                                                onChange={(e) => setScheduledAt(e.target.value)}
                                                min={new Date().toISOString().slice(0, 16)}
                                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white/50"
                                            />
                                        )}

                                        <button
                                            onClick={handleSaveDraft}
                                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                                        >
                                            Save Draft
                                        </button>
                                        <button
                                            onClick={handleSend}
                                            disabled={isSending || isUploading}
                                            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-medium flex items-center gap-2 hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50"
                                        >
                                            <Send className="w-4 h-4" />
                                            {isSending ? 'Sending...' : scheduleMode === 'scheduled' ? 'Schedule' : 'Send'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Message List */
                            <div className="flex-1 flex flex-col">
                                <div className="p-4 border-b border-slate-200/50">
                                    <h2 className="text-lg font-semibold text-slate-800 capitalize">{activeFolder}</h2>
                                </div>

                                {isLoading ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-y-auto">
                                        {activeFolder === 'inbox' ? (
                                            inboxNotifications.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                                    <Inbox className="w-12 h-12 mb-2 opacity-50" />
                                                    <p>No messages</p>
                                                </div>
                                            ) : (
                                                inboxNotifications.map(n => (
                                                    <div
                                                        key={n.id}
                                                        className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer ${!n.isRead ? 'bg-blue-50/30' : ''
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className={`w-2 h-2 mt-2 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-blue-500'}`} />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start justify-between">
                                                                    <div className="flex-1 min-w-0 pr-2">
                                                                        <div className={`text-sm ${!n.isRead ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>
                                                                            {n.title}
                                                                        </div>
                                                                        {n.metadata?.sender && (
                                                                            <div className="text-xs text-slate-500 font-medium mt-0.5">
                                                                                From: {n.metadata.sender}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-xs text-slate-400 whitespace-nowrap">{formatDate(n.createdAt)}</span>
                                                                </div>
                                                                <p className="text-sm text-slate-500 truncate mt-0.5">{n.body}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )
                                        ) : messages.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                                <FileText className="w-12 h-12 mb-2 opacity-50" />
                                                <p>No messages in {activeFolder}</p>
                                            </div>
                                        ) : (
                                            messages.map(m => (
                                                <div
                                                    key={m.id}
                                                    onClick={() => activeFolder === 'drafts' ? handleOpenDraft(m) : setSelectedMessageId(m.id)}
                                                    className="px-4 py-3 border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium text-slate-800 truncate">{m.subject}</span>
                                                                {getStatusBadge(m.status)}
                                                            </div>
                                                            <p className="text-sm text-slate-500 truncate mt-0.5">{m.body}</p>
                                                            <p className="text-xs text-slate-400 mt-1">
                                                                To: {m.recipientIds.length} recipient{m.recipientIds.length !== 1 ? 's' : ''}
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="text-xs text-slate-400">{formatDate(m.createdAt)}</span>
                                                            {activeFolder !== 'deleted' && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteMessage(m.id); }}
                                                                    className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-500"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

export default ARCPSuperuserDashboard;
