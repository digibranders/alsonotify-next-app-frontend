import React, { useMemo, useState } from 'react';
import { Requirement } from '@/types/domain';
import { useInvoices } from '@/hooks/useInvoice';
import { FileText, Download, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getInvoicePdfBlob } from '@/services/invoice';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { AdvanceBillingStatusWidget } from '@/components/features/finance/AdvanceBillingStatusWidget';
import { Skeleton } from '@/components/ui/Skeleton';

interface BillingTabProps {
    requirement: Requirement;
}

const STATUS_DISPLAY: Record<string, string> = {
    paid: 'Paid',
    sent: 'Sent',
    open: 'Open',
    overdue: 'Overdue',
    past_due: 'Past Due',
    partial: 'Partial',
    void: 'Void',
    draft: 'Draft',
};

export const BillingTab: React.FC<BillingTabProps> = ({ requirement }) => {
    const router = useRouter();
    const { data: dbInvoicesData, isLoading } = useInvoices({ requirement_id: requirement.id });
    const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>({});

    const invoices = useMemo(() => {
        return (dbInvoicesData?.invoices || []).map(inv => ({
            id: String(inv.id),
            invoiceNumber: inv.invoice_number,
            date: inv.issue_date || inv.due_date || '',
            dueDate: inv.due_date || '',
            amount: inv.total || 0,
            status: (inv.status?.toLowerCase() || 'draft') as string,
            type: (inv.invoice_type?.toUpperCase() || 'TAX') as string,
        }));
    }, [dbInvoicesData]);

    const estimatedCost = requirement.estimated_cost || requirement.quoted_price || 0;
    const totalBilled = requirement.total_billed ?? invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const remainingBalance = Math.max(0, estimatedCost - totalBilled);
    const billingPercent = estimatedCost > 0 ? Math.round(Math.min((totalBilled / estimatedCost) * 100, 100)) : 0;

    const handleDownloadPDF = async (id: string, invoiceNumber: string) => {
        try {
            setIsDownloading(prev => ({ ...prev, [id]: true }));
            const toastId = toast.loading("Downloading PDF...");

            const blob = await getInvoicePdfBlob(Number(id));
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${invoiceNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            toast.success("Downloaded successfully", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Failed to download PDF");
        } finally {
            setIsDownloading(prev => ({ ...prev, [id]: false }));
        }
    };

    const quotedPrice = Number(requirement.quoted_price ?? requirement.estimated_cost ?? 0);
    const currency = requirement.currency ?? 'INR';
    const currencySymbol = (() => {
        try {
            return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 })
                .formatToParts(0).find(p => p.type === 'currency')?.value ?? currency;
        } catch { return currency; }
    })();

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-[16px] p-6 sm:p-8 border border-[#EEEEEE] shadow-sm">
                {/* Section heading */}
                <div className="flex items-center gap-2 mb-6">
                    <FileText className="w-5 h-5 text-[#ff3b3b]" />
                    <h3 className="text-base font-bold text-[#111111]">Billing Overview</h3>
                </div>

                {/* Summary KPI cards — responsive grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
                    <div className="p-4 rounded-xl border border-[#EEEEEE] bg-[#F9FAFB]">
                        <p className="text-xs font-medium text-[#999999] uppercase tracking-wider mb-1">Total Quoted / Estimated</p>
                        <p className="text-2xl font-bold text-[#111111] tabular-nums">{currencySymbol}{estimatedCost.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[#EEEEEE] bg-[#F9FAFB]">
                        <p className="text-xs font-medium text-[#999999] uppercase tracking-wider mb-1">Total Billed</p>
                        <p className="text-2xl font-bold text-[#111111] tabular-nums">{currencySymbol}{totalBilled.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[#EEEEEE] bg-blue-50/50">
                        <p className="text-xs font-medium text-[#999999] uppercase tracking-wider mb-1">Remaining Balance</p>
                        <p className="text-2xl font-bold text-blue-700 tabular-nums">{currencySymbol}{remainingBalance.toLocaleString()}</p>
                    </div>
                </div>

                {/* Billing Progress Bar — accessible */}
                {estimatedCost > 0 && (
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs text-[#999999]">Billing Progress</span>
                            <span className="text-xs font-semibold text-[#111111] tabular-nums">
                                {billingPercent}%
                            </span>
                        </div>
                        <div
                            className="w-full h-2 bg-[#EEEEEE] rounded-full overflow-hidden"
                            role="progressbar"
                            aria-valuenow={billingPercent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Billing progress: ${billingPercent}% of estimated cost billed`}
                        >
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    totalBilled >= estimatedCost
                                        ? 'bg-[#0F9D58]'
                                        : totalBilled > 0
                                            ? 'bg-[#2F80ED]'
                                            : 'bg-[#EEEEEE]'
                                }`}
                                style={{ width: `${Math.min((totalBilled / estimatedCost) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Advance Billing Status Widget — below progress for logical flow */}
                <div className="mb-8">
                    <AdvanceBillingStatusWidget
                        requirementId={requirement.id}
                        quotedPrice={quotedPrice}
                        currency={currency}
                        requirementStatus={String(requirement.status ?? '')}
                    />
                </div>

                {/* Invoice History */}
                <div>
                    <h4 className="text-sm font-bold text-[#111111] mb-4">Invoice History</h4>

                    {isLoading ? (
                        <div className="border border-[#EEEEEE] rounded-xl overflow-hidden">
                            <div className="bg-[#F9FAFB] border-b border-[#EEEEEE] px-4 py-3">
                                <Skeleton className="h-3 w-full max-w-md" />
                            </div>
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-[#EEEEEE] last:border-b-0">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="h-3 w-16 ml-auto" />
                                    <Skeleton className="h-5 w-14 rounded-full" />
                                    <Skeleton className="h-8 w-8 rounded-md" />
                                </div>
                            ))}
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="text-center py-12 rounded-xl border border-dashed border-[#DDDDDD] bg-[#FAFAFA]">
                            <FileText className="w-8 h-8 text-[#CCCCCC] mx-auto mb-3" />
                            <p className="text-sm font-medium text-[#111111]">No invoices yet</p>
                            <p className="text-xs text-[#999999] mt-1">Invoices for this requirement can be managed from the Finance page.</p>
                            <button
                                onClick={() => router.push('/dashboard/finance')}
                                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-[#EEEEEE] text-[#111111] text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                Go to Finance
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <div className="border border-[#EEEEEE] rounded-xl overflow-hidden overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="bg-[#F9FAFB] border-b border-[#EEEEEE]">
                                        <th className="px-4 py-3 text-xs font-semibold text-[#999999] uppercase tracking-wider">Invoice #</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-[#999999] uppercase tracking-wider">Type</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-[#999999] uppercase tracking-wider">Date</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-[#999999] uppercase tracking-wider">Amount</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-[#999999] uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-[#999999] uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((inv, idx) => (
                                        <tr
                                            key={inv.id}
                                            tabIndex={0}
                                            role="link"
                                            aria-label={`View invoice ${inv.invoiceNumber}`}
                                            className={`cursor-pointer hover:bg-[#F9FAFB] transition-colors focus-visible:bg-[#F0F4FF] focus-visible:outline-none ${idx !== invoices.length - 1 ? 'border-b border-[#EEEEEE]' : ''}`}
                                            onClick={() => router.push(`/dashboard/finance/invoices/${inv.id}`)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/dashboard/finance/invoices/${inv.id}`); } }}
                                        >
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-medium text-[#111111]">{inv.invoiceNumber}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider ${
                                                    inv.type === 'PROFORMA'
                                                        ? 'bg-[#FFF3E0] text-[#FF9800]'
                                                        : 'bg-[#E3F2FD] text-[#2196F3]'
                                                }`}>
                                                    {inv.type === 'PROFORMA' ? 'Proforma' : 'Tax'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-medium text-[#111111]">{inv.date ? dayjs(inv.date).format('MMM D, YYYY') : '--'}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-medium text-[#111111] tabular-nums">{currencySymbol}{inv.amount.toLocaleString()}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${inv.status === 'paid' ? 'bg-[#E8F5E9] text-[#0F9D58]' :
                                                        inv.status === 'sent' || inv.status === 'open' ? 'bg-blue-50 text-blue-600' :
                                                            inv.status === 'overdue' || inv.status === 'past_due' ? 'bg-red-50 text-[#D14343]' :
                                                                inv.status === 'partial' ? 'bg-orange-50 text-orange-600' :
                                                                    inv.status === 'void' ? 'bg-[#EEEEEE] text-[#111111]' :
                                                                        'bg-gray-100 text-[#666666]'
                                                    }`}>
                                                    {STATUS_DISPLAY[inv.status] ?? inv.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDownloadPDF(inv.id, inv.invoiceNumber); }}
                                                        disabled={isDownloading[inv.id]}
                                                        className="p-2.5 text-[#666666] hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                                        aria-label={`Download PDF for invoice ${inv.invoiceNumber}`}
                                                    >
                                                        {isDownloading[inv.id] ? (
                                                            <div className="w-4 h-4 rounded-full border-2 border-[#666666] border-t-transparent animate-spin" />
                                                        ) : (
                                                            <Download className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/finance/invoices/${inv.id}`); }}
                                                        className="p-2.5 text-[#666666] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                                        aria-label={`View invoice ${inv.invoiceNumber}`}
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
