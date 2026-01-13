import React, { useState, useEffect } from 'react';
import { Search, User, Mail, ShieldCheck } from './Icons';
import { supabase } from '../utils/supabaseClient';

interface SupervisorSearchProps {
    onSelect: (supervisor: { name: string; email: string; gmcNumber: string }) => void;
    currentDeanery?: string;
    placeholder?: string;
    initialName?: string;
    initialEmail?: string;
    disabled?: boolean;
}

interface SearchResult {
    name: string;
    email: string;
    gmc_number: string;
    deanery: string;
}

/**
 * Reusable supervisor search component with autocomplete
 * Searches user_profile for users with Supervisor/EducationalSupervisor roles
 * Filters by same deanery for data privacy
 */
export const SupervisorSearch: React.FC<SupervisorSearchProps> = ({
    onSelect,
    currentDeanery,
    placeholder = "Search supervisor by name or email...",
    initialName = "",
    initialEmail = "",
    disabled = false
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedName, setSelectedName] = useState(initialName);
    const [selectedEmail, setSelectedEmail] = useState(initialEmail);

    // Debounced search
    useEffect(() => {
        const searchUsers = async () => {
            if (!searchQuery || searchQuery.length < 2) {
                setSearchResults([]);
                setShowDropdown(false);
                return;
            }

            setIsSearching(true);
            try {
                // Search user_profile for supervisors
                let query = supabase
                    .from('user_profile')
                    .select('name, email, gmc_number, deanery, roles')
                    .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
                    .limit(5);

                // Filter by deanery if provided
                if (currentDeanery) {
                    query = query.eq('deanery', currentDeanery);
                }

                const { data, error } = await query;

                if (error) throw error;

                // Filter results to only include users with Supervisor or EducationalSupervisor roles
                const supervisors = (data || []).filter((user: any) => {
                    const roles = user.roles || [];
                    return roles.includes('Supervisor') || roles.includes('EducationalSupervisor');
                });

                setSearchResults(supervisors);
                setShowDropdown(supervisors.length > 0);
            } catch (err) {
                console.error("Error searching supervisors:", err);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(searchUsers, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, currentDeanery]);

    const handleSelectSupervisor = (user: SearchResult) => {
        setSelectedName(user.name);
        setSelectedEmail(user.email);
        setSearchQuery('');
        setShowDropdown(false);
        onSelect({
            name: user.name,
            email: user.email,
            gmcNumber: user.gmc_number || ''
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        // Clear selection if user starts typing again
        if (selectedName) {
            setSelectedName('');
            setSelectedEmail('');
        }
    };

    return (
        <div className="relative">
            {/* Search Input */}
            <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 pointer-events-none" />
                <input
                    type="text"
                    value={searchQuery || selectedName}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (searchResults.length > 0) setShowDropdown(true);
                    }}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {isSearching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            {/* Search Results Dropdown */}
            {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden">
                    {searchResults.map((user, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSelectSupervisor(user)}
                            className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5 last:border-b-0"
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                                    <User size={16} className="text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                        {user.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Mail size={12} className="text-slate-400 flex-shrink-0" />
                                        <p className="text-xs text-slate-500 dark:text-white/60 truncate">
                                            {user.email}
                                        </p>
                                    </div>
                                    {user.gmc_number && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <ShieldCheck size={12} className="text-slate-400 flex-shrink-0" />
                                            <p className="text-xs text-slate-500 dark:text-white/60">
                                                GMC: {user.gmc_number}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Selected Supervisor Display (below search) */}
            {selectedName && selectedEmail && !searchQuery && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl">
                    <div className="flex items-start gap-2">
                        <User size={14} className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-green-900 dark:text-green-100">
                                {selectedName}
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300 truncate">
                                {selectedEmail}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* No results message */}
            {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-4">
                    <p className="text-xs text-slate-500 dark:text-white/60 text-center">
                        No supervisors found in your deanery matching "{searchQuery}"
                    </p>
                </div>
            )}
        </div>
    );
};
