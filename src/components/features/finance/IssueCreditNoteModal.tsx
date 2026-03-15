'use client';

import React, { useState } from 'react';
import { Modal, Input, InputNumber, App } from 'antd';
import { useCreateCreditNote } from '@/hooks/useInvoice';

interface IssueCreditNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoiceId: number;
    maxAmount: number;
    currency: string;
}

export const IssueCreditNoteModal: React.FC<IssueCreditNoteModalProps> = ({
    isOpen, onClose, invoiceId, maxAmount, currency,
}) => {
    const { message: messageApi } = App.useApp();
    const [reason, setReason] = useState('');
    const [amount, setAmount] = useState<number | null>(null);
    const [tax, setTax] = useState<number | null>(null);
    const createCreditNote = useCreateCreditNote();

    const handleSubmit = () => {
        if (!reason.trim()) {
            messageApi.error('Please provide a reason');
            return;
        }
        if (!amount || amount <= 0) {
            messageApi.error('Please enter a valid amount');
            return;
        }
        if (amount > maxAmount) {
            messageApi.error(`Amount cannot exceed ${currency} ${maxAmount.toLocaleString()}`);
            return;
        }

        createCreditNote.mutate(
            { invoiceId, data: { reason: reason.trim(), amount, tax: tax ?? 0 } },
            {
                onSuccess: () => {
                    messageApi.success('Credit note issued successfully');
                    setReason('');
                    setAmount(null);
                    setTax(null);
                    onClose();
                },
                onError: (err: Error) => {
                    messageApi.error(err.message || 'Failed to create credit note');
                },
            },
        );
    };

    return (
        <Modal
            open={isOpen}
            onCancel={onClose}
            onOk={handleSubmit}
            title="Issue Credit Note"
            okText="Issue Credit Note"
            cancelText="Cancel"
            okButtonProps={{ className: 'bg-[#111111] hover:bg-[#000000]/90', loading: createCreditNote.isPending }}
            width="min(440px, 95vw)"
            centered
        >
            <div className="space-y-4 py-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-[#111111]">Reason</label>
                    <Input.TextArea
                        rows={3}
                        placeholder="Reason for credit note..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="rounded-lg"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-[#111111]">Amount ({currency})</label>
                    <InputNumber
                        className="w-full rounded-lg"
                        placeholder="0.00"
                        min={0}
                        max={maxAmount}
                        value={amount}
                        onChange={(val) => setAmount(val)}
                        precision={2}
                    />
                    <p className="text-xs text-[#666666]">Max: {currency} {maxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-[#111111]">Tax ({currency}) <span className="font-normal text-[#666666]">— optional</span></label>
                    <InputNumber
                        className="w-full rounded-lg"
                        placeholder="0.00"
                        min={0}
                        value={tax}
                        onChange={(val) => setTax(val)}
                        precision={2}
                    />
                </div>
            </div>
        </Modal>
    );
};
