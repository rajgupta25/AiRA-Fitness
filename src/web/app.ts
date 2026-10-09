import { Conversation } from '../shared/controller.js';
import { APP_VERSION, SCHEMA_VERSION, type Provider, type ProviderStatus, type RequestData, type Result } from '../shared/contracts.js';
import { TimerLedger, type TimerListEntry } from '../shared/openui/timer-store.js';
import { activityClientEvents, timerTransitionEvent } from '../shared/openui/activity-client-events.js';
import { createRunNav } from '../shared/openui/run-nav.js';
import { splitReply } from '../shared/openui/document.js';
import type { StatementNode } from '../shared/openui/openui-model.js';
import { redactValue } from '../shared/redact.js';
import { renderComponent } from './components.js';
import { byId,el,button } from './dom.js';

type Config={providers:ProviderStatus[];token:string};let config:Config|undefined;
const timers=new TimerLedger();let previousTimers=new Map<string,TimerListEntry>(),updates:(()=>void)[]=[],paused=false,pausedTimers:string[]=[],renderKey='',lastClear=0;
const draft=byId<HTMLTextAreaElement>('message');
const c=new Conversation(async(request:RequestData,signal:AbortSignal):Promise<Result>=>{
  const controller=new AbortController(),abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});const timeout=setTimeout(abort,request.provider==='claude-cli'?85000:48000);
  try{const response=await fetch('/api/turn',{method:'POST',headers:{'Content-Type':'application/json','X-Local-Token':config!.token},body:JSON.stringify(request),signal:controller.signal});const data=await response.json();if(!response.ok)throw new Error(data.error??'Request failed.');return data;}
  catch(error){if(error instanceof Error && error.name==='AbortError')throw new Error('Request cancelled or timed out. Retry when ready.');throw error;}
  finally{clearTimeout(timeout);signal.removeEventListener('abort',abort);}
},render,()=>[...(paused?['Preview is currently paused.']:[]),...timers.list().map(t=>`Simulated timer ${t.id} (${t.label}): ${t.status}, ${Math.ceil(t.remaining)} of ${t.seconds} seconds remaining.`)]);
function makeNav(){return createRunNav({index:()=>c.document.screens.findIndex(s=>s.key===c.document.cursor),stepCount:()=>c.document.screens.length,isConsumed:()=>false,awaiting:()=>false,leave:()=>{if(c.pending)c.cancel('interrupted');},land:(from,to)=>{c.document.move(to);c.localEvent(to<from?activityClientEvents.wentBack(`step ${from+1}`,`step ${to+1}`):activityClientEvents.nowOnStep(`step ${to+1} of ${c.document.screens.length}`));},phase:()=>{},finish:()=>c.localEvent('Reached the final screen. This is not evidence of physical completion.')},{outMs:30,inMs:30});}
let nav=makeNav();
function send(text:string){if(!config)return;const provider=config.providers.find(p=>p.id===c.provider)!;if(!provider.enabled||(c.provider!=='mock'&&!c.consent)){c.error='Set up this provider and agree to usage, or select Mock.';render();return;}if(paused){c.error='Resume the preview before sending.';render();return;}const f=byId<HTMLSelectElement>('fault');const fault=f.value as RequestData['fault'];f.value='none';void c.send(text,fault);}
const COACH_EXERCISE_CUES: Record<string, string[]> = {
  squat: [
    'Coach Aira: "Drive aggressively through your midfoot and keep your chest proud!"',
    'Coach Aira: "Brace your core tight. Control the 3-second eccentric tempo down!"',
    'Coach Aira: "Keep knees tracking over your toes. Full depth, explode up!"',
    'Coach Aira: "Lock in those glutes at the top. Two more disciplined reps!"'
  ],
  press: [
    'Coach Aira: "Retract and depress your scapulae into the bench. Protect the rotator cuff!"',
    'Coach Aira: "Lower smoothly for 3 seconds, then drive up with authority!"',
    'Coach Aira: "Exhale through the concentric phase. Keep your wrists stacked over your elbows!"',
    'Coach Aira: "Maintain tension across your upper chest. Pure power!"'
  ],
  deadlift: [
    'Coach Aira: "Push your hips straight back to the rear wall. Keep weights scraping your shins!"',
    'Coach Aira: "Flat back, neutral spine. Feel that deep hamstring and glute loading!"',
    'Coach Aira: "Drive hips forward at the top and squeeze your glutes hard!"',
    'Coach Aira: "Control the negative phase down. That is where strength is built!"'
  ],
  row: [
    'Coach Aira: "Lead with your elbows, retract your shoulder blades, and squeeze your lats!"',
    'Coach Aira: "Keep your torso rigid. Avoid using momentum or jerking the weights!"',
    'Coach Aira: "Hold the peak contraction for 1 second before lowering slowly!"',
    'Coach Aira: "Deep lat stretch at the bottom without letting shoulders round!"'
  ],
  push: [
    'Coach Aira: "Rigid plank line from crown to heels! Do not let your lower back sag!"',
    'Coach Aira: "Elbows at 45 degrees. Chest reaches the floor before your hips!"',
    'Coach Aira: "Drive through the floor! Full range of motion on every repetition!"',
    'Coach Aira: "Stay tight through fatigue. High-voltage energy all the way!"'
  ],
  curl: [
    'Coach Aira: "Pin your elbows to your sides. Isolate the bicep contraction!"',
    'Coach Aira: "Supinate your wrists outward at the peak for maximum recruitment!"',
    'Coach Aira: "3 seconds down on the negative. Resisting the weight builds the peak!"',
    'Coach Aira: "Strict form, zero torso swinging. Pure bicep tension!"'
  ],
  hiit: [
    'Coach Aira: "Maximum velocity, athlete! Zone 4 redline effort right here!"',
    'Coach Aira: "Push through the burn! Keep those knees driving fast!"',
    'Coach Aira: "Keep your cadence explosive! Every second counts toward your threshold!"',
    'Coach Aira: "Pace your breathing rhythm. Stay fierce and finish strong!"'
  ],
  mobility: [
    'Coach Aira: "Slow, diaphragmatic breaths. Expand your ribcage and relax into the stretch."',
    'Coach Aira: "Never force the range. Let your nervous system release muscle guarding."',
    'Coach Aira: "Inhale space, exhale tension. Restore pelvic and spinal alignment."',
    'Coach Aira: "Hold with mindful control. Quality of movement over amplitude."'
  ],
  rest: [
    'Coach Aira: "Diaphragmatic recovery: Inhale 4s through nose, hold 4s, slow exhale 4s."',
    'Coach Aira: "Sip water, shake out limbs. Let your heart rate decline by 15-20 BPM."',
    'Coach Aira: "Mental reset: Focus your mind on pristine execution for the next round."',
    'Coach Aira: "Deep oxygenation prepares your fast-twitch muscle fibers for peak power."'
  ]
};

let cueCycleIndex = 0;
let lastCueCycleTime = 0;
let lastCueScreenKey = '';
let typewriterTimer: ReturnType<typeof setInterval> | null = null;
let currentSpokenTarget = '';

function setSpokenCue(text: string) {
  const spokenEl = byId('spoken');
  if (!spokenEl) return;
  if (currentSpokenTarget === text) return;
  currentSpokenTarget = text;
  if (typewriterTimer) {
    clearInterval(typewriterTimer);
    typewriterTimer = null;
  }
  spokenEl.textContent = '';
  spokenEl.classList.add('typing');
  let idx = 0;
  typewriterTimer = setInterval(() => {
    idx = Math.min(text.length, idx + 2);
    spokenEl.textContent = text.slice(0, idx);
    if (idx >= text.length) {
      if (typewriterTimer) clearInterval(typewriterTimer);
      typewriterTimer = null;
      spokenEl.classList.remove('typing');
    }
  }, 16);
}

function updateDynamicCues() {
  const spokenEl = byId('spoken');
  if (!spokenEl) return;
  const current = c.document.current;
  const nodes = (current?.props.children as StatementNode[]) ?? [];
  const exercise = nodes.find(n => n.name === 'ExerciseCard');
  const timer = nodes.find(n => n.name === 'Timer');
  const explicitCues = nodes.filter(n => n.name === 'Cue').map(n => String(n.props.text));

  // If there's NO exercise and NO timer (e.g. demo screen 1, sample, or blank canvas):
  if (!exercise && !timer) {
    setSpokenCue(explicitCues.join(' ') || c.document.prose || 'Current-screen Cues appear here as text. No audio is produced.');
    return;
  }

  const currentKey = current?.key ?? '';
  const now = Date.now();

  // If newly landed on a screen, reset cycle or show explicit cue first
  if (currentKey !== lastCueScreenKey) {
    lastCueScreenKey = currentKey;
    lastCueCycleTime = now;
    cueCycleIndex = 0;
    if (explicitCues.length) {
      setSpokenCue(explicitCues[0]);
      return;
    }
  }

  if (timer && !exercise) {
    const list = COACH_EXERCISE_CUES.rest;
    if (now - lastCueCycleTime > 16000) {
      lastCueCycleTime = now;
      cueCycleIndex = (cueCycleIndex + 1) % list.length;
      setSpokenCue(list[cueCycleIndex]);
    } else if (!spokenEl.textContent) {
      setSpokenCue(explicitCues.length ? explicitCues[0] : list[0]);
    }
    return;
  }

  if (exercise) {
    const exName = String(exercise.props.name ?? '').toLowerCase();
    let category = 'hiit';
    if (exName.includes('squat')) category = 'squat';
    else if (exName.includes('press') || exName.includes('push-up')) category = exName.includes('bench') || exName.includes('overhead') ? 'press' : 'push';
    else if (exName.includes('deadlift') || exName.includes('rdl')) category = 'deadlift';
    else if (exName.includes('row')) category = 'row';
    else if (exName.includes('curl')) category = 'curl';
    else if (exName.includes('stretch') || exName.includes('flow') || exName.includes('cat-cow') || exName.includes('pigeon') || exName.includes('joint')) category = 'mobility';

    const pool = COACH_EXERCISE_CUES[category] || COACH_EXERCISE_CUES.hiit;
    if (now - lastCueCycleTime > 18000) {
      lastCueCycleTime = now;
      cueCycleIndex = (cueCycleIndex + 1) % pool.length;
      setSpokenCue(pool[cueCycleIndex]);
    } else if (!spokenEl.textContent) {
      setSpokenCue(explicitCues.length ? explicitCues[0] : pool[0]);
    }
  }
}

function syncTimers(){
  if(lastClear!==c.document.clearVersion){nav.dispose();nav=makeNav();timers.forget();previousTimers.clear();lastClear=c.document.clearVersion;}
  const ids=new Set<string>();for(const s of c.document.screens)for(const node of s.props.children as StatementNode[])if(node.name==='Timer'){ids.add(node.key);timers.ensure(node.key,{label:String(node.props.label),seconds:Number(node.props.seconds)});}
  for(const t of timers.list())if(!ids.has(t.id)){timers.forget(t.id);previousTimers.delete(t.id);}
}
function tick(){const snapshot=timers.list();for(const entry of snapshot){const before=previousTimers.get(entry.id);previousTimers.set(entry.id,{...entry});if(before && before.status!=='done'&&entry.status==='done')c.localEvent(activityClientEvents.finishedTimer(entry.label),false);}updates.forEach(fn=>fn());updateTelemetry();updateDynamicCues();}
function timerAction(id:string,action:'start'|'pause'|'reset'|'finish'){
  const before=timers.list().find(t=>t.id===id);if(!before||paused)return;
  if(action==='start')timers.start(id);if(action==='pause')timers.pause(id);if(action==='reset')timers.reset(id);if(action==='finish')timers.finish(id);
  const after=timers.list().find(t=>t.id===id)!;previousTimers.set(id,{...after});
  const event=action==='reset'?activityClientEvents.resetTimer(after.label,after.seconds):action==='start'&&before.status==='stopped'?activityClientEvents.startedTimer(after.label,after.seconds):timerTransitionEvent(before,after);
  c.localEvent(event??`Simulated ${action} for ${after.label}.`);tick();
}
function createSvgIcon(d: string, width = 14, height = 14, viewBox = '0 0 24 24', strokeWidth = 2): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', String(strokeWidth));
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);
  return svg;
}

function createChatWelcomeCard(_onSend: (prompt: string) => void): HTMLElement {
  const card = el('div', '', 'chat-welcome-card');
  const header = el('div', '', 'chat-welcome-header');
  const badge = el('div', '', 'chat-welcome-badge');
  badge.append(createSvgIcon('M12 2a8 8 0 0 0-8 8c0 4.418 3.582 8 8 8 1.15 0 2.24-.24 3.22-.68L20 20l-1.32-4.78A7.95 7.95 0 0 0 20 10a8 8 0 0 0-8-8z', 12, 12, '0 0 24 24', 2.5));
  badge.append(el('span', 'COACH AiRA INTELLIGENCE'));
  header.append(badge);
  header.append(el('h4', 'Your Biomechanical Training Partner', 'chat-welcome-title'));
  card.append(header);

  const grid = el('div', '', 'chat-caps-grid');
  const caps = [
    {
      icon: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-14v4l3 2',
      title: 'Adaptive Biomechanics',
      desc: 'Real-time cadence tracking and hands-free automatic variation transitions.'
    },
    {
      icon: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
      title: 'Dynamic Live Training',
      desc: 'Real-time push cues for breathing rhythm, eccentric control, and power output.'
    },
    {
      icon: 'm9 11 3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
      title: 'One-Touch Calibration',
      desc: 'Interactive MCQ answer chips for instant volume, joint relief, or intensity adjustments.'
    },
    {
      icon: 'M18 20V10M12 20V4M6 20v-6',
      title: 'Biometric Split Logs',
      desc: 'Continuous MET burn telemetry, work-rest ratios, and persistent session archives.'
    }
  ];

  for (const cap of caps) {
    const item = el('div', '', 'chat-cap-item');
    const iconWrap = el('div', '', 'chat-cap-icon');
    iconWrap.append(createSvgIcon(cap.icon, 13, 13, '0 0 24 24', 2));
    item.append(iconWrap);
    const textWrap = el('div', '', 'chat-cap-text');
    textWrap.append(el('strong', cap.title));
    textWrap.append(el('span', cap.desc));
    item.append(textWrap);
    grid.append(item);
  }
  card.append(grid);

  return card;
}

function createOnboardingGuide(): HTMLElement {
  const guide = el('div', '', 'empty onboarding-guide');

  const header = el('div', '', 'guide-header');
  const eyebrow = el('span', '', 'eyebrow');
  const accent = el('span', '', 'toi-bar-accent');
  eyebrow.append(accent, document.createTextNode('WELCOME TO AIRA FITNESS'));
  header.append(eyebrow);
  const hiddenAnchor = el('span', 'Your workout starts here', 'visually-hidden');
  header.append(hiddenAnchor);
  guide.append(header);

  const stepsGrid = el('div', '', 'guide-steps-grid');
  const steps = [
    {
      num: 'STEP 01',
      title: 'Choose Workout Style',
      desc: 'Select your protocol from the sidebar deck (Metabolic HIIT, Compound Strength, or Mobility). Click the Edit icon to customize your target duration and intensity.'
    },
    {
      num: 'STEP 02',
      title: 'Quick Coach Calibration',
      desc: 'Calibrate setup and questions in the chat panel with Coach AiRA. Tap quick one-touch MCQ chips to adjust for joint fatigue, knee relief, or tempo.'
    },
    {
      num: 'STEP 03',
      title: 'Execute Daily Exercise',
      desc: 'Follow guided circuits directly inside this stage. Enjoy hands-free automated transitions, dynamic form cues, and real-time biometric pacing rings.'
    }
  ];

  for (const s of steps) {
    const card = el('div', '', 'guide-step-card');
    card.append(el('div', s.num, 'step-badge'));
    const content = el('div', '', 'step-content');
    content.append(el('h4', s.title));
    content.append(el('p', s.desc));
    card.append(content);
    stepsGrid.append(card);
  }
  guide.append(stepsGrid);

  const proTips = el('div', '', 'guide-pro-tips');
  const badge = el('div', '', 'pro-tips-badge');
  badge.append(createSvgIcon('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-6v-4m0-4h.01', 13, 13, '0 0 24 24', 2.5));
  badge.append(el('span', 'PRO ATHLETE TIPS'));
  proTips.append(badge);

  const list = el('ul', '', 'pro-tips-list');
  const tips = [
    { prefix: 'Mood Mode: ', text: 'Switch between Cool and Calm mode using the top navigation toggle.' },
    { prefix: 'Athlete Bio: ', text: 'Set up your training profile in the top-right pill for personalized heart-rate zones and caloric estimates.' },
    { prefix: 'Training Split Log: ', text: 'Review reps, burn rate, and split progression.' }
  ];
  for (const t of tips) {
    const li = el('li');
    const strong = el('strong', t.prefix);
    li.append(strong, document.createTextNode(t.text));
    list.append(li);
  }
  proTips.append(list);
  guide.append(proTips);

  return guide;
}

function render(){
  if(config){const selected=config.providers.find(p=>p.id===c.provider)!;byId('mode').textContent=c.provider==='mock'?'MOCK · NO MODEL CALLS':selected.enabled?'LIVE WHEN SENT':'SETUP / BLOCKED';byId('provider-description').textContent=selected.message;byId('consent-wrap').hidden=c.provider==='mock'||!selected.enabled;byId('consent-label').textContent=c.provider==='claude-cli'?'Use my subscription quota on Send/Retry; I reviewed the host-policy limits.':'Use my API budget on Send/Retry.';byId<HTMLInputElement>('consent').checked=c.consent;byId<HTMLButtonElement>('send').disabled=!selected.enabled||(c.provider!=='mock'&&!c.consent)||paused;byId('mock-controls').hidden=c.provider!=='mock';byId('sample').hidden=c.provider!=='mock';}
  byId('send').setAttribute('aria-label',c.pending?'Send update':'Send');byId('send').title=c.pending?'Send update':'Send';byId<HTMLButtonElement>('cancel').disabled=!c.pending;byId('pending').hidden=!c.pending;byId('status').textContent=c.pending?'Thinking… type an update to interrupt':c.error?'Needs attention':'Ready when you are';byId('error').hidden=!c.error;byId('error-message').textContent=c.error;
  const transcript=byId('transcript');transcript.replaceChildren();
  if(!c.events.length) transcript.append(createChatWelcomeCard(send));
  for(const event of c.events){
    if(event.kind==='input'||event.kind==='response'){
      const n=el('div','','message '+(event.kind==='input'?'user':'assistant'));
      if(event.kind==='input'){
        n.append(el('p',event.text??''));
      } else {
        const fullProse=splitReply(event.result!.turn.reply).prose??'';
        const lines=fullProse.split('\n');
        const mcqLines:{letter:string; text:string}[]=[];
        const proseLines:string[]=[];
        for(const line of lines){
          const m=line.match(/^\[([A-Z0-9])\]\s*(.+)$/);
          if(m) mcqLines.push({letter:m[1],text:m[2].trim()});
          else proseLines.push(line);
        }
        n.append(el('p',proseLines.join('\n').trim()));
        if(mcqLines.length){
          const mcqWrap=el('div','','chat-mcq-options');
          for(const opt of mcqLines){
            const btn=button('',()=>send(opt.text),'chat-mcq-chip');
            btn.type='button';
            btn.append(el('span',opt.letter,'chat-mcq-letter'),el('span',opt.text,'chat-mcq-label'),el('span','→','chat-mcq-arrow'));
            mcqWrap.append(btn);
          }
          n.append(mcqWrap);
        }
      }
      transcript.append(n);
    }else if(event.text && !event.text.startsWith('Now on step') && !event.text.startsWith('Went back to'))transcript.append(el('p',event.text,'event'));else if(event.kind==='interrupted'||event.kind==='cancelled')transcript.append(el('p',event.kind==='interrupted'?'Previous reply interrupted. Your messages are kept.':'Reply cancelled.','event'));
  }
  transcript.scrollTop=transcript.scrollHeight;syncTimers();
  const screens=c.document.screens,index=screens.findIndex(s=>s.key===c.document.cursor),key=c.document.echo()+String(paused);
  if(key!==renderKey || !byId('screen').childNodes.length){renderKey=key;updates=[];const surface=byId('screen');surface.replaceChildren();const current=c.document.current;
    if(!current) surface.append(createOnboardingGuide());
    else for(const node of current.props.children as StatementNode[])if(node.name!=='Cue')surface.append(renderComponent(node,{send,timers,timerAction,updates,paused,nextStep:()=>nav.next()}));
    const progress=byId('progress');progress.replaceChildren();if(screens.length>1)for(let i=0;i<screens.length;i++){const n=el('span','',''+(i===index?'active':i<index?'past':''));n.setAttribute('aria-label',`Screen ${i+1}${i===index?', current':''}`);progress.append(n);}
    const splitTracker=byId('split-tracker');
    if(splitTracker){
      const exerciseScreens:{screenKey:string;index:number;name:string;reps:string}[]=[];
      screens.forEach((s,i)=>{
        const cardNode=(s.props.children as StatementNode[]??[]).find(n=>n.name==='ExerciseCard');
        if(cardNode)exerciseScreens.push({screenKey:s.key,index:i,name:String(cardNode.props.name??'Exercise'),reps:String(cardNode.props.reps??'')});
      });
      if(exerciseScreens.length>1){
        splitTracker.hidden=false;
        splitTracker.replaceChildren();
        const activeExIdx=exerciseScreens.findIndex(e=>e.screenKey===c.document.cursor);
        const header=el('div','','split-tracker-header');
        header.append(
          el('span',"TODAY'S SPLIT VARIATIONS",'split-tracker-eyebrow'),
          el('span',activeExIdx>=0?`VARIATION ${activeExIdx+1} OF ${exerciseScreens.length}`:`${exerciseScreens.length} VARIATIONS`,'split-tracker-count')
        );
        splitTracker.append(header);
        const list=el('div','','split-tracker-list');
        exerciseScreens.forEach((ex,idx)=>{
          const isDone=activeExIdx>idx;
          const isActive=activeExIdx===idx;
          const item=button('',()=>{
            c.document.move(ex.index);
            c.localEvent(activityClientEvents.nowOnStep(`step ${ex.index+1} of ${screens.length}`));
            render();
          },`split-tracker-item ${isDone?'done':isActive?'active':'upcoming'}`);
          item.type='button';
          item.append(
            el('span',isDone?'✓':String(idx+1),'split-tracker-badge'),
            el('span',ex.name,'split-tracker-label')
          );
          list.append(item);
        });
        splitTracker.append(list);
      } else {
        splitTracker.hidden=true;
        splitTracker.replaceChildren();
      }
    }
  }
  byId('navigation').hidden=screens.length<2;byId('position').textContent=`${index+1} / ${screens.length}`;byId<HTMLButtonElement>('back').disabled=paused||index<=0;byId<HTMLButtonElement>('next').disabled=paused;byId('next').textContent=index===screens.length-1?'Finish Workout':'Next →';
  byId<HTMLButtonElement>('pause').disabled=!screens.length;byId('pause').textContent=paused?'Resume':'Pause';byId('paused').hidden=!paused;
  updateDynamicCues();
  byId('state-json').textContent=JSON.stringify({ui_state:c.document.echo(),client_events:c.clientEvents,timers:timers.list()},null,2);byId<HTMLButtonElement>('export').disabled=c.pending||!c.events.length;
  updateTelemetry();
}
byId<HTMLFormElement>('composer').addEventListener('submit',event=>{event.preventDefault();const text=draft.value.trim();if(text){draft.value='';send(text);}});
draft.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();byId<HTMLFormElement>('composer').requestSubmit();}});
byId('sample').addEventListener('click',()=>send('Load wiring sample'));byId('workout-btn')?.addEventListener('click',()=>send('/workout'));
let customizerTarget:'hiit'|'strength'|'mobility'='hiit';
function openCustomizer(target:'hiit'|'strength'|'mobility',name:string){
  customizerTarget=target;byId('intent-customizer').hidden=false;byId('customizer-target-name').textContent=`Customize ${name}`;
  const durWrap=byId('opt-duration');durWrap.replaceChildren();
  const durations=target==='hiit'?['15m','30m','45m']:target==='strength'?['1.0h','1.5h','2.0h']:['30m','45m','60m'];
  durations.forEach((d,i)=>{
    const btn=el('button',d,'opt-btn'+(i===0?' active':''));btn.type='button';btn.dataset.val=d;
    btn.addEventListener('click',()=>{durWrap.querySelectorAll('.opt-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');});
    durWrap.append(btn);
  });
}
function startChatIntake(category:'hiit'|'strength'|'mobility',dur='',intensity=''){
  byId('intent-hiit')?.classList.toggle('active',category==='hiit');
  byId('intent-strength')?.classList.toggle('active',category==='strength');
  byId('intent-mobility')?.classList.toggle('active',category==='mobility');
  nav.dispose();
  nav=makeNav();
  paused=false;
  pausedTimers=[];
  timers.forget();
  previousTimers.clear();
  draft.value='';
  workoutLoggedForCursor=null;
  workoutStartTimestamp=null;
  c.reset();
  const d=dur||(category==='hiit'?'15m':category==='strength'?'1.0h':'30m');
  const int=intensity||(category==='mobility'?'Med':'High');
  if(category==='hiit')send(`start hiit workout intake: ${d} ${int}`);
  else if(category==='strength')send(`start compound strength intake: ${d} ${int}`);
  else send(`start mobility intake: ${d} ${int}`);
}
byId('btn-edit-hiit')?.addEventListener('click',e=>{e.stopPropagation();openCustomizer('hiit','Metabolic HIIT');});
byId('btn-edit-strength')?.addEventListener('click',e=>{e.stopPropagation();openCustomizer('strength','Compound Strength');});
byId('btn-edit-mobility')?.addEventListener('click',e=>{e.stopPropagation();openCustomizer('mobility','Mobility & Core');});
byId('btn-close-customizer')?.addEventListener('click',()=>{byId('intent-customizer').hidden=true;});
document.querySelectorAll('#opt-intensity .opt-btn').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('#opt-intensity .opt-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');});});
byId('btn-save-customizer')?.addEventListener('click',()=>{
  const dur=(document.querySelector('#opt-duration .opt-btn.active') as HTMLElement)?.dataset.val??'15m';
  const intensity=(document.querySelector('#opt-intensity .opt-btn.active') as HTMLElement)?.dataset.val??'Med';
  byId('intent-customizer').hidden=true;
  if(customizerTarget==='hiit')byId('hiit-meta').textContent=`${dur} · ${intensity}`;
  else if(customizerTarget==='strength')byId('strength-meta').textContent=`${dur} · ${intensity}`;
  else byId('mobility-meta').textContent=`${dur} · ${intensity}`;
  startChatIntake(customizerTarget,dur,intensity);
});
byId('intent-hiit')?.addEventListener('click',()=>startChatIntake('hiit'));
byId('intent-strength')?.addEventListener('click',()=>startChatIntake('strength'));
byId('intent-mobility')?.addEventListener('click',()=>startChatIntake('mobility'));
interface SessionRecord {
  id: string;
  day: string;
  num: string;
  title: string;
  intensity: 'High' | 'Med' | 'Low';
  badgeClass: string;
  session: string;
}

interface AthleteProfile {
  height: number;
  weight: number;
  fat: number;
  muscle: number;
  split: string;
  injKnee: boolean;
  injBack: boolean;
  injShoulder: boolean;
  injWrist: boolean;
}

const DEFAULT_SESSIONS: SessionRecord[] = [
  { id: '1', day: 'Sat', num: '13 Feb', title: 'Chest & Shoulders', intensity: 'High', badgeClass: 'badge-high', session: 'push' },
  { id: '2', day: 'Thu', num: '11 Feb', title: 'Quads & Calves', intensity: 'Med', badgeClass: 'badge-med', session: 'legs' },
  { id: '3', day: 'Wed', num: '10 Feb', title: 'Spine & Hip Flow', intensity: 'Low', badgeClass: 'badge-low', session: 'mobility' },
  { id: '4', day: 'Mon', num: '08 Feb', title: 'Heavy Back & Core', intensity: 'High', badgeClass: 'badge-high', session: 'pull' }
];

let sessionHistory: SessionRecord[] = [];
let workoutLoggedForCursor: string | null = null;
let workoutStartTimestamp: number | null = null;

function getTodayDateParts() {
  const now = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return {
    day: days[now.getDay()],
    num: `${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]}`
  };
}

function renderSessions() {
  const container = byId('calendar-history');
  if (!container) return;
  container.replaceChildren();
  sessionHistory.forEach(s => {
    const btn = el('button', '', 'calendar-item');
    btn.type = 'button';
    btn.dataset.session = s.session;

    const dateCol = el('div', '', 'cal-date-col');
    dateCol.append(el('span', s.day, 'cal-day'), el('span', s.num, 'cal-num'));

    const infoCol = el('div', '', 'cal-info-col');
    infoCol.append(el('strong', s.title), el('span', s.intensity, 'cal-badge ' + s.badgeClass));

    btn.append(dateCol, infoCol);
    btn.addEventListener('click', () => {
      send(`review past session: ${s.session}`);
    });
    container.append(btn);
  });
}

function updateAIPrediction() {
  const predTitle = byId('prediction-title');
  const predSub = byId('prediction-sub');
  if (!predTitle || !predSub) return;
  const split = byId<HTMLSelectElement>('prof-split')?.value ?? 'ppl';
  const latest = sessionHistory[0];
  const lastType = latest ? latest.session.toLowerCase() : 'push';

  if (split === 'ppl') {
    if (lastType.includes('push') || lastType.includes('chest')) {
      predTitle.textContent = 'Pull & Core Tomorrow';
      predSub.textContent = 'Based on 3-day PPL cycle (Back & Biceps)';
    } else if (lastType.includes('pull') || lastType.includes('back')) {
      predTitle.textContent = 'Legs & Core Tomorrow';
      predSub.textContent = 'Based on 3-day PPL cycle (Quads & Posterior Chain)';
    } else {
      predTitle.textContent = 'Push Power Tomorrow';
      predSub.textContent = 'Based on 3-day PPL cycle (Chest & Triceps)';
    }
  } else if (split === 'upper_lower') {
    if (lastType.includes('upper') || lastType.includes('push') || lastType.includes('pull')) {
      predTitle.textContent = 'Lower Body & Core Tomorrow';
      predSub.textContent = 'Based on 4-day Upper/Lower progression';
    } else {
      predTitle.textContent = 'Upper Body Strength Tomorrow';
      predSub.textContent = 'Based on 4-day Upper/Lower progression';
    }
  } else if (split === 'full_body') {
    predTitle.textContent = 'Active Recovery & Mobility Tomorrow';
    predSub.textContent = 'Neurological restoration between 3-day full body stimuli';
  } else {
    predTitle.textContent = 'Back & Biceps Overload Tomorrow';
    predSub.textContent = 'Next targeted bodypart microcycle';
  }
}

function hydrateSessions() {
  try {
    const raw = localStorage.getItem('aira_sessions');
    if (raw) {
      sessionHistory = JSON.parse(raw);
    } else {
      sessionHistory = [...DEFAULT_SESSIONS];
      localStorage.setItem('aira_sessions', JSON.stringify(sessionHistory));
    }
  } catch {
    sessionHistory = [...DEFAULT_SESSIONS];
  }
  renderSessions();
  updateAIPrediction();
}

function logCompletedSession(rawTitle: string) {
  const { day, num } = getTodayDateParts();
  let title = 'Metabolic HIIT Circuit';
  let intensity: 'High' | 'Med' | 'Low' = 'High';
  let badgeClass = 'badge-high';
  let session = 'hiit';

  const lower = rawTitle.toLowerCase();
  if (lower.includes('legs') || lower.includes('quad') || lower.includes('squat')) {
    title = 'Compound Legs Protocol';
    intensity = 'High';
    badgeClass = 'badge-high';
    session = 'legs';
  } else if (lower.includes('pull') || lower.includes('back') || lower.includes('row')) {
    title = 'Compound Pull Protocol';
    intensity = 'High';
    badgeClass = 'badge-high';
    session = 'pull';
  } else if (lower.includes('push') || lower.includes('chest') || lower.includes('bench')) {
    title = 'Compound Push Protocol';
    intensity = 'High';
    badgeClass = 'badge-high';
    session = 'push';
  } else if (lower.includes('strength')) {
    title = 'Heavy Compound Lift';
    intensity = 'High';
    badgeClass = 'badge-high';
    session = 'push';
  } else if (lower.includes('mobility') || lower.includes('flow') || lower.includes('restoration') || lower.includes('core')) {
    title = 'Spine & Core Flow';
    intensity = 'Low';
    badgeClass = 'badge-low';
    session = 'mobility';
  }

  const existingIdx = sessionHistory.findIndex(s => s.num === num && s.title === title);
  if (existingIdx !== -1) {
    sessionHistory.splice(existingIdx, 1);
  }

  const newEntry: SessionRecord = {
    id: String(Date.now()),
    day,
    num,
    title,
    intensity,
    badgeClass,
    session
  };
  sessionHistory.unshift(newEntry);
  if (sessionHistory.length > 8) sessionHistory.pop();
  try {
    localStorage.setItem('aira_sessions', JSON.stringify(sessionHistory));
  } catch {}
  renderSessions();
  updateAIPrediction();
}

function finishWorkout() {
  const screens = c.document.screens;
  const current = c.document.current;
  const nodes = (current?.props.children as StatementNode[]) ?? [];
  const summary = nodes.find(n => n.name === 'WorkoutSummary');

  let title = '';
  if (summary && summary.props.title) {
    title = String(summary.props.title);
  } else {
    const allCards: StatementNode[] = [];
    screens.forEach(s => {
      (s.props.children as StatementNode[] ?? []).forEach(cn => {
        if (cn.name === 'ExerciseCard') allCards.push(cn);
      });
    });
    const names = allCards.map(cd => String(cd.props.name ?? '')).join(' ').toLowerCase();
    if (names.includes('squat') && (names.includes('deadlift') || names.includes('split'))) title = 'Compound Legs Protocol';
    else if (names.includes('row') || names.includes('curl')) title = 'Compound Pull Protocol';
    else if (names.includes('bench') || names.includes('press')) title = 'Compound Push Protocol';
    else if (names.includes('cat-cow') || names.includes('bridge') || names.includes('pigeon') || names.includes('flow')) title = 'Spine & Core Flow';
    else if (names.includes('push-up') || names.includes('burpee') || names.includes('climber') || names.includes('hiit')) title = 'Metabolic HIIT Circuit';
    else title = 'Metabolic HIIT Circuit';
  }

  workoutLoggedForCursor = c.document.cursor;
  logCompletedSession(title);
  c.localEvent(`Session "${title}" finished and logged to athlete calendar history.`);
  setSpokenCue('Coach Aira: Outstanding execution! Session successfully logged to your athlete history. Rest, rehydrate, and recover.');
  const nextBtn = byId<HTMLButtonElement>('next');
  if (nextBtn) {
    nextBtn.textContent = '✓ Logged';
    nextBtn.classList.add('btn-logged-success');
    nextBtn.disabled = true;
  }
}

const calcBmi = () => {
  const h = Number(byId<HTMLInputElement>('prof-height').value) || 180;
  const w = Number(byId<HTMLInputElement>('prof-weight').value) || 78;
  const bmi = (w / ((h / 100) * (h / 100))).toFixed(1);
  byId('prof-bmi-val').textContent = `${bmi} · ${Number(bmi) < 25 ? 'Healthy Weight' : 'Above Average'}`;
  byId('profile-pill-val').textContent = `${w}kg · BMI ${bmi}`;
};

function hydrateProfile() {
  try {
    const raw = localStorage.getItem('aira_profile');
    if (raw) {
      const p = JSON.parse(raw) as AthleteProfile;
      if (byId<HTMLInputElement>('prof-height')) byId<HTMLInputElement>('prof-height').value = String(p.height);
      if (byId<HTMLInputElement>('prof-weight')) byId<HTMLInputElement>('prof-weight').value = String(p.weight);
      if (byId<HTMLInputElement>('prof-fat')) byId<HTMLInputElement>('prof-fat').value = String(p.fat);
      if (byId<HTMLInputElement>('prof-muscle')) byId<HTMLInputElement>('prof-muscle').value = String(p.muscle);
      if (byId<HTMLSelectElement>('prof-split')) byId<HTMLSelectElement>('prof-split').value = p.split;
      if (byId<HTMLInputElement>('inj-knee')) byId<HTMLInputElement>('inj-knee').checked = !!p.injKnee;
      if (byId<HTMLInputElement>('inj-back')) byId<HTMLInputElement>('inj-back').checked = !!p.injBack;
      if (byId<HTMLInputElement>('inj-shoulder')) byId<HTMLInputElement>('inj-shoulder').checked = !!p.injShoulder;
      if (byId<HTMLInputElement>('inj-wrist')) byId<HTMLInputElement>('inj-wrist').checked = !!p.injWrist;
    }
  } catch {}
  calcBmi();
}

function saveProfile() {
  const p: AthleteProfile = {
    height: Number(byId<HTMLInputElement>('prof-height').value) || 182,
    weight: Number(byId<HTMLInputElement>('prof-weight').value) || 78,
    fat: Number(byId<HTMLInputElement>('prof-fat').value) || 14.5,
    muscle: Number(byId<HTMLInputElement>('prof-muscle').value) || 42.0,
    split: byId<HTMLSelectElement>('prof-split').value || 'ppl',
    injKnee: byId<HTMLInputElement>('inj-knee').checked,
    injBack: byId<HTMLInputElement>('inj-back').checked,
    injShoulder: byId<HTMLInputElement>('inj-shoulder').checked,
    injWrist: byId<HTMLInputElement>('inj-wrist').checked
  };
  try {
    localStorage.setItem('aira_profile', JSON.stringify(p));
  } catch {}
  calcBmi();
  updateAIPrediction();
  const injuries = [
    p.injKnee ? 'Knees' : '',
    p.injBack ? 'Lower Back' : '',
    p.injShoulder ? 'Shoulder' : '',
    p.injWrist ? 'Wrist' : ''
  ].filter(Boolean).join(', ');
  send(`profile update: ${p.weight}kg, split ${p.split}${injuries ? `, restrictions: ${injuries}` : ''}`);
}

function updateTelemetry() {
  const screens = c.document.screens;
  const index = screens.findIndex(s => s.key === c.document.cursor);
  const current = c.document.current;
  const nodes = (current?.props.children as StatementNode[]) ?? [];
  const exercise = nodes.find(n => n.name === 'ExerciseCard');
  const timer = nodes.find(n => n.name === 'Timer');
  const summary = nodes.find(n => n.name === 'WorkoutSummary');

  const burnVal = byId('stat-burn-val');
  const burnSub = byId('stat-burn-sub');
  const zoneVal = byId('stat-zone-val');
  const zoneTag = byId('stat-zone-tag');
  const zoneBars = byId('stat-zone-bars');
  const paceVal = byId('stat-pace-val');
  const paceTag = byId('stat-pace-tag');
  const pacePct = byId('stat-pace-pct');

  if (!burnVal || !burnSub || !zoneVal || !zoneTag || !zoneBars || !paceVal || !paceTag || !pacePct) return;

  const barSpans = zoneBars.querySelectorAll('span');
  const setActiveBar = (activeIdx: number) => {
    barSpans.forEach((span, i) => {
      span.classList.toggle('active', i === activeIdx);
    });
  };

  if (!screens.length || index < 0 || screens.length <= 1) {
    burnVal.textContent = '0 kcal';
    burnSub.textContent = 'Resting baseline';
    zoneVal.textContent = 'Zone 1 (55%)';
    zoneTag.textContent = 'Baseline';
    setActiveBar(0);
    paceVal.textContent = '00:00';
    paceTag.textContent = 'Ready · Block 0/3';
    pacePct.textContent = '0%';
    byId('circular-progress')?.style.setProperty('--progress-pct', '0');
    return;
  }

  if (workoutStartTimestamp === null) {
    workoutStartTimestamp = Date.now();
  }

  const pct = Math.min(100, Math.round(((index + 1) / screens.length) * 100));
  pacePct.textContent = `${pct}%`;
  byId('circular-progress')?.style.setProperty('--progress-pct', String(pct));

  const totalEstimatedMins = 15;
  const simSeconds = Math.round(((index + 1) / screens.length) * (totalEstimatedMins * 60));
  const mins = Math.floor(simSeconds / 60);
  const secs = simSeconds % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  if (summary) {
    const cal = String(summary.props.calories ?? '245 kcal');
    const dur = String(summary.props.duration ?? timeFormatted);
    burnVal.textContent = cal;
    burnSub.textContent = 'Session complete · Total output';
    zoneVal.textContent = 'Zone 1 (55%)';
    zoneTag.textContent = 'Cool-Down Complete';
    setActiveBar(0);
    paceVal.textContent = dur;
    paceTag.textContent = 'Conquered · Complete';
    pacePct.textContent = '100%';
    byId('circular-progress')?.style.setProperty('--progress-pct', '100');

    if (workoutLoggedForCursor !== c.document.cursor) {
      workoutLoggedForCursor = c.document.cursor;
      logCompletedSession(String(summary.props.title ?? 'Workout Conquered'));
    }
    return;
  }

  if (exercise) {
    if (index >= screens.length - 2) {
      burnVal.textContent = '235 kcal';
      burnSub.textContent = '+14.5 kcal/min · Redline Finisher';
      zoneVal.textContent = 'Zone 5 (94%)';
      zoneTag.textContent = 'Peak Effort';
      setActiveBar(4);
      paceVal.textContent = timeFormatted;
      paceTag.textContent = 'Finisher Block Active';
    } else if (index > 2) {
      burnVal.textContent = '152 kcal';
      burnSub.textContent = '+13.0 kcal/min · High MET';
      zoneVal.textContent = 'Zone 4 (86%)';
      zoneTag.textContent = 'Anaerobic Threshold';
      setActiveBar(3);
      paceVal.textContent = timeFormatted;
      paceTag.textContent = 'Drill 2/3 Active';
    } else {
      burnVal.textContent = '62 kcal';
      burnSub.textContent = '+11.8 kcal/min · High MET';
      zoneVal.textContent = 'Zone 4 (82%)';
      zoneTag.textContent = 'Threshold Burn';
      setActiveBar(3);
      paceVal.textContent = timeFormatted;
      paceTag.textContent = 'Drill 1/3 Active';
    }
    return;
  }

  if (timer) {
    const tEntry = timers.list().find(t => t.id === timer.key);
    const rem = tEntry ? Math.ceil(tEntry.remaining) : Number(timer.props.seconds ?? 30);
    burnVal.textContent = index < 3 ? '95 kcal' : '188 kcal';
    burnSub.textContent = '+3.2 kcal/min · Active Recovery';
    zoneVal.textContent = 'Zone 2 (62%)';
    zoneTag.textContent = 'Active Recovery';
    setActiveBar(1);
    paceVal.textContent = timeFormatted;
    paceTag.textContent = `Rest Interval · ${rem}s`;
    return;
  }

  const syncEl = byId('toi-sync-clock');
  if (syncEl) {
    const d = new Date();
    syncEl.textContent = `Sync: ${d.toTimeString().slice(0, 8)}`;
  }

  const bDur = nodes.find(n => n.name === 'MetricBadge' && String(n.props.label).toLowerCase().includes('dur'));
  const bCal = nodes.find(n => n.name === 'MetricBadge' && String(n.props.label).toLowerCase().includes('burn'));
  const bLvl = nodes.find(n => n.name === 'MetricBadge' && (String(n.props.label).toLowerCase().includes('zone') || String(n.props.label).toLowerCase().includes('target') || String(n.props.label).toLowerCase().includes('stimulus')));

  burnVal.textContent = '0 kcal';
  burnSub.textContent = bCal ? `Target: ${bCal.props.value}` : 'Warm-up readiness · Protocol loaded';
  zoneVal.textContent = bLvl ? String(bLvl.props.value) : 'Zone 1 (58%)';
  zoneTag.textContent = bLvl ? 'Target Calibrated' : 'Baseline Readiness';
  if (bLvl) {
    const val = String(bLvl.props.value).toLowerCase();
    if (val.includes('5') || val.includes('redline')) setActiveBar(4);
    else if (val.includes('4')) setActiveBar(3);
    else if (val.includes('3') || val.includes('tempo')) setActiveBar(2);
    else if (val.includes('2') || val.includes('aerobic')) setActiveBar(1);
    else setActiveBar(0);
  } else {
    setActiveBar(0);
  }
  paceVal.textContent = '00:00';
  paceTag.textContent = bDur ? `${bDur.props.value} Plan` : `Station 1/${screens.length}`;
}

function setMoodMode(mood: 'cool' | 'calm', persist = true) {
  document.documentElement.dataset.mood = mood;
  document.body.dataset.mood = mood;

  const coolLink = byId<HTMLLinkElement>('theme-style-cool');
  const calmLink = byId<HTMLLinkElement>('theme-style-calm');
  if (coolLink && calmLink) {
    coolLink.disabled = (mood !== 'cool');
    calmLink.disabled = (mood !== 'calm');
  }

  const btnCool = byId<HTMLButtonElement>('btn-mood-cool');
  const btnCalm = byId<HTMLButtonElement>('btn-mood-calm');
  if (btnCool && btnCalm) {
    btnCool.classList.toggle('active', mood === 'cool');
    btnCool.setAttribute('aria-checked', String(mood === 'cool'));
    btnCalm.classList.toggle('active', mood === 'calm');
    btnCalm.setAttribute('aria-checked', String(mood === 'calm'));
  }

  if (persist) {
    try {
      localStorage.setItem('aira_mood_mode', mood);
    } catch {}
  }
}

function initMoodMode() {
  let savedMood: 'cool' | 'calm' = 'cool';
  try {
    const stored = localStorage.getItem('aira_mood_mode');
    if (stored === 'calm' || stored === 'cool') {
      savedMood = stored;
    }
  } catch {
    savedMood = 'cool';
  }
  setMoodMode(savedMood, false);

  byId('btn-mood-cool')?.addEventListener('click', () => setMoodMode('cool'));
  byId('btn-mood-calm')?.addEventListener('click', () => setMoodMode('calm'));
}

const profileModal=byId<HTMLDialogElement>('profile-modal');
byId('btn-athlete-profile')?.addEventListener('click',()=>profileModal?.showModal());
byId('btn-close-profile')?.addEventListener('click',()=>profileModal?.close());
byId('prof-height')?.addEventListener('input',calcBmi);
byId('prof-weight')?.addEventListener('input',calcBmi);
byId('prof-split')?.addEventListener('change',()=>{calcBmi();updateAIPrediction();});
byId('profile-form')?.addEventListener('submit',e=>{e.preventDefault();profileModal?.close();saveProfile();});

// Interactive Stat Info Tooltips/Popovers ("i" badges on stat cards)
document.querySelectorAll<HTMLButtonElement>('.stat-info-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const targetId = `stat-info-${btn.dataset.statInfo}`;
    const popover = byId(targetId);
    const isCurrentlyVisible = popover?.classList.contains('visible');

    document.querySelectorAll('.stat-info-popover').forEach(p => p.classList.remove('visible'));
    document.querySelectorAll('.stat-info-btn').forEach(b => b.classList.remove('active'));

    if (!isCurrentlyVisible && popover) {
      popover.classList.add('visible');
      btn.classList.add('active');
    }
  });
});

document.addEventListener('click', e => {
  const target = e.target as HTMLElement;
  if (!target.closest('.stat-info-popover') && !target.closest('.stat-info-btn')) {
    document.querySelectorAll('.stat-info-popover').forEach(p => p.classList.remove('visible'));
    document.querySelectorAll('.stat-info-btn').forEach(b => b.classList.remove('active'));
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.stat-info-popover').forEach(p => p.classList.remove('visible'));
    document.querySelectorAll('.stat-info-btn').forEach(b => b.classList.remove('active'));
  }
});
byId('chip-knees')?.addEventListener('click',()=>send('my knees hurt'));
byId('chip-harder')?.addEventListener('click',()=>send('make it harder'));
byId('chip-rest')?.addEventListener('click',()=>send('extend rest +15s'));
byId('chip-form')?.addEventListener('click',()=>send('form check'));
byId('cancel').addEventListener('click',()=>c.cancel());byId('retry').addEventListener('click',()=>{if(!paused)void c.retry();});
byId('reset').addEventListener('click',()=>{nav.dispose();paused=false;pausedTimers=[];timers.forget();previousTimers.clear();draft.value='';workoutLoggedForCursor=null;workoutStartTimestamp=null;c.reset();updateTelemetry();});
byId('back').addEventListener('click',()=>nav.back());
byId('next').addEventListener('click',()=>{
  const screens = c.document.screens;
  const index = screens.findIndex(s => s.key === c.document.cursor);
  if (index === screens.length - 1 && screens.length > 1) {
    finishWorkout();
    return;
  }
  nav.next();
});
byId('pause').addEventListener('click',()=>{paused=!paused;if(paused){pausedTimers=timers.list().filter(t=>t.status==='running').map(t=>t.id);for(const id of pausedTimers)timers.pause(id);}else{for(const id of pausedTimers)timers.start(id);pausedTimers=[];}c.localEvent(paused?'User paused the preview.':'User resumed the preview.');tick();});
byId<HTMLSelectElement>('provider').addEventListener('change',event=>c.selectProvider((event.target as HTMLSelectElement).value as Provider));
byId<HTMLInputElement>('consent').addEventListener('change',event=>{c.consent=(event.target as HTMLInputElement).checked;if(!c.consent)c.cancel();render();});
byId('apply-patch').addEventListener('click',()=>{try{const raw=byId<HTMLTextAreaElement>('patch').value;c.document.apply(raw.includes('```')?raw:'```openui\n'+raw+'\n```');c.localEvent('Builder applied local OpenUI data: '+raw);byId('patch-status').textContent='Patch accepted. This is local fixture evidence, not a model run.';}catch{byId('patch-status').textContent='Invalid patch. Previous screen kept. Check names, arguments and catalog.';}});
byId('export').addEventListener('click',()=>{const label=byId<HTMLSelectElement>('run-label').value;const payload={format:'aira-workout-run-v1',label,appVersion:APP_VERSION,schemaVersion:SCHEMA_VERSION,selectedProvider:c.provider,note:byId<HTMLTextAreaElement>('note').value,events:c.events,state:{ui_state:c.document.echo(),client_events:c.clientEvents},timers:timers.list()};const url=URL.createObjectURL(new Blob([JSON.stringify(redactValue(payload),null,2)],{type:'application/json'}));const link=el('a');link.href=url;link.download=label+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);byId('export-status').textContent=`Downloaded ${label}.json. Review and move it into runs/.`;});
async function start(){initMoodMode();hydrateProfile();hydrateSessions();render();try{const response=await fetch('/api/config');if(!response.ok)throw new Error();config=await response.json();const select=byId<HTMLSelectElement>('provider');select.replaceChildren();for(const p of config!.providers){const option=el('option',p.label+(p.enabled?'':' · setup / blocked'));option.value=p.id;select.append(option);}select.value='mock';select.disabled=false;render();}catch{byId('status').textContent='Could not connect. Restart the local server and reload.';}}
setInterval(tick,250);void start();
