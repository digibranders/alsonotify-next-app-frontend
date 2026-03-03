import React, { useState, useRef, useEffect } from 'react';

interface EditableInvoiceFieldProps {
    value: string;
    onChange: (val: string) => void;
    multiline?: boolean;
    placeholder?: string;
    className?: string; // used for both view and edit container
    textClassName?: string; // specific text styling for view mode
}

export const EditableInvoiceField: React.FC<EditableInvoiceFieldProps> = ({
    value,
    onChange,
    multiline = false,
    placeholder = "Enter text...",
    className = "",
    textClassName = ""
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    // Sync external changes
    useEffect(() => {
        setEditValue(value);
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            // Move cursor to end
            const length = inputRef.current.value.length;
            inputRef.current.setSelectionRange(length, length);
        }
    }, [isEditing]);

    const handleBlur = () => {
        setIsEditing(false);
        if (editValue !== value) {
            onChange(editValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) {
            handleBlur();
        }
        if (e.key === 'Escape') {
            setIsEditing(false);
            setEditValue(value);
        }
    };

    if (isEditing) {
        return multiline ? (
            <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                className={`w-full bg-transparent outline-none border border-[#e6e6e6] rounded px-1.5 py-1 focus:border-[#111111] focus:ring-1 focus:ring-[#111111] resize-y overflow-hidden ${className}`}
                value={editValue}
                placeholder={placeholder}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                rows={Math.max(editValue.split('\n').length, 2)}
            />
        ) : (
            <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                className={`w-full bg-transparent outline-none border border-[#e6e6e6] rounded px-1.5 py-1 focus:border-[#111111] focus:ring-1 focus:ring-[#111111] ${className}`}
                value={editValue}
                placeholder={placeholder}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
        );
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className={`cursor-text hover:bg-[#f7f7f7] rounded min-h-[1.5em] px-1.5 py-1 -mx-1.5 -my-1 transition-colors ${value ? (textClassName || className) : 'text-[#a0aabf] ' + (className || '')}`}
        >
            {value ? (multiline ? <span className="whitespace-pre-wrap">{value}</span> : value) : <span className="italic">{placeholder}</span>}
        </div>
    );
};
