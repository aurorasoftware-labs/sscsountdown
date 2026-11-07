export const STAGES=['Not started','Learning','Practising','Revising','Mastered'];
export const WEIGHTS=[0,.25,.55,.8,1];
export const SUBJECTS=[{id:'math',name:'Maths',color:'#b8cba4',priority:3},{id:'science',name:'Science',color:'#b7d9d2',priority:3},{id:'hindi',name:'Hindi',color:'#e7bfad',priority:3},{id:'history',name:'History & Civics',color:'#d1c1df',priority:2},{id:'geo',name:'Geography',color:'#d3d49b',priority:2},{id:'english',name:'English',color:'#b8cee4',priority:1},{id:'other',name:'Other language',color:'#e5cc91',priority:1}];
export const GROUPS=[['english','English'],['hindi','Hindi'],['other','Other language'],['math','Maths'],['science','Science'],['social','Social Science']];
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function days(a,b){return Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);}
export function addDays(d,n){return new Date(Date.parse(d+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);}
export const uid=()=>globalThis.crypto.randomUUID();
export function seed(){let lessons=[];const add=(subject,part,names,draft=false)=>names.forEach((title,i)=>lessons.push({id:`${subject}-${part.replace(/[^a-z0-9]/gi,'')}-${i}`,subject,part,title,stage:0,minutes:45,priority:SUBJECTS.find(s=>s.id===subject).priority,draft,covered:null,reviewDue:null,reviewCount:0}));
add('math','Algebra',['Linear Equations in Two Variables','Quadratic Equations','Arithmetic Progression','Financial Planning','Probability','Statistics']);
add('math','Geometry',['Similarity','Pythagoras Theorem','Circle','Geometric Constructions','Coordinate Geometry','Trigonometry','Mensuration']);
add('science','Part 1',['Gravitation','Periodic Classification of Elements','Chemical Reactions and Equations','Effects of Electric Current','Heat','Refraction of Light','Lenses','Metallurgy','Carbon Compounds','Space Missions']);
add('science','Part 2',['Heredity and Evolution','Life Processes in Living Organisms – Part 1','Life Processes in Living Organisms – Part 2','Environmental Management','Towards Green Energy','Animal Classification','Introduction to Microbiology','Cell Biology and Biotechnology','Social Health','Disaster Management']);
add('history','History',['Historiography: Development in the West','Historiography: Indian Tradition','Applied History','History of Indian Arts','Mass Media and History','Entertainment and History','Sports and History','Tourism and History','Heritage Management']);
add('history','Political Science',['Working of the Constitution','The Electoral Process','Political Parties','Social and Political Movements','Challenges Faced by Indian Democracy']);
add('geo','Geography',['Field Visit','Location and Extent','Physiography and Drainage','Climate','Natural Vegetation and Wildlife','Population','Human Settlements','Economy and Occupations','Tourism, Transport and Communication']);
add('english','Kumarbharati', ['Where the Mind is Without Fear','The Thief’s Story','On Wings of Courage','All the World’s a Stage','Joan of Arc','The Alchemy of Nature','Animals','Three Questions','Connecting the Dots','The Pulley','Let’s March!','Science and Spirituality','Night of the Scorpion','The Last Lesson','A Thing of Beauty is a Joy For Ever','The Luncheon'],true);
add('english','Skills',['Grammar: tenses','Grammar: voice and speech','Vocabulary and language study','Letter writing','Summary writing','Information transfer','Speech and dialogue','Writing practice paper'],true);
add('hindi','Check your textbook',Array.from({length:24},(_,i)=>`Hindi lesson / skill ${i+1} — rename from your book`),true);
add('other','Choose language & book',Array.from({length:24},(_,i)=>`Other language lesson / skill ${i+1} — rename`),true);
return {schema:1,created:today(),settings:{name:'Scholar',prelims:'2026-12-10',boards:'2027-02-18',daily:3,weekly:20,minutes:240,target:75,mode:'best5',wake:'05:30',bed:'21:30',other:'Marathi',board:'Maharashtra SSC',school:'',overrides:{}},lessons,scores:[],tasks:[],sessions:[]};}
export function validate(s){if(!s||s.schema!==1||!s.settings||!Array.isArray(s.lessons)||!s.lessons.length||s.lessons.length>2000||!Array.isArray(s.scores)||!Array.isArray(s.tasks)||!Array.isArray(s.sessions))throw Error('This is not a valid SSC Compass backup.');
const date=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
const safeId=x=>typeof x==='string'&&/^[A-Za-z0-9 _-]{1,120}$/.test(x);const ids=new Set();for(const l of s.lessons){if(l.lastReview&&!date(l.lastReview)||!safeId(l.id)||ids.has(l.id)||!SUBJECTS.some(x=>x.id===l.subject)||typeof l.title!=='string'||l.title.length>300||!Number.isInteger(l.stage)||l.stage<0||l.stage>4||!Number.isFinite(l.minutes)||l.minutes<5||l.minutes>600||![1,2,3].includes(l.priority)||l.covered&&!date(l.covered)||l.reviewDue&&!date(l.reviewDue))throw Error('Invalid lesson data.');ids.add(l.id);}
for(const x of s.scores)if(!GROUPS.some(g=>g[0]===x.subject)||!['Practice','Prelim','Board'].includes(x.kind)||!safeId(x.id)||typeof x.exam!=='string'||!date(x.date)||!Number.isFinite(x.mark)||!Number.isFinite(x.max)||x.max<=0||x.mark<0||x.mark>x.max)throw Error('Invalid score data.');
for(const t of s.tasks)if(!safeId(t.id)||typeof t.title!=='string'||!date(t.date)||typeof t.done!=='boolean')throw Error('Invalid task data.');
for(const x of s.sessions)if(!safeId(x.id)||!date(x.date)||!Number.isFinite(x.minutes)||x.minutes<=0||x.minutes>1440)throw Error('Invalid study log.');
if(new Set(s.scores.map(x=>x.id)).size!==s.scores.length||new Set(s.tasks.map(x=>x.id)).size!==s.tasks.length||new Set(s.scores.map(x=>x.exam+'|'+x.subject)).size!==s.scores.length)throw Error('Duplicate records in backup.');let p=s.settings;if(!date(s.created)||!date(p.prelims)||!date(p.boards)||p.prelims>p.boards||!['best5','all6'].includes(p.mode)||!Number.isFinite(p.daily)||p.daily<0||p.daily>30||!Number.isFinite(p.weekly)||p.weekly<0||p.weekly>150||!Number.isFinite(p.minutes)||p.minutes<15||p.minutes>720||!Number.isFinite(p.target)||p.target<0||p.target>100||typeof p.name!=='string'||typeof p.other!=='string'||!/^\d\d:\d\d$/.test(p.wake)||!/^\d\d:\d\d$/.test(p.bed)||!p.overrides||typeof p.overrides!=='object')throw Error('Invalid settings.');
for(const k of ['prelimsBuffer','boardsBuffer'])if(p[k]!==undefined&&(!Number.isInteger(p[k])||p[k]<0||p[k]>60))throw Error('Invalid early-finish buffer.');for(const [d,x] of Object.entries(p.overrides))if(!date(d)||!Number.isFinite(x)||x<0||x>30)throw Error('Invalid daily target.');
for(const k of ['name','school','board'])if(p[k]!==undefined&&(typeof p[k]!=='string'||p[k].length>100))throw Error('Invalid profile.');
if(p.reminderTime!==undefined&&!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(p.reminderTime))throw Error('Invalid reminder time.');
if(p.reminders!==undefined&&typeof p.reminders!=='boolean')throw Error('Invalid reminder setting.');
const paperIds=['marathi','english','hindi','math1','math2','science1','science2','history','geography'];
for(const k of ['paperDates','paperChecks','paperResults'])if(p[k]!==undefined&&(!p[k]||typeof p[k]!=='object'||Array.isArray(p[k])||Object.keys(p[k]).some(id=>!paperIds.includes(id))))throw Error('Invalid exam tracking data.');
for(const d of Object.values(p.paperDates||{}))if(!date(d))throw Error('Invalid paper date.');
for(const x of Object.values(p.paperChecks||{}))if(!x||typeof x!=='object'||Object.entries(x).some(([k,v])=>!['review','mock','ready'].includes(k)||typeof v!=='boolean'))throw Error('Invalid paper checklist.');
for(const x of Object.values(p.paperResults||{}))if(!x||!Number.isFinite(x.mark)||!Number.isFinite(x.max)||x.mark<0||x.max<=0||x.mark>x.max)throw Error('Invalid paper marks.');
return s;}
export function upgrade(s){const p=s.settings;if(!p.paperDates&&p.boards==='2027-02-15')p.boards='2027-02-18';if(p.other==='Other language')p.other='Marathi';p.board??='Maharashtra SSC';p.school??='';return s;}
export function stats(s,now=today()){let n=s.lessons.length,covered=s.lessons.filter(l=>l.stage>=2).length,mastered=s.lessons.filter(l=>l.stage===4).length;let elapsed=Math.max(1,Math.min(14,days(s.created,now)+1));let recent=s.lessons.filter(l=>l.covered&&days(l.covered,now)>=0&&days(l.covered,now)<elapsed).length;return {n,covered,mastered,progress:Math.round(s.lessons.reduce((v,l)=>v+WEIGHTS[l.stage],0)/n*100),pace:recent/elapsed,elapsed,recent};}
export function coverageProjection(s,exam,now=today()){let x=stats(s,now),left=Math.max(0,days(now,exam));return {...x,left,required:left?(x.n-x.covered)/left:null,projected:Math.min(x.n,Math.floor(x.covered+x.pace*left)),evidence:x.elapsed>=3&&x.recent>=2};}
export function aggregate(scores,mode){const vals=GROUPS.map(([id])=>scores.find(x=>x.subject===id));if(vals.some(x=>!x))return null;let chosen=vals.map(x=>({...x,pct:100*x.mark/x.max})).sort((a,b)=>b.pct-a.pct).slice(0,mode==='best5'?5:6);return {pct:chosen.reduce((a,x)=>a+x.pct,0)/chosen.length,chosen};}
export function scoreProjection(s,exam,now=today()){const horizon=Math.max(0,days(now,exam)),cov=coverageProjection(s,exam,now);return GROUPS.map(([id,name])=>{let a=s.scores.filter(x=>x.subject===id&&x.date<=now).sort((a,b)=>a.date.localeCompare(b.date));if(!a.length)return {id,name,empty:true};let r=a.slice(-5),pct=r.map(x=>x.mark/x.max*100),base=pct.reduce((v,n)=>v+n,0)/pct.length;let span=days(r[0].date,r.at(-1).date);let slope=r.length>=3&&span>=7?(pct.at(-1)-pct[0])/span:0;let gain=Math.min(12,Math.max(-12,slope*Math.min(horizon,45)*.5));let penalty=cov.evidence?(1-cov.projected/cov.n)*12:0;let center=Math.max(0,Math.min(100,base+gain-penalty));let spread=Math.max(8,20-r.length*2)+(cov.evidence?0:5);return {id,name,low:Math.max(0,Math.round(center-spread)),high:Math.min(100,Math.round(center+spread)),n:a.length};});}
export function weekStart(d){return addDays(d,-((new Date(d+'T12:00Z').getUTCDay()+6)%7));}
export function recommendations(s,now=today()){const latest={};s.scores.filter(x=>x.date<=now).sort((a,b)=>a.date.localeCompare(b.date)).forEach(x=>latest[x.subject]=100*x.mark/x.max);const rank=l=>{let group=['history','geo'].includes(l.subject)?'social':l.subject;return (l.reviewDue&&l.reviewDue<=now?20:0)+l.priority*4+(l.stage===1?2:0)+(latest[group]!==undefined?Math.max(0,(70-latest[group])/5):0);};let candidates=s.lessons.filter(l=>l.stage<4||l.reviewDue&&l.reviewDue<=now).sort((a,b)=>rank(b)-rank(a)),out=[],seen=new Set();for(const l of candidates){if(!seen.has(l.subject)){out.push(l);seen.add(l.subject);if(out.length===5)return out;}}return out.concat(candidates.filter(l=>!out.includes(l))).slice(0,5);}
export function sleepHours(wake,bed){let m=t=>Number(t.slice(0,2))*60+Number(t.slice(3));return ((m(wake)-m(bed)+1440)%1440)/60;}
export function dailyPlan(s,now=today()){
 const x=stats(s,now),base=s.settings.overrides[now]??s.settings.daily;
 let expected=0;const elapsed=Math.max(0,Math.min(3660,days(s.created,now)));
 for(let i=0;i<elapsed;i++){const date=addDays(s.created,i);expected+=s.settings.overrides[date]??s.settings.daily;}
 expected=Math.min(x.n,expected);
 const before=s.lessons.filter(l=>l.covered&&l.covered<now&&l.stage>=2).length;
 const done=s.lessons.filter(l=>l.covered===now&&l.stage>=2).length;
 const backlog=Math.max(0,expected-before),remaining=x.n-x.covered;
 const due=Math.min(x.n-before,base+backlog);
 return {base,backlog,done,due,remaining,outstanding:Math.max(0,Math.min(remaining,due-done)),revisionOnly:remaining===0};
}
export function earlyGoal(s,kind,now=today()){
 const buffer=s.settings[kind+'Buffer']??(kind==='prelims'?7:14),date=addDays(s.settings[kind],-buffer),left=Math.max(0,days(now,date)),x=stats(s,now);
 return {buffer,date,left,required:left?(x.n-x.covered)/left:null};
}
