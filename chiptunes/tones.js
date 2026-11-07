// SPDX-License-Identifier: MIT
const waves=new WeakMap();
const frequency=midi=>440*2**((midi-69)/12);

function pulse(context,duty){
  if(!waves.has(context))waves.set(context,new Map());
  const cache=waves.get(context);if(cache.has(duty))return cache.get(duty);
  const real=new Float32Array(65),imaginary=new Float32Array(65);
  for(let h=1;h<65;h++)real[h]=2*Math.sin(Math.PI*h*duty)/(Math.PI*h);
  const wave=context.createPeriodicWave(real,imaginary);cache.set(duty,wave);return wave;
}

// One shared tone implementation keeps live auditions and exported piano notes alike.
export function startTone(context,destination,midi,voice,at,level=.12,onEnd=()=>{}){
  const parts=[],piano=voice==='piano',fundamental=frequency(midi);
  const decay=Math.max(1.6,Math.min(6,3.5*Math.sqrt(261.6256/fundamental)));
  const harmonics=piano?[[1,.75,1],[2,.3,.65],[3,.13,.43],[4,.065,.3],[6,.025,.2],[8,.012,.13]]:[[1,1,1]];
  let ended=0,released=false;
  for(const [harmonic,weight,falloff]of harmonics){
    const oscillator=context.createOscillator(),gain=context.createGain();
    if(piano){oscillator.type='sine';oscillator.frequency.value=fundamental*harmonic*Math.sqrt((1+.00006*harmonic**2)/1.00006);}
    else{oscillator.frequency.value=fundamental;if(voice==='triangle')oscillator.type='triangle';else oscillator.setPeriodicWave(pulse(context,voice==='pulse' ? .25 : .5));}
    const peak=level*weight,end=at+(piano?decay*falloff:12);
    gain.gain.value=0;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(peak,at+.005);
    if(piano)gain.gain.exponentialRampToValueAtTime(.00001,end);
    oscillator.connect(gain);gain.connect(destination);
    const part={oscillator,gain,peak,end};parts.push(part);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();if(++ended===parts.length)onEnd();};
    oscillator.start(at);oscillator.stop(end+.01);
  }
  function release(when,hard=false){
    if(released&&!hard)return;released=true;
    const tail=hard ? .02 : piano ? .16 : .09;
    for(const p of parts){
      if(when>=p.end+.01)continue;
      const stopAt=Math.min(p.end+.01,when+tail);
      if(p.gain.gain.cancelAndHoldAtTime)p.gain.gain.cancelAndHoldAtTime(when);
      else{
        p.gain.gain.cancelScheduledValues(when);
        const elapsed=Math.max(0,when-at-.005),span=p.end-at-.005;
        const value=piano?p.peak*(.00001/p.peak)**Math.min(1,elapsed/span):p.peak;
        if(when>at+.005)p.gain.gain.exponentialRampToValueAtTime(Math.max(.00001,value),when);
        else p.gain.gain.setValueAtTime(0,when);
      }
      p.gain.gain.linearRampToValueAtTime(0,stopAt);try{p.oscillator.stop(stopAt+.005);}catch{}
    }
  }
  return{release:when=>release(when),stop:when=>release(when,true),parts,at};
}

export class NotePreview{
  constructor(onChange=()=>{},onError=()=>{}){this.context=null;this.output=null;this.master=null;this.tokens=new Set();this.held=new Map();this.pedal=false;this.epoch=0;this.onChange=onChange;this.onError=onError;}
  async press(id,midi,voice='piano',volume=35){
    this.release(id);
    while(this.tokens.size>=24){const old=this.tokens.values().next().value;this.cancel(old);}
    const token={id,midi,voice,epoch:this.epoch,released:false,sustained:false,cancelled:false,tone:null};
    this.tokens.add(token);this.held.set(id,token);this.onChange();
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)throw Error('Web Audio is unavailable in this browser.');
      if(!this.context||this.context.state==='closed'){
        this.context=new Audio();this.output=this.context.createDynamicsCompressor();this.output.threshold.value=-12;this.output.ratio.value=5;
        this.master=this.context.createGain();this.master.gain.value=volume/100;this.output.connect(this.master);this.master.connect(this.context.destination);
      }
      if(this.context.state!=='running')await this.context.resume();
      if(token.cancelled||token.epoch!==this.epoch)return;
      if(this.context.state!=='running')throw Error('Touch a note again to enable audio.');
      this.setVolume(volume);
      token.tone=startTone(this.context,this.output,midi,voice,this.context.currentTime+.005,.15,()=>this.finish(token));
      if(token.released&&!token.sustained)this.releaseTone(token);
    }catch(error){this.finish(token);if(token.epoch===this.epoch)this.onError(error);}
  }
  releaseTone(token){if(token.tone)token.tone.release(Math.max(this.context.currentTime,token.tone.at+.10));}
  release(id){const token=this.held.get(id);if(!token)return;this.held.delete(id);token.released=true;token.sustained=this.pedal&&token.voice==='piano';if(!token.sustained)this.releaseTone(token);this.onChange();}
  setPedal(value){this.pedal=value;if(!value)for(const token of this.tokens)if(token.sustained){token.sustained=false;this.releaseTone(token);}}
  setVolume(value){if(this.master)this.master.gain.setTargetAtTime(value/100,this.context.currentTime,.02);}
  cancel(token){token.cancelled=true;token.tone?.stop(this.context.currentTime);this.finish(token);}
  finish(token){if(this.held.get(token.id)===token)this.held.delete(token.id);this.tokens.delete(token);this.onChange();}
  get sounding(){return this.tokens.size>0;}
  get activeNotes(){return[...this.tokens].filter(t=>!t.released||t.sustained).map(t=>t.midi);}
  stop(){this.epoch++;for(const token of [...this.tokens])this.cancel(token);this.held.clear();this.onChange();}
}
