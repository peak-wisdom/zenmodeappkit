// SPDX-License-Identifier: MIT
import {TONICS,SCALES,QUALITIES,INSTRUMENTS,STYLES,PRESETS,defaults,cleanProject,validProject,diatonic,scaleNotes,noteName,chordRoot,chordName,chordTones,roman,voice,voicedProgression,arrangement,preset,transpose,displayKey,mod} from './music.js';
import {Player,renderAudio} from './audio.js';
import {wav,midi,download} from './exports.js';
import {wheelSVG,chordPoint} from './wheel.js';
import {withDpi} from '../postcards/export.js';
const $=id=>document.getElementById(id),KEY='still-chord-circles-v1',reduced=matchMedia('(prefers-reduced-motion: reduce)');
let state=defaults(),library=[],title='',chosenSong='',deletedSong=null,storageOK=true,editing=-1,undo=[],redo=[],lastEdit=null,paintTimer=null,exporting=false,frameID=null,activeIndex=null,lastBeat=-1,drag=null;
if(reduced.matches)state.animations=false;
try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved?.project)state=cleanProject(saved.project);title=typeof saved?.title==='string'?saved.title.slice(0,60):'';if(Array.isArray(saved?.library))library=saved.library.filter(x=>typeof x?.id==='string'&&typeof x.name==='string'&&x.name.length<=60&&validProject(x.project)).slice(0,24).map(x=>({id:x.id.slice(0,80),name:x.name,project:cleanProject(x.project)}));}catch{storageOK=false;}
const player=new Player(()=>{activeIndex=null;render();if(player.running)animate();});
const status=text=>$('status').textContent=text;
function save(){
  try{localStorage.setItem(KEY,JSON.stringify({project:state,library,title}));storageOK=true;$('saveStatus').textContent='Draft and '+library.length+' saved progression'+(library.length===1?'':'s')+' kept in this browser.';}
  catch{storageOK=false;$('saveStatus').textContent='Browser storage is unavailable or full. Download an editable song to keep your work.';}
}
function commit(next,key=null,live=false){
  if(!live)player.pause();const now=performance.now(),merge=key&&lastEdit?.key===key&&now-lastEdit.time<700;
  if(!merge){undo.push(state);if(undo.length>30)undo.shift();}redo=[];state=cleanProject(next);lastEdit=key?{key,time:now}:null;
  save();if(key){clearTimeout(paintTimer);paintTimer=setTimeout(render,70);}else render();
}
function reconfigure(next,key=null){const was=player.running,cursor=player.position();commit(next,key);if(was)player.start(state,cursor).catch(error=>status(error.message));}
function populate(id,options){$(id).replaceChildren(...options.map(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;}));}
populate('key',Object.keys(TONICS).map(k=>[k,displayKey(k)]));populate('scale',Object.entries(SCALES).map(([k,v])=>[k,v.name]));populate('quality',Object.entries(QUALITIES).map(([k,v])=>[k,v.name]));populate('instrument',Object.entries(INSTRUMENTS));populate('style',Object.entries(STYLES));populate('preset',Object.entries(PRESETS).map(([k,v])=>[k,v.name]));
function soundSettings(){
  for(const key of ['key','scale','naming','direction','instrument','style','bpm','octave','voicing','subdivision','volume','swing','reverb','repeats'])if(document.activeElement!==$(key))$(key).value=state[key];
  $('wheelMode').value=state.wheel;
  for(const key of ['transposeKey','tapSound','bass','leading','metronome','animations','connections','sevenths','loop','exportClick'])$(key).checked=state[key];
  $('root').value=state.selected.root;$('quality').value=state.selected.quality;$('beats').value=state.selected.beats;
  populate('inversion',QUALITIES[state.selected.quality].intervals.map((_,i)=>[i,['Root position','1st inversion','2nd inversion','3rd inversion','4th inversion'][i]]));$('inversion').value=state.selected.inversion;
  $('volumeValue').textContent=state.volume+'%';$('reverbValue').textContent=state.reverb+'%';$('swingValue').textContent=state.swing+'%'+(state.swing===50?' · straight':'');
  $('scaleNotes').textContent=scaleNotes(state).map(n=>n.name).join(' · ');
  $('chordNotes').textContent=chordTones(state.selected,state).map(n=>n.name).join(' · ');
  $('chordFunction').textContent=roman(state.selected,state);$('chordEditorHeading').textContent=editing>=0?'Edit chord '+(editing+1):'Your chord';
  $('addChord').textContent=editing>=0?'Update chord':'Add to progression';$('addChord').disabled=editing<0&&state.steps.length>=32;$('cancelEdit').hidden=editing<0;
  $('wheelHeading').textContent='Circle of '+(state.direction==='fifths'?'fifths':'fourths');
  $('wheelStage').classList.toggle('is-playing',player.running);$('wheelStage').classList.toggle('animate',state.animations&&!reduced.matches);
  $('undo').disabled=!undo.length;$('redo').disabled=!redo.length;$('play').disabled=!state.steps.length;$('clearProgression').disabled=!state.steps.length;
  $('play').textContent=player.running?'Pause progression':player.cursor.beat>0||player.cursor.index>0?'Resume progression':'Play progression';
  $('progressionSummary').textContent=state.steps.length+' chord'+(state.steps.length===1?'':'s')+' · '+arrangement(state).beats+' beats · '+(arrangement(state).seconds).toFixed(1)+' seconds at '+state.bpm+' BPM';
  for(const id of ['downloadWAV','downloadMIDI'])$(id).disabled=exporting||!state.steps.length;
  for(const id of ['downloadPNG','downloadSVG','downloadProject','share','importProject'])$(id).disabled=exporting;
}
function drawKeyboard(notes){
  const first=Math.floor(Math.min(...notes)/12)*12,last=Math.max(first+35,Math.ceil((Math.max(...notes)+1)/12)*12-1),active=new Set(notes),current=activeIndex===null?state.selected:state.steps[activeIndex],root=current.root,names=new Map(chordTones(current,state).map(t=>[t.pc,t.name])),name=midi=>active.has(midi)?names.get(mod(midi))??noteName(midi,state):noteName(midi,state);
  $('toneNames').textContent=notes.map(n=>name(n)+(Math.floor(n/12)-1)).join(' · ');$('keyboard').replaceChildren();let white=0;
  for(let midi=first;midi<=last;midi++){
    const black=[1,3,6,8,10].includes(mod(midi)),button=document.createElement('button');button.type='button';button.className='piano-key '+(black?'black':'white')+(active.has(midi)?' tone':'')+(active.has(midi)&&mod(midi)===root?' root':'');
    button.style.left=(black?white*32-10:white*32)+'px';if(!black)white++;button.setAttribute('aria-label','Play '+name(midi)+(Math.floor(midi/12)-1));button.dataset.midi=midi;
    const label=document.createElement('span');label.textContent=name(midi);button.append(label);button.addEventListener('click',()=>player.single(state,midi).catch(error=>status(error.message)));$('keyboard').append(button);
  }$('keyboard').style.width=white*32+'px';
}
function drawWheel(){
  const position=player.running?player.position():null,index=position?.index??null,chord=index===null?state.selected:state.steps[index],notes=position?.notes??voice(chord,state);activeIndex=index;
  $('wheel').innerHTML=wheelSVG(state,index,notes);drawKeyboard(notes);
  $('nowPlaying').textContent=(index===null?'Selected: ':'Playing: ')+chordName(chord,state,notes);
  for(const button of $('wheel').querySelectorAll('[data-root]')){
    const choose=()=>selectChord({root:Number(button.dataset.root),quality:button.dataset.quality,spelling:button.dataset.spelling,inversion:0,beats:state.beats});
    button.addEventListener('click',choose);button.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();if(event.repeat)return;const root=button.dataset.root,quality=button.dataset.quality;choose();$('wheel').querySelector('[data-root="'+root+'"][data-quality="'+quality+'"]')?.focus?.();}});
  }
}
function drawDiatonic(){
  $('diatonic').replaceChildren(...diatonic(state,state.sevenths).map(chord=>{
    const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',chordName(chord,state)+', '+roman(chord,state));button.setAttribute('aria-pressed',String(chord.root===state.selected.root&&chord.quality===state.selected.quality));
    const name=document.createElement('strong'),number=document.createElement('span'),tones=document.createElement('span');name.textContent=chordName(chord,state);number.textContent=roman(chord,state);tones.textContent=chordTones(chord,state).map(n=>n.name).join(' ');button.append(number,name,tones);button.addEventListener('click',()=>selectChord({...chord,beats:state.beats}));return button;
  }));
}
function smallButton(text,label,action,disabled=false){const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',label);b.disabled=disabled;b.addEventListener('click',action);return b;}
function drawSteps(){
  $('steps').replaceChildren();if(!state.steps.length){const p=document.createElement('p');p.className='empty-song';p.textContent='Your next idea starts with one chord. Choose a chord above and add it here.';$('steps').append(p);return;}
  const notes=voicedProgression(state);
  state.steps.forEach((chord,index)=>{
    const card=document.createElement('article');card.className='step'+(editing===index?' is-editing':'')+(player.running&&activeIndex===index?' is-active':'');card.dataset.step=index;card.setAttribute('aria-label','Chord '+(index+1)+': '+chordName(chord,state));
    const top=document.createElement('div');top.className='step-top';const count=document.createElement('span');count.className='step-number';count.textContent='CHORD '+(index+1);const grip=smallButton('⠿','Drag chord '+(index+1)+' to reorder',()=>{});grip.className='grip';grip.title='Drag to move this chord';grip.addEventListener('pointerdown',event=>startDrag(event,index));top.append(count,grip);
    const hear=document.createElement('button');hear.type='button';hear.className='step-sound';hear.setAttribute('aria-label','Hear chord '+(index+1)+': '+chordName(chord,state));const name=document.createElement('strong'),functionLabel=document.createElement('span');name.textContent=chordName(chord,state,notes[index]);functionLabel.textContent=roman(chord,state);hear.append(name,functionLabel);hear.addEventListener('click',()=>{editing=-1;commit({...state,selected:{...chord}});audition();});
    const label=document.createElement('label');label.className='step-duration';label.append('Length');const duration=document.createElement('select');duration.setAttribute('aria-label','Beats for chord '+(index+1));for(const beats of [.5,1,2,3,4,6,8,12,16]){const o=document.createElement('option');o.value=beats;o.textContent=(beats===.5?'½':beats)+' beat'+(beats===1?'':'s');o.selected=chord.beats===beats;duration.append(o);}duration.addEventListener('change',()=>{const steps=state.steps.map((c,i)=>i===index?{...c,beats:Number(duration.value)}:c);commit({...state,steps});});label.append(duration);
    const actions=document.createElement('div');actions.className='step-actions';actions.append(smallButton('Edit','Edit chord '+(index+1),()=>{player.pause();editing=index;state={...state,selected:{...chord}};save();render();$('root').focus();}),smallButton('Copy','Duplicate chord '+(index+1),()=>{if(state.steps.length>=32)return;const steps=[...state.steps];steps.splice(index+1,0,{...chord});editing=-1;commit({...state,steps});},state.steps.length>=32),smallButton('Earlier','Move chord '+(index+1)+' earlier',()=>moveStep(index,index-1),index===0),smallButton('Later','Move chord '+(index+1)+' later',()=>moveStep(index,index+1),index===state.steps.length-1),smallButton('Remove','Remove chord '+(index+1),()=>{editing=-1;commit({...state,steps:state.steps.filter((_,i)=>i!==index)});}));
    card.append(top,hear,label,actions);$('steps').append(card);
  });
}
function drawLibrary(){
  populate('library',[['','Choose a saved progression'],...library.map(x=>[x.id,x.name])]);$('library').value=chosenSong;$('loadSong').disabled=$('deleteSong').disabled=!library.some(x=>x.id===chosenSong);$('restoreSong').hidden=!deletedSong;
}
function render(){clearTimeout(paintTimer);populate('root',Array.from({length:12},(_,i)=>[i,i===state.selected.root?chordRoot(state.selected,state):noteName(i,state)]));soundSettings();drawWheel();drawDiatonic();drawSteps();drawLibrary();if(!player.running){$('nowBeat').textContent='';$('beatProgress').value=0;$('transportStatus').textContent=state.steps.length?'Ready when you are.':'Add a chord to start.';}}
async function audition(){try{await player.audition(state,state.selected);status('Playing '+chordName(state.selected,state)+'.');}catch(error){status(error.message);}}
function selectChord(chord){commit({...state,selected:chord});if(state.tapSound)audition();}
function moveStep(from,to){if(to<0||to>=state.steps.length||from===to)return;const steps=[...state.steps],chord=steps.splice(from,1)[0];steps.splice(to,0,chord);editing=-1;commit({...state,steps});status('Chord moved to position '+(to+1)+'.');}
function startDrag(event,index){
  if(event.button!==0)return;event.preventDefault();const handle=event.currentTarget;handle.setPointerCapture(event.pointerId);drag={index,target:index,moved:false,x:event.clientX,y:event.clientY};player.pause(false);handle.closest('.step').classList.add('is-dragging');
  const move=e=>{if(!drag)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5)drag.moved=true;if(!drag.moved)return;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-step]');for(const card of $('steps').children)card.classList.remove('drop-target');if(target){drag.target=Number(target.dataset.step);target.classList.add('drop-target');}if(e.clientY<80)window.scrollBy(0,-8);else if(e.clientY>innerHeight-80)window.scrollBy(0,8);};
  const finish=e=>{if(!drag)return;const current=drag;drag=null;handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',cancel);handle.removeEventListener('lostpointercapture',cancel);try{handle.releasePointerCapture(e.pointerId);}catch{}if(current.moved&&current.index!==current.target)moveStep(current.index,current.target);else render();};
  const cancel=e=>{if(drag)drag.moved=false;finish(e);};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',cancel);handle.addEventListener('lostpointercapture',cancel);
}
function animate(){
  cancelAnimationFrame(frameID);const frame=()=>{
    if(!player.running)return;const p=player.position(),chord=state.steps[p.index];if(!chord)return;
    if(activeIndex!==p.index){drawWheel();for(const card of $('steps').children)card.classList.toggle('is-active',Number(card.dataset.step)===p.index);}
    const fraction=Math.max(0,Math.min(1,p.beat/chord.beats));$('beatProgress').value=fraction;
    const arc=$('beatArc');if(arc)arc.setAttribute('stroke-dasharray',(fraction*1093.27)+' 1093.27');
    const tick=Math.floor(p.beat*10);if(tick!==lastBeat){lastBeat=tick;$('nowBeat').textContent='Beat '+Math.min(chord.beats,Math.floor(p.beat)+1)+' / '+chord.beats;$('transportStatus').textContent='Chord '+(p.index+1)+' of '+state.steps.length;}
    const dot=$('travelDot');if(dot&&state.animations&&!reduced.matches){const a=chordPoint(chord,state),next=p.index+1<state.steps.length?state.steps[p.index+1]:state.loop?state.steps[0]:chord,b=chordPoint(next,state),t=fraction;dot.setAttribute('cx',(1-t)*(1-t)*a[0]+2*(1-t)*t*400+t*t*b[0]);dot.setAttribute('cy',(1-t)*(1-t)*a[1]+2*(1-t)*t*400+t*t*b[1]);}
    frameID=requestAnimationFrame(frame);
  };frame();
}
$('hearChord').addEventListener('click',audition);
for(const key of ['root','quality','inversion'])$(key).addEventListener('change',()=>{
  const chord={...state.selected,[key]:key==='quality'?$(key).value:Number($(key).value)};if(key==='quality')chord.inversion=0;if(key==='root')delete chord.spelling;selectChord(chord);
});
$('beats').addEventListener('change',()=>commit({...state,beats:Number($('beats').value),selected:{...state.selected,beats:Number($('beats').value)}}));
$('addChord').addEventListener('click',()=>{const steps=state.steps.map(c=>({...c}));if(editing>=0)steps[editing]={...state.selected};else if(steps.length<32)steps.push({...state.selected});editing=-1;commit({...state,steps});status('Your chord is in the progression.');});
$('cancelEdit').addEventListener('click',()=>{editing=-1;render();});
$('key').addEventListener('change',()=>{editing=-1;const key=$('key').value,delta=TONICS[key]-TONICS[state.key];commit(state.transposeKey?transpose(state,delta,key):{...state,key});});
for(const key of ['scale','naming','direction'])$(key).addEventListener('change',()=>commit({...state,[key]:$(key).value}));
$('wheelMode').addEventListener('change',()=>commit({...state,wheel:$('wheelMode').value}));
for(const key of ['instrument','style','voicing'])$(key).addEventListener('change',()=>reconfigure({...state,[key]:$(key).value}));
for(const key of ['octave','subdivision','repeats'])$(key).addEventListener('change',()=>reconfigure({...state,[key]:Number($(key).value)}));
$('bpm').addEventListener('change',()=>{const value=Number($('bpm').value);if(!Number.isFinite(value)||value<40||value>200){$('bpm').value=state.bpm;status('Choose a tempo from 40 to 200 BPM.');return;}reconfigure({...state,bpm:Math.round(value)});$('bpm').value=state.bpm;});
for(const key of ['volume','reverb'])$(key).addEventListener('input',()=>{const next={...state,[key]:Number($(key).value)};commit(next,key,true);player.volume(next);$(key+'Value').textContent=next[key]+'%';});
$('swing').addEventListener('change',()=>reconfigure({...state,swing:Number($('swing').value)}));
for(const key of ['transposeKey','tapSound','animations','connections','sevenths','exportClick'])$(key).addEventListener('change',()=>commit({...state,[key]:$(key).checked},null,['animations','connections','exportClick'].includes(key)));
for(const key of ['bass','leading','loop','metronome'])$(key).addEventListener('change',()=>reconfigure({...state,[key]:$(key).checked}));
$('loadPreset').addEventListener('click',()=>{editing=-1;commit(preset($('preset').value,state));status(PRESETS[$('preset').value].name+' is ready. You can edit every chord.');});
for(const [id,delta] of [['transposeDown',-1],['transposeUp',1]])$(id).addEventListener('click',()=>{editing=-1;commit(transpose(state,delta));});
for(const id of ['undo','redo'])$(id).addEventListener('click',()=>{const from=id==='undo'?undo:redo,to=id==='undo'?redo:undo;if(!from.length)return;player.stop();to.push(state);state=from.pop();lastEdit=null;editing=-1;save();render();status(id==='undo'?'Change undone.':'Change restored.');});
$('play').addEventListener('click',async()=>{try{if(player.running){player.pause();status('Progression paused. Press Resume to continue.');}else await player.start(state);}catch(error){status(error.message);}});
$('stop').addEventListener('click',()=>{player.stop();status('All sounds stopped.');});
$('clearProgression').addEventListener('click',()=>{editing=-1;commit({...state,steps:[]});status('Progression cleared. Undo brings it back.');});
$('songName').value=title;$('songName').addEventListener('input',()=>{title=$('songName').value;save();});
$('saveSong').addEventListener('click',()=>{const name=title.trim()||'Untitled progression',existing=library.find(x=>x.name===name);if(!existing&&library.length>=24){status('You have 24 saved progressions. Download one or replace an existing name.');return;}const song={id:existing?.id??(crypto.randomUUID?.()??String(Date.now())),name,project:cleanProject(state)};library=library.filter(x=>x.id!==song.id);library.push(song);chosenSong=song.id;save();drawLibrary();status('Saved “'+name+'” in this browser.');});
$('library').addEventListener('change',()=>{chosenSong=$('library').value;drawLibrary();});
$('loadSong').addEventListener('click',()=>{const song=library.find(x=>x.id===chosenSong);if(!song)return;editing=-1;title=song.name;$('songName').value=title;commit(song.project);player.cursor={index:0,beat:0};status('Opened “'+song.name+'”.');});
$('deleteSong').addEventListener('click',()=>{const song=library.find(x=>x.id===chosenSong);if(!song)return;deletedSong=song;library=library.filter(x=>x.id!==song.id);chosenSong='';save();drawLibrary();status('Saved progression removed. Restore deleted brings it back.');});
$('restoreSong').addEventListener('click',()=>{if(!deletedSong||library.length>=24)return;library.push(deletedSong);chosenSong=deletedSong.id;deletedSong=null;save();drawLibrary();status('Saved progression restored.');});
const filename=()=>((title.trim()||'Chord Circles '+state.key).replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,70)||'chord-circles');
async function exported(kind){
  const s=cleanProject(state),name=filename();exporting=true;soundSettings();status('Preparing '+kind.toUpperCase()+'…');
  try{
    if(kind==='wav'){await new Promise(resolve=>requestAnimationFrame(resolve));download(wav(await renderAudio(s,s.repeats,s.exportClick)),name+'.wav');}
    else if(kind==='midi')download(midi(s,s.repeats),name+'.mid');
    else if(kind==='project')download(new Blob([JSON.stringify({name:title,project:s})],{type:'application/json'}),name+'.chords.json');
    else{
      const p=player.running?player.position():null,svg=wheelSVG(s,p?.index??null,p?.notes??voice(s.selected,s),true,document.documentElement.dataset.theme==='light');
      if(kind==='svg')download(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),name+'-wheel.svg');
      else{const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));try{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=2400;const context=canvas.getContext('2d');if(!context)throw Error('PNG export is unavailable. Try SVG.');context.drawImage(image,0,0,2400,2400);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('The wheel image could not be created.');download(await withDpi(blob),name+'-wheel.png');canvas.width=canvas.height=1;}finally{URL.revokeObjectURL(url);}}
    }status('Your '+kind.toUpperCase()+' is ready.');
  }catch(error){status('Export could not finish: '+error.message);}finally{exporting=false;soundSettings();}
}
for(const [id,kind] of [['downloadWAV','wav'],['downloadMIDI','midi'],['downloadPNG','png'],['downloadSVG','svg'],['downloadProject','project']])$(id).addEventListener('click',()=>exported(kind));
function openProject(value){
  const project=value?.project??value;if(!validProject(project))throw Error('Choose a valid Still Chord Circles song.');editing=-1;if(typeof value.name==='string'){title=value.name.slice(0,60);$('songName').value=title;}commit(cleanProject(project));player.cursor={index:0,beat:0};status('Your editable progression is open and saved in this browser.');
}
$('importProject').addEventListener('change',async event=>{const input=event.currentTarget,file=input.files[0];if(!file)return;try{if(file.size>200000)throw Error('Choose a song file smaller than 200 KB.');openProject(JSON.parse(await file.text()));}catch(error){status(error.message);}input.value='';});
$('share').addEventListener('click',async()=>{try{const data=new TextEncoder().encode(JSON.stringify(state)),hash=btoa(String.fromCharCode(...data)),url=location.origin+location.pathname+'#song='+encodeURIComponent(hash);$('shareField').hidden=false;$('shareLink').value=url;try{await navigator.clipboard.writeText(url);status('Progression link copied. It contains this song and its settings.');}catch{$('shareLink').focus();$('shareLink').select();status('Copy the progression link shown below.');}}catch(error){status('The link could not be created: '+error.message);}});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('wheelStage').requestFullscreen)await $('wheelStage').requestFullscreen();else throw Error('Full screen is unavailable in this browser.');}catch(error){status(error.message);}});
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'Exit full screen':'Full screen';});
document.addEventListener('keydown',event=>{if(event.target.closest?.('input,select,textarea,button,[role="button"]'))return;if(event.code==='Space'){event.preventDefault();$('play').click();}if(event.key==='Escape'&&!document.fullscreenElement)player.stop();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){player.pause();status('Playback paused while this page is hidden. Your progression is saved.');}});
window.addEventListener('pagehide',()=>{player.stop();save();});
try{if(location.hash.startsWith('#song=')){const encoded=decodeURIComponent(location.hash.slice(6));if(encoded.length>18000)throw Error('This progression link is too long.');const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));openProject(JSON.parse(new TextDecoder().decode(bytes)));}}catch(error){status('Could not open the shared song: '+error.message);}
render();save();
