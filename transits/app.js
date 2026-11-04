// SPDX-License-Identifier: AGPL-3.0-only
import {SIGNS,RASHIS,NAKSHATRAS,norm,degrees} from '../birth-chart/core.js';
import {loadEngine} from '../birth-chart/engine.js';
import {escape} from '../birth-chart/report.js';
import {indianChart,normalizeSelection,toggleSelection} from './charts.js?v=4';
import {DAY,MIN,MAX,SPECS,parseDate,dateInput,timeInput,range,advance,positions} from './core.js?v=3';
const $=id=>document.getElementById(id),KEY='still-transits-v1';
const today=Math.floor(Date.now()/DAY)*DAY;
let state={start:today,end:Math.min(MAX-1,today+365*DAY),stamp:today,speed:7,direction:1,loop:false,outer:false,trail:true,nodes:'mean',view:'wheel',asc:0,selected:[]};
let engine=null,running=false,raf=0,last=0,lastDraw=0,lastSave=0,bodies=[],markers=new Map(),trailKey='',storageFailed=false;
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{storageFailed=true;}}
try{
  const s=JSON.parse(localStorage.getItem(KEY));
  if(s&&Number.isFinite(s.start)&&Number.isFinite(s.end)&&s.start>=MIN&&s.end<=MAX&&s.end>s.start&&Number.isFinite(s.stamp)&&s.stamp>=s.start&&s.stamp<=s.end){
    state.start=s.start;state.end=s.end;state.stamp=s.stamp;
    for(const key of ['loop','outer','trail'])if(typeof s[key]==='boolean')state[key]=s[key];
    if([1,7,30,90].includes(s.speed))state.speed=s.speed;if([1,-1].includes(s.direction))state.direction=s.direction;
    if(['mean','true'].includes(s.nodes))state.nodes=s.nodes;if(['wheel','north','south'].includes(s.view))state.view=s.view;
    if(Number.isInteger(s.asc)&&s.asc>=0&&s.asc<12)state.asc=s.asc;
    state.selected=normalizeSelection(s.selected,SPECS.map(p=>p[0]));
  }
}catch{storageFailed=true;}
if(!state.outer)state.selected=state.selected.filter(name=>!['Uranus','Neptune','Pluto'].includes(name));
SIGNS.forEach((name,i)=>{const option=document.createElement('option');option.value=i;option.textContent=name;$('asc').append(option);});
function sync(){
  $('start').value=dateInput(state.start);$('end').value=dateInput(state.end);
  $('startTime').value=timeInput(state.start);$('endTime').value=timeInput(state.end);
  for(const key of ['speed','direction','nodes','view','asc'])$(key).value=state[key];
  for(const key of ['loop','outer','trail'])$(key).checked=state[key];
  $('rangeStart').textContent=dateInput(state.start)+(timeInput(state.start)?' '+timeInput(state.start):'');$('rangeEnd').textContent=dateInput(state.end)+(timeInput(state.end)?' '+timeInput(state.end):'');
  $('ascField').hidden=state.view==='wheel';$('trail').disabled=state.view!=='wheel';
  $('chartNote').textContent=state.view==='wheel'?'0° Aries at the top · longitude increases clockwise. Each planet has its own track for readable conjunctions. Tracks do not represent orbital distances.':'Signs and planetary placements update as time advances. House 1 is a viewing reference, not a calculated ascendant. Choose its sign in the controls.';
}
sync();
function pause(message){running=false;cancelAnimationFrame(raf);$('play').textContent='Play';$('playing').textContent='Paused';save();if(message)$('status').textContent=message;}
function fail(error){pause();$('status').textContent=error.message||'The planetary positions could not be calculated.';}
const polar=(radius,angle)=>[500+radius*Math.sin(angle*Math.PI/180),500-radius*Math.cos(angle*Math.PI/180)];
function txt(x,y,value,size=18,extra=''){return `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" fill="currentColor" ${extra}>${escape(value)}</text>`;}
const nakShort=NAKSHATRAS.map(name=>name.replace('Purva ','P. ').replace('Uttara ','U. '));
function buildWheel(){
  let svg='<svg class="wheel" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" role="group" aria-label="Animated sidereal zodiac wheel"><circle cx="500" cy="500" r="468" fill="none" stroke="currentColor" opacity=".2"/><circle cx="500" cy="500" r="416" fill="none" stroke="currentColor" opacity=".2"/><circle cx="500" cy="500" r="371" fill="none" stroke="currentColor" opacity=".2"/>';
  SIGNS.forEach((name,i)=>{const [x1,y1]=polar(371,i*30),[x2,y2]=polar(416,i*30),[x,y]=polar(393,i*30+15);svg+=`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="currentColor" opacity=".25"/>`+txt(x,y+5,name,19);});
  nakShort.forEach((name,i)=>{const a=(i+.5)*360/27,[x,y]=polar(444,a),[x1,y1]=polar(416,i*360/27),[x2,y2]=polar(468,i*360/27);let rotate=a;if(a>90&&a<270)rotate+=180;svg+=`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="currentColor" opacity=".13"/>`+txt(x,y+4,name,12,`transform="rotate(${rotate} ${x} ${y})"`);});
  svg+=txt(500,480,'SIDEREAL SKY',16,'letter-spacing="3"')+txt(500,514,'Lahiri',26)+txt(500,545,'geocentric longitude',13);
  svg+='<g id="motionTrails"></g>';
  for(const p of bodies){const index=SPECS.findIndex(s=>s[0]===p.name),radius=94+index*24;svg+=`<circle cx="500" cy="500" r="${radius}" fill="none" stroke="currentColor" opacity=".045"/><g data-planet="${p.name}" role="button" tabindex="0" aria-pressed="false" aria-label="Select ${p.name}"><title>${p.name}</title><circle class="selection-ring" r="18" fill="none" stroke="${p.color}" stroke-width="2" opacity="0"/><circle r="12" fill="${p.color}"/><text class="planet-label" x="0" y="4" text-anchor="middle" fill="#12362b" font-size="11">${p.short}</text><text class="retro" x="16" y="-13" fill="currentColor" font-size="13"></text></g>`;}
  $('stage').innerHTML=svg+'</svg>';markers=new Map([...$('stage').querySelectorAll('[data-planet]')].map(node=>[node.dataset.planet,node]));trailKey='';
}
function picks(){
  $('planetPicks').innerHTML=bodies.map(p=>`<button type="button" data-planet="${p.name}" aria-pressed="${state.selected.includes(p.name)}">${p.name}</button>`).join('');
  $('selectionCount').textContent=state.selected.length?state.selected.length+' selected':'No planets selected';
  $('clearSelection').disabled=!state.selected.length;
}
function select(name){
  if(!bodies.some(p=>p.name===name))return;
  const focused=document.activeElement,area=focused?.closest('#planetPicks')?'planetPicks':focused?.closest('#stage')?'stage':null;
  state.selected=toggleSelection(state.selected,name);trailKey='';picks();draw();save();
  if(area)$(area).querySelector(`[data-planet="${name}"]`)?.focus({preventScroll:true});
}
$('clearSelection').addEventListener('click',()=>{state.selected=[];trailKey='';picks();draw();save();});
for(const id of ['planetPicks','stage'])$(id).addEventListener('click',event=>{const node=event.target.closest('[data-planet]');if(node)select(node.dataset.planet);});
$('stage').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){const node=event.target.closest('[data-planet]');if(node){event.preventDefault();select(node.dataset.planet);}}});
function drawTrail(){
  const node=$('motionTrails');if(!node)return;
  if(!state.trail||!state.selected.length){node.replaceChildren();return;}
  const key=[Math.floor(state.stamp/DAY),state.selected.join(','),state.nodes].join('/');if(key===trailKey)return;trailKey=key;
  const {swe,lib}=engine,flags=lib.CalculationFlag.MoshierEphemeris|lib.CalculationFlag.Sidereal,end=Math.floor(state.stamp/DAY)*DAY;
  node.innerHTML=state.selected.map(planet=>{
    const index=SPECS.findIndex(p=>p[0]===planet),radius=94+index*24;
    const name=planet==='Ketu'?'Rahu':planet,id=name==='Rahu'?(state.nodes==='true'?lib.LunarPoint.TrueNode:lib.LunarPoint.MeanNode):lib.Planet[name];let path='';
    for(let i=30;i>=0;i--){const stamp=end-i*DAY;if(stamp<MIN)continue;const p=swe.calculatePosition(swe.dateToJulianDay(new Date(stamp)),id,flags),[x,y]=polar(radius,p.longitude+(planet==='Ketu'?180:0));path+=(path?'L':'M')+x.toFixed(2)+' '+y.toFixed(2);}
    return `<path data-trail="${planet}" d="${path}" fill="none" stroke="${SPECS[index][2]}" stroke-width="4" stroke-linecap="round" opacity=".7"/>`;
  }).join('');
}
function draw(){
  if(!engine)return;
  bodies=positions(engine.swe,engine.lib,state.stamp,state.nodes,state.outer);
  $('clock').textContent=new Date(state.stamp).toISOString().slice(0,19).replace('T',' · ')+' UTC';
  $('timeline').value=Math.round((state.stamp-state.start)/(state.end-state.start)*10000);
  $('timeline').setAttribute('aria-valuetext',$('clock').textContent);
  if(state.view==='wheel'){
    if(!markers.size)buildWheel();
    for(const p of bodies){const node=markers.get(p.name),index=SPECS.findIndex(s=>s[0]===p.name),[x,y]=polar(94+index*24,p.longitude),active=state.selected.includes(p.name);node.setAttribute('transform',`translate(${x} ${y})`);node.setAttribute('aria-label',`${active?'Deselect':'Select'} ${p.name}: ${SIGNS[p.rashi]} ${degrees(p.longitude)}, ${p.motion}`);node.setAttribute('aria-pressed',String(active));node.querySelector('.selection-ring').setAttribute('opacity',active?'1':'0');node.querySelector('.retro').textContent=p.motion==='Retrograde'?'R':p.motion==='Stationary'?'S':'';}
    drawTrail();
  }else{
    $('stage').innerHTML=indianChart(bodies,state.view,state.asc,state.selected);
  }
  $('details').innerHTML=state.selected.length?bodies.filter(p=>state.selected.includes(p.name)).map(p=>`<div class="planet-detail"><strong>${p.name}</strong> · ${p.motion}<br>${RASHIS[p.rashi]} / ${SIGNS[p.rashi]} ${degrees(p.longitude)} · ${p.nakshatra.name}, pada ${p.nakshatra.pada}<br>${p.longitude.toFixed(6)}° absolute longitude · ${p.speed.toFixed(4)}° per day</div>`).join(''):'Select one or more planets to compare their positions and show their trails. Click a selected planet again to deselect it.';
  $('positions').innerHTML=bodies.map(p=>`<tr class="${state.selected.includes(p.name)?'selected':''}"><th scope="row">${p.name}</th><td>${RASHIS[p.rashi]} / ${SIGNS[p.rashi]}</td><td>${degrees(p.longitude)}</td><td>${p.nakshatra.name} · ${p.nakshatra.pada}</td><td>${p.speed.toFixed(4)}</td><td>${p.motion}</td></tr>`).join('');
}
function resetView(){markers.clear();trailKey='';draw();picks();}
function move(stamp){pause();state.stamp=Math.max(state.start,Math.min(state.end,stamp));draw();save();}
function frame(now){
  if(!running)return;
  if(!last)last=now;
  if(now-lastDraw>=80){const seconds=Math.min(.25,(now-last)/1000);last=now;lastDraw=now;
    const next=advance(state.stamp,seconds*state.speed*DAY*state.direction,state.start,state.end,state.loop);state.stamp=next.stamp;
    try{draw();}catch(error){fail(error);return;}
    if(now-lastSave>1000){save();lastSave=now;}
    if(next.done){pause('Reached the selected range boundary. Choose another date range or enable looping.');return;}
  }
  raf=requestAnimationFrame(frame);
}
$('play').addEventListener('click',()=>{
  if(running){pause('Animation paused.');return;}if(!engine)return;
  if(state.direction===1&&state.stamp>=state.end)state.stamp=state.start;
  if(state.direction===-1&&state.stamp<=state.start)state.stamp=state.end;
  running=true;last=0;lastDraw=0;$('play').textContent='Pause';$('playing').textContent='Playing';$('status').textContent='Animation playing. Select Pause to stop at any instant.';raf=requestAnimationFrame(frame);
});
$('rangeForm').addEventListener('submit',event=>{
  event.preventDefault();if(!engine)return;
  try{const r=range($('start').value,$('end').value,$('startTime').value,$('endTime').value);pause();state={...state,...r,stamp:r.start};sync();draw();save();$('status').textContent='Start loaded at '+(timeInput(state.start)||'00:00:00')+' UTC. Press Play to animate from here.';}catch(error){$('status').textContent=error.message;}
});
$('restart').addEventListener('click',()=>move(state.start));$('previous').addEventListener('click',()=>move(state.stamp-DAY));$('next').addEventListener('click',()=>move(state.stamp+DAY));
$('today').addEventListener('click',()=>{pause();state.start=today;state.end=Math.min(parseDate('2099-12-31'),today+365*DAY);state.stamp=today;sync();draw();save();$('status').textContent='Today loaded at 00:00 UTC.';});
$('timeline').addEventListener('input',()=>move(state.start+Number($('timeline').value)/10000*(state.end-state.start)));
for(const id of ['speed','direction','asc','view','nodes','loop','outer','trail'])$(id).addEventListener('change',()=>{
  pause();state[id]=['loop','outer','trail'].includes(id)?$(id).checked:['speed','direction','asc'].includes(id)?Number($(id).value):$(id).value;
  if(!state.outer)state.selected=state.selected.filter(name=>!['Uranus','Neptune','Pluto'].includes(name));
  sync();try{resetView();}catch(error){fail(error);}save();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)pause('Animation paused while this tab was hidden.');});
window.addEventListener('pagehide',()=>pause());
$('download').addEventListener('click',()=>{
  if(!engine)return;pause('Positions exported for the displayed instant.');
  const rows=[['UTC instant','Planet','Sign','Longitude degrees','Degrees in sign','Nakshatra','Pada','Speed degrees per day','Motion','Zodiac','Nodes'],...bodies.map(p=>[new Date(state.stamp).toISOString(),p.name,SIGNS[p.rashi],p.longitude.toFixed(8),degrees(p.longitude),p.nakshatra.name,p.nakshatra.pada,p.speed.toFixed(8),p.motion,'Sidereal Lahiri',state.nodes])];
  const csv=rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='still-transits-'+dateInput(state.stamp)+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
});
async function init(){
  $('retry').hidden=true;$('status').textContent='Loading the planetary calculation engine…';
  try{engine=await loadEngine();resetView();$('stage').setAttribute('aria-busy','false');for(const id of ['apply','restart','previous','play','next','timeline','today','download'])$(id).disabled=false;
    $('conventions').textContent='Swiss Ephemeris '+engine.swe.version()+' / Moshier · Lahiri sidereal · UTC dates · Geocentric positions · R = retrograde; S = stationary (absolute speed below 0.005°/day).';
    $('status').textContent=storageFailed?'Ready. Browser storage is unavailable; viewing preferences may not persist.':'Ready. Choose a date range, then press Play. Exact positions are recomputed as time advances.';
  }catch(error){engine=null;$('stage').textContent='The ephemeris could not load.';$('stage').setAttribute('aria-busy','false');$('status').textContent=error.message;$('retry').hidden=false;}
}
$('retry').addEventListener('click',init);init();
