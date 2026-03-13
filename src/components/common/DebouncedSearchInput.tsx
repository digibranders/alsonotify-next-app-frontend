import { useState, useEffect, ChangeEvent, useRef } from 'react';
import { Search24Filled, Dismiss24Filled } from '@fluentui/react-icons';
import { useDebounce } from '@/hooks/useDebounce';

interface DebouncedSearchInputProps {
    placeholder?: string;
    onSearch: (value: string) => void;
    initialValue?: string;
    className?: string;
    delay?: number;
    'aria-label'?: string;
}

export function DebouncedSearchInput({
    placeholder = 'Search...',
    onSearch,
    initialValue = '',
    className = '',
    delay = 500,
    'aria-label': ariaLabel = 'Search',
}: DebouncedSearchInputProps) {
    const [localValue, setLocalValue] = useState(initialValue);
    const debouncedValue = useDebounce(localValue, delay);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync with initialValue if it changes externally
    useEffect(() => {
        setLocalValue(initialValue);
    }, [initialValue]);

    // Trigger onSearch when debouncedValue changes
    useEffect(() => {
        onSearch(debouncedValue);
    }, [debouncedValue, onSearch]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setLocalValue(e.target.value);
    };

    const handleClear = () => {
        setLocalValue('');
        inputRef.current?.focus();
    };

    return (
        <div className={`relative ${className}`}>
            <Search24Filled
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#999999] z-10 pointer-events-none"
                aria-hidden="true"
            />
            <input
                ref={inputRef}
                type="text"
                value={localValue}
                onChange={handleChange}
                placeholder={placeholder}
                aria-label={ariaLabel}
                className={`w-full pl-9 py-1.5 bg-white border border-[#EEEEEE] rounded-lg text-xs font-medium text-[#111111] placeholder:text-[#999999] focus:outline-none focus:border-[#111111] ${
                    localValue ? 'pr-9' : 'pr-4'
                }`}
            />
            {localValue && (
                <button
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#999999] hover:text-[#111111] transition-colors flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-[#111111] focus:ring-offset-1"
                    aria-label="Clear search"
                    type="button"
                >
                    <Dismiss24Filled className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}
