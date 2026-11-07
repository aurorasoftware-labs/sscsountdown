import {cp,mkdir} from 'node:fs/promises';

const source=new URL('../node_modules/pdfjs-dist/',import.meta.url);
const destination=new URL('../dist/pdf-viewer/',import.meta.url);
await mkdir(destination,{recursive:true});
for(const file of ['pdf.mjs','pdf.worker.mjs']){
 await cp(new URL('legacy/build/'+file,source),new URL(file,destination));
}
for(const directory of ['cmaps','standard_fonts','wasm','iccs']){
 try{await cp(new URL(directory+'/',source),new URL(directory+'/',destination),{recursive:true});}
 catch(error){if(error.code!=='ENOENT')throw error;}
}
await cp(new URL('LICENSE',source),new URL('LICENSE',destination));
