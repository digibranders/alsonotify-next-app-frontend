'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Send, CreditCard, X } from 'lucide-react';
import { toast } from 'sonner';
import { useInvoice, useRecordPayment, useUpdateInvoiceStatus, useReviseInvoice } from '@/hooks/useInvoice';
import { getInvoicePdfBlob, convertProformaToTaxInvoice } from '@/services/invoice';
import { InvoicePreview, InvoicePreviewData } from './InvoicePreview';
import { SendInvoiceModal } from './SendInvoiceModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { Skeleton } from '@/components/ui/Skeleton';

export function InvoiceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data: invoice, isLoading } = useInvoice(id);
    const { mutateAsync: recordPaymentMutation, isPending: isRecordingPayment } = useRecordPayment();
    const { mutateAsync: updateStatus, isPending: isUpdatingStatus } = useUpdateInvoiceStatus();
    const { mutateAsync: reviseInvoiceMutation, isPending: isRevising } = useReviseInvoice();

    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isConverting, setIsConverting] = useState(false);

    const previewData: InvoicePreviewData | null = invoice
        ? {
            invoiceId: invoice.invoice_number,
            issueDate: invoice.issue_date,
            dueDate: invoice.due_date,
            currencyCode: invoice.currency,
            senderName: invoice.bill_from_company?.name ?? String(invoice.bill_from ?? ''),
            senderAddress: [
                invoice.bill_from_company?.address_line_1,
                invoice.bill_from_company?.address_line_2,
                invoice.bill_from_company?.city,
                invoice.bill_from_company?.state,
                invoice.bill_from_company?.zipcode,
                invoice.bill_from_company?.country,
            ].filter(Boolean).join(', ') || '',
            senderEmail: invoice.bill_from_company?.email ?? '',
            senderTaxId: invoice.bill_from_company?.tax_id ?? '',
            clientName: invoice.bill_to_company?.name ?? String(invoice.bill_to ?? ''),
            clientAddress: [
                invoice.bill_to_company?.address_line_1,
                invoice.bill_to_company?.address_line_2,
                invoice.bill_to_company?.city,
                invoice.bill_to_company?.state,
                invoice.bill_to_company?.zipcode,
                invoice.bill_to_company?.country,
            ].filter(Boolean).join(', ') || '',
            clientEmail: invoice.bill_to_company?.email ?? '',
            clientPhone: '',
            clientTaxId: invoice.bill_to_company?.tax_id ?? '',
            items: (invoice.particulars ?? []).map((p) => ({
                id: p.id || String(p.requirement_id ?? crypto.randomUUID()),
                description: p.description,
                quantity: p.quantity,
                unitPrice: p.unit_price,
            })),
            totals: {
                subtotal: invoice.sub_total,
                discount: invoice.discount,
                totalTax: invoice.tax,
                total: invoice.total,
            },
            taxConfig: {
                id: 'tax',
                name: invoice.tax_type ?? 'Tax',
                rate:
                    invoice.sub_total > 0
                        ? (invoice.tax / Math.max(invoice.sub_total - invoice.discount, 1)) * 100
                        : 0,
            },
            memo: invoice.memo ?? '',
            footer: invoice.payment_details ?? '',
        }
        : null;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
                return 'bg-[#E8F5E9] text-[#4CAF50]';
            case 'sent':
                return 'bg-[#E3F2FD] text-[#2196F3]';
            case 'overdue':
                return 'bg-[#FFEBEE] text-[#ff3b3b]';
            case 'partial':
                return 'bg-[#FFF3E0] text-[#FF9800]';
            case 'pending_approval':
                return 'bg-[#FFF3E0] text-[#FF9800]';
            case 'void':
                return 'bg-[#EEEEEE] text-[#111111]';
            default:
                return 'bg-[#F7F7F7] text-[#999999]'; // draft
        }
    };

    const handleDownloadPDF = async () => {
        try {
            setIsDownloading(true);
            const toastId = toast.loading('Preparing PDF...');
            const blob = await getInvoicePdfBlob(id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${invoice?.invoice_number ?? 'invoice'}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success('PDF downloaded', { id: toastId });
        } catch {
            toast.error('Failed to download PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleVoid = async () => {
        if (!invoice) return;
        try {
            await updateStatus({ id: invoice.id, status: 'void' });
            toast.success('Invoice voided');
        } catch {
            toast.error('Failed to void invoice');
        }
    };

    if (isLoading) {
        return (
            <div className="h-full bg-[#F9FAFB] flex flex-col rounded-[24px] overflow-hidden">
                <div className="bg-white border-b border-[#EEEEEE] px-4 py-2 flex items-center justify-between shrink-0">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-9 w-32 rounded-full" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-sm text-[#697386]">Loading invoice...</div>
                </div>
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="h-full flex items-center justify-center">
                <p className="text-[#697386]">Invoice not found.</p>
            </div>
        );
    }

    const status = invoice.status ?? 'draft';
    const canSend = status === 'draft' || status === 'pending_approval';
    const canRecordPayment = status === 'sent' || status === 'overdue' || status === 'partial';
    const canRevise = status === 'sent' || status === 'overdue';
    const canVoid = status !== 'paid' && status !== 'void';

    // Check if it's a Proforma and if it hasn't been converted yet
    const isProforma = invoice.invoice_number?.startsWith('PROF-');

    const currencySymbol = (() => {
        try {
            return new Intl.NumberFormat('en', {
                style: 'currency',
                currency: invoice.currency || 'INR',
                maximumFractionDigits: 0,
            }).formatToParts(0).find(p => p.type === 'currency')?.value ?? (invoice.currency || 'INR');
        } catch {
            return invoice.currency || 'INR';
        }
    })();

    const handleConvertToTax = async () => {
        try {
            setIsConverting(true);
            const res = await convertProformaToTaxInvoice(invoice.id);
            if (res.success && res.result) {
                toast.success('Successfully converted to Tax Invoice!');
                // Navigate to the newly created Tax Invoice
                router.push(`/dashboard/finance/invoices/${res.result.id}`);
            }
        } catch (error: unknown) {
            // Type assertion unavoidable: Narrowing unknown axios error object
            toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to convert to Tax Invoice');
        } finally {
            setIsConverting(false);
        }
    };

    const handleRevise = async () => {
        try {
            await reviseInvoiceMutation({ id: invoice.id });
            toast.success('Invoice revision created successfully');
            router.push('/dashboard/finance'); // or to draft tab
        } catch {
            toast.error('Failed to create invoice revision');
        }
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
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <span className="text-base font-semibold text-[#111111]">
                            {invoice.invoice_number}
                        </span>
                        <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(status)}`}
                        >
                            {status.replace('_', ' ')}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {canSend && (
                        <button
                            onClick={() => setIsSendModalOpen(true)}
                            className="px-4 py-2 flex items-center gap-2 bg-[#2196F3] text-white rounded-full font-bold text-[0.8125rem] hover:bg-[#1976D2] transition-colors"
                        >
                            <Send className="w-4 h-4" />
                            Send
                        </button>
                    )}
                    {isProforma && status !== 'void' && (
                        <button
                            onClick={handleConvertToTax}
                            disabled={isConverting}
                            className="px-4 py-2 flex items-center gap-2 bg-[#f59e0b] text-white rounded-full font-bold text-[0.8125rem] hover:bg-[#d97706] transition-colors disabled:opacity-50"
                        >
                            {isConverting ? 'Converting...' : 'Convert to Tax Invoice'}
                        </button>
                    )}
                    {canRecordPayment && (
                        <button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="px-4 py-2 flex items-center gap-2 bg-[#0F9D58] text-white rounded-full font-bold text-[0.8125rem] hover:bg-[#0a7d46] transition-colors"
                        >
                            <CreditCard className="w-4 h-4" />
                            Record Payment
                        </button>
                    )}
                    {canRevise && (
                        <button
                            onClick={handleRevise}
                            disabled={isRevising}
                            className="px-4 py-2 flex items-center gap-2 border border-[#EEEEEE] bg-white text-[#111111] rounded-full font-bold text-[0.8125rem] hover:bg-[#F7F7F7] transition-colors disabled:opacity-50"
                        >
                            <ArrowLeft className="w-4 h-4 transform rotate-180" /> {/* A makeshift rotate-ccw icon, though ArrowLeft rotated works, or could use another standard one if RotateCcw imported */}
                            {isRevising ? 'Revising...' : 'Revise'}
                        </button>
                    )}
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className="px-4 py-2 flex items-center gap-2 border border-[#EEEEEE] bg-white text-[#111111] rounded-full font-bold text-[0.8125rem] hover:bg-[#F7F7F7] transition-colors disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        {isDownloading ? 'Downloading...' : 'Download PDF'}
                    </button>
                    {canVoid && (
                        <button
                            onClick={handleVoid}
                            disabled={isUpdatingStatus}
                            className="px-4 py-2 flex items-center gap-2 text-[#666666] hover:text-[#ff3b3b] rounded-full font-bold text-[0.8125rem] hover:bg-[#FFF0F0] transition-colors disabled:opacity-50"
                            title="Void Invoice"
                        >
                            <X className="w-4 h-4" />
                            Void
                        </button>
                    )}
                </div>
            </div>

            {/* Invoice Preview */}
            <div className="flex-1 overflow-y-auto p-8 flex justify-center">
                {previewData && <InvoicePreview data={previewData} />}
            </div>

            {/* Modals */}
            <SendInvoiceModal
                invoiceId={invoice.id}
                invoiceNumber={invoice.invoice_number}
                isOpen={isSendModalOpen}
                onClose={() => setIsSendModalOpen(false)}
                onSent={() => setIsSendModalOpen(false)}
            />
            <RecordPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                invoiceId={invoice.id}
                invoiceNumber={invoice.invoice_number}
                totalAmount={invoice.total}
                amountReceived={invoice.amount_received ?? 0}
                currencySymbol={currencySymbol}
                isSaving={isRecordingPayment}
                onSave={async (data) => {
                    try {
                        await recordPaymentMutation({ id: invoice.id, data });
                        toast.success('Payment recorded');
                        setIsPaymentModalOpen(false);
                    } catch {
                        toast.error('Failed to record payment');
                    }
                }}
            />
        </div>
    );
}
