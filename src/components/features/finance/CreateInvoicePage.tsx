'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    Download,
    Send,
    Plus,
    X,
    Save,
    ChevronDown,
    Trash2,
    Settings
} from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { useCurrentUserCompany, usePartners } from '@/hooks/useUser';
import { useCreateInvoice } from '@/hooks/useInvoice';
import { useCollaborativeRequirements } from '@/hooks/useRequirement';
import { getNextInvoiceNumber, getTaxPreview, searchHsnSacCodes, getTdsSections } from '@/services/invoice';
import type { HsnSacCode, TdsSection } from '@/services/invoice';
import { AutoComplete, Select } from 'antd';
import { InvoicePreview } from './InvoicePreview';
import { useInvoicePresets, InvoicePaymentPreset } from '@/hooks/useInvoicePresets';
import { trimStr } from '@/utils/trim';
import { getPartnerId, getPartnerName } from '@/utils/partnerUtils';

interface LineItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number; // Percentage
    hsn_sac?: string;
    requirement_id?: number;
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
    const [footer, setFooter] = useState<string>('');

    const [invoiceType, setInvoiceType] = useState<'TAX' | 'PROFORMA'>('TAX');
    const [advanceDeducted, setAdvanceDeducted] = useState<number>(0);
    const [proformaRefId, setProformaRefId] = useState<string>('');

    // --- TDS State ---
    const [tdsSection, setTdsSection] = useState<string | undefined>(undefined);
    const [tdsRate, setTdsRate] = useState<number>(0);
    const [tdsSections, setTdsSections] = useState<TdsSection[]>([]);

    // --- HSN/SAC State ---
    const [hsnSacOptions, setHsnSacOptions] = useState<Record<string, { value: string; label: string }[]>>({});
    const hsnSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [isDownloading, setIsDownloading] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);

    // --- Auto-Save Draft ---
    const DRAFT_KEY = `invoice_draft_${clientId ?? 'new'}`;
    const hasRestoredRef = useRef(false);

    // --- Dynamic Data ---
    const { data: companyRes } = useCurrentUserCompany();
    const { data: partnersRes } = usePartners();
    const { mutateAsync: createInvoiceMutation, isPending: isSaving } = useCreateInvoice();

    // Type assertion unavoidable: API response type for company is loosely defined in the hooks
    const companyId = (companyRes?.result as { id?: number } | undefined)?.id;

    // Fetch all collaborative requirements to populate line items from reqIds
    const { data: collaborativeReqs } = useCollaborativeRequirements();

    const reqsForInvoice = useMemo(() => {
        if (reqIds.length === 0 || !collaborativeReqs) return [];
        return collaborativeReqs.filter(req => reqIds.includes(String(req.id)));
    }, [reqIds, collaborativeReqs]);

    const companyData = companyRes?.result;
    const partnerData = useMemo(() => {
        if (!partnersRes?.result || !clientId) return null;
        // clientId might be a name or ID from searchParams, let's find matching partner
        return partnersRes.result.find(p =>
            String(p.id) === clientId ||
            String(p.company_id) === clientId ||
            p.name === clientId ||
            (typeof p.company === 'object' ? p.company.name === clientId : p.company === clientId)
        );
    }, [partnersRes, clientId]);

    // --- Invoice Number (server-generated, prevents duplicates) ---
    const { data: nextNumberData } = useQuery({
        queryKey: ['next-invoice-number', companyId, invoiceType],
        queryFn: () => getNextInvoiceNumber(companyId!, invoiceType),
        enabled: !!companyId,
        staleTime: 0,
    });
    const invoiceId = nextNumberData?.result?.invoice_number ?? '';

    // --- Tax Preview (dynamic calculation from backend) ---
    const receiverCompanyId = partnerData?.company_id;
    const { data: taxPreviewData } = useQuery({
        queryKey: ['tax-preview', companyId, receiverCompanyId],
        queryFn: () => getTaxPreview(companyId!, receiverCompanyId!),
        enabled: !!companyId && !!receiverCompanyId,
    });

    const [currencyCode, setCurrencyCode] = useState('INR');

    const currencySymbol = useMemo(() => {
        try {
            return new Intl.NumberFormat('en', {
                style: 'currency',
                currency: currencyCode,
                maximumFractionDigits: 0,
            }).formatToParts(0).find(p => p.type === 'currency')?.value ?? currencyCode;
        } catch {
            return currencyCode;
        }
    }, [currencyCode]);

    // Sender details (From) — populated from company API via useEffect below
    const [senderName, setSenderName] = useState('');
    const [senderAddress, setSenderAddress] = useState('');
    const [senderEmail, setSenderEmail] = useState('');
    const [senderTaxId, setSenderTaxId] = useState('');

    // Client details (Bill To) — populated from partner API via useEffect below
    const [clientName, setClientName] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientTaxId, setClientTaxId] = useState('');

    // --- Auto-populate FROM (sender) from company settings ---
    useEffect(() => {
        if (companyData) {
            setSenderName(companyData.name || '');

            // Compose address from granular fields
            const addr1 = companyData.address_line_1 || '';
            const addr2 = companyData.address_line_2 || '';
            const city = companyData.city || '';
            const state = companyData.state || '';
            const zip = companyData.zipcode || '';
            const country = companyData.country || '';

            if (addr1) {
                let addressParts = [addr1, addr2].filter(Boolean).join('\n');
                const locationLine = [city, state, zip].filter(Boolean).join(', ');
                if (locationLine) addressParts += (addressParts ? '\n' : '') + locationLine;
                if (country) addressParts += (addressParts ? ', ' : '') + country;
                setSenderAddress(addressParts.trim());
            } else {
                setSenderAddress(companyData.address || '');
            }

            setSenderEmail(companyData.email || '');
            setSenderTaxId(companyData.tax_id || '');
            setCurrencyCode(companyData.currency || 'INR');
        }
    }, [companyData]);

    // --- Auto-populate BILL TO (client) from partner API ---
    useEffect(() => {
        if (partnerData) {
            // Resolve company name — partner_company takes precedence, then company, then name
            const companyName =
                partnerData.partner_company?.name ||
                (typeof partnerData.company === 'object' ? partnerData.company?.name : partnerData.company) ||
                partnerData.name ||
                '';
            setClientName(companyName);

            // Address — prefer structured fields, fall back to top-level address
            const addr1 = partnerData.address_line_1 || '';
            const addr2 = partnerData.address_line_2 || '';
            const city = partnerData.city || partnerData.user_profile?.city || '';
            const state = partnerData.state || partnerData.user_profile?.state || '';
            const zip = partnerData.zipcode || partnerData.user_profile?.zipcode || '';
            const country = (partnerData as any).country || partnerData.user_profile?.country || '';

            let addressParts = [addr1, addr2].filter(Boolean).join('\n');
            const locationLine = [city, state, zip].filter(Boolean).join(', ');
            if (locationLine) addressParts += (addressParts ? '\n' : '') + locationLine;
            if (country) addressParts += (addressParts ? ', ' : '') + country;

            setClientEmail(partnerData.email || '');
            // Phone: prefer direct fields, then user_profile nested fields
            setClientPhone(
                partnerData.phone ||
                partnerData.mobile_number ||
                partnerData.user_profile?.phone ||
                partnerData.user_profile?.mobile_number ||
                ''
            );
            // Tax ID from partner record (prefer company level)
            setClientTaxId(
                partnerData.tax_id ||
                (typeof partnerData.company === 'object' ? partnerData.company?.tax_id : '') ||
                ''
            );
            const companyAddress = (typeof partnerData.company === 'object' ? partnerData.company?.address : '') || '';
            setClientAddress(addressParts.trim() || companyAddress);
        } else if (clientId && isNaN(Number(clientId))) {
            // Only set clientName from URL param once partners data has loaded (result is defined)
            const partnersLoaded = !!partnersRes?.result;
            if (partnersLoaded) {
                setClientName(clientId);
            }
        }
    }, [partnerData, clientId, partnersRes]);

    // Update tax configuration when preview data is available
    useEffect(() => {
        if (taxPreviewData?.result) {
            const { taxLabel, totalRate } = taxPreviewData.result;
            if (taxLabel && totalRate > 0) {
                setTaxConfig({
                    id: 'smart_tax',
                    name: taxLabel,
                    rate: totalRate
                });
            } else {
                setTaxConfig({ id: 'none', name: 'None', rate: 0 });
            }
        }
    }, [taxPreviewData]);

    // --- Fetch TDS Sections ---
    useEffect(() => {
        getTdsSections().then(setTdsSections).catch(() => { /* ignore */ });
    }, []);

    // --- HSN/SAC Debounced Search ---
    const handleHsnSacSearch = useCallback((itemId: string, query: string) => {
        if (hsnSearchTimerRef.current) clearTimeout(hsnSearchTimerRef.current);
        if (!query || query.length < 2) {
            setHsnSacOptions(prev => ({ ...prev, [itemId]: [] }));
            return;
        }
        hsnSearchTimerRef.current = setTimeout(async () => {
            try {
                const results = await searchHsnSacCodes(query, undefined, 10);
                setHsnSacOptions(prev => ({
                    ...prev,
                    [itemId]: results.map((r: HsnSacCode) => ({
                        value: r.code,
                        label: `${r.code} — ${r.description}`,
                    })),
                }));
            } catch {
                setHsnSacOptions(prev => ({ ...prev, [itemId]: [] }));
            }
        }, 300);
    }, []);

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
    // Populate line items from requirements when reqIds are in the URL
    useEffect(() => {
        if (reqIds.length > 0 && reqsForInvoice.length > 0) {
            setItems(reqsForInvoice.map(req => ({
                id: crypto.randomUUID(),
                description: req.name ?? '',
                quantity: 1,
                unitPrice: Number(req.quoted_price ?? req.estimated_cost ?? 0),
                taxRate: taxConfig.rate,
                requirement_id: req.id,
            })));
        } else if (reqIds.length === 0) {
            setItems([{
                id: crypto.randomUUID(),
                description: '',
                quantity: 1,
                unitPrice: 0,
                taxRate: taxConfig.rate,
            }]);
        }
    }, [reqIds, reqsForInvoice]);

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

    // --- Auto-Save: Debounced 2s localStorage save ---
    const serializeDraft = useCallback(() => ({
        issueDate, dueDate, currencyCode, items, discount, showDiscount,
        taxConfig, memo, footer, senderName, senderAddress, senderEmail,
        senderTaxId, clientName, clientAddress, clientEmail, clientPhone, clientTaxId,
        savedAt: Date.now(),
        invoiceType, advanceDeducted, proformaRefId
    }), [issueDate, dueDate, currencyCode, items, discount, showDiscount, taxConfig, memo, footer, senderName, senderAddress, senderEmail, senderTaxId, clientName, clientAddress, clientEmail, clientPhone, clientTaxId, invoiceType, advanceDeducted, proformaRefId]);

    useEffect(() => {
        if (!hasRestoredRef.current) return; // Don't save during initial restore
        const timer = setTimeout(() => {
            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify(serializeDraft()));
            } catch { /* quota exceeded, ignore */ }
        }, 2000);
        return () => clearTimeout(timer);
    }, [serializeDraft]);

    // --- Auto-Save: Restore on mount ---
    useEffect(() => {
        if (hasRestoredRef.current) return;
        hasRestoredRef.current = true;
        try {
            const saved = localStorage.getItem(DRAFT_KEY);
            if (!saved) return;
            const draft = JSON.parse(saved);
            // Only offer restore if draft is less than 24h old
            if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) {
                localStorage.removeItem(DRAFT_KEY);
                return;
            }
            toast('Unsaved invoice draft found', {
                action: {
                    label: 'Restore',
                    onClick: () => {
                        if (draft.issueDate) setIssueDate(draft.issueDate);
                        if (draft.dueDate) setDueDate(draft.dueDate);
                        if (draft.currencyCode) setCurrencyCode(draft.currencyCode);
                        if (draft.items?.length) setItems(draft.items);
                        if (draft.discount != null) setDiscount(draft.discount);
                        if (draft.showDiscount != null) setShowDiscount(draft.showDiscount);
                        if (draft.taxConfig) setTaxConfig(draft.taxConfig);
                        if (draft.memo) setMemo(draft.memo);
                        if (draft.footer) setFooter(draft.footer);
                        if (draft.senderName) setSenderName(draft.senderName);
                        if (draft.senderAddress) setSenderAddress(draft.senderAddress);
                        if (draft.senderEmail) setSenderEmail(draft.senderEmail);
                        if (draft.senderTaxId) setSenderTaxId(draft.senderTaxId);
                        if (draft.clientName) setClientName(draft.clientName);
                        if (draft.clientAddress) setClientAddress(draft.clientAddress);
                        if (draft.clientEmail) setClientEmail(draft.clientEmail);
                        if (draft.clientPhone) setClientPhone(draft.clientPhone);
                        if (draft.clientTaxId) setClientTaxId(draft.clientTaxId);
                        if (draft.invoiceType) setInvoiceType(draft.invoiceType);
                        if (draft.advanceDeducted != null) setAdvanceDeducted(draft.advanceDeducted);
                        if (draft.proformaRefId) setProformaRefId(draft.proformaRefId);
                        toast.success('Draft restored');
                    },
                },
                duration: 8000,
            });
        } catch { /* corrupt data, ignore */ }
    }, []);

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
        // Type assertion unavoidable: nested company object structure in partnerData is not fully typed
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
                hsn_sac: item.hsn_sac,
                requirement_id: item.requirement_id,
            }));

            const invoiceDetails = items
                .filter((item): item is typeof item & { requirement_id: number } => item.requirement_id != null)
                .map(item => ({
                    requirement_id: item.requirement_id,
                    billed_amount: item.quantity * item.unitPrice,
                }));

            const payload = {
                bill_from: companyId,
                bill_to: clientCompanyId,
                issue_date: issueDate,
                due_date: dueDate,
                currency: currencyCode,
                invoice_type: invoiceType,
                advance_deducted: advanceDeducted,
                ...(proformaRefId ? { proforma_ref_id: Number(proformaRefId) } : {}),
                particulars,
                sub_total: totals.subtotal,
                discount: totals.discount,
                tax: totals.totalTax,
                tax_type: taxConfig.name,
                total: totals.total,
                memo,
                payment_details: footer,
                ...(tdsSection ? {
                    tds_section: tdsSection,
                    tds_rate: tdsRate,
                    tds_amount: (totals.subtotal * tdsRate) / 100,
                } : {}),
                ...(invoiceDetails.length > 0 && { metadata: { invoiceDetails } }),
            };
            const created = await createInvoiceMutation(payload);
            const newInvoiceId = created.result?.id;
            const newInvoiceNumber = created.result?.invoice_number ?? invoiceId;
            toast.success(`Invoice ${newInvoiceNumber} saved as draft.`, {
                action: newInvoiceId
                    ? { label: 'Send Now', onClick: () => router.push(`/dashboard/finance/invoices/${newInvoiceId}`) }
                    : undefined,
            });
            localStorage.removeItem(DRAFT_KEY); // Clear draft after successful save
            router.push('/dashboard/finance');
        } catch {
            toast.error('Failed to save invoice. Please try again.');
        }
    };

    const handleDownloadPDF = async () => {
        if (!previewRef.current) return;

        try {
            setIsDownloading(true);
            // Dynamically import html2canvas and jspdf to avoid SSR issues
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;

            const canvas = await html2canvas(previewRef.current, {
                scale: 2, // Higher scale for better quality
                useCORS: true,
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210; // A4 width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`${trimStr(invoiceId) || 'invoice'}.pdf`);
            toast.success("Invoice downloaded successfully!");
        } catch (error) {
            console.error("PDF Download Error:", error);
            toast.error("Failed to download invoice");
        } finally {
            setIsDownloading(false);
        }
    };

    const invoiceData = useMemo(() => ({
        invoiceId: trimStr(invoiceId),
        issueDate,
        dueDate,
        currencyCode: trimStr(currencyCode),
        senderName: trimStr(senderName),
        senderAddress: trimStr(senderAddress),
        senderEmail: trimStr(senderEmail),
        senderTaxId: trimStr(senderTaxId),
        clientName: trimStr(clientName),
        clientAddress: trimStr(clientAddress),
        clientEmail: trimStr(clientEmail),
        clientPhone: trimStr(clientPhone),
        clientTaxId: trimStr(clientTaxId),
        items: items.map((i) => ({ ...i, description: trimStr(i.description) })),
        totals,
        taxConfig,
        memo: trimStr(memo),
        footer: trimStr(footer),
        invoiceType,
        advanceDeducted,
        proformaRefId
    }), [invoiceId, issueDate, dueDate, currencyCode, senderName, senderAddress, senderEmail, senderTaxId, clientName, clientAddress, clientEmail, clientPhone, clientTaxId, items, totals, taxConfig, memo, footer, invoiceType, advanceDeducted, proformaRefId]);

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
                        className="px-4 py-2 text-[#666666] font-bold text-xs hover:text-[#111111] transition-colors"
                        onClick={() => router.back()}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className="px-4 py-2 border border-[#EEEEEE] bg-white text-[#111111] rounded-full font-bold text-xs hover:bg-[#F7F7F7] transition-colors flex items-center gap-2"
                    >
                        {isDownloading ? (
                            <span className="w-4 h-4 border-2 border-[#111111] border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        Download PDF
                    </button>
                    <button
                        onClick={handleSaveInvoice}
                        disabled={isSaving}
                        className="px-6 py-2 bg-[#ff3b3b] text-white rounded-full font-bold text-xs hover:bg-[#e63535] transition-colors flex items-center gap-2 disabled:opacity-60"
                    >
                        <Send className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save as Draft'}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex min-h-0">
                {/* LEFT PANEL: Editor */}
                <div className="w-1/2 overflow-y-auto p-8 border-r border-[#EEEEEE] bg-white">
                    <div className="max-w-none mx-auto space-y-10">

                        {/* Invoice Details */}
                        <section>
                            <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider mb-4">Invoice Details</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-[#666666]">Invoice Number</label>
                                    <input
                                        type="text"
                                        value={invoiceId}
                                        readOnly
                                        className="w-full px-3 py-2.5 bg-[#F9FAFB] border border-[#EEEEEE] rounded-[8px] text-sm text-[#666666] font-mono"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-[#666666]">Currency</label>
                                    <select
                                        value={currencyCode}
                                        onChange={(e) => setCurrencyCode(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-white border border-[#EEEEEE] rounded-[8px] text-sm text-[#111111] focus:ring-1 focus:ring-[#ff3b3b] outline-none appearance-none"
                                    >
                                        <option value="INR">INR - Indian Rupee</option>
                                        <option value="USD">USD - US Dollar</option>
                                        <option value="EUR">EUR - Euro</option>
                                        <option value="GBP">GBP - British Pound</option>
                                        <option value="AUD">AUD - Australian Dollar</option>
                                        <option value="CAD">CAD - Canadian Dollar</option>
                                        <option value="SGD">SGD - Singapore Dollar</option>
                                        <option value="AED">AED - UAE Dirham</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-[#666666]">Issue Date</label>
                                    <input
                                        type="date"
                                        value={issueDate}
                                        onChange={(e) => setIssueDate(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-white border border-[#EEEEEE] rounded-[8px] text-sm text-[#111111] focus:ring-1 focus:ring-[#ff3b3b] outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-[#666666]">Due Date</label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-white border border-[#EEEEEE] rounded-[8px] text-sm text-[#111111] focus:ring-1 focus:ring-[#ff3b3b] outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-[#666666]">Invoice Type</label>
                                    <select
                                        value={invoiceType}
                                        onChange={(e) => setInvoiceType(e.target.value as 'TAX' | 'PROFORMA')}
                                        className="w-full px-3 py-2.5 bg-white border border-[#EEEEEE] rounded-[8px] text-sm text-[#111111] focus:ring-1 focus:ring-[#ff3b3b] outline-none appearance-none"
                                    >
                                        <option value="TAX">TAX</option>
                                        <option value="PROFORMA">PROFORMA</option>
                                    </select>
                                </div>
                                {invoiceType === 'TAX' && (
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-medium text-[#666666]">Proforma Ref ID (Optional)</label>
                                        <input
                                            type="number"
                                            value={proformaRefId}
                                            onChange={(e) => setProformaRefId(e.target.value)}
                                            placeholder="e.g. 1"
                                            className="w-full px-3 py-2.5 bg-white border border-[#EEEEEE] rounded-[8px] text-sm text-[#111111] focus:ring-1 focus:ring-[#ff3b3b] outline-none"
                                        />
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Sender Section (From) */}
                        <section>
                            <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider mb-4">From (Your Details)</h3>
                            <div className="space-y-4 p-4 rounded-[12px] border border-[#EEEEEE] bg-[#F9FAFB]/50">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-[#666666]">Business Name</label>
                                    <input
                                        type="text"
                                        value={senderName}
                                        onChange={(e) => setSenderName(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-sm text-[#111111] focus:ring-1 focus:ring-[#ff3b3b] outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Customer Section (To) */}
                        <section>
                            <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider mb-4">Bill To</h3>
                            <div className="space-y-4 p-4 rounded-[12px] border border-[#EEEEEE] bg-white hover:border-[#ff3b3b]/30 transition-colors group relative">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-[#666666]">Client Name</label>
                                    <input
                                        type="text"
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-sm text-[#111111] focus:ring-1 focus:ring-[#ff3b3b] outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-[#666666]">Address</label>
                                    <textarea
                                        rows={2}
                                        value={clientAddress}
                                        onChange={(e) => setClientAddress(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-sm text-[#111111] focus:ring-1 focus:ring-[#ff3b3b] outline-none resize-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-[#666666]">GSTIN / Tax ID</label>
                                    <input
                                        type="text"
                                        value={clientTaxId}
                                        onChange={(e) => setClientTaxId(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-sm text-[#111111] focus:ring-1 focus:ring-[#ff3b3b] outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-medium text-[#666666]">Email</label>
                                        <input
                                            type="email"
                                            value={clientEmail}
                                            onChange={(e) => setClientEmail(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-sm text-[#111111] focus:ring-1 focus:ring-[#ff3b3b] outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-medium text-[#666666]">Phone</label>
                                        <input
                                            type="text"
                                            value={clientPhone}
                                            onChange={(e) => setClientPhone(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-sm text-[#111111] focus:ring-1 focus:ring-[#ff3b3b] outline-none"
                                        />
                                    </div>
                                </div>
                                <span className="text-[#ff3b3b] text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 cursor-pointer">Change Partner</span>
                            </div>
                        </section>



                        {/* Items Section */}
                        <section>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider">Items</h3>
                                <button className="text-[#666666] hover:text-[#111111]">
                                    <Settings className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Table Headers for Editor */}
                            <div className="flex gap-3 mb-2 px-1">
                                <span className="flex-1 text-xs font-bold text-[#999999] uppercase">Description</span>
                                <span className="w-36 text-xs font-bold text-[#999999] uppercase">HSN/SAC</span>
                                <span className="w-20 text-xs font-bold text-[#999999] uppercase text-right">Qty</span>
                                <span className="w-32 text-xs font-bold text-[#999999] uppercase text-right">Price</span>
                                <span className="w-28 text-xs font-bold text-[#999999] uppercase text-right">Total</span>
                                <span className="w-8"></span> {/* Spacer for delete icon */}
                            </div>

                            <div className="space-y-3 mb-4">
                                {items.map((item) => (
                                    <div key={item.id} className="group flex gap-3 items-start">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                placeholder="Item description"
                                                value={item.description}
                                                onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-sm text-[#111111] placeholder:text-[#999999] focus:ring-1 focus:ring-[#ff3b3b] outline-none transition-all"
                                            />
                                        </div>
                                        <div className="w-36">
                                            <AutoComplete
                                                value={item.hsn_sac ?? ''}
                                                options={hsnSacOptions[item.id] ?? []}
                                                onSearch={(val) => handleHsnSacSearch(item.id, val)}
                                                onSelect={(val) => handleUpdateItem(item.id, 'hsn_sac', val)}
                                                onChange={(val) => handleUpdateItem(item.id, 'hsn_sac', val)}
                                                placeholder="HSN/SAC"
                                                className="w-full [&_.ant-select-selector]:!rounded-[8px] [&_.ant-select-selector]:!border-[#EEEEEE] [&_.ant-select-selector]:!py-0.5 [&_.ant-select-selector]:!text-sm"
                                            />
                                        </div>
                                        <div className="w-20">
                                            <input
                                                type="number"
                                                placeholder="Qty"
                                                value={item.quantity}
                                                onChange={(e) => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value))}
                                                className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-sm text-[#111111] text-right focus:ring-1 focus:ring-[#ff3b3b] outline-none transition-all"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <input
                                                type="number"
                                                placeholder="Price"
                                                value={item.unitPrice}
                                                onChange={(e) => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value))}
                                                className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-sm text-[#111111] text-right focus:ring-1 focus:ring-[#ff3b3b] outline-none transition-all"
                                            />
                                        </div>
                                        <div className="w-28 pt-2.5 text-right text-sm font-bold text-[#111111]">
                                            {currencySymbol}{(item.quantity * item.unitPrice).toLocaleString()}
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
                                className="flex items-center gap-2 text-[#ff3b3b] text-xs font-bold hover:underline"
                            >
                                <Plus className="w-4 h-4" />
                                Add item
                            </button>
                        </section>

                        {/* Discounts & Tax */}
                        <section className="space-y-4 pt-6 border-t border-[#EEEEEE]">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-[#666666]">Subtotal</span>
                                <span className="font-bold text-[#111111]">{currencySymbol}{totals.subtotal.toLocaleString()}</span>
                            </div>

                            {/* Discount Toggle */}
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-[#666666]">Discount</span>
                                    {!showDiscount && (
                                        <button onClick={() => setShowDiscount(true)} className="text-[#ff3b3b] text-xs font-bold hover:underline flex items-center gap-1">
                                            <Plus className="w-3 h-3" /> Add
                                        </button>
                                    )}
                                </div>
                                {showDiscount ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={discount}
                                            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                            className="w-24 px-2 py-1 bg-white border border-[#EEEEEE] rounded-[6px] text-right text-xs"
                                            autoFocus
                                        />
                                        <button onClick={() => { setDiscount(0); setShowDiscount(false); }} className="text-[#999999] hover:text-[#ff3b3b]">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-[#999999]">-</span>
                                )}
                            </div>

                            {/* Advance Deducted Input */}
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-[#666666]">Advance Deducted</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={advanceDeducted}
                                        onChange={(e) => setAdvanceDeducted(parseFloat(e.target.value) || 0)}
                                        className="w-24 px-2 py-1 bg-white border border-[#EEEEEE] rounded-[6px] text-right text-xs"
                                    />
                                </div>
                            </div>

                            {/* Tax Config */}
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-[#666666]">Tax ({taxConfig.name} {taxConfig.rate}%)</span>
                                    <select
                                        value={taxConfig.id}
                                        onChange={(e) => {
                                            const id = e.target.value;
                                            if (id === 'smart_tax' && taxPreviewData?.result) {
                                                setTaxConfig({
                                                    id: 'smart_tax',
                                                    name: taxPreviewData.result.taxLabel,
                                                    rate: taxPreviewData.result.totalRate
                                                });
                                            } else if (id === 'gst_18') {
                                                setTaxConfig({ id: 'gst_18', name: 'IGST', rate: 18 });
                                            } else if (id === 'gst_local') {
                                                setTaxConfig({ id: 'gst_local', name: 'CGST+SGST', rate: 18 });
                                            } else if (id === 'none') {
                                                setTaxConfig({ id: 'none', name: 'None', rate: 0 });
                                            }
                                        }}
                                        className="bg-[#F7F7F7] border-none text-xs rounded-[4px] px-1 py-0.5 outline-none cursor-pointer hover:bg-[#EEEEEE]"
                                    >
                                        {taxPreviewData?.result && taxPreviewData.result.totalRate > 0 && (
                                            <option value="smart_tax">
                                                Auto: {taxPreviewData.result.taxLabel} ({taxPreviewData.result.totalRate}%)
                                            </option>
                                        )}
                                        <option value="gst_18">IGST (18%)</option>
                                        <option value="gst_local">CGST+SGST (18%)</option>
                                        <option value="none">None (0%)</option>
                                    </select>
                                </div>
                                <span className="font-bold text-[#111111]">{currencySymbol}{totals.totalTax.toLocaleString()}</span>
                            </div>

                            {/* TDS Section Selector */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-[#111111]">TDS Section <span className="font-normal text-[#666666]">— optional</span></label>
                                <Select
                                    allowClear
                                    placeholder="Select TDS section..."
                                    className="w-full"
                                    value={tdsSection}
                                    onChange={(val) => {
                                        setTdsSection(val);
                                        const section = tdsSections.find(s => s.section === val);
                                        setTdsRate(section?.rate ?? 0);
                                    }}
                                    options={tdsSections.map(s => ({
                                        value: s.section,
                                        label: `${s.section} — ${s.description} (${s.rate}%)`,
                                    }))}
                                />
                                {tdsSection && (
                                    <p className="text-xs text-[#666666] mt-1">
                                        TDS: {tdsRate}% = {currencySymbol} {((totals.subtotal * tdsRate) / 100).toFixed(2)}
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-between items-center text-base pt-4 border-t border-[#EEEEEE]">
                                <span className="font-bold text-[#111111]">Amount due</span>
                                <span className="font-bold text-[#111111]">{currencySymbol}{totals.total.toLocaleString()}</span>
                            </div>
                        </section>

                        {/* Payment Details / Footer */}
                        <section className="space-y-6 pt-6">
                            <div>
                                <label className="block text-sm font-bold text-[#111111] mb-2 flex items-center gap-2">
                                    Memo <span className="text-xs font-medium text-[#999999] bg-[#F7F7F7] px-2 py-0.5 rounded-full">Visible to customer</span>
                                </label>
                                <textarea
                                    value={memo}
                                    onChange={(e) => setMemo(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-sm text-[#111111] min-h-[80px] focus:ring-1 focus:ring-[#ff3b3b] outline-none resize-none"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-bold text-[#111111] flex items-center gap-2">
                                        Payment Details <span className="text-xs font-medium text-[#999999] bg-[#F7F7F7] px-2 py-0.5 rounded-full">Footer</span>
                                    </label>

                                    <div className="flex items-center gap-2">
                                        {/* Preset Selector */}
                                        {paymentPresets.length > 0 && (
                                            <div className="relative group">
                                                <select
                                                    className="appearance-none bg-[#F7F7F7] hover:bg-[#EEEEEE] text-xs font-medium text-[#111111] pl-3 pr-8 py-1.5 rounded-full outline-none cursor-pointer border border-transparent focus:border-[#ff3b3b] transition-all"
                                                    onChange={(e) => {
                                                        const preset = paymentPresets.find(p => p.id === e.target.value);
                                                        if (preset) setFooter(preset.content);
                                                    }}
                                                    value=""
                                                >
                                                    <option value="" disabled selected>Load saved details...</option>
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
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F7F7F7] hover:bg-[#EEEEEE] text-xs font-medium text-[#111111] rounded-full transition-colors"
                                            title="Save as new preset"
                                        >
                                            <Save className="w-3.5 h-3.5" />
                                            <span>Save</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Save Dialog Overlay (Inline for simplicity) */}
                                {showSavePresetDialog && (
                                    <div className="mb-3 p-3 bg-[#F9FAFB] border border-[#EEEEEE] rounded-lg animate-in fade-in slide-in-from-top-1">
                                        <label className="block text-xs font-bold text-[#111111] mb-1.5">Name this payment method</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newPresetName}
                                                onChange={(e) => setNewPresetName(e.target.value)}
                                                placeholder="e.g. Bank Transfer (HDFC)"
                                                className="flex-1 px-3 py-1.5 bg-white border border-[#EEEEEE] rounded-md text-xs outline-none focus:border-[#ff3b3b]"
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
                                        placeholder="Enter bank details, UPI ID, or payment terms..."
                                        className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-sm text-[#111111] min-h-[100px] focus:ring-1 focus:ring-[#ff3b3b] outline-none resize-none"
                                    />
                                    {/* Manage/Delete Preset helper (only visible if content matches a preset) */}
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
                        </section>
                    </div>
                </div>

                {/* RIGHT PANEL: Live Preview - A4 Size (210mm × 297mm) */}
                <div className="w-1/2 bg-[#E5E7EB] p-6 overflow-y-auto">
                    <div className="flex justify-center">
                        <InvoicePreview ref={previewRef} data={invoiceData} />
                    </div>
                </div>
            </div>
        </div>
    );
}
