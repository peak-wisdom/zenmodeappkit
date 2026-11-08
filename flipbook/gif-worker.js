// SPDX-License-Identifier: MIT
import{GIFEncoder,quantize,applyPalette}from './vendor/gifenc.js';
import{frameDelay}from './model.js';
let encoder=null,job=null,next=0;
self.onmessage=({data})=>{
  try{
    if(data.type==='start'){job=data;encoder=GIFEncoder();next=0;self.postMessage({type:'ready'});return;}
    if(data.type!=='frame'||!job||data.index!==next)throw Error('Animation frames arrived out of order.');
    const rgba=new Uint8Array(data.rgba),palette=quantize(rgba,256),pixels=applyPalette(rgba,palette);
    encoder.writeFrame(pixels,job.width,job.height,{palette,delay:frameDelay(next,job.fps),repeat:job.loop?0:-1,dispose:1});next++;
    if(next===job.count){encoder.finish();const bytes=encoder.bytes();self.postMessage({type:'done',bytes:bytes.buffer},[bytes.buffer]);encoder=null;job=null;}
    else self.postMessage({type:'next',completed:next});
  }catch(error){self.postMessage({type:'error',message:error.message});}
};
