import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useCollaborativeRequirements } from '@/hooks/useRequirement';
import { RequirementDto } from '@/types/dto/requirement.dto';
import { ChevronDown, Search } from 'lucide-react';

interface SmartRequirementSelectProps {
    clientId?: string | null; // Pass client ID to filter requirements for a specific client
    selectedRequirementIds?: number[];
    onSelect: (req: RequirementDto) => void;
    buttonText?: string;
    className?: string;
}

export const SmartRequirementSelect: React.FC<SmartRequirementSelectProps> = ({
    clientId,
    selectedRequirementIds = [],
    onSelect,
    buttonText = "Select Requirement",
    className = ""
}) => {
    const { data: requirements = [], isLoading } = useCollaborativeRequirements();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredRequirements = useMemo(() => {
        return requirements.filter(req => {
            // Optional: Filter by clientId if provided and logic is implemented
            // In a real app we'd map standard company IDs. For now we match loosely.
            if (clientId) {
                const receiverId = String(req.receiver_company_id || '');
                const clientName = (req.company as { name?: string })?.name || req.client || '';
                if (receiverId !== clientId && clientName !== clientId && String(req.sender_company_id) !== clientId) {
                    return false;
                }
            }

            // Filter by search
            if (search && !req.name?.toLowerCase().includes(search.toLowerCase())) {
                return false;
            }

            return true;
        });
    }, [requirements, clientId, search]);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full px-4 py-2 border border-[#EEEEEE] bg-white text-[#111111] rounded-lg text-xs font-bold hover:bg-[#F7F7F7] transition-colors focus:outline-none focus:ring-2 focus:ring-[#111111]/20"
            >
                <span>{buttonText}</span>
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-[#EEEEEE] rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] max-h-80 flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-[#EEEEEE] shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#a0aabf]" />
                            <input
                                type="text"
                                placeholder="Search requirements..."
                                className="w-full pl-9 pr-3 py-2 text-xs border border-[#EEEEEE] rounded-lg focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-colors"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1 p-2">
                        {isLoading ? (
                            <div className="px-4 py-8 text-center text-xs text-[#697386]">Loading requirements...</div>
                        ) : filteredRequirements.length === 0 ? (
                            <div className="px-4 py-8 text-center text-xs text-[#697386]">No matching requirements found.</div>
                        ) : (
                            <ul className="space-y-1">
                                {filteredRequirements.map(req => {
                                    const isSelected = selectedRequirementIds.includes(req.id);
                                    const estimatedCost = req.estimated_cost || req.quoted_price || 0;
                                    const totalBilled = req.total_billed ?? 0;
                                    const remaining = Math.max(0, estimatedCost - totalBilled);

                                    return (
                                        <li
                                            key={req.id}
                                            onClick={() => {
                                                if (!isSelected) {
                                                    onSelect(req);
                                                    setIsOpen(false);
                                                    setSearch('');
                                                }
                                            }}
                                            className={`p-3 rounded-lg flex items-center justify-between transition-colors ${isSelected
                                                ? 'opacity-50 cursor-not-allowed bg-gray-50'
                                                : 'cursor-pointer hover:bg-[#F9FAFB]'
                                                }`}
                                        >
                                            <div className="flex-1 min-w-0 pr-4">
                                                <p className="text-xs font-semibold text-[#111111] truncate mb-0.5">
                                                    {req.name || `Requirement #${req.id}`}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-[#697386]">
                                                    <span>Total: ₹{estimatedCost.toLocaleString()}</span>
                                                    <span className="w-1 h-1 rounded-full bg-[#D9D9D9]" />
                                                    <span className="text-[#0F9D58] font-medium">Billed: ₹{totalBilled.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end shrink-0 pl-3 border-l border-[#EEEEEE]">
                                                <span className="text-xs font-bold text-[#111111]">
                                                    ₹{remaining.toLocaleString()}
                                                </span>
                                                <span className="text-2xs font-bold text-[#697386] uppercase tracking-wider mt-0.5">
                                                    Remaining
                                                </span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
