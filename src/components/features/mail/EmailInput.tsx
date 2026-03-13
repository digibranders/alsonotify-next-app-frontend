import React, { useState } from 'react';
import { Select, Avatar, Typography } from 'antd';
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

  // Merge known options with current values (in case some values are not not in options)
  // This ensures we can display them correctly if we have data

  const isValidEmail = (email: string) => EMAIL_REGEX.test(email);

  // Custom Tag Render
  const tagRender: SelectProps['tagRender'] = (props) => {
    const { value, closable, onClose } = props;
    const email = (value as string) || '';
    
    // Find associated info if available
    const option = options.find(o => o.value === email);
    const name = option?.name || (email && email.includes('@') ? email.split('@')[0] : email) || 'Unknown';
    const isEmailValid = isValidEmail(email);

    if (!email) return <></>;

    return (
      <span
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className={`inline-flex items-center gap-1.5 px-1 pr-2 py-0.5 rounded-full mr-1.5 mb-1 border ${
            isEmailValid ? 'bg-white border-[#d9d9d9]' : 'bg-red-50 border-red-200'
        }`}
      >
        <Avatar 
            size={20} 
            className="text-[0.625rem] bg-blue-100 text-blue-600"
        >
            {name?.[0]?.toUpperCase() || '?'}
        </Avatar>
        <div className="flex flex-col leading-none py-0.5">
           <Text className={`text-xs ${isEmailValid ? 'text-[#333]' : 'text-red-500'}`}>
             {option?.name ? option.name : email}
           </Text>
           {option?.name && (
             <Text className="text-[0.625rem] text-[#888]">{email}</Text>
           )}
        </div>
        {closable && (
          <span
            onClick={onClose}
            className="ml-0.5 cursor-pointer text-gray-400 hover:text-gray-600 text-sm leading-none"
          >
            ×
          </span>
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
      className="email-input py-0.5"
      variant="borderless"
      placeholder={props.placeholder}
      suffixIcon={null}
      tokenSeparators={[',', ' ', ';']}
      notFoundContent={null}
      options={options.map(o => ({
        label: (
            <div className="flex flex-col py-1">
                <Text strong className="text-xs">{o.name}</Text>
                <Text type="secondary" className="text-xs">{o.email}</Text>
            </div>
        ),
        value: o.email
      }))}
      style={{ width: '100%', ...props.style }}
      {...props}
    />
  );
}
