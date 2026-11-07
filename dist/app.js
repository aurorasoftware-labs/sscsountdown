import {WEEKDAYS,dayAvailability,earlyLesson,validateSchedule} from './schedule.js';
import {SYLLABUS_VERSION} from './syllabus.js';
import {STAGES,WEIGHTS,SUBJECTS,GROUPS,today,days,addDays,uid,seed,validate,stats,coverageProjection,aggregate,scoreProjection,weekStart,recommendations,sleepHours,dailyPlan,earlyGoal,upgrade} from './core.js';
import * as cloud from './cloud.js';
import {STRENGTHS, LOSS_REASONS, lessonMatchesSubject, validateResultDetails, lossSummary} from './result-tools.js';
import {PAPERS,boardPapers,paperCoverage,paperTime,PAPER_CHECKS,activity,focusRemaining,focusLog,reminderFor,paperCalendar} from './study-tools.js';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let scope=cloud.accountKey(),state,version=0,dirty=false,conflict=false,ready=!cloud.session,syncing=false,syncText=cloud.session?'Connecting…':'Saved on this device',saveTimer,installPrompt;
let page='today',subjectFilter='all',stageFilter='all',query='',scoreExam='',insightExam='prelims',timer;
function storageKey(){return 'ssc-compass-v1-'+scope;}
function readLocal(){try{let x=JSON.parse(localStorage.getItem(storageKey())||'null');if(x){state=upgrade(validate(x.data));version=x.version||0;dirty=!!x.dirty;return;}}catch(e){syncText='Local data could not be read. Restore a backup in Settings.';}state=seed();version=0;dirty=false;}
readLocal();
function persist(){try{localStorage.setItem(storageKey(),JSON.stringify({data:state,version,dirty}));return true;}catch{toast('Device storage is full or unavailable. Export a backup now.');return false;}}
function commit(message){dirty=true;persist();if(!cloud.session)syncText='Saved on this device';else syncText=navigator.onLine?'Changes waiting to sync':'Offline · changes saved here';render();if(message)toast(message);clearTimeout(saveTimer);saveTimer=setTimeout(sync,700);}
// Only mark a cloud migration dirty after accepting the current cloud version.
function loadCloudPlan(r){
 const needsMigration=r.payload.settings?.syllabusVersion!==SYLLABUS_VERSION;
 state=upgrade(validate(r.payload));
 version=r.version;
 dirty=needsMigration;
 persist();
}
async function sync(){if(!cloud.session||!navigator.onLine||syncing||conflict||!ready)return;syncing=true;try{if(dirty){const snapshot=JSON.stringify(state);const r=await cloud.save(state,version);if(!r.ok){conflict=true;syncText='Sync conflict · review in Settings';}else{version=r.version;if(JSON.stringify(state)===snapshot)dirty=false;syncText=dirty?'More changes waiting':'Cloud synced';persist();}}else{const r=await cloud.load();if(r&&r.version>version)loadCloudPlan(r);syncText=dirty?'More changes waiting':'Cloud synced';}}catch(e){syncText='Sync paused · '+e.message;}finally{syncing=false;render();if(dirty&&!conflict&&syncText==='More changes waiting')setTimeout(sync,200);}}
async function connect(){ready=false;try{const r=await cloud.load();if(r){if(dirty&&version!==r.version){conflict=true;syncText='Sync conflict · review in Settings';}else if(!dirty){loadCloudPlan(r);}}else{version=0;dirty=true;}ready=true;await sync();}catch(e){syncText='Cloud unavailable · '+e.message;ready=false;render();}}
function toast(message){$('#toast').textContent=message;$('#toast').style.display='block';clearTimeout(timer);timer=setTimeout(()=>$('#toast').style.display='none',4500);}
const name=s=>s==='other'?state.settings.other:SUBJECTS.find(x=>x.id===s)?.name||PAPERS.find(p=>p.id===s)?.title||GROUPS.find(x=>x[0]===s)?.[1]||s;
const splitPapers=PAPERS.filter(p=>p.part);
function lessonSection(lesson){
 return splitPapers.find(p=>p.subject===lesson.subject&&p.part===lesson.part)?.id||lesson.subject;
}
function studySections(includeUnassigned=false){
 return SUBJECTS.flatMap(subject=>{
  const papers=splitPapers.filter(p=>p.subject===subject.id);
  if(!papers.length)return [subject];
  const sections=papers.map(p=>({...p,color:subject.color}));
  if(includeUnassigned&&state.lessons.some(l=>lessonSection(l)===subject.id)){
   sections.push({...subject,name:subject.name+' · Unassigned paper'});
  }
  return sections;
 });
}
const sectionName=section=>section.title||(section.id==='other'?name('other'):section.name);
const lessonName=lesson=>name(lessonSection(lesson));
const fmt=d=>new Date(d+'T12:00Z').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
const percent=(n,d)=>d?Math.round(n/d*100):0;
const button=(label,action,cls='secondary',attrs='')=>`<button class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
const stageOptions=selected=>STAGES.map((n,i)=>`<option value="${i}" ${selected===i?'selected':''}>${n}</option>`).join('');
const subjectOptions=(selected,groups=false)=>`<option value="all">All subjects</option>`+(groups?GROUPS:studySections(true).map(x=>[x.id,sectionName(x)])).map(([id,n])=>`<option value="${id}" ${selected===id?'selected':''}>${esc(n)}</option>`).join('');
function heading(title,desc,action=''){return `<div class="heading row between"><div><h1>${title}</h1><p class="muted">${desc}</p></div>${action}</div>`;}
function render(){const nav=[['today','◈','Today'],['lessons','▤','Lessons'],['plan','☷','My plan'],['scores','▥','Scores'],['insights','↗','Insights'],['focus','◉','Focus'],['settings','⚙','Settings']];$('#app').innerHTML=`<aside><div class="brand"><img src="icon.svg" alt=""><div><b>SSC Compass</b><small>ONE STEP AT A TIME</small></div></div><nav aria-label="Main navigation">${nav.map(([id,icon,label])=>`<button data-page="${id}" class="${page===id?'active':''}" ${page===id?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">${icon}</span>${label}</button>`).join('')}</nav><div class="sidebar-bottom"><span class="eyebrow">Your next chapter</span><strong>Progress over perfection.</strong>Small, honest steps add up.<br><span class="muted">Maharashtra SSC · 2027</span></div></aside><div class="shell"><header class="topbar"><span class="eyebrow">Your space to grow · Std 10</span><div class="mobile-brand"><img src="icon.svg" alt="">SSC Compass</div><div class="row"><span class="status ${cloud.session&&syncText==='Cloud synced'?'connected':''}" role="status">${esc(syncText)}</span>${!cloud.session&&cloud.config?button('Sign in to sync ↗','account','textbutton'):''}<div class="avatar" aria-hidden="true">${esc(state.settings.name.charAt(0).toUpperCase())}</div></div></header><main id="main" tabindex="-1">${({today:todayPage,lessons:lessonsPage,plan:planPage,scores:scoresPage,insights:insightsPage,focus:focusPage,settings:settingsPage}[page])()}<footer>Made for steady progress. Your dates, syllabus and goals are always editable.<br>Exam dates are your planning assumptions; confirm with school and the board.
<div class="footer-legal">
 <span>© 2026 Aurora Software Labs</span>
 <nav aria-label="Legal">
  <a href="./privacy.html">Privacy Policy</a>
  <a href="./terms.html">Terms of Use</a>
 </nav>
</div></footer></main></div>`;}
function subjectProgress(sections=studySections(true)){
 return sections.map(section=>{
  const lessons=state.lessons.filter(lesson=>lessonSection(lesson)===section.id);
  const covered=lessons.filter(lesson=>lesson.stage>=2).length;
  const progress=percent(covered,lessons.length);
  const label=esc(sectionName(section));
  return `<div class="subject-row">
   <div class="subject-icon" style="background:${section.color}" aria-hidden="true">${label.charAt(0)}</div>
   <div><div class="subject-info"><b>${label}</b><small>${covered} / ${lessons.length} covered</small></div>
    <div class="track"><span style="width:${progress}%;background:${section.color}"></span></div>
   </div>
   <div class="subject-percent">${progress}%</div>
  </div>`;
 }).join('');
}
function todayPage(){const next=boardPapers(state).find(p=>p.date>=today());const x=stats(state),d=today(),p=coverageProjection(state,state.settings.prelims),w=weekStart(d),coveredToday=state.lessons.filter(l=>l.covered===d).length,goal=state.settings.overrides[d]??state.settings.daily,dp=dailyPlan(state),early=earlyGoal(state,'prelims');const tasks=state.tasks.filter(t=>t.date===d||(t.date<d&&!t.done));let sessions=state.sessions.filter(s=>s.date===d).reduce((a,s)=>a+s.minutes,0);return `${heading(`A fresh start, ${esc(state.settings.name)} <span aria-hidden="true">☀</span>`,` ${new Date(d+'T12:00Z').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})} · Let’s make today count.`,button('+ Log study','log'))}<section class="hero"><div><div class="eyebrow">The prelims chapter</div><h2>A little progress.<br>A stronger tomorrow.</h2><p>${x.covered?`${x.covered} lesson units covered. Keep building with practice and revision.`:'Your journey starts with one lesson. Choose a small goal and begin.'}</p>${button('Find my next lesson &nbsp; ↗','next','')}</div><div class="orbit"><div class="orbit-ring"><b>${p.left}</b><span>DAYS TO PRELIMS</span></div><div class="orbit-note">✦ ${fmt(state.settings.prelims)}</div></div></section>${next?`<div class="paper-banner"><div><span class="eyebrow">NEXT BOARD PAPER</span><b>${next.title} · ${fmt(next.date)}</b></div>${button('All exam dates ↗','papers','secondary')}</div>`:''}<div class="grid stats"><div class="card"><div class="stat-title">Syllabus progress</div><div class="stat-value">${x.progress}%</div><div class="stat-note">Stage-weighted · ${x.mastered} mastered</div></div><div class="card"><div class="stat-title">First-pass coverage</div><div class="stat-value">${x.covered}<em> / ${x.n}</em></div><div class="stat-note">Practising, revising or mastered</div></div><div class="card"><div class="stat-title">${dp.revisionOnly?'Revision mode':'Today’s lesson target'}</div><div class="stat-value">${dp.revisionOnly?'↻':coveredToday}<em>${dp.revisionOnly?' Practise & revise':' / '+dp.due}</em></div><div class="stat-note">${dp.revisionOnly?'Syllabus covered · protect your lead':'Fixed '+goal+' + '+dp.backlog+' carried forward'}</div></div><div class="card"><div class="stat-title">Boards countdown</div><div class="stat-value">${Math.max(0,days(d,state.settings.boards))}<em> days</em></div><div class="stat-note">${fmt(state.settings.boards)}</div></div></div><div class="notice"><strong>${dp.revisionOnly?'Finished early? Keep the lead.':'Same daily target. Nothing forgotten.'}</strong>${dp.revisionOnly?'Your first pass is complete. Use today for due revisions, written recall and a timed paper. No extra lessons are invented.':`Your base stays at ${dp.base} new units/day. ${dp.backlog} missed units carried forward; ${dp.outstanding} units are still due today after completed work. The backlog carries on until cleared; it does not silently change your base target.`} Aim to finish first-pass coverage by ${fmt(early.date)}, ${early.buffer} days before prelims.</div><div class="grid two"><section class="card"><div class="card-head"><h2>Your subjects</h2>${button('All lessons ↗','lessons','textbutton')}</div>${subjectProgress()}</section><div class="grid"><section class="card"><div class="card-head"><h2>Today’s focus</h2>${button('+ Task','task','textbutton')}</div>${tasks.length?tasks.map(t=>`<div class="task-row ${t.done?'done':''}"><input aria-label="Complete ${esc(t.title)}" type="checkbox" data-task="${esc(t.id)}" ${t.done?'checked':''}><div class="grow"><b>${esc(t.title)}</b><small>${t.date<d?'Carried forward from '+fmt(t.date)+' · ':''}${t.lessonId?'Linked lesson · completion marks task only':'Your personal task'}</small></div>${button('×','delete-task','textbutton',`data-id="${esc(t.id)}" aria-label="Delete task"`)}</div>`).join(''):`<p class="subheading">Choose a lesson below, or add a personal task. You decide what a good day looks like.</p>`}<div class="task-row"><div class="grow"><b>${sessions} focused minutes logged</b><small>Today’s available study budget: ${dayAvailability(state.settings,d).budget} minutes</small></div><span class="pill">${state.tasks.filter(t=>t.date>=w&&t.date<=d&&t.done).length} tasks this week</span></div></section><section class="card"><div class="card-head"><h2>A gentle course correction</h2><span class="pill gold">YOUR PACE</span></div><p class="subheading">${p.left?`To cover the remaining ${x.n-x.covered} units before prelims, aim for <b>${p.required.toFixed(1)} new units/day</b>.`:'Prelims have started or passed. Use your results to guide board preparation.'} ${p.evidence?`Your recorded ${p.elapsed}-day pace is ${p.pace.toFixed(1)}/day.`:'Log at least 3 days and cover 2 lessons to unlock a pace estimate.'}</p><p class="subheading">${p.required>state.settings.daily?'Your current target is below the needed pace. Split long lessons into smaller units and prioritise weak chapters; avoid borrowing from sleep.':'Keep space for written practice, mistakes and revision.'}</p>${button('Adjust my plan ↗','plan','textbutton')}</section></div></div><section class="card spacer"><div class="card-head"><h2>Your next small wins</h2><span class="pill">PRIORITY + REVISION</span></div>${recommendations(state).map(l=>`<div class="task-row"><div class="subject-icon" style="background:${SUBJECTS.find(s=>s.id===l.subject).color}">${esc(lessonName(l).charAt(0))}</div><div class="grow"><b>${esc(l.title)}</b><small>${esc(lessonName(l))} · ${l.minutes} min estimate · ${l.reviewDue&&l.reviewDue<=d?'Revision due':STAGES[l.stage]}</small></div>${button('Open','open-lesson','secondary',`data-id="${l.id}"`)}</div>`).join('')}</section>`;}
function archivedLessonPanel(){
 const archived=state.archivedLessons||[];
 if(!archived.length)return '';
 return `<details class="card"><summary>Archived starter entries (${archived.length})</summary><p class="subheading">These old entries keep their progress and are outside the current lesson total. Restore an entry to track it again.</p><div class="lesson-list">${archived.map(l=>`<div class="lesson"><div><b>${esc(l.title)}</b><small>${esc(lessonName(l))} · ${STAGES[l.stage]} · ${esc(STRENGTHS.find(([value])=>value===l.strength)?.[1]||'Not rated')}</small></div>${button('Restore','restore-archived','secondary',`data-id="${esc(l.id)}"`)}</div>`).join('')}</div></details>`;
}
function lessonsPage(){let list=state.lessons.filter(l=>(subjectFilter==='all'||lessonSection(l)===subjectFilter)&&(stageFilter==='all'||l.stage===Number(stageFilter))&&`${l.title} ${l.part}`.toLowerCase().includes(query.toLowerCase()));return `${heading('Every lesson, one place.',`${state.lessons.length} editable units · Learn. Practise. Come back stronger.`,button('+ Lesson','add-lesson'))}<div class="notice"><strong>From your textbook indexes.</strong> The default plan has 124 study entries. History and Political Science are sections of the same board paper.<div class="actions">${button('Marathi · मराठी','marathi-lessons','secondary','lang="mr"')}</div></div><div class="toolbar"><input id="search" aria-label="Search lessons" placeholder="Search a chapter or skill…" value="${esc(query)}"><select id="subject-filter" aria-label="Filter subject">${subjectOptions(subjectFilter)}</select><select id="stage-filter" aria-label="Filter stage"><option value="all">Every stage</option>${stageOptions(Number(stageFilter))}</select></div><p class="subheading">${list.length} matching units · First-pass coverage starts at Practising.</p>${archivedLessonPanel()}${lessonSections(list)}`;}
function lessonSections(list){
 if(!list.length)return '<div class="empty">No lessons match. Try another filter.</div>';
 return studySections(true).map(section=>{
  const lessons=list.filter(lesson=>lessonSection(lesson)===section.id);
  if(!lessons.length)return '';
  const label=sectionName(section);
  return `<section class="lesson-section" aria-labelledby="section-${section.id}">
   <header class="lesson-section-heading" style="--section-color:${section.color}">
    <h2 id="section-${section.id}">${esc(label)}</h2>
    <span>${lessons.length} ${lessons.length===1?'entry':'entries'}</span>
   </header>
   <div class="lesson-list">${lessons.map(lessonRow).join('')}</div>
  </section>`;
 }).join('');
}
function lessonRow(lesson){
 const title=esc(lesson.title);
 const language=lesson.subject==='other'?'mr':lesson.subject==='hindi'?'hi':'en';
 const strengthOptions=STRENGTHS.map(([value,label])=>
  `<option value="${value}" ${(lesson.strength||'unrated')===value?'selected':''}>${label}</option>`
 ).join('');
 return `<article class="lesson">
  <div><b lang="${language}">${title}</b>
   <small>${esc(lessonName(lesson))} · ${esc(lesson.part)} · ${lesson.minutes} min
    ${lesson.draft?' · <span class="pill gold">Check book</span>':''}
    ${lesson.reviewDue?' · Review '+fmt(lesson.reviewDue):''}</small>
  </div>
  <div class="lesson-controls">
   <label>Progress<select data-stage="${lesson.id}" aria-label="Progress for ${title}">${stageOptions(lesson.stage)}</select></label>
   <label>Strength<select data-strength="${lesson.id}" aria-label="Strength for ${title}">${strengthOptions}</select></label>
  </div>
  <div class="actions">
   ${lesson.stage>=2?button('↻ Review','review','secondary',`data-id="${lesson.id}"`):''}
   ${button('Edit','open-lesson','ghost',`data-id="${lesson.id}"`)}
  </div>
 </article>`;
}
let scheduleDate=today();
const blockKinds={school:'School',coaching:'Coaching',other:'Other activity'};
function scheduleTime(value){
 const mins=value%1440;
 const hours=Math.floor(mins/60);
 return `${String(hours).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}${value>=1440?' next day':''}`;
}
function pullForwardChoice(date){
 const current=today();
 const target=date===current?dailyPlan(state,date).outstanding
  :state.settings.overrides[date]??state.settings.daily;
 return earlyLesson(state,date,current,target);
}
function schedulePanel(){
 const plan=dayAvailability(state.settings,scheduleDate);
 const choice=pullForwardChoice(scheduleDate);
 const blocks=state.settings.timeBlocks||[];
 const timeline=[...plan.busy.map(block=>({...block,label:'Blocked'})),
  ...plan.free.map(block=>({...block,label:'Open'}))].sort((a,b)=>a.from-b.from);
 return `<section class="card spacer" id="study-schedule">
  <div class="card-head"><h2>School, coaching & activities</h2>${button('+ Time block','add-time-block')}</div>
  <p class="subheading">Weekly blocks reserve time inside your wake and bedtime. Overlaps count once.</p>
  ${blocks.map(block=>`<div class="task-row">
   <div class="grow"><b>${esc(block.title)}</b><small>${blockKinds[block.kind]} · ${block.days.map(day=>WEEKDAYS[day]).join(', ')} · ${block.start}–${block.end}${block.end<block.start?' next day':''}</small></div>
   ${button('Edit','edit-time-block','secondary',`data-id="${esc(block.id)}"`)}
   ${button('Remove','remove-time-block','ghost',`data-id="${esc(block.id)}"`)}
  </div>`).join('')}
  <div class="toolbar spacer"><label>Preview day (India)<input type="date" id="schedule-date" value="${scheduleDate}" required></label>
   <label class="inline-check"><input type="checkbox" id="schedule-free" ${plan.freeDay?'checked':''}>Holiday / free day</label></div>
  <p class="subheading">${plan.blockedMinutes} min blocked · ${plan.freeMinutes} min open · ${plan.budget} min study budget</p>
  <div class="schedule-windows">${timeline.map(window=>`<span class="pill ${window.label==='Blocked'?'gold':''}">${window.label} · ${scheduleTime(window.from)}–${scheduleTime(window.to)}</span>`).join('')}</div>
  ${plan.freeDay?`<p class="subheading spacer">Recurring blocks are skipped on this date. Your usual lesson target stays in place.</p>
   ${choice?`<p><b>${esc(choice.lesson.title)}</b> · ${choice.lesson.minutes} min
    ${choice.task?` · scheduled for ${fmt(choice.task.date)}`:''}</p>
    ${button('Move lesson earlier','pull-lesson-forward','secondary')}`
    :'<p class="subheading">No upcoming lesson fits after allowing for your study budget and existing work.</p>'}`:''}
 </section>`;
}
function timeBlockDialog(id){
 const blocks=state.settings.timeBlocks||[];
 const saved=blocks.find(block=>block.id===id);
 const block=saved||{id:uid(),title:'',kind:'school',start:'08:00',end:'15:00',days:[1,2,3,4,5]};
 modal(saved?'Edit time block':'Add time block',`<div class="form-grid">
  <label>Activity<select name="kind">${Object.entries(blockKinds).map(([key,label])=>`<option value="${key}" ${key===block.kind?'selected':''}>${label}</option>`).join('')}</select></label>
  <label>Name (optional)<input name="title" value="${esc(block.title)}" maxlength="60"></label>
  <label>Start (India)<input name="start" type="time" value="${block.start}" required></label>
  <label>End (India)<input name="end" type="time" value="${block.end}" required></label>
  <fieldset class="full"><legend>Repeat on</legend><div class="row wrap">
   ${[1,2,3,4,5,6,0].map(day=>`<label class="inline-check"><input type="checkbox" name="days" value="${day}" ${block.days.includes(day)?'checked':''}>${WEEKDAYS[day]}</label>`).join('')}
  </div></fieldset>
 </div>`,form=>{
  const kind=form.get('kind');
  const updated={id:block.id,kind,title:form.get('title').trim()||blockKinds[kind],
   start:form.get('start'),end:form.get('end'),days:form.getAll('days').map(Number)};
  if(!updated.days.length)throw Error('Choose at least one day.');
  if(updated.start===updated.end)throw Error('Choose different start and end times.');
  const timeBlocks=saved?blocks.map(item=>item.id===id?updated:item):[...blocks,updated];
  validateSchedule({timeBlocks});
  state.settings.timeBlocks=timeBlocks;
  commit('Time block saved.');
 });
}
function planPage(){let d=today(),ws=weekStart(d),we=addDays(ws,6),x=stats(state),done=state.lessons.filter(l=>l.covered>=ws&&l.covered<=we).length,due=state.lessons.filter(l=>l.reviewDue&&l.reviewDue<=d);let sleep=sleepHours(state.settings.wake,state.settings.bed),dp=dailyPlan(state);return `${heading('A plan that grows with you.','Keep targets flexible. Make room for practice, rest and real life.',button('Edit targets','targets'))}<div class="notice ${sleep<8?'warning':''}"><strong>Rest is part of the plan.</strong>Wake ${esc(state.settings.wake)} · Bed ${esc(state.settings.bed)} · ${sleep.toFixed(1)} hours available for sleep. ${sleep<8?'This leaves less than 8 hours. Bring bedtime earlier or wake later; don’t use lost sleep to catch up.':'A protected evening cutoff makes tomorrow’s learning easier.'}</div><div class="notice"><strong>${dp.revisionOnly?'Revision mode is on.':`Fixed base: ${dp.base}/day · Carry-forward: ${dp.backlog} units`}</strong>${dp.revisionOnly?'Continue spaced reviews, correct mistakes and complete timed papers until exams.':`${dp.done} completed today; ${dp.outstanding} still due. Missed units roll forward, while your chosen daily base stays the same. Extra completions earn credit against future backlog. Overrides change a day only when you edit them.`}</div><div class="grid two"><section class="card"><div class="card-head"><h2>This week’s rhythm</h2><span class="pill">${done} / ${state.settings.weekly} covered</span></div><div class="calendar">${Array.from({length:7},(_,i)=>{let day=addDays(ws,i),c=state.lessons.filter(l=>l.covered===day).length;return `<div class="day ${day===d?'today':''}"><small>${new Date(day+'T12:00Z').toLocaleDateString('en',{weekday:'short'})}</small><b>${day.slice(-2)}</b><input type="number" min="0" max="30" data-day-target="${day}" value="${state.settings.overrides[day]??state.settings.daily}" aria-label="Target on ${day}"><small>${c} done</small></div>`;}).join('')}</div><p class="legend">Edit a day’s new-lesson target above. Weekly target is independent; ${Math.max(0,state.settings.weekly-done)} units remain this week.</p>${button('Plan another date','date-target','ghost')}</section><section class="card"><div class="card-head"><h2>Catch-up, without burnout</h2><span class="pill gold">ADAPTIVE</span></div>${['prelims','boards'].map(k=>{let p=coverageProjection(state,state.settings[k]),e=earlyGoal(state,k);return `<p class="subheading"><b>${k==='prelims'?'Prelims':'Boards'} · aim for ${fmt(e.date)}:</b> ${e.left?`${e.required.toFixed(1)} new units/day needed to finish ${e.buffer} days early. Fixed base remains ${state.settings.daily}/day.`:'Early-finish date reached; keep prioritising coverage and revision.'} ${p.evidence?`At your recorded pace: about ${p.projected}/${x.n} covered.`:'More logged progress is needed to estimate coverage.'}</p>`;}).join('')}<p class="subheading">${Math.ceil(state.lessons.filter(l=>l.stage<2).reduce((n,l)=>n+l.minutes,0)/Math.max(1,days(d,state.settings.prelims)))} estimated first-pass minutes/day to prelims, before practice and revision. Today’s available budget is ${dayAvailability(state.settings,d).budget} minutes. If this is too much, lower scope with your teacher and prioritise high-need chapters.</p></section></div>${schedulePanel()}${boardPanel()}<section class="card spacer"><div class="card-head"><h2>Revision queue</h2><span class="pill">${due.length} DUE</span></div><p class="subheading">After a lesson reaches Practising, review after 1 day, then 3, 7, 14 and 30 days. Each review schedules the next interval from today. You can change the due date in Edit.</p>${due.length?due.sort((a,b)=>a.reviewDue.localeCompare(b.reviewDue)).map(l=>`<div class="task-row"><div class="grow"><b>${esc(l.title)}</b><small>${esc(lessonName(l))} · Due ${fmt(l.reviewDue)}</small></div>${button('Reviewed ✓','review','secondary',`data-id="${l.id}"`)}</div>`).join(''):'<div class="empty">Nothing overdue. Your next review appears here when it’s due.</div>'}</section><section class="card spacer"><div class="card-head"><h2>Suggested study blocks</h2>${button('+ Add task','task','textbutton')}</div><p class="subheading">Use 25–45 minute blocks with short breaks. Maths and Science most days; Hindi daily; alternate History and Geography; keep a short English / other-language block. Fit these around school and tuition within the open windows shown above.</p>${state.tasks.filter(t=>t.date>=d).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,30).map(t=>`<div class="task-row ${t.done?'done':''}"><input type="checkbox" data-task="${esc(t.id)}" ${t.done?'checked':''} aria-label="Complete ${esc(t.title)}"><div class="grow"><b>${esc(t.title)}</b><small>${fmt(t.date)}</small></div>${button('×','delete-task','textbutton',`data-id="${esc(t.id)}" aria-label="Delete task"`)}</div>`).join('')}</section>`;}
function examSets(){return [...new Set(state.scores.map(s=>s.exam))].sort();}
function selectedScores(){let sets=examSets();if(!sets.includes(scoreExam))scoreExam=sets.at(-1)||'';return state.scores.filter(s=>s.exam===scoreExam);}
function scoresPage(){let a=selectedScores(),agg=aggregate(a,state.settings.mode);return `${heading('See what you’re learning.','Record honest results. Find the next thing to improve.',button('+ Add result','score'))}${button('Individual board paper marks','papers','secondary')}<div class="notice"><strong>Compare like with like.</strong>For an exam set, enter one total for each of the six subjects. Combine Algebra + Geometry into Maths, Science I + II into Science, and History & Political Science + Geography into Social Science. Include internal marks only when known; never assume full marks. Different tests belong in different sets.</div><div class="toolbar"><label>Exam set<select id="exam-filter">${examSets().map(e=>`<option ${e===scoreExam?'selected':''}>${esc(e)}</option>`).join('')||'<option>No scores yet</option>'}</select></label><label>Calculation<select id="score-mode"><option value="best5" ${state.settings.mode==='best5'?'selected':''}>Best five of six</option><option value="all6" ${state.settings.mode==='all6'?'selected':''}>All six</option></select></label></div><div class="grid two"><section class="card"><div class="eyebrow">${state.settings.mode==='best5'?'Best five':'All six'} · ${esc(scoreExam||'No exam set')}</div><div class="large-number">${agg?agg.pct.toFixed(1)+'%':'—'}</div><p class="subheading">${agg?`${agg.chosen.length} subject percentages averaged with equal weight.`:`${a.length}/6 subject totals entered. Add all six to calculate a complete aggregate.`}</p><small>Best-five mode ranks six subject percentages and excludes the lowest. This is a configurable planning calculation; confirm applicable 2027 rules and admission requirements with school. It does not determine pass/fail.</small></section><section class="card"><h2>Your subject snapshot</h2><div class="score-grid">${GROUPS.map(([id,n])=>{let s=a.find(v=>v.subject===id);return `<div class="score-tile"><small>${esc(id==='other'?state.settings.other:n)}</small><b>${s?(s.mark/s.max*100).toFixed(1)+'%':'—'}</b><small>${s?`${s.mark} / ${s.max}`:'Not entered'}</small></div>`;}).join('')}</div></section></div>${mistakeOverview()}<section class="card spacer"><div class="card-head"><h2>Result journal</h2><span class="pill">${state.scores.length} RECORDS</span></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Exam set</th><th>Subject</th><th>Type</th><th>Marks</th><th>%</th><th>Actions</th></tr></thead><tbody>${state.scores.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(s=>`<tr><td>${fmt(s.date)}</td><td>${esc(s.exam)}</td><td>${esc(name(s.subject))}${resultLessonSummary(s)}</td><td>${s.kind}</td><td>${s.mark} / ${s.max}${resultMistakes(s)}</td><td>${(s.mark/s.max*100).toFixed(1)}</td><td>${button('Edit','edit-score','textbutton',`data-id="${s.id}"`)} ${button('Delete','delete-score','textbutton',`data-id="${s.id}"`)}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">No scores yet. Start with a practice paper.</td></tr>'}</tbody></table></div></section>`;}
function scoreChart(){let a=state.scores.slice().sort((a,b)=>a.date.localeCompare(b.date)).slice(-20);if(!a.length)return '<div class="empty">Add practice results to start your score graph.</div>';return `<svg class="chart" viewBox="0 0 550 200" role="img" aria-label="Chronological test percentage graph. Individual results are listed in the result journal.">${[0,25,50,75,100].map(n=>`<line x1="34" x2="530" y1="${170-n*1.4}" y2="${170-n*1.4}" stroke="#e6ebdf"/><text x="0" y="${174-n*1.4}">${n}%</text>`).join('')}${GROUPS.map(([id],j)=>{let points=a.map((s,i)=>({s,i})).filter(x=>x.s.subject===id).map(({s,i})=>`${45+i*470/Math.max(1,a.length-1)},${170-s.mark/s.max*140}`).join(' ');return `<polyline points="${points}" fill="none" stroke="${['#387563','#bd6d4c','#9f7d20','#5879ab','#856795','#7a8a31'][j]}" stroke-width="2"/>`;}).join('')}${a.map((s,i)=>`<circle cx="${45+i*470/Math.max(1,a.length-1)}" cy="${170-s.mark/s.max*140}" r="4" fill="${['#387563','#bd6d4c','#9f7d20','#5879ab','#856795','#7a8a31'][GROUPS.findIndex(x=>x[0]===s.subject)]}"><title>${esc(s.exam)} · ${esc(name(s.subject))} · ${(s.mark/s.max*100).toFixed(1)}% · ${s.date}</title></circle>`).join('')}<text x="34" y="195">${a[0].date}</text><text x="455" y="195">${a.at(-1).date}</text></svg><div class="legend">${GROUPS.map(([id,n],j)=>`<span style="color:${['#387563','#bd6d4c','#9f7d20','#5879ab','#856795','#7a8a31'][j]}">● ${esc(n)}</span>`).join(' · ')}</div>`;}
function insightsPage(){let exam=state.settings[insightExam],p=coverageProjection(state,exam),ranges=scoreProjection(state,exam),d=today();return `${heading('Honest signals. Better decisions.','Projections are planning aids, with room for uncertainty.')}${activityPanel()}<div class="subnav">${button('Prelims · '+fmt(state.settings.prelims),'prelims',insightExam==='prelims'?'':'secondary')}${button('Boards · '+fmt(state.settings.boards),'boards',insightExam==='boards'?'':'secondary')}</div><div class="grid two"><section class="card"><div class="card-head"><h2>Coverage at this pace</h2><span class="pill">${p.left} DAYS LEFT</span></div><div class="large-number">${p.evidence?p.projected:'—'} <span class="subheading"> / ${p.n} units</span></div><p class="subheading">${p.evidence?`Based on ${p.recent} first-pass units across ${p.elapsed} calendar days (${p.pace.toFixed(2)}/day), including rest days.`:'Not enough evidence yet. Log at least 3 calendar days and 2 first-pass units.'} First-pass coverage is not mastery.</p><div class="track"><span style="width:${p.evidence?percent(p.projected,p.n):0}%"></span></div><p class="legend">Needed pace: ${p.required===null?'exam reached':p.required.toFixed(2)+' units/day'} · Target ${state.settings.daily}/day</p></section><section class="card"><h2>Your last seven days</h2><div class="log-chart">${Array.from({length:7},(_,i)=>{let day=addDays(d,i-6),m=state.sessions.filter(s=>s.date===day).reduce((a,s)=>a+s.minutes,0);return `<div class="log-column" style="height:${Math.max(2,Math.min(100,m/Math.max(1,dayAvailability(state.settings,day).budget)*100))}%" title="${day}: ${m} minutes"><span>${day.slice(-2)}</span></div>`;}).join('')}</div><p class="legend">Focused minutes as a share of each day’s available budget. Totals: ${Array.from({length:7},(_,i)=>state.sessions.filter(s=>s.date===addDays(d,i-6)).reduce((a,s)=>a+s.minutes,0)).join(', ')} min.</p></section></div><section class="card spacer"><div class="card-head"><h2>Coverage by board paper</h2>${button('Exam dates & marks','papers','textbutton')}</div>${subjectProgress(studySections().filter(section=>section.part))}</section><section class="card spacer"><div class="card-head"><h2>Possible subject score ranges</h2><span class="pill gold">EXPLORATORY · NOT A GUARANTEE</span></div><div class="score-grid">${ranges.map(r=>`<div class="score-tile"><small>${esc(r.id==='other'?state.settings.other:r.name)}</small><b>${r.empty?'—':r.low+'–'+r.high+'%'}</b><small>${r.empty?'Add a test result':`${r.n} result${r.n===1?'':'s'} · ${r.n<3?'very limited evidence':'mixed-test estimate'}`}</small></div>`).join('')}</div><details class="spacer"><summary>How these ranges work</summary>Each subject starts with the mean of its last five test percentages. A trend is used only with at least three results spanning seven days, dampened by half and capped at ±12 points. When coverage evidence exists, up to 12 points are subtracted for expected uncovered syllabus. Ranges widen with fewer tests or missing pace data (at least ±8 points). Practice, prelim and board totals can differ in difficulty; these are transparent heuristics, not validated statistical confidence intervals. Missing subjects are never filled with invented marks. Your goal is ${state.settings.target}%, not a prediction. Actual exam performance can fall outside these ranges.</details></section><section class="card spacer"><div class="card-head"><h2>Practice score trends</h2><span class="pill">LAST 20 RESULTS</span></div>${scoreChart()}</section>`;}
function settingsPage(){return `${heading('Your compass, your way.','A few personal details. A plan that fits.')}<section class="card settings-block"><h2>Profile & exam dates</h2><form id="settings-form" class="form-grid"><label>Your name<input name="name" maxlength="50" required value="${esc(state.settings.name)}"></label><label>School<input name="school" maxlength="100" value="${esc(state.settings.school||'')}"></label><label>Board<input name="board" maxlength="100" required value="${esc(state.settings.board||'Maharashtra SSC')}"></label><label>Other language name<input name="other" maxlength="50" required value="${esc(state.settings.other)}"></label><label>Prelims start<input type="date" name="prelims" required value="${state.settings.prelims}"></label><label>Boards start<input type="date" name="boards" required value="${state.settings.boards}"></label><label>Wake time<input type="time" name="wake" required value="${state.settings.wake}"></label><label>Bedtime<input type="time" name="bed" required value="${state.settings.bed}"></label><div class="full"><button>Save settings</button></div></form></section><section class="card settings-block" id="account-section"><div class="card-head"><h2>Take your progress anywhere</h2><span class="pill">${cloud.session?'SIGNED IN':'DEVICE ONLY'}</span></div><p>${esc(syncText)}</p>${conflict&&!cloud.session?`<div class="notice warning">Another tab changed the device plan. Export this copy, then reload to use the latest saved copy.</div>${button('Export this copy','export')}${button('Reload saved plan','reload-local','ghost')}`:''}${conflict&&cloud.session?`<div class="notice warning"><strong>Two devices changed the same plan.</strong>Automatic sync has paused to protect your work. Export this device’s copy first. Then load the cloud copy, or explicitly replace it with this device’s copy.</div><div class="row wrap">${button('Export this copy','export')}${button('Load cloud copy','resolve-cloud','ghost')}${button('Replace cloud with this copy','resolve-local','danger')}</div>`:''}${cloud.session?`<p class="subheading">Account: ${esc(cloud.session.user.email)}. Sync runs after changes, when returning online, and periodically while open. Offline changes are saved here. Keep backups for shared-device and conflict recovery.</p><div class="row wrap">${button('Sync now','sync')}${button('Sign out','signout','ghost')}${button('Copy device-only plan into account','import-guest','ghost')}</div>`:`<p class="subheading">${cloud.config?'Cloud saving is ready. Create an account or sign in below, then use the same account on her phone and other devices.':'Connect your Firebase project to keep your plan across devices. Enable Email/Password authentication and deploy the included Firestore rules first.'}</p>${cloud.config?'<details><summary>Advanced: connect another project</summary>':''}<form id="cloud-config" class="form-grid"><label class="full">Firebase project ID<input name="projectId" placeholder="your-project-id" required value="${esc(cloud.config?.projectId||'')}"></label><label class="full">Firebase web API key<input name="apiKey" required value="${esc(cloud.config?.apiKey||'')}" autocomplete="off"></label><div class="full"><button class="secondary">Save connection</button></div></form>${cloud.config?'</details>':''}${cloud.config?`<hr><form id="firebase-auth" class="form-grid"><label class="full">Email address<input name="email" type="email" required autocomplete="email" value="${esc(sessionStorage.getItem('ssc-email')||'')}"></label><label class="full">Password<input name="password" type="password" minlength="6" required autocomplete="current-password"></label><div class="full row wrap"><button>Sign in</button></div></form><details class="spacer"><summary>Create a student account</summary><form id="registration-form" class="form-grid"><label>Student name<input name="name" autocomplete="name" maxlength="50" required></label><label>School<input name="school" autocomplete="organization" maxlength="100" required></label><label class="full">Board<input name="board" maxlength="100" value="Maharashtra SSC" required></label><label class="full">Email address<input name="email" type="email" autocomplete="email" required></label><label class="full">Password<input name="password" type="password" minlength="6" autocomplete="new-password" required></label><div class="full"><button>Create account</button><p class="subheading">Your profile and study plan sync privately with this account.</p></div></form></details><form id="reset-password" class="form-grid spacer"><label class="full">Forgot password? Email address<input name="email" type="email" required autocomplete="email" value="${esc(sessionStorage.getItem('ssc-email')||'')}"></label><div class="full"><button class="ghost">Send password reset email</button></div></form><p class="legend">Use the same Firebase project and account on every device. Passwords are sent directly to Firebase and are never stored by this app.</p>`:''}`}</section>${reminderPanel()}<section class="card settings-block"><h2>Install & keep a backup</h2><p class="subheading">On Android: browser menu → Install app / Add to Home screen. On iPhone: Safari → Share → Add to Home Screen. Use HTTPS. After the first online visit, the app shell and saved plan can work offline.</p><div class="row wrap">${button('Install app','install')}${button('Export backup','export')}${button('Restore backup','import','ghost')}${button('Download task calendar','calendar','ghost')}${button('Test a reminder','notify','ghost')}</div><input type="file" id="import-file" accept="application/json,.json" hidden><p class="legend">Calendar download adds future unfinished tasks to your calendar with a 15-minute alert. Browser reminder is a test while open; Use the board calendar for alerts while the app is closed.</p></section><section class="card settings-block"><h2>Syllabus & calculation notes</h2><p class="subheading">124 textbook entries: English 24, Marathi 21, Hindi 23, Science 1 and 2: 10 each, Maths 1: 6, Maths 2: 7, History 9, Political Science 5, Geography 9. The count includes the listed language reading, writing and grammar sections. Santvani is one entry with two poems. History and Political Science share one paper.</p><div class="link-list subheading"><a href="https://capcompass.app/" target="_blank" rel="noopener">CapCompass · study-planner inspiration ↗</a><a href="https://books.ebalbharati.in/ebook.aspx" target="_blank" rel="noopener">Official Balbharati textbook library ↗</a><a href="https://www.mahahsscboard.in/" target="_blank" rel="noopener">Maharashtra board · verify rules and dates ↗</a></div></section>`;}
function modal(title,body,onSubmit){let dialog=$('#dialog');dialog.innerHTML=`<form id="modal-form"><div class="row between"><h2>${title}</h2><button type="button" data-action="close" class="textbutton" aria-label="Close dialog">✕</button></div>${body}<p id="form-error" role="alert" style="color:#913f31"></p><div class="form-actions">${button('Cancel','close','ghost','type="button"')}<button type="submit">Save</button></div></form>`;dialog.showModal();$('#modal-form').onsubmit=async e=>{e.preventDefault();let submit=e.submitter||e.target.querySelector('button');submit.disabled=true;try{await onSubmit(new FormData(e.target));dialog.close();}catch(err){$('#form-error').textContent=err.message;}finally{submit.disabled=false;}};}
function lessonDialog(id){let l=state.lessons.find(x=>x.id===id)||{id:uid(),subject:'science',title:'',part:'Part 1',stage:0,priority:3,minutes:45,draft:false,covered:null,reviewDue:null,reviewCount:0},exists=state.lessons.some(x=>x.id===id);modal(exists?'Make this lesson yours':'Add a lesson',`<div class="form-grid"><label class="full">Lesson title<input name="title" value="${esc(l.title)}" required maxlength="300"></label><label>Subject<select name="subject">${subjectOptions(lessonSection(l)).replace('<option value="all">All subjects</option>','')}</select></label><label>Book / part for other subjects<input name="part" value="${esc(l.part)}" maxlength="100"></label><label>Stage<select name="stage">${stageOptions(l.stage)}</select></label><label>Study block estimate (min)<input name="minutes" type="number" min="5" max="600" required value="${l.minutes}"></label><label>Lesson strength<select name="strength">${STRENGTHS.map(([value,label])=>`<option value="${value}" ${(l.strength||'unrated')===value?'selected':''}>${label}</option>`).join('')}</select></label><label>Priority<select name="priority">${[1,2,3].map(n=>`<option value="${n}" ${l.priority===n?'selected':''}>${['','Steady','Important','High priority'][n]}</option>`).join('')}</select></label><label>Next revision<input name="due" type="date" value="${l.reviewDue||''}"></label><label class="inline-check full"><input name="draft" type="checkbox" ${l.draft?'checked':''}>Still needs checking against textbook</label></div><div class="row wrap spacer">${exists?button('Add to today’s tasks','lesson-task','secondary',`type="button" data-id="${l.id}"`)+button('Delete lesson','delete-lesson','danger',`type="button" data-id="${l.id}"`):''}</div>`,f=>{
 const selection=f.get('subject');
 const paper=splitPapers.find(p=>p.id===selection);
 let n={...l,title:f.get('title').trim(),subject:paper?.subject||selection,part:paper?.part||f.get('part').trim(),minutes:Number(f.get('minutes')),priority:Number(f.get('priority')),draft:f.has('draft'),strength:f.get('strength')};if(!n.title||!n.part)throw Error('Enter a title and book.');updateStage(n,Number(f.get('stage')));n.reviewDue=f.get('due')||n.reviewDue;if(exists)state.lessons[state.lessons.findIndex(x=>x.id===id)]=n;else state.lessons.push(n);commit('Lesson saved.');});}
function updateStage(l,stage){let old=l.stage;l.stage=stage;if(stage>=2&&old<2){if(!l.covered)l.covered=today();if(!l.reviewDue)l.reviewDue=addDays(today(),1);}if(stage<2){l.covered=null;l.reviewDue=null;l.reviewCount=0;}}
function scoreDialog(id) {
  const existing = state.scores.find(result => result.id === id);
  const result = existing || {
    id: uid(), date: today(), exam: '', subject: 'math',
    kind: 'Practice', mark: '', max: 100,
  };
  modal(existing ? 'Edit result' : 'Record a result', `
    <div class="form-grid">
      <label class="full">Exam set name
        <input name="exam" list="exam-sets" maxlength="80" required
          placeholder="e.g. Practice round 1" value="${esc(result.exam)}">
        <datalist id="exam-sets">${examSets().map(exam => `<option>${esc(exam)}</option>`).join('')}</datalist>
      </label>
      <label>Subject total
        <select name="subject" id="result-subject">${subjectOptions(result.subject,true).replace('<option value="all">All subjects</option>','')}</select>
      </label>
      <label>Type<select name="kind">${['Practice','Prelim','Board'].map(kind => `<option ${result.kind===kind?'selected':''}>${kind}</option>`).join('')}</select></label>
      <label>Date<input name="date" type="date" max="${today()}" required value="${result.date}"></label>
      <label>Marks obtained<input id="result-mark" type="number" name="mark" min="0" step="0.5" required value="${result.mark}"></label>
      <label>Maximum marks<input id="result-max" name="max" type="number" min="0.5" max="10000" step="0.5" required value="${result.max}"></label>
      <fieldset class="full result-lessons">
        <legend>Lessons covered by this result</legend>
        <small>Select any number of lessons, or leave empty for a whole-subject paper. Changing the subject resets the selection.</small>
        <input id="result-lesson-search" type="search" placeholder="Find a lesson…" aria-label="Search result lessons">
        <div id="result-lesson-choices" class="result-lesson-choices">${resultLessonChoices(result.subject, result.lessons || [])}</div>
      </fieldset>
      <fieldset class="full result-losses" id="result-losses">
        <legend>Why were marks lost?</legend>
        <p class="subheading" id="result-loss-summary" role="status"></p>
        <div class="loss-input-grid">${LOSS_REASONS.map(([reason,label]) => `
          <label>${label}<input type="number" min="0" step="0.5" name="loss-${reason}" data-loss-input
            aria-label="Marks lost: ${label}" placeholder="0" value="${result.losses?.[reason] ?? ''}"></label>
        `).join('')}</div>
        <label class="spacer">Mistake note (optional)
          <textarea name="errorNote" rows="3" maxlength="1000" placeholder="e.g. Used the wrong formula in question 4">${esc(result.errorNote || '')}</textarea>
        </label>
      </fieldset>
    </div>
    <p class="legend">One result per subject per exam set. Unassigned lost marks stay unclassified.</p>
  `, form => {
    const saved = {
      ...result,
      exam: form.get('exam').trim(), subject: form.get('subject'),
      kind: form.get('kind'), date: form.get('date'),
      mark: Number(form.get('mark')), max: Number(form.get('max')),
    };
    if (!saved.exam || saved.mark > saved.max) {
      throw Error('Check the exam name and marks (obtained cannot exceed maximum).');
    }
    if (state.scores.some(other => other.id !== saved.id && other.exam === saved.exam && other.subject === saved.subject)) {
      throw Error('That exam set already has this subject. Edit its existing result.');
    }
    const candidates = resultLessons(saved.subject, result.lessons || []);
    saved.lessons = form.getAll('lesson').map(lessonId => {
      const lesson = candidates.find(candidate => candidate.id === lessonId);
      if (!lesson) throw Error('Please select the lessons again.');
      return {id: lesson.id, title: lesson.title, subject: lesson.subject};
    });
    saved.losses = {};
    saved.errorNote = '';
    if (saved.mark < saved.max) {
      for (const [reason] of LOSS_REASONS) {
        const marks = Number(form.get('loss-' + reason));
        if (marks !== 0) saved.losses[reason] = marks;
      }
      saved.errorNote = (form.get('errorNote') || '').trim();
    }
    validateResultDetails(saved);
    if (existing) state.scores[state.scores.findIndex(other => other.id === id)] = saved;
    else state.scores.push(saved);
    scoreExam = saved.exam;
    commit('Result recorded.');
  });
  $('#result-subject').addEventListener('change', event => {
    $('#result-lesson-choices').innerHTML = resultLessonChoices(event.target.value, []);
    $('#result-lesson-search').value = '';
  });
  $('#result-lesson-search').addEventListener('input', event => {
    const search = event.target.value.trim().toLowerCase();
    for (const label of document.querySelectorAll('[data-result-lesson]')) {
      label.hidden = !label.textContent.toLowerCase().includes(search);
    }
  });
  for (const input of document.querySelectorAll('#result-mark, #result-max, [data-loss-input]')) {
    input.addEventListener('input', updateResultLossSummary);
  }
  updateResultLossSummary();
}

function resultLessons(subject, savedLessons) {
  const lessons = state.lessons.filter(lesson => lessonMatchesSubject(lesson, subject));
  const historical = savedLessons.filter(lesson => lessonMatchesSubject(lesson, subject)
    && !lessons.some(current => current.id === lesson.id));
  return [...lessons, ...historical];
}

function resultLessonChoices(subject, savedLessons) {
  return resultLessons(subject, savedLessons).map(lesson => `
    <label data-result-lesson>
      <input type="checkbox" name="lesson" value="${esc(lesson.id)}"
        ${savedLessons.some(saved => saved.id === lesson.id) ? 'checked' : ''}>
      <span>${esc(lesson.title)}${state.lessons.some(current => current.id === lesson.id) ? '' : ' (removed from tracker)'}</span>
    </label>
  `).join('') || '<p class="subheading">No lessons in this subject yet. Add them in Lessons.</p>';
}

function updateResultLossSummary() {
  const obtained = $('#result-mark').value;
  const maximum = $('#result-max').value;
  const lost = Number(maximum) - Number(obtained);
  const show = obtained !== '' && maximum !== '' && lost > 0;
  $('#result-losses').hidden = !show;
  if (!show) return;
  const allocated = [...document.querySelectorAll('[data-loss-input]')]
    .reduce((total, input) => total + Number(input.value || 0), 0);
  $('#result-loss-summary').textContent = allocated > lost + 0.000001
    ? `You lost ${lost} marks but assigned ${allocated}. Reduce the breakdown before saving.`
    : `${lost} marks lost · ${allocated} assigned · ${Math.max(0,lost-allocated)} unclassified`;
}

function resultLessonSummary(result) {
  if (!result.lessons?.length) return '';
  return `<small class="result-lesson-summary">${result.lessons.map(lesson => esc(lesson.title)).join(' · ')}</small>`;
}

function resultMistakes(result) {
  const summary = lossSummary(result);
  if (!summary.lost) return '';
  return `<details class="result-mistakes"><summary>${summary.lost} marks lost</summary>
    ${LOSS_REASONS.filter(([reason]) => result.losses?.[reason] > 0)
      .map(([reason,label]) => `<div>${label}: ${result.losses[reason]}</div>`).join('')}
    ${summary.unclassified > 0 ? `<div>Unclassified: ${summary.unclassified}</div>` : ''}
    ${result.errorNote ? `<p>${esc(result.errorNote)}</p>` : ''}
  </details>`;
}

function mistakeOverview() {
  const totals = LOSS_REASONS.map(([reason,label]) => ({
    label, marks: state.scores.reduce((total,result) => total + (result.losses?.[reason] || 0), 0),
  })).filter(reason => reason.marks > 0).sort((a,b) => b.marks-a.marks);
  if (!totals.length) return '';
  return `<section class="card spacer"><h2>Where marks were lost</h2>
    <p class="subheading">Across all recorded results. Open a result in the journal to see its lessons and mistake notes.</p>
    <div class="mistake-totals">${totals.map(reason => `<div><b>${reason.marks}</b><small>${reason.label}</small></div>`).join('')}</div>
  </section>`;
}

function targetsDialog(){let p=state.settings;modal('Set a sustainable pace',`<div class="form-grid"><label>New lesson units / day<input name="daily" type="number" min="0" max="30" step="1" required value="${p.daily}"></label><label>New units / week<input name="weekly" type="number" min="0" max="150" required value="${p.weekly}"></label><label>Study minutes / day<input name="minutes" type="number" min="15" max="720" required value="${p.minutes}"></label><label>Days early before prelims<input name="prelimsBuffer" type="number" min="0" max="60" required value="${p.prelimsBuffer??7}"></label><label>Days early before boards<input name="boardsBuffer" type="number" min="0" max="60" required value="${p.boardsBuffer??14}"></label><label>Goal percentage<input name="target" type="number" min="0" max="100" required value="${p.target}"></label></div><p class="legend">The daily base stays fixed until you edit it. Missed work carries forward automatically; finishing the syllabus switches the focus to revision. Early-finish buffers reserve time for revision. Long chapters may take multiple study blocks. Revision and timed papers also need time.</p>`,f=>{const old=state.settings.daily;if(Number(f.get('daily'))!==old){for(let i=0;i<Math.max(0,Math.min(3660,days(state.created,today())));i++){let d=addDays(state.created,i);if(state.settings.overrides[d]===undefined)state.settings.overrides[d]=old;}}for(let k of ['daily','weekly','minutes','target','prelimsBuffer','boardsBuffer'])state.settings[k]=Number(f.get(k));commit('Targets updated.');});}
function download(filename,text,type='application/json'){const url=URL.createObjectURL(new Blob([text],{type}));let a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportData(){download('ssc-compass-'+today()+'.json',JSON.stringify(state,null,2));}
function confirmAction(title,desc,action){modal(title,`<p>${desc}</p>`,action);}
document.addEventListener('click',async e=>{let n=e.target.closest('[data-page],[data-action]');if(!n)return;try{if(n.dataset.page){page=n.dataset.page;render();window.scrollTo(0,0);return;}let a=n.dataset.action,id=n.dataset.id;if(['today','lessons','plan','settings','focus'].includes(a)){page=a;render();return;}switch(a){case 'account':page='settings';render();$('#account-section').scrollIntoView({block:'start'});break;case 'papers':page='plan';render();$('#board-papers').scrollIntoView({block:'start'});break;case 'edit-paper':editPaper(id);break;case 'paper-calendar':download('ssc-board-papers.ics',paperCalendar(state),'text/calendar');break;case 'enable-alerts':await enableAlerts();break;case 'focus-return':showFocus();break;case 'focus-hide':await leaveFocus();break;case 'focus-fullscreen':try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else if(!document.fullscreenElement)toast('Full screen is not available on this browser.');}catch{toast('Full screen is not available on this browser.');}break;case 'focus-end':await finishFocus(false);break;case 'delete-session':confirmAction('Remove study log?', 'This removes this session from your activity totals.',()=>{state.sessions=state.sessions.filter(x=>x.id!==id);commit('Study log removed.');});break;case 'close':$('#dialog').close();break;case 'marathi-lessons':
 subjectFilter='other';
 stageFilter='all';
 query='';
 render();
 $('#subject-filter').focus();
 break;
case 'add-lesson':lessonDialog();break;case 'open-lesson':lessonDialog(id);break;case 'next':{let l=recommendations(state)[0];if(l)lessonDialog(l.id);else toast('All caught up. Add a timed practice paper.');break;}case 'review':{let l=state.lessons.find(x=>x.id===id);l.lastReview=today();l.reviewCount=(l.reviewCount||0)+1;l.reviewDue=addDays(today(),[1,3,7,14,30][Math.min(l.reviewCount,4)]);commit('Review saved. Next: '+fmt(l.reviewDue));break;}case 'targets':targetsDialog();break;case 'score':scoreDialog();break;case 'edit-score':scoreDialog(id);break;case 'delete-score':confirmAction('Delete this result?','This removes the result from all calculations.',()=>{state.scores=state.scores.filter(s=>s.id!==id);commit('Result deleted.');});break;case 'delete-lesson':confirmAction('Delete this lesson?','This removes its progress and linked tasks. Export a backup first if needed.',()=>{if(state.lessons.length<=1)throw Error('Keep at least one lesson.');state.lessons=state.lessons.filter(l=>l.id!==id);state.tasks=state.tasks.filter(t=>t.lessonId!==id);if(!state.lessons.length)throw Error('Keep at least one lesson.');commit('Lesson deleted.');});break;case 'lesson-task':{let l=state.lessons.find(x=>x.id===id);if(state.tasks.some(t=>t.lessonId===id&&t.date===today())){toast('Already in today’s tasks.');break;}state.tasks.push({id:uid(),title:l.title,date:today(),done:false,lessonId:id});$('#dialog').close();commit('Added to today’s focus.');break;}case 'task':modal('One small task',`<div class="form-grid"><label class="full">What will you work on?<input name="title" maxlength="200" required placeholder="e.g. Solve 10 quadratic equations"></label><label>Date<input type="date" name="date" required value="${today()}"></label></div>`,f=>{let title=f.get('title').trim();if(!title)throw Error('Enter a task.');state.tasks.push({id:uid(),title,date:f.get('date'),done:false});commit('Task added.');});break;case 'delete-task':state.tasks=state.tasks.filter(t=>t.id!==id);commit('Task removed.');break;case 'log':modal('Count your focused time',`<div class="form-grid"><label>Date<input type="date" name="date" required max="${today()}" value="${today()}"></label><label>Focused minutes<input type="number" name="minutes" required min="1" max="720" value="30"></label><label class="full">What did you study?<input name="note" maxlength="200" placeholder="Optional note"></label></div>`,f=>{state.sessions.push({id:uid(),date:f.get('date'),minutes:Number(f.get('minutes')),note:f.get('note')});commit('Study time logged.');});break;case 'add-time-block':timeBlockDialog();break;
case 'edit-time-block':timeBlockDialog(id);break;
case 'remove-time-block':
 state.settings.timeBlocks=state.settings.timeBlocks.filter(block=>block.id!==id);
 commit('Time block removed.');
 break;
case 'pull-lesson-forward':{
 const choice=pullForwardChoice(scheduleDate);
 if(!choice)break;
 if(choice.task)choice.task.date=scheduleDate;
 else state.tasks.push({id:uid(),title:choice.lesson.title,date:scheduleDate,done:false,lessonId:choice.lesson.id});
 commit('Lesson scheduled for '+fmt(scheduleDate)+'.');
 break;
}
case 'date-target':modal('A target for another day',`<div class="form-grid"><label>Date<input type="date" name="date" required value="${today()}"></label><label>New units target<input type="number" name="target" min="0" max="30" required value="${state.settings.daily}"></label></div>`,f=>{state.settings.overrides[f.get('date')]=Number(f.get('target'));commit('Daily target saved.');});break;case 'prelims':case 'boards':insightExam=a;render();break;case 'export':exportData();break;case 'restore-archived':{const i=state.archivedLessons?.findIndex(l=>l.id===id)??-1;if(i<0)break;if(state.lessons.length>=2000)throw Error('The active lesson limit has been reached.');state.lessons.push(...state.archivedLessons.splice(i,1));commit('Lesson restored.');break;}case 'reload-local':readLocal();conflict=false;syncText='Saved on this device';render();break;case 'import':$('#import-file').click();break;case 'sync':if(!ready)await connect();else await sync();break;case 'signout':if(syncing)throw Error('Wait for the current sync to finish.');if(dirty||conflict)throw Error('Export or resolve unsynced changes before signing out.');await cloud.signout();scope='guest';ready=true;conflict=false;readLocal();syncText='Saved on this device';render();break;case 'import-guest':confirmAction('Use this device’s guest plan?','This replaces the signed-in plan with the device-only plan. Export both copies first.',()=>{const local=JSON.parse(localStorage.getItem('ssc-compass-v1-guest')||'null');if(!local)throw Error('No device-only plan exists.');const profile={name:state.settings.name,school:state.settings.school,board:state.settings.board};state=upgrade(validate(local.data));Object.assign(state.settings,profile);commit('Device plan copied to your account.');});break;case 'resolve-cloud':confirmAction('Load the cloud copy?','This replaces this device’s plan. Export this copy first to keep its changes.',async()=>{let r=await cloud.load();if(!r)throw Error('No cloud copy found.');loadCloudPlan(r);conflict=false;ready=true;syncText=dirty?'More changes waiting':'Cloud synced';render();if(dirty)await sync();});break;case 'resolve-local':confirmAction('Replace the cloud copy?','Other-device changes will be replaced by this copy. Export both copies first if needed.',async()=>{let r=await cloud.load();version=r?.version||0;conflict=false;ready=true;dirty=true;await sync();});break;case 'install':if(installPrompt){await installPrompt.prompt();installPrompt=null;render();}else installHelp();break;case 'notify':if(!('Notification' in window))throw Error('This browser does not support notifications. Use calendar reminders.');if(await Notification.requestPermission()!=='granted')throw Error('Notifications were not allowed. Calendar reminders are another option.');let reg=await navigator.serviceWorker.ready;await reg.showNotification('Your next small win',{body:'Choose one lesson. Study, practise, then take a break.',icon:'icon-192.png',tag:'study-test'});toast('Test reminder sent.');break;case 'calendar':{let lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SSC Compass//Study Tasks//EN','CALSCALE:GREGORIAN'];const clean=s=>s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');state.tasks.filter(t=>!t.done&&t.date>=today()).forEach(t=>{lines.push('BEGIN:VEVENT','UID:'+t.id+'@ssccompass','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+'Z','DTSTART:'+t.date.replace(/-/g,'')+'T163000','DTEND:'+t.date.replace(/-/g,'')+'T170000','SUMMARY:'+clean(t.title),'DESCRIPTION:Study block from SSC Compass. Adjust time to fit school.','BEGIN:VALARM','TRIGGER:-PT15M','ACTION:DISPLAY','DESCRIPTION:Study reminder','END:VALARM','END:VEVENT');});lines.push('END:VCALENDAR');download('ssc-study-tasks.ics',lines.join('\r\n'),'text/calendar');toast('Calendar uses 4:30 pm device-local blocks; adjust after importing.');break;}}}catch(err){toast(err.message);}});
document.addEventListener('change',async e=>{let n=e.target;try{if(n.dataset.paper){const checks=state.settings.paperChecks??={};(checks[n.dataset.paper]??={})[n.dataset.check]=n.checked;commit('Checklist saved.');}if(n.dataset.strength){if(!STRENGTHS.some(([value])=>value===n.value))throw Error('Choose a lesson strength.');state.lessons.find(l=>l.id===n.dataset.strength).strength=n.value;commit('Lesson strength saved.');}if(n.dataset.stage){updateStage(state.lessons.find(l=>l.id===n.dataset.stage),Number(n.value));commit('Progress saved.');}if(n.dataset.task){state.tasks.find(t=>t.id===n.dataset.task).done=n.checked;commit();}if(n.dataset.dayTarget){let v=Number(n.value);if(!n.checkValidity())throw Error('Choose a target from 0 to 30.');state.settings.overrides[n.dataset.dayTarget]=v;commit('Target updated.');}if(n.id==='schedule-date'&&n.value&&n.checkValidity()){
 scheduleDate=n.value;
 render();
 $('#schedule-date').focus();
}
if(n.id==='schedule-free'){
 const freeDays=state.settings.freeDays??={};
 if(n.checked)freeDays[scheduleDate]=true;
 else delete freeDays[scheduleDate];
 commit(n.checked?'Free day saved.':'Weekly blocks restored for this date.');
 $('#schedule-free').focus();
}
if(n.id==='subject-filter'){subjectFilter=n.value;render();}if(n.id==='stage-filter'){stageFilter=n.value;render();}if(n.id==='exam-filter'){scoreExam=n.value;render();}if(n.id==='score-mode'){state.settings.mode=n.value;commit();}if(n.id==='import-file'){const file=n.files[0];if(!file)return;if(file.size>5e6)throw Error('Backup is too large (5 MB maximum).');let data=upgrade(validate(JSON.parse(await file.text())));confirmAction('Restore this backup?','This replaces the current plan and will sync to your account if signed in. Export the current plan first.',()=>{state=data;commit('Backup restored.');});}}catch(err){toast(err.message);}});
document.addEventListener('input',e=>{if(e.target.id==='search'){query=e.target.value;let pos=e.target.selectionStart;render();$('#search').focus();$('#search').setSelectionRange(pos,pos);}});
document.addEventListener('submit',async e=>{let id=e.target.id;if(!['settings-form','cloud-config','firebase-auth','registration-form','reset-password','focus-form','reminders-form'].includes(id))return;e.preventDefault();let f=new FormData(e.target),submit=e.submitter||e.target.querySelector('button');submit.disabled=true;try{if(id==='focus-form'){const minutes=Number(f.get('minutes'));if(getFocus())throw Error('A focus session is already running.');if(!Number.isInteger(minutes)||minutes<1||minutes>180)throw Error('Choose 1–180 minutes.');const start=Date.now();localStorage.setItem(focusKey(),JSON.stringify({id:uid(),start,end:start+minutes*60000,date:today(),subject:f.get('subject'),note:f.get('note').trim()}));render();showFocus();}if(id==='reminders-form'){state.settings.reminders=f.has('enabled');state.settings.reminderTime=f.get('time');commit('Reminder preference saved.');checkReminder();}if(id==='settings-form'){if(f.get('prelims')>f.get('boards'))throw Error('Prelims must be on or before boards.');state.settings={...state.settings,...Object.fromEntries(f)};commit('Settings saved.');}if(id==='cloud-config'){cloud.configure(f.get('projectId'),f.get('apiKey'));toast('Firebase connection saved. Enable Email/Password and deploy firestore.rules before signing in.');render();}if(id==='reset-password'){await cloud.resetPassword(f.get('email').trim());toast('If an account exists, check your email for reset instructions.');}if(id==='firebase-auth'||id==='registration-form'){const registration=id==='registration-form',email=f.get('email').trim();const profile=registration?Object.fromEntries(['name','school','board'].map(k=>[k,f.get(k).trim()])):null;if(profile&&Object.values(profile).some(v=>!v))throw Error('Enter the student name, school and board.');await cloud.signIn(email,f.get('password'),registration);sessionStorage.setItem('ssc-email',email);scope=cloud.accountKey();conflict=false;readLocal();if(profile){Object.assign(state.settings,profile);dirty=true;persist();}await connect();toast(registration?'Account created. Your profile is saved.':'Signed in. Device-only progress can be copied in Settings.');}}catch(err){toast(err.message);}finally{submit.disabled=false;}});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;render();});window.addEventListener('online',()=>ready?sync():connect());window.addEventListener('offline',()=>{syncText=cloud.session?'Offline · saved here':'Offline · device only';render();});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){if(cloud.session){if(ready)sync();else connect();}else render();}});window.addEventListener('storage',e=>{if(e.key===storageKey()){conflict=true;syncText='Another tab changed this plan. Export then reload.';render();}});setInterval(()=>{if(cloud.session&&document.visibilityState==='visible')sync();},60000);
function boardPanel(){const d=today();return `<section class="card exam-card" id="board-papers"><div class="card-head"><div><span class="eyebrow">2027 BOARD EXAMS</span><h2>Paper-by-paper countdown</h2></div>${button('Calendar ↓','paper-calendar','ghost')}</div><p class="subheading">Dates and exam times from the Maharashtra SSC Feb–Mar 2027 timetable. Confirm paper codes, reporting times and venue with your school. History and Political Science share one paper (9 History and 5 Political Science chapters in the default plan). Paper marks here are separate from the six-subject aggregate.</p><div class="paper-list">${boardPapers(state).map(p=>{const n=days(d,p.date),c=paperCoverage(state,p),checks=state.settings.paperChecks?.[p.id]||{},r=state.settings.paperResults?.[p.id];return `<article class="paper-row"><div class="paper-top"><div><h3>${p.title}</h3><small>${fmt(p.date)} · Code ${p.code}<br>${paperTime(p)}<br>${c.done}/${c.total} units covered${r?' · '+r.mark+'/'+r.max+' marks':''}</small></div><div class="row"><span class="pill ${n>=0&&n<=7?'gold':''}">${n<0?'Past':n===0?'Today':n===1?'Tomorrow':n+' days'}</span>${button('Edit','edit-paper','textbutton',`data-id="${p.id}" aria-label="Edit ${p.title} paper"`)}</div></div><div class="track"><span style="width:${percent(c.done,c.total)}%"></span></div><div class="paper-checks">${PAPER_CHECKS.map(([id,label])=>`<label><input type="checkbox" data-paper="${p.id}" data-check="${id}" ${checks[id]?'checked':''} aria-label="${p.title}: ${label}">${label}</label>`).join('')}</div></article>`;}).join('')}</div></section>`;}
function editPaper(id){const p=boardPapers(state).find(x=>x.id===id),r=state.settings.paperResults?.[id];if(!p)return;modal(p.title+' paper',`<div class="form-grid"><label class="full">Exam date<input type="date" name="date" value="${p.date}" required></label><label>Marks (optional)<input type="number" name="mark" min="0" step="0.5" value="${r?.mark??''}"></label><label>Maximum marks<input type="number" name="max" min="0.5" max="1000" step="0.5" value="${r?.max??''}"></label></div>`,f=>{const mark=f.get('mark'),max=f.get('max');if(f.get('date')<state.settings.prelims)throw Error('A board paper cannot be before prelims.');if((mark==='')!==(max==='')||mark!==''&&Number(mark)>Number(max))throw Error('Enter both marks and maximum, and keep marks within the maximum.');(state.settings.paperDates??={})[id]=f.get('date');const results=state.settings.paperResults??={};if(mark==='')delete results[id];else results[id]={mark:Number(mark),max:Number(max)};state.settings.boards=boardPapers(state)[0].date;commit('Paper updated.');});}
function activityPanel(){const a=activity(state),limit=Math.max(1,...Object.values(a.totals));return `<section class="card spacer"><div class="card-head"><h2>Study activity</h2>${button('Start focus ↗','focus','textbutton')}</div><div class="activity-metrics"><div><b>${a.todayMinutes}/${dayAvailability(state.settings,today()).budget}</b><small>minutes today</small></div><div><b>${a.weekly}</b><small>minutes in 7 days</small></div><div><b>${a.streak}</b><small>day study streak</small></div><div><b>${a.focusBlocks}</b><small>focus blocks this week</small></div></div><div class="activity-bars">${Object.entries(a.totals).map(([d,v])=>`<div><small>${d.slice(5)}</small><div class="track"><span style="width:${Math.round(v/limit*100)}%"></span></div><small>${v} min</small></div>`).join('')}</div></section>`;}
function focusPage(){const run=getFocus();return `${heading('Focus room','One subject, one block of time. Finished blocks go straight into your study log.')}<section class="card focus-card"><div class="eyebrow">DISTRACTION-FREE STUDY</div><h2>${run?'Your timer is running':'Start a focus block'}</h2>${run?button('Return to timer','focus-return','primary'):`<form id="focus-form" class="form-grid"><label>Minutes<input type="number" name="minutes" min="1" max="180" value="25" required></label><label>Subject<select name="subject">${subjectOptions('all')}</select></label><label class="full">What will you work on?<input name="note" maxlength="120" placeholder="e.g. Solve five geometry problems"></label><button class="primary">Start focus</button></form>`}<p class="subheading focus-hint">Focus mode hides the rest of the app. Full screen and keeping the display awake depend on the browser. For phone-wide limits, use <a href="https://support.apple.com/en-us/111795" target="_blank" rel="noopener">iPhone Guided Access</a> or <a href="https://support.google.com/android/answer/9455138" target="_blank" rel="noopener">Android app pinning</a>; turn on Do Not Disturb if you want fewer interruptions.</p>${button('Enable timer alerts','enable-alerts','ghost')}</section>${activityPanel()}<section class="card spacer"><div class="card-head"><h2>Recent study log</h2>${button('+ Log study','log','secondary')}</div>${state.sessions.length?state.sessions.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12).map(x=>`<div class="task-row"><div class="grow"><b>${x.minutes} min · ${esc(x.subject&&x.subject!=='all'?name(x.subject):x.source==='focus'?'Focus block':'Study')}</b><small>${fmt(x.date)}${x.note?' · '+esc(x.note):''}</small></div>${button('Remove','delete-session','textbutton',`data-id="${x.id}"`)}</div>`).join(''):'<p class="subheading">No study blocks yet. Start the timer or log a session.</p>'}</section>`;}
const focusKey=()=>storageKey()+'-focus';
let wakeLock, finishing=false;
function getFocus(){try{const r=JSON.parse(localStorage.getItem(focusKey()));return r&&typeof r.id==='string'&&Number.isFinite(r.start)&&Number.isFinite(r.end)&&r.end>r.start?r:null;}catch{return null;}}
async function keepAwake(){if(wakeLock&&!wakeLock.released||!navigator.wakeLock||document.hidden||!$('#focus-screen').open)return;try{wakeLock=await navigator.wakeLock.request('screen');if(!$('#focus-screen').open)await wakeLock.release();}catch{}}
function showFocus(){const r=getFocus();if(!r)return;const el=$('#focus-screen');if(el.open)return;el.innerHTML=`<div class="focus-inner"><span class="eyebrow">SSC COMPASS · FOCUS ROOM</span><h2 id="focus-title">${esc(r.subject==='all'?'Focus block':name(r.subject))}</h2><p>${esc(r.note||'Keep your attention on the task in front of you.')}</p><div class="focus-clock" id="focus-clock" role="timer" aria-label="Time remaining"></div><p class="focus-caption">Your timer keeps its end time if this screen closes.</p><div class="row focus-buttons">${button('Full screen','focus-fullscreen','ghost')}${button('Back to app','focus-hide','ghost')}${button('End session','focus-end','secondary')}</div></div>`;el.showModal();updateFocus();keepAwake();}
async function leaveFocus(){const el=$('#focus-screen');if(el.open)el.close();try{await wakeLock?.release();}catch{}wakeLock=null;if(document.fullscreenElement)try{await document.exitFullscreen();}catch{}}
async function finishFocus(complete){const r=getFocus();if(!r||finishing)return;finishing=true;try{const entry=focusLog(r);localStorage.removeItem(focusKey());await leaveFocus();if(entry&&!state.sessions.some(x=>x.id===entry.id)){state.sessions.push(entry);commit(`${entry.minutes} focus minute${entry.minutes===1?'':'s'} logged.`);}else {render();toast('Focus session ended.');}if(complete){toast('Focus time is up. Take a short break.');await sendAlert('Focus complete','Your study block is saved. Take a short break.','focus-'+r.id);}}finally{finishing=false;}}
function updateFocus(){const r=getFocus();if(!r){if($('#focus-screen').open)leaveFocus();return;}const seconds=focusRemaining(r),clock=$('#focus-clock');if(clock)clock.textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;if(seconds===0)finishFocus(true).catch(e=>toast(e.message));}
async function sendAlert(title,body,tag){if(!('Notification' in window)||Notification.permission!=='granted'||!navigator.serviceWorker)return;try{const reg=await navigator.serviceWorker.getRegistration();await reg?.showNotification(title,{body,tag,icon:'icon-192.png'});}catch{}}
async function enableAlerts(){if(!('Notification' in window))return toast('Use calendar reminders on this device. On iPhone, try adding the app to your Home Screen first.');try{const permission=await Notification.requestPermission();toast(permission==='granted'?'Notifications enabled on this device.':'Browser notifications are off. Calendar reminders still work.');}catch{toast('Browser notifications are unavailable here.');}}
function checkReminder(){const d=today(),t=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());const body=reminderFor(state,d,t),key=storageKey()+'-reminded';if(!body||localStorage.getItem(key)===d||document.hidden)return;localStorage.setItem(key,d);toast(body);sendAlert('Your SSC study reminder',body,'study-'+d);}
function reminderPanel(){return `<section class="card settings-block"><h2>Reminders</h2><p class="subheading">One daily reminder per device, with upcoming papers, overdue revisions and open tasks. It appears when the app is running. For alerts with the app closed, import the board calendar into your phone calendar.</p><form id="reminders-form" class="form-grid"><label class="inline-check"><input type="checkbox" name="enabled" ${state.settings.reminders?'checked':''}>Daily study reminder</label><label>Reminder time (India)<input type="time" name="time" value="${state.settings.reminderTime||'18:00'}" required></label><button>Save reminders</button></form><div class="row spacer">${button('Enable notifications','enable-alerts','ghost')}${button('Board calendar ↓','paper-calendar','ghost')}</div></section>`;}
function installHelp(){modal('Install SSC Compass',`<p><b>Android:</b> Open this link in Chrome, then choose Install app or Add to Home screen in the browser menu.</p><p><b>iPhone:</b> Open in Safari, tap Share → Add to Home Screen.</p><p>Open it once online before studying offline.</p>`,()=>{});$('#modal-form button[type="submit"]').textContent='Got it';}

$('#focus-screen').addEventListener('cancel',e=>{e.preventDefault();leaveFocus();});
setInterval(updateFocus,1000);setInterval(checkReminder,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateFocus();keepAwake();checkReminder();}});
render();persist();updateFocus();checkReminder();if(cloud.session)connect();if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>toast('Offline installation unavailable in this browser.'));
