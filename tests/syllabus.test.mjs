import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed, validate, upgrade, stats} from '../dist/core.js';
import {boardPapers, paperCoverage} from '../dist/study-tools.js';

test('catalogue follows all ten index groups; History and Political Science share one paper',()=>{
 const s=seed();
 const groups=Object.entries(s.lessons.reduce((counts,l)=>{
   const key=l.subject==='math'||l.subject==='science'||l.subject==='history' ? l.subject+'/'+l.part : l.subject;
   counts[key]=(counts[key]||0)+1;
   return counts;
 },{}));
 assert.deepEqual(groups,[['english',24],['other',21],['hindi',23],['science/Part 1',10],
   ['science/Part 2',10],['math/Algebra',6],['math/Geometry',7],['history/History',9],
   ['history/Political Science',5],['geo',9]]);
 assert.equal(stats(s).n,124);
 const paper=boardPapers(s).find(p=>p.id==='history');
 assert.equal(paper.title,'History & Political Science');
 s.lessons.find(l=>l.part==='Political Science').stage=2;
 assert.deepEqual(paperCoverage(s,paper),{total:14,done:1});
});

test('migration preserves known lesson IDs, results, custom lessons and displaced progress',()=>{
 const s=seed();
 delete s.settings.syllabusVersion;
 const hindi=s.lessons.filter(l=>l.subject==='hindi');
 const firstTitle=hindi[0].title;
 const displaced={...hindi[0],title:'Hindi lesson / skill 1 — rename from your book',stage:3};
 const renamed={...hindi[1],id:hindi[0].id,title:hindi[2].title,stage:2,strength:'weak'};
 const custom={...hindi[0],id:'my-custom-topic',title:'My custom topic'};
 const score={id:'test-1',exam:'Unit test',date:'2026-11-06',kind:'Practice',subject:'hindi',
  mark:12,max:20,lessons:[{id:renamed.id,title:renamed.title,subject:renamed.subject}]};
 s.lessons=[...s.lessons.filter(l=>l.subject!=='hindi'),renamed,
  {...displaced,id:hindi[1].id,title:'Hindi lesson / skill 2 — rename from your book'},custom];
 s.scores=[score];
 const upgraded=upgrade(validate(s));
 assert.equal(validate(upgraded),s);
 assert.equal(upgraded.lessons.length,125);
 assert.equal(upgraded.lessons.find(l=>l.title===firstTitle).stage,0);
 assert.deepEqual(upgraded.lessons.find(l=>l.id===renamed.id),{...renamed,part:hindi[2].part,draft:false});
 assert.equal(upgraded.archivedLessons.find(l=>l.id===hindi[1].id).stage,3);
 assert.deepEqual(upgraded.scores,[score]);
 assert.ok(upgraded.lessons.some(l=>l.id===custom.id));
 const serialized=JSON.stringify(upgraded);
 assert.equal(JSON.stringify(upgrade(validate(JSON.parse(serialized)))),serialized);
});
