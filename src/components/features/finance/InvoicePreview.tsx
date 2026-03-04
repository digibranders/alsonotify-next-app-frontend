import { forwardRef } from 'react';
import dayjs from 'dayjs';


export interface InvoicePreviewData {
    invoiceId: string;
    issueDate: string;
    dueDate: string;
    currencyCode: string;
    senderName: string;
    senderLogoUrl?: string | null;
    senderAddress: string;
    senderEmail: string;
    senderTaxId: string;
    clientName: string;
    clientAddress: string;
    clientEmail: string;
    clientPhone: string;
    clientTaxId: string;
    items: Array<{
        id: string;
        description: string;
        quantity: number;
        unitPrice: number;
    }>;
    totals: {
        subtotal: number;
        discount: number;
        totalTax: number;
        total: number;
    };
    taxConfig: {
        id: string;
        name: string;
        rate: number;
    };
    memo: string;
    footer: string;
    invoiceType?: 'TAX' | 'PROFORMA';
    advanceDeducted?: number;
    proformaRefId?: string;
}

interface InvoicePreviewProps {
    data: InvoicePreviewData;
}

export const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(({ data }, ref) => {
    const {
        invoiceId,
        issueDate,
        dueDate,
        currencyCode,
        senderName,
        senderLogoUrl,
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
        footer,
        invoiceType = 'TAX',
        advanceDeducted = 0,
        proformaRefId
    } = data;

    const getCurrencySymbol = (code: string) => {
        switch (code) {
            case 'INR': return '₹';
            case 'USD': return '$';
            case 'EUR': return '€';
            case 'GBP': return '£';
            default: return code;
        }
    };

    const symbol = getCurrencySymbol(currencyCode);

    const amountDue = Math.max(0, totals.total - advanceDeducted);

    return (
        <div
            ref={ref}
            id="invoice-preview"
            className="bg-white shadow-2xl flex flex-col mx-auto"
            style={{
                width: '794px',
                minHeight: '1123px',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
        >
            {/* Main Content - Reduced padding for more space */}
            <div className="flex-1 px-12 py-8">
                {/* Top Section: Logo & Invoice Title */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-[28px] font-semibold text-[#1a1a1a] tracking-tight mb-0.5 uppercase">
                            {invoiceType === 'PROFORMA' ? 'Proforma Invoice' : 'Tax Invoice'}
                        </h1>
                        <p className="text-[12px] text-[#697386]">
                            {invoiceId}
                            {invoiceType === 'TAX' && proformaRefId && (
                                <span className="ml-2 px-1.5 py-0.5 bg-[#F3F4F6] text-[#666666] rounded-md text-[10px] font-medium">
                                    Ref: PRO-{proformaRefId}
                                </span>
                            )}
                        </p>
                    </div>
                    {/* Company Logo */}
                    <div className="text-right">
                        <div className="flex justify-end mb-1">
                            {senderLogoUrl
                                ? <img src={senderLogoUrl} alt="Company Logo" style={{ maxHeight: 60, maxWidth: 180, objectFit: 'contain' }} />
                                : <span style={{ fontWeight: 700, fontSize: 18 }}>{senderName}</span>
                            }
                        </div>
                    </div>
                </div>

                {/* Invoice Details Row - Compact */}
                <div className="flex gap-12 mb-6 pb-5 border-b border-[#e6e6e6]">
                    <div>
                        <p className="text-[10px] font-semibold text-[#697386] uppercase tracking-wider mb-0.5">Issue Date</p>
                        <p className="text-[12px] text-[#1a1a1a] font-medium">{dayjs(issueDate).format('MMM D, YYYY')}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold text-[#697386] uppercase tracking-wider mb-0.5">Due Date</p>
                        <p className="text-[12px] text-[#1a1a1a] font-medium">{dayjs(dueDate).format('MMM D, YYYY')}</p>
                    </div>
                    <div className="ml-auto text-right">
                        <p className="text-[10px] font-semibold text-[#697386] uppercase tracking-wider mb-0.5">Amount Due</p>
                        <p className="text-[20px] text-[#1a1a1a] font-bold">{symbol}{amountDue.toLocaleString()}</p>
                    </div>
                </div>

                {/* Billed To / From Section - Compact */}
                <div className="flex justify-between mb-6">
                    <div className="max-w-[260px]">
                        <p className="text-[10px] font-semibold text-[#697386] uppercase tracking-wider mb-2">From</p>
                        <p className="text-[14px] font-semibold text-[#1a1a1a] mb-1">{senderName}</p>
                        <div className="text-[11px] text-[#697386] leading-snug space-y-px whitespace-pre-wrap">
                            <p>{senderAddress}</p>
                            {senderEmail && <p>{senderEmail}</p>}
                            {senderTaxId && <p className="mt-1 font-medium">GSTIN: {senderTaxId}</p>}
                        </div>
                    </div>
                    <div className="max-w-[260px] text-right">
                        <p className="text-[10px] font-semibold text-[#697386] uppercase tracking-wider mb-2">Bill To</p>
                        <p className="text-[14px] font-semibold text-[#1a1a1a] mb-1">{clientName}</p>
                        <div className="text-[11px] text-[#697386] leading-snug space-y-px whitespace-pre-wrap">
                            <p>{clientAddress}</p>
                            {clientEmail && <p>{clientEmail}</p>}
                            {clientPhone && <p>{clientPhone}</p>}
                            {clientTaxId && <p className="mt-1 font-medium">GSTIN: {clientTaxId}</p>}
                        </div>
                    </div>
                </div>

                {/* Line Items Table - Compact */}
                <div className="mb-4">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-[#1a1a1a]">
                                <th className="text-left py-2 text-[10px] font-semibold text-[#697386] uppercase tracking-wider">Description</th>
                                <th className="text-center py-2 text-[10px] font-semibold text-[#697386] uppercase tracking-wider w-16">Qty</th>
                                <th className="text-right py-2 text-[10px] font-semibold text-[#697386] uppercase tracking-wider w-24">Unit Price</th>
                                <th className="text-right py-2 text-[10px] font-semibold text-[#697386] uppercase tracking-wider w-24">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.id} className="border-b border-[#e6e6e6]">
                                    <td className="py-2.5 text-[12px] text-[#1a1a1a]">{item.description}</td>
                                    <td className="py-2.5 text-center text-[12px] text-[#697386]">{item.quantity}</td>
                                    <td className="py-2.5 text-right text-[12px] text-[#697386]">{symbol}{item.unitPrice.toLocaleString()}</td>
                                    <td className="py-2.5 text-right text-[12px] font-medium text-[#1a1a1a]">{symbol}{(item.quantity * item.unitPrice).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Summary - Right Aligned, Compact */}
                <div className="flex justify-end">
                    <div className="w-[240px]">
                        <div className="flex justify-between py-1.5 text-[12px]">
                            <span className="text-[#697386]">Subtotal</span>
                            <span className="text-[#1a1a1a]">{symbol}{totals.subtotal.toLocaleString()}</span>
                        </div>
                        {totals.discount > 0 && (
                            <div className="flex justify-between py-1.5 text-[12px]">
                                <span className="text-[#697386]">Discount</span>
                                <span className="text-[#0F9D58]">{'-'}{symbol}{totals.discount.toLocaleString()}</span>
                            </div>
                        )}
                        {taxConfig.id === 'gst_local' && taxConfig.rate > 0 ? (
                            <>
                                <div className="flex justify-between py-1.5 text-[12px]">
                                    <span className="text-[#697386]">CGST ({taxConfig.rate / 2}%)</span>
                                    <span className="text-[#1a1a1a]">{symbol}{(totals.totalTax / 2).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between py-1.5 text-[12px]">
                                    <span className="text-[#697386]">SGST ({taxConfig.rate / 2}%)</span>
                                    <span className="text-[#1a1a1a]">{symbol}{(totals.totalTax / 2).toLocaleString()}</span>
                                </div>
                            </>
                        ) : (
                            taxConfig.rate > 0 && (
                                <div className="flex justify-between py-1.5 text-[12px]">
                                    <span className="text-[#697386]">{taxConfig.name} ({taxConfig.rate}%)</span>
                                    <span className="text-[#1a1a1a]">{symbol}{totals.totalTax.toLocaleString()}</span>
                                </div>
                            )
                        )}
                        <div className="flex justify-between py-2 mt-1.5 border-t-2 border-[#1a1a1a]">
                            <span className="text-[14px] font-semibold text-[#1a1a1a]">Total</span>
                            <span className="text-[14px] font-bold text-[#1a1a1a]">{symbol}{totals.total.toLocaleString()}</span>
                        </div>
                        {advanceDeducted > 0 && (
                            <div className="flex justify-between py-1.5 text-[12px]">
                                <span className="text-[#697386]">Less: Advance Deducted</span>
                                <span className="text-[#ff3b3b] font-medium">{'-'}{symbol}{advanceDeducted.toLocaleString()}</span>
                            </div>
                        )}
                        {advanceDeducted > 0 && (
                            <div className="flex justify-between py-2 mt-1.5 border-t border-[#e6e6e6]">
                                <span className="text-[14px] font-semibold text-[#1a1a1a]">Amount Due</span>
                                <span className="text-[14px] font-bold text-[#1a1a1a]">{symbol}{amountDue.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Memo - Compact */}
                {memo && (
                    <div className="mt-6 pt-4 border-t border-[#e6e6e6]">
                        <p className="text-[10px] font-semibold text-[#697386] uppercase tracking-wider mb-1">Notes</p>
                        <p className="text-[11px] text-[#697386] leading-relaxed">{memo}</p>
                    </div>
                )}

                {/* Payment Details Section - Clean, above absolute footer */}
                <div className="mt-8 pt-6 border-t border-[#e6e6e6]">
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 border border-[#e6e6e6] rounded-lg flex items-center justify-center text-[#1a1a1a] font-bold text-[12px]">
                            {symbol}
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-semibold text-[#697386] uppercase tracking-wider mb-1.5">Payment Instructions</p>
                            <div className="text-[11px] text-[#1a1a1a] whitespace-pre-wrap leading-relaxed font-medium">
                                {footer}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Absolute Footer - Branding and Pagination */}
            <div className="mt-auto px-12 py-6 border-t border-[#f0f0f0] flex justify-between items-center opacity-70">
                <div className="flex items-center gap-2">
                    {senderLogoUrl ? (
                        <img
                            src={senderLogoUrl}
                            alt={senderName}
                            style={{ maxHeight: 24, maxWidth: 100, objectFit: 'contain' }}
                        />
                    ) : (
                        <span className="text-[12px] font-bold text-[#697386] uppercase tracking-wider">{senderName}</span>
                    )}
                </div>
                {/* Conditional Pagination: Only show if total pages > 1. 
                For now, we assume single page logic until multi-page support is added.
                So we hide it by default or keep it if user explicitly wanted it only for > 1 pages.
                User said: "not the pagination(that is optional only if more that 1 pages)"
                Since this component renders a single 'page' view, we can hide it for now or check a prop.
                Let's assume data.totalPages is passed or default to 1.
            */}
                {/* 
            <div className="text-[10px] text-[#697386] font-medium uppercase tracking-widest">
                Page 1 of 1
            </div> 
            */}
            </div>
        </div>
    );
});

InvoicePreview.displayName = 'InvoicePreview';
