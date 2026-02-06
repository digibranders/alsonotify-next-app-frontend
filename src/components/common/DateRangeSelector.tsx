
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, CheckSquare } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

interface DateRangeSelectorProps {
    value: [Dayjs | null, Dayjs | null] | null;
    onChange: (range: [Dayjs | null, Dayjs | null] | null) => void;
    defaultRangeType?: string;
    className?: string;
    availablePresets?: string[];
}

export function DateRangeSelector({
    value,
    onChange,
    defaultRangeType = 'this_month',
    className = '',
    availablePresets
}: DateRangeSelectorProps) {
    const [selectedRangeType, setSelectedRangeType] = useState<string>(defaultRangeType);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [calendarOpen, setCalendarOpen] = useState(false);

    // Internal state for manual selection in calendar
    const [startDate, setStartDate] = useState<Dayjs | null>(value?.[0] || null);
    const [endDate, setEndDate] = useState<Dayjs | null>(value?.[1] || null);
    const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs());

    const dropdownRef = useRef<HTMLDivElement>(null);
    const calendarRef = useRef<HTMLDivElement>(null);

    // Sync internal state with props when value changes externally (and not in custom mode)
    useEffect(() => {
        if (value && value[0]) {
            const hasStartChanged = !startDate?.isSame(value[0]);
            const hasEndChanged = !endDate?.isSame(value[1]);

            if (hasStartChanged || hasEndChanged) {
                setStartDate(value[0]);
                setEndDate(value[1]);
                // Only update month if new start date is in a different month
                if (!currentMonth.isSame(value[0], 'month')) {
                    setCurrentMonth(value[0]);
                }
            }
        }
        // Deps intentionally [value] only; including startDate/endDate/currentMonth would cause update loop.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    // Handle Range Type Selection
    const handleRangeTypeChange = (type: string) => {
        setSelectedRangeType(type);
        setIsDropdownOpen(false);

        if (type === 'custom') {
            setCalendarOpen(true);
            // Initialize calendar with current selection
            if (value && value[0] && value[1]) {
                setStartDate(value[0]);
                setEndDate(value[1]);
                setCurrentMonth(value[0]);
            } else {
                setStartDate(null);
                setEndDate(null);
                setCurrentMonth(dayjs());
            }
            return;
        }

        setCalendarOpen(false);
        const now = dayjs();
        let newRange: [Dayjs, Dayjs] | null = null;

        switch (type) {
            case 'today':
                newRange = [now.startOf('day'), now.endOf('day')];
                break;
            case 'yesterday': {
                const yesterday = now.subtract(1, 'day');
                newRange = [yesterday.startOf('day'), yesterday.endOf('day')];
                break;
            }
            case 'this_week':
                newRange = [now.startOf('isoWeek'), now.endOf('isoWeek')];
                break;
            case 'this_month':
                newRange = [now.startOf('month'), now.endOf('month')];
                break;
            case 'last_month': {
                const lastMonth = now.subtract(1, 'month');
                newRange = [lastMonth.startOf('month'), lastMonth.endOf('month')];
                break;
            }
            case 'last_90_days':
                newRange = [now.subtract(90, 'day').startOf('day'), now.endOf('day')];
                break;
            case 'this_year':
                newRange = [now.startOf('year'), now.endOf('year')];
                break;
            case 'all_time':
                newRange = null; // Represents All Time
                break;
            default:
                newRange = null;
        }

        onChange(newRange);
    };

    // Get display label
    const getRangeLabel = () => {
        if (selectedRangeType === 'custom') {
            if (value && value[0] && value[1]) {
                return `${value[0].format('MMM D')} - ${value[1].format('MMM D')}`;
            }
            return 'Custom';
        }
        switch (selectedRangeType) {
            case 'today': return 'Today';
            case 'yesterday': return 'Yesterday';
            case 'this_week': return 'This Week';
            case 'this_month': return 'This Month';
            case 'last_month': return 'Last Month';
            case 'last_90_days': return 'Last 90 Days';
            case 'this_year': return 'This Year';
            case 'all_time': return 'All Time';
            default: return 'Select Range';
        }
    };

    // Check highlighting
    const isDateInRange = (date: Dayjs) => {
        if (!startDate || !endDate) return false;
        const start = startDate.isBefore(endDate) ? startDate : endDate;
        const end = startDate.isBefore(endDate) ? endDate : startDate;
        return date.isAfter(start.startOf('day')) && date.isBefore(end.endOf('day'));
    };

    const isDateStartOrEnd = (date: Dayjs) => {
        if (!startDate) return false;
        if (!endDate) return date.isSame(startDate, 'day');
        return date.isSame(startDate, 'day') || date.isSame(endDate, 'day');
    };

    const getCalendarDays = () => {
        const start = currentMonth.startOf('month').startOf('week');
        const end = currentMonth.endOf('month').endOf('week');
        const days: Dayjs[] = [];
        let current = start;
        while (current.isSameOrBefore(end, 'day')) {
            days.push(current);
            current = current.add(1, 'day');
        }
        return days;
    };

    const handleDateClick = (date: Dayjs) => {
        if (!startDate || (startDate && endDate)) {
            setStartDate(date);
            setEndDate(null);
        } else if (startDate && !endDate) {
            let finalStart = startDate;
            let finalEnd = date;
            if (date.isBefore(startDate)) {
                finalStart = date;
                finalEnd = startDate;
            }
            setStartDate(finalStart);
            setEndDate(finalEnd);
            onChange([finalStart, finalEnd]);
            // Keep calendar open? Or close? Dashboard closes it.
            setCalendarOpen(false);
            setSelectedRangeType('custom');
        }
    };

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node) && !dropdownRef.current?.contains(event.target as Node)) {
                setCalendarOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#EEEEEE] rounded-lg hover:border-[#111111] hover:text-[#111111] transition-all duration-200 outline-none min-w-[120px] justify-between"
            >
                <span className="font-['Manrope',sans-serif] font-semibold text-[13px] text-[#111111] truncate">
                    {getRangeLabel()}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#999999] shrink-0" />
            </button>

            {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-[#EEEEEE] rounded-[12px] shadow-lg z-50 w-full overflow-hidden">
                    {[
                        { value: 'today', label: 'Today' },
                        { value: 'yesterday', label: 'Yesterday' },
                        { value: 'this_week', label: 'This Week' },
                        { value: 'this_month', label: 'This Month' },
                        { value: 'last_month', label: 'Last Month' },
                        { value: 'last_90_days', label: 'Last 90 Days' },
                        { value: 'this_year', label: 'This Year' },
                        { value: 'all_time', label: 'All Time' },
                        { value: 'custom', label: 'Custom' },
                    ]
                        .filter(option => !availablePresets || availablePresets.includes(option.value))
                        .map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleRangeTypeChange(option.value)}
                                className="w-full text-left px-4 py-2.5 font-['Manrope',sans-serif] font-medium text-[13px] text-[#444444] hover:bg-[#F7F7F7] hover:text-[#111111] transition-colors flex items-center justify-between group"
                            >
                                <span className={selectedRangeType === option.value ? 'text-[#ff3b3b] font-semibold' : ''}>{option.label}</span>
                                {selectedRangeType === option.value && (
                                    <CheckSquare className="w-4 h-4 text-[#ff3b3b] flex-shrink-0" />
                                )}
                            </button>
                        ))}
                </div>
            )}

            {calendarOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-[#EEEEEE] rounded-[16px] shadow-2xl z-50 w-[300px] p-4 animate-in fade-in zoom-in-95 duration-200" ref={calendarRef}>
                    <div className="flex items-center gap-2 mb-3">
                        <button
                            onClick={() => {
                                setCalendarOpen(false);
                                setIsDropdownOpen(false);
                            }}
                            className="w-5 h-5 flex items-center justify-center hover:bg-[#F7F7F7] rounded transition-colors"
                        >
                            <ChevronLeft className="w-3.5 h-3.5 text-[#666666]" />
                        </button>
                        <h4 className="font-['Manrope',sans-serif] font-semibold text-[14px] text-[#111111]">
                            Select Range
                        </h4>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => setCurrentMonth(currentMonth.subtract(1, 'month'))}
                            className="w-8 h-8 rounded-full hover:bg-[#F7F7F7] flex items-center justify-center transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 text-[#111111]" />
                        </button>
                        <h4 className="font-['Manrope',sans-serif] font-bold text-[15px] text-[#111111]">
                            {currentMonth.format('MMMM YYYY')}
                        </h4>
                        <button
                            onClick={() => setCurrentMonth(currentMonth.add(1, 'month'))}
                            className="w-8 h-8 rounded-full hover:bg-[#F7F7F7] flex items-center justify-center transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 text-[#111111]" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                            <div key={day} className="text-center text-[11px] font-['Manrope',sans-serif] font-bold text-[#999999] uppercase tracking-wider py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {getCalendarDays().map((date, index) => {
                            const isCurrentMonth = date.month() === currentMonth.month();
                            const isInRange = isDateInRange(date);
                            const isStartOrEnd = isDateStartOrEnd(date);
                            const isToday = date.isSame(dayjs(), 'day');
                            const isSelected = isStartOrEnd;

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleDateClick(date)}
                                    className={`
                                        w-9 h-9 rounded-full text-[12px] font-['Inter',sans-serif] font-medium transition-all duration-200 relative
                                        ${!isCurrentMonth ? 'invisible pointer-events-none' : 'text-[#111111]'}
                                        ${isSelected
                                            ? 'bg-[#111111] text-white shadow-lg'
                                            : isInRange
                                                ? 'bg-[#F7F7F7] text-[#111111] rounded-none'
                                                : 'hover:bg-[#F7F7F7]'
                                        }
                                        ${isToday && !isSelected ? 'text-[#ff3b3b] font-bold' : ''}
                                    `}
                                >
                                    {date.date()}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
