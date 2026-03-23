'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { X, Paperclip, Send, Mail } from 'lucide-react';
import { Modal } from 'antd';
import { toast } from 'sonner';
import { useInvoice, useSendInvoiceEmail } from '../../../hooks/useInvoice';
import { getEmailRecipients } from '../../../services/invoice';

interface SendInvoiceModalProps {
    invoiceId: number;
    invoiceNumber: string;
    isOpen: boolean;
    onClose: () => void;
    onSent: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function EmailPillInput({
    label,
    emails,
    onAdd,
    onRemove,
}: {
    label: string;
    emails: string[];
    onAdd: (email: string) => void;
    onRemove: (email: string) => void;
}) {
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
            e.preventDefault();
            const email = inputValue.trim().replace(/,$/, '');
            if (EMAIL_REGEX.test(email) && !emails.includes(email)) {
                onAdd(email);
            }
            setInputValue('');
        }
        if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
            onRemove(emails[emails.length - 1]);
        }
    };

    return (
        <div>
            <label className="block text-xs font-semibold text-[#666666] uppercase tracking-wider mb-1.5">
                {label}
            </label>
            <div
                className="flex flex-wrap gap-1.5 p-2 border border-[#EEEEEE] rounded-lg bg-white min-h-[40px] cursor-text focus-within:border-[#111111] transition-colors"
                onClick={() => inputRef.current?.focus()}
            >
                {emails.map(email => (
                    <span
                        key={email}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F3F4F6] rounded-full text-xs font-medium text-[#111111]"
                    >
                        {email}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onRemove(email); }}
                            className="text-[#999999] hover:text-[#ff3b3b] transition-colors ml-0.5"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    type="email"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => {
                        if (inputValue.trim() && EMAIL_REGEX.test(inputValue.trim()) && !emails.includes(inputValue.trim())) {
                            onAdd(inputValue.trim());
                            setInputValue('');
                        }
                    }}
                    placeholder={emails.length === 0 ? 'Type email and press Enter' : ''}
                    className="flex-1 min-w-[160px] text-sm outline-none bg-transparent placeholder:text-[#CCCCCC]"
                />
            </div>
        </div>
    );
}

export function SendInvoiceModal({
    invoiceId,
    invoiceNumber,
    isOpen,
    onClose,
    onSent,
}: SendInvoiceModalProps) {
    const [toEmails, setToEmails] = useState<string[]>([]);
    const [ccEmails, setCcEmails] = useState<string[]>([]);
    const [customMessage, setCustomMessage] = useState('');
    const [toError, setToError] = useState('');
    const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);

    const { data: invoice } = useInvoice(invoiceId);
    const { mutateAsync: sendEmail, isPending: isSending } = useSendInvoiceEmail();

    // Fetch email recipients when modal opens
    useEffect(() => {
        if (!isOpen) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setToError('');
         
        setIsLoadingRecipients(true);
        getEmailRecipients(invoiceId)
            .then(res => {
                if (res.result) {
                    setToEmails(res.result.to ?? []);
                    setCcEmails(res.result.cc ?? []);
                }
            })
            .catch(() => {
                // Non-fatal: user can still add recipients manually
            })
            .finally(() => setIsLoadingRecipients(false));
    }, [isOpen, invoiceId]);

    if (!isOpen) return null;

    const handleSend = async () => {
        if (toEmails.length === 0) {
            setToError('At least one recipient is required.');
            return;
        }
        setToError('');
        try {
            await sendEmail({
                id: invoiceId,
                data: {
                    to: toEmails,
                    cc: ccEmails.length > 0 ? ccEmails : undefined,
                    custom_message: customMessage || undefined,
                },
            });
            toast.success('Invoice sent successfully.');
            onSent();
            onClose();
        } catch {
            toast.error('Failed to send invoice. Please try again.');
        }
    };

    const currencySymbol = invoice?.currency === 'INR' ? '₹' : '$';
    const total = invoice?.total
        ? Number(invoice.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })
        : '—';
    const dueDate = invoice?.due_date
        ? new Date(invoice.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';
    const clientName = (invoice as { bill_to_company?: { name: string } } | undefined)?.bill_to_company?.name ?? '—';

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-[#ff3b3b]" />
                    <span className="text-base font-semibold text-[#111111]">Send Invoice</span>
                </div>
            }
            open={isOpen}
            onCancel={onClose}
            width={512}
            destroyOnHidden
            centered
            closeIcon={<X className="w-4 h-4 text-[#666666]" />}
            footer={
                <div className="flex justify-end gap-3 pt-4">
                    <button
                        onClick={onClose}
                        disabled={isSending}
                        className="px-4 py-2 text-sm font-semibold text-[#666666] hover:text-[#111111] transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={isSending || toEmails.length === 0}
                        className="px-5 py-2 bg-[#ff3b3b] text-white rounded-full text-sm font-bold hover:bg-[#e63535] transition-colors flex items-center gap-2 disabled:opacity-60"
                    >
                        <Send className="w-4 h-4" />
                        {isSending ? 'Sending...' : 'Send Invoice'}
                    </button>
                </div>
            }
        >
            <div className="py-4 space-y-5">
                {/* Invoice summary card */}
                <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#EEEEEE]">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-semibold text-[#666666] uppercase tracking-wider">Invoice</p>
                            <p className="text-sm font-bold text-[#111111] mt-0.5">{invoiceNumber}</p>
                            <p className="text-xs text-[#666666] mt-0.5">To: {clientName}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-bold text-[#111111]">{currencySymbol}{total}</p>
                            <p className="text-xs text-[#666666]">Due {dueDate}</p>
                        </div>
                    </div>
                </div>

                {/* To field */}
                <div>
                    <EmailPillInput
                        label="To"
                        emails={toEmails}
                        onAdd={email => { setToEmails(prev => [...prev, email]); setToError(''); }}
                        onRemove={email => setToEmails(prev => prev.filter(e => e !== email))}
                    />
                    {isLoadingRecipients && (
                        <p className="text-xs text-[#999999] mt-1">Loading recipients...</p>
                    )}
                    {toError && (
                        <p className="text-xs text-[#ff3b3b] mt-1">{toError}</p>
                    )}
                </div>

                {/* CC field */}
                <EmailPillInput
                    label="CC"
                    emails={ccEmails}
                    onAdd={email => setCcEmails(prev => [...prev, email])}
                    onRemove={email => setCcEmails(prev => prev.filter(e => e !== email))}
                />

                {/* Attachment chip (static — PDF is always attached) */}
                <div>
                    <label className="block text-xs font-semibold text-[#666666] uppercase tracking-wider mb-1.5">
                        Attachment
                    </label>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F3F4F6] rounded-full text-xs font-medium text-[#111111]">
                        <Paperclip className="w-3.5 h-3.5 text-[#666666]" />
                        {invoiceNumber}.pdf
                    </div>
                </div>

                {/* Optional custom message */}
                <div>
                    <label className="block text-xs font-semibold text-[#666666] uppercase tracking-wider mb-1.5">
                        Message (optional)
                    </label>
                    <textarea
                        value={customMessage}
                        onChange={e => setCustomMessage(e.target.value)}
                        placeholder="Add a personal message..."
                        rows={3}
                        className="w-full px-3 py-2 border border-[#EEEEEE] rounded-lg text-sm text-[#111111] placeholder:text-[#CCCCCC] focus:border-[#111111] outline-none resize-none"
                    />
                </div>
            </div>
        </Modal>
    );
}
