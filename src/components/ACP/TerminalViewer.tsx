import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Maximize2, Minimize2, Trash, Copy } from 'lucide-react';

interface TerminalViewerProps {
  agentId: string;
  output: string[];
  onSendCommand?: (command: string) => void;
}

export function TerminalViewer({ agentId, output, onSendCommand }: TerminalViewerProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const writtenCountRef = useRef(0);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    terminal.current = new Terminal({
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Consolas, monospace',
      theme: {
        background: '#0f0f0f',
        foreground: '#e5e5e5',
        cursor: '#3b82f6',
        selectionBackground: '#3b82f6',
        black: '#000000',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#ec4899',
        cyan: '#06b6d4',
        white: '#e5e5e5',
      },
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      convertEol: true,
    });

    fitAddon.current = new FitAddon();
    terminal.current.loadAddon(fitAddon.current);
    terminal.current.open(terminalRef.current);

    // Handle input - buffer characters and send on Enter
    let inputBuffer = '';
    terminal.current.onData((data) => {
      if (!onSendCommand) return;
      if (data === '\r') {
        if (inputBuffer.trim()) {
          onSendCommand(inputBuffer);
        }
        terminal.current?.writeln('');
        inputBuffer = '';
      } else if (data === '\x7f') {
        // Backspace
        if (inputBuffer.length > 0) {
          inputBuffer = inputBuffer.slice(0, -1);
          terminal.current?.write('\b \b');
        }
      } else {
        inputBuffer += data;
        terminal.current?.write(data);
      }
    });

    // Welcome message
    terminal.current.writeln('\x1b[1;34m╔════════════════════════════════════════╗\x1b[0m');
    terminal.current.writeln('\x1b[1;34m║\x1b[0m      \x1b[1;36mMultiPilot Terminal\x1b[0m              \x1b[1;34m║\x1b[0m');
    terminal.current.writeln('\x1b[1;34m╚════════════════════════════════════════╝\x1b[0m');
    terminal.current.writeln('');
    terminal.current.writeln(`\x1b[90mAgent:\x1b[0m ${agentId}`);
    terminal.current.writeln(`\x1b[90mStatus:\x1b[0m \x1b[32mConnected\x1b[0m`);
    terminal.current.writeln('');

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.current?.fit();
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      terminal.current?.dispose();
      writtenCountRef.current = 0;
    };
  }, [agentId, onSendCommand]);

  // Update terminal with new output
  useEffect(() => {
    if (!terminal.current || output.length === 0) return;

    // Write any lines we haven't written yet
    const startIndex = writtenCountRef.current;
    for (let i = startIndex; i < output.length; i++) {
      terminal.current.writeln(output[i]);
    }
    writtenCountRef.current = output.length;
  }, [output]);

  const handleClear = () => {
    terminal.current?.clear();
  };

  const handleCopy = () => {
    const text = output.join('\n');
    navigator.clipboard.writeText(text);
  };

  if (isMaximized) {
    return (
      <div className="fixed inset-4 z-50 bg-[#0f0f0f] rounded-lg border border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Terminal</span>
            <span className="text-xs text-muted-foreground">{agentId}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded hover:bg-white/10"
              title="Copy output"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={handleClear}
              className="p-1.5 rounded hover:bg-white/10"
              title="Clear"
            >
              <Trash className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMaximized(false)}
              className="p-1.5 rounded hover:bg-white/10"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div ref={terminalRef} className="flex-1 p-2" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Terminal</span>
          <span className="text-xs text-muted-foreground truncate max-w-[150px]">
            {agentId}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-secondary"
            title="Copy output"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={handleClear}
            className="p-1 rounded hover:bg-secondary"
            title="Clear"
          >
            <Trash className="w-3 h-3" />
          </button>
          <button
            onClick={() => setIsMaximized(true)}
            className="p-1 rounded hover:bg-secondary"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div ref={terminalRef} className="flex-1" />
    </div>
  );
}
