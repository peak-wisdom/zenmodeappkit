// SPDX-License-Identifier: MIT
import {FORMATS} from './core.js';
function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;}
export async function withDpi(blob,dpi=300){
  const source=new Uint8Array(await blob.arrayBuffer()),view=new DataView(source.buffer);if(source.length<33||view.getUint32(0)!==0x89504e47)throw Error('PNG encoding failed. Please try SVG.');
  const chunk=new Uint8Array(21),cv=new DataView(chunk.buffer);cv.setUint32(0,9);chunk.set([112,72,89,115],4);cv.setUint32(8,Math.round(dpi/.0254));cv.setUint32(12,Math.round(dpi/.0254));chunk[16]=1;cv.setUint32(17,crc32(chunk.subarray(4,17)));
  const pieces=[source.slice(0,33),chunk];for(let offset=33;offset+12<=source.length;){const length=view.getUint32(offset),end=offset+length+12;if(end>source.length)throw Error('Incomplete PNG image.');if(String.fromCharCode(...source.slice(offset+4,offset+8))!=='pHYs')pieces.push(source.slice(offset,end));offset=end;}return new Blob(pieces,{type:'image/png'});
}
export function svgForPrint(svg,size){const f=FORMATS[size];return svg.replace(/width="[^"]+" height="[^"]+"/,`width="${(f.inches[0]*25.4).toFixed(2)}mm" height="${(f.inches[1]*25.4).toFixed(2)}mm"`);}
export async function rasterize(svg,size,type='image/png'){
  const f=FORMATS[size],canvas=document.createElement('canvas'),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
  try{const image=new Image();image.src=url;await image.decode();canvas.width=Math.round(f.inches[0]*300);canvas.height=Math.round(f.inches[1]*300);const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image export is unavailable in this browser. Try SVG.');ctx.drawImage(image,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,type,.96));if(!blob)throw Error('The image could not be created. Please try SVG.');return type==='image/png'?await withDpi(blob):blob;}finally{URL.revokeObjectURL(url);canvas.width=canvas.height=1;}
}
export function buildPDF(images,size){
  const encoder=new TextEncoder(),f=FORMATS[size],[pw,ph]=f.inches.map(n=>n*72),pixelW=Math.round(f.inches[0]*300),pixelH=Math.round(f.inches[1]*300),parts=[],offsets=[0];let length=0;
  const append=value=>{const bytes=typeof value==='string'?encoder.encode(value):value;parts.push(bytes);length+=bytes.length;};
  const object=(id,body)=>{offsets[id]=length;append(id+' 0 obj\n');if(Array.isArray(body))for(const part of body)append(part);else append(body);append('\nendobj\n');};
  append('%PDF-1.4\n%PostcardStudio\n');object(1,'<< /Type /Catalog /Pages 2 0 R >>');object(2,'<< /Type /Pages /Count '+images.length+' /Kids ['+images.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>');
  images.forEach((image,i)=>{const page=3+i*3,img=page+1,content=page+2,commands=`q\n${pw} 0 0 ${ph} 0 0 cm\n/Im${i} Do\nQ\n`;object(page,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im${i} ${img} 0 R >> >> /Contents ${content} 0 R >>`);object(img,[`<< /Type /XObject /Subtype /Image /Width ${pixelW} /Height ${pixelH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`,image,'\nendstream']);object(content,`<< /Length ${encoder.encode(commands).length} >>\nstream\n${commands}endstream`);});
  const xref=length,count=3+images.length*3;append(`xref\n0 ${count}\n0000000000 65535 f \n`);for(let i=1;i<count;i++)append(String(offsets[i]).padStart(10,'0')+' 00000 n \n');append(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);return new Blob(parts,{type:'application/pdf'});
}
export async function twoSidedPDF(front,back,size){const images=[];for(const svg of [front,back])images.push(new Uint8Array(await(await rasterize(svg,size,'image/jpeg')).arrayBuffer()));return buildPDF(images,size);}
