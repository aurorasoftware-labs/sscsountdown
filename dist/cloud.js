// Firebase Authentication + Firestore REST. No private/admin credential belongs here.
import defaults from './firebase-config.js';
const CONFIG='ssc-firebase-config-v1',SESSION='ssc-firebase-session-v1';
function read(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
export let config=read(CONFIG)||defaults;
export let session=read(SESSION);
if(!session?.user?.id||session.projectId!==config?.projectId)session=null;
let refreshing,head=null;
export const accountKey=()=>session?`firebase:${config.projectId}:${session.user.id}`:'guest';
export function configure(projectId,apiKey){projectId=projectId.trim();apiKey=apiKey.trim();if(!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId))throw Error('Enter your Firebase project ID (not its display name).');if(!/^AIza[A-Za-z0-9_-]{20,100}$/.test(apiKey))throw Error('Enter your Firebase web API key. Never paste a service-account key.');config={projectId,apiKey};localStorage.setItem(CONFIG,JSON.stringify(config));signout();}
async function request(url,options={},auth=false,allowMissing=false){if(!config)throw Error('Connect your Firebase project in Settings first.');if(auth){if(!session)throw Error('Sign in first.');if(session.expires_at<Date.now()/1000+60)await refresh();}const res=await fetch(url,{...options,signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+session.access_token}:{}),...options.headers}});const data=await res.json().catch(()=>null);if(!res.ok){if(allowMissing&&res.status===404)return null;let err=Error(data?.error?.message||'Firebase request failed ('+res.status+').');err.code=data?.error?.status||data?.error?.message;throw err;}return data;}
const authUrl=action=>'https://identitytoolkit.googleapis.com/v1/accounts:'+action+'?key='+encodeURIComponent(config?.apiKey||'');
function persist(data,email){session={projectId:config.projectId,access_token:data.idToken||data.id_token,refresh_token:data.refreshToken||data.refresh_token,expires_at:Date.now()/1000+Number(data.expiresIn||data.expires_in),user:{id:data.localId||data.user_id,email:data.email||email}};localStorage.setItem(SESSION,JSON.stringify(session));}
async function refresh(){if(!refreshing){let email=session.user.email;refreshing=request('https://securetoken.googleapis.com/v1/token?key='+encodeURIComponent(config.apiKey),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:session.refresh_token}).toString()}).then(data=>persist(data,email)).finally(()=>refreshing=null);}return refreshing;}
export async function quizAuthToken(){
 if(!session)throw Error('Sign in to an account with quiz access.');
 if(session.expires_at<Date.now()/1000+60)await refresh();
 return session.access_token;
}
export async function signIn(email,password,create=false){const data=await request(authUrl(create?'signUp':'signInWithPassword'),{method:'POST',body:JSON.stringify({email,password,returnSecureToken:true})});persist(data,email);head=null;return session;}
export async function resetPassword(email){return request(authUrl('sendOobCode'),{method:'POST',body:JSON.stringify({requestType:'PASSWORD_RESET',email})});}
export async function signout(){session=null;head=null;localStorage.removeItem(SESSION);}
const documentName=()=>`projects/${config.projectId}/databases/(default)/documents/study_state/${session.user.id}`;
const firestoreBase=()=>`https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;
export async function load(){if(!session)throw Error('Sign in first.');const doc=await request('https://firestore.googleapis.com/v1/'+documentName(),{},true,true);if(!doc){head=null;return null;}let version=Number(doc.fields?.version?.integerValue);if(!Number.isSafeInteger(version)||version<1||!doc.updateTime)throw Error('Invalid cloud plan version.');const payload=JSON.parse(doc.fields.payload.stringValue);head={version,updateTime:doc.updateTime};return {version,payload};}
export async function save(payload,expected){if(!session)throw Error('Sign in first.');const json=JSON.stringify(payload);if(new TextEncoder().encode(json).length>700000)throw Error('Plan is too large for this cloud document (700 KB maximum). Export a backup and reduce old records.');if(expected!==0&&head?.version!==expected)return {ok:false,version:null};const version=expected+1;const write={update:{name:documentName(),fields:{schema:{integerValue:'1'},version:{integerValue:String(version)},payload:{stringValue:json}}},currentDocument:expected===0?{exists:false}:{updateTime:head.updateTime},updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}]};try{const result=await request(firestoreBase()+':commit',{method:'POST',body:JSON.stringify({writes:[write]})},true);const updateTime=result.writeResults?.[0]?.updateTime;if(!updateTime)throw Error('Firebase did not confirm the saved version. Sync again before closing.');head={version,updateTime};return {ok:true,version};}catch(error){if(['FAILED_PRECONDITION','ALREADY_EXISTS','ABORTED'].includes(error.code))return {ok:false,version:null};throw error;}}
