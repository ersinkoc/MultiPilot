import { X, File } from 'lucide-react';
import { useFileStore } from '@/stores/fileStore';

export function FileViewerTabs() {
  const { openTabs, activeTabId, selectTab, closeTab } = useFileStore();

  if (openTabs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center border-b border-border bg-card overflow-x-auto shrink-0">
      {openTabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => selectTab(tab.id)}
          className={`group flex items-center gap-1.5 px-2.5 py-1.5 text-xs border-r border-border cursor-pointer min-w-[100px] max-w-[180px] transition-colors ${
            activeTabId === tab.id
              ? 'bg-background text-foreground'
              : 'bg-card text-muted-foreground hover:bg-background/50'
          }`}
          title={tab.path || tab.name}
        >
          <File className="w-3 h-3 shrink-0" />
          <span className="flex-1 truncate">
            {tab.name}
            {tab.isModified && (
              <span className="ml-0.5 text-accent">●</span>
            )}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-muted"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
