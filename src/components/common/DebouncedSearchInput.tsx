import { useState, useEffect, ChangeEvent } from 'react';
import { Search24Filled } from '@fluentui/react-icons';
import { useDebounce } from '@/hooks/useDebounce';

interface DebouncedSearchInputProps {
    placeholder?: string;
    onSearch: (value: string) => void;
    initialValue?: string;
    className?: string;
    delay?: number;
}

export function DebouncedSearchInput({
    placeholder = 'Search...',
    onSearch,
    initialValue = '',
    className = '',
    delay = 500,
}: DebouncedSearchInputProps) {
    const [localValue, setLocalValue] = useState(initialValue);
    const debouncedValue = useDebounce(localValue, delay);

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

    return (
        <div className={`relative ${className}`}>
            <Search24Filled className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#999999] z-10" />
            <input
                type="text"
                value={localValue}
                onChange={handleChange}
                placeholder={placeholder}
                className="w-full pl-9 pr-4 py-1.5 bg-white border border-[#EEEEEE] rounded-lg text-[0.8125rem] font-medium text-[#111111] placeholder:text-[#999999] focus:outline-none focus:border-[#111111]"
            />
        </div>
    );
}
