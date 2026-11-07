export const WEEKDAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_MINUTES=1440;
const clockPattern=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const minute=time=>Number(time.slice(0,2))*60+Number(time.slice(3));

export function validateSchedule(settings,validDate){
 const {timeBlocks=[],freeDays={}}=settings;
 if(!Array.isArray(timeBlocks)||timeBlocks.length>100)throw Error('Invalid weekly schedule.');
 const ids=new Set();
 for(const block of timeBlocks){
  if(!block||typeof block.id!=='string'||!/^[\w-]{1,120}$/.test(block.id)||ids.has(block.id)
   ||typeof block.title!=='string'||!block.title.trim()||block.title.length>60
   ||!['school','coaching','other'].includes(block.kind)
   ||!clockPattern.test(block.start)||!clockPattern.test(block.end)||block.start===block.end
   ||!Array.isArray(block.days)||!block.days.length||block.days.length>7
   ||new Set(block.days).size!==block.days.length
   ||block.days.some(day=>!Number.isInteger(day)||day<0||day>6))throw Error('Invalid time block.');
  ids.add(block.id);
 }
 if(!freeDays||typeof freeDays!=='object'||Array.isArray(freeDays)
  ||Object.entries(freeDays).some(([date,value])=>!validDate(date)||value!==true))throw Error('Invalid free day.');
}

export function dayAvailability(settings,date){
 const freeDay=settings.freeDays?.[date]===true;
 const weekday=new Date(date+'T12:00:00Z').getUTCDay();
 const wake=minute(settings.wake);
 const bedTime=minute(settings.bed);
 const bed=bedTime<=wake?bedTime+DAY_MINUTES:bedTime;
 const intervals=[];
 if(!freeDay){
  for(const block of settings.timeBlocks||[]){
   const start=minute(block.start);
   const end=minute(block.end)+(block.end<block.start?DAY_MINUTES:0);
   for(const offset of [-1,0,1]){
    if(!block.days.includes((weekday+offset+7)%7))continue;
    const from=Math.max(wake,start+offset*DAY_MINUTES);
    const to=Math.min(bed,end+offset*DAY_MINUTES);
    if(from<to)intervals.push({from,to});
   }
  }
 }
 intervals.sort((a,b)=>a.from-b.from);
 const busy=[];
 for(const interval of intervals){
  const previous=busy.at(-1);
  if(previous&&interval.from<=previous.to)previous.to=Math.max(previous.to,interval.to);
  else busy.push(interval);
 }
 const free=[];
 let cursor=wake;
 for(const {from,to} of busy){
  if(cursor<from)free.push({from:cursor,to:from});
  cursor=to;
 }
 if(cursor<bed)free.push({from:cursor,to:bed});
 const blockedMinutes=busy.reduce((sum,{from,to})=>sum+to-from,0);
 const freeMinutes=bed-wake-blockedMinutes;
 return {freeDay,blockedMinutes,freeMinutes,free,busy,budget:Math.min(settings.minutes,freeMinutes)};
}

// Existing tasks take priority. Bring a linked future task forward instead of duplicating it.
export function earlyLesson(state,date,now,targetCount){
 const plan=dayAvailability(state.settings,date);
 if(!plan.freeDay||date<now)return null;
 const tasks=state.tasks.filter(task=>task.date===date&&!task.done&&task.lessonId);
 const lessonsById=new Map(state.lessons.map(lesson=>[lesson.id,lesson]));
 const queued=new Set(tasks.map(task=>task.lessonId));
 const queuedMinutes=[...queued].reduce((sum,id)=>sum+(lessonsById.get(id)?.minutes||0),0);
 const loggedMinutes=state.sessions.filter(session=>session.date===date).reduce((sum,session)=>sum+session.minutes,0);
 const candidates=state.lessons.filter(lesson=>lesson.stage<2&&!queued.has(lesson.id))
  .sort((a,b)=>b.priority-a.priority||b.stage-a.stage);
 const scheduled=state.tasks.filter(task=>task.lessonId&&!task.done&&task.date>date)
  .sort((a,b)=>a.date.localeCompare(b.date));
 const pending=candidates.filter(lesson=>!state.tasks.some(task=>task.lessonId===lesson.id&&!task.done&&task.date<=date));
 const ordered=[...new Set([...scheduled.map(task=>lessonsById.get(task.lessonId)).filter(lesson=>pending.includes(lesson)),...pending])];
 const unqueuedTargets=Math.max(0,targetCount-[...queued].filter(id=>lessonsById.get(id)?.stage<2).length);
 const spare=plan.budget-loggedMinutes-queuedMinutes;
 const longestWindow=Math.max(0,...plan.free.map(({from,to})=>to-from));
 const reserved=ordered.slice(0,unqueuedTargets).reduce((sum,lesson)=>sum+lesson.minutes,0);
 const lesson=ordered.find((item,index)=>{
  const scheduledTask=scheduled.some(task=>task.lessonId===item.id);
  if(index<unqueuedTargets&&!scheduledTask)return false;
  const otherTargetMinutes=reserved-(index<unqueuedTargets?item.minutes:0);
  return item.minutes<=Math.min(spare-otherTargetMinutes,longestWindow);
 });
 if(!lesson)return null;
 return {lesson,task:scheduled.find(item=>item.lessonId===lesson.id)};
}
