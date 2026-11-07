import {dayAvailability} from './schedule.js';

const clockPattern=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
export const MAX_REMINDER_TIMES=16;
const NUDGE_COUNT=8;

export function validateReminderSettings({reminderTimes,randomReminders}){
 if(reminderTimes!==undefined&&(!Array.isArray(reminderTimes)||reminderTimes.length>MAX_REMINDER_TIMES
  ||new Set(reminderTimes).size!==reminderTimes.length
  ||reminderTimes.some(time=>typeof time!=='string'||!clockPattern.test(time))))throw Error('Choose up to 16 distinct reminder times.');
 if(randomReminders!==undefined&&typeof randomReminders!=='boolean')throw Error('Invalid random reminders setting.');
}

export function reminderTimes(settings){
 return settings.reminderTimes??[settings.reminderTime||'18:00'];
}

export function reminderMinute(time){
 const [hour,minute]=time.split(':').map(Number);
 return hour*60+minute;
}

export function reminderClock(minute){
 const hour=Math.floor((minute%1440)/60);
 return String(hour).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
}

// Same random slots across reloads and devices for a given date and schedule.
function dailyRandom(date){
 let seed=Math.imul(Number(date.replaceAll('-','')),0x9e3779b1)>>>0;
 return ()=>{
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  return seed/4294967296;
 };
}

export function reminderSlots(settings,date){
 const {free}=dayAvailability(settings,date);
 const fixed=settings.reminders?reminderTimes(settings).flatMap(time=>{
  const minute=reminderMinute(time);
  return [minute,minute+1440].filter(slot=>free.some(({from,to})=>slot>=from&&slot<to));
 }):[];
 const slots=fixed.map(minute=>({minute,kind:'fixed'}));
 if(settings.randomReminders){
  const available=free.flatMap(({from,to})=>
   Array.from({length:to-from},(_,index)=>from+index)).filter(minute=>!fixed.includes(minute));
  const count=Math.min(NUDGE_COUNT,available.length);
  const random=dailyRandom(date);
  for(let index=0;index<count;index++){
   const start=Math.floor(index*available.length/count);
   const end=Math.floor((index+1)*available.length/count);
   // Choose near the centre of each bucket to keep the nudges spread out.
   const offset=Math.floor((0.25+random()*0.5)*(end-start));
   slots.push({minute:available[start+offset],kind:'nudge'});
  }
 }
 return slots.sort((a,b)=>a.minute-b.minute);
}

export function reminderCalendar(settings,dates,now=new Date()){
 const stamp=value=>value.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SSC Compass//Study Reminders//EN','X-WR-CALNAME:SSC Compass Study Reminders'];
 for(const date of dates){
  for(const {minute,kind} of reminderSlots(settings,date)){
   const start=new Date(Date.parse(date+'T00:00:00+05:30')+minute*60000);
   if(start<=now)continue;
   const title=kind==='fixed'?'SSC Compass study reminder':'SSC Compass study nudge';
   lines.push('BEGIN:VEVENT',`UID:ssc-reminder-${date}-${minute}@ssccompass`,`DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,'DURATION:PT1M','TRANSP:TRANSPARENT',`SUMMARY:${title}`,
    'BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY',`DESCRIPTION:${title}`,'END:VALARM','END:VEVENT');
  }
 }
 return [...lines,'END:VCALENDAR',''].join('\r\n');
}
