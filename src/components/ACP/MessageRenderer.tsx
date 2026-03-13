import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ToolCallCard } from '@/components/ACP/ToolCallCard';

interface Message {
  id: string;
  type: 'text' | 'thinking' | 'tool_start' | 'tool_complete' | 'tool_error';
  role: 'user' | 'assistant';
  content?: string;
  toolName?: string;
  toolParams?: Record<string, unknown>;
  timestamp: number;
}

interface MessageRendererProps {
  messages: Message[];
}

export function MessageRenderer({ messages }: MessageRendererProps) {
  return (
    <div className="space-y-4 p-4">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  );
}

function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  if (message.type === 'thinking') {
    return (
      <div className="flex items-start gap-3 opacity-60">
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
          <span className="text-xs">💭</span>
        </div>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Thinking...
          </div>
          <div className="animate-pulse text-sm">{message.content}</div>
        </div>
      </div>
    );
  }

  if (message.type === 'tool_start' || message.type === 'tool_complete') {
    return (
      <ToolCallCard
        toolName={message.toolName || 'unknown'}
        params={message.toolParams}
        status={message.type === 'tool_complete' ? 'completed' : 'running'}
        result={message.type === 'tool_complete' ? message.content : undefined}
      />
    );
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isUser ? 'bg-accent' : 'bg-muted'
        }`}
      >
        {isUser ? (
          <span className="text-xs font-bold">U</span>
        ) : (
          <span className="text-xs">🤖</span>
        )}
      </div>

      <div
        className={`flex-1 max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-accent text-accent-foreground'
            : 'bg-muted'
        }`}
      >
        {message.content && (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className="bg-black/20 px-1.5 py-0.5 rounded text-sm" {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

