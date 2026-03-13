import React, { useMemo, useState } from 'react';
import { Requirement } from '@/types/domain';
import { useInvoices } from '@/hooks/useInvoice';
import { FileText, Plus, Download, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getInvoicePdfBlob } from '@/services/invoice';
import { toast } from 'sonner';
import dayjs from 'dayjs';

interface BillingTabProps {
    requirement: Requirement;
}

export const BillingTab: React.FC<BillingTabProps> = ({ requirement }) => {
    const router = useRouter();
    const { data: dbInvoicesData, isLoading } = useInvoices({ requirement_id: requirement.id });
    const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>({});

    // The backend should return invoices filtered by requirement_id.
    const invoices = useMemo(() => {
        return (dbInvoicesData?.invoices || []).map(inv => ({
            id: String(inv.id),
            invoiceNumber: inv.invoice_number,
            date: inv.issue_date || inv.due_date || '',
            dueDate: inv.due_date || '',
            amount: inv.total || 0,
            status: (inv.status?.toLowerCase() || 'draft') as string,
        }));
    }, [dbInvoicesData]);

    const estimatedCost = requirement.estimated_cost || requirement.quoted_price || 0;
    const totalBilled = requirement.total_billed ?? invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const remainingBalance = Math.max(0, estimatedCost - totalBilled);

    const handleCreateInvoice = () => {
        const queryParams = new URLSearchParams({
            clientId: String(requirement.receiver_company_id || requirement.sender_company_id || ''),
            reqIds: String(requirement.id)
        });
        router.push(`/dashboard/finance/create?${queryParams.toString()}`);
    };

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

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="bg-white rounded-[16px] p-8 border border-[#EEEEEE] shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-bold text-[#111111] flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#ff3b3b]" />
                        Billing Overview
                    </h3>
                    {remainingBalance > 0 && (
                        <button
                            onClick={handleCreateInvoice}
                            className="flex items-center gap-2 px-4 py-2 bg-[#111111] text-white text-sm font-bold rounded-full hover:bg-black transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Create Invoice
                        </button>
                    )}
                </div>

                {/* Summary Row */}
                <div className="grid grid-cols-3 gap-6 mb-8">
                    <div className="p-4 rounded-xl border border-[#EEEEEE] bg-[#F9FAFB]">
                        <p className="text-[11px] font-semibold text-[#697386] uppercase tracking-wider mb-1">Total Quoted / Estimated</p>
                        <p className="text-2xl font-bold text-[#111111]">₹{estimatedCost.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[#EEEEEE] bg-[#F9FAFB]">
                        <p className="text-[11px] font-semibold text-[#697386] uppercase tracking-wider mb-1">Total Billed</p>
                        <p className="text-2xl font-bold text-[#111111]">₹{totalBilled.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[#EEEEEE] bg-blue-50/50">
                        <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-1">Remaining Balance</p>
                        <p className="text-2xl font-bold text-blue-700">₹{remainingBalance.toLocaleString()}</p>
                    </div>
                </div>

                {/* Billing Progress Bar */}
                {estimatedCost > 0 && (
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs text-[#697386]">Billing Progress</span>
                            <span className="text-xs font-semibold text-[#111111]">
                                {Math.round(Math.min((totalBilled / estimatedCost) * 100, 100))}%
                            </span>
                        </div>
                        <div className="w-full h-2 bg-[#EEEEEE] rounded-full overflow-hidden">
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

                {/* Invoice History */}
                <div>
                    <h4 className="text-sm font-bold text-[#111111] mb-4">Invoice History</h4>

                    {isLoading ? (
                        <div className="text-center py-8 text-[#697386] text-sm">Loading invoices...</div>
                    ) : invoices.length === 0 ? (
                        <div className="text-center py-12 rounded-xl border border-dashed border-[#DDDDDD] bg-[#FAFAFA]">
                            <FileText className="w-8 h-8 text-[#CCCCCC] mx-auto mb-3" />
                            <p className="text-sm font-medium text-[#111111]">No invoices yet</p>
                            <p className="text-xs text-[#697386] mt-1">Create an invoice to bill for this requirement.</p>
                            <button
                                onClick={handleCreateInvoice}
                                className="mt-4 px-4 py-2 bg-white border border-[#EEEEEE] text-[#111111] text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Create First Invoice
                            </button>
                        </div>
                    ) : (
                        <div className="border border-[#EEEEEE] rounded-xl overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#F9FAFB] border-b border-[#EEEEEE]">
                                        <th className="px-4 py-3 text-[11px] font-semibold text-[#697386] uppercase tracking-wider">Invoice #</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-[#697386] uppercase tracking-wider">Date</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-[#697386] uppercase tracking-wider">Amount</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-[#697386] uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-[#697386] uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((inv, idx) => (
                                        <tr key={inv.id} className={idx !== invoices.length - 1 ? 'border-b border-[#EEEEEE]' : ''}>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-semibold text-[#111111]">{inv.invoiceNumber}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-xs text-[#697386]">{inv.date ? dayjs(inv.date).format('MMM D, YYYY') : '--'}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-xs font-medium text-[#111111]">₹{inv.amount.toLocaleString()}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${inv.status === 'paid' ? 'bg-[#E8F5E9] text-[#0F9D58]' :
                                                        inv.status === 'sent' || inv.status === 'open' ? 'bg-blue-50 text-blue-600' :
                                                            inv.status === 'overdue' || inv.status === 'past_due' ? 'bg-red-50 text-[#D14343]' :
                                                                inv.status === 'partial' ? 'bg-orange-50 text-orange-600' :
                                                                    'bg-gray-100 text-[#697386]'
                                                    }`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleDownloadPDF(inv.id, inv.invoiceNumber)}
                                                        disabled={isDownloading[inv.id]}
                                                        className="p-1.5 text-[#697386] hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                                                        title="Download PDF"
                                                    >
                                                        {isDownloading[inv.id] ? (
                                                            <div className="w-4 h-4 rounded-full border-2 border-[#697386] border-t-transparent animate-spin" />
                                                        ) : (
                                                            <Download className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => router.push('/dashboard/finance')}
                                                        className="p-1.5 text-[#697386] hover:bg-gray-100 rounded-md transition-colors"
                                                        title="View in Finance"
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
