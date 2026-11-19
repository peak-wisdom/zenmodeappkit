// SPDX-License-Identifier: MIT
import {newSeed,imageURL} from './core.js';
export async function normalizeImage(blob,name='Background image'){
  if(blob.size>16*1024*1024)throw Error('Choose an image smaller than 16 MB.');
  if(!/^image\/(jpeg|png|webp|gif|avif)$/i.test(blob.type))throw Error('Use a JPG, PNG, WebP, GIF, or AVIF image. Animated images use one still frame.');
  const url=URL.createObjectURL(blob),image=new Image();
  try{
    image.src=url;await image.decode();if(!image.naturalWidth||image.naturalWidth*image.naturalHeight>40000000)throw Error('Choose an image with fewer than 40 megapixels.');
    const scale=Math.min(1,2400/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));const ctx=canvas.getContext('2d');if(!ctx)throw Error('This browser could not prepare the image.');ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const dataURL=canvas.toDataURL(blob.type==='image/jpeg'?'image/jpeg':'image/png',.94),photo={id:newSeed(),dataURL,width:canvas.width,height:canvas.height,name:String(name).slice(0,100)};canvas.width=canvas.height=1;
    if(dataURL.length>14000000)throw Error('This image is too large to keep in the card. Try a smaller image or JPG.');return photo;
  }catch(error){if(error.name==='EncodingError')throw Error('This image could not be opened. Try JPG, PNG, or WebP.');throw error;}finally{URL.revokeObjectURL(url);}
}
export async function loadImageLink(value,signal){
  const url=imageURL(value);let response;
  try{response=await fetch(url,{mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',signal});}catch(error){if(error.name==='AbortError')throw error;throw Error('This site blocks image importing or could not be reached. Download the image and upload it instead.');}
  if(!response.ok)throw Error('The image link returned '+response.status+'. Try a direct image link or upload the image.');
  const length=Number(response.headers.get('content-length'));if(length>16*1024*1024)throw Error('Choose an image smaller than 16 MB.');
  return normalizeImage(await response.blob(),new URL(url).pathname.split('/').at(-1)||'Linked image');
}
