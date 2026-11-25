// SPDX-License-Identifier: MIT
import {voice,voicedProgression,chordEvents,arrangement} from './music.js';
const frequency=midi=>440*2**((midi-69)/12);
export class SoundGraph{
  constructor(context,settings,live=true){
    this.context=context;this.live=live;this.voices=new Set();this.buffers=new Map();
    this.input=context.createGain();this.compressor=context.createDynamicsCompressor();
    this.compressor.threshold.value=-15;this.compressor.knee.value=14;this.compressor.ratio.value=6;
    this.master=context.createGain();this.send=context.createGain();this.reverb=context.createConvolver();this.output=context.createGain();
    this.master.gain.value=settings.volume/100*.65;this.send.gain.value=settings.reverb/100*.8;
    const impulse=context.createBuffer(2,Math.ceil(context.sampleRate*1.25),context.sampleRate);let seed=7117;
    for(let channel=0;channel<2;channel++){const data=impulse.getChannelData(channel);for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/2147483648-1)*(1-i/data.length)**3*.22;}}
    this.reverb.buffer=impulse;this.input.connect(this.compressor);this.compressor.connect(this.master);
    this.master.connect(this.output);this.master.connect(this.send);this.send.connect(this.reverb);this.reverb.connect(this.output);this.output.connect(context.destination);this.settings(settings);
  }
  settings(s){const t=this.context.currentTime;this.master.gain.setTargetAtTime(s.volume/100*.65,t,.025);this.send.gain.setTargetAtTime(s.reverb/100*.8,t,.025);}
  pluck(midi){
    if(this.buffers.has(midi))return this.buffers.get(midi);
    const ctx=this.context,rate=ctx.sampleRate,delay=Math.max(2,Math.round(rate/frequency(midi)-.5)),buffer=ctx.createBuffer(1,Math.ceil(rate*4),rate),data=buffer.getChannelData(0),ring=new Float32Array(delay);let seed=midi*7907+41;
    for(let i=0;i<delay;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;ring[i]=(seed/2147483648-1)*.8;}
    const average=ring.reduce((a,b)=>a+b)/delay;for(let i=0;i<delay;i++)ring[i]-=average;
    for(let i=0;i<data.length;i++){const j=i%delay,v=ring[j];ring[j]=(v+ring[(j+1)%delay])*.4985;data[i]=v*Math.min(1,i/(rate*.003));}
    const result={buffer,rate:frequency(midi)/(rate/(delay+.5))};if(this.buffers.size>40)this.buffers.delete(this.buffers.keys().next().value);this.buffers.set(midi,result);return result;
  }
  note(midi,at,duration,velocity,instrument){
    const ctx=this.context,t=Math.max(ctx.currentTime,at),hold=Math.max(.06,duration),release=instrument==='bell'?.9:instrument==='pad'?.4:.25,gain=ctx.createGain(),nodes=[];this.output.gain.setTargetAtTime(1,ctx.currentTime,.008);
    gain.connect(this.input);const peak=.27*velocity,attack=instrument==='pad'?Math.min(.1,hold*.25):.007;
    gain.gain.setValueAtTime(.00001,t);gain.gain.exponentialRampToValueAtTime(Math.max(.00002,peak),t+attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(.00001,peak*(instrument==='pad'?.78:instrument==='bell'?.08:.22)),t+Math.max(attack+.001,hold));gain.gain.exponentialRampToValueAtTime(.00001,t+hold+release);
    const record={gain,nodes,end:t+hold+release};this.voices.add(record);
    if(instrument==='guitar'){
      const cached=this.pluck(midi),source=ctx.createBufferSource();source.buffer=cached.buffer;source.playbackRate.value=cached.rate;source.connect(gain);nodes.push(source);
    }else{
      const partials=instrument==='bell'?[[1,1,'sine'],[2.76,.22,'sine'],[5.4,.06,'sine']]:instrument==='pad'?[[1,.68,'sine'],[1.002,.18,'triangle']]:[[1,.8,'sine'],[2,.2,'sine'],[3,.06,'sine']];
      for(const [ratio,level,type] of partials){const osc=ctx.createOscillator(),part=ctx.createGain();osc.type=type;osc.frequency.value=frequency(midi)*ratio;part.gain.value=level;osc.connect(part);part.connect(gain);nodes.push(osc);osc.onended=()=>part.disconnect();}
    }
    let ended=0;
    for(const node of nodes){const previous=node.onended;node.onended=()=>{previous?.();node.disconnect();if(++ended===nodes.length){gain.disconnect();this.voices.delete(record);}};node.start(t);node.stop(t+hold+release+.02);}
    if(this.live&&this.voices.size>128){const oldest=this.voices.values().next().value;this.release(oldest);}
  }
  click(at,accent){this.note(accent?88:81,at,.025,accent?.35:.22,'piano');}
  release(record){const t=this.context.currentTime;record.gain.gain.cancelScheduledValues(t);record.gain.gain.setValueAtTime(.00001,t);for(const node of record.nodes)try{node.stop(t+.02);}catch{}this.voices.delete(record);}
  stop(){this.output.gain.cancelScheduledValues(this.context.currentTime);this.output.gain.setTargetAtTime(0,this.context.currentTime,.008);for(const record of [...this.voices])this.release(record);}
}
export class Player{
  constructor(change){this.change=change;this.context=null;this.graph=null;this.running=false;this.cursor={index:0,beat:0};this.epoch=0;this.timer=null;this.segments=[];}
  async ready(s){
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('Audio is unavailable in this browser.');
    if(!this.context||this.context.state==='closed'){this.context=new Audio();this.graph=new SoundGraph(this.context,s);}
    if(this.context.state!=='running')await this.context.resume();if(this.context.state!=='running')throw Error('Tap Play again to enable audio.');this.graph.settings(s);
  }
  position(){
    if(!this.running)return this.cursor;
    const time=this.context.currentTime,segment=this.segments.find(x=>time>=x.at&&time<x.end)??this.segments.find(x=>time<x.at)??this.segments.at(-1);
    if(!segment)return this.cursor;
    return {index:segment.index,beat:Math.min(segment.beats,segment.from+Math.max(0,time-segment.at)*this.state.bpm/60),notes:segment.notes};
  }
  pause(notify=true){const was=this.running,cursor=this.position();this.cursor={index:cursor.index,beat:cursor.beat};this.running=false;this.epoch++;clearInterval(this.timer);this.timer=null;this.graph?.stop();this.segments=[];if(was&&notify)this.change?.();return this.cursor;}
  stop(){this.pause();this.cursor={index:0,beat:0};this.change?.();}
  async start(s,cursor=this.cursor){
    this.pause();const epoch=this.epoch;await this.ready(s);if(epoch!==this.epoch)return;
    if(!s.steps.length)throw Error('Add a chord to the progression first.');
    this.state={...s,steps:s.steps.map(c=>({...c}))};this.running=true;
    const notes=voicedProgression(s),secondsPerBeat=60/s.bpm;let index=Math.min(cursor.index,s.steps.length-1),from=Math.min(cursor.beat,s.steps[index].beats),at=this.context.currentTime+.075,next=true;
    if(from>=s.steps[index].beats-.01){index=(index+1)%s.steps.length;from=0;}
    this.segments=[];let end=Infinity;
    const tick=()=>{
      if(!this.running)return;const now=this.context.currentTime;
      this.segments=this.segments.filter(segment=>segment.end>now-.2);
      while(next&&at<now+.14){
        const chord=s.steps[index],remaining=chord.beats-from,segment={index,from,at,end:at+remaining*secondsPerBeat,beats:chord.beats,notes:notes[index]};this.segments.push(segment);
        for(const e of chordEvents(notes[index],chord.beats,s,from))this.graph.note(e.midi,at+(e.beat-from)*secondsPerBeat,e.duration*secondsPerBeat,e.velocity,s.instrument);
        if(s.metronome)for(let beat=Math.ceil(from);beat<chord.beats;beat++)this.graph.click(at+(beat-from)*secondsPerBeat,beat%4===0);
        at=segment.end;from=0;index++;
        if(index===s.steps.length){if(s.loop)index=0;else{next=false;end=at;}}
      }
      if(!next&&now>=end){this.running=false;this.cursor={index:0,beat:0};clearInterval(this.timer);this.change?.();}
    };
    tick();this.timer=setInterval(tick,25);this.change?.();
  }
  async audition(s,chord){
    this.pause();const epoch=this.epoch;await this.ready(s);if(epoch!==this.epoch)return;
    const notes=voice(chord,s),beats=Math.min(4,chord.beats),at=this.context.currentTime+.01;
    for(const e of chordEvents(notes,beats,s))this.graph.note(e.midi,at+e.beat*60/s.bpm,e.duration*60/s.bpm,e.velocity,s.instrument);
    return notes;
  }
  async single(s,midi){if(this.running)this.pause();const epoch=this.epoch;await this.ready(s);if(epoch===this.epoch)this.graph.note(midi,this.context.currentTime+.01,.7,.8,s.instrument);}
  volume(s){this.graph?.settings(s);}
}
export async function renderAudio(s,repeats=1,click=false){
  const plan=arrangement(s,repeats);if(!s.steps.length)throw Error('Add at least one chord first.');if(plan.seconds>90)throw Error('WAV exports can be up to 90 seconds. Use fewer repeats, shorter chords, or a faster tempo.');
  const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!Offline)throw Error('WAV export is unavailable here. You can still download MIDI or the editable progression.');
  const context=new Offline(2,Math.ceil((plan.seconds+1.5)*44100),44100),graph=new SoundGraph(context,s,false);
  for(const e of plan.events)graph.note(e.midi,e.beat*60/s.bpm,e.duration*60/s.bpm,e.velocity,s.instrument);
  if(click)for(let i=0;i<plan.beats;i++)graph.click(i*60/s.bpm,i%4===0);
  return context.startRendering();
}
