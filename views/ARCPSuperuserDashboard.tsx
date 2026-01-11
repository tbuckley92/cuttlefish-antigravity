import React, { useState, useEffect, useMemo } from 'react';
import {
    ArrowLeft, Inbox, FileText, Send, Trash2, Plus, Search, X, Users,
    Calendar, Clock, CheckCircle2, AlertTriangle, Paperclip, UserPlus,
    UserMinus, Shield, MoreHorizontal, ChevronRight, Settings, MapPin, ShieldCheck
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
    // Selected message for reading pane
    const [selectedMessage, setSelectedMessage] = useState<DeaneryMessage | Notification | null>(null);
    const [isComposing, setIsComposing] = useState(false);

    // Panel Management State
    const [showAddMember, setShowAddMember] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');

    // Message List State
    const [isLoading, setIsLoading] = useState(true);
    const [messageSearch, setMessageSearch] = useState('');

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

    // Process scheduled messages on mount
    useEffect(() => {
        const processScheduled = async () => {
            if (!isSupabaseConfigured || !supabase) return;
            try {
                await supabase.rpc('process_scheduled_messages');
            } catch (err) {
                console.error('Failed to invoke process_scheduled_messages:', err);
            }
        };
        processScheduled();
    }, []);

    // Fetch deanery users
    const fetchDeaneryUsers = async () => {
        if (!isSupabaseConfigured || !supabase) return;

        const { data, error } = await supabase
            .from('user_profile')
            .select('user_id, name, email, roles, deanery, gmc_number')
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
                deanery: u.deanery,
                gmcNumber: u.gmc_number
            }));
            setDeaneryUsers(users);
        }
    };

    useEffect(() => {
        fetchDeaneryUsers();
    }, [currentUserDeanery]);

    // Fetch messages based on active folder
    useEffect(() => {
        const fetchMessages = async () => {
            setIsLoading(true);
            setSelectedMessage(null); // Deselect when switching folders

            if (!isSupabaseConfigured || !supabase) {
                setIsLoading(false);
                return;
            }

            if (activeFolder === 'inbox') {
                const { data, error } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', currentUserId)
                    .eq('type', 'deanery_broadcast')
                    .order('created_at', { ascending: false });

                if (error) console.error('Error fetching inbox:', error);
                else if (data) {
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
                        metadata: n.metadata || {},
                        attachments: n.attachments
                    })));
                }
            } else {
                let query = supabase
                    .from('deanery_messages')
                    .select('*')
                    .eq('sender_id', currentUserId);

                if (activeFolder === 'drafts') query = query.eq('status', 'DRAFT');
                else if (activeFolder === 'sent') query = query.eq('status', 'SENT');
                else if (activeFolder === 'scheduled') query = query.eq('status', 'SCHEDULED');
                else if (activeFolder === 'deleted') query = query.eq('status', 'DELETED');

                query = query.order('created_at', { ascending: false });

                const { data, error } = await query;

                if (error) console.error('Error fetching messages:', error);
                else if (data) {
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
    // PANEL MANAGEMENT
    // ============================================

    const panelMembers = useMemo(() => {
        return deaneryUsers.filter(u => u.roles.includes(UserRole.ARCPPanelMember));
    }, [deaneryUsers]);

    const availableForPanel = useMemo(() => {
        if (!memberSearch.trim()) return [];
        return deaneryUsers.filter(u =>
            !u.roles.includes(UserRole.ARCPPanelMember) &&
            (u.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                u.email.toLowerCase().includes(memberSearch.toLowerCase()))
        ).slice(0, 5);
    }, [deaneryUsers, memberSearch]);

    const handleTogglePanelRole = async (userId: string, enable: boolean) => {
        if (!isSupabaseConfigured || !supabase) return;

        try {
            const { error } = await supabase.rpc('toggle_arcp_panel_role', {
                target_user_id: userId,
                enable: enable
            });

            if (error) throw error;

            // Refresh users to reflect changes
            await fetchDeaneryUsers();
            setMemberSearch('');
            setShowAddMember(false);
        } catch (err: any) {
            console.error('Error toggling role:', err);
            alert(`Failed to update role: ${err.message}`);
        }
    };

    // ============================================
    // RECIPIENT SEARCH
    // ============================================

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

        for (const file of files) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${uuidv4()}.${fileExt}`;
            const filePath = `${currentUserId}/${fileName}`;

            try {
                const { error } = await supabase.storage
                    .from('message-attachments')
                    .upload(filePath, file);

                if (error) throw error;

                setAttachments(prev => [...prev, {
                    id: uuidv4(),
                    name: file.name,
                    url: filePath,
                    type: file.type,
                    size: file.size
                }]);

            } catch (err: any) {
                console.error('Upload error:', err);
                alert(`Failed to upload ${file.name}: ${err.message}`);
            }
        }
        setIsUploading(false);
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
    };

    const handleSaveDraft = async () => {
        if (!isSupabaseConfigured || !supabase) return;

        // If editing an existing message, use its ID? 
        // For simplicity, we create new drafts or update if we had an ID.
        // But for this redesign, let's treat compose as new. 
        // If editing a draft, we'd need to store the editing ID.
        const messageId = uuidv4();

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

        const { error } = await supabase.from('deanery_messages').upsert(payload);

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
            const messageId = uuidv4();
            const isScheduled = scheduleMode === 'scheduled' && scheduledAt;
            const now = new Date().toISOString();

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

            if (!isScheduled) {
                const notifications = recipients.map(r => {
                    let roleContext: 'trainee' | 'supervisor' | 'arcp_panel' | 'admin' = 'trainee';
                    if (r.roles.some(role => [UserRole.Supervisor, UserRole.EducationalSupervisor].includes(role))) {
                        roleContext = 'supervisor';
                    } else if (r.roles.includes(UserRole.ARCPPanelMember)) {
                        roleContext = 'arcp_panel';
                    }

                    return {
                        id: uuidv4(),
                        user_id: r.id,
                        role_context: roleContext,
                        type: 'deanery_broadcast',
                        title: subject,
                        body: body,
                        attachments: attachments,
                        reference_id: messageId,
                        reference_type: 'deanery_message',
                        metadata: { sender: currentUserName, senderId: currentUserId },
                        email_sent: false,
                        is_read: false
                    };
                });

                await supabase.from('notifications').insert(notifications);
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

        // If it's a notification (inbox)
        if (activeFolder === 'inbox') {
            // For notifications, we arguably just mark them read or archive? 
            // But let's assume delete means remove notification
            await supabase.from('notifications').delete().eq('id', id);
            setInboxNotifications(prev => prev.filter(n => n.id !== id));
        } else {
            // For messages
            await supabase
                .from('deanery_messages')
                .update({ status: 'DELETED', deleted_at: new Date().toISOString() })
                .eq('id', id);
            setMessages(prev => prev.filter(m => m.id !== id));
        }
        setSelectedMessage(null);
    };

    const handleOpenDraft = (message: DeaneryMessage) => {
        const recipientChips: RecipientChip[] = message.recipientIds
            .map(id => {
                const user = deaneryUsers.find(u => u.id === id);
                return user ? { id: user.id, name: user.name, email: user.email, roles: user.roles } : null;
            })
            .filter((r): r is RecipientChip => r !== null);

        setRecipients(recipientChips);
        setSubject(message.subject);
        setBody(message.body);
        setAttachments(message.attachments || []);
        setScheduleMode(message.scheduledAt ? 'scheduled' : 'now');
        setScheduledAt(message.scheduledAt || '');
        setIsComposing(true);
        setSelectedMessage(null);
    };

    // ============================================
    // DERIVED
    // ============================================

    const folderCounts = useMemo(() => {
        return {
            inbox: inboxNotifications.filter(n => !n.isRead).length,
            drafts: 0,
            sent: 0,
            scheduled: 0,
            deleted: 0
        };
    }, [inboxNotifications]);

    // Format date helpers
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    const getStatusBadge = (status: MessageStatus) => {
        switch (status) {
            case 'SCHEDULED': return <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-100 text-amber-700">Scheduled</span>;
            case 'SENT': return <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-100 text-emerald-700">Sent</span>;
            case 'DRAFT': return <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-600">Draft</span>;
            default: return null;
        }
    };

    const filteredList = useMemo(() => {
        if (activeFolder === 'inbox') {
            if (!messageSearch) return inboxNotifications;
            return inboxNotifications.filter(n =>
                n.title.toLowerCase().includes(messageSearch.toLowerCase()) ||
                n.body?.toLowerCase().includes(messageSearch.toLowerCase())
            );
        } else {
            if (!messageSearch) return messages;
            return messages.filter(m =>
                m.subject.toLowerCase().includes(messageSearch.toLowerCase()) ||
                m.body.toLowerCase().includes(messageSearch.toLowerCase())
            );
        }
    }, [activeFolder, inboxNotifications, messages, messageSearch]);

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="flex flex-col h-[calc(100vh-5rem)] max-w-[1600px] mx-auto px-4 pb-4 font-sans">
            <div className="flex-1 flex bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

                {/* COLUMN 1: Profile & Widget Card */}
                <div className="w-80 flex-shrink-0 flex flex-col p-4 gap-4 border-r border-slate-200 bg-white min-h-0">
                    <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors flex-shrink-0">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>

                    {/* Profile Card */}
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex-shrink-0">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                                {currentUserName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-900 text-base">{currentUserName}</h2>
                                <button className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1">
                                    Edit Profile <Settings size={10} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-[11px]">
                            <div className="flex items-start gap-2">
                                <div className="text-slate-400 mt-0.5 flex-shrink-0"><MapPin size={13} /></div>
                                <div>
                                    <div className="text-[#94a3b8] text-[9px] uppercase tracking-widest font-bold mb-0">Active Deanery Connections</div>
                                    <div className="text-slate-900 font-medium text-[13px] tracking-tight">{currentUserDeanery}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-start gap-2">
                                    <div className="text-slate-400 mt-0.5 flex-shrink-0"><ShieldCheck size={13} /></div>
                                    <div>
                                        <div className="text-[#94a3b8] text-[9px] uppercase tracking-widest font-bold mb-0">GMC No.</div>
                                        <div className="text-slate-700 font-mono text-[11px] font-medium">1234567</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="text-slate-400 mt-0.5 flex-shrink-0"><ShieldCheck size={13} /></div>
                                    <div>
                                        <div className="text-[#94a3b8] text-[9px] uppercase tracking-widest font-bold mb-0">RCOphth No.</div>
                                        <div className="text-slate-700 font-mono text-[11px] font-medium">110423</div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100">
                                <div className="text-[#94a3b8] text-[9px] uppercase tracking-widest font-bold mb-2">Roles</div>
                                <div className="inline-block px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold tracking-tight">ARCP Panel Superuser</div>
                            </div>
                        </div>
                    </div>

                    {/* ARCP Panel Widget */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm flex-1 min-h-0">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
                            <div>
                                <h3 className="font-semibold text-slate-800 text-sm">ARCP Panel</h3>
                                <div className="text-[11px] text-slate-500">Deanery: {currentUserDeanery}</div>
                            </div>
                            <button
                                onClick={() => setShowAddMember(true)}
                                className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {panelMembers.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">No panel members assigned.</div>
                            ) : (
                                panelMembers.map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 group border border-transparent hover:border-slate-100 transition-all">
                                        <div>
                                            <div className="font-medium text-slate-800 text-sm">{member.name}</div>
                                            <div className="text-xs text-slate-500 font-mono">GMC: {member.gmcNumber || 'N/A'}</div>
                                        </div>
                                        <button
                                            onClick={() => handleTogglePanelRole(member.id, false)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="Remove Role"
                                        >
                                            <UserMinus className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add Member Popover/Area */}
                        {showAddMember && (
                            <div className="p-3 border-t border-slate-100 bg-slate-50 animate-in slide-in-from-bottom-2 fade-in flex-shrink-0">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-500">Add Member</span>
                                    <button onClick={() => setShowAddMember(false)}><X className="w-4 h-4 text-slate-400" /></button>
                                </div>
                                <div className="relative">
                                    <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
                                    <input
                                        autoFocus
                                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                        placeholder="Search users..."
                                        value={memberSearch}
                                        onChange={e => setMemberSearch(e.target.value)}
                                    />
                                </div>
                                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                    {availableForPanel.map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => handleTogglePanelRole(u.id, true)}
                                            className="w-full text-left px-2 py-1.5 text-sm hover:bg-blue-50 text-slate-700 rounded-md flex items-center justify-between group"
                                        >
                                            <span className="truncate">{u.name}</span>
                                            <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 text-blue-500" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* COLUMN 2: Message Navigation */}
                <div className="w-60 bg-white border-r border-slate-200 flex flex-col p-3 gap-2">
                    <button
                        onClick={() => { setIsComposing(true); setSelectedMessage(null); }}
                        className="w-full mb-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-sm"
                    >
                        <Plus className="w-5 h-5" />
                        New Message
                    </button>

                    <nav className="space-y-0.5">
                        {[
                            { id: 'inbox' as MessageFolder, icon: Inbox, label: 'Inbox', count: folderCounts.inbox },
                            { id: 'drafts' as MessageFolder, icon: FileText, label: 'Drafts', count: folderCounts.drafts },
                            { id: 'sent' as MessageFolder, icon: Send, label: 'Sent', count: folderCounts.sent },
                            { id: 'scheduled' as MessageFolder, icon: Clock, label: 'Scheduled', count: folderCounts.scheduled },
                            { id: 'deleted' as MessageFolder, icon: Trash2, label: 'Deleted Items', count: folderCounts.deleted },
                        ].map(folder => (
                            <button
                                key={folder.id}
                                onClick={() => { setActiveFolder(folder.id); setIsComposing(false); setSelectedMessage(null); }}
                                className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 text-sm transition-colors ${activeFolder === folder.id && !isComposing
                                    ? 'bg-blue-50 text-blue-700 font-semibold'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <folder.icon className={`w-4 h-4 ${activeFolder === folder.id ? 'text-blue-600' : 'text-slate-400'}`} />
                                <span className="flex-1 text-left">{folder.label}</span>
                                {folder.count > 0 && (
                                    <span className="px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-bold min-w-[20px] text-center">
                                        {folder.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* COLUMN 3: Message List */}
                <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
                    <div className="p-4 border-b border-slate-100">
                        <h2 className="text-xl font-bold text-slate-800 capitalize mb-3">{activeFolder}</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none text-slate-700 placeholder-slate-400"
                                placeholder="Search..."
                                value={messageSearch}
                                onChange={(e) => setMessageSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
                        ) : filteredList.length === 0 ? (
                            <div className="text-center p-8 text-slate-400 text-sm">No messages found</div>
                        ) : (
                            filteredList.map((item: any) => { // Using any cast for simplicity as types differ slightly
                                const isSelected = selectedMessage?.id === item.id;
                                const isRead = activeFolder === 'inbox' ? item.isRead : true;

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => {
                                            if (activeFolder === 'drafts') {
                                                handleOpenDraft(item);
                                            } else {
                                                setSelectedMessage(item);
                                                setIsComposing(false);
                                                // TODO: Mark as read if inland
                                            }
                                        }}
                                        className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/60 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`text-sm truncate pr-2 ${!isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                                {activeFolder === 'sent' || activeFolder === 'drafts'
                                                    ? `To: ${item.recipientIds?.length || 0} recipients`
                                                    : (item.metadata?.sender || 'System')}
                                            </h4>
                                            <span className={`text-xs whitespace-nowrap ${!isRead ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                                                {formatDate(item.createdAt)}
                                            </span>
                                        </div>
                                        <div className={`text-sm mb-1 truncate ${!isRead ? 'font-bold text-slate-900' : 'text-slate-800'}`}>
                                            {item.subject || item.title}
                                        </div>
                                        <div className="text-xs text-slate-500 truncate">
                                            {item.body}
                                        </div>
                                        {activeFolder !== 'inbox' && item.status && (
                                            <div className="mt-2">
                                                {getStatusBadge(item.status as MessageStatus)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* COLUMN 4: Content Pane */}
                <div className="flex-1 bg-slate-50/30 flex flex-col min-w-0">
                    {isComposing ? (
                        /* COMPOSE VIEW */
                        <div className="flex-1 flex flex-col bg-white h-full">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-800">New Message</h2>
                                <div className="flex gap-2">
                                    <button onClick={handleSaveDraft} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
                                        Save Draft
                                    </button>
                                    <button
                                        onClick={handleSend}
                                        disabled={isSending}
                                        className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2"
                                    >
                                        <Send className="w-4 h-4" /> Send
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto">
                                <div className="space-y-4 max-w-4xl mx-auto">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">To</label>
                                        <div className="p-2 border border-slate-200 rounded-xl flex flex-wrap gap-2 items-center bg-white focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-shadow min-h-[50px]">
                                            {recipients.map(r => (
                                                <span key={r.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                                                    {r.name}
                                                    <button onClick={() => removeRecipient(r.id)} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
                                                </span>
                                            ))}
                                            <input
                                                className="flex-1 min-w-[200px] outline-none text-sm bg-transparent"
                                                placeholder="Type to search..."
                                                value={recipientSearch}
                                                onChange={e => setRecipientSearch(e.target.value)}
                                            />
                                        </div>
                                        {searchResults.length > 0 && (
                                            <div className="absolute z-10 w-96 bg-white rounded-xl shadow-xl border border-slate-200 mt-1 max-h-60 overflow-y-auto">
                                                {searchResults.map(user => (
                                                    <button key={user.id} onClick={() => addRecipient(user)} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                                                            {user.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-slate-800">{user.name}</div>
                                                            <div className="text-xs text-slate-500">{user.email}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex gap-2 pt-1">
                                            <button onClick={() => addMailingList('trainees')} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors">+ Trainees</button>
                                            <button onClick={() => addMailingList('supervisors')} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors">+ Supervisors</button>
                                            <button onClick={() => addMailingList('arcp_panel')} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors">+ ARCP Panel</button>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subject</label>
                                        <input
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
                                            placeholder="Message subject..."
                                            value={subject}
                                            onChange={e => setSubject(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1 h-full flex flex-col">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message</label>
                                        <textarea
                                            className="w-full h-80 px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all resize-none"
                                            placeholder="Write your message..."
                                            value={body}
                                            onChange={e => setBody(e.target.value)}
                                        />
                                    </div>

                                    {/* Attachments */}
                                    <div>
                                        <div className="flex items-center gap-4 mb-3">
                                            <label className="cursor-pointer flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors">
                                                <Paperclip className="w-4 h-4" />
                                                Attach Files
                                                <input type="file" multiple className="hidden" onChange={handleFileSelect} disabled={isUploading} />
                                            </label>

                                            <div className="h-4 w-px bg-slate-200" />

                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" checked={scheduleMode === 'now'} onChange={() => setScheduleMode('now')} className="text-blue-600" />
                                                    <span className="text-sm text-slate-700">Send Now</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" checked={scheduleMode === 'scheduled'} onChange={() => setScheduleMode('scheduled')} className="text-blue-600" />
                                                    <span className="text-sm text-slate-700">Schedule</span>
                                                </label>
                                            </div>
                                        </div>

                                        {scheduleMode === 'scheduled' && (
                                            <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100 inline-block">
                                                <input
                                                    type="datetime-local"
                                                    value={scheduledAt}
                                                    onChange={e => setScheduledAt(e.target.value)}
                                                    className="bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-sm outline-none"
                                                />
                                            </div>
                                        )}

                                        {attachments.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {attachments.map(att => (
                                                    <div key={att.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                                                        <Paperclip className="w-3 h-3 text-slate-400" />
                                                        <span className="text-xs font-medium text-slate-700 truncate max-w-[150px]">{att.name}</span>
                                                        <button onClick={() => removeAttachment(att.id)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : selectedMessage ? (
                        /* READING PANE */
                        <div className="flex-1 flex flex-col bg-white h-full">
                            {/* Header */}
                            <div className="px-8 py-6 border-b border-slate-100">
                                <h1 className="text-2xl font-bold text-slate-900 mb-2">{(selectedMessage as any).title || (selectedMessage as any).subject}</h1>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                                            {((selectedMessage as any).senderName || (selectedMessage as any).metadata?.sender || '?').charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-800">
                                                {(selectedMessage as any).senderName || (selectedMessage as any).metadata?.sender || 'Unknown Sender'}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {new Date((selectedMessage as any).createdAt || (selectedMessage as any).sentAt).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {activeFolder !== 'deleted' && (
                                            <button
                                                onClick={() => handleDeleteMessage(selectedMessage.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete Message"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="flex-1 p-8 overflow-y-auto">
                                <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {(selectedMessage as any).body}
                                </div>

                                {/* Attachments */}
                                {(selectedMessage as any).attachments?.length > 0 && (
                                    <div className="mt-8 pt-6 border-t border-slate-100">
                                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Paperclip className="w-4 h-4" /> Attachments
                                        </h4>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                            {(selectedMessage as any).attachments.map((att: MessageAttachment) => (
                                                <a
                                                    key={att.id}
                                                    href={`https://your-project.supabase.co/storage/v1/object/public/message-attachments/${att.url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:text-blue-500 transition-colors">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-slate-700 group-hover:text-blue-700 truncate">{att.name}</div>
                                                        <div className="text-xs text-slate-400">{Math.round(att.size / 1024)} KB</div>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* EMPTY STATE */
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                <Inbox className="w-8 h-8 opacity-50" />
                            </div>
                            <p className="text-lg font-medium text-slate-500">Select a message to read</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ARCPSuperuserDashboard;
