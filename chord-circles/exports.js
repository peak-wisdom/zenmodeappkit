// SPDX-License-Identifier: MIT
import {arrangement} from './music.js';
export function wav(buffer){
  const frames=buffer.length,channels=buffer.numberOfChannels,bytes=new ArrayBuffer(44+frames*channels*2),view=new DataView(bytes),text=(at,value)=>{for(let i=0;i<value.length;i++)view.setUint8(at+i,value.charCodeAt(i));};
  text(0,'RIFF');view.setUint32(4,bytes.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*channels*2,true);view.setUint16(32,channels*2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,frames*channels*2,true);
  const data=Array.from({length:channels},(_,c)=>buffer.getChannelData(c));let at=44;
  for(let i=0;i<frames;i++)for(let c=0;c<channels;c++){const n=Math.max(-1,Math.min(1,data[c][i]));view.setInt16(at,Math.round(n*(n<0?32768:32767)),true);at+=2;}
  return new Blob([bytes],{type:'audio/wav'});
}
const variable=value=>{const bytes=[value&127];while(value>>=7)bytes.unshift((value&127)|128);return bytes;};
const uint32=value=>[(value>>>24)&255,(value>>>16)&255,(value>>>8)&255,value&255];
export function midi(s,repeats=1){
  const plan=arrangement(s,repeats),events=[],tempo=Math.round(60000000/s.bpm),program={piano:0,guitar:24,pad:89,bell:10}[s.instrument],track=[0,255,81,3,(tempo>>16)&255,(tempo>>8)&255,tempo&255,0,192,program];
  for(const e of plan.events){const start=Math.round(e.beat*480),end=Math.max(start+1,Math.round((e.beat+e.duration)*480));events.push({tick:start,order:1,bytes:[144,e.midi,Math.max(1,Math.round(100*e.velocity))]},{tick:end,order:0,bytes:[128,e.midi,0]});}
  events.sort((a,b)=>a.tick-b.tick||a.order-b.order);let previous=0;
  for(const event of events){track.push(...variable(event.tick-previous),...event.bytes);previous=event.tick;}
  track.push(...variable(Math.max(0,Math.round(plan.beats*480)-previous)),255,47,0);
  return new Blob([new Uint8Array([77,84,104,100,0,0,0,6,0,0,0,1,1,224,77,84,114,107,...uint32(track.length),...track])],{type:'audio/midi'});
}
export function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
