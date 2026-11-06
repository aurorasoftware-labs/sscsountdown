import {test} from 'node:test';
import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
let queue=[],calls=[];
globalThis.fetch=async(url,opts)=>{calls.push({url,opts});const next=queue.shift();assert.ok(next,'Unexpected Firebase request: '+url);return {ok:(next.status||200)<400,status:next.status||200,json:async()=>next.data};};
const cloud=await import('../dist/cloud.js');
const token={localId:'owner-A',email:'scholar@example.test',idToken:'id-token',refreshToken:'refresh-token',expiresIn:'3600'};
const doc={fields:{version:{integerValue:'1'},payload:{stringValue:'{"schema":1}'}},updateTime:'2026-11-06T11:00:00.000001Z'};
function response(data,status=200){queue.push({data,status});}
const key='AIza'+'a'.repeat(35);
test('Firebase config, account creation and sign-in preserve owner scope without storing passwords',async()=>{
 assert.throws(()=>cloud.configure('https://not-a-project',key));assert.throws(()=>cloud.configure('ssc-test-project','private-key'));
 cloud.configure('ssc-test-project',key);response(token);await cloud.signIn('scholar@example.test','example-password',true);
 assert.match(calls.at(-1).url,/accounts:signUp/);assert.equal(cloud.accountKey(),'firebase:ssc-test-project:owner-A');assert.equal(JSON.parse(calls.at(-1).opts.body).returnSecureToken,true);assert.ok(!memory.get('ssc-firebase-session-v1').includes('example-password'));
 await cloud.signout();assert.equal(cloud.session,null);assert.ok(!memory.has('ssc-firebase-session-v1'));
 response(token);await cloud.signIn('scholar@example.test','example-password');assert.match(calls.at(-1).url,/signInWithPassword/);
});
test('Firestore uses Firebase ID token, update-time precondition and explicit conflicts',async()=>{
 response(doc);assert.equal((await cloud.load()).version,1);assert.match(calls.at(-1).url,/documents\/study_state\/owner-A$/);assert.equal(calls.at(-1).opts.headers.Authorization,'Bearer id-token');
 response({writeResults:[{updateTime:'2026-11-06T11:01:00.000001Z'}]});assert.deepEqual(await cloud.save({schema:1},1),{ok:true,version:2});let write=JSON.parse(calls.at(-1).opts.body).writes[0];assert.equal(write.currentDocument.updateTime,doc.updateTime);assert.equal(write.update.fields.version.integerValue,'2');assert.equal(write.updateTransforms[0].setToServerValue,'REQUEST_TIME');
 let count=calls.length;assert.equal((await cloud.save({schema:1},1)).ok,false);assert.equal(calls.length,count);
 response({error:{status:'FAILED_PRECONDITION',message:'Changed on another device'}},400);assert.equal((await cloud.save({schema:1},2)).ok,false);
});
test('first write uses exists:false; permission errors are not swallowed as conflicts',async()=>{
 response({error:{status:'NOT_FOUND'}},404);assert.equal(await cloud.load(),null);response({writeResults:[{updateTime:doc.updateTime}]});assert.equal((await cloud.save({schema:1},0)).ok,true);assert.deepEqual(JSON.parse(calls.at(-1).opts.body).writes[0].currentDocument,{exists:false});
 response({error:{status:'PERMISSION_DENIED',message:'Missing or insufficient permissions'}},403);await assert.rejects(()=>cloud.save({schema:1},1),/permissions/);
});
test('refresh-token exchange and password reset use the documented Firebase endpoints',async()=>{
 cloud.session.expires_at=0;response({user_id:'owner-A',id_token:'renewed-id',refresh_token:'renewed-refresh',expires_in:'3600'});response(doc);await cloud.load();const refresh=calls.at(-2);assert.match(refresh.url,/securetoken.googleapis.com/);assert.match(refresh.opts.body,/grant_type=refresh_token/);assert.equal(calls.at(-1).opts.headers.Authorization,'Bearer renewed-id');
 response({});await cloud.resetPassword('scholar@example.test');assert.equal(JSON.parse(calls.at(-1).opts.body).requestType,'PASSWORD_RESET');
 let count=calls.length;await assert.rejects(()=>cloud.save({large:'x'.repeat(700001)},1),/too large/);assert.equal(calls.length,count);await cloud.signout();assert.equal(queue.length,0);
});
