// SPDX-License-Identifier: MIT
import {BODIES,DAY,MIN,MAX,clamp,norm,parseUTC,cleanObserver,restore,calculate,nextEvents,motionTrail,skyLight,csv} from './core.js';
import {renderScene,phaseSVG,escape} from './view.js';

const $=id=>document.getElementById(id),KEY='still-live-sky-v1';
let state=restore(null),rows=[],playing=false,lastTick=performance.now(),timer=null,storageFailed=false;
let trailKey='',trail=[],eventKey='',eventData=null,pointer=null,suppressClick=0,locating=false,editingTime=false;
const announce=message=>$('status').textContent=message;
try{state=restore(JSON.parse(localStorage.getItem(KEY)));}catch{storageFailed=true;}
function save(){
  try{localStorage.setItem(KEY,JSON.stringify(state));storageFailed=false;}catch{storageFailed=true;}
  $('saveState').textContent=storageFailed?'Browser storage is unavailable. Downloads still work; preferences may not survive refresh.':'View, location, and preferences saved in this browser. Live mode returns to the current time; explored dates return paused.';
}
const angle=value=>(value>=0?'+':'−')+Math.abs(value).toFixed(2)+'°';
const ra=value=>{
  const seconds=Math.round(value*3600)%86400,h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;
  return String(h).padStart(2,'0')+'h '+String(m).padStart(2,'0')+'m '+String(s).padStart(2,'0')+'s';
};
const direction=az=>['N','NE','E','SE','S','SW','W','NW'][Math.round(az/45)%8];
const distance=p=>p.distance<.01?Math.round(p.km).toLocaleString()+' km':p.distance.toFixed(4)+' AU';
const lightTime=seconds=>seconds<60?seconds.toFixed(2)+' seconds':seconds<3600?(seconds/60).toFixed(2)+' minutes':(seconds/3600).toFixed(2)+' hours';
const utc=stamp=>new Date(stamp).toISOString().slice(0,19).replace('T',' · ')+' UTC';
const eventTime=stamp=>stamp===null?'None in next 48 hours':new Date(stamp).toISOString().slice(0,16).replace('T',' · ')+' UTC';
const pair=(label,value)=>'<dt>'+escape(label)+'</dt><dd>'+escape(value)+'</dd>';
function sync(){
  for(const key of ['scale','speed'])$(key).value=state[key];
  for(const key of ['labels','trail','refraction'])$(key).checked=state[key];
  for(const key of ['yaw','tilt']){$(key).value=state[key];$(key+'Value').textContent=Math.round(state[key])+'°';}
  $('zoom').value=state.zoom*100;$('zoomValue').textContent=Math.round(state.zoom*100)+'%';
  $('spaceView').setAttribute('aria-pressed',String(state.view==='space'));$('skyView').setAttribute('aria-pressed',String(state.view==='sky'));
  $('spaceControls').hidden=state.view!=='space';$('trail').disabled=state.view!=='space';$('viewport').dataset.view=state.view;
  $('live').setAttribute('aria-pressed',String(state.mode==='live'));$('play').textContent=playing?'Pause time-lapse ❚❚':'Play time-lapse ▶';
  const mode=state.mode==='live'?'LIVE NOW':playing?'TIME-LAPSE':'EXPLORING · PAUSED';$('modeBadge').textContent=mode;$('modeBadge').dataset.mode=state.mode;
}
function syncLocation(){
  const observer=state.observer;
  $('latitude').value=observer?.lat??'';$('longitude').value=observer?.lon??'';$('elevation').value=observer?.height??0;$('city').value='';
  $('clearLocation').disabled=!observer;
  $('locationSummary').textContent=observer?(observer.label?observer.label+' · ':'')+observer.lat.toFixed(4)+'° latitude, '+observer.lon.toFixed(4)+'° east longitude · '+Math.round(observer.height)+' m elevation':'Add a location to see altitude, compass direction, and the next rise and set.';
}
function drawMap(){
  if(!rows.length)return;
  const focused=$('viewport').contains(document.activeElement)?document.activeElement?.dataset.body:null;
  const key=state.selected+'/'+Math.floor(state.stamp/DAY);
  if(state.view==='space'&&state.trail&&key!==trailKey){trail=motionTrail(state.selected,state.stamp);trailKey=key;}
  const path=state.trail?[...trail,rows.find(p=>p.name===state.selected).vector]:[];
  $('viewport').innerHTML=renderScene(rows,state,path,utc(state.stamp));
  if(focused)$('viewport').querySelector('[data-body="'+focused+'"][tabindex]')?.focus({preventScroll:true});
  $('mapNote').textContent=state.view==='space'?(state.scale==='compressed'?'Actual 3D directions, with logarithmically compressed distances.':'Distance ratios are true; nearby bodies can overlap Earth. Select any body below to inspect it.')+' Drag to rotate, or use the controls. Planet sizes are enlarged; rings are distance guides, not orbits.':state.observer?'Looking up: north at the top, east at the left. Only bodies above your horizon are shown; being above the horizon does not guarantee visibility.':'Choose “Use my location”, a city, or enter coordinates below to build your local sky.';
}
function drawDetails(){
  const p=rows.find(row=>row.name===state.selected);if(!p)return;
  $('detailName').textContent=p.name;$('detailKind').textContent=p.kind;
  $('phase').innerHTML=p.name==='Sun'?'':phaseSVG(p.illuminated);
  $('detailContext').textContent=p.constellation+' · '+(p.name==='Sun'?'our nearest star':(p.illuminated*100).toFixed(1)+'% illuminated, as seen from Earth');
  $('detailValues').innerHTML=pair('Distance from Earth',distance(p))+pair('Distance · km',Math.round(p.km).toLocaleString())+pair('Light travel time',lightTime(p.lightSeconds))+pair('Right ascension',ra(p.ra))+pair('Declination',angle(p.dec))+pair('Ecliptic longitude',p.longitude.toFixed(3)+'°')+pair('Ecliptic latitude',angle(p.latitude))+pair('Sun separation',p.elongation.toFixed(2)+'°')+pair('Visual magnitude',p.magnitude.toFixed(2));
  if(!state.observer){$('visibility').textContent='Add your location for altitude, direction, and rise/set times.';$('riseSet').replaceChildren();$('visibilityNote').textContent='';return;}
  const sun=rows.find(row=>row.name==='Sun'),conditions=skyLight(sun.altitude);
  $('visibility').textContent=(p.altitude>=0?'Above horizon':'Below horizon')+' · altitude '+angle(p.altitude)+' · '+direction(p.azimuth)+' '+p.azimuth.toFixed(1)+'°. '+conditions+'.';
  if(playing){$('riseSet').replaceChildren();$('visibilityNote').textContent='Pause time-lapse to calculate the next rise and set.';return;}
  const key=[state.selected,Math.floor(state.stamp/60000),state.observer.lat,state.observer.lon,state.observer.height].join('/');
  if(key!==eventKey){eventData=nextEvents(state.selected,state.stamp,state.observer);eventKey=key;}
  // A cached event can fall behind the live clock within the same minute.
  if(eventData&&[eventData.rise,eventData.set].some(t=>t!==null&&t<state.stamp)){eventData=nextEvents(state.selected,state.stamp,state.observer);}
  $('riseSet').innerHTML=pair('Next rise',eventTime(eventData?.rise??null))+pair('Next set',eventTime(eventData?.set??null));
  $('visibilityNote').textContent='Rise/set: next 48 hours, level horizon, standard refraction. Magnitude is an estimate; lower values mean brighter bodies.';
}
function draw(){
  rows=calculate(state.stamp,state.observer,state.refraction);
  $('clock').textContent=utc(state.stamp);$('clock').dateTime=new Date(state.stamp).toISOString();
  $('localClock').textContent='Your device time zone · '+new Date(state.stamp).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'medium'});
  if(!editingTime)$('instant').value=new Date(state.stamp).toISOString().slice(0,19);
  $('back').disabled=state.stamp<=MIN;$('forward').disabled=state.stamp>=MAX;
  for(const p of rows){const button=$('bodyPicks').querySelector('[data-body="'+p.name+'"]');button.setAttribute('aria-pressed',String(p.name===state.selected));button.querySelector('.pick-distance').textContent=distance(p);}
  const tableFocus=$('positions').contains(document.activeElement)?document.activeElement?.dataset.body:null;
  $('positions').innerHTML=rows.map(p=>'<tr data-selected="'+(p.name===state.selected)+'"><th scope="row"><button type="button" data-body="'+p.name+'" aria-label="Inspect '+p.name+'">'+p.name+'</button></th><td>'+p.distance.toFixed(6)+'</td><td>'+ra(p.ra)+'</td><td>'+angle(p.dec)+'</td><td>'+p.constellation+'</td><td>'+(p.altitude===null?'Add location':angle(p.altitude))+'</td><td>'+(p.azimuth===null?'—':p.azimuth.toFixed(1)+'° '+direction(p.azimuth))+'</td></tr>').join('');
  if(tableFocus)$('positions').querySelector('[data-body="'+tableFocus+'"]')?.focus({preventScroll:true});
  $('skyConditions').textContent=state.observer?skyLight(rows.find(p=>p.name==='Sun').altitude):'Add a location for your sky';
  drawMap();drawDetails();sync();
}
function selectBody(name){
  if(!BODIES.some(p=>p.name===name))return;
  state.selected=name;eventKey='';draw();save();announce(name+' selected. Details and exports use the displayed instant.');
}
function pause(){playing=false;state.mode='paused';sync();}
function move(stamp){editingTime=false;pause();state.stamp=clamp(stamp,MIN,MAX);eventKey='';draw();save();announce('Exploring '+utc(state.stamp)+'. Choose Live now to return to the present.');}
function updateTime(){
  const now=performance.now(),elapsed=(now-lastTick)/1000;lastTick=now;
  if(document.hidden||pointer)return;
  try{
    if(state.mode==='live'){state.stamp=clamp(Date.now(),MIN,MAX);draw();}
    else if(playing){const stamp=state.stamp+elapsed*state.speed;state.stamp=clamp(stamp,MIN,MAX);if(stamp<MIN||stamp>MAX){pause();announce('Reached the supported date boundary.');}draw();save();}
  }catch(error){pause();announce('The sky could not be updated: '+error.message);}
}
$('bodyPicks').innerHTML=BODIES.map(p=>'<button type="button" data-body="'+p.name+'" aria-pressed="false" style="--planet-color:'+p.color+'"><span class="planet-dot" aria-hidden="true"></span><strong>'+p.name+'</strong><span class="pick-distance">Calculating…</span></button>').join('');
for(const id of ['bodyPicks','positions'])$(id).addEventListener('click',event=>{const node=event.target.closest('[data-body]');if(node)selectBody(node.dataset.body);});
$('instant').addEventListener('input',()=>{editingTime=true;});
$('timeForm').addEventListener('submit',event=>{event.preventDefault();try{move(parseUTC($('instant').value));}catch(error){announce(error.message);}});
$('live').addEventListener('click',()=>{editingTime=false;playing=false;state.mode='live';state.stamp=clamp(Date.now(),MIN,MAX);lastTick=performance.now();draw();save();announce('Live now. Positions follow your device clock.');});
$('back').addEventListener('click',()=>move(state.stamp-DAY));$('forward').addEventListener('click',()=>move(state.stamp+DAY));
$('play').addEventListener('click',()=>{if(playing){pause();draw();save();announce('Time-lapse paused.');return;}state.mode='paused';playing=true;lastTick=performance.now();sync();save();announce('Time-lapse running. Pause to inspect rise/set times.');});
$('speed').addEventListener('change',()=>{state.speed=Number($('speed').value);lastTick=performance.now();save();});
for(const [id,view] of [['spaceView','space'],['skyView','sky']])$(id).addEventListener('click',()=>{state.view=view;sync();drawMap();save();announce(view==='space'?'Earth-centered space view.':state.observer?'Local sky loaded.':'Add your location below to see your local sky.');});
for(const key of ['labels','trail','refraction'])$(key).addEventListener('change',()=>{state[key]=$(key).checked;draw();save();});
$('scale').addEventListener('change',()=>{state.scale=$('scale').value;drawMap();save();});
for(const key of ['yaw','tilt','zoom'])$(key).addEventListener('input',()=>{state[key]=Number($(key).value)/(key==='zoom'?100:1);sync();drawMap();save();});
$('resetView').addEventListener('click',()=>{state.yaw=25;state.tilt=52;state.zoom=1;sync();drawMap();save();announce('Map orientation and zoom reset.');});
const viewport=$('viewport');
viewport.addEventListener('pointerdown',event=>{
  if(state.view!=='space'||event.button!==0||pointer)return;
  pointer={id:event.pointerId,x:event.clientX,y:event.clientY,yaw:state.yaw,tilt:state.tilt,moved:false,body:event.target.closest('[data-body]')?.dataset.body};
  viewport.setPointerCapture(event.pointerId);viewport.dataset.dragging='true';
});
viewport.addEventListener('pointermove',event=>{
  if(!pointer||event.pointerId!==pointer.id)return;
  const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;
  if(Math.hypot(dx,dy)>5)pointer.moved=true;
  if(pointer.moved){state.yaw=norm(pointer.yaw+dx*.35+180)-180;state.tilt=clamp(pointer.tilt+dy*.2,0,90);sync();drawMap();}
});
function finishPointer(event,canceled=false){
  if(!pointer||event.pointerId!==pointer.id)return;
  const old=pointer;pointer=null;viewport.dataset.dragging='false';suppressClick=performance.now()+400;
  if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
  if(!canceled&&!old.moved&&old.body)selectBody(old.body);else if(old.moved)save();
}
viewport.addEventListener('pointerup',event=>finishPointer(event));viewport.addEventListener('pointercancel',event=>finishPointer(event,true));
viewport.addEventListener('lostpointercapture',event=>{if(!viewport.hasPointerCapture(event.pointerId))finishPointer(event,true);});
viewport.addEventListener('click',event=>{if(performance.now()<suppressClick)return;const node=event.target.closest('[data-body]');if(node)selectBody(node.dataset.body);});
viewport.addEventListener('keydown',event=>{
  const body=event.target.closest('[data-body]');
  if(body&&(event.key==='Enter'||event.key===' ')){event.preventDefault();selectBody(body.dataset.body);return;}
  if(state.view!=='space')return;let handled=true;
  if(event.key==='ArrowLeft')state.yaw=norm(state.yaw-5+180)-180;else if(event.key==='ArrowRight')state.yaw=norm(state.yaw+5+180)-180;
  else if(event.key==='ArrowUp')state.tilt=clamp(state.tilt-5,0,90);else if(event.key==='ArrowDown')state.tilt=clamp(state.tilt+5,0,90);
  else if(event.key==='+'||event.key==='=')state.zoom=clamp(state.zoom+.1,.6,2.5);else if(event.key==='-')state.zoom=clamp(state.zoom-.1,.6,2.5);else handled=false;
  if(handled){event.preventDefault();sync();drawMap();save();}
});
function applyLocation(value){const observer=cleanObserver(value);if(!observer)throw Error('Enter latitude −90 to 90, longitude −180 to 180, and elevation 0 to 10,000 m.');state.observer=observer;eventKey='';syncLocation();draw();save();announce('Location saved in this browser. Your local sky is ready.');}
$('city').addEventListener('change',()=>{if(!$('city').value)return;const [lat,lon]=$('city').value.split(',').map(Number);applyLocation({lat,lon,height:0,label:$('city').selectedOptions[0].textContent});});
$('locationForm').addEventListener('submit',event=>{
  event.preventDefault();try{if(['latitude','longitude','elevation'].some(id=>$(id).value.trim()===''))throw Error('Enter latitude, longitude, and elevation.');applyLocation({lat:Number($('latitude').value),lon:Number($('longitude').value),height:Number($('elevation').value),label:''});}catch(error){announce(error.message);}
});
$('clearLocation').addEventListener('click',()=>{state.observer=null;eventKey='';syncLocation();draw();save();announce('Saved location cleared.');});
$('locate').addEventListener('click',()=>{
  if(locating)return;if(!navigator.geolocation){announce('Location access is unavailable here. Choose a city or enter coordinates.');return;}
  locating=true;$('locate').disabled=true;announce('Waiting for your browser location permission…');
  navigator.geolocation.getCurrentPosition(position=>{locating=false;$('locate').disabled=false;applyLocation({lat:position.coords.latitude,lon:position.coords.longitude,height:clamp(Number.isFinite(position.coords.altitude)?position.coords.altitude:0,0,10000),label:'My location'});},()=>{locating=false;$('locate').disabled=false;announce('Location was unavailable or permission was declined. Choose a city or enter coordinates instead.');},{enableHighAccuracy:false,timeout:15000,maximumAge:300000});
});
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
$('downloadCSV').addEventListener('click',()=>{if(!rows.length)return;download(new Blob(['\ufeff'+csv(rows,state.stamp,state.observer,state.refraction)],{type:'text/csv;charset=utf-8'}),'still-sky-'+new Date(state.stamp).toISOString().slice(0,10)+'.csv');announce('Positions CSV downloaded for the displayed instant.');});
$('downloadPNG').addEventListener('click',async()=>{
  if(!rows.length)return;const stamp=state.stamp,svg=viewport.querySelector('svg')?.outerHTML;if(!svg)return;
  $('downloadPNG').disabled=true;const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
  try{
    const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=2000;canvas.height=1520;canvas.getContext('2d').drawImage(image,0,0,2000,1520);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Image could not be created.');download(blob,'still-sky-'+new Date(stamp).toISOString().slice(0,10)+'.png');announce('Map downloaded as a 2000 × 1520 PNG for '+utc(stamp)+'.');
  }catch{download(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),'still-sky.svg');announce('PNG is unavailable in this browser. Downloaded a high-quality SVG instead.');}
  finally{URL.revokeObjectURL(url);$('downloadPNG').disabled=false;}
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){if(pointer)finishPointer({pointerId:pointer.id},true);if(playing){pause();save();announce('Time-lapse paused while this page was hidden.');}}
  else{lastTick=performance.now();if(state.mode==='live')updateTime();}
});
window.addEventListener('pagehide',()=>{if(playing)pause();save();clearInterval(timer);});
window.addEventListener('pageshow',event=>{if(event.persisted){lastTick=performance.now();clearInterval(timer);timer=setInterval(updateTime,1000);updateTime();}});
try{syncLocation();sync();draw();save();announce(state.mode==='live'?'Live sky ready. Select a body, drag the map, or add a location for your local sky.':'Saved view restored. Your explored date is paused; choose Live now for current positions.');timer=setInterval(updateTime,1000);}catch(error){announce('The sky could not be loaded: '+error.message);}
