'use client';
import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface SplitPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    requirement: {
        id: number;
        name: string;
        quoted_price: number;
        total_billed: number;
    };
    onConfirm: (billedAmount: number) => void;
    currencySymbol?: string;
}

type BillingMode = 'full' | 'custom';
type CustomInputMode = 'percentage' | 'fixed';

export const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({
    isOpen,
    onClose,
    requirement,
    onConfirm,
    currencySymbol = '₹',
}) => {
    const remaining = Math.max(0, requirement.quoted_price - requirement.total_billed);

    const [mode, setMode] = useState<BillingMode>('full');
    const [customMode, setCustomMode] = useState<CustomInputMode>('percentage');
    const [percentageInput, setPercentageInput] = useState('100');
    const [fixedInput, setFixedInput] = useState(remaining.toFixed(2));

    // Reset state whenever modal opens
    useEffect(() => {
        if (isOpen) {
            setMode('full');
            setCustomMode('percentage');
            setPercentageInput('100');
            setFixedInput(remaining.toFixed(2));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    const computedAmount = (() => {
        if (mode === 'full') return remaining;
        if (customMode === 'percentage') {
            const pct = parseFloat(percentageInput) || 0;
            return parseFloat(((pct / 100) * remaining).toFixed(2));
        }
        return parseFloat(fixedInput) || 0;
    })();

    const isValid = computedAmount > 0 && computedAmount <= remaining + 0.001;

    const fmt = (n: number) =>
        n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const handleConfirm = () => {
        if (!isValid) return;
        onConfirm(parseFloat(computedAmount.toFixed(2)));
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[#EEEEEE] flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-[#111111] tracking-tight">Billing Amount</h2>
                        <p className="text-xs text-[#697386] mt-0.5 truncate max-w-[300px]">{requirement.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-4 h-4 text-[#697386]" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Summary Row */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Quoted', value: requirement.quoted_price },
                            { label: 'Billed', value: requirement.total_billed },
                            { label: 'Remaining', value: remaining },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-[#F9FAFB] rounded-xl p-3 text-center border border-[#EEEEEE]">
                                <p className="text-xxs font-semibold text-[#697386] uppercase tracking-wider mb-1">{label}</p>
                                <p className="text-sm font-bold text-[#111111]">{currencySymbol}{fmt(value)}</p>
                            </div>
                        ))}
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex gap-2">
                        {(['full', 'custom'] as BillingMode[]).map((m) => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setMode(m)}
                                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl border transition-colors ${
                                    mode === m
                                        ? 'bg-[#111111] text-white border-[#111111]'
                                        : 'bg-white text-[#697386] border-[#EEEEEE] hover:border-[#111111] hover:text-[#111111]'
                                }`}
                            >
                                {m === 'full' ? 'Full Remaining' : 'Custom Amount'}
                            </button>
                        ))}
                    </div>

                    {/* Custom inputs */}
                    {mode === 'custom' && (
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                {(['percentage', 'fixed'] as CustomInputMode[]).map((cm) => (
                                    <button
                                        key={cm}
                                        type="button"
                                        onClick={() => setCustomMode(cm)}
                                        className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                                            customMode === cm
                                                ? 'bg-[#F0F0F0] text-[#111111] border-[#D0D0D0]'
                                                : 'bg-white text-[#697386] border-[#EEEEEE] hover:border-[#999]'
                                        }`}
                                    >
                                        {cm === 'percentage' ? '% Percentage' : `${currencySymbol} Fixed Amount`}
                                    </button>
                                ))}
                            </div>

                            {customMode === 'percentage' ? (
                                <div className="space-y-2">
                                    <input
                                        type="range"
                                        min={1}
                                        max={100}
                                        step={1}
                                        value={parseFloat(percentageInput) || 0}
                                        onChange={(e) => setPercentageInput(e.target.value)}
                                        className="w-full accent-[#111111]"
                                    />
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min={1}
                                            max={100}
                                            step={1}
                                            value={percentageInput}
                                            onChange={(e) => setPercentageInput(e.target.value)}
                                            className="w-full pr-8 pl-3 py-2.5 text-sm border border-[#EEEEEE] rounded-xl focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-colors text-right font-semibold"
                                        />
                                        <span className="absolute right-3 top-2.5 text-[#697386] text-sm font-medium">%</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-[#697386] text-sm font-medium">{currencySymbol}</span>
                                    <input
                                        type="number"
                                        min={0.01}
                                        max={remaining}
                                        step={0.01}
                                        value={fixedInput}
                                        onChange={(e) => setFixedInput(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2.5 text-sm border border-[#EEEEEE] rounded-xl focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-colors text-right font-semibold"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Live preview */}
                    <div className={`rounded-xl px-4 py-3 text-sm font-semibold text-center ${isValid ? 'bg-[#F0FDF4] text-[#0F9D58]' : 'bg-red-50 text-[#D14343]'}`}>
                        {isValid
                            ? `Billing: ${currencySymbol}${fmt(computedAmount)} of ${currencySymbol}${fmt(remaining)} remaining`
                            : computedAmount <= 0
                                ? 'Amount must be greater than zero'
                                : `Exceeds remaining balance of ${currencySymbol}${fmt(remaining)}`
                        }
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[#EEEEEE] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-bold text-[#111111] hover:bg-gray-100 rounded-full transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!isValid}
                        className={`px-6 py-2.5 text-sm font-bold rounded-full transition-colors flex items-center gap-2 ${
                            isValid
                                ? 'bg-[#111111] text-white hover:bg-black shadow-[0_4px_14px_rgba(0,0,0,0.2)]'
                                : 'bg-gray-100 text-[#a0aabf] cursor-not-allowed'
                        }`}
                    >
                        <Check className="w-4 h-4" />
                        Confirm Billing
                    </button>
                </div>
            </div>
        </div>
    );
};
