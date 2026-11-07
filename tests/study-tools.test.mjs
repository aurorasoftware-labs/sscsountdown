import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed,validate,upgrade} from '../dist/core.js';
import {boardPapers,paperCoverage,paperTime,activity,focusRemaining,focusLog,reminderFor,paperCalendar} from '../dist/study-tools.js';

test('all nine supplied dates are correct and existing plans get the timetable without losing progress',()=>{
 const s=seed();s.settings.boards='2027-02-15';s.settings.other='Other language';s.lessons[0].stage=2;
 upgrade(validate(s));
 assert.equal(s.settings.boards,'2027-02-18');assert.equal(s.settings.other,'Marathi');assert.equal(s.lessons[0].stage,2);
 assert.deepEqual(boardPapers(s).map(p=>p.date),['2027-02-18','2027-02-22','2027-02-24','2027-03-02','2027-03-04','2027-03-08','2027-03-11','2027-03-13','2027-03-15']);
 assert.deepEqual(paperCoverage(s,boardPapers(s).find(p=>p.id==='math1')),{done:1,total:6});
 assert.deepEqual(paperCoverage(s,boardPapers(s).find(p=>p.id==='math2')),{done:0,total:7});
});
test('saved paper details and private student profile survive a plan round-trip',()=>{
 const s=seed();Object.assign(s.settings,{name:'Test Student',school:'Test School',board:'Maharashtra SSC',paperDates:{marathi:'2027-02-19'},paperChecks:{marathi:{mock:true}},paperResults:{marathi:{mark:72,max:80}}});
 const restored=upgrade(validate(JSON.parse(JSON.stringify(s))));assert.equal(boardPapers(restored)[0].date,'2027-02-19');assert.equal(restored.settings.school,'Test School');assert.equal(restored.settings.paperResults.marathi.mark,72);assert.equal(restored.settings.paperChecks.marathi.mock,true);
 restored.settings.paperResults.marathi.mark=81;assert.throws(()=>validate(restored),/paper marks/);
});
test('focus time uses wall clock after suspension and logs only elapsed whole minutes',()=>{
 const r={id:'focus-test',date:'2026-11-07',start:1000,end:151000,subject:'math',note:'Equations'};
 assert.equal(focusRemaining(r,1100),150);assert.equal(focusRemaining(r,200000),0);assert.equal(focusLog(r,60999),null);assert.equal(focusLog(r,61000).minutes,1);assert.deepEqual(focusLog(r,999999),{id:'focus-test',date:'2026-11-07',minutes:2,subject:'math',note:'Equations',source:'focus'});
});
test('study totals use seven days; previous-day streak remains visible before today’s first block',()=>{
 const s=seed();s.sessions=[{date:'2026-11-06',minutes:25,source:'focus'},{date:'2026-11-05',minutes:40},{date:'2026-10-01',minutes:30}];
 const a=activity(s,'2026-11-07');assert.equal(a.weekly,65);assert.equal(a.todayMinutes,0);assert.equal(a.streak,2);assert.equal(a.focusBlocks,1);
});
test('opt-in reminder combines due items and every paper exports one previous-evening alarm',()=>{
 const s=seed();s.settings.reminders=true;s.settings.reminderTime='18:00';s.lessons[0].reviewDue='2027-02-17';
 assert.equal(reminderFor(s,'2027-02-17','17:59'),null);assert.match(reminderFor(s,'2027-02-17','18:00'),/Marathi: tomorrow.*1 revisions due/);
 const cal=paperCalendar(s,new Date('2026-11-07T00:00Z'));assert.equal((cal.match(/BEGIN:VEVENT/g)||[]).length,9);assert.equal((cal.match(/BEGIN:VALARM/g)||[]).length,9);assert.match(cal,/DTSTART:20270218T053000Z/);assert.match(cal,/DTEND:20270222T083000Z/);assert.match(cal,/DTEND:20270302T073000Z/);assert.match(paperTime(boardPapers(s)[0]),/composite ends 1:00 pm/);assert.match(cal,/TRIGGER;VALUE=DATE-TIME:20270217T123000Z/);
});
