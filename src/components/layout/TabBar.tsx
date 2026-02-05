interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="flex items-center pt-1">
      <div className="flex items-center gap-6 border-b border-[#EEEEEE]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`pb-3 px-1 relative font-['Manrope:SemiBold',sans-serif] text-[14px] transition-colors flex items-center gap-2 ${activeTab === tab.id
                ? 'text-[#ff3b3b]'
                : 'text-[#666666] hover:text-[#111111]'
              }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[11px] ${activeTab === tab.id
                  ? 'bg-[#ff3b3b] text-white'
                  : 'bg-[#F7F7F7] text-[#666666]'
                }`}>
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff3b3b]" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}