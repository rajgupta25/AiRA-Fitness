import { el, button } from './dom.js';
import type { StatementNode } from '../shared/openui/openui-model.js';
import type { TimerLedger } from '../shared/openui/timer-store.js';
export type Context = {
  send: (text: string) => void;
  timers: TimerLedger;
  timerAction: (id: string, action: 'start' | 'pause' | 'reset' | 'finish') => void;
  updates: (() => void)[];
  paused: boolean;
  nextStep?: () => void;
};
// Trusted DOM ports of the source component signatures; no model-generated code.
export const renderers: Record<string,(node:StatementNode,context:Context)=>HTMLElement> = {
  Text: ({props:p}) => el(p.variant==='title'?'h3':p.variant==='subtitle'?'h4':'p',String(p.text),'block block-'+String(p.variant??'body')),
  Keyword: ({props:p}) => {const n=el('div','','keyword');n.append(el('strong',String(p.text)));if(p.caption)n.append(el('p',String(p.caption)));return n;},
  Alert: ({props:p}) => el('aside',String(p.text),'block alert'),
  List: ({props:p},c) => {const n=el('ul','','block');for(const row of p.items as StatementNode[])n.append(renderComponent(row,c));return n;},
  ListItem: ({props:p}) => el('li',String(p.text)),
  FollowUps: ({props:p},c) => {
    const deck = el('div', '', 'action-deck');
    const header = el('div', '', 'action-deck-header');
    header.append(el('span', 'COACH QUICK ACTIONS', 'micro label-caps action-title'));
    deck.append(header);
    const grid = el('div', '', 'action-chips-grid');
    const prompts = (p.prompts as string[]) || [];
    prompts.forEach(text => {
      const btn = button(text, () => c.send(text), 'quick-action-chip');
      btn.type = 'button';
      btn.setAttribute('aria-label', text);
      if (c.paused) btn.disabled = true;
      grid.append(btn);
    });
    deck.append(grid);
    return deck;
  },
  Timer: ({key,props:p},c) => {
    const isWorkoutTimer = String(p.label) !== 'Sample timer';
    const n=el('section','','timer');n.setAttribute('aria-label',String(p.label));
    n.append(el('p',isWorkoutTimer ? 'INTER-VARIATION RECOVERY · BOX BREATHING' : 'SIMULATED TIMER · LOCAL ONLY','eyebrow'),el('h3',String(p.label)));
    const value=el('strong'),status=el('span','','micro timer-status'),row=el('div','','row');
    const start=button('Start simulation',()=>c.timerAction(key,'start')),pause=button('Pause timer',()=>c.timerAction(key,'pause')),reset=button('Reset timer',()=>c.timerAction(key,'reset')),finish=button('Simulate finish',()=>c.timerAction(key,'finish'));
    row.append(start,pause,reset,finish);

    let skipBtn: HTMLButtonElement | null = null;
    let autoNotice: HTMLElement | null = null;
    if (isWorkoutTimer) {
      skipBtn = button('Skip Rest & Start Next Variation →', () => {
        c.timerAction(key, 'finish');
      }, 'btn-skip-rest');
      skipBtn.type = 'button';
      row.append(skipBtn);
      autoNotice = el('div', 'Auto-advancing to next exercise variation upon rest completion', 'micro timer-auto-notice');
    }

    const breathBox=el('div','','breath-pacer');
    breathBox.append(el('div','','breath-circle-indicator'),el('span','Box Breathing · Inhale 4s · Hold 4s · Exhale 4s · Hold 4s','micro breath-text'));
    n.append(value,status,row,el('p','Finishing records a local timer event.','micro'),breathBox);
    if (autoNotice) n.append(autoNotice);

    let hasAutoStarted = false;
    let hasAutoAdvanced = false;

    const update=()=>{
      const entry=c.timers.list().find(t=>t.id===key);
      if(!entry)return;
      const seconds=Math.ceil(entry.remaining);
      value.textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
      status.textContent=entry.status;
      start.hidden=entry.status==='running'||entry.status==='paused';
      start.textContent=entry.status==='done'?'Restart simulation':'Start simulation';
      pause.hidden=entry.status==='stopped'||entry.status==='done';
      pause.textContent=entry.status==='paused'?'Resume timer':'Pause timer';
      for(const b of [start,pause,reset,finish])b.disabled=c.paused;
      if (skipBtn) (skipBtn as HTMLButtonElement).disabled = c.paused || entry.status === 'done';

      if (isWorkoutTimer && !hasAutoStarted && entry.status === 'stopped' && !c.paused) {
        hasAutoStarted = true;
        c.timerAction(key, 'start');
      }

      if (isWorkoutTimer && entry.status === 'done' && !hasAutoAdvanced) {
        hasAutoAdvanced = true;
        if (autoNotice) {
          autoNotice.textContent = '✓ Rest Complete! Advancing to next exercise variation...';
          autoNotice.classList.add('auto-advance-active');
        }
        setTimeout(() => {
          if (c.nextStep) c.nextStep();
          else c.send('next');
        }, 600);
      }
    };
    c.updates.push(update);update();return n;
  },
  ExerciseCard: ({props:p}, context) => {
    const card=el('article','','exercise-card');
    const header=el('div','','exercise-card-header');
    header.append(el('span',String(p.target).toUpperCase(),'badge badge-target'),el('span',String(p.reps),'badge badge-reps'));
    card.append(header,el('h3',String(p.name),'exercise-title'));
    if(p.guidance){const g=el('div','','exercise-guidance');g.append(el('strong','COACH TIP: ','guidance-label'),el('span',String(p.guidance)));card.append(g);}

    // Interactive Set & Inter-Set Break Engine
    const repsStr = String(p.reps ?? '3 Sets · 10 Reps');
    const setMatch = repsStr.match(/(\d+)\s*Sets?/i);
    const totalSets = setMatch ? Math.max(1, parseInt(setMatch[1], 10)) : 3;

    const isHiit = repsStr.toLowerCase().includes('max effort') || repsStr.toLowerCase().includes('sec');
    const isMobility = repsStr.toLowerCase().includes('side') || repsStr.toLowerCase().includes('controlled');
    const defaultWorkSec = isHiit ? 30 : 40;
    const defaultRestSec = isHiit ? 30 : isMobility ? 20 : 60;

    let currentSet = 1;
    let phase: 'ready' | 'working' | 'resting' | 'done' = 'ready';
    let workSec = defaultWorkSec;
    let restSec = defaultRestSec;
    let lastSecondTs = Date.now();

    const setHub = el('div', '', 'set-tracker-hub');

    // 1. Set Progress Pills
    const pillsRow = el('div', '', 'set-pills-row');
    const updatePills = () => {
      pillsRow.replaceChildren();
      for (let s = 1; s <= totalSets; s++) {
        const isDone = s < currentSet || phase === 'done';
        const isActive = s === currentSet && phase !== 'done';
        const pill = el('div', '', `set-pill ${isDone ? 'done' : isActive ? 'active ' + phase : 'upcoming'}`);
        pill.append(
          el('span', isDone ? '✓' : `SET ${s}`, 'set-pill-label'),
          el('span', isDone ? 'Done' : isActive ? (phase === 'working' ? `${workSec}s Work` : phase === 'resting' ? `${restSec}s Break` : 'Ready') : 'Queued', 'set-pill-status')
        );
        pillsRow.append(pill);
      }
    };

    // 2. Active Set HUD & Work/Rest Controller
    const hud = el('div', '', 'set-hud-panel');
    let clockEl: HTMLElement | null = null;

    const renderHud = () => {
      hud.replaceChildren();
      clockEl = null;
      updatePills();

      if (phase === 'ready') {
        const titleRow = el('div', '', 'hud-title-row');
        titleRow.append(el('strong', `SET ${currentSet} OF ${totalSets} · READY TO EXECUTE`, 'hud-heading'));
        const sub = el('p', `Target: ${repsStr} · Focus on disciplined posture and steady tempo`, 'micro hud-sub');

        const actRow = el('div', '', 'hud-action-row');
        const startBtn = button(`Start Set ${currentSet} (${defaultWorkSec}s Work Clock)`, () => {
          phase = 'working';
          workSec = defaultWorkSec;
          lastSecondTs = Date.now();
          renderHud();
        }, 'btn-hud-primary');
        startBtn.type = 'button';
        if (context.paused) startBtn.disabled = true;

        const completeBtn = button(
          currentSet >= totalSets ? `✓ Complete Set ${currentSet} (Final) & Advance` : `✓ Complete Set ${currentSet} Now`,
          () => {
            if (currentSet >= totalSets) {
              phase = 'done';
              renderHud();
              setTimeout(() => {
                if (context.nextStep) context.nextStep();
                else context.send('next');
              }, 600);
            } else {
              phase = 'resting';
              restSec = defaultRestSec;
              lastSecondTs = Date.now();
              renderHud();
            }
          },
          'btn-hud-secondary'
        );
        completeBtn.type = 'button';
        if (context.paused) completeBtn.disabled = true;

        actRow.append(startBtn, completeBtn);
        hud.append(titleRow, sub, actRow);
      } else if (phase === 'working') {
        clockEl = el('span', `${Math.floor(workSec / 60)}:${String(workSec % 60).padStart(2, '0')}`, 'hud-clock work-clock');
        const titleRow = el('div', '', 'hud-title-row');
        titleRow.append(
          el('strong', `SET ${currentSet} OF ${totalSets} · ACTIVE WORK INTERVAL`, 'hud-heading active-work'),
          clockEl
        );
        const cadence = el('div', '', 'work-cadence-bar');
        cadence.append(
          el('span', '● 3s Eccentric (Lower)', 'cadence-step'),
          el('span', '● 0s Pause', 'cadence-step'),
          el('span', '● 1s Concentric (Drive)', 'cadence-step')
        );
        const actRow = el('div', '', 'hud-action-row');
        const doneBtn = button(
          currentSet >= totalSets ? `✓ Complete Set ${currentSet} (Final) & Advance` : `✓ Complete Set ${currentSet}`,
          () => {
            if (currentSet >= totalSets) {
              phase = 'done';
              renderHud();
              setTimeout(() => {
                if (context.nextStep) context.nextStep();
                else context.send('next');
              }, 600);
            } else {
              phase = 'resting';
              restSec = defaultRestSec;
              lastSecondTs = Date.now();
              renderHud();
            }
          },
          'btn-hud-primary btn-work-done'
        );
        doneBtn.type = 'button';
        if (context.paused) doneBtn.disabled = true;

        actRow.append(doneBtn);
        hud.append(titleRow, cadence, actRow);
      } else if (phase === 'resting') {
        clockEl = el('span', `${Math.floor(restSec / 60)}:${String(restSec % 60).padStart(2, '0')}`, 'hud-clock rest-clock');
        const titleRow = el('div', '', 'hud-title-row');
        titleRow.append(
          el('strong', currentSet >= totalSets ? `SET ${currentSet} COMPLETE! FINAL SET CONQUERED` : `SET ${currentSet} COMPLETE! REST BREAK BEFORE SET ${currentSet + 1}`, 'hud-heading active-rest'),
          clockEl
        );
        const breath = el('div', '', 'hud-breath-pacer');
        breath.append(
          el('div', '', 'hud-breath-circle'),
          el('span', 'Box Breathing: Inhale 4s · Hold 4s · Exhale 4s · Hold 4s', 'micro')
        );
        const actRow = el('div', '', 'hud-action-row');
        const extBtn = button('+15s Rest', () => {
          restSec += 15;
          if (clockEl) clockEl.textContent = `${Math.floor(restSec / 60)}:${String(restSec % 60).padStart(2, '0')}`;
        }, 'btn-hud-secondary');
        extBtn.type = 'button';

        const skipBtn = button(
          currentSet >= totalSets ? 'Advance to Next Exercise Variation →' : `Skip Break & Start Set ${currentSet + 1} →`,
          () => {
            if (currentSet >= totalSets) {
              phase = 'done';
              renderHud();
              if (context.nextStep) context.nextStep();
              else context.send('next');
            } else {
              currentSet++;
              phase = 'ready';
              workSec = defaultWorkSec;
              renderHud();
            }
          },
          'btn-hud-primary'
        );
        skipBtn.type = 'button';
        if (context.paused) {
          extBtn.disabled = true;
          skipBtn.disabled = true;
        }

        actRow.append(extBtn, skipBtn);
        hud.append(titleRow, breath, actRow);
      } else if (phase === 'done') {
        const doneWrap = el('div', '', 'hud-complete-wrap');
        doneWrap.append(
          el('strong', `ALL ${totalSets} SETS COMPLETED! VARIATION CONQUERED`, 'hud-done-title'),
          el('p', `Volume target achieved for ${p.name}. Ready to advance to the next exercise variation in this split.`, 'micro')
        );
        const nextBtn = button('Advance to Next Exercise Variation →', () => {
          if (context.nextStep) context.nextStep();
          else context.send('next');
        }, 'btn-hud-primary btn-advance-variation');
        nextBtn.type = 'button';
        if (context.paused) nextBtn.disabled = true;

        doneWrap.append(nextBtn);
        hud.append(doneWrap);
      }
    };

    renderHud();
    setHub.append(pillsRow, hud);
    card.append(setHub);

    // Register with context.updates tick loop (runs every 250ms)
    const tickUpdate = () => {
      if (context.paused) return;
      const now = Date.now();
      if (now - lastSecondTs >= 1000) {
        lastSecondTs = now;
        if (phase === 'working') {
          workSec = Math.max(0, workSec - 1);
          if (clockEl) clockEl.textContent = `${Math.floor(workSec / 60)}:${String(workSec % 60).padStart(2, '0')}`;
          if (workSec === 0) {
            if (currentSet >= totalSets) {
              phase = 'done';
              renderHud();
              setTimeout(() => {
                if (context.nextStep) context.nextStep();
                else context.send('next');
              }, 600);
            } else {
              phase = 'resting';
              restSec = defaultRestSec;
              renderHud();
            }
          }
        } else if (phase === 'resting') {
          restSec = Math.max(0, restSec - 1);
          if (clockEl) clockEl.textContent = `${Math.floor(restSec / 60)}:${String(restSec % 60).padStart(2, '0')}`;
          if (restSec === 0) {
            if (currentSet < totalSets) {
              currentSet++;
              phase = 'working';
              workSec = defaultWorkSec;
              renderHud();
            } else {
              phase = 'done';
              renderHud();
              if (context.nextStep) context.nextStep();
              else context.send('next');
            }
          }
        }
      }
    };

    context.updates.push(tickUpdate);
    return card;
  },
  MetricBadge: ({props:p}) => {
    const tone=String(p.tone??'volt');
    const badge=el('div','',`metric-badge tone-${tone}`);
    badge.append(el('span',String(p.label).toUpperCase(),'metric-label'),el('strong',String(p.value),'metric-value'));
    return badge;
  },
  WorkoutSummary: ({props:p}) => {
    const card=el('section','','workout-summary');
    const trophy=el('div','SESSION CRUSHED · WORKOUT COMPLETE','summary-trophy');
    card.append(trophy,el('h3',String(p.title),'summary-title'));
    const grid=el('div','','summary-grid');
    const stat1=el('div','','summary-stat');stat1.append(el('strong',String(p.calories),'stat-val'),el('span','EST. BURN','stat-lbl'));
    const stat2=el('div','','summary-stat');stat2.append(el('strong',String(p.duration),'stat-val'),el('span','TOTAL DURATION','stat-lbl'));
    const stat3=el('div','','summary-stat');stat3.append(el('strong',String(p.xp),'stat-val'),el('span','COACH SCORE','stat-lbl'));
    grid.append(stat1,stat2,stat3);card.append(grid);
    return card;
  },
};
export function renderComponent(node:StatementNode,context:Context):HTMLElement {
  if(!Object.hasOwn(renderers,node.name))throw new Error('No renderer for '+node.name);
  const n=renderers[node.name](node,context);n.dataset.statement=node.key;
  if(typeof node.props.color==='string' && /^#[0-9a-fA-F]{6}$/.test(node.props.color))n.style.color=node.props.color;
  return n;
}
