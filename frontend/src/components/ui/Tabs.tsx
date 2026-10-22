import { cn } from "../../lib/utils";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn("flex items-center gap-1 border-b border-gray-800 pb-px overflow-x-auto", className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "px-3.5 py-2 text-sm font-medium transition-all relative border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap cursor-pointer select-none",
              isActive
                ? "text-emerald-400 border-emerald-400"
                : "text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-700"
            )}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span
                className={cn(
                  "text-xs px-1.5 py-0.2 rounded-full",
                  isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-gray-800 text-gray-400"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
