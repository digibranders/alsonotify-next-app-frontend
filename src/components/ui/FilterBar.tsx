import { useState, useRef, useEffect } from 'react';
import { ChevronDown24Filled } from '@fluentui/react-icons';
import { X } from 'lucide-react';
import { DebouncedSearchInput } from '@/components/common/DebouncedSearchInput';

export interface FilterOption {
  id: string;
  label: string;
  options: (string | { label: string; value: string })[];
  defaultValue?: string;
  placeholder?: string;
}

interface FilterBarProps {
  filters?: FilterOption[];
  selectedFilters?: Record<string, string>;
  onFilterChange?: (filterId: string, value: string) => void;
  onClearFilters?: () => void;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showClearButton?: boolean;
}

export function FilterBar({
  filters = [],
  selectedFilters = {},
  onFilterChange,
  onClearFilters,
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  showClearButton = true
}: Readonly<FilterBarProps>) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const dropdownEl = dropdownRefs.current[openDropdown];
        if (dropdownEl && !dropdownEl.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const hasActiveFilters = filters.some(filter => {
    const value = selectedFilters[filter.id];
    return value && value !== 'All' && value !== filter.defaultValue;
  });

  if (filters.length === 0 && !onSearchChange) {
    return null;
  }

  return (
    <div className="flex flex-col-reverse md:flex-row md:items-center gap-3 md:gap-4 pb-4 border-b border-[#EEEEEE]">
      {/* Filter Dropdowns & Clear Button */}
      <div className="flex items-center gap-3 overflow-x-auto md:overflow-visible no-scrollbar w-full md:w-auto md:flex-wrap scrollbar-hide">
        {filters.map((filter) => {
          // Helper to get value and label from an option
          const getOptionValue = (opt: string | { label: string; value: string }) => typeof opt === 'string' ? opt : opt.value;
          const getOptionLabel = (opt: string | { label: string; value: string }) => typeof opt === 'string' ? opt : opt.label;

          // Determine current selected value (defaults to first option's value)
          const firstOptionValue = filter.options.length > 0 ? getOptionValue(filter.options[0]) : '';
          const selectedValue = selectedFilters[filter.id] || filter.defaultValue || firstOptionValue;

          // Find selected option object to display correct label
          const selectedOptionObj = filter.options.find(opt => getOptionValue(opt) === selectedValue);
          const displayLabel = selectedOptionObj ? getOptionLabel(selectedOptionObj) : selectedValue;

          const isDefault = selectedValue === 'All' || selectedValue === filter.defaultValue; // Simplified check
          const hasSelection = !isDefault;

          return (
            <div
              key={filter.id}
              className="relative shrink-0"
              ref={(el) => { dropdownRefs.current[filter.id] = el; }}
            >
              <button
                onClick={() => setOpenDropdown(openDropdown === filter.id ? null : filter.id)}
                className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[13px] font-['Manrope:Regular',sans-serif] transition-colors justify-between min-w-[120px] ${hasSelection
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : 'bg-white text-[#666666] border-[#EEEEEE] hover:border-[#111111] hover:text-[#111111]'
                  }`}
              >
                <span className="truncate max-w-[100px]">
                  {isDefault ? (filter.placeholder || filter.label) : displayLabel}
                </span>
                <ChevronDown24Filled className={`w-4 h-4 flex-shrink-0 transition-transform ${openDropdown === filter.id ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {openDropdown === filter.id && (
                <div className="absolute top-full mt-2 left-0 bg-white border border-[#EEEEEE] rounded-[12px] shadow-lg w-[200px] py-2 z-50 max-h-[300px] overflow-y-auto">
                  {filter.options.map((option, idx) => {
                    const optValue = getOptionValue(option);
                    const optLabel = getOptionLabel(option);
                    return (
                      <button
                        key={`${optValue}-${idx}`}
                        onClick={() => {
                          onFilterChange?.(filter.id, optValue);
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-4 py-2.5 font-['Manrope:Regular',sans-serif] text-[14px] hover:bg-[#F7F7F7] transition-colors ${selectedValue === optValue
                          ? 'text-[#ff3b3b] bg-[#FEF3F2]'
                          : 'text-[#666666]'
                          }`}
                      >
                        {optLabel}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Clear Filter Button - Moved to right of all filters */}
        {showClearButton && hasActiveFilters && onClearFilters && (
          <button
            onClick={onClearFilters}
            className="w-8 h-8 rounded-full bg-[#FEF3F2] hover:bg-[#FEE4E2] transition-colors flex items-center justify-center shrink-0"
            title="Clear filters"
          >
            <X className="w-4 h-4 text-[#ff3b3b]" />
          </button>
        )}
      </div>

      {/* Search Bar */}
      {onSearchChange && (
        <div className="w-full md:w-[240px] md:ml-auto">
          <DebouncedSearchInput
            className="w-full"
            placeholder={searchPlaceholder}
            onSearch={onSearchChange}
            initialValue={searchValue}
          />
        </div>
      )}
    </div>
  );
}