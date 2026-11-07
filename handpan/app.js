// SPDX-License-Identifier: MIT
import {ROOTS,noteName} from '../sound-pad/audio.js?v=3';
import {HandpanAudio} from './audio.js?v=1';
const $=id=>document.getElementById(id),key='still-handpan-v1';
export const SCALES={kurd:{name:'Kurd · natural minor',notes:[0,7,8,10,12,14,15,17,19]},amara:{name:'Amara · Celtic minor',notes:[0,7,10,12,14,15,17,19,22]},hijaz:{name:'Hijaz · Phrygian dominant',notes:[0,7,8,10,12,13,16,17,19]},akebono:{name:'Akebono · Japanese pentatonic',notes:[0,7,8,12,14,15,19,20,24]},pygmy:{name:'Pygmy · minor pentatonic',notes:[0,7,10,12,14,15,19,22,24]},major:{name:'Major pentatonic',notes:[0,7,9,12,14,16,19,21,24]}};
const state={root:2,scale:'kurd',volume:40,sustain:2.8,labels:true},audio=new HandpanAudio(),pointers=new Map(),flashes=new Map();
try{const saved=JSON.parse(localStorage.getItem(key));if(Number.isInteger(saved?.root)&&saved.root>=0&&saved.root<12)state.root=saved.root;if(Object.hasOwn(SCALES,saved?.scale))state.scale=saved.scale;if(Number.isFinite(saved?.volume)&&saved.volume>=0&&saved.volume<=100)state.volume=saved.volume;if([1.4,2.8,4].includes(saved?.sustain))state.sustain=saved.sustain;if(typeof saved?.labels==='boolean')state.labels=saved.labels;}catch{}
function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{$('status').textContent='Browser storage is unavailable. Settings apply for this visit.';}}
function draw(){
  $('drum').replaceChildren();$('drum').classList.toggle('no-labels',!state.labels);
  SCALES[state.scale].notes.forEach((offset,index)=>{
    const button=document.createElement('button'),midi=48+state.root+offset;button.type='button';button.className=index?'tone-field':'ding';button.dataset.note=index;button.setAttribute('aria-label',`Play ${noteName(midi)}${index?'':' center note'}`);
    const angle=(index-1)*Math.PI/4-Math.PI/2;
    if(index){button.style.left=`${50+33*Math.cos(angle)}%`;button.style.top=`${50+33*Math.sin(angle)}%`;button.style.transform=`translate(-50%,-50%) rotate(${(index-1)*45}deg)`;}
    const label=document.createElement('span');label.textContent=noteName(midi);if(index)label.style.transform=`rotate(${-(index-1)*45}deg)`;button.append(label);$('drum').append(button);
  });$('tuning').textContent=`${ROOTS[state.root]}3 ding · ${SCALES[state.scale].name} · 9 notes`;
}
async function strike(index,strength=.7){
  const button=$('drum').querySelector(`[data-note="${index}"]`);if(!button)return;
  clearTimeout(flashes.get(index));button.classList.add('sounding');flashes.set(index,setTimeout(()=>button.classList.remove('sounding'),240));
  const midi=48+state.root+SCALES[state.scale].notes[index];$('lastNote').textContent=noteName(midi);
  try{await audio.strike(midi,state,strength);$('status').textContent=`${noteName(midi)} · tap, roll, or use several fingers to layer notes.`;}catch(error){$('status').textContent=error.message;}
}
function hitAt(event){const button=document.elementFromPoint(event.clientX,event.clientY)?.closest('#drum [data-note]');return button?Number(button.dataset.note):null;}
$('drum').addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();$('drum').setPointerCapture(event.pointerId);const index=hitAt(event);pointers.set(event.pointerId,index);if(index!==null)strike(index,event.pressure>0?Math.min(1,.5+event.pressure):.75);});
$('drum').addEventListener('pointermove',event=>{if(!pointers.has(event.pointerId))return;const samples=event.getCoalescedEvents?.()||[];for(const sample of [...samples,event]){const index=hitAt(sample);if(index!==pointers.get(event.pointerId)){pointers.set(event.pointerId,index);if(index!==null)strike(index);}}});
for(const type of['pointerup','pointercancel','lostpointercapture'])$('drum').addEventListener(type,event=>pointers.delete(event.pointerId));
$('drum').addEventListener('click',event=>{if(event.detail===0){const button=event.target.closest('[data-note]');if(button)strike(Number(button.dataset.note));}});
function stop(){pointers.clear();audio.stop();for(const timer of flashes.values())clearTimeout(timer);flashes.clear();for(const button of $('drum').children)button.classList.remove('sounding');$('status').textContent='All notes stopped.';}
$('stop').addEventListener('click',stop);window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
ROOTS.forEach((name,index)=>{const option=document.createElement('option');option.value=index;option.textContent=name;$('root').append(option);});for(const[id,scale]of Object.entries(SCALES)){const option=document.createElement('option');option.value=id;option.textContent=scale.name;$('scale').append(option);}
for(const id of['root','scale','sustain','volume','labels']){if(id==='labels')$(id).checked=state[id];else $(id).value=state[id];$(id).addEventListener('input',()=>{if(id!=='volume')stop();state[id]=id==='labels'?$(id).checked:id==='scale'?$(id).value:Number($(id).value);audio.volume(state.volume);$('volumeValue').textContent=`${state.volume}%`;save();if(id!=='volume')draw();});}
$('volumeValue').textContent=`${state.volume}%`;draw();
