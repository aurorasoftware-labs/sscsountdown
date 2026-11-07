import quiz from '../../quiz-worker/index.js';
import firebase from '../../dist/firebase-config.js';

// Pages does not expose the standalone Worker's rate-limit binding.
// This guard limits bursts per isolate, in addition to the adult UID allowlist.
const attempts=new Map();
const localLimit={
 async limit({key}){
  const now=Date.now();
  for(const [uid,entry] of attempts)if(entry.until<=now)attempts.delete(uid);
  const entry=attempts.get(key)||{count:0,until:now+60000};
  if(entry.count>=2)return {success:false};
  entry.count++;
  attempts.set(key,entry);
  return {success:true};
 }
};

export async function onRequest({request,env}){
 const url=new URL(request.url);
 const origin=url.origin;
 url.pathname='/quiz';
 return quiz.fetch(new Request(url,request),{
  APP_ORIGIN:origin,
  FIREBASE_WEB_API_KEY:env.FIREBASE_WEB_API_KEY||firebase.apiKey,
  ADULT_FIREBASE_UIDS:env.ADULT_FIREBASE_UIDS,
  GROQ_API_KEY:env.GROQ_API_KEY,
  OPENROUTER_API_KEY:env.OPENROUTER_API_KEY,
  GROQ_MODEL:env.GROQ_MODEL||'openai/gpt-oss-20b',
  OPENROUTER_MODEL:env.OPENROUTER_MODEL||'qwen/qwen3.5-35b-a3b',
  QUIZ_LIMIT:localLimit,
 });
}
