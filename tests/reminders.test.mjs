import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed,validate} from '../dist/core.js';
import {reminderSlots,reminderCalendar} from '../dist/reminders.js';

test('fixed and random reminders avoid blocked time, with eight reproducible nudges',()=>{
 const s=seed();
 const date='2026-11-09';
 Object.assign(s.settings,{wake:'06:00',bed:'21:00',reminders:true,
  reminderTimes:['07:00','10:00','18:00','22:00'],randomReminders:true,
  timeBlocks:[{id:'school',kind:'school',title:'School',days:[1],start:'08:00',end:'16:00'}]});
 assert.equal(validate(s),s);
 const slots=reminderSlots(s.settings,date);
 assert.deepEqual(slots,reminderSlots(s.settings,date));
 assert.equal(slots.filter(slot=>slot.kind==='nudge').length,8);
 assert.deepEqual(slots.filter(slot=>slot.kind==='fixed').map(slot=>slot.minute),[420,1080]);
 assert.equal(new Set(slots.map(slot=>slot.minute)).size,10);
 assert.ok(slots.every(({minute})=>minute>=360&&minute<1260&&(minute<480||minute>=960)));
 s.settings.freeDays={[date]:true};
 assert.ok(reminderSlots(s.settings,date).some(slot=>slot.kind==='fixed'&&slot.minute===600));
});

test('overnight reminder export uses India time and excludes elapsed reminders',()=>{
 const settings={wake:'06:00',bed:'01:00',reminders:true,reminderTimes:['23:00','00:30']};
 const result=reminderCalendar(settings,['2026-11-09'],new Date('2026-11-09T18:00:00Z'));
 assert.doesNotMatch(result,/DTSTART:20261109T173000Z/);
 assert.match(result,/DTSTART:20261109T190000Z/);
 assert.match(result,/BEGIN:VALARM/);
});
