import React, { useState } from 'react';
import { Select, Typography } from 'antd';
import type { SelectProps } from 'antd';

const { Text } = Typography;

export interface ContactOption {
  value: string; // The email address
  label: string; // Display name or email
  name?: string; // Explicit name
  email: string; // Explicit email
}

interface EmailInputProps extends Omit<SelectProps, 'options' | 'onChange' | 'value'> {
  value: string[];
  onChange: (value: string[]) => void;
  options: ContactOption[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailInput({ value, onChange, options, ...props }: Readonly<EmailInputProps>) {
  const [searchValue, setSearchValue] = useState('');

  const isValidEmail = (email: string) => EMAIL_REGEX.test(email);

  // Filter out already-selected options from dropdown to prevent double checkmarks
  const filteredOptions = options.filter(o => !value.includes(o.email));

  // Compact tag render — single line, name only (or email if no name)
  const tagRender: SelectProps['tagRender'] = (tagProps) => {
    const { value: tagValue, closable, onClose } = tagProps;
    const email = (tagValue as string) || '';

    const option = options.find(o => o.value === email);
    const displayName = option?.name || (email.includes('@') ? email.split('@')[0] : email) || email;
    const isEmailValid = isValidEmail(email);

    if (!email) return <></>;

    return (
      <span
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className={`inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md mr-1 mb-0.5 text-2xs leading-tight ${
          isEmailValid
            ? 'bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]'
            : 'bg-red-50 text-red-600 border border-red-200'
        }`}
      >
        <span className="truncate max-w-[160px]">
          {displayName}
        </span>
        {closable && (
          <button
            onClick={onClose}
            className="ml-0.5 p-0.5 rounded hover:bg-black/5 text-[#9CA3AF] hover:text-[#374151] transition-colors leading-none"
          >
            ×
          </button>
        )}
      </span>
    );
  };

  return (
    <Select
      mode="tags"
      value={value}
      onChange={onChange}
      onSearch={setSearchValue}
      tagRender={tagRender}
      className="email-input"
      variant="borderless"
      placeholder={props.placeholder}
      suffixIcon={null}
      menuItemSelectedIcon={null}
      tokenSeparators={[',', ' ', ';']}
      notFoundContent={null}
      popupClassName="email-input-dropdown"
      options={filteredOptions.map(o => ({
        label: (
          <div className="flex items-center gap-2 py-0.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-2xs font-semibold shrink-0"
              style={{ backgroundColor: getOptionColor(o.name || o.email) }}
            >
              {(o.name || o.email)[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              {o.name && (
                <div className="text-xs font-medium text-[#111111] truncate leading-tight">
                  {o.name}
                </div>
              )}
              <div className="text-2xs text-[#999999] truncate leading-tight">
                {o.email}
              </div>
            </div>
          </div>
        ),
        value: o.email
      }))}
      style={{ width: '100%', ...props.style }}
      {...props}
    />
  );
}

// Deterministic color for dropdown avatars
const OPTION_COLORS = [
  '#4F46E5', '#0891B2', '#059669', '#D97706',
  '#DC2626', '#7C3AED', '#DB2777', '#2563EB',
];

function getOptionColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return OPTION_COLORS[Math.abs(hash) % OPTION_COLORS.length];
}
