// Adapted from selected AiRA code; see docs/HARNESS.md.
// Geometry/flight/theme/react subscription fields removed; injected clock and simulation added.
export type TimerStatus = 'stopped' | 'running' | 'paused' | 'done';
export type TimerFields = { label: string; seconds: number };
export type TimerListEntry = TimerFields & { id: string; remaining: number; status: TimerStatus };
type Entry = TimerFields & { startedAt: number | null; startRemaining: number; status: TimerStatus };
export class TimerLedger {
  private entries = new Map<string, Entry>(); private offset = 0;
  constructor(private clock = () => Date.now()) {}
  private now() { return this.clock() + this.offset; }
  private remainingOf(e: Entry) { return e.status !== 'running' || e.startedAt === null ? e.startRemaining : Math.max(0, e.startRemaining - (this.now() - e.startedAt) / 1000); }
  ensure(id: string, fields: TimerFields) {
    const entry = this.entries.get(id);
    if (!entry || entry.seconds !== fields.seconds) this.entries.set(id, { ...fields, startedAt: null, startRemaining: fields.seconds, status: 'stopped' });
    else entry.label = fields.label;
  }
  start(id: string) {
    const e = this.entries.get(id); if (!e) return;
    this.entries.set(id, { ...e, startedAt: this.now(), startRemaining: e.status === 'done' ? e.seconds : this.remainingOf(e), status: 'running' });
  }
  pause(id: string) {
    const e = this.entries.get(id); if (!e || e.status === 'done') return;
    const resuming = e.status !== 'running';
    this.entries.set(id, { ...e, startedAt: resuming ? this.now() : null, startRemaining: this.remainingOf(e), status: resuming ? 'running' : 'paused' });
  }
  reset(id: string) { const e = this.entries.get(id); if (e) this.entries.set(id, { ...e, startedAt: null, startRemaining: e.seconds, status: 'stopped' }); }
  list(): TimerListEntry[] {
    return [...this.entries].map(([id,e]) => {
      const remaining = this.remainingOf(e);
      if (e.status === 'running' && remaining <= 0) { e = { ...e, startedAt: null, startRemaining: 0, status: 'done' }; this.entries.set(id,e); }
      return { id, label:e.label, seconds:e.seconds, remaining, status:e.status };
    });
  }
  finish(id: string) { const e = this.entries.get(id); if (e) this.entries.set(id, { ...e, startedAt: null, startRemaining: 0, status: 'done' }); }
  advance(seconds: number) { this.offset += seconds * 1000; }
  forget(id?: string) { if (id) this.entries.delete(id); else { this.entries.clear(); this.offset = 0; } }
}
