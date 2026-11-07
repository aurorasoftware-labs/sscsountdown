import {TEXTBOOKS} from './textbooks.js';

export async function openTextbook(code,printedPage=1){
 const book=TEXTBOOKS.find(item=>item.code===code);
 if(!book)return;
 if(document.querySelector('#textbook-reader'))return;
 const dialog=document.createElement('dialog');
 dialog.id='textbook-reader';
 dialog.setAttribute('aria-labelledby','reader-title');
 dialog.innerHTML=`<div class="row between"><h2 id="reader-title"></h2><button type="button" id="reader-close">Close</button></div>
 <div class="row wrap reader-controls">
  <button type="button" class="secondary" id="reader-prev" disabled>Previous page</button>
  <label>Page <input id="reader-page" type="number" step="1" inputmode="numeric" disabled></label>
  <button type="button" class="secondary" id="reader-next" disabled>Next page</button>
  <label>Zoom <select id="reader-zoom" disabled><option value="1">Fit width</option><option value="1.5">150%</option><option value="2">200%</option></select></label>
 </div>
 <p id="reader-status" class="subheading" role="status">Opening textbook…</p>
 <div class="reader-canvas"><canvas role="img"></canvas></div>`;
 document.body.append(dialog);
 const find=selector=>dialog.querySelector(selector);
 const status=find('#reader-status'),pageInput=find('#reader-page');
 const previous=find('#reader-prev'),next=find('#reader-next'),zoom=find('#reader-zoom');
 const canvas=find('canvas'),frame=canvas.parentElement;
 find('#reader-title').textContent=book.title;
 find('#reader-close').onclick=()=>dialog.close();
 let loading,rendering,pdf,closed=false,current=printedPage;
 dialog.addEventListener('close',()=>{
  closed=true;
  rendering?.cancel();
  loading?.destroy().catch(()=>{});
  dialog.remove();
 },{once:true});
 dialog.showModal();

 async function showPage(page){
  current=Math.max(1,Math.min(pdf.numPages-book.offset,page));
  previous.disabled=next.disabled=pageInput.disabled=zoom.disabled=true;
  status.textContent='Opening page '+current+'…';
  try{
   const sheet=await pdf.getPage(current+book.offset);
   if(closed)return;
   const base=sheet.getViewport({scale:1});
   const width=Math.max(240,frame.clientWidth-4)*Number(zoom.value);
   const viewport=sheet.getViewport({scale:width/base.width});
   const resolution=Math.min(2,globalThis.devicePixelRatio||1);
   canvas.width=Math.ceil(viewport.width*resolution);
   canvas.height=Math.ceil(viewport.height*resolution);
   canvas.style.width=viewport.width+'px';
   canvas.style.height=viewport.height+'px';
   canvas.setAttribute('aria-label',book.title+' textbook page '+current);
   rendering=sheet.render({canvas,viewport,transform:[resolution,0,0,resolution,0,0]});
   await rendering.promise;
   status.textContent='Textbook page '+current;
  }catch{
   if(!closed)status.textContent='This page could not be displayed. Try another page or reopen the book.';
  }finally{
   rendering=null;
   if(!closed){
    pageInput.value=current;
    pageInput.disabled=zoom.disabled=false;
    previous.disabled=current===1;
    next.disabled=current===pdf.numPages-book.offset;
   }
  }
 }
 try{
  const library=await import('./pdf-viewer/pdf.mjs');
  if(closed)return;
  const assets=new URL('./pdf-viewer/',import.meta.url);
  library.GlobalWorkerOptions.workerSrc=new URL('pdf.worker.mjs',assets).href;
  loading=library.getDocument({
   url:'/api/textbook/'+book.code,isEvalSupported:false,enableXfa:false,
   cMapUrl:new URL('cmaps/',assets).href,cMapPacked:true,
   standardFontDataUrl:new URL('standard_fonts/',assets).href,
   wasmUrl:new URL('wasm/',assets).href,iccUrl:new URL('iccs/',assets).href,
   disableAutoFetch:true,disableStream:true,
  });
  pdf=await loading.promise;
  if(closed)return;
  pageInput.min=1;
  pageInput.max=pdf.numPages-book.offset;
  previous.onclick=()=>showPage(current-1);
  next.onclick=()=>showPage(current+1);
  pageInput.onchange=()=>showPage(Number(pageInput.value)||current);
  zoom.onchange=()=>showPage(current);
  await showPage(current);
 }catch{
  if(!closed)status.textContent='Could not open the textbook. Check your connection and try again.';
 }
}
