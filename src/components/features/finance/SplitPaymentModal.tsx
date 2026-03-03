import React, { useState } from 'react';
import { X, Plus, Trash2, Check } from 'lucide-react';
import dayjs from 'dayjs';

export interface PaymentSplit {
    id: string;
    description: string;
    amount: number;
    percentage: number;
    dueDate: string;
    isFixedAmount: boolean;
}

interface SplitPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalAmount: number;
    initialSplits?: PaymentSplit[];
    onSave: (splits: PaymentSplit[]) => void;
    currencySymbol?: string;
}

export const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({
    isOpen,
    onClose,
    totalAmount,
    initialSplits = [],
    onSave,
    currencySymbol = '₹'
}) => {
    const [splits, setSplits] = useState<PaymentSplit[]>([]);
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

    if (isOpen && !prevIsOpen) {
        setPrevIsOpen(true);
        if (initialSplits.length > 0) {
            setSplits(initialSplits);
        } else {
            setSplits([{
                id: '1',
                description: 'Full Payment',
                amount: totalAmount,
                percentage: 100,
                dueDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
                isFixedAmount: false
            }]);
        }
    } else if (!isOpen && prevIsOpen) {
        setPrevIsOpen(false);
    }

    if (!isOpen) return null;

    const currentTotal = splits.reduce((acc, split) => acc + (split.amount || 0), 0);
    const difference = totalAmount - currentTotal;
    const isValid = Math.abs(difference) < 0.01; // Allow small float precision differences

    const updateSplitAmount = (id: string, amount: number) => {
        setSplits(prev => prev.map(s => {
            if (s.id !== id) return s;
            const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
            return { ...s, amount, percentage, isFixedAmount: true };
        }));
    };

    const updateSplitPercentage = (id: string, percentage: number) => {
        setSplits(prev => prev.map(s => {
            if (s.id !== id) return s;
            const amount = totalAmount > 0 ? (percentage / 100) * totalAmount : 0;
            return { ...s, amount, percentage, isFixedAmount: false };
        }));
    };

    const updateSplitField = (id: string, field: keyof PaymentSplit, value: string) => {
        setSplits(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const addSplit = () => {
        setSplits(prev => [...prev, {
            id: Date.now().toString(),
            description: `Milestone ${prev.length + 1}`,
            amount: 0,
            percentage: 0,
            dueDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
            isFixedAmount: false
        }]);
    };

    const removeSplit = (id: string) => {
        setSplits(prev => prev.filter(s => s.id !== id));
    };

    const handleSave = () => {
        if (!isValid) return;
        onSave(splits);
        onClose();
    };

    // Auto-balance remaining amount to the last split if percentage is used
    const balanceRemaining = () => {
        if (splits.length === 0) return;
        const lastSplit = splits[splits.length - 1];
        const allButLast = splits.slice(0, -1);
        const sumOtherAmounts = allButLast.reduce((acc, s) => acc + s.amount, 0);
        const remainingAmount = Math.max(0, totalAmount - sumOtherAmounts);
        const remainingPercentage = totalAmount > 0 ? (remainingAmount / totalAmount) * 100 : 0;

        setSplits([
            ...allButLast,
            { ...lastSplit, amount: remainingAmount, percentage: remainingPercentage, isFixedAmount: false }
        ]);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-[#EEEEEE] flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-[#111111] tracking-tight">Payment Schedule</h2>
                        <p className="text-sm text-[#697386] mt-0.5">Split the total invoice amount into multiple milestones or payments.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-[#697386]" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-[#F9FAFB]">
                    <div className="bg-white border text-sm font-semibold border-[#EEEEEE] rounded-xl p-4 mb-6 flex justify-between items-center shadow-sm">
                        <span className="text-[#697386]">Total Invoice Amount</span>
                        <span className="text-xl text-[#111111]">{currencySymbol}{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="space-y-4">
                        {splits.map((split) => (
                            <div key={split.id} className="bg-white border border-[#EEEEEE] rounded-xl p-4 shadow-sm relative group transition-all hover:border-[#D6D6D6]">
                                <div className="flex items-start gap-4">
                                    <div className="flex-1 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-[#697386] uppercase tracking-wider mb-1.5">Description</label>
                                                <input
                                                    type="text"
                                                    value={split.description}
                                                    onChange={(e) => updateSplitField(split.id, 'description', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-[#EEEEEE] rounded-lg focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-colors"
                                                    placeholder="e.g. Advance Payment 50%"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-[#697386] uppercase tracking-wider mb-1.5">Due Date</label>
                                                <input
                                                    type="date"
                                                    value={split.dueDate}
                                                    onChange={(e) => updateSplitField(split.id, 'dueDate', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-[#EEEEEE] rounded-lg focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-colors"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 pt-1">
                                            <div className="flex-1 flex gap-0.5 items-center bg-gray-50 rounded-lg p-1 border border-[#EEEEEE]">
                                                <label className="flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-white text-sm">
                                                    <input
                                                        type="radio"
                                                        name={`type-${split.id}`}
                                                        checked={!split.isFixedAmount}
                                                        onChange={() => setSplits(prev => prev.map(s => s.id === split.id ? { ...s, isFixedAmount: false } : s))}
                                                        className="accent-[#111111]"
                                                    />
                                                    <span className={!split.isFixedAmount ? 'font-medium text-[#111111]' : 'text-[#697386]'}>Percentage</span>
                                                </label>
                                                <label className="flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-white text-sm">
                                                    <input
                                                        type="radio"
                                                        name={`type-${split.id}`}
                                                        checked={split.isFixedAmount}
                                                        onChange={() => setSplits(prev => prev.map(s => s.id === split.id ? { ...s, isFixedAmount: true } : s))}
                                                        className="accent-[#111111]"
                                                    />
                                                    <span className={split.isFixedAmount ? 'font-medium text-[#111111]' : 'text-[#697386]'}>Fixed Amount</span>
                                                </label>
                                            </div>

                                            <div className="w-48 relative">
                                                <input
                                                    type="number"
                                                    value={split.isFixedAmount ? split.amount : split.percentage}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        if (split.isFixedAmount) {
                                                            updateSplitAmount(split.id, val);
                                                        } else {
                                                            updateSplitPercentage(split.id, val);
                                                        }
                                                    }}
                                                    className="w-full pl-8 pr-3 py-2 text-sm font-semibold border border-[#EEEEEE] rounded-lg focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-colors bg-white text-right"
                                                    min="0"
                                                    step={split.isFixedAmount ? "0.01" : "1"}
                                                />
                                                <div className="absolute left-3 top-2.5 text-[#697386] font-medium text-sm">
                                                    {split.isFixedAmount ? currencySymbol : '%'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {splits.length > 1 && (
                                        <button
                                            onClick={() => removeSplit(split.id)}
                                            className="p-2 mt-7 text-[#697386] hover:text-[#D14343] hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remove split"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                        <button
                            onClick={addSplit}
                            className="flex items-center gap-2 text-sm font-semibold text-[#111111] hover:text-[#333333] px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add Payment Split
                        </button>

                        <button
                            onClick={balanceRemaining}
                            className="text-[13px] font-medium text-[#0F9D58] hover:underline"
                        >
                            Auto-balance remaining
                        </button>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-[#EEEEEE] bg-white shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="text-sm">
                            <span className="text-[#697386]">Total Assigned: </span>
                            <span className={`font-bold ${isValid ? 'text-[#0F9D58]' : 'text-[#D14343]'}`}>
                                {currencySymbol}{currentTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        {!isValid && (
                            <div className="text-xs font-semibold text-[#D14343] bg-red-50 px-2 py-1 rounded">
                                Difference: {currencySymbol}{Math.abs(difference).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-bold text-[#111111] hover:bg-gray-100 rounded-full transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!isValid}
                            className={`px-6 py-2.5 text-sm font-bold rounded-full transition-colors flex items-center gap-2 ${isValid
                                ? 'bg-[#111111] text-white hover:bg-black shadow-[0_4px_14px_rgba(0,0,0,0.2)]'
                                : 'bg-gray-100 text-[#a0aabf] cursor-not-allowed border border-transparent'
                                }`}
                        >
                            <Check className="w-4 h-4" />
                            Confirm Schedule
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
