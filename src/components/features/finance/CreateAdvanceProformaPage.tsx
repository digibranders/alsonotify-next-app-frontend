'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Download, Send, Save, ArrowLeft, Percent, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { getTaxPreview, getNextInvoiceNumber } from '@/services/invoice';
import { useCreateAdvanceProforma } from '@/hooks/useInvoice';
import { useCurrentUserCompany, usePartners } from '@/hooks/useUser';
import { InvoicePreview } from './InvoicePreview';
import { trimStr } from '@/utils/trim';

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

    // --- Form State ---
    const [advanceType, setAdvanceType] = useState<'percentage' | 'flat'>('percentage');
    const [percentage, setPercentage] = useState<number>(50);
    const [flatAmount, setFlatAmount] = useState<number>(0);
    const [currency, setCurrency] = useState<string>(defaultCurrency);
    const [dueDate, setDueDate] = useState<string>(dayjs().add(7, 'day').format('YYYY-MM-DD'));
    const [paymentDetails, setPaymentDetails] = useState<string>('');
    const [memo, setMemo] = useState<string>('');
    const [isDownloading, setIsDownloading] = useState(false);

    // --- Sender / Client info for preview ---
    const [senderName, setSenderName] = useState('');
    const [senderAddress, setSenderAddress] = useState('');
    const [senderEmail, setSenderEmail] = useState('');
    const [senderTaxId, setSenderTaxId] = useState('');
    const [senderLogoUrl, setSenderLogoUrl] = useState<string | null>(null);
    const [clientName, setClientName] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientTaxId, setClientTaxId] = useState('');

    const previewRef = useRef<HTMLDivElement>(null);

    const { mutateAsync: createProforma, isPending } = useCreateAdvanceProforma();
    const { data: companyRes } = useCurrentUserCompany();
    const { data: partnersRes } = usePartners();

    const companyData = companyRes?.result;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const companyId = (companyData as any)?.id as number | undefined;

    const partnerData = useMemo(() => {
        if (!partnersRes?.result) return null;
        return partnersRes.result.find(p =>
            Number(p.company_id) === billTo || Number(p.id) === billTo
        ) || null;
    }, [partnersRes, billTo]);

    const { data: taxPreview } = useQuery({
        queryKey: ['tax-preview', billFrom, billTo],
        queryFn: () => getTaxPreview(billFrom, billTo),
        enabled: !!billFrom && !!billTo,
        select: (res) => res.result,
    });

    const { data: nextNumberData } = useQuery({
        queryKey: ['next-invoice-number', companyId, 'PROFORMA'],
        queryFn: () => getNextInvoiceNumber(companyId!, 'PROFORMA'),
        enabled: !!companyId,
        staleTime: 0,
    });

    const invoiceId = nextNumberData?.result?.invoice_number ?? 'DRAFT';

    // --- Populate sender from company ---
    useEffect(() => {
        if (!companyData) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = companyData as any;
        setSenderName(c.name || '');
        setSenderEmail(c.email || '');
        setSenderTaxId(c.tax_id || '');
        setSenderLogoUrl(c.logo_url || c.logo || null);
        const addr1 = c.address_line_1 || '';
        const addr2 = c.address_line_2 || '';
        const city = c.city || '';
        const state = c.state || '';
        const zip = c.zipcode || '';
        const country = c.country || '';
        let addressParts = [addr1, addr2].filter(Boolean).join('\n');
        const locationLine = [city, state, zip].filter(Boolean).join(', ');
        if (locationLine) addressParts += (addressParts ? '\n' : '') + locationLine;
        if (country) addressParts += (addressParts ? ', ' : '') + country;
        setSenderAddress(addressParts.trim() || c.address || '');
    }, [companyData]);

    // --- Populate client from partner ---
    useEffect(() => {
        if (!partnerData) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = partnerData as any;
        const name =
            p.partner_company?.name ||
            (typeof p.company === 'object' ? p.company?.name : p.company) ||
            p.name || '';
        setClientName(name);
        setClientEmail(p.email || '');
        setClientPhone(p.phone || p.mobile_number || p.user_profile?.phone || p.user_profile?.mobile_number || '');
        setClientTaxId(p.tax_id || (typeof p.company === 'object' ? p.company?.tax_id : '') || '');
        const addr1 = p.address_line_1 || '';
        const addr2 = p.address_line_2 || '';
        const city = p.city || p.user_profile?.city || '';
        const state = p.state || p.user_profile?.state || '';
        const zip = p.zipcode || p.user_profile?.zipcode || '';
        const country = p.country || p.user_profile?.country || '';
        let addressParts = [addr1, addr2].filter(Boolean).join('\n');
        const locationLine = [city, state, zip].filter(Boolean).join(', ');
        if (locationLine) addressParts += (addressParts ? '\n' : '') + locationLine;
        if (country) addressParts += (addressParts ? ', ' : '') + country;
        const companyAddress = (typeof p.company === 'object' ? p.company?.address : '') || '';
        setClientAddress(addressParts.trim() || companyAddress);
    }, [partnerData]);

    // --- Calculations ---
    const advanceBase = useMemo(() => {
        if (advanceType === 'percentage') return (quotedPrice * percentage) / 100;
        return flatAmount;
    }, [advanceType, percentage, flatAmount, quotedPrice]);

    const taxRate = taxPreview?.totalRate ?? 0;
    const taxAmount = (advanceBase * taxRate) / 100;
    const proformaTotal = advanceBase + taxAmount;

    // --- Invoice Preview Data ---
    const invoiceData = useMemo(() => ({
        invoiceId: trimStr(invoiceId),
        issueDate: dayjs().format('YYYY-MM-DD'),
        dueDate,
        currencyCode: currency,
        senderName: trimStr(senderName),
        senderLogoUrl,
        senderAddress: trimStr(senderAddress),
        senderEmail: trimStr(senderEmail),
        senderTaxId: trimStr(senderTaxId),
        clientName: trimStr(clientName),
        clientAddress: trimStr(clientAddress),
        clientEmail: trimStr(clientEmail),
        clientPhone: trimStr(clientPhone),
        clientTaxId: trimStr(clientTaxId),
        items: [{
            id: 'advance-1',
            description: `Advance Payment for Services — ${requirementTitle}`,
            quantity: 1,
            unitPrice: advanceBase,
        }],
        totals: {
            subtotal: advanceBase,
            discount: 0,
            totalTax: taxAmount,
            total: proformaTotal,
        },
        taxConfig: {
            id: taxPreview?.taxLabel || 'tax',
            name: taxPreview?.taxLabel || 'Tax',
            rate: taxRate,
        },
        memo: trimStr(memo),
        footer: trimStr(paymentDetails),
        invoiceType: 'PROFORMA' as const,
    }), [
        invoiceId, dueDate, currency, senderName, senderLogoUrl, senderAddress,
        senderEmail, senderTaxId, clientName, clientAddress, clientEmail,
        clientPhone, clientTaxId, advanceBase, taxAmount, proformaTotal,
        taxPreview, taxRate, memo, paymentDetails, requirementTitle,
    ]);

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

    const validate = () => {
        if (!dueDate) { toast.error('Please select a due date'); return false; }
        if (advanceType === 'flat' && !flatAmount) { toast.error('Please enter a flat amount'); return false; }
        return true;
    };

    const handleSaveDraft = async () => {
        if (!validate()) return;
        try {
            const response = await createProforma({ requirementId, data: buildPayload() });
            toast.success('Advance proforma saved as draft');
            const id = response?.result?.id;
            if (id) router.push(`/dashboard/finance/invoices/${id}`);
        } catch (err: unknown) {
            toast.error(
                (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
                'Failed to create advance proforma',
            );
        }
    };

    const handleSend = async () => {
        if (!validate()) return;
        try {
            const response = await createProforma({ requirementId, data: buildPayload() });
            toast.success('Advance proforma created — send it from the invoice page');
            const id = response?.result?.id;
            if (id) router.push(`/dashboard/finance/invoices/${id}`);
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
        // Mirror CreateInvoicePage: h-full flex flex-col fills the AppShell content slot
        <div className="h-full bg-[#F9FAFB] flex flex-col rounded-[24px] overflow-hidden">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="bg-white border-b border-[#EEEEEE] px-4 py-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-[#F7F7F7] rounded-full transition-colors text-[#666666] cursor-pointer"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <span className="text-base font-semibold text-[#111111]">Raise Advance Proforma</span>
                        <p className="text-xs text-[#999999] leading-tight">{requirementTitle}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="px-4 py-2 border border-[#EEEEEE] bg-white text-[#111111] rounded-full font-bold text-xs hover:bg-[#F7F7F7] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {isDownloading ? (
                            <span className="w-4 h-4 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        Download PDF
                    </button>
                    <button
                        onClick={handleSaveDraft}
                        disabled={isDisabled}
                        className="px-4 py-2 border border-[#EEEEEE] bg-white text-[#111111] rounded-full font-bold text-xs hover:bg-[#F7F7F7] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" />
                        Save as Draft
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={isDisabled}
                        className="px-6 py-2 bg-[#111111] text-white rounded-full font-bold text-xs hover:bg-black transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-4 h-4" />
                        {isPending ? 'Creating...' : 'Send'}
                    </button>
                </div>
            </div>

            {/* ── Body: two scrollable panels ────────────────────────────────── */}
            {/* min-h-0 is REQUIRED so flex children can shrink and scroll */}
            <div className="flex-1 flex min-h-0">

                {/* LEFT PANEL — Form */}
                <div className="w-1/2 overflow-y-auto p-8 border-r border-[#EEEEEE] bg-white">
                    <div className="max-w-none mx-auto space-y-8">

                        {/* Advance Configuration */}
                        <section>
                            <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider mb-4">Advance Configuration</h3>

                            {/* Advance Type Toggle */}
                            <div className="mb-5">
                                <label className="block text-xs font-medium text-[#666666] mb-2">Advance Type</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setAdvanceType('percentage')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${
                                            advanceType === 'percentage'
                                                ? 'bg-[#111111] text-white border-[#111111]'
                                                : 'bg-white text-[#666666] border-[#EEEEEE] hover:border-[#111111]'
                                        }`}
                                    >
                                        <Percent className="w-4 h-4" /> Percentage
                                    </button>
                                    <button
                                        onClick={() => setAdvanceType('flat')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${
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
                                    <label className="block text-xs font-medium text-[#666666] mb-2">Advance Percentage</label>
                                    <div className="flex gap-2 mb-3">
                                        {PERCENTAGE_PRESETS.map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setPercentage(p)}
                                                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors cursor-pointer ${
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
                                    <label className="block text-xs font-medium text-[#666666] mb-2">Flat Amount</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={currency}
                                            onChange={e => setCurrency(e.target.value)}
                                            className="px-3 py-2 text-sm border border-[#EEEEEE] rounded-lg focus:outline-none focus:border-[#111111] bg-white cursor-pointer"
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
                        </section>

                        {/* Invoice Details */}
                        <section>
                            <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider mb-4">Invoice Details</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-[#666666] mb-1.5">Due Date</label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-[#EEEEEE] rounded-lg focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111]"
                                        min={dayjs().format('YYYY-MM-DD')}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-[#666666] mb-1.5">
                                        Payment Details <span className="text-[#999999] font-normal">(Optional)</span>
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
                                    <label className="block text-xs font-medium text-[#666666] mb-1.5">
                                        Memo <span className="text-[#999999] font-normal">(Optional)</span>
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
                        </section>

                    </div>
                </div>

                {/* RIGHT PANEL — PDF Preview */}
                <div className="w-1/2 bg-[#E5E7EB] p-6 overflow-y-auto">
                    <div className="flex justify-center">
                        <InvoicePreview ref={previewRef} data={invoiceData} />
                    </div>
                </div>

            </div>
        </div>
    );
}
