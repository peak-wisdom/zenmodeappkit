// SPDX-License-Identifier: MIT
import {FORMATS,dimensions} from './core.js';
export function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;}
export async function printPNG(blob){
  const source=new Uint8Array(await blob.arrayBuffer()),view=new DataView(source.buffer);
  if(source.length<33||view.getUint32(0)!==0x89504e47)throw Error('The image could not be encoded. Please use SVG.');
  const chunk=new Uint8Array(21),chunkView=new DataView(chunk.buffer);chunkView.setUint32(0,9);chunk.set([112,72,89,115],4);chunkView.setUint32(8,11811);chunkView.setUint32(12,11811);chunk[16]=1;chunkView.setUint32(17,crc32(chunk.subarray(4,17)));
  const pieces=[source.slice(0,33),chunk];let offset=33;
  while(offset+12<=source.length){const length=view.getUint32(offset),end=offset+12+length;if(end>source.length)throw Error('Incomplete PNG. Please use SVG.');if(String.fromCharCode(...source.slice(offset+4,offset+8))!=='pHYs')pieces.push(source.slice(offset,end));offset=end;}
  return new Blob(pieces,{type:'image/png'});
}
export function printSVG(svg,format){const [w,h]=FORMATS[format],mmWidth=300*w/Math.min(w,h),mmHeight=300*h/Math.min(w,h);return svg.replace(/width="[^"]+" height="[^"]+"/,`width="${mmWidth}mm" height="${mmHeight}mm"`);}
export async function rasterize(svg,format,longEdge){
  const {width,height}=dimensions(format,longEdge),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
  try{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');if(!context)throw Error('This device cannot create a PNG at this size. Choose a smaller size or SVG.');context.drawImage(image,0,0,width,height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));canvas.width=canvas.height=1;if(!blob)throw Error('This device could not create the PNG. Choose a smaller size or SVG.');return await printPNG(blob);}finally{URL.revokeObjectURL(url);}
}
