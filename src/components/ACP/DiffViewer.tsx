import ReactDiffViewer from 'react-diff-viewer-continued';
import { FileCode, Copy, Download } from 'lucide-react';
import { useState } from 'react';

interface DiffViewerProps {
  oldValue: string;
  newValue: string;
  filename?: string;
  splitView?: boolean;
}

export function DiffViewer({
  oldValue,
  newValue,
  filename,
  splitView = true,
}: DiffViewerProps) {
  const [showSplitView, setShowSplitView] = useState(splitView);

  const handleCopy = () => {
    navigator.clipboard.writeText(newValue);
  };

  const handleDownload = () => {
    const blob = new Blob([newValue], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'changes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {filename || 'Untitled'}
          </span>
          <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
            diff
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSplitView(!showSplitView)}
            className="px-2 py-1 text-xs bg-muted rounded hover:bg-muted/80"
          >
            {showSplitView ? 'Unified' : 'Split'}
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-secondary"
            title="Copy new version"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded hover:bg-secondary"
            title="Download"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Diff */}
      <div className="max-h-[500px] overflow-auto">
        <ReactDiffViewer
          oldValue={oldValue}
          newValue={newValue}
          splitView={showSplitView}
          showDiffOnly={false}
          styles={{
            variables: {
              dark: {
                diffViewerBackground: '#0f0f0f',
                gutterBackground: '#181818',
                addedBackground: '#1a3a2a',
                addedGutterBackground: '#2d5a3d',
                removedBackground: '#3a1a1a',
                removedGutterBackground: '#5a2d2d',
                wordAddedBackground: '#2d6a3d',
                wordRemovedBackground: '#6a2d2d',
                gutterColor: '#666',
              },
            },
            diffContainer: {
              borderRadius: '0',
            },
            line: {
              fontSize: '13px',
              lineHeight: '20px',
            },
            contentText: {
              fontFamily: 'JetBrains Mono, Consolas, monospace',
            },
          }}
        />
      </div>
    </div>
  );
}
