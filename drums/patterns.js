// SPDX-License-Identifier: MIT
export const TRACKS = [
  {id:'kick', name:'Kick', file:'kick-01.wav', trim:1},
  {id:'snare', name:'Snare', file:'snare-01.wav', trim:.8},
  {id:'closed', name:'Closed hat', file:'hihat-closed.wav', trim:.46},
  {id:'open', name:'Open hat', file:'hihat-open.wav', trim:.42},
  {id:'tom1', name:'Tom 1', file:'tom-01.wav', trim:.75},
  {id:'tom2', name:'Tom 2', file:'tom-03.wav', trim:.8},
  {id:'ride', name:'Ride', file:'ride-01.wav', trim:.44},
  {id:'crash', name:'Crash', file:'crash-01.wav', trim:.48}
];
export const STYLES = {
  rock: {name:'Rock', bpm:110, swing:0, kick:[0,8,10], snare:[4,12], closed:[0,2,4,6,8,10,12,14]},
  pop: {name:'Pop · four on the floor', bpm:120, swing:0, kick:[0,4,8,12], snare:[4,12], closed:[0,2,4,6,8,10,12,14]},
  funk: {name:'Funk', bpm:100, swing:12, kick:[0,3,8,10], snare:[4,12], closed:[0,2,4,6,8,10,12,14]},
  hiphop: {name:'Hip-hop', bpm:85, swing:30, kick:[0,7,10], snare:[4,12], closed:[0,2,4,6,8,10,12,14]},
  half: {name:'Half-time', bpm:140, swing:0, kick:[0,7,10], snare:[8], closed:[0,2,4,6,8,10,12,14]},
  jazz: {name:'Ride groove', bpm:120, swing:20, kick:[0,8], snare:[4,12], ride:[0,4,6,8,12,14]}
};
export const CREDIT = 'Drum recordings: Pearl Master Studio Pack 1 by enoe, via oramics/sampled. CC BY 3.0: https://creativecommons.org/licenses/by/3.0/ . Source: https://oramics.github.io/sampled/DRUMS/pearl-master-studio/ . Recordings arranged and mixed into this beat.';

export function rng(seed) {
  let s=2166136261;
  for(const c of String(seed)) s=Math.imul(s^c.charCodeAt(0),16777619);
  return()=>{s+=0x6d2b79f5;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};
}
export function generate(style='rock', bars=2, density=45, fills=true, seed='beat') {
  const groove=STYLES[style]||STYLES.rock, random=rng(seed), steps=bars*16;
  const pattern=TRACKS.map(()=>Array(steps).fill(0));
  const hit=(id,step,v)=>{pattern[TRACKS.findIndex(t=>t.id===id)][step]=v;};
  for(let bar=0;bar<bars;bar++) {
    for(const track of TRACKS) for(const step of groove[track.id]||[]) {
      let velocity=track.id==='closed'?(step%4===0?.65:.5):track.id==='ride'?.6:.85;
      if(style==='jazz'&&(track.id==='kick'||track.id==='snare')) velocity=.45;
      hit(track.id,bar*16+step,velocity);
    }
    for(let step=0;step<16;step++) {
      if(step%2===1 && random()<density/100*(style==='funk'?.6:.2)) hit('closed',bar*16+step,.35+random()*.15);
      if([2,6,11,14].includes(step)&&random()<density/100*.38)hit('kick',bar*16+step,.55+random()*.25);
      if([3,7,11,15].includes(step)&&random()<density/100*.35)hit('snare',bar*16+step,.2+random()*.15);
    }
    if(style!=='jazz'&&density>25&&random()<density/120){hit('closed',bar*16+14,0);hit('open',bar*16+14,.6);}
  }
  if(fills&&density>0) {
    const start=steps-4;
    for(let i=0;i<4;i++) {
      if(i===0||random()<density/100+.15){hit(i<2?'snare':i===2?'tom1':'tom2',start+i,.65+i*.07);hit('closed',start+i,0);hit('open',start+i,0);}
    }
    hit('crash',0,.7);
  }
  return pattern;
}
export function initial() {
  return {format:'still-drum-studio',version:1,name:'My first groove',style:'rock',bars:2,bpm:110,swing:0,density:45,fills:true,humanize:true,loop:true,volume:60,seed:'first-groove',mix:TRACKS.map(()=>80),muted:TRACKS.map(()=>false),pattern:generate('rock',2,45,true,'first-groove'),credit:CREDIT};
}
export function validProject(p) {
  return p?.format==='still-drum-studio'&&p.version===1&&typeof p.name==='string'&&p.name.length<=60&&Object.hasOwn(STYLES,p.style)&&[1,2,4].includes(p.bars)&&Number.isInteger(p.bpm)&&p.bpm>=50&&p.bpm<=200&&Number.isInteger(p.swing)&&p.swing>=0&&p.swing<=60&&Number.isInteger(p.density)&&p.density>=0&&p.density<=100&&typeof p.fills==='boolean'&&typeof p.humanize==='boolean'&&typeof p.loop==='boolean'&&Number.isFinite(p.volume)&&p.volume>=0&&p.volume<=100&&typeof p.seed==='string'&&p.seed.length<=40&&Array.isArray(p.mix)&&p.mix.length===8&&p.mix.every(v=>Number.isFinite(v)&&v>=0&&v<=100)&&Array.isArray(p.muted)&&p.muted.length===8&&p.muted.every(v=>typeof v==='boolean')&&Array.isArray(p.pattern)&&p.pattern.length===8&&p.pattern.every(row=>Array.isArray(row)&&row.length===p.bars*16&&row.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
}
export function cleanProject(p) {
  return {...Object.fromEntries(['format','version','name','style','bars','bpm','swing','density','fills','humanize','loop','volume','seed'].map(k=>[k,p[k]])),mix:p.mix.slice(),muted:p.muted.slice(),pattern:p.pattern.map(r=>r.slice()),credit:CREDIT};
}
export function stepTime(step,bpm,swing=0) { return (step+(step%2?swing/100:0))*60/bpm/4; }
export function velocityFor(value,track,step,humanize) {
  return value*(humanize ? .92+((Math.imul(step+1,31)+track*17)%11)/100 : 1);
}
