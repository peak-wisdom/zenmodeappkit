// SPDX-License-Identifier: MIT
import{NotePreview}from '../chiptunes/tones.js?v=1';
import{PianoKeyboard,noteName}from './keyboard.js?v=1';
const $=id=>document.getElementById(id),key='still-piano-v1';
const settings={first:48,volume:35,labels:true,sustain:false};
try{const s=JSON.parse(localStorage.getItem(key));if([36,48,60].includes(s?.first))settings.first=s.first;if(Number.isFinite(s?.volume)&&s.volume>=0&&s.volume<=100)settings.volume=s.volume;for(const k of['labels','sustain'])if(typeof s?.[k]==='boolean')settings[k]=s[k];}catch{}
let space=false;
const audio=new NotePreview(()=>{$('stop').disabled=!audio.sounding;},error=>{$('status').textContent=error.message;});
const keyboard=new PianoKeyboard($('piano'),{first:settings.first,onPress:(id,midi)=>{audio.press(id,midi,'piano',settings.volume);$('lastNote').textContent=noteName(midi);$('status').textContent='Playing '+noteName(midi)+'.';},onRelease:id=>audio.release(id),onReset:stop});
function save(){try{localStorage.setItem(key,JSON.stringify(settings));}catch{$('status').textContent='Browser storage is unavailable. Settings apply for this visit.';}}
function stop(){space=false;audio.stop();audio.setPedal(settings.sustain);keyboard.reset();$('status').textContent='All piano notes stopped.';}
function range(){for(const b of document.querySelectorAll('[data-octave]'))b.textContent='C'+(settings.first/12-1+Number(b.dataset.octave));$('rangeLabel').textContent=noteName(settings.first)+'–'+noteName(settings.first+35);$('pianoScroll').scrollLeft=7*44;}
$('range').value=settings.first;$('volume').value=settings.volume;$('volumeValue').textContent=settings.volume+'%';for(const id of['labels','sustain'])$(id).checked=settings[id];keyboard.setLabels(settings.labels);audio.setPedal(settings.sustain);range();
$('range').addEventListener('change',()=>{stop();settings.first=Number($('range').value);keyboard.setRange(settings.first);range();save();});
$('volume').addEventListener('input',()=>{settings.volume=Number($('volume').value);audio.setVolume(settings.volume);$('volumeValue').textContent=settings.volume+'%';save();});
$('labels').addEventListener('change',()=>{settings.labels=$('labels').checked;keyboard.setLabels(settings.labels);save();});
$('sustain').addEventListener('change',()=>{settings.sustain=$('sustain').checked;audio.setPedal(settings.sustain||space);save();});
$('stop').addEventListener('click',stop);for(const b of document.querySelectorAll('[data-octave]'))b.addEventListener('click',()=>{$('pianoScroll').scrollTo({left:Number(b.dataset.octave)*7*44,behavior:'smooth'});});
window.addEventListener('keydown',event=>{if(event.code!=='Space'||event.repeat||event.altKey||event.ctrlKey||event.metaKey||event.target.closest?.('input,select,textarea,button,[contenteditable="true"]'))return;event.preventDefault();space=true;audio.setPedal(true);});
window.addEventListener('keyup',event=>{if(event.code==='Space'&&space){event.preventDefault();space=false;audio.setPedal(settings.sustain);}});
window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
function frame(){keyboard.highlight(audio.activeNotes);requestAnimationFrame(frame);}frame();
