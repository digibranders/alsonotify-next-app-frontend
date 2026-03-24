'use client';

import { useState, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Download, Send, Save, ArrowLeft, Percent, DollarSign, FileText } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { getTaxPreview } from '@/services/invoice';
import { useCreateAdvanceProforma } from '@/hooks/useInvoice';

const PERCENTAGE_PRESETS = [25, 50, 75, 100];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED'];

export function CreateAdvanceProformaPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const requirementId = Number(searchParams.get('requirementId') || '0');
    const requirementTitle = searchParams.get('requirementTitle') || 'Requirement';
    const quotedPrice = Number(searchParams.get('quotedPrice') || '0');
    const defaultCurrency = searchParams.get('currency') || 'INR';
    const billFrom = Number(searchParams.get('billFrom') || '0');
    const billTo = Number(searchParams.get('billTo') || '0');

    const [advanceType, setAdvanceType] = useState<'percentage' | 'flat'>('percentage');
    const [percentage, setPercentage] = useState<number>(50);
    const [flatAmount, setFlatAmount] = useState<number>(0);
    const [currency, setCurrency] = useState<string>(defaultCurrency);
    const [dueDate, setDueDate] = useState<string>(dayjs().add(7, 'day').format('YYYY-MM-DD'));
    const [paymentDetails, setPaymentDetails] = useState<string>('');
    const [memo, setMemo] = useState<string>('');
    const [isDownloading, setIsDownloading] = useState(false);

    const previewRef = useRef<HTMLDivElement>(null);

    const { mutateAsync: createProforma, isPending } = useCreateAdvanceProforma();

    const { data: taxPreview } = useQuery({
        queryKey: ['tax-preview', billFrom, billTo],
        queryFn: () => getTaxPreview(billFrom, billTo),
        enabled: !!billFrom && !!billTo,
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

    const buildPayload = () => ({
        advance_type: advanceType,
        advance_percentage: advanceType === 'percentage' ? percentage : undefined,
        advance_amount: advanceType === 'flat' ? flatAmount : undefined,
        currency,
        due_date: new Date(dueDate).toISOString(),
        payment_details: paymentDetails || undefined,
        memo: memo || undefined,
        tax_type: taxPreview?.taxLabel || undefined,
    });

    const handleSaveDraft = async () => {
        if (!dueDate) { toast.error('Please select a due date'); return; }
        if (advanceType === 'flat' && !flatAmount) { toast.error('Please enter a flat amount'); return; }
        try {
            const response = await createProforma({ requirementId, data: buildPayload() });
            toast.success('Advance proforma saved as draft');
            const invoiceId = response?.result?.id;
            if (invoiceId) router.push(`/dashboard/finance/invoices/${invoiceId}`);
        } catch (err: unknown) {
            toast.error(
                (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
                'Failed to create advance proforma',
            );
        }
    };

    const handleSend = async () => {
        if (!dueDate) { toast.error('Please select a due date'); return; }
        if (advanceType === 'flat' && !flatAmount) { toast.error('Please enter a flat amount'); return; }
        try {
            const response = await createProforma({ requirementId, data: buildPayload() });
            toast.success('Advance proforma created — send it from the invoice page');
            const invoiceId = response?.result?.id;
            if (invoiceId) router.push(`/dashboard/finance/invoices/${invoiceId}`);
        } catch (err: unknown) {
            toast.error(
                (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
                'Failed to create advance proforma',
            );
        }
    };

    const handleDownload = async () => {
        if (!previewRef.current) return;
        setIsDownloading(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;
            const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
            pdf.save(`advance-proforma-${requirementTitle}.pdf`);
        } catch {
            toast.error('Failed to download PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    const isDisabled = isPending || (advanceType === 'flat' && !flatAmount);

    return (
        <div className="min-h-screen bg-[#F9FAFB]">
            {/* Top Bar */}
            <div className="sticky top-0 z-10 bg-white border-b border-[#EEEEEE] px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-[#666666]" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-[#111111] leading-tight">Raise Advance Proforma</h1>
                            <p className="text-xs text-[#666666]">{requirementTitle}</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#111111] border border-[#EEEEEE] bg-white rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        {isDownloading ? 'Downloading...' : 'Download'}
                    </button>
                    <button
                        onClick={handleSaveDraft}
                        disabled={isDisabled}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#111111] border border-[#EEEEEE] bg-white rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" />
                        Save Draft
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={isDisabled}
                        className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-[#111111] text-white rounded-full hover:bg-black shadow-[0_4px_14px_rgba(0,0,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-4 h-4" />
                        {isPending ? 'Creating...' : 'Send'}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Form */}
                <div className="space-y-6">
                    {/* Advance Type */}
                    <div className="bg-white rounded-2xl border border-[#EEEEEE] p-6 space-y-5">
                        <h2 className="text-sm font-bold text-[#111111] uppercase tracking-wider">Advance Configuration</h2>

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
                                    <span className="text-sm text-[#666666]">
                                        % of quoted price ({currency} {quotedPrice.toLocaleString()})
                                    </span>
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
                    </div>

                    {/* Invoice Details */}
                    <div className="bg-white rounded-2xl border border-[#EEEEEE] p-6 space-y-5">
                        <h2 className="text-sm font-bold text-[#111111] uppercase tracking-wider">Invoice Details</h2>

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

                        <div>
                            <label className="block text-xs font-semibold text-[#666666] uppercase tracking-wider mb-2">
                                Payment Details <span className="normal-case font-normal">(Optional)</span>
                            </label>
                            <textarea
                                value={paymentDetails}
                                onChange={e => setPaymentDetails(e.target.value)}
                                placeholder="Bank account details, UPI ID, etc."
                                rows={3}
                                className="w-full px-3 py-2 text-sm border border-[#EEEEEE] rounded-lg focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-[#666666] uppercase tracking-wider mb-2">
                                Memo <span className="normal-case font-normal">(Optional)</span>
                            </label>
                            <textarea
                                value={memo}
                                onChange={e => setMemo(e.target.value)}
                                placeholder="Additional notes for the client..."
                                rows={3}
                                className="w-full px-3 py-2 text-sm border border-[#EEEEEE] rounded-lg focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Preview / Summary */}
                <div className="space-y-6">
                    <div ref={previewRef} className="bg-white rounded-2xl border border-[#EEEEEE] p-6 space-y-6">
                        {/* Invoice Header */}
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-[#111111]">Advance Proforma Invoice</h2>
                                <p className="text-sm text-[#666666] mt-1">{requirementTitle}</p>
                            </div>
                            <span className="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full uppercase tracking-wider">
                                PROFORMA
                            </span>
                        </div>

                        <div className="border-t border-[#EEEEEE]" />

                        {/* Due Date Display */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-xs font-semibold text-[#666666] uppercase tracking-wider mb-1">Issue Date</p>
                                <p className="font-medium text-[#111111]">{dayjs().format('DD MMM YYYY')}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-[#666666] uppercase tracking-wider mb-1">Due Date</p>
                                <p className="font-medium text-[#111111]">{dueDate ? dayjs(dueDate).format('DD MMM YYYY') : '—'}</p>
                            </div>
                        </div>

                        <div className="border-t border-[#EEEEEE]" />

                        {/* Line Item */}
                        <div>
                            <div className="flex items-center justify-between text-xs font-semibold text-[#666666] uppercase tracking-wider mb-3">
                                <span>Description</span>
                                <span>Amount</span>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-[#F0F0F0]">
                                <div>
                                    <p className="text-sm font-medium text-[#111111]">Advance Payment for Services</p>
                                    <p className="text-xs text-[#666666] mt-0.5">
                                        {advanceType === 'percentage'
                                            ? `${percentage}% of ${currency} ${quotedPrice.toLocaleString()}`
                                            : `Flat advance`}
                                    </p>
                                </div>
                                <p className="text-sm font-semibold text-[#111111]">
                                    {currency} {advanceBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-[#666666]">Subtotal</span>
                                <span className="font-medium text-[#111111]">
                                    {currency} {advanceBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            {taxRate > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-[#666666]">{taxPreview?.taxLabel || 'Tax'} ({taxRate}%)</span>
                                    <span className="font-medium text-[#111111]">
                                        {currency} {taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}
                            <div className="pt-3 border-t border-[#EEEEEE] flex justify-between">
                                <span className="text-base font-bold text-[#111111]">Total</span>
                                <span className="text-base font-bold text-[#111111]">
                                    {currency} {proformaTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        {/* Payment Details in Preview */}
                        {paymentDetails && (
                            <>
                                <div className="border-t border-[#EEEEEE]" />
                                <div>
                                    <p className="text-xs font-semibold text-[#666666] uppercase tracking-wider mb-1">Payment Details</p>
                                    <p className="text-sm text-[#444444] whitespace-pre-wrap">{paymentDetails}</p>
                                </div>
                            </>
                        )}

                        {/* Memo in Preview */}
                        {memo && (
                            <>
                                <div className="border-t border-[#EEEEEE]" />
                                <div>
                                    <p className="text-xs font-semibold text-[#666666] uppercase tracking-wider mb-1">Notes</p>
                                    <p className="text-sm text-[#444444] whitespace-pre-wrap">{memo}</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
