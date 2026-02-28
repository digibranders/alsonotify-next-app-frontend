'use client';

import { useState, useMemo } from 'react';
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Skeleton } from '../../ui/Skeleton';

import { PageLayout } from '../../layout/PageLayout';
import { FilterBar, FilterOption } from '../../ui/FilterBar';
import { DateRangeSelector } from '../../common/DateRangeSelector';

dayjs.extend(isBetween);

import { useInvoices } from '../../../hooks/useInvoice';
import { useCollaborativeRequirements } from '../../../hooks/useRequirement';
import { getInvoicePdfBlob } from '../../../services/invoice';

// Local view-model types for the finance page
interface Requirement {
    id: string | number;
    title: string;
    client: string;
    dueDate: string;
    estimatedCost: number;
    status: 'in-progress' | 'completed';
    approvalStatus: 'pending' | 'approved' | 'rejected';
    invoiceStatus?: 'unbilled' | 'invoiced';
    type?: string | null;
}

interface Invoice {
    id: string;
    invoiceNumber: string;
    client: string;
    date: string;
    dueDate: string;
    amount: number;
    status: string;
    items: Array<{ id: string; requirementId: string; description: string; quantity: number; unitPrice: number; amount: number }>;
}

// --- Main Component ---

export function FinancePage() {
  const router = useRouter();

  // Real API Fetches
  const { data: dbInvoicesData, isLoading: isLoadingInvoices } = useInvoices({ limit: 1000 });
  const { data: collaborativeReqs, isLoading: isLoadingReqs } = useCollaborativeRequirements();
  const loading = isLoadingInvoices || isLoadingReqs;

  const invoices = useMemo<Invoice[]>(() => {
    return (dbInvoicesData?.invoices || []).map(inv => ({
      id: inv.id.toString(),
      invoiceNumber: inv.invoice_number,
      client: inv.bill_to_company?.name || inv.bill_to || 'Unknown',
      date: inv.issue_date || inv.due_date || '',
      dueDate: inv.due_date || '',
      amount: inv.total,
      status: inv.status?.toLowerCase() ?? 'draft',
      items: (inv.particulars || []).map(p => ({
        id: p.id || crypto.randomUUID(),
        requirementId: String(p.requirement_id ?? ''),
        description: p.description || '',
        quantity: p.quantity || 1,
        unitPrice: p.unit_price || 0,
        amount: (p.quantity || 1) * (p.unit_price || 0),
      })),
    }));
  }, [dbInvoicesData]);

  // Map collaborative requirements to the page view-model and filter for "Ready to Bill"
  const requirements = useMemo<Requirement[]>(() => {
    return (collaborativeReqs ?? []).map(req => {
      const isCompleted = req.status === 'Completed';
      const hasInvoice = !!req.invoice_id;
      return {
        id: req.id,
        title: req.name ?? '',
        client: req.sender_company?.name ?? req.client ?? 'Unknown',
        dueDate: req.end_date ?? '',
        estimatedCost: Number(req.quoted_price ?? req.estimated_cost ?? 0),
        status: isCompleted ? 'completed' : 'in-progress',
        approvalStatus: req.approved_by ? 'approved' : 'pending',
        invoiceStatus: hasInvoice ? 'invoiced' : 'unbilled',
        type: req.type,
      };
    });
  }, [collaborativeReqs]);

  // Download State
  const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>({});

  // UI State - 4 Tabs
  const [activeTab, setActiveTab] = useState<'ready_to_bill' | 'drafts' | 'outstanding' | 'history'>('ready_to_bill');
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
      defaultValue: 'All',
      multiSelect: true
    },
    ...(['outstanding', 'history'].includes(activeTab) ? [{
      id: 'status',
      label: 'Status',
      options: ['All', 'Paid', 'Sent', 'Overdue', 'Partial', 'Void'],
      placeholder: 'All Statuses',
      defaultValue: 'All',
      multiSelect: true
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
      if (clientFilter !== 'All' && !clientFilter.split(',').includes(req.client)) return false;

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

      // Tab filtering
      if (activeTab === 'drafts' && inv.status !== 'draft') return false;
      if (activeTab === 'outstanding' && !['sent', 'pending', 'partial', 'overdue'].includes(inv.status)) return false;
      if (activeTab === 'history' && !['paid', 'void'].includes(inv.status)) return false;
      if (activeTab === 'ready_to_bill') return false; // not used for invoices

      if (clientFilter !== 'All' && !clientFilter.split(',').includes(inv.client)) return false;
      if (statusFilter !== 'All' && ['outstanding', 'history'].includes(activeTab) && !statusFilter.split(',').map(s => s.toLowerCase()).includes(inv.status)) return false;

      // Date Range (using Invoice Date)
      if (dateRange?.[0] && dateRange[1]) {
        const invDate = dayjs(inv.date);
        if (!invDate.isBetween(dateRange[0], dateRange[1], 'day', '[]')) {
          return false;
        }
      }

      return true;
    });
  }, [invoices, searchQuery, clientFilter, statusFilter, dateRange, activeTab]);

  // --- Stats ---

  const kpiInvoiced = useMemo(() => {
    const activeInvoices = invoices.filter(i => i.status !== 'draft' && i.status !== 'void');
    const total = activeInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const received = activeInvoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
    // Rough estimate for partials if any (mock doesn't have partial amounts received, assume 0 for simplicity or use db fields if available, but for now due = total - received)
    const due = total - received;
    return { total, received, due };
  }, [invoices]);

  const kpiToBeInvoiced = unbilledReqs.reduce((sum, req) => sum + (req.estimatedCost || 0), 0);

  // Total Expenses Mock logic: 65% of revenue (Invoiced + Unbilled)
  const totalRevenue = kpiInvoiced.total + kpiToBeInvoiced;
  const kpiTotalExpenses = totalRevenue * 0.65;
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

  const handleDownloadHistoryPDF = async (invoice: Invoice) => {
    if (isNaN(Number(invoice.id))) {
      // It's a mock invoice, can't download from server
      toast.error("Cannot download PDF for mock invoice. Create a real invoice first.");
      return;
    }

    try {
      setIsDownloading(prev => ({ ...prev, [invoice.id]: true }));
      const toastId = toast.loading("Downloading PDF...");

      const blob = await getInvoicePdfBlob(Number(invoice.id));

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss(toastId);
      toast.success("Invoice downloaded!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download PDF");
    } finally {
      setIsDownloading(prev => ({ ...prev, [invoice.id]: false }));
    }
  };

  // --- Render Helpers ---

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-[#E8F5E9] text-[#4CAF50]';
      case 'sent':
      case 'pending': return 'bg-[#E3F2FD] text-[#2196F3]';
      case 'partial': return 'bg-[#FFF3E0] text-[#FF9800]';
      case 'overdue': return 'bg-[#FFEBEE] text-[#ff3b3b]';
      case 'draft': return 'bg-[#F7F7F7] text-[#999999]';
      case 'void': return 'bg-[#EEEEEE] text-[#111111]';
      default: return 'bg-[#F7F7F7] text-[#666666]';
    }
  };

  return (
    <PageLayout
      title="Finance"
      tabs={[
        { id: 'ready_to_bill', label: 'Ready to Bill' },
        { id: 'drafts', label: 'Drafts' },
        { id: 'outstanding', label: 'Outstanding' },
        { id: 'history', label: 'History' }
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
        {/* Filter Bar */}
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

          {/* KPI Cards */}
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
                {/* Card 1: Amount Invoiced */}
                <div className="md:col-span-2 p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex items-center justify-between">
                  <div className="w-1/2 border-r border-[#EEEEEE] pr-4 flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-[#666666]">Amount Invoiced</span>
                    <span className="text-xl font-bold text-[#111111]">${kpiInvoiced.total.toLocaleString()}</span>
                  </div>
                  <div className="w-1/2 pl-6 flex items-center gap-8">
                    <div className="flex flex-col">
                      <span className="text-[0.625rem] uppercase tracking-wider font-bold text-[#999999]">Received</span>
                      <span className="text-[0.9375rem] font-bold text-[#0F9D58]">${kpiInvoiced.received.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[0.625rem] uppercase tracking-wider font-bold text-[#999999]">Due</span>
                      <span className="text-[0.9375rem] font-bold text-[#FF3B3B]">${kpiInvoiced.due.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Amount to be Invoiced */}
                <div className="p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center">
                  <span className="text-xs font-medium text-[#666666]">Amount to be Invoiced</span>
                  <span className="text-xl font-bold text-[#2196F3]">${kpiToBeInvoiced.toLocaleString()}</span>
                </div>

                {/* Card 3: Total Expenses */}
                <div className="p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center">
                  <span className="text-xs font-medium text-[#666666]">Total Expenses</span>
                  <span className="text-xl font-bold text-[#111111]">${kpiTotalExpenses.toLocaleString()}</span>
                </div>

                {/* Card 4: Profit / Loss */}
                <div className="p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-0.5 justify-center">
                  <span className="text-xs font-medium text-[#666666]">Profit / Loss</span>
                  <span className={`text-xl font-bold ${kpiProfit >= 0 ? 'text-[#0F9D58]' : 'text-[#FF3B3B]'}`}>
                    ${kpiProfit.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-24">
          {activeTab === 'ready_to_bill' ? (
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
            // Invoices Tabs (Drafts, Outstanding, History)
            <div className="bg-white border border-[#EEEEEE] rounded-[16px] overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#F9FAFB] border-b border-[#EEEEEE]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666666] uppercase rounded-tl-[16px]">Invoice #</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666666] uppercase">Client</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666666] uppercase">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666666] uppercase">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666666] uppercase">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-[#666666] uppercase rounded-tr-[16px]">Actions</th>
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
                      <td colSpan={6} className="px-6 py-12 text-center text-[#999999] font-normal">
                        No invoices found
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map(invoice => (
                      <tr key={invoice.id} className="hover:bg-[#F9FAFB] transition-colors group cursor-pointer" onClick={() => router.push(`/dashboard/finance/invoices/${invoice.id}`)}>
                        <td className="px-6 py-4 text-sm font-medium text-[#111111]">{invoice.invoiceNumber}</td>
                        <td className="px-6 py-4 text-sm font-normal text-[#111111]">{invoice.client}</td>
                        <td className="px-6 py-4 text-sm font-normal text-[#666666]">{dayjs(invoice.date).format('MMM D, YYYY')}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-[#111111]">${invoice.amount.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadHistoryPDF(invoice);
                            }}
                            disabled={isDownloading[invoice.id]}
                            className="p-2 hover:bg-white rounded-full transition-colors disabled:opacity-50"
                            title="Download PDF"
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
        <h3 className="text-base font-semibold text-[#111111] mb-2">{title}</h3>
        <p className="text-sm text-[#666666] font-normal">{description}</p>
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
      <div className="bg-[#F9FAFB] border-b border-[#EEEEEE] p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <button onClick={onToggleCollapse} className="text-[#666666] hover:text-[#111111]">
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          <div className="w-10 h-10 rounded-full bg-[#ff3b3b]/10 flex items-center justify-center text-[#ff3b3b] font-bold text-sm">
            {client.substring(0, 2).toUpperCase()}
          </div>

          <div>
            <h3 className="text-base font-bold text-[#111111]">{client}</h3>
            <p className="text-xs text-[#666666]">{reqs.length} requirements ready to bill</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-lg font-bold text-[#111111]">${totalAmount.toLocaleString()}</p>
            <p className="text-xs text-[#666666]">Total unbilled</p>
          </div>
          <button
            onClick={onGenerateInvoice}
            className="px-4 py-2 bg-[#ff3b3b] text-white rounded-full text-[0.8125rem] font-bold hover:bg-[#e63535] transition-colors"
          >
            Generate Invoice
          </button>
        </div>
      </div>

      {!collapsed && (
        <table className="w-full">
          <thead className="bg-white border-b border-[#EEEEEE]">
            <tr>
              <th className="px-6 py-2 text-left text-[0.6875rem] text-[#999999] uppercase font-bold">Requirement</th>
              <th className="px-6 py-2 text-left text-[0.6875rem] text-[#999999] uppercase font-bold">Type</th>
              <th className="px-6 py-2 text-left text-[0.6875rem] text-[#999999] uppercase font-bold">Due Date</th>
              <th className="px-6 py-2 text-left text-[0.6875rem] text-[#999999] uppercase font-bold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEEEEE]">
            {reqs.map(req => (
              <tr key={req.id} className="hover:bg-[#F9FAFB]">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-[#7ccf00]" />
                    <span className="text-sm font-medium text-[#111111]">{req.title}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-full bg-[#F7F7F7] text-[#666666] text-[0.6875rem]">
                    {req.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-[0.8125rem] text-[#666666]">
                  {dayjs(req.dueDate).format('MMM D, YYYY')}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-[#111111]">
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
