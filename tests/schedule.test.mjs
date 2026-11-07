import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed,validate} from '../dist/core.js';
import {dayAvailability,earlyLesson} from '../dist/schedule.js';

test('availability merges overlapping blocks and preserves overnight sleep and date overrides',()=>{
 const s=seed();
 Object.assign(s.settings,{wake:'06:00',bed:'00:30',minutes:240,timeBlocks:[
  {id:'school',kind:'school',title:'School',days:[1],start:'07:00',end:'15:00'},
  {id:'class',kind:'coaching',title:'Class',days:[1],start:'14:00',end:'17:00'},
  {id:'late',kind:'other',title:'Activity',days:[1],start:'18:00',end:'03:00'}
 ]});
 assert.equal(validate(s),s);
 const monday=dayAvailability(s.settings,'2026-11-09');
 assert.equal(monday.blockedMinutes,990);
 assert.equal(monday.budget,120);
 assert.equal(dayAvailability(s.settings,'2026-11-10').blockedMinutes,0);
 s.settings.freeDays={'2026-11-09':true};
 const holiday=dayAvailability(s.settings,'2026-11-09');
 assert.equal(holiday.blockedMinutes,0);
 assert.equal(holiday.budget,240);
 assert.equal(s.settings.timeBlocks.length,3);
});

test('a holiday can pull forward a scheduled lesson without changing regular targets',()=>{
 const s=seed();
 const date='2026-11-09';
 const lesson=s.lessons.find(item=>item.priority===3);
 const task={id:'future-task',lessonId:lesson.id,title:lesson.title,done:false,date:'2026-11-11'};
 s.tasks=[task];
 assert.equal(earlyLesson(s,date,date,3),null);
 s.settings.freeDays={[date]:true};
 const choice=earlyLesson(s,date,date,3);
 assert.equal(choice.task,task);
 assert.equal(choice.lesson,lesson);
 task.date=date;
 assert.notEqual(earlyLesson(s,date,date,3)?.lesson.id,lesson.id);
 s.settings.minutes=60;
 assert.equal(earlyLesson(s,date,date,3),null);
 assert.equal(s.settings.daily,3);
});
