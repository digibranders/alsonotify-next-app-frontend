'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown24Filled } from '@fluentui/react-icons';

const SORT_OPTIONS: { label: string; value: string }[] = [
    { label: 'Requirement', value: 'title' },
    { label: 'Timeline', value: 'timeline' },
    { label: 'Budget', value: 'budget' },
    { label: 'Progress', value: 'progress' },
    { label: 'Status', value: 'status' },
];

interface SortByDropdownProps {
    value: string | null;
    onChange: (value: string) => void;
}

export function SortByDropdown({ value, onChange }: Readonly<SortByDropdownProps>) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selected = SORT_OPTIONS.find(o => o.value === value);
    const hasSelection = !!selected;
    const displayLabel = selected?.label ?? 'Sort by';

    return (
        <div className="relative" ref={ref}>
            {/* Separator */}
            <div className="flex items-center gap-2">
                <div className="w-px h-5 bg-[#EEEEEE]" />
                <button
                    onClick={() => setOpen(prev => !prev)}
                    className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-normal transition-all duration-200 justify-between min-w-[120px] ${hasSelection
                            ? 'bg-[#111111] text-white border-[#111111] shadow-sm'
                            : 'bg-white text-[#666666] border-[#EEEEEE] hover:border-[#CCCCCC] hover:text-[#333333]'
                        }`}
                >
                    <span className="truncate max-w-[140px]">{displayLabel}</span>
                    <ChevronDown24Filled
                        className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    />
                </button>
            </div>

            {/* Dropdown */}
            {open && (
                <div className="absolute top-full mt-2 left-6 bg-white border border-[#EEEEEE] rounded-[12px] shadow-xl min-w-[160px] py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                    {SORT_OPTIONS.map(option => {
                        const isSelected = value === option.value;
                        return (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm font-normal hover:bg-[#FAFAFA] transition-colors flex items-center justify-between ${isSelected ? 'bg-[#FAFAFA] text-[#111111] font-medium' : 'text-[#666666]'
                                    }`}
                            >
                                <span>{option.label}</span>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#111111]" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
