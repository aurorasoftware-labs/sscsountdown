import {SYLLABUS} from './syllabus.js';

// Printed page starts from the supplied indexes. Offset maps printed pages to PDF pages.
const books=[
 ['1003030024','English',12,[2,7,14,23,28,37,44,50,61,69,76,89,100,107,114,122,128,137,145,150,157,169,174,179,190]],
 ['1001000616','Marathi',10,[1,2,7,10,15,17,19,23,28,31,33,36,42,45,47,50,52,55,59,61,68,76]],
 ['1002030027','Hindi',10,[1,3,10,15,18,24,27,33,35,42,49,51,54,58,65,68,74,76,80,82,89,97,99,105]],
 ['1003000265','Science 1',10,[1,16,30,47,62,73,80,93,110,135,145]],
 ['1003000270','Science 2',10,[1,12,22,36,47,61,77,88,101,109,120]],
 ['1003000608','Maths 1',10,[1,30,55,81,113,129,169]],
 ['1003000609','Maths 2',10,[1,30,47,91,100,124,140,164]],
 ['1003010491','History & Political Science',10,[1,7,15,22,32,39,46,52,59,69,75,82,91,97,100]],
 ['1003020011','Geography',11,[1,9,14,25,32,38,46,52,61,67]],
];

export const TEXTBOOKS=[];
export const CHAPTERS=new Map();
let index=0;
for(const [code,title,offset,starts] of books){
 const url=`https://ebooks.ebalbharati.in/pdfs/${code}.pdf`;
 TEXTBOOKS.push({code,title,url,offset});
 for(let i=0;i<starts.length-1;i++){
  const lesson=SYLLABUS[index++];
  CHAPTERS.set(lesson.id,{lessonId:lesson.id,title:lesson.title,subject:lesson.subject,book:title,code,url,offset,
   first:starts[i],last:starts[i+1]-1});
 }
}

export function chapterFor(lesson){
 const direct=CHAPTERS.get(lesson.id);
 if(direct?.title===lesson.title&&direct.subject===lesson.subject)return direct;
 return [...CHAPTERS.values()].find(chapter=>chapter.subject===lesson.subject&&chapter.title===lesson.title);
}
