import {TEXTBOOKS} from '../../../dist/textbooks.js';

export async function onRequestGet({request,params}){
 const book=TEXTBOOKS.find(entry=>entry.code===params.code);
 if(!book)return new Response('Textbook not found.',{status:404});
 const range=request.headers.get('Range');
 if(range&&!/^bytes=\d+-\d*$/.test(range))return new Response('Invalid page request.',{status:416});
 try{
  const upstream=await fetch(book.url,{
   headers:range?{Range:range}:{},
   redirect:'error',
   signal:AbortSignal.timeout(35000),
  });
  if(upstream.status===416)return new Response(null,{status:416,headers:{
   'Content-Range':upstream.headers.get('Content-Range')||'bytes */*',
  }});
  if(!upstream.ok||!upstream.headers.get('Content-Type')?.includes('application/pdf')){
   return new Response('The textbook publisher is unavailable.',{status:502});
  }
  const headers=new Headers({
   'Content-Type':'application/pdf',
   'Content-Disposition':'inline',
   'Cache-Control':'public, max-age=3600',
   'X-Content-Type-Options':'nosniff',
  });
  for(const name of ['Accept-Ranges','Content-Range','Content-Length','Content-Encoding']){
   const value=upstream.headers.get(name);
   if(value)headers.set(name,value);
  }
  return new Response(upstream.body,{status:upstream.status,headers});
 }catch{
  return new Response('The textbook publisher is unavailable.',{status:502});
 }
}
