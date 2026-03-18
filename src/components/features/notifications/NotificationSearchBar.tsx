'use client';

import { Search, X } from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function NotificationSearchBar({ value, onChange }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedChange = useCallback((val: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(val), 300);
  }, [onChange]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleChange = (val: string) => {
    setLocalValue(val);
    debouncedChange(val);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="px-4 md:px-5 py-2 shrink-0">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search notifications..."
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full h-9 pl-9 pr-8 rounded-lg bg-[#F7F7F7] border border-[#EEEEEE] text-sm text-[#111111] placeholder:text-[#999999] focus:outline-none focus:border-[#CCCCCC] transition-colors"
        />
        {localValue && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-[#EEEEEE] text-[#999999] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
