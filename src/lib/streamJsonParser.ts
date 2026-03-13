/**
 * Parser for Claude Code's `--output-format stream-json` output.
 *
 * With `--include-partial-messages`, Claude emits these event types:
 * - system: Session init, compact boundaries
 * - assistant: Complete assistant messages (text + tool_use content blocks)
 * - user: Tool results sent back
 * - stream_event: Real-time API streaming (text_delta, input_json_delta)
 * - result: Final result with cost, usage, session_id
 *
 * Without `--include-partial-messages`, only system/assistant/user/result are emitted.
 */

export interface ParsedOutput {
  /** Human-readable lines to show in the output panel */
  displayLines: string[];
  /** Optional structured update for the updates panel */
  update?: {
    type: 'message' | 'thinking' | 'tool_start' | 'tool_complete' | 'tool_error' | 'output' | 'plan';
    content?: string;
    toolName?: string;
  };
  /** If true, the agent is now waiting for input */
  isInputRequest?: boolean;
}

/**
 * Try to parse a single line of stream-json output from Claude.
 * Returns parsed result, or null if the line isn't valid JSON / isn't from Claude's stream format.
 */
export function parseStreamJsonLine(line: string): ParsedOutput | null {
  if (!line.trim()) return null;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(line);
  } catch {
    return null;
  }

  if (!data.type) return null;

  const type = data.type as string;
  const subtype = data.subtype as string | undefined;

  switch (type) {
    // ── System messages ──────────────────────────────────────────────
    case 'system': {
      if (subtype === 'init') {
        const sessionId = (data.session_id as string) || '';
        const tools = data.tools as string[] | undefined;
        const toolCount = tools?.length || 0;
        return {
          displayLines: [
            `[Claude] Session started${sessionId ? ` (${sessionId.slice(0, 8)})` : ''}${toolCount ? ` — ${toolCount} tools` : ''}`,
          ],
        };
      }
      if (subtype === 'compact_boundary') {
        return { displayLines: ['[Claude] Context compacted'] };
      }
      const msg = (data.message as string) || '';
      if (msg) return { displayLines: [`[Claude] ${msg}`] };
      return { displayLines: [] };
    }

    // ── stream_event: Real-time streaming from --include-partial-messages ──
    case 'stream_event': {
      const event = data.event as Record<string, unknown> | undefined;
      if (!event) return { displayLines: [] };

      const eventType = event.type as string;

      // Text streaming delta — show real-time text as it arrives
      if (eventType === 'content_block_delta') {
        const delta = event.delta as Record<string, unknown> | undefined;
        if (!delta) return { displayLines: [] };

        if (delta.type === 'text_delta') {
          const text = (delta.text as string) || '';
          if (!text) return { displayLines: [] };
          // Split by newlines for display, filter empty
          const lines = text.split('\n');
          const displayLines = lines.filter(l => l.length > 0);
          if (displayLines.length === 0 && text.includes('\n')) {
            return { displayLines: [] }; // Just newlines
          }
          return { displayLines };
        }

        // Tool input streaming — skip to avoid noise (tool_use events have full data)
        if (delta.type === 'input_json_delta') {
          return { displayLines: [] };
        }

        // Thinking delta
        if (delta.type === 'thinking_delta') {
          const thinking = (delta.thinking as string) || '';
          if (!thinking.trim()) return { displayLines: [] };
          const preview = thinking.slice(0, 100).replace(/\n/g, ' ');
          return {
            displayLines: [`[thinking] ${preview}${thinking.length > 100 ? '...' : ''}`],
          };
        }
      }

      // Content block start — detect tool_use start
      if (eventType === 'content_block_start') {
        const contentBlock = event.content_block as Record<string, unknown> | undefined;
        if (contentBlock?.type === 'tool_use') {
          const toolName = (contentBlock.name as string) || 'unknown';
          return {
            displayLines: [`[tool] ${toolName}...`],
            update: { type: 'tool_start', toolName },
          };
        }
        if (contentBlock?.type === 'thinking') {
          return { displayLines: ['[thinking...]'] };
        }
      }

      // Message delta — check for stop reason
      if (eventType === 'message_delta') {
        const delta = event.delta as Record<string, unknown> | undefined;
        const usage = event.usage as Record<string, unknown> | undefined;
        const stopReason = delta?.stop_reason as string | undefined;
        if (stopReason === 'end_turn') {
          const outputTokens = usage?.output_tokens as number | undefined;
          return {
            displayLines: [`[turn complete${outputTokens ? ` · ${outputTokens} tokens` : ''}]`],
          };
        }
      }

      // Other stream events — suppress
      return { displayLines: [] };
    }

    // ── assistant: Complete assistant message ─────────────────────────
    case 'assistant': {
      // When --include-partial-messages is on, we already got the streaming deltas.
      // The 'assistant' message is the complete consolidated message.
      // Extract tool_use blocks from content for structured updates.
      const content = data.content as Array<Record<string, unknown>> | undefined;
      if (!content || !Array.isArray(content)) {
        // Legacy format: subtype-based
        if (subtype === 'text') {
          const text = (data.text as string) || '';
          if (!text.trim()) return { displayLines: [] };
          const lines = text.split('\n').filter(l => l.trim());
          return {
            displayLines: lines,
            update: { type: 'message', content: text.slice(0, 500) },
          };
        }
        if (subtype === 'thinking') {
          const thinking = (data.text as string) || '';
          if (!thinking.trim()) return { displayLines: [] };
          const preview = thinking.slice(0, 120).replace(/\n/g, ' ');
          return {
            displayLines: [`[thinking] ${preview}${thinking.length > 120 ? '...' : ''}`],
            update: { type: 'thinking', content: thinking.slice(0, 500) },
          };
        }
        return { displayLines: [] };
      }

      // Content blocks format (from complete assistant message)
      const displayLines: string[] = [];
      let lastUpdate: ParsedOutput['update'] | undefined;

      for (const block of content) {
        if (block.type === 'text') {
          const text = (block.text as string) || '';
          if (text.trim()) {
            displayLines.push(...text.split('\n').filter(l => l.trim()));
            lastUpdate = { type: 'message', content: text.slice(0, 500) };
          }
        } else if (block.type === 'tool_use') {
          const toolName = (block.name as string) || 'unknown';
          const input = block.input as Record<string, unknown> | undefined;
          let detail = '';
          if (input) {
            if (input.file_path) detail = ` → ${input.file_path}`;
            else if (input.path) detail = ` → ${input.path}`;
            else if (input.command) detail = ` → ${String(input.command).slice(0, 80)}`;
            else if (input.pattern) detail = ` → ${input.pattern}`;
          }
          displayLines.push(`[tool] ${toolName}${detail}`);
          lastUpdate = { type: 'tool_start', toolName };
        } else if (block.type === 'thinking') {
          const thinking = (block.thinking as string) || '';
          if (thinking.trim()) {
            const preview = thinking.slice(0, 120).replace(/\n/g, ' ');
            displayLines.push(`[thinking] ${preview}${thinking.length > 120 ? '...' : ''}`);
          }
        }
      }

      return { displayLines, update: lastUpdate };
    }

    // ── user: Tool results ───────────────────────────────────────────
    case 'user': {
      const content = data.content as Array<Record<string, unknown>> | undefined;
      if (!content || !Array.isArray(content)) return { displayLines: [] };

      const displayLines: string[] = [];
      let lastUpdate: ParsedOutput['update'] | undefined;

      for (const block of content) {
        if (block.type === 'tool_result') {
          const toolUseId = (block.tool_use_id as string) || '';
          const isError = block.is_error === true;
          const resultContent = block.content as string | Array<Record<string, unknown>> | undefined;

          let text = '';
          if (typeof resultContent === 'string') {
            text = resultContent;
          } else if (Array.isArray(resultContent)) {
            text = resultContent
              .filter(c => c.type === 'text')
              .map(c => c.text as string)
              .join('\n');
          }

          if (isError) {
            const preview = text.slice(0, 200);
            displayLines.push(`[tool error] ${preview}`);
            lastUpdate = { type: 'tool_error', content: preview };
          } else {
            const preview = text.slice(0, 150).replace(/\n/g, ' ');
            if (preview) {
              displayLines.push(`[result] ${preview}${text.length > 150 ? '...' : ''}`);
            } else {
              displayLines.push(`[done] ${toolUseId.slice(0, 8)}`);
            }
            lastUpdate = { type: 'tool_complete', content: preview };
          }
        }
      }

      return { displayLines, update: lastUpdate };
    }

    // ── result: Final completion ─────────────────────────────────────
    case 'result': {
      const result = (data.result as string) || '';
      const subType = data.subtype as string | undefined;
      const totalCost = data.total_cost_usd as number | undefined;
      const usage = data.usage as Record<string, unknown> | undefined;
      const numTurns = data.num_turns as number | undefined;
      const sessionId = data.session_id as string | undefined;

      const lines: string[] = [];

      if (result && subType !== 'error_during_execution') {
        lines.push(...result.split('\n').filter(l => l.trim()).slice(0, 5));
      }

      const meta: string[] = [];
      if (totalCost !== undefined) meta.push(`$${totalCost.toFixed(4)}`);
      if (numTurns !== undefined) meta.push(`${numTurns} turns`);
      if (usage) {
        const inputTokens = usage.input_tokens as number | undefined;
        const outputTokens = usage.output_tokens as number | undefined;
        if (inputTokens && outputTokens) {
          meta.push(`${Math.round((inputTokens + outputTokens) / 1000)}k tokens`);
        }
      }

      const statusPrefix = subType === 'success' ? 'completed'
        : subType === 'error_max_turns' ? 'max turns reached'
        : subType === 'error_max_budget_usd' ? 'budget limit reached'
        : subType === 'error_during_execution' ? 'error'
        : 'completed';

      lines.push(`[${statusPrefix}]${meta.length > 0 ? ' ' + meta.join(' · ') : ''}`);

      if (sessionId) {
        lines.push(`[session] ${sessionId}`);
      }

      return { displayLines: lines };
    }

    // ── error ────────────────────────────────────────────────────────
    case 'error': {
      const errorObj = data.error as Record<string, unknown> | undefined;
      const errorMsg = errorObj?.message as string
        || (data.message as string)
        || JSON.stringify(data);
      return {
        displayLines: [`[error] ${errorMsg}`],
        update: { type: 'tool_error', content: errorMsg },
      };
    }

    // ── Suppress low-level events ────────────────────────────────────
    case 'content_block_start':
    case 'content_block_delta':
    case 'content_block_stop':
    case 'message_start':
    case 'message_delta':
    case 'message_stop':
      return { displayLines: [] };

    default:
      return { displayLines: [`[${type}] ${JSON.stringify(data).slice(0, 200)}`] };
  }
}

/**
 * Check if a profile's command is Claude Code (and thus uses stream-json).
 */
export function isClaudeCommand(acpCommand: string): boolean {
  const cmd = acpCommand.toLowerCase();
  return cmd === 'claude' || cmd === 'claude.cmd'
    || cmd.endsWith('/claude') || cmd.endsWith('\\claude')
    || cmd.endsWith('\\claude.exe');
}

/**
 * Check if a profile's command outputs JSON (for non-Claude agents like Codex, Goose).
 */
export function isJsonOutputAgent(acpCommand: string): boolean {
  const cmd = acpCommand.toLowerCase();
  return cmd === 'codex' || cmd === 'codex.cmd'
    || cmd === 'goose' || cmd === 'goose.exe';
}
