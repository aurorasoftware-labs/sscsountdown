import {today,days,addDays} from './core.js';

export const PAPERS=[
 ['marathi','Marathi','2027-02-18','other'],['english','English','2027-02-22','english'],['hindi','Hindi','2027-02-24','hindi'],
 ['math1','Maths 1','2027-03-02','math','Algebra'],['math2','Maths 2','2027-03-04','math','Geometry'],
 ['science1','Science 1','2027-03-08','science','Part 1'],['science2','Science 2','2027-03-11','science','Part 2'],
 ['history','History & Political Science','2027-03-13','history'],['geography','Geography','2027-03-15','geo']
].map(([id,title,date,subject,part],index)=>({
 id,title,date,subject,part,
 endHour:index<3?14:13,
 composite:id==='marathi'||id==='hindi',
 code:['16 / A','03 / 17','15 / B','71','71','72','72','73','73'][index]
}));
export function paperTime(p){
 return `11:00 am–${p.endHour-12}:00 pm IST${p.composite?' (composite ends 1:00 pm)':''}`;
}
export const PAPER_CHECKS=[['review','Revision done'],['mock','Timed paper done'],['ready','Exam kit ready']];
export function boardPapers(s){return PAPERS.map(p=>({...p,date:s.settings.paperDates?.[p.id]||p.date})).sort((a,b)=>a.date.localeCompare(b.date));}
export function paperCoverage(s,p){const lessons=s.lessons.filter(l=>l.subject===p.subject&&(!p.part||l.part===p.part));return {total:lessons.length,done:lessons.filter(l=>l.stage>=2).length};}
export function activity(s,d=today()){
 const totals=Object.fromEntries(Array.from({length:7},(_,i)=>[addDays(d,i-6),0]));
 for(const x of s.sessions)if(Object.hasOwn(totals,x.date))totals[x.date]+=x.minutes;
 const active=new Set([...s.sessions.map(x=>x.date),...s.lessons.flatMap(l=>[l.covered,l.lastReview]).filter(Boolean)]);
 let cursor=active.has(d)?d:addDays(d,-1),streak=0;while(active.has(cursor)){streak++;cursor=addDays(cursor,-1);}
 return {totals,streak,weekly:Object.values(totals).reduce((a,b)=>a+b,0),todayMinutes:totals[d],focusBlocks:s.sessions.filter(x=>x.source==='focus'&&Object.hasOwn(totals,x.date)).length};
}
export function focusRemaining(run,now=Date.now()){return Math.max(0,Math.ceil((run.end-now)/1000));}
export function focusLog(run,now=Date.now()){const minutes=Math.floor(Math.max(0,Math.min(run.end,now)-run.start)/60000);return minutes?{id:run.id,date:run.date,minutes,subject:run.subject,note:run.note,source:'focus'}:null;}
export function reminderFor(s,date,time){
 if(!s.settings.reminders||time<(s.settings.reminderTime||'18:00'))return null;
 return reminderMessage(s,date);
}
export function reminderMessage(s,date){
 const papers=boardPapers(s).filter(p=>p.date===date||p.date===addDays(date,1));
 const tests=(s.upcomingTests||[]).filter(test=>test.date===date||test.date===addDays(date,1));
 const due=s.lessons.filter(l=>l.reviewDue&&l.reviewDue<=date).length;
 const tasks=s.tasks.filter(t=>!t.done&&t.date<=date).length;
 return [...papers.map(p=>`${p.title}: ${p.date===date?'today':'tomorrow'}`),...tests.map(test=>`${test.title}: ${test.date===date?'today':'tomorrow'}`),...(due?[`${due} revisions due`]:[]),...(tasks?[`${tasks} open tasks`]:[])].join(' · ')||'Check today’s plan and choose your next study block.';
}
export function paperCalendar(s,now=new Date()){
 const stamp=now.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SSC Compass//Board Papers//EN','CALSCALE:GREGORIAN','X-WR-CALNAME:SSC Compass Board Exams'];
 for(const p of boardPapers(s)){
  const date=p.date.replace(/-/g,''),eve=addDays(p.date,-1).replace(/-/g,'');
  lines.push('BEGIN:VEVENT',`UID:ssc-2027-${p.id}@ssccompass`,`DTSTAMP:${stamp}`,`DTSTART:${date}T053000Z`,...(!p.composite?[`DTEND:${date}T0${p.endHour-6}3000Z`]:[]),`SUMMARY:SSC board paper - ${p.title}`,`DESCRIPTION:${paperTime(p)}. Check school reporting time and venue.`,'BEGIN:VALARM',`TRIGGER;VALUE=DATE-TIME:${eve}T123000Z`,'ACTION:DISPLAY',`DESCRIPTION:Tomorrow - ${p.title} board paper`,'END:VALARM','END:VEVENT');
 }
 return [...lines,'END:VCALENDAR',''].join('\r\n');
}
