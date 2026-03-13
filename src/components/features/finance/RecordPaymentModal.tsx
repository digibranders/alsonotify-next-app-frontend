import React, { useState } from 'react';
import { X, DollarSign, Calendar, Hash, CheckCircle2 } from 'lucide-react';
import dayjs from 'dayjs';

interface RecordPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoiceId: string | number;
    invoiceNumber: string;
    totalAmount: number;
    amountReceived: number;
    onSave: (data: { amount: number, date: string, method: string, reference?: string }) => void;
    isSaving?: boolean;
    currencySymbol?: string;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
    isOpen,
    onClose,
    invoiceNumber,
    totalAmount,
    amountReceived,
    onSave,
    isSaving = false,
    currencySymbol = '₹'
}) => {
    const remainingAmount = Math.max(0, totalAmount - amountReceived);

    const [amount, setAmount] = useState<string>('');
    const [date, setDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
    const [method, setMethod] = useState<string>('Bank Transfer');
    const [reference, setReference] = useState<string>('');
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

    if (isOpen && !prevIsOpen) {
        setPrevIsOpen(true);
        setAmount(remainingAmount.toString());
        setDate(dayjs().format('YYYY-MM-DD'));
        setMethod('Bank Transfer');
        setReference('');
    } else if (!isOpen && prevIsOpen) {
        setPrevIsOpen(false);
    }

    if (!isOpen) return null;

    const parsedAmount = parseFloat(amount) || 0;
    const isValid = parsedAmount > 0 && parsedAmount <= remainingAmount + 0.01; // Allow slight overpayment due to floats

    // Status preview calculation
    const newTotalReceived = amountReceived + parsedAmount;
    const newRemaining = Math.max(0, totalAmount - newTotalReceived);
    const newStatus = newRemaining <= 0 ? 'paid' : 'partial';

    const handleSave = () => {
        if (!isValid) return;
        onSave({
            amount: parsedAmount,
            date,
            method,
            reference: reference.trim() || undefined
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-[500px] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-[#EEEEEE] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#E8F5E9] flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-[#0F9D58]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[#111111] tracking-tight">Record Payment</h2>
                            <p className="text-sm text-[#697386]">For Invoice {invoiceNumber}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5 text-[#697386]" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto bg-white space-y-5">

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#F9FAFB] border border-[#EEEEEE] rounded-xl p-3">
                            <p className="text-xs-tight font-semibold text-[#697386] uppercase tracking-wider mb-1">Total Due</p>
                            <p className="text-lg font-bold text-[#111111]">{currencySymbol}{totalAmount.toLocaleString()}</p>
                        </div>
                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3">
                            <p className="text-xs-tight font-semibold text-blue-600 uppercase tracking-wider mb-1">Remaining</p>
                            <p className="text-lg font-bold text-blue-700">{currencySymbol}{remainingAmount.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="space-y-4 pt-2">
                        {/* Amount Field */}
                        <div>
                            <label className="block text-xs font-semibold text-[#697386] uppercase tracking-wider mb-1.5">Payment Amount</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-[#697386] font-medium">{currencySymbol}</span>
                                </div>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className={`w-full pl-8 pr-3 py-2.5 text-base font-medium border rounded-lg focus:outline-none focus:ring-1 transition-colors ${parsedAmount > remainingAmount + 0.01
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                                        : 'border-[#EEEEEE] focus:border-[#111111] focus:ring-[#111111]'
                                        }`}
                                    min="0.01"
                                    step="0.01"
                                    max={remainingAmount}
                                />
                                {parsedAmount > remainingAmount + 0.01 && (
                                    <p className="text-xs text-red-500 mt-1.5 absolute -bottom-5 left-0">
                                        Amount exceeds remaining balance.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Date & Method */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-[#697386] uppercase tracking-wider mb-1.5">Payment Date</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                        <Calendar className="w-4 h-4 text-[#a0aabf]" />
                                    </div>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-[#EEEEEE] rounded-lg focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111]"
                                        max={dayjs().format('YYYY-MM-DD')}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#697386] uppercase tracking-wider mb-1.5">Payment Method</label>
                                <select
                                    value={method}
                                    onChange={(e) => setMethod(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-[#EEEEEE] rounded-lg focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] bg-white"
                                >
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Credit Card">Credit Card</option>
                                    <option value="UPI">UPI / Digital</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        {/* Reference */}
                        <div>
                            <label className="block text-xs font-semibold text-[#697386] uppercase tracking-wider mb-1.5">Reference / Notes (Optional)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                    <Hash className="w-4 h-4 text-[#a0aabf]" />
                                </div>
                                <input
                                    type="text"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    placeholder="Transaction ID, Cheque No, etc."
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-[#EEEEEE] rounded-lg focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status Preview */}
                    {parsedAmount > 0 && parsedAmount <= remainingAmount + 0.01 && (
                        <div className="mt-6 p-4 rounded-xl border border-[#EEEEEE] bg-[#F9FAFB] flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${newStatus === 'paid' ? 'bg-[#E8F5E9]' : 'bg-blue-50'
                                }`}>
                                <CheckCircle2 className={`w-5 h-5 ${newStatus === 'paid' ? 'text-[#0F9D58]' : 'text-blue-500'
                                    }`} />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-[#697386]">Status will change to</p>
                                <p className={`text-sm font-bold uppercase tracking-wide mt-0.5 ${newStatus === 'paid' ? 'text-[#0F9D58]' : 'text-blue-600'
                                    }`}>
                                    {newStatus}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-[#697386]">New Balance</p>
                                <p className="text-sm font-semibold text-[#111111] mt-0.5">
                                    {currencySymbol}{newRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-[#EEEEEE] bg-gray-50 flex items-center justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-5 py-2.5 text-sm font-bold text-[#111111] hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!isValid || isSaving}
                        className={`px-6 py-2.5 text-sm font-bold flex items-center gap-2 rounded-full transition-colors ${isValid
                            ? 'bg-[#111111] text-white hover:bg-black shadow-[0_4px_14px_rgba(0,0,0,0.2)]'
                            : 'bg-gray-200 text-[#a0aabf] cursor-not-allowed'
                            }`}
                    >
                        {isSaving ? 'Recording...' : 'Record Payment'}
                    </button>
                </div>
            </div>
        </div>
    );
};
