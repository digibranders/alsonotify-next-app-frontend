import svgPaths from "../../constants/iconPaths";

export function InvoicesWidget() {
  const invoices = [
    { id: "#INV-1127", client: "TechStartup Inc.", amount: "$12,500", status: "Paid", date: "Nov 10" },
    { id: "#INV-1128", client: "Creative Agency Co.", amount: "$8,200", status: "Pending", date: "Nov 15" },
    { id: "#INV-1129", client: "Global Solutions Ltd.", amount: "$15,800", status: "Paid", date: "Nov 16" },
    { id: "#INV-1130", client: "Digital Marketing Hub", amount: "$6,500", status: "Overdue", date: "Nov 5" },
  ];

  return (
    <div className="bg-white rounded-[24px] p-6 w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-['Manrope:SemiBold',sans-serif] text-[20px] text-[#111111]">Invoices</h3>
        <button className="flex items-center gap-1 text-[#666666] text-[14px] font-['Manrope:SemiBold',sans-serif] hover:text-[#111111] transition-colors">
          <span>View All</span>
          <svg className="size-[17px]" fill="none" viewBox="0 0 17 17">
            <path d={svgPaths.p3ac7a560} stroke="#666666" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          </svg>
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#EEEEEE] mb-3" />

      {/* Invoices List */}
      <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
        {invoices.map((invoice, index) => (
          <InvoiceItem key={index} {...invoice} />
        ))}
      </div>
    </div>
  );
}

function InvoiceItem({ id, client, amount, status}: { id: string; client: string; amount: string; status: string; date: string }) {
  const getStatusColor = () => {
    switch (status) {
      case 'Paid':
        return 'bg-[#E8F5E9] text-[#2E7D32]';
      case 'Pending':
        return 'bg-[#FFF3E0] text-[#E65100]';
      case 'Overdue':
        return 'bg-[#FFEBEE] text-[#C62828]';
      default:
        return 'bg-[#F5F5F5] text-[#666666]';
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-[#F7F7F7] rounded-lg hover:bg-[#EEEEEE] transition-colors cursor-pointer">
      {/* Invoice Icon */}
      <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center">
        <svg className="size-5" fill="none" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#666666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#666666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Invoice Details */}
      <div className="flex-1">
        <p className="font-['Manrope:SemiBold',sans-serif] text-[14px] text-[#111111] mb-1">{id}</p>
        <p className="font-['Manrope:Regular',sans-serif] text-[12px] text-[#666666]">{client}</p>
      </div>

      {/* Amount & Status */}
      <div className="flex flex-col items-end gap-2">
        <p className="font-['Manrope:Bold',sans-serif] text-[14px] text-[#111111]">{amount}</p>
        <span className={`text-[11px] font-['Manrope:Medium',sans-serif] px-2 py-1 rounded ${getStatusColor()}`}>
          {status}
        </span>
      </div>
    </div>
  );
}