import { callArgsOf, linesById, reachableStatements } from './parse-document.js';
import { validateProgram } from './validate.js';
import type { StatementNode } from './openui-model.js';

export function splitReply(reply: string): { prose: string; fences: string[] } {
  const lines = reply.split('\n'), fences: string[] = [], prose: string[] = []; let inside = false, block: string[] = [];
  for (const line of lines) {
    if (line.trim() === '```openui' && !inside) { inside = true; block = []; }
    else if (line.trim() === '```' && inside) { inside = false; fences.push(block.join('\n')); }
    else if (line.includes('```')) throw new Error('Only complete openui fences are supported.');
    else if (inside) block.push(line); else prose.push(line);
  }
  if (inside) throw new Error('The screen fence was incomplete. Retry this turn.');
  return { prose: prose.join('\n').trim(), fences };
}
export class ScreenDocument {
  program = ''; cursor = ''; prose = ''; clearVersion = 0;
  apply(reply: string) {
    const parsed = splitReply(reply); let program = this.program, cursor = this.cursor, clears = 0;
    for (const fence of parsed.fences) {
      const lines = fence.split('\n').filter(l => l.trim());
      if (lines.length === 1 && /^root\s*=\s*Screens\(\[\]\)\s*$/.test(lines[0].trim())) { program = ''; cursor = ''; clears++; continue; }
      const next = [program, fence].filter(Boolean).join('\n');
      const root = validateProgram(next); const screens = root.props.screens as StatementNode[];
      const rootLine = lines.find(l => /^root\s*=/.test(l.trim()));
      const requested = rootLine ? callArgsOf(rootLine)?.args[1] : undefined;
      if (requested?.k === 'ref') cursor = requested.v;
      if (!screens.some(s => s.key === cursor)) cursor = screens[0]?.key ?? '';
      program = next;
    }
    this.program = program; this.cursor = cursor; this.prose = parsed.prose; this.clearVersion += clears;
  }
  get screens(): StatementNode[] { return this.program ? validateProgram(this.program).props.screens as StatementNode[] : []; }
  get current(): StatementNode | undefined { return this.screens.find(s => s.key === this.cursor); }
  move(index: number) { const target = this.screens[index]; if (target) this.cursor = target.key; }
  echo(): string {
    if (!this.program) return '';
    const reached = reachableStatements(this.program); const bindings = [...linesById(this.program)].filter(([id]) => reached?.has(id));
    const root = `root = Screens([${this.screens.map(s => s.key).join(', ')}]${this.cursor ? `, ${this.cursor}` : ''})`;
    return bindings.map(([id,line]) => id === 'root' ? root : line).join('\n');
  }
  reset() { this.program = ''; this.cursor = ''; this.prose = ''; this.clearVersion++; }
}
