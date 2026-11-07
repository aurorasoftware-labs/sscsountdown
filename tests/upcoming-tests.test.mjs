import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed,validate,recommendations} from '../dist/core.js';
import {testPrepPlan} from '../dist/upcoming-tests.js';

test('upcoming test prep uses open days, daily targets and nearest deadlines',()=>{
 const s=seed();
 const [first,second,third]=s.lessons;
 const now='2026-11-09';
 Object.assign(s.settings,{wake:'08:00',bed:'18:00',daily:1,
  timeBlocks:[{id:'school',kind:'school',title:'School',days:[1],start:'08:00',end:'18:00'}]});
 s.upcomingTests=[
  {id:'later',title:'Later test',date:'2026-11-12',lessonIds:[second.id,third.id]},
  {id:'earlier',title:'Earlier test',date:'2026-11-11',lessonIds:[first.id,second.id]}
 ];
 assert.equal(validate(s),s);
 let plan=testPrepPlan(s,now);
 assert.equal(plan.byDay[now],undefined);
 assert.equal(plan.byDay['2026-11-10'][0].lesson.id,first.id);
 assert.equal(plan.byDay['2026-11-11'][0].lesson.id,second.id);
 assert.ok(plan.unplaced.some(item=>item.lesson.id===second.id&&item.tests[0].id==='earlier'));
 s.settings.freeDays={[now]:true};
 plan=testPrepPlan(s,now);
 assert.equal(plan.byDay[now][0].lesson.id,first.id);
 assert.deepEqual(plan.byDay['2026-11-10'][0].tests.map(item=>item.id),['earlier','later']);
 assert.equal(recommendations(s,now)[0].id,first.id);
 first.stage=2;first.covered=now;
 assert.ok(!Object.values(testPrepPlan(s,now).byDay).flat().some(item=>item.lesson.id===first.id));
 assert.equal(s.settings.daily,1);
});
