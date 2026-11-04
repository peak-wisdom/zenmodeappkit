// SPDX-License-Identifier: AGPL-3.0-only
import {norm,sign,lunarDetails} from '../birth-chart/core.js';
export const DAY=86400000,MIN=Date.UTC(1900,0,1),MAX=Date.UTC(2100,0,1)-1;
export function parseDate(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Choose a complete date between 1900 and 2099.');
  const stamp=Date.parse(value+'T00:00:00Z');
  if(!Number.isFinite(stamp)||stamp<MIN||stamp>MAX||new Date(stamp).toISOString().slice(0,10)!==value)throw new Error('Choose a valid date between 1900 and 2099.');
  return stamp;
}
export const dateInput=stamp=>new Date(stamp).toISOString().slice(0,10);
export function parseDateTime(date,time=''){
  const midnight=parseDate(date);
  if(!time)return midnight;
  if(!/^\d{2}:\d{2}(:\d{2})?$/.test(time))throw new Error('Enter a valid UTC time or leave it blank for midnight.');
  const [hour,minute,second=0]=time.split(':').map(Number);
  if(hour>23||minute>59||second>59)throw new Error('Enter a valid UTC time or leave it blank for midnight.');
  return midnight+(hour*3600+minute*60+second)*1000;
}
export const timeInput=stamp=>stamp%DAY===0?'':new Date(stamp).toISOString().slice(11,19);
export function range(start,end,startTime='',endTime=''){const a=parseDateTime(start,startTime),b=parseDateTime(end,endTime);if(b<=a)throw new Error('End date and time must be later than start date and time.');return {start:a,end:b};}
export function advance(stamp,delta,start,end,loop){
  const next=stamp+delta;
  if(next>end||next<start){if(loop)return {stamp:start+((next-start)%(end-start)+(end-start))%(end-start),done:false};return {stamp:Math.min(end,Math.max(start,next)),done:true};}
  return {stamp:next,done:!loop&&((delta>0&&next===end)||(delta<0&&next===start))};
}
export const SPECS=[['Moon','Mo','#d4def6'],['Sun','Su','#f8c973'],['Mercury','Me','#8de3b7'],['Venus','Ve','#f4afd2'],['Mars','Ma','#ff9a87'],['Jupiter','Ju','#e7c392'],['Saturn','Sa','#aebbf7'],['Rahu','Ra','#bdb2d5'],['Ketu','Ke','#d3b6a0'],['Uranus','Ur','#8ce1e4'],['Neptune','Ne','#9bbef9'],['Pluto','Pl','#d6b8d3']];
export function positions(swe,lib,stamp,nodes='mean',outer=false){
  if(!Number.isFinite(stamp)||stamp<MIN||stamp>MAX)throw new Error('The selected instant is outside 1900–2099.');
  const jd=swe.dateToJulianDay(new Date(stamp)),flags=lib.CalculationFlag.MoshierEphemeris|lib.CalculationFlag.Speed|lib.CalculationFlag.Sidereal;
  const bodies=SPECS.filter(([name])=>name!=='Ketu'&&(outer||!['Uranus','Neptune','Pluto'].includes(name))).map(([name,short,color])=>{
    const id=name==='Rahu'?(nodes==='true'?lib.LunarPoint.TrueNode:lib.LunarPoint.MeanNode):lib.Planet[name];
    const p=swe.calculatePosition(jd,id,flags);
    if(!Number.isFinite(p.longitude)||!Number.isFinite(p.longitudeSpeed))throw new Error('The ephemeris returned an invalid position.');
    return {name,short,color,longitude:norm(p.longitude),speed:p.longitudeSpeed};
  });
  const rahu=bodies.find(p=>p.name==='Rahu');bodies.splice(8,0,{name:'Ketu',short:'Ke',color:SPECS[8][2],longitude:norm(rahu.longitude+180),speed:rahu.speed});
  return bodies.map(p=>({...p,rashi:sign(p.longitude),nakshatra:lunarDetails(p.longitude),motion:Math.abs(p.speed)<.005?'Stationary':p.speed<0?'Retrograde':'Direct'}));
}
