interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface PillTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function PillTabs({ tabs, activeTab, onTabChange }: PillTabsProps) {
  return (
    <div className="flex gap-3" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-6 py-2.5 rounded-full font-semibold text-[0.875rem] transition-all flex items-center gap-2 ${activeTab === tab.id
              ? 'bg-[#ff3b3b] text-white shadow-md'
              : 'bg-white text-[#666666] border border-[#EEEEEE] hover:bg-[#F7F7F7]'
            }`}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[0.6875rem] ${activeTab === tab.id
                ? 'bg-white/20 text-white'
                : 'bg-[#F7F7F7] text-[#666666]'
              }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
