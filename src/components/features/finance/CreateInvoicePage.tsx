'use client';
/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    Download,
    Send,
    Plus,
    X,
    Save,
    ChevronDown,
    Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { useCurrentUserCompany, usePartners } from '@/hooks/useUser';
import { useCreateInvoice } from '@/hooks/useInvoice';
import { getNextInvoiceNumber } from '@/services/invoice';
import { useInvoicePresets, InvoicePaymentPreset } from '@/hooks/useInvoicePresets';
import { trimStr } from '@/utils/trim';

interface LineItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number; // Percentage
}

interface TaxConfig {
    id: string;
    name: string;
    rate: number;
}

export function CreateInvoicePage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // --- Query Params ---
    const clientId = searchParams.get('clientId');
    const reqIds = useMemo(() => {
        const raw = searchParams.get('reqIds');
        return raw ? raw.split(',') : [];
    }, [searchParams]);

    // --- State ---
    const [issueDate, setIssueDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [dueDate, setDueDate] = useState(dayjs().add(7, 'days').format('YYYY-MM-DD'));

    const [items, setItems] = useState<LineItem[]>([]);
    const [discount, setDiscount] = useState<number>(0); // Flat amount
    const [showDiscount, setShowDiscount] = useState(false);
    const [taxConfig, setTaxConfig] = useState<TaxConfig>({ id: 'gst_18', name: 'IGST', rate: 18 });
    const [memo, setMemo] = useState('Payment is due within 7 days. Please include the invoice number on your wire transfer.');
    const [footer, setFooter] = useState<string>('Bank: Kotak Mahindra Bank\nA/C: 5345861934\nIFSC: KKBK0000632\nBranch: CBD Belapur, Mumbai');

    const previewRef = useRef<HTMLDivElement>(null);

    // --- Dynamic Data ---
    const { data: companyRes } = useCurrentUserCompany();
    const { data: partnersRes } = usePartners();
    const { mutateAsync: createInvoiceMutation, isPending: isSaving } = useCreateInvoice();

    const companyId = (companyRes?.result as { id?: number } | undefined)?.id;

    const companyData = companyRes?.result;
    const partnerData = useMemo(() => {
        if (!partnersRes?.result || !clientId) return null;
        // clientId might be a name or ID from searchParams, let's find matching partner
        return partnersRes.result.find(p => String(p.id) === clientId || p.name === clientId || (typeof p.company === 'object' ? p.company.name === clientId : p.company === clientId));
    }, [partnersRes, clientId]);

    // --- Invoice Number (server-generated, prevents duplicates) ---
    const { data: nextNumberData } = useQuery({
        queryKey: ['next-invoice-number', companyId],
        queryFn: () => getNextInvoiceNumber(companyId!),
        enabled: !!companyId,
        staleTime: 0,
    });
    const invoiceId = nextNumberData?.result?.invoice_number ?? '';

    const [currencyCode, setCurrencyCode] = useState('INR');

    // Sender details (From) - Defaults to Fynix Mock
    const [senderName, setSenderName] = useState('Fynix Digital Solutions');
    const [senderAddress, setSenderAddress] = useState('Tower 1, 4th Floor, CBD Belapur\nNavi Mumbai, MH 400614, India');
    const [senderEmail, setSenderEmail] = useState('savita@fynix.digital');
    const [senderTaxId, setSenderTaxId] = useState('27AAACD1234A1Z1');

    // Client details (To) - Defaults to Sample Client
    const [clientName, setClientName] = useState('Triem Security Solutions');
    const [clientAddress, setClientAddress] = useState('123 Corporate Park, Sholinganallur\nChennai, TN 600119, India');
    const [clientEmail, setClientEmail] = useState('info@triemsecurity.com');
    const [clientPhone, setClientPhone] = useState('+91 85915 09277');
    const [clientTaxId, setClientTaxId] = useState('33AABCT9876C1Z5');

    // --- Auto-populate from Settings/Partners ---
    useEffect(() => {
        if (companyData) {
            setSenderName(companyData.name || '');
            setSenderAddress(`${companyData.address_line_1 || ''}\n${companyData.address_line_2 || ''}`.trim());
            setSenderEmail(companyData.email || ''); // Assuming email exists in companyRes
            setSenderTaxId(companyData.tax_id || '');
            setCurrencyCode(companyData.currency || 'INR');

            // Auto-construct footer from bank details if they exist in companyData (assuming schema match or placeholder)
            const bankInfo = `Digibranders Private Limited\nKotak Mahindra Bank\nBranch: CBD Belapur, Navi Mumbai\nA/C No: 5345861934`;
            setFooter(bankInfo);
        }
    }, [companyData]);

    useEffect(() => {
        if (partnerData) {
            setClientName(typeof partnerData.company === 'object' ? partnerData.company.name : partnerData.company || partnerData.name || '');
            setClientAddress(`${partnerData.address_line_1 || ''}\n${partnerData.address_line_2 || ''}`.trim());
            setClientEmail(partnerData.email || '');
            setClientPhone((partnerData as { phone?: string }).phone || '');
            setClientTaxId((partnerData as { tax_id?: string }).tax_id || '');
        } else if (clientId) {
            setClientName(clientId);
        }
    }, [partnerData, clientId]);

    // Payment Presets State using Hook
    const { presets: paymentPresets, addPreset, deletePreset } = useInvoicePresets();
    const [showSavePresetDialog, setShowSavePresetDialog] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');

    const handleSavePreset = () => {
        if (!newPresetName.trim() || !footer.trim()) return;

        const newPreset: InvoicePaymentPreset = {
            id: Date.now().toString(),
            name: newPresetName.trim(),
            content: footer
        };

        addPreset(newPreset);

        setNewPresetName('');
        setShowSavePresetDialog(false);
        toast.success("Payment preset saved!");
    };

    const handleDeletePreset = (id: string) => {
        deletePreset(id);
        toast.success("Preset deleted");
    };

    // --- Initialization ---
    useEffect(() => {
        if (reqIds.length === 0) {
            // Default mock items for a "completely filled" look
            setItems([
                {
                    id: '1',
                    description: 'Digital Strategy & Architecture Consulting',
                    quantity: 1,
                    unitPrice: 25000,
                    taxRate: 18
                },
                {
                    id: '2',
                    description: 'UI/UX Design - Dashboard Optimization (Sprint 1)',
                    quantity: 1,
                    unitPrice: 15000,
                    taxRate: 18
                }
            ]);
        }
    }, [reqIds]);

    // --- Calculations ---

    const totals = useMemo(() => {
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const taxableAmount = Math.max(0, subtotal - discount);
        const totalTax = (taxableAmount * taxConfig.rate) / 100;
        const total = taxableAmount + totalTax;

        return {
            subtotal,
            discount,
            taxableAmount,
            totalTax,
            total
        };
    }, [items, discount, taxConfig]);

    // --- Handlers ---

    const handleAddItem = () => {
        setItems(prev => [
            ...prev,
            {
                id: crypto.randomUUID(),
                description: '',
                quantity: 1,
                unitPrice: 0,
                taxRate: taxConfig.rate
            }
        ]);
    };

    const handleUpdateItem = (id: string, field: keyof LineItem, value: string | number) => {
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleRemoveItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const handleSaveInvoice = async () => {
        if (!companyId) {
            toast.error('Company data not loaded. Please try again.');
            return;
        }
        const clientCompanyId = typeof (partnerData as { company?: { id?: number } } | null)?.company === 'object'
            ? (partnerData as { company: { id: number } }).company.id
            : (partnerData as { id?: number } | null)?.id;
        if (!clientCompanyId) {
            toast.error('Please select a valid client company.');
            return;
        }
        try {
            const particulars = items.map(item => ({
                id: item.id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                amount: item.quantity * item.unitPrice,
                tax_rate: item.taxRate,
            }));
            const payload = {
                bill_from: companyId,
                bill_to: clientCompanyId,
                issue_date: issueDate,
                due_date: dueDate,
                currency: currencyCode,
                particulars,
                sub_total: totals.subtotal,
                discount: totals.discount,
                tax: totals.totalTax,
                tax_type: taxConfig.name,
                total: totals.total,
                memo,
                payment_details: footer,
            };
            const created = await createInvoiceMutation(payload);
            toast.success(`Invoice ${created.result?.invoice_number ?? invoiceId} saved as draft.`);
            router.push('/dashboard/finance');
        } catch {
            toast.error('Failed to save invoice. Please try again.');
        }
    };

    const handleDownloadPDF = async () => {
        // We will wire this up to the backend PDF generation later
        toast.info("PDF download will be available after saving.");
    };

    return (
        <div className="h-full bg-[#F9FAFB] flex flex-col rounded-[24px] overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-[#EEEEEE] px-4 py-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-[#F7F7F7] rounded-full transition-colors text-[#666666]"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <span className="text-base font-semibold text-[#111111]">
                        New Invoice
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        className="px-4 py-2 text-[#666666] font-bold text-[0.8125rem] hover:text-[#111111] transition-colors"
                        onClick={() => router.back()}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        className="px-4 py-2 border border-[#EEEEEE] bg-white text-[#111111] rounded-full font-bold text-[0.8125rem] hover:bg-[#F7F7F7] transition-colors flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Download PDF
                    </button>
                    <button
                        onClick={handleSaveInvoice}
                        disabled={isSaving}
                        className="px-6 py-2 bg-[#ff3b3b] text-white rounded-full font-bold text-[0.8125rem] hover:bg-[#e63535] transition-colors flex items-center gap-2 disabled:opacity-60"
                    >
                        <Send className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save as Draft'}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-y-auto min-h-0 bg-[#E5E7EB] p-8">
                {/* SINGLE PANEL: Editor structured as an A4 page */}
                <div className="max-w-[794px] w-full mx-auto bg-white shadow-sm p-12 mb-20">
                    <div className="space-y-10">
                        {/* Header Details */}
                        <div className="flex justify-between items-start">
                            <div className="space-y-4 w-1/2">
                                {/* Sender Section */}
                                <div className="space-y-1.5 group relative">
                                    <input
                                        type="text"
                                        placeholder="Business Name"
                                        value={senderName}
                                        onChange={(e) => setSenderName(e.target.value)}
                                        className="w-full text-2xl font-bold text-[#111111] hover:bg-[#F9FAFB] focus:bg-white focus:ring-1 focus:ring-[#ff3b3b] outline-none transition-all p-1 -ml-1 rounded"
                                    />
                                    <textarea
                                        rows={2}
                                        placeholder="Business Address"
                                        value={senderAddress}
                                        onChange={(e) => setSenderAddress(e.target.value)}
                                        className="w-full text-sm text-[#666666] hover:bg-[#F9FAFB] focus:bg-white focus:ring-1 focus:ring-[#ff3b3b] outline-none transition-all p-1 -ml-1 rounded resize-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="GSTIN / Tax ID"
                                        value={senderTaxId}
                                        onChange={(e) => setSenderTaxId(e.target.value)}
                                        className="w-full text-sm text-[#666666] hover:bg-[#F9FAFB] focus:bg-white focus:ring-1 focus:ring-[#ff3b3b] outline-none transition-all p-1 -ml-1 rounded"
                                    />
                                    <input
                                        type="email"
                                        placeholder="Business Email"
                                        value={senderEmail}
                                        onChange={(e) => setSenderEmail(e.target.value)}
                                        className="w-full text-sm text-[#666666] hover:bg-[#F9FAFB] focus:bg-white focus:ring-1 focus:ring-[#ff3b3b] outline-none transition-all p-1 -ml-1 rounded"
                                    />
                                </div>
                            </div>
                            <div className="w-1/3 space-y-3 text-right">
                                <h2 className="text-4xl tracking-tight font-light text-[#E5E7EB] uppercase">Invoice</h2>
                                <div className="space-y-1.5 text-right">
                                    <label className="block text-xs font-medium text-[#666666]">Invoice Number</label>
                                    <input
                                        type="text"
                                        value={invoiceId}
                                        readOnly
                                        className="w-full text-sm text-[#111111] font-mono text-right bg-transparent outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5 flex justify-end items-center gap-3">
                                    <label className="text-xs font-medium text-[#666666]">Date</label>
                                    <input
                                        type="date"
                                        value={issueDate}
                                        onChange={(e) => setIssueDate(e.target.value)}
                                        className="w-32 px-2 py-1 bg-white border border-transparent hover:border-[#EEEEEE] rounded focus:border-[#ff3b3b] text-sm text-[#111111] outline-none text-right"
                                    />
                                </div>
                                <div className="space-y-1.5 flex justify-end items-center gap-3">
                                    <label className="text-xs font-medium text-[#666666]">Due Date</label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="w-32 px-2 py-1 bg-white border border-transparent hover:border-[#EEEEEE] rounded focus:border-[#ff3b3b] text-sm text-[#111111] outline-none text-right"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Customer Section (To) */}
                        <section className="pt-6 border-t border-[#EEEEEE]">
                            <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider mb-4">Bill To</h3>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <input
                                            type="text"
                                            placeholder="Client Name"
                                            value={clientName}
                                            onChange={(e) => setClientName(e.target.value)}
                                            className="w-full text-base font-medium text-[#111111] hover:bg-[#F9FAFB] focus:bg-white p-1 -ml-1 rounded focus:ring-1 focus:ring-[#ff3b3b] outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <textarea
                                            rows={2}
                                            placeholder="Client Address"
                                            value={clientAddress}
                                            onChange={(e) => setClientAddress(e.target.value)}
                                            className="w-full text-sm text-[#666666] hover:bg-[#F9FAFB] focus:bg-white p-1 -ml-1 rounded focus:ring-1 focus:ring-[#ff3b3b] outline-none resize-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <input
                                            type="text"
                                            placeholder="Client Tax ID"
                                            value={clientTaxId}
                                            onChange={(e) => setClientTaxId(e.target.value)}
                                            className="w-full text-sm text-[#666666] hover:bg-[#F9FAFB] focus:bg-white p-1 -ml-1 rounded focus:ring-1 focus:ring-[#ff3b3b] outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <input
                                            type="email"
                                            placeholder="Client Email"
                                            value={clientEmail}
                                            onChange={(e) => setClientEmail(e.target.value)}
                                            className="w-full text-sm text-[#666666] hover:bg-[#F9FAFB] focus:bg-white p-1 -ml-1 rounded focus:ring-1 focus:ring-[#ff3b3b] outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Items Section */}
                        <section className="pt-6 border-t border-[#EEEEEE]">
                            {/* Table Headers for Editor */}
                            <div className="flex gap-3 mb-2 px-1 border-b border-[#111111] pb-2">
                                <span className="flex-1 text-[0.6875rem] font-bold text-[#111111] uppercase tracking-wider">Item Description</span>
                                <span className="w-20 text-[0.6875rem] font-bold text-[#111111] uppercase tracking-wider text-right">Qty</span>
                                <span className="w-32 text-[0.6875rem] font-bold text-[#111111] uppercase tracking-wider text-right">Price</span>
                                <span className="w-32 text-[0.6875rem] font-bold text-[#111111] uppercase tracking-wider text-right">Total</span>
                                <span className="w-8"></span> {/* Spacer for delete icon */}
                            </div>

                            <div className="space-y-2 mb-4">
                                {items.map((item) => (
                                    <div key={item.id} className="group flex gap-3 items-start py-1 border-b border-[#EEEEEE]">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                placeholder="Item description"
                                                value={item.description}
                                                onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                                                className="w-full px-2 py-1.5 bg-transparent border border-transparent rounded-[4px] text-sm text-[#111111] placeholder:text-[#999999] focus:border-[#EEEEEE] outline-none hover:bg-[#F9FAFB] focus:bg-white transition-all"
                                            />
                                        </div>
                                        <div className="w-20">
                                            <input
                                                type="number"
                                                placeholder="Qty"
                                                value={item.quantity}
                                                onChange={(e) => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value))}
                                                className="w-full px-2 py-1.5 bg-transparent border border-transparent rounded-[4px] text-sm text-[#111111] text-right focus:border-[#EEEEEE] outline-none hover:bg-[#F9FAFB] focus:bg-white transition-all"
                                            />
                                        </div>
                                        <div className="w-32 relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999999] text-sm">{currencyCode === 'INR' ? '₹' : '$'}</span>
                                            <input
                                                type="number"
                                                placeholder="Price"
                                                value={item.unitPrice}
                                                onChange={(e) => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value))}
                                                className="w-full pl-6 pr-2 py-1.5 bg-transparent border border-transparent rounded-[4px] text-sm text-[#111111] text-right focus:border-[#EEEEEE] outline-none hover:bg-[#F9FAFB] focus:bg-white transition-all"
                                            />
                                        </div>
                                        <div className="w-32 pt-2 text-right text-sm font-medium text-[#111111]">
                                            {currencyCode === 'INR' ? '₹' : '$'}{(item.quantity * item.unitPrice).toLocaleString()}
                                        </div>
                                        <button
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="w-8 pt-2.5 flex justify-end text-[#999999] hover:text-[#ff3b3b] opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleAddItem}
                                className="flex items-center gap-2 text-[#ff3b3b] text-[0.8125rem] font-bold hover:underline py-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Line Item
                            </button>
                        </section>

                        <div className="flex gap-12 pt-6">
                            {/* Memo & Payment Term */}
                            <div className="flex-1 space-y-6">
                                <div>
                                    <label className="block text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wider mb-2">
                                        Notes
                                    </label>
                                    <textarea
                                        value={memo}
                                        onChange={(e) => setMemo(e.target.value)}
                                        placeholder="Thanks for your business..."
                                        className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-sm text-[#666666] min-h-[80px] focus:ring-1 focus:ring-[#ff3b3b] outline-none resize-none hover:bg-[#F9FAFB] focus:bg-white"
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wider">
                                            Payment Details
                                        </label>

                                        <div className="flex items-center gap-2">
                                            {/* Preset Selector */}
                                            {paymentPresets.length > 0 && (
                                                <div className="relative group">
                                                    <select
                                                        className="appearance-none bg-[#F7F7F7] hover:bg-[#EEEEEE] text-xs font-medium text-[#111111] pl-3 pr-8 py-1 rounded-full outline-none cursor-pointer border border-transparent focus:border-[#ff3b3b] transition-all"
                                                        onChange={(e) => {
                                                            const preset = paymentPresets.find(p => String(p.id) === e.target.value);
                                                            if (preset) setFooter(preset.content);
                                                        }}
                                                        value=""
                                                    >
                                                        <option value="" disabled selected>Load preset...</option>
                                                        {paymentPresets.map(preset => (
                                                            <option key={preset.id} value={preset.id}>{preset.name}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#666666] pointer-events-none" />
                                                </div>
                                            )}

                                            {/* Save Button */}
                                            <button
                                                onClick={() => setShowSavePresetDialog(true)}
                                                className="flex items-center gap-1 px-2.5 py-1 bg-[#F7F7F7] hover:bg-[#EEEEEE] text-xs font-medium text-[#111111] rounded-full transition-colors"
                                                title="Save as new preset"
                                            >
                                                <Save className="w-3.5 h-3.5" />
                                                <span>Save</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Save Dialog Overlay */}
                                    {showSavePresetDialog && (
                                        <div className="mb-3 p-3 bg-[#F9FAFB] border border-[#EEEEEE] rounded-lg animate-in fade-in slide-in-from-top-1">
                                            <label className="block text-xs font-bold text-[#111111] mb-1.5">Name this payment method</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newPresetName}
                                                    onChange={(e) => setNewPresetName(e.target.value)}
                                                    placeholder="e.g. Bank Transfer (HDFC)"
                                                    className="flex-1 px-3 py-1.5 bg-white border border-[#EEEEEE] rounded-md text-[0.8125rem] outline-none focus:border-[#ff3b3b]"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSavePreset();
                                                        if (e.key === 'Escape') setShowSavePresetDialog(false);
                                                    }}
                                                />
                                                <button
                                                    onClick={handleSavePreset}
                                                    disabled={!newPresetName.trim()}
                                                    className="px-3 py-1.5 bg-[#111111] text-white text-xs font-bold rounded-md hover:bg-black disabled:opacity-50"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => setShowSavePresetDialog(false)}
                                                    className="px-3 py-1.5 bg-white border border-[#EEEEEE] text-[#666666] text-xs font-bold rounded-md hover:bg-[#F7F7F7]"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="relative group">
                                        <textarea
                                            value={footer}
                                            onChange={(e) => setFooter(e.target.value)}
                                            placeholder="Bank details..."
                                            className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-sm text-[#666666] min-h-[100px] focus:ring-1 focus:ring-[#ff3b3b] outline-none resize-none hover:bg-[#F9FAFB] focus:bg-white"
                                        />
                                        {/* Delete Preset hint */}
                                        {paymentPresets.some(p => p.content === footer) && (
                                            <button
                                                onClick={() => handleDeletePreset(String(paymentPresets.find(p => p.content === footer)?.id || ''))}
                                                className="absolute bottom-2 right-2 p-1.5 bg-white border border-[#EEEEEE] rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:border-red-200 hover:bg-red-50 text-[#666666] hover:text-red-500"
                                                title="Delete this saved preset"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Totals Box */}
                            <div className="w-[320px]">
                                <div className="p-4 rounded-[12px] border border-[#EEEEEE] bg-[#F9FAFB]/50 space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[#666666]">Subtotal</span>
                                        <span className="font-medium text-[#111111]">{currencyCode === 'INR' ? '₹' : '$'}{totals.subtotal.toLocaleString()}</span>
                                    </div>

                                    {/* Discount Toggle */}
                                    <div className="flex justify-between items-center text-sm group/discount">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[#666666]">Discount</span>
                                            {!showDiscount && discount === 0 && (
                                                <button onClick={() => setShowDiscount(true)} className="text-[#ff3b3b] text-xs font-medium opacity-0 group-hover/discount:opacity-100 transition-opacity">
                                                    Add
                                                </button>
                                            )}
                                        </div>
                                        {(showDiscount || discount > 0) ? (
                                            <div className="flex items-center gap-2">
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#999999] text-xs">{currencyCode === 'INR' ? '₹' : '$'}</span>
                                                    <input
                                                        type="number"
                                                        value={discount}
                                                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                                        className="w-24 pl-5 pr-2 py-1 bg-white border border-[#EEEEEE] rounded text-right text-sm outline-none focus:border-[#ff3b3b]"
                                                    />
                                                </div>
                                                <button onClick={() => { setDiscount(0); setShowDiscount(false); }} className="text-[#999999] hover:text-[#ff3b3b]">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-[#111111] font-medium">-</span>
                                        )}
                                    </div>

                                    {/* Tax Config */}
                                    <div className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={taxConfig.id}
                                                onChange={(e) => {
                                                    const id = e.target.value;
                                                    if (id === 'gst_18') setTaxConfig({ id: 'gst_18', name: 'IGST', rate: 18 });
                                                    if (id === 'gst_local') setTaxConfig({ id: 'gst_local', name: 'CGST+SGST', rate: 18 });
                                                    if (id === 'none') setTaxConfig({ id: 'none', name: 'None', rate: 0 });
                                                }}
                                                className="bg-transparent text-[#666666] outline-none cursor-pointer hover:text-[#111111]"
                                            >
                                                <option value="gst_18">IGST (18%)</option>
                                                <option value="gst_local">CGST+SGST (18%)</option>
                                                <option value="none">Tax (0%)</option>
                                            </select>
                                        </div>
                                        <span className="font-medium text-[#111111]">{currencyCode === 'INR' ? '₹' : '$'}{totals.totalTax.toLocaleString()}</span>
                                    </div>

                                    <div className="flex justify-between items-center pt-3 border-t border-[#EEEEEE]">
                                        <span className="text-base font-bold text-[#111111]">Total Due</span>
                                        <span className="text-xl font-bold text-[#111111] tracking-tight">{currencyCode === 'INR' ? '₹' : '$'}{Math.floor(totals.total).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
