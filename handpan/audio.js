// SPDX-License-Identifier: MIT
import {frequencyFor} from '../sound-pad/audio.js?v=3';
export class HandpanAudio {
  constructor(){this.context=null;this.hits=new Set();this.epoch=0;}
  async strike(midi,settings,strength=0.7){
    const epoch=this.epoch,Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)throw new Error('Web Audio is unavailable in this browser.');
    if(!this.context){this.context=new Audio();this.master=this.context.createGain();this.output=this.context.createDynamicsCompressor();this.output.threshold.value=-12;this.output.ratio.value=5;this.output.connect(this.master);this.master.connect(this.context.destination);}
    if(this.context.state!=='running')await this.context.resume();
    if(epoch!==this.epoch)return;
    if(this.context.state!=='running')throw new Error('Touch the drum again to enable audio.');
    this.volume(settings.volume);
    while(this.hits.size>=16)this.fade(this.hits.values().next().value);
    const hit=[],now=this.context.currentTime,frequency=frequencyFor(midi);
    this.hits.add(hit);let ended=0;
    for(const [ratio,weight,decay]of[[1,1,1],[2,0.38,0.75],[3.01,0.18,0.45],[4.08,0.05,0.23]]){
      const oscillator=this.context.createOscillator(),gain=this.context.createGain();
      oscillator.frequency.setValueAtTime(frequency*ratio*1.003,now);oscillator.frequency.exponentialRampToValueAtTime(frequency*ratio,now+.06);
      gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime((.08+strength*.13)*weight,now+.008);gain.gain.exponentialRampToValueAtTime(.00001,now+.03+settings.sustain*decay);
      oscillator.connect(gain);gain.connect(this.output);hit.push({oscillator,gain});
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();if(++ended===4)this.hits.delete(hit);};oscillator.start();oscillator.stop(now+.08+settings.sustain*decay);
    }
  }
  volume(value){if(this.master)this.master.gain.setTargetAtTime(value/100,this.context.currentTime,.02);}
  fade(hit){const at=this.context.currentTime;for(const {oscillator,gain}of hit){gain.gain.cancelScheduledValues(at);gain.gain.setTargetAtTime(0,at,.01);oscillator.stop(at+.08);}this.hits.delete(hit);}
  stop(){this.epoch++;for(const hit of this.hits)this.fade(hit);}
}
