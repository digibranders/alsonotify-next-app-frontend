import { useState, useRef, useEffect, type ReactNode } from 'react';
import { ChevronDown24Filled } from '@fluentui/react-icons';
import { X } from 'lucide-react';
import { DebouncedSearchInput } from '@/components/common/DebouncedSearchInput';

export interface FilterOption {
  id: string;
  label: string;
  options: (string | { label: string; value: string })[];
  defaultValue?: string;
  placeholder?: string;
  multiSelect?: boolean;
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
  extraContent?: ReactNode;
}

export function FilterBar({
  filters = [],
  selectedFilters = {},
  onFilterChange,
  onClearFilters,
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  showClearButton = true,
  extraContent
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
    <div className="flex items-center gap-3 pb-4 border-b border-[#EEEEEE]">
      {/* Filter Dropdowns */}
      {filters.map((filter) => {
        // Helper to get value and label from an option
        const getOptionValue = (opt: string | { label: string; value: string }) => typeof opt === 'string' ? opt : opt.value;
        const getOptionLabel = (opt: string | { label: string; value: string }) => typeof opt === 'string' ? opt : opt.label;

        // Current Value(s)
        const rawValue = selectedFilters[filter.id] || filter.defaultValue || (filter.options.length > 0 ? getOptionValue(filter.options[0]) : '');

        // Handle Multi-Select Display
        const isMulti = filter.multiSelect;
        const selectedValues = isMulti ? rawValue.split(',').filter(Boolean) : [rawValue];

        const isDefault = selectedValues.length === 0 || (selectedValues.length === 1 && (selectedValues[0] === 'All' || selectedValues[0] === filter.defaultValue));
        const hasSelection = !isDefault;

        // Display Label Logic
        let displayLabel = '';
        if (isDefault) {
          displayLabel = filter.placeholder || filter.label;
        } else if (isMulti) {
          if (selectedValues.length === 1) {
            const matched = filter.options.find(o => getOptionValue(o) === selectedValues[0]);
            displayLabel = matched ? getOptionLabel(matched) : selectedValues[0];
          } else {
            displayLabel = `${filter.label} (${selectedValues.length})`;
          }
        } else {
          const matched = filter.options.find(o => getOptionValue(o) === rawValue);
          displayLabel = matched ? getOptionLabel(matched) : rawValue;
        }

        return (
          <div
            key={filter.id}
            className="relative"
            ref={(el) => { dropdownRefs.current[filter.id] = el; }}
          >
            <button
              onClick={() => setOpenDropdown(openDropdown === filter.id ? null : filter.id)}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[0.8125rem] font-normal transition-all duration-200 justify-between min-w-[120px] ${hasSelection
                ? 'bg-[#111111] text-white border-[#111111] shadow-sm'
                : 'bg-white text-[#666666] border-[#EEEEEE] hover:border-[#CCCCCC] hover:text-[#333333]'
                }`}
            >
              <span className="truncate max-w-[140px]">
                {displayLabel}
              </span>
              <ChevronDown24Filled className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${openDropdown === filter.id ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {openDropdown === filter.id && (
              <div className="absolute top-full mt-2 left-0 bg-white border border-[#EEEEEE] rounded-[12px] shadow-xl min-w-[200px] w-max max-w-[300px] py-2 z-50 max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200 [&::-webkit-scrollbar]:hidden">
                {filter.options.map((option, idx) => {
                  const optValue = getOptionValue(option);
                  const optLabel = getOptionLabel(option);
                  const isSelected = selectedValues.includes(optValue);

                  return (
                    <button
                      key={`${optValue}-${idx}`}
                      onClick={(e) => {
                        if (isMulti) {
                          if (optValue === 'All') {
                            // Clicking All clears everything else and closes dropdown
                            onFilterChange?.(filter.id, 'All');
                            setOpenDropdown(null);
                          } else {
                            // Toggle value
                            e.stopPropagation(); // Keep dropdown open
                            let newValues: string[];
                            if (isSelected) {
                              newValues = selectedValues.filter(v => v !== optValue);
                            } else {
                              newValues = [...selectedValues.filter(v => v !== 'All'), optValue];
                            }

                            // If nothing left, ensure 'All' is selected
                            if (newValues.length === 0) newValues = ['All'];
                            onFilterChange?.(filter.id, newValues.join(','));
                          }
                        } else {
                          onFilterChange?.(filter.id, optValue);
                          setOpenDropdown(null);
                        }
                      }}
                      className={`w-full text-left px-4 py-2.5 font-normal text-sm hover:bg-[#FAFAFA] transition-colors flex items-center justify-between group ${!isMulti && isSelected ? 'bg-[#FAFAFA] text-[#111111] font-medium' : 'text-[#666666]'
                        }`}
                    >
                      <span className={`truncate ${isSelected ? 'text-[#111111]' : ''}`}>{optLabel}</span>

                      {/* Interaction Elements */}
                      {isMulti ? (
                        optValue !== 'All' ? (
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-[#111111] border-[#111111]' : 'border-[#DDDDDD] group-hover:border-[#AAAAAA]'
                            }`}>
                            {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          </div>
                        ) : null
                      ) : (
                        isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
                      )}
                    </button>
                  )
                })}
              </div>
            )
            }
          </div>
        );
      })}

      {/* Clear Filter Button - Next to filters */}
      {
        showClearButton && hasActiveFilters && onClearFilters && (
          <button
            onClick={onClearFilters}
            className="w-8 h-8 rounded-full bg-[#F5F5F5] hover:bg-[#EEEEEE] text-[#666666] hover:text-[#111111] transition-all flex items-center justify-center"
            title="Clear filters"
          >
            <X className="w-4 h-4" />
          </button>
        )
      }

      {/* Extra content slot (e.g. Sort By) */}
      {extraContent}

      {/* Search Bar - Always at the right */}
      {
        onSearchChange && (
          <DebouncedSearchInput
            className="ml-auto w-[240px]"
            placeholder={searchPlaceholder}
            onSearch={onSearchChange}
            initialValue={searchValue}
          />
        )
      }
    </div >
  );
}