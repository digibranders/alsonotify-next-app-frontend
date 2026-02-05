'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Download,
    Send,
    Plus,
    X,
    Save,
    ChevronDown,
    Settings,
    Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { MOCK_REQUIREMENTS } from '../../../data/mockFinanceData';
import { useCurrentUserCompany, usePartners } from '@/hooks/useUser';
import { InvoicePreview } from './InvoicePreview';
import { useInvoicePresets, InvoicePaymentPreset } from '@/hooks/useInvoicePresets';



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
    const [invoiceId, setInvoiceId] = useState('');
    const [uniqueId] = useState(() => String(Math.floor(Math.random() * 9000) + 1000)); // Persistent random 4-digit ID for this session

    const [items, setItems] = useState<LineItem[]>([]);
    const [discount, setDiscount] = useState<number>(0); // Flat amount
    const [showDiscount, setShowDiscount] = useState(false);
    const [taxConfig, setTaxConfig] = useState<TaxConfig>({ id: 'gst_18', name: 'IGST', rate: 18 });
    const [memo, setMemo] = useState('Payment is due within 7 days. Please include the invoice number on your wire transfer.');
    const [footer, setFooter] = useState<string>('Bank: Kotak Mahindra Bank\nA/C: 5345861934\nIFSC: KKBK0000632\nBranch: CBD Belapur, Mumbai');

    const [isDownloading, setIsDownloading] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);

    // --- Dynamic Data ---
    const { data: companyRes } = useCurrentUserCompany();
    const { data: partnersRes } = usePartners();

    const companyData = companyRes?.result;
    const partnerData = useMemo(() => {
        if (!partnersRes?.result || !clientId) return null;
        // clientId might be a name or ID from searchParams, let's find matching partner
        return partnersRes.result.find(p => String(p.id) === clientId || p.name === clientId || (typeof p.company === 'object' ? p.company.name === clientId : p.company === clientId));
    }, [partnersRes, clientId]);

    // --- Invoice Number Logic (CTO Design: INV-YYYYMM-XXXX) ---
    useEffect(() => {
        const datePart = dayjs(issueDate).format('YYYYMM');
        setInvoiceId(`INV-${datePart}-${uniqueId}`);
    }, [issueDate, uniqueId]);

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
            setClientPhone((partnerData as any).phone || '');
            setClientTaxId((partnerData as any).tax_id || '');
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
        if (reqIds.length > 0) {
            const selectedReqs = MOCK_REQUIREMENTS.filter(r => reqIds.includes(String(r.id)));

            const newItems: LineItem[] = selectedReqs.map(req => ({
                id: String(req.id),
                description: req.title, // e.g., "Website maintenance..."
                quantity: 1,
                unitPrice: req.estimatedCost,
                taxRate: 18 // Default tax
            }));

            setItems(newItems);
        } else {
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
                id: Math.random().toString(36).substr(2, 9),
                description: '',
                quantity: 1,
                unitPrice: 0,
                taxRate: taxConfig.rate
            }
        ]);
    };

    const handleUpdateItem = (id: string, field: keyof LineItem, value: any) => {
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleRemoveItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const handleSaveInvoice = () => {
        toast.success("Invoice created successfully!");
        router.push('/dashboard/finance');
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
            pdf.save(`${invoiceId}.pdf`);
            toast.success("Invoice downloaded successfully!");
        } catch (error) {
            console.error("PDF Download Error:", error);
            toast.error("Failed to download invoice");
        } finally {
            setIsDownloading(false);
        }
    };

    // Prepare data for shared preview component
    const invoiceData = {
        invoiceId,
        issueDate,
        dueDate,
        currencyCode,
        senderName,
        senderAddress,
        senderEmail,
        senderTaxId,
        clientName,
        clientAddress,
        clientEmail,
        clientPhone,
        clientTaxId,
        items,
        totals,
        taxConfig,
        memo,
        footer
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
                    <span className="text-[16px] font-['Manrope:SemiBold',sans-serif] text-[#111111]">
                        New Invoice
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        className="px-4 py-2 text-[#666666] font-bold text-[13px] hover:text-[#111111] transition-colors"
                        onClick={() => router.back()}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className="px-4 py-2 border border-[#EEEEEE] bg-white text-[#111111] rounded-full font-bold text-[13px] hover:bg-[#F7F7F7] transition-colors flex items-center gap-2"
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
                        className="px-6 py-2 bg-[#ff3b3b] text-white rounded-full font-bold text-[13px] hover:bg-[#e63535] transition-colors flex items-center gap-2"
                    >
                        <Send className="w-4 h-4" />
                        Send Invoice
                    </button>
                </div>
            </div>

            <div className="flex-1 flex min-h-0">
                {/* LEFT PANEL: Editor */}
                <div className="w-1/2 overflow-y-auto p-8 border-r border-[#EEEEEE] bg-white">
                    <div className="max-w-none mx-auto space-y-10">

                        {/* Invoice Details */}
                        <section>
                            <h3 className="text-[14px] font-['Manrope:Bold',sans-serif] text-[#111111] uppercase tracking-wider mb-4">Invoice Details</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="block text-[12px] font-medium text-[#666666]">Invoice Number</label>
                                    <input
                                        type="text"
                                        value={invoiceId}
                                        readOnly
                                        className="w-full px-3 py-2.5 bg-[#F9FAFB] border border-[#EEEEEE] rounded-[8px] text-[14px] text-[#666666] font-mono"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[12px] font-medium text-[#666666]">Currency</label>
                                    <select
                                        value={currencyCode}
                                        onChange={(e) => setCurrencyCode(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-white border border-[#EEEEEE] rounded-[8px] text-[14px] text-[#111111] focus:ring-1 focus:ring-[#ff3b3b] outline-none appearance-none"
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
                                    <label className="block text-[12px] font-medium text-[#666666]">Issue Date</label>
                                    <input
                                        type="date"
                                        value={issueDate}
                                        onChange={(e) => setIssueDate(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-white border border-[#EEEEEE] rounded-[8px] text-[14px] text-[#111111] focus:ring-1 focus:ring-[#ff3b3b] outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[12px] font-medium text-[#666666]">Due Date</label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-white border border-[#EEEEEE] rounded-[8px] text-[14px] text-[#111111] focus:ring-1 focus:ring-[#ff3b3b] outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Sender Section (From) */}
                        <section>
                            <h3 className="text-[14px] font-['Manrope:Bold',sans-serif] text-[#111111] uppercase tracking-wider mb-4">From (Your Details)</h3>
                            <div className="space-y-4 p-4 rounded-[12px] border border-[#EEEEEE] bg-[#F9FAFB]/50">
                                <div className="space-y-1.5">
                                    <label className="block text-[12px] font-medium text-[#666666]">Business Name</label>
                                    <input
                                        type="text"
                                        value={senderName}
                                        onChange={(e) => setSenderName(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-[14px] text-[#111111] focus:ring-1 focus:ring-[#ff3b3b] outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Customer Section (To) */}
                        <section>
                            <h3 className="text-[14px] font-['Manrope:Bold',sans-serif] text-[#111111] uppercase tracking-wider mb-4">Bill To</h3>
                            <div className="space-y-4 p-4 rounded-[12px] border border-[#EEEEEE] bg-white hover:border-[#ff3b3b]/30 transition-colors group relative">
                                <div className="space-y-1.5">
                                    <label className="block text-[12px] font-medium text-[#666666]">Client Name</label>
                                    <input
                                        type="text"
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-[14px] text-[#111111] focus:ring-1 focus:ring-[#ff3b3b] outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[12px] font-medium text-[#666666]">Address</label>
                                    <textarea
                                        rows={2}
                                        value={clientAddress}
                                        onChange={(e) => setClientAddress(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-[14px] text-[#111111] focus:ring-1 focus:ring-[#ff3b3b] outline-none resize-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[12px] font-medium text-[#666666]">GSTIN / Tax ID</label>
                                    <input
                                        type="text"
                                        value={clientTaxId}
                                        onChange={(e) => setClientTaxId(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-[14px] text-[#111111] focus:ring-1 focus:ring-[#ff3b3b] outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[12px] font-medium text-[#666666]">Email</label>
                                        <input
                                            type="email"
                                            value={clientEmail}
                                            onChange={(e) => setClientEmail(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-[14px] text-[#111111] focus:ring-1 focus:ring-[#ff3b3b] outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[12px] font-medium text-[#666666]">Phone</label>
                                        <input
                                            type="text"
                                            value={clientPhone}
                                            onChange={(e) => setClientPhone(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-[14px] text-[#111111] focus:ring-1 focus:ring-[#ff3b3b] outline-none"
                                        />
                                    </div>
                                </div>
                                <span className="text-[#ff3b3b] text-[12px] font-bold opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 cursor-pointer">Change Partner</span>
                            </div>
                        </section>



                        {/* Items Section */}
                        <section>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-[14px] font-['Manrope:Bold',sans-serif] text-[#111111] uppercase tracking-wider">Items</h3>
                                <button className="text-[#666666] hover:text-[#111111]">
                                    <Settings className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Table Headers for Editor */}
                            <div className="flex gap-3 mb-2 px-1">
                                <span className="flex-1 text-[11px] font-bold text-[#999999] uppercase">Description</span>
                                <span className="w-20 text-[11px] font-bold text-[#999999] uppercase text-right">Qty</span>
                                <span className="w-32 text-[11px] font-bold text-[#999999] uppercase text-right">Price</span>
                                <span className="w-28 text-[11px] font-bold text-[#999999] uppercase text-right">Total</span>
                                <span className="w-8"></span> {/* Spacer for delete icon */}
                            </div>

                            <div className="space-y-3 mb-4">
                                {items.map((item, index) => (
                                    <div key={item.id} className="group flex gap-3 items-start">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                placeholder="Item description"
                                                value={item.description}
                                                onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-[14px] text-[#111111] placeholder:text-[#999999] focus:ring-1 focus:ring-[#ff3b3b] outline-none transition-all"
                                            />
                                        </div>
                                        <div className="w-20">
                                            <input
                                                type="number"
                                                placeholder="Qty"
                                                value={item.quantity}
                                                onChange={(e) => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value))}
                                                className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-[14px] text-[#111111] text-right focus:ring-1 focus:ring-[#ff3b3b] outline-none transition-all"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <input
                                                type="number"
                                                placeholder="Price"
                                                value={item.unitPrice}
                                                onChange={(e) => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value))}
                                                className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-[14px] text-[#111111] text-right focus:ring-1 focus:ring-[#ff3b3b] outline-none transition-all"
                                            />
                                        </div>
                                        <div className="w-28 pt-2.5 text-right text-[14px] font-bold text-[#111111]">
                                            ₹{(item.quantity * item.unitPrice).toLocaleString()}
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
                                className="flex items-center gap-2 text-[#ff3b3b] text-[13px] font-bold hover:underline"
                            >
                                <Plus className="w-4 h-4" />
                                Add item
                            </button>
                        </section>

                        {/* Discounts & Tax */}
                        <section className="space-y-4 pt-6 border-t border-[#EEEEEE]">
                            <div className="flex justify-between items-center text-[14px]">
                                <span className="text-[#666666]">Subtotal</span>
                                <span className="font-bold text-[#111111]">₹{totals.subtotal.toLocaleString()}</span>
                            </div>

                            {/* Discount Toggle */}
                            <div className="flex justify-between items-center text-[14px]">
                                <div className="flex items-center gap-2">
                                    <span className="text-[#666666]">Discount</span>
                                    {!showDiscount && (
                                        <button onClick={() => setShowDiscount(true)} className="text-[#ff3b3b] text-[12px] font-bold hover:underline flex items-center gap-1">
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
                                            className="w-24 px-2 py-1 bg-white border border-[#EEEEEE] rounded-[6px] text-right text-[13px]"
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

                            {/* Tax Config */}
                            <div className="flex justify-between items-center text-[14px]">
                                <div className="flex items-center gap-2">
                                    <span className="text-[#666666]">Tax ({taxConfig.name} {taxConfig.rate}%)</span>
                                    <select
                                        value={taxConfig.id}
                                        onChange={(e) => {
                                            const id = e.target.value;
                                            if (id === 'gst_18') setTaxConfig({ id: 'gst_18', name: 'IGST', rate: 18 });
                                            if (id === 'gst_local') setTaxConfig({ id: 'gst_local', name: 'CGST+SGST', rate: 18 });
                                            if (id === 'none') setTaxConfig({ id: 'none', name: 'None', rate: 0 });
                                        }}
                                        className="bg-[#F7F7F7] border-none text-[12px] rounded-[4px] px-1 py-0.5 outline-none cursor-pointer hover:bg-[#EEEEEE]"
                                    >
                                        <option value="gst_18">IGST (18%)</option>
                                        <option value="gst_local">CGST+SGST (18%)</option>
                                        <option value="none">None (0%)</option>
                                    </select>
                                </div>
                                <span className="font-bold text-[#111111]">₹{totals.totalTax.toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between items-center text-[16px] pt-4 border-t border-[#EEEEEE]">
                                <span className="font-bold text-[#111111]">Amount due</span>
                                <span className="font-bold text-[#111111]">₹{totals.total.toLocaleString()}</span>
                            </div>
                        </section>

                        {/* Payment Details / Footer */}
                        <section className="space-y-6 pt-6">
                            <div>
                                <label className="block text-[14px] font-bold text-[#111111] mb-2 flex items-center gap-2">
                                    Memo <span className="text-[11px] font-normal text-[#999999] bg-[#F7F7F7] px-2 py-0.5 rounded-full">Visible to customer</span>
                                </label>
                                <textarea
                                    value={memo}
                                    onChange={(e) => setMemo(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-[14px] text-[#111111] min-h-[80px] focus:ring-1 focus:ring-[#ff3b3b] outline-none resize-none"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-[14px] font-bold text-[#111111] flex items-center gap-2">
                                        Payment Details <span className="text-[11px] font-normal text-[#999999] bg-[#F7F7F7] px-2 py-0.5 rounded-full">Footer</span>
                                    </label>

                                    <div className="flex items-center gap-2">
                                        {/* Preset Selector */}
                                        {paymentPresets.length > 0 && (
                                            <div className="relative group">
                                                <select
                                                    className="appearance-none bg-[#F7F7F7] hover:bg-[#EEEEEE] text-[12px] font-medium text-[#111111] pl-3 pr-8 py-1.5 rounded-full outline-none cursor-pointer border border-transparent focus:border-[#ff3b3b] transition-all"
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
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F7F7F7] hover:bg-[#EEEEEE] text-[12px] font-medium text-[#111111] rounded-full transition-colors"
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
                                        <label className="block text-[12px] font-bold text-[#111111] mb-1.5">Name this payment method</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newPresetName}
                                                onChange={(e) => setNewPresetName(e.target.value)}
                                                placeholder="e.g. Bank Transfer (HDFC)"
                                                className="flex-1 px-3 py-1.5 bg-white border border-[#EEEEEE] rounded-md text-[13px] outline-none focus:border-[#ff3b3b]"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSavePreset();
                                                    if (e.key === 'Escape') setShowSavePresetDialog(false);
                                                }}
                                            />
                                            <button
                                                onClick={handleSavePreset}
                                                disabled={!newPresetName.trim()}
                                                className="px-3 py-1.5 bg-[#111111] text-white text-[12px] font-bold rounded-md hover:bg-black disabled:opacity-50"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => setShowSavePresetDialog(false)}
                                                className="px-3 py-1.5 bg-white border border-[#EEEEEE] text-[#666666] text-[12px] font-bold rounded-md hover:bg-[#F7F7F7]"
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
                                        className="w-full px-3 py-2 bg-white border border-[#EEEEEE] rounded-[8px] text-[14px] text-[#111111] min-h-[100px] focus:ring-1 focus:ring-[#ff3b3b] outline-none resize-none"
                                    />
                                    {/* Manage/Delete Preset helper (only visible if content matches a preset) */}
                                    {paymentPresets.some(p => p.content === footer) && (
                                        <button
                                            onClick={() => handleDeletePreset(paymentPresets.find(p => p.content === footer)?.id || '')}
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
