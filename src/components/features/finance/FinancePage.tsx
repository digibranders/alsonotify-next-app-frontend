'use client';

import { useState, useMemo } from 'react';
import {
  CheckCircle,
  FileText,
  ChevronDown,
  ChevronRight,
  Download,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button } from 'antd';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Skeleton } from '../../ui/Skeleton';

import { PageLayout } from '../../layout/PageLayout';
import { FilterBar, FilterOption } from '../../ui/FilterBar';
import { DateRangeSelector } from '../../common/DateRangeSelector';

dayjs.extend(isBetween);

import {
  Requirement,
  Invoice,
  InvoiceItem,
  MOCK_REQUIREMENTS,
  MOCK_INVOICES
} from '../../../data/mockFinanceData';
import { useCurrentUserCompany, usePartners } from '@/hooks/useUser';
import { InvoicePreview } from './InvoicePreview';
import { useRef, useEffect } from 'react';

// --- Main Component ---

export function FinancePage() {
  const router = useRouter();

  // Local State for Data (Simulating Backend)
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(() => {
      setRequirements(MOCK_REQUIREMENTS);
      setInvoices(MOCK_INVOICES);
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Download State
  const [downloadPreviewData, setDownloadPreviewData] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Data Hooks
  const { data: companyRes } = useCurrentUserCompany();
  const { data: partnersRes } = usePartners();

  // UI State
  const [activeTab, setActiveTab] = useState<'unbilled' | 'history'>('unbilled');
  const [searchQuery, setSearchQuery] = useState('');


  // Expansion State
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Filter State
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>([
    dayjs().startOf('month'),
    dayjs().endOf('month')
  ]);
  const [clientFilter, setClientFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // --- Derived Data & helpers ---

  const clientOptions = useMemo(() => {
    const clients = new Set<string>();
    invoices.forEach(inv => clients.add(inv.client));
    requirements.forEach(req => clients.add(req.client));
    return Array.from(clients).sort();
  }, [invoices, requirements]);

  const filterOptions: FilterOption[] = [
    {
      id: 'client',
      label: 'Client',
      options: ['All', ...clientOptions],
      placeholder: 'All Partners',
      defaultValue: 'All'
    },
    ...(activeTab === 'history' ? [{
      id: 'status',
      label: 'Status',
      options: ['All', 'Paid', 'Sent', 'Overdue'],
      placeholder: 'All Statuses',
      defaultValue: 'All'
    }] : [])
  ];

  const handleFilterChange = (filterId: string, value: string) => {
    if (filterId === 'client') setClientFilter(value);
    else if (filterId === 'status') setStatusFilter(value);
  };

  const clearFilters = () => {
    setClientFilter('All');
    setStatusFilter('All');
    setSearchQuery('');
  };

  // --- Filtering Logic ---

  const unbilledReqs = useMemo(() => {
    return requirements.filter(req => {
      // Base logic: approved + completed + unbilled
      const isUnbilled = req.status === 'completed' &&
        req.approvalStatus === 'approved' &&
        (req.invoiceStatus === 'unbilled' || !req.invoiceStatus);

      if (!isUnbilled) return false;

      // Search
      if (searchQuery && !req.title.toLowerCase().includes(searchQuery.toLowerCase()) && !req.client.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Filters
      if (clientFilter !== 'All' && req.client !== clientFilter) return false;

      // Date Range (using Due Date)
      if (dateRange && dateRange[0] && dateRange[1]) {
        const dueDate = dayjs(req.dueDate);
        if (!dueDate.isBetween(dateRange[0], dateRange[1], 'day', '[]')) {
          return false;
        }
      }

      return true;
    });
  }, [requirements, searchQuery, clientFilter, dateRange]);

  const unbilledByClient = useMemo(() => {
    return unbilledReqs.reduce((acc, req) => {
      if (!acc[req.client]) acc[req.client] = [];
      acc[req.client].push(req);
      return acc;
    }, {} as Record<string, Requirement[]>);
  }, [unbilledReqs]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = inv.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (clientFilter !== 'All' && inv.client !== clientFilter) return false;
      if (statusFilter !== 'All' && inv.status !== statusFilter) return false;

      // Date Range (using Invoice Date)
      if (dateRange && dateRange[0] && dateRange[1]) {
        const invDate = dayjs(inv.date);
        if (!invDate.isBetween(dateRange[0], dateRange[1], 'day', '[]')) {
          return false;
        }
      }

      return true;
    });
  }, [invoices, searchQuery, clientFilter, statusFilter, dateRange]);

  // --- Stats ---

  // Card 1: Amount Invoiced (Total), Received (Paid), Due (Unpaid)
  const kpiInvoiced = useMemo(() => {
    // For these cards, do we use filtered invoices or all invoices within range?
    // Usually KPI cards respect the filters.
    const total = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const received = filteredInvoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
    const due = total - received;
    return { total, received, due };
  }, [filteredInvoices]);

  // Card 2: Amount to be Invoiced (Unbilled)
  const kpiToBeInvoiced = unbilledReqs.reduce((sum, req) => sum + (req.estimatedCost || 0), 0);

  // Card 3: Total Expenses
  // Mock logic: 65% of revenue (Invoiced + Unbilled)
  const totalRevenue = kpiInvoiced.total + kpiToBeInvoiced;
  const kpiTotalExpenses = totalRevenue * 0.65;

  // Card 4: Profit / Loss
  const kpiProfit = totalRevenue - kpiTotalExpenses;


  // --- Actions ---

  const handleCreateInvoice = (client: string) => {
    const clientReqs = unbilledByClient[client] || [];
    const idsToInvoice = clientReqs.map(r => r.id);

    if (idsToInvoice.length === 0) {
      toast.error("No requirements available to invoice");
      return;
    }

    const queryParams = new URLSearchParams({
      clientId: client,
      reqIds: idsToInvoice.join(',')
    });

    router.push(`/dashboard/finance/create?${queryParams.toString()}`);
  };

  const handleMarkAsPaid = (invoiceId: string) => {
    // Update invoice
    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: 'paid' as const } : inv));

    // Find invoice items and update requirements
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      setRequirements(prev => prev.map(req => req.invoiceId === invoiceId ? { ...req, invoiceStatus: 'paid' as const } : req));
    }

    toast.success("Invoice marked as paid");
  };

  const handleDownloadHistoryPDF = async (invoice: Invoice) => {
    try {
      setIsDownloading(true);
      const toastId = toast.loading("Preparing PDF...");

      // 1. Prepare Data
      const companyData = companyRes?.result;
      const partnerData = partnersRes?.result?.find(p =>
        String(p.id) === invoice.client ||
        p.name === invoice.client ||
        (typeof p.company === 'object' ? p.company.name === invoice.client : p.company === invoice.client)
      );

      // Calculate totals from items
      const subtotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      // Assuming tax is included or calculated. For simplicity, let's reverse calc or assume standard tax if not stored
      // MOCK_INVOICES just has 'amount'. Let's assume amount is total.
      // If items sum != amount, we might need to adjust.
      // For this demo, let's calculate fresh from items
      const taxRate = 18;
      const totalTax = (subtotal * taxRate) / 100;
      const total = subtotal + totalTax;

      const previewData = {
        invoiceId: invoice.invoiceNumber,
        issueDate: dayjs(invoice.date).format('YYYY-MM-DD'),
        dueDate: dayjs(invoice.dueDate).format('YYYY-MM-DD'),
        currencyCode: companyData?.currency || 'INR',

        senderName: companyData?.name || 'Fynix Digital Solutions',
        senderAddress: `${companyData?.address_line_1 || ''}\n${companyData?.address_line_2 || ''}`.trim(),
        senderEmail: companyData?.email || '',
        senderTaxId: companyData?.tax_id || '',

        clientName: invoice.client,
        clientAddress: `${partnerData?.address_line_1 || ''}\n${partnerData?.address_line_2 || ''}`.trim(),
        clientEmail: partnerData?.email || '',
        clientPhone: (partnerData as any)?.phone || '',
        clientTaxId: (partnerData as any)?.tax_id || '',

        items: invoice.items.map(i => ({ ...i, taxRate: 18 })),
        totals: {
          subtotal,
          discount: 0,
          taxableAmount: subtotal,
          totalTax,
          total
        },
        taxConfig: { id: 'gst_18', name: 'IGST', rate: 18 },
        memo: "Thank you for your business.",
        footer: companyData?.name ? `Bank Details for ${companyData.name}` : "Payment details..."
      };

      setDownloadPreviewData(previewData);

      // Wait for render
      setTimeout(async () => {
        if (previewRef.current) {
          // Dynamically import
          const html2canvas = (await import('html2canvas')).default;
          const jsPDF = (await import('jspdf')).default;

          const canvas = await html2canvas(previewRef.current, {
            scale: 2,
            useCORS: true,
            logging: false
          });

          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
          });

          const imgWidth = 210;
          const pageHeight = 297;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
          pdf.save(`${invoice.invoiceNumber}.pdf`);

          toast.dismiss(toastId);
          toast.success("Invoice downloaded!");
        }
        setDownloadPreviewData(null);
        setIsDownloading(false);
      }, 1000); // 1s delay to ensure render

    } catch (err) {
      console.error(err);
      toast.error("Failed to download PDF");
      setIsDownloading(false);
      setDownloadPreviewData(null);
    }
  };

  // --- Render Helpers ---

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-[#E8F5E9] text-[#4CAF50]';
      case 'sent': return 'bg-[#E3F2FD] text-[#2196F3]'; // 'pending' maps to 'sent' visually
      case 'pending': return 'bg-[#FFF3E0] text-[#FF9800]';
      case 'overdue': return 'bg-[#FFEBEE] text-[#ff3b3b]';
      case 'draft': return 'bg-[#F7F7F7] text-[#999999]';
      default: return 'bg-[#F7F7F7] text-[#666666]';
    }
  };

  return (
    <PageLayout
      title="Finance"
      tabs={[
        { id: 'unbilled', label: 'Ready to Bill' },
        { id: 'history', label: 'Invoice History' }
      ]}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as any)}
      searchPlaceholder="Search finance..."
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      showFilter={false} // We implement custom filter bar
      customFilters={
        <div className="flex items-center gap-3">
          <DateRangeSelector
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
      }
    >
      <div className="flex flex-col h-full relative">
        {/* Filter Bar - Top position like Reports page */}
        <div className="mb-6 space-y-4">
          <FilterBar
            filters={filterOptions}
            selectedFilters={{
              client: clientFilter,
              status: statusFilter
            }}
            onFilterChange={handleFilterChange}
            onClearFilters={clearFilters}
          />

          {/* KPI Cards - Double-width first card, single-width others */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {loading ? (
              <>
                <div className="md:col-span-2 p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex items-center justify-between animate-pulse">
                  <div className="w-1/2 border-r border-[#EEEEEE] pr-4 space-y-2">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-6 w-1/2" />
                  </div>
                  <div className="w-1/2 pl-6 flex items-center gap-8">
                    <div className="space-y-2">
                      <Skeleton className="h-2 w-12" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-2 w-12" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-2 justify-center animate-pulse">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-6 w-1/2" />
                  </div>
                ))}
              </>
            ) : (
              <>
                {/* Card 1: Amount Invoiced (Double Width) */}
                <div className="md:col-span-2 p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex items-center justify-between">
                  <div className="w-1/2 border-r border-[#EEEEEE] pr-4 flex flex-col gap-0.5">
                    <span className="text-[12px] font-medium text-[#666666]">Amount Invoiced</span>
                    <span className="text-xl font-['Manrope:Bold',sans-serif] text-[#111111]">${kpiInvoiced.total.toLocaleString()}</span>
                  </div>
                  <div className="w-1/2 pl-6 flex items-center gap-8">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#999999]">Received</span>
                      <span className="text-[15px] font-['Manrope:Bold',sans-serif] text-[#0F9D58]">${kpiInvoiced.received.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#999999]">Due</span>
                      <span className="text-[15px] font-['Manrope:Bold',sans-serif] text-[#FF3B3B]">${kpiInvoiced.due.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Amount to be Invoiced (Single Width) */}
                <div className="p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center">
                  <span className="text-[12px] font-medium text-[#666666]">Amount to be Invoiced</span>
                  <span className="text-xl font-['Manrope:Bold',sans-serif] text-[#2196F3]">${kpiToBeInvoiced.toLocaleString()}</span>
                </div>

                {/* Card 3: Total Expenses (Single Width) */}
                <div className="p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center">
                  <span className="text-[12px] font-medium text-[#666666]">Total Expenses</span>
                  <span className="text-xl font-['Manrope:Bold',sans-serif] text-[#111111]">${kpiTotalExpenses.toLocaleString()}</span>
                </div>

                {/* Card 4: Profit / Loss (Single Width) */}
                <div className="p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center">
                  <span className="text-[12px] font-medium text-[#666666]">Profit / Loss</span>
                  <span className={`text-xl font-['Manrope:Bold',sans-serif] ${kpiProfit >= 0 ? 'text-[#0F9D58]' : 'text-[#FF3B3B]'}`}>
                    ${kpiProfit.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-24">
          {activeTab === 'unbilled' ? (
            loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white border border-[#EEEEEE] rounded-[16px] overflow-hidden animate-pulse">
                    <div className="bg-[#F9FAFB] border-b border-[#EEEEEE] p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="space-y-1 text-right">
                          <Skeleton className="h-6 w-24" />
                          <Skeleton className="h-2 w-16" />
                        </div>
                        <Skeleton className="h-9 w-32 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : Object.keys(unbilledByClient).length === 0 ? (
              <EmptyState
                icon={<CheckCircle className="w-8 h-8 text-[#666666]" />}
                title="All caught up!"
                description="No requirements are ready to bill at the moment."
              />
            ) : (
              <div className="space-y-4">
                {Object.entries(unbilledByClient).map(([client, reqs]) => (
                  <ClientGroup
                    key={client}
                    client={client}
                    reqs={reqs}
                    collapsed={!!collapsedGroups[client]}
                    onToggleCollapse={() => setCollapsedGroups(prev => ({ ...prev, [client]: !prev[client] }))}
                    onGenerateInvoice={() => handleCreateInvoice(client)}
                  />
                ))}
              </div>
            )
          ) : (
            // History Tab
            <div className="bg-white border border-[#EEEEEE] rounded-[16px] overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#F9FAFB] border-b border-[#EEEEEE]">
                  <tr>
                    <th className="px-6 py-4 text-left text-[12px] font-['Manrope:Bold',sans-serif] text-[#666666] uppercase rounded-tl-[16px]">Invoice #</th>
                    <th className="px-6 py-4 text-left text-[12px] font-['Manrope:Bold',sans-serif] text-[#666666] uppercase">Client</th>
                    <th className="px-6 py-4 text-left text-[12px] font-['Manrope:Bold',sans-serif] text-[#666666] uppercase">Date</th>
                    <th className="px-6 py-4 text-left text-[12px] font-['Manrope:Bold',sans-serif] text-[#666666] uppercase">Amount</th>
                    <th className="px-6 py-4 text-left text-[12px] font-['Manrope:Bold',sans-serif] text-[#666666] uppercase">Status</th>
                    <th className="px-6 py-4 text-right text-[12px] font-['Manrope:Bold',sans-serif] text-[#666666] uppercase rounded-tr-[16px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEEEEE]">
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded" /></td>
                        <td className="px-6 py-4 text-right"><Skeleton className="h-6 w-6 rounded-full ml-auto" /></td>
                      </tr>
                    ))
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-[#999999] font-['Manrope:Regular',sans-serif]">
                        No invoices found
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map(invoice => (
                      <tr key={invoice.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-6 py-4 text-[14px] font-['Manrope:Medium',sans-serif] text-[#111111]">{invoice.invoiceNumber}</td>
                        <td className="px-6 py-4 text-[14px] font-['Manrope:Regular',sans-serif] text-[#111111]">{invoice.client}</td>
                        <td className="px-6 py-4 text-[14px] font-['Manrope:Regular',sans-serif] text-[#666666]">{dayjs(invoice.date).format('MMM D, YYYY')}</td>
                        <td className="px-6 py-4 text-[14px] font-['Manrope:SemiBold',sans-serif] text-[#111111]">${invoice.amount.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium capitalize ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDownloadHistoryPDF(invoice)}
                            disabled={isDownloading}
                            className="p-2 hover:bg-white rounded-full transition-colors disabled:opacity-50"
                          >
                            <Download className="w-4 h-4 text-[#666666]" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>



      </div>

      {/* Hidden Render Container for PDF Generation */}
      {downloadPreviewData && (
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
          <div className="w-[794px]" ref={previewRef}>
            <InvoicePreview data={downloadPreviewData} />
          </div>
        </div>
      )}
    </PageLayout>
  );
}

// --- Sub-Components ---

function EmptyState({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white border border-[#EEEEEE] rounded-[16px] p-12 text-center h-[400px] flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-full bg-[#F7F7F7] flex items-center justify-center mb-4">
        {icon}
      </div>
      <div>
        <h3 className="text-[16px] font-['Manrope:SemiBold',sans-serif] text-[#111111] mb-2">
          {title}
        </h3>
        <p className="text-[14px] text-[#666666] font-['Manrope:Regular',sans-serif]">
          {description}
        </p>
      </div>
    </div>
  );
}

function ClientGroup({
  client,
  reqs,
  collapsed,
  onToggleCollapse,
  onGenerateInvoice
}: {
  client: string,
  reqs: Requirement[],
  collapsed: boolean,
  onToggleCollapse: () => void,
  onGenerateInvoice: () => void
}) {
  const totalAmount = reqs.reduce((sum, req) => sum + (req.estimatedCost || 0), 0);

  return (
    <div className="bg-white border border-[#EEEEEE] rounded-[16px] overflow-hidden">
      {/* Header */}
      <div className="bg-[#F9FAFB] border-b border-[#EEEEEE] p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <button onClick={onToggleCollapse} className="text-[#666666] hover:text-[#111111]">
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          <div className="w-10 h-10 rounded-full bg-[#ff3b3b]/10 flex items-center justify-center text-[#ff3b3b] font-bold text-[14px]">
            {client.substring(0, 2).toUpperCase()}
          </div>

          <div>
            <h3 className="text-[16px] font-['Manrope:Bold',sans-serif] text-[#111111]">{client}</h3>
            <p className="text-[12px] text-[#666666]">{reqs.length} requirements ready to bill</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[18px] font-['Manrope:Bold',sans-serif] text-[#111111]">${totalAmount.toLocaleString()}</p>
            <p className="text-[12px] text-[#666666]">Total unbilled</p>
          </div>
          <button
            onClick={onGenerateInvoice}
            className="px-4 py-2 bg-[#ff3b3b] text-white rounded-full text-[13px] font-bold hover:bg-[#e63535] transition-colors"
          >
            Generate Invoice
          </button>
        </div>
      </div>

      {/* List */}
      {!collapsed && (
        <table className="w-full">
          <thead className="bg-white border-b border-[#EEEEEE]">
            <tr>
              <th className="px-6 py-2 text-left text-[11px] text-[#999999] uppercase font-bold">Requirement</th>
              <th className="px-6 py-2 text-left text-[11px] text-[#999999] uppercase font-bold">Type</th>
              <th className="px-6 py-2 text-left text-[11px] text-[#999999] uppercase font-bold">Due Date</th>
              <th className="px-6 py-2 text-left text-[11px] text-[#999999] uppercase font-bold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEEEEE]">
            {reqs.map(req => (
              <tr key={req.id} className="hover:bg-[#F9FAFB]">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-[#7ccf00]" />
                    <span className="text-[14px] font-medium text-[#111111]">{req.title}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-full bg-[#F7F7F7] text-[#666666] text-[11px]">
                    {req.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-[13px] text-[#666666]">
                  {dayjs(req.dueDate).format('MMM D, YYYY')}
                </td>
                <td className="px-6 py-4 text-[14px] font-bold text-[#111111]">
                  ${(req.estimatedCost || 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
