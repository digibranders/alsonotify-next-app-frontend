'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Send, CreditCard, X } from 'lucide-react';
import { toast } from 'sonner';
import { useInvoice, useRecordPayment, useUpdateInvoiceStatus } from '@/hooks/useInvoice';
import { getInvoicePdfBlob } from '@/services/invoice';
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

    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const previewData: InvoicePreviewData | null = invoice
        ? {
              invoiceId: invoice.invoice_number,
              issueDate: invoice.issue_date,
              dueDate: invoice.due_date,
              currencyCode: invoice.currency,
              senderName: String(invoice.bill_from ?? ''),
              senderAddress: '',
              senderEmail: '',
              senderTaxId: '',
              clientName: invoice.bill_to_company?.name ?? String(invoice.bill_to ?? ''),
              clientAddress: '',
              clientEmail: '',
              clientPhone: '',
              clientTaxId: '',
              items: (invoice.particulars ?? []).map((p) => ({
                  id: p.id || String(p.requirement_id ?? Math.random()),
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
    const canVoid = status !== 'paid' && status !== 'void';

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
                    {canRecordPayment && (
                        <button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="px-4 py-2 flex items-center gap-2 bg-[#0F9D58] text-white rounded-full font-bold text-[0.8125rem] hover:bg-[#0a7d46] transition-colors"
                        >
                            <CreditCard className="w-4 h-4" />
                            Record Payment
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
