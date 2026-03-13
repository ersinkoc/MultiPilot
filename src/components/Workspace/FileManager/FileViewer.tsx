import { useEffect, useState, useCallback, useRef } from 'react';
import { useFileStore } from '@/stores/fileStore';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Save, Edit2, Eye, FileCode, Trash2, X, Copy, Check, Loader2 } from 'lucide-react';

interface FileViewerProps {
  tabId: string;
}

const getLanguage = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    css: 'css',
    scss: 'scss',
    html: 'html',
    xml: 'xml',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    dockerfile: 'dockerfile',
    toml: 'toml',
    vue: 'vue',
    svelte: 'svelte',
  };

  return languageMap[ext] || 'text';
};

export function FileViewer({ tabId }: FileViewerProps) {
  const { openTabs, closeTab, saveFile, updateFileContent, deleteFile, discardChanges } = useFileStore();
  const tab = openTabs.find((t) => t.id === tabId);
  const [editContent, setEditContent] = useState(tab?.content || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const originalContentRef = useRef(tab?.content || '');

  useEffect(() => {
    if (tab?.content) {
      setEditContent(tab.content);
      if (!isEditing) {
        originalContentRef.current = tab.content;
      }
    }
  }, [tab?.content, isEditing]);

  const handleSave = useCallback(async () => {
    if (!tab) return;

    setIsSaving(true);
    try {
      // Save via fileStore - update the tab content first
      updateFileContent(tabId, editContent);
      const success = await saveFile(tabId);
      if (success) {
        setIsEditing(false);
        originalContentRef.current = editContent;
      }
    } catch (error) {
      console.error('Failed to save file:', error);
    } finally {
      setIsSaving(false);
    }
  }, [saveFile, tabId, tab, editContent, updateFileContent]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    originalContentRef.current = tab?.content || '';
    setEditContent(tab?.content || '');
  }, [tab?.content]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditContent(originalContentRef.current);
    // Reset modified state in fileStore
    discardChanges(tabId);
  }, [tabId, discardChanges]);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setEditContent(newContent);
    updateFileContent(tabId, newContent);
  }, [updateFileContent, tabId]);

  const handleCopy = useCallback(async () => {
    if (tab?.content) {
      await navigator.clipboard.writeText(tab.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [tab?.content]);

  const handleDelete = useCallback(async () => {
    if (!tab) return;
    const confirmed = window.confirm(`Delete "${tab.name}"?`);
    if (confirmed) {
      const success = await deleteFile(tab.path);
      if (success) {
        closeTab(tabId);
      }
    }
  }, [tab, deleteFile, closeTab, tabId]);

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isEditing && tab?.isModified) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, tab?.isModified, handleSave]);

  if (tab?.isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading file...
        </div>
      </div>
    );
  }

  if (!tab) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <X className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>File not found</p>
        </div>
      </div>
    );
  }

  const language = getLanguage(tab.name);
  const isTextFile = language !== 'text' || tab.content !== null;
  const isEditable = !['png', 'jpg', 'jpeg', 'gif', 'ico', 'pdf', 'exe', 'dll'].includes(
    tab.name.split('.').pop()?.toLowerCase() || ''
  );

  if (!isTextFile) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <FileCode className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Binary files cannot be displayed</p>
          <p className="text-sm mt-2 text-muted-foreground">{tab.path}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{tab.name}</span>
          {tab.isModified && (
            <span className="text-xs text-accent font-medium">● modified</span>
          )}
          <span className="text-xs text-muted-foreground ml-2">
            {language !== 'text' ? language.toUpperCase() : 'Plain Text'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving || !tab.isModified}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-accent-foreground rounded-md hover:bg-accent/90 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium hover:bg-secondary rounded-md"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium hover:bg-secondary rounded-md"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>
              {isEditable && (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium hover:bg-secondary rounded-md"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </button>
              )}
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium hover:bg-red-500/20 text-red-400 rounded-md"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor/Viewer */}
      <div className="flex-1 overflow-auto bg-background">
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={handleContentChange}
            className="w-full h-full p-4 bg-background font-mono text-sm resize-none focus:outline-none"
            spellCheck={false}
            autoFocus
          />
        ) : (
          <div className="min-h-full">
            {language === 'text' ? (
              <pre className="p-4 font-mono text-sm whitespace-pre-wrap">{tab.content || ''}</pre>
            ) : (
              <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  background: 'transparent',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  minHeight: '100%',
                }}
                showLineNumbers
                lineNumberStyle={{
                  minWidth: '3em',
                  paddingRight: '1em',
                  color: '#666',
                  textAlign: 'right',
                }}
              >
                {tab.content || ''}
              </SyntaxHighlighter>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-muted text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{tab.content?.length || 0} characters</span>
          <span>{tab.content?.split('\n').length || 0} lines</span>
        </div>
        <div>
          {isEditing ? (
            <span className="text-accent">Editing</span>
          ) : (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              View Only
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
