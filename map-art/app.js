// SPDX-License-Identifier: MIT
import {FORMATS,PALETTES,cleanState,wrapLon,bounds,unworld,dataKey,dimensions} from './core.js';
import {makeClient,validData} from './data.js';
import {renderPoster,escape} from './render.js';
import {readSettings,saveSettings,openDraft} from './storage.js';
import {rasterize,printSVG} from './export.js';
const $=id=>document.getElementById(id);
let state=cleanState(readSettings()),data=null,lastReadyState=null,svg='',client=null,config=null,draftStore=null,picker=null,marker=null,footprint=null,busy=false,exporting=false,loadController=null,job=0,paintTimer=null,searchController=null;
const examples={paris:{lat:48.8566,lon:2.3522,title:'PARIS',subtitle:'FRANCE'},bengaluru:{lat:12.9716,lon:77.5946,title:'BENGALURU',subtitle:'INDIA'},newyork:{lat:40.7128,lon:-74.006,title:'NEW YORK',subtitle:'UNITED STATES'},tokyo:{lat:35.6762,lon:139.6503,title:'TOKYO',subtitle:'JAPAN'}};
const announce=text=>$('artStatus').textContent=text;
const current=()=>data&&data.key===dataKey(state);
function save(){const ok=saveSettings(state);$('saveState').textContent=ok?(draftStore?'Design saved in this browser. Your last generated map is kept here too.':'Design saved in this browser; map detail may reload next visit.'):'Browser saving is unavailable. Download your artwork to keep it.';}
function setDownloads(){for(const id of ['downloadPNG','downloadSVG'])$(id).disabled=busy||exporting||!current();}
function printSize(){const {width,height}=dimensions(state.format,Number($('resolution').value));$('printSize').textContent=width+' × '+height+' pixels · '+(width/300*2.54).toFixed(1)+' × '+(height/300*2.54).toFixed(1)+' cm at 300 DPI.';}
function sync(){
  for(const key of ['title','subtitle','caption','format','layout','font'])if(document.activeElement!==$(key))$(key).value=state[key];
  for(const key of ['water','green','buildings','paths','coordinates','pin'])$(key).checked=state[key];
  $('latitude').value=state.lat;$('longitude').value=state.lon;$('span').value=state.span;$('spanValue').textContent=state.span+' km';$('lineWeight').value=state.lineWeight;$('weightValue').textContent=state.lineWeight.toFixed(1)+'×';
  for(const key of ['paper','ink','water','green'])$(key+'Color').value=state.colors[key];
  for(const button of $('palettes').children)button.setAttribute('aria-pressed',String(button.dataset.palette===state.palette));
  const [w,h]=FORMATS[state.format];$('poster').style.aspectRatio=w+'/'+h;printSize();syncFootprint();
}
function draw(){
  if(current()){lastReadyState=cleanState(state);$('poster').innerHTML=svg=renderPoster(state,data);$('previewCover').hidden=true;$('previewMeta').textContent=state.span+' km wide · '+Math.round(data.features).toLocaleString()+' map features';}
  else{$('previewCover').hidden=false;$('coverText').textContent=busy?'Drawing your place…':'New area selected. Press Update artwork to load its map.';$('previewMeta').textContent='New area selected';}
  $('restoreLast').hidden=!data||(!lastReadyState&&!data.state);
  setDownloads();
}
function changed(area=false){sync();save();clearTimeout(paintTimer);paintTimer=setTimeout(draw,90);if(area&&!current()){announce('Area changed. Update artwork to load this crop.');setDownloads();}}
function syncFootprint(){
  if(!picker||!globalThis.L)return;const b=bounds(state),sw=unworld(b.x0,b.y1),ne=unworld(b.x1,b.y0),box=[[sw.lat,b.x0*360-180],[ne.lat,b.x1*360-180]];
  if(footprint)footprint.setBounds(box);else footprint=L.rectangle(box,{color:'#256b50',weight:2,fillColor:'#3f8a68',fillOpacity:.08,interactive:false}).addTo(picker);
  if(marker)marker.setLatLng([state.lat,state.lon]);else marker=L.circleMarker([state.lat,state.lon],{radius:6,color:'#123b2c',fillColor:'#b4eed5',fillOpacity:1,weight:2}).addTo(picker);
}
function initPicker(){
  if(!globalThis.L){$('picker').hidden=true;$('pickerFallback').hidden=false;$('useCenter').disabled=true;return;}
  try{picker=L.map('picker',{scrollWheelZoom:false,worldCopyJump:true,minZoom:2,maxZoom:18}).setView([state.lat,state.lon],12);L.tileLayer(config.pickerTiles,{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}).addTo(picker);picker.on('click',event=>{state.lat=Math.max(-85,Math.min(85,event.latlng.lat));state.lon=wrapLon(event.latlng.lng);changed(true);});syncFootprint();}catch{$('pickerFallback').hidden=false;$('useCenter').disabled=true;}
}
async function ensureClient(){if(client)return;const response=await fetch('providers.json');if(!response.ok)throw Error('Map services could not be configured. Refresh the page to retry.');config=await response.json();client=makeClient(config);}
async function generate(showPreview=false){
  const id=++job;loadController?.abort();loadController=new AbortController();const controller=loadController,snapshot=cleanState(state);
  busy=true;$('generate').disabled=true;$('cancel').hidden=false;$('previewCover').hidden=!!current();$('coverText').textContent='Drawing your place…';setDownloads();announce('Loading real map detail…');
  let timedOut=false;const timeout=setTimeout(()=>{timedOut=true;controller.abort();},45000);
  try{
    await ensureClient();const result=await client.load(snapshot,controller.signal,(done,total)=>{if(id===job)announce('Drawing map detail · '+done+' of '+total+' tiles');});
    if(id!==job)return;data=result;lastReadyState=null;draw();if(draftStore)draftStore.write({data}).catch(()=>{draftStore=null;$('saveState').textContent='Design saved; map storage is full. Download your artwork to keep it.';});
    announce(current()?'Your print is ready. Colors and text update instantly.':'The previous crop finished loading. Update artwork for your new selection.');
    if(showPreview&&current()&&window.matchMedia?.('(max-width:760px)')?.matches)$('previewHeading').scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
  }catch(error){if(id!==job)return;controller.abort();announce(timedOut?'The map service took too long. Your previous print is kept; try Update artwork again.':error.name==='AbortError'?'Loading canceled. Your previous print is kept.':error.message+' Your previous print is kept.');}
  finally{clearTimeout(timeout);if(id===job){busy=false;$('generate').disabled=false;$('cancel').hidden=true;draw();save();}}
}
function choosePlace(place){state={...state,...place,lon:wrapLon(place.lon)};sync();if(picker)picker.setView([state.lat,state.lon],12);save();generate(true);}
$('palettes').innerHTML=Object.entries(PALETTES).map(([key,p])=>'<button type="button" class="palette" data-palette="'+key+'" aria-pressed="false"><span class="palette-swatches" aria-hidden="true">'+['paper','ink','water','green'].map(c=>'<i style="background:'+p[c]+'"></i>').join('')+'</span>'+p.name+'</button>').join('');
$('palettes').addEventListener('click',event=>{const button=event.target.closest('[data-palette]');if(!button)return;state.palette=button.dataset.palette;state.colors={...PALETTES[state.palette]};changed();});
for(const key of ['paper','ink','water','green'])$(key+'Color').addEventListener('input',()=>{state.colors[key]=$(key+'Color').value;changed();});
for(const key of ['title','subtitle','caption'])$(key).addEventListener('input',()=>{state[key]=$(key).value;changed();});
for(const key of ['format','layout','font'])$(key).addEventListener('change',()=>{state[key]=$(key).value;changed(key!=='font');});
for(const key of ['water','green','buildings','paths','coordinates','pin'])$(key).addEventListener('change',()=>{state[key]=$(key).checked;changed(key==='buildings'||key==='paths');});
for(const key of ['span','lineWeight'])$(key).addEventListener('input',()=>{state[key]=Number($(key).value);changed(key==='span');});
$('generate').addEventListener('click',()=>generate(true));$('cancel').addEventListener('click',()=>loadController?.abort());$('resolution').addEventListener('change',printSize);
$('restoreLast').addEventListener('click',()=>{if(!data||(!lastReadyState&&!data.state))return;job++;loadController?.abort();busy=false;$('generate').disabled=false;$('cancel').hidden=true;state=cleanState(lastReadyState||data.state);sync();if(picker)picker.setView([state.lat,state.lon],12);draw();save();announce('Last map restored. Your artwork is ready to download.');});
document.querySelector('.places').addEventListener('click',event=>{const button=event.target.closest('[data-place]');if(button)choosePlace(examples[button.dataset.place]);});
$('useCenter').addEventListener('click',()=>{if(!picker)return;const center=picker.getCenter();state.lat=Math.max(-85,Math.min(85,center.lat));state.lon=wrapLon(center.lng);changed(true);generate(true);});
$('coordinateForm').addEventListener('submit',event=>{event.preventDefault();const lat=Number($('latitude').value),lon=Number($('longitude').value);if(!$('latitude').value.trim()||!$('longitude').value.trim()||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>85||Math.abs(lon)>180){announce('Enter latitude from −85 to 85 and longitude from −180 to 180.');return;}choosePlace({lat,lon});});
$('searchForm').addEventListener('submit',async event=>{
  event.preventDefault();searchController?.abort();searchController=new AbortController();$('searchButton').disabled=true;$('searchStatus').textContent='Searching places…';$('searchResults').replaceChildren();
  const timeout=setTimeout(()=>searchController.abort(),15000);
  try{await ensureClient();const places=await client.search($('query').value,searchController.signal);$('searchResults').replaceChildren(...places.map(place=>{const button=document.createElement('button');button.type='button';button.innerHTML=escape(place.title)+'<span>'+escape(place.subtitle)+'</span>';button.addEventListener('click',()=>{choosePlace({...place,title:place.title.toLocaleUpperCase(),subtitle:place.subtitle.toLocaleUpperCase()});$('searchResults').replaceChildren();$('searchStatus').textContent='Location selected. Edit its title below if you like.';});return button;}));$('searchStatus').textContent=places.length?'Choose a result.':'No places found. Try a city and country, use the map, or enter coordinates.';}
  catch(error){$('searchStatus').textContent=error.name==='AbortError'?'Search canceled or timed out. Try again, use the map, or enter coordinates.':error.message;}
  finally{clearTimeout(timeout);$('searchButton').disabled=false;}
});
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
const filename=()=>((state.title||'my-place').trim().replace(/[^a-z0-9_-]+/gi,'-').slice(0,60)||'my-place')+'-map-art';
$('downloadSVG').addEventListener('click',()=>{if(!current()||busy||exporting)return;const source=renderPoster(state,data);download(new Blob([printSVG(source,state.format)],{type:'image/svg+xml;charset=utf-8'}),filename()+'.svg');announce('Vector artwork downloaded. It scales cleanly for large prints.');});
$('downloadPNG').addEventListener('click',async()=>{
  if(!current()||busy||exporting)return;exporting=true;setDownloads();const snapshot=cleanState(state),name=filename(),longEdge=Number($('resolution').value);announce('Preparing your high-resolution print…');
  try{const blob=await rasterize(renderPoster(snapshot,data),snapshot.format,longEdge);download(blob,name+'.png');announce('PNG downloaded at '+longEdge+' pixels on the longest edge, with 300 DPI metadata.');}catch(error){announce(error.message||'This device could not create a PNG at this size. Try a smaller size or SVG.');}finally{exporting=false;setDownloads();}
});
window.addEventListener('pagehide',()=>{save();loadController?.abort();searchController?.abort();});
sync();
(async()=>{
  try{draftStore=await openDraft();const record=await draftStore.read();if(validData(record?.data)){data=record.data;draw();if(current())announce('Your saved print is ready.');}}catch{data=null;draftStore=null;}
  save();try{await ensureClient();initPicker();if(!current())await generate();}catch(error){$('picker').hidden=true;$('pickerFallback').hidden=false;announce(error.message+' Your last saved print remains available.');}
})();
