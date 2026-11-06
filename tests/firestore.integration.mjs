// Run only with Firebase Auth + Firestore emulators for demo-ssc-compass.
import {test} from 'node:test';
import assert from 'node:assert/strict';
const project='demo-ssc-compass';
const auth='http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key';
const base=`http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents`;
async function request(url,body,token,method){const res=await fetch(url,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,ok:res.ok,data:await res.json().catch(()=>null)};}
const docName=uid=>`projects/${project}/databases/(default)/documents/study_state/${uid}`;
const write=(uid,version,precondition,extra={})=>({update:{name:docName(uid),fields:{schema:{integerValue:'1'},version:{integerValue:String(version)},payload:{stringValue:'{"schema":1}'},...extra}},currentDocument:precondition,updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}]});
test('Firestore rules isolate owners and enforce versioned writes',async()=>{
 const tag=crypto.randomUUID();const makeUser=async suffix=>{let r=await request(auth,{email:`${tag}-${suffix}@example.test`,password:'test-password-123',returnSecureToken:true});assert.equal(r.status,200,JSON.stringify(r.data));return r.data;};
 let a=await makeUser('a'),b=await makeUser('b');
 let created=await request(base+':commit',{writes:[write(a.localId,1,{exists:false})]},a.idToken);assert.equal(created.status,200,JSON.stringify(created.data));
 assert.equal((await request(base+'/study_state/'+a.localId,null,a.idToken)).status,200);
 assert.equal((await request(base+'/study_state/'+a.localId,null,b.idToken)).status,403);
 assert.equal((await request(base+'/study_state/'+a.localId)).status,403);
 assert.equal((await request(base+'/study_state',null,a.idToken)).status,403);
 const stamp=created.data.writeResults[0].updateTime;
 let good=await request(base+':commit',{writes:[write(a.localId,2,{updateTime:stamp})]},a.idToken);assert.equal(good.status,200,JSON.stringify(good.data));
 assert.equal((await request(base+':commit',{writes:[write(a.localId,2,{updateTime:stamp})]},a.idToken)).ok,false);
 assert.equal((await request(base+':commit',{writes:[write(a.localId,3,{updateTime:good.data.writeResults[0].updateTime})]},b.idToken)).status,403);
 assert.equal((await request(base+':commit',{writes:[write(a.localId,9,{updateTime:good.data.writeResults[0].updateTime})]},a.idToken)).status,403);
 assert.equal((await request(base+':commit',{writes:[write(b.localId,1,{exists:false},{admin:{booleanValue:true}})]},b.idToken)).status,403);
 assert.equal((await request(base+'/study_state/'+a.localId,null,a.idToken,'DELETE')).status,403);
});
