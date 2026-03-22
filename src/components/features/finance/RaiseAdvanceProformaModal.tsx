'use client';

import React, { useState, useMemo } from 'react';
import { X, FileText, Percent, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getTaxPreview } from '@/services/invoice';
import { useCreateAdvanceProforma } from '@/hooks/useInvoice';
import { toast } from 'sonner';
import dayjs from 'dayjs';

interface RaiseAdvanceProformaModalProps {
    isOpen: boolean;
    onClose: () => void;
    requirementId: number;
    requirementTitle: string;
    quotedPrice: number;
    currency: string;
    receiverCompanyId: number;
    senderCompanyId: number;
}

const PERCENTAGE_PRESETS = [25, 50, 75, 100];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED'];

export const RaiseAdvanceProformaModal: React.FC<RaiseAdvanceProformaModalProps> = ({
    isOpen,
    onClose,
    requirementId,
    requirementTitle,
    quotedPrice,
    currency: defaultCurrency,
    receiverCompanyId,
    senderCompanyId,
}) => {
    const [advanceType, setAdvanceType] = useState<'percentage' | 'flat'>('percentage');
    const [percentage, setPercentage] = useState<number>(50);
    const [flatAmount, setFlatAmount] = useState<number>(0);
    const [currency, setCurrency] = useState<string>(defaultCurrency || 'INR');
    const [dueDate, setDueDate] = useState<string>(dayjs().add(7, 'day').format('YYYY-MM-DD'));
    const [paymentDetails, setPaymentDetails] = useState<string>('');
    const [memo, setMemo] = useState<string>('');

    const { mutateAsync: createProforma, isPending } = useCreateAdvanceProforma();

    const { data: taxPreview } = useQuery({
        queryKey: ['tax-preview', receiverCompanyId, senderCompanyId],
        queryFn: () => getTaxPreview(receiverCompanyId, senderCompanyId),
        enabled: !!receiverCompanyId && !!senderCompanyId,
        select: (res) => res.result,
    });

    const advanceBase = useMemo(() => {
        if (advanceType === 'percentage') {
            return (quotedPrice * percentage) / 100;
        }
        return flatAmount;
    }, [advanceType, percentage, flatAmount, quotedPrice]);

    const taxRate = taxPreview?.totalRate ?? 0;
    const taxAmount = (advanceBase * taxRate) / 100;
    const proformaTotal = advanceBase + taxAmount;

    const handleCreate = async (_sendAfter: boolean) => {
        if (!dueDate) {
            toast.error('Please select a due date');
            return;
        }
        try {
            await createProforma({
                requirementId,
                data: {
                    advance_type: advanceType,
                    advance_percentage: advanceType === 'percentage' ? percentage : undefined,
                    advance_amount: advanceType === 'flat' ? flatAmount : undefined,
                    currency,
                    due_date: dueDate,
                    payment_details: paymentDetails || undefined,
                    memo: memo || undefined,
                    tax_type: taxPreview?.taxLabel || undefined,
                },
            });
            toast.success('Advance proforma created successfully');
            onClose();
            // TODO: if sendAfter, open email modal
        } catch (err: unknown) {
            toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to create advance proforma');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-[540px] overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[#EEEEEE] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[#111111] tracking-tight">Raise Advance Proforma</h2>
                            <p className="text-sm text-[#666666]">{requirementTitle}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-[#666666]" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5">
                    {/* Advance Type */}
                    <div>
                        <label className="block text-xs font-semibold text-[#666666] uppercase tracking-wider mb-2">Advance Type</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setAdvanceType('percentage')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                                    advanceType === 'percentage'
                                        ? 'bg-[#111111] text-white border-[#111111]'
                                        : 'bg-white text-[#666666] border-[#EEEEEE] hover:border-[#111111]'
                                }`}
                            >
                                <Percent className="w-4 h-4" /> Percentage
                            </button>
                            <button
                                onClick={() => setAdvanceType('flat')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                                    advanceType === 'flat'
                                        ? 'bg-[#111111] text-white border-[#111111]'
                                        : 'bg-white text-[#666666] border-[#EEEEEE] hover:border-[#111111]'
                                }`}
                            >
                                <DollarSign className="w-4 h-4" /> Flat Amount
                            </button>
                        </div>
                    </div>

                    {/* Amount Configuration */}
                    {advanceType === 'percentage' ? (
                        <div>
                            <label className="block text-xs font-semibold text-[#666666] uppercase tracking-wider mb-2">Advance Percentage</label>
                            <div className="flex gap-2 mb-3">
                                {PERCENTAGE_PRESETS.map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPercentage(p)}
                                        className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${
                                            percentage === p
                                                ? 'bg-[#111111] text-white border-[#111111]'
                                                : 'bg-[#F9FAFB] text-[#666666] border-[#EEEEEE] hover:border-[#111111]'
                                        }`}
                                    >
                                        {p}%
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={percentage}
                                    onChange={e => setPercentage(Math.min(100, Math.max(1, Number(e.target.value))))}
                                    className="w-24 px-3 py-2 text-sm border border-[#EEEEEE] rounded-lg focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111]"
                                    min={1}
                                    max={100}
                                />
                                <span className="text-sm text-[#666666]">% of quoted price ({currency} {quotedPrice.toLocaleString()})</span>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-semibold text-[#666666] uppercase tracking-wider mb-2">Flat Amount</label>
                            <div className="flex gap-2">
                                <select
                                    value={currency}
                                    onChange={e => setCurrency(e.target.value)}
                                    className="px-3 py-2 text-sm border border-[#EEEEEE] rounded-lg focus:outline-none focus:border-[#111111] bg-white"
                                >
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <input
                                    type="number"
                                    value={flatAmount || ''}
                                    onChange={e => setFlatAmount(Number(e.target.value))}
                                    placeholder="0.00"
                                    className="flex-1 px-3 py-2 text-sm border border-[#EEEEEE] rounded-lg focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111]"
                                    min={0.01}
                                />
                            </div>
                        </div>
                    )}

                    {/* Live Breakdown */}
                    <div className="bg-[#F9FAFB] border border-[#EEEEEE] rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-[#666666]">Advance Base</span>
                            <span className="font-medium text-[#111111]">{currency} {advanceBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {taxRate > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-[#666666]">{taxPreview?.taxLabel || 'Tax'} ({taxRate}%)</span>
                                <span className="font-medium text-[#111111]">{currency} {taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        <div className="pt-2 border-t border-[#EEEEEE] flex justify-between">
                            <span className="text-sm font-bold text-[#111111]">Proforma Total</span>
                            <span className="text-sm font-bold text-[#111111]">{currency} {proformaTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    {/* Due Date */}
                    <div>
                        <label className="block text-xs font-semibold text-[#666666] uppercase tracking-wider mb-2">Due Date</label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-[#EEEEEE] rounded-lg focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111]"
                            min={dayjs().format('YYYY-MM-DD')}
                        />
                    </div>

                    {/* Payment Details */}
                    <div>
                        <label className="block text-xs font-semibold text-[#666666] uppercase tracking-wider mb-2">Payment Details (Optional)</label>
                        <textarea
                            value={paymentDetails}
                            onChange={e => setPaymentDetails(e.target.value)}
                            placeholder="Bank account details, UPI ID, etc."
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-[#EEEEEE] rounded-lg focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] resize-none"
                        />
                    </div>

                    {/* Memo */}
                    <div>
                        <label className="block text-xs font-semibold text-[#666666] uppercase tracking-wider mb-2">Memo (Optional)</label>
                        <textarea
                            value={memo}
                            onChange={e => setMemo(e.target.value)}
                            placeholder="Additional notes for the client..."
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-[#EEEEEE] rounded-lg focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[#EEEEEE] bg-gray-50 flex items-center justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        disabled={isPending}
                        className="px-5 py-2.5 text-sm font-bold text-[#111111] hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => handleCreate(false)}
                        disabled={isPending || (advanceType === 'flat' && !flatAmount)}
                        className="px-6 py-2.5 text-sm font-bold bg-[#111111] text-white rounded-full hover:bg-black shadow-[0_4px_14px_rgba(0,0,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isPending ? 'Creating...' : 'Create as Draft'}
                    </button>
                </div>
            </div>
        </div>
    );
};
