import {dayAvailability} from './schedule.js';

export const TEST_PREP_DAYS=14;
const DAY_MS=86400000;
const dateMs=date=>Date.parse(date+'T00:00:00Z');
const offsetDate=(date,offset)=>new Date(dateMs(date)+offset*DAY_MS).toISOString().slice(0,10);

export function validateUpcomingTests(tests,validDate,validId){
 if(tests===undefined)return;
 if(!Array.isArray(tests)||tests.length>100)throw Error('Keep up to 100 scheduled tests.');
 const ids=new Set();
 for(const test of tests){
  if(!test||!validId(test.id)||ids.has(test.id)||typeof test.title!=='string'
   ||!test.title.trim()||test.title.length>100||!validDate(test.date)
   ||!Array.isArray(test.lessonIds)||!test.lessonIds.length||test.lessonIds.length>2000
   ||test.lessonIds.some(id=>!validId(id))||new Set(test.lessonIds).size!==test.lessonIds.length){
   throw Error('Enter a test name, a valid date and at least one lesson.');
  }
  ids.add(test.id);
 }
}

function needsPrep(lesson,test,now){
 const reviewSince=offsetDate(test.date,-7);
 return lesson.stage<2||![lesson.covered,lesson.lastReview].some(date=>date>=reviewSince&&date<=now);
}

export function testReadiness(test,lessons,plan,now){
 const selected=lessons.filter(lesson=>test.lessonIds.includes(lesson.id));
 const pending=selected.filter(lesson=>needsPrep(lesson,test,now));
 const firstPass=pending.filter(lesson=>lesson.stage<2).length;
 const scheduled=Object.values(plan.byDay).flat()
  .filter(item=>item.tests.some(entry=>entry.id===test.id)).length;
 return {firstPass,revision:pending.length-firstPass,ready:selected.length-pending.length,
  scheduled,inWindow:dateMs(test.date)-dateMs(now)<=TEST_PREP_DAYS*DAY_MS};
}

export function testPrepPlan(state,now){
 const tests=(state.upcomingTests||[]).filter(test=>test.date>=now)
  .sort((a,b)=>a.date.localeCompare(b.date));
 const active=tests.filter(test=>dateMs(test.date)-dateMs(now)<=TEST_PREP_DAYS*DAY_MS);
 if(!active.length)return {tests,byDay:{},unplaced:[]};
 const lessons=new Map(state.lessons.map(lesson=>[lesson.id,lesson]));
 const byDay={},capacity={},planned=new Map(),unplaced=[];
 const dateLimit=active.at(-1).date;
 for(let date=now;date<dateLimit;date=offsetDate(date,1)){
  const availability=dayAvailability(state.settings,date);
  const logged=state.sessions.filter(session=>session.date===date).reduce((sum,session)=>sum+session.minutes,0);
  const covered=state.lessons.filter(lesson=>lesson.covered===date&&lesson.stage>=2).length;
  const target=state.settings.overrides[date]??state.settings.daily;
  capacity[date]={minutes:Math.max(0,availability.budget-logged),newSlots:Math.max(0,target-covered),
   windows:availability.free.map(window=>window.to-window.from)};
 }
 for(const test of active){
  const candidates=test.lessonIds.map(id=>lessons.get(id)).filter(Boolean)
   .sort((a,b)=>Number(a.stage>=2)-Number(b.stage>=2)
    ||Number(b.strength==='weak')-Number(a.strength==='weak')||b.priority-a.priority);
  const reviewSince=offsetDate(test.date,-7);
  for(const lesson of candidates){
   if(!needsPrep(lesson,test,now))continue;
   const shared=planned.get(lesson.id);
   if(shared&&shared.date>=reviewSince){
    shared.tests.push(test);
    continue;
   }
   const revision=lesson.stage>=2||Boolean(shared);
   const minutes=revision?Math.max(5,Math.min(30,Math.ceil(lesson.minutes/2))):lesson.minutes;
   const entry={lesson,tests:[test],revision,minutes};
   const date=Object.keys(capacity).find(date=>{
    const room=capacity[date];
    return date<test.date&&(!shared||date>=reviewSince)&&(revision||room.newSlots>0)&&room.minutes>=minutes
     &&room.windows.some(length=>length>=minutes);
   });
   if(!date){unplaced.push(entry);continue;}
   const room=capacity[date];
   room.minutes-=minutes;
   if(!revision)room.newSlots--;
   room.windows[room.windows.findIndex(length=>length>=minutes)]-=minutes;
   entry.date=date;
   (byDay[date]??=[]).push(entry);
   planned.set(lesson.id,entry);
  }
 }
 return {tests,byDay,unplaced};
}
