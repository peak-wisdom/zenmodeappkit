// SPDX-License-Identifier: MIT
import{TRACKS,CREDIT,stepTime,velocityFor}from './patterns.js';
import{encodeWav}from '../chiptunes/music.js?v=1';

function rack(context,volume) {
  const compressor=context.createDynamicsCompressor(),master=context.createGain();
  compressor.threshold.value=-10;compressor.knee.value=8;compressor.ratio.value=4;compressor.attack.value=.003;compressor.release.value=.16;
  master.gain.value=volume/100;compressor.connect(master);master.connect(context.destination);
  return{context,compressor,master,nodes:new Set(),open:null};
}
function strike(output,buffers,track,at,velocity,mix) {
  if(!velocity||!mix)return;
  const context=output.context;
  if(track===2&&output.open) {
    const {gain,source}=output.open;
    gain.gain.cancelScheduledValues(at);gain.gain.setTargetAtTime(0,at,.005);
    try{source.stop(at+.025);}catch{}
    output.open=null;
  }
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffers[track];
  const level=velocity*TRACKS[track].trim*mix/100;
  gain.gain.setValueAtTime(level,at);source.connect(gain);gain.connect(output.compressor);
  const voice={source,gain};output.nodes.add(voice);if(track===3)output.open=voice;
  source.onended=()=>{source.disconnect();gain.disconnect();output.nodes.delete(voice);if(output.open===voice)output.open=null;};
  source.start(at);source.stop(at+source.buffer.duration);
}
function schedule(output,buffers,project,step,at) {
  for(let track=0;track<TRACKS.length;track++)if(!project.muted[track]&&!(track===3&&project.pattern[2][step]&&!project.muted[2])) {
    strike(output,buffers,track,at,velocityFor(project.pattern[track][step],track,step,project.humanize),project.mix[track]);
  }
}
export class DrumPlayer {
  constructor(onEnd,onError){this.context=null;this.buffers=null;this.loading=null;this.output=null;this.playing=false;this.epoch=0;this.timer=null;this.onEnd=onEnd;this.onError=onError;}
  async ensure() {
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)throw Error('Web Audio is unavailable in this browser.');
    if(!this.context)this.context=new Audio();
    if(this.context.state!=='running')await this.context.resume();
    if(this.context.state!=='running')throw Error('Press Play again to enable audio.');
    if(!this.loading&&!this.buffers)this.loading=Promise.all(TRACKS.map(async track=>{
      const response=await fetch(new URL('./samples/'+track.file,import.meta.url));
      if(!response.ok)throw Error('Drum recordings could not load. Check your connection and try again.');
      const buffer=await this.context.decodeAudioData(await response.arrayBuffer());
      let peak=0;for(let ch=0;ch<buffer.numberOfChannels;ch++)for(const v of buffer.getChannelData(ch))peak=Math.max(peak,Math.abs(v));
      if(peak>0)for(let ch=0;ch<buffer.numberOfChannels;ch++){const data=buffer.getChannelData(ch);for(let i=0;i<data.length;i++)data[i]*=.85/peak;}
      return buffer;
    })).then(buffers=>{this.buffers=buffers;}).finally(()=>{this.loading=null;});
    if(this.loading)await this.loading;
    if(!this.output)this.output=rack(this.context,60);
  }
  setVolume(value){if(this.output)this.output.master.gain.setTargetAtTime(value/100,this.context.currentTime,.02);}
  async preview(track,project) {
    const epoch=this.epoch;await this.ensure();if(epoch!==this.epoch)return;
    this.setVolume(project.volume);strike(this.output,this.buffers,track,this.context.currentTime+.01,.85,project.mix[track]);
  }
  async start(project) {
    this.stop();const epoch=this.epoch;await this.ensure();if(epoch!==this.epoch)return false;
    this.project=project;this.playing=true;this.setVolume(project.volume);this.startAt=this.context.currentTime+.08;this.cycle=0;this.nextStep=0;this.finishAt=null;
    const scheduleAhead=()=>{
      try {
        if(this.finishAt!==null){if(this.context.currentTime>=this.finishAt){this.stop();this.onEnd();}return;}
        let at=this.startAt+this.cycle*project.bars*4*60/project.bpm+stepTime(this.nextStep,project.bpm,project.swing);
        if(at<this.context.currentTime-.25){this.stop();this.onError(Error('Playback paused while the page was inactive. Press Play to restart.'));return;}
        while(at<this.context.currentTime+.13){
          schedule(this.output,this.buffers,project,this.nextStep,at);this.nextStep++;
          if(this.nextStep===project.bars*16){if(!project.loop){this.finishAt=this.startAt+(this.cycle+1)*project.bars*4*60/project.bpm+Math.max(...this.buffers.map(b=>b.duration));break;}this.nextStep=0;this.cycle++;}
          at=this.startAt+this.cycle*project.bars*4*60/project.bpm+stepTime(this.nextStep,project.bpm,project.swing);
        }
      }catch(error){this.stop();this.onError(error);}
    };
    scheduleAhead();if(this.playing)this.timer=setInterval(scheduleAhead,25);return this.playing;
  }
  get step(){if(!this.playing)return-1;const p=this.project,length=p.bars*4*60/p.bpm,elapsed=Math.max(0,this.context.currentTime-this.startAt);if(!p.loop&&elapsed>=length)return-1;const t=elapsed%length;for(let s=p.bars*16-1;s>=0;s--)if(stepTime(s,p.bpm,p.swing)<=t)return s;return 0;}
  stop(){this.epoch++;this.playing=false;clearInterval(this.timer);this.timer=null;if(!this.output)return;const at=this.context.currentTime;for(const {source,gain}of this.output.nodes){gain.gain.cancelScheduledValues(at);gain.gain.setTargetAtTime(0,at,.005);try{source.stop(at+.025);}catch{}}this.output.open=null;}
  async render(project,repeats=1,seamless=true) {
    await this.ensure();const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
    if(!Offline)throw Error('WAV export is unavailable in this browser.');
    const length=project.bars*4*60/project.bpm,released=Math.max(...this.buffers.map(b=>b.duration)),warmCycles=seamless?Math.max(1,Math.ceil(released/length)):0;
    const duration=seamless?(warmCycles+repeats)*length:repeats*length+released;
    const context=new Offline(2,Math.ceil(duration*44100),44100),output=rack(context,project.volume);
    for(let cycle=0;cycle<warmCycles+repeats;cycle++)for(let step=0;step<project.bars*16;step++)schedule(output,this.buffers,project,step,cycle*length+stepTime(step,project.bpm,project.swing));
    const rendered=await context.startRendering();
    const start=seamless?Math.round(warmCycles*length*44100):0,frames=seamless?Math.round(repeats*length*44100):rendered.length;
    const buffer=context.createBuffer(1,frames,44100),mono=buffer.getChannelData(0);let peak=0;
    for(let i=0;i<frames;i++){mono[i]=(rendered.getChannelData(0)[start+i]+rendered.getChannelData(1)[start+i])*.5;peak=Math.max(peak,Math.abs(mono[i]));}
    if(peak>.98)for(let i=0;i<mono.length;i++)mono[i]*=.98/peak;
    // Recorded tails from preceding cycles are included at the start of seamless loops.
    return buffer;
  }
}
export function wavWithCredit(buffer) {
  const pcm=new Uint8Array(encodeWav(buffer)),text=new TextEncoder().encode(CREDIT+'\0'),size=text.length+(text.length%2),extra=20+size;
  const bytes=new Uint8Array(pcm.length+extra);bytes.set(pcm);const view=new DataView(bytes.buffer),write=(at,s)=>[...s].forEach((c,i)=>view.setUint8(at+i,c.charCodeAt(0)));
  const offset=pcm.length;write(offset,'LIST');view.setUint32(offset+4,12+size,true);write(offset+8,'INFO');write(offset+12,'ICMT');view.setUint32(offset+16,text.length,true);bytes.set(text,offset+20);view.setUint32(4,bytes.length-8,true);return bytes;
}
