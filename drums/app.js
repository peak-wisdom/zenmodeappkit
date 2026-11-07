// SPDX-License-Identifier: MIT
import{TRACKS,STYLES,CREDIT,initial,generate,validProject,cleanProject}from './patterns.js';
import{DrumPlayer,wavWithCredit}from './audio.js';
const $=id=>document.getElementById(id),key='still-drum-studio-v1',libraryKey='still-drum-library-v1';
let project=initial(),library=[],undo=[],redo=[],starting=false,exporting=false;
try{const saved=JSON.parse(localStorage.getItem(key));if(validProject(saved))project=cleanProject(saved);const list=JSON.parse(localStorage.getItem(libraryKey));if(Array.isArray(list))library=list.filter(validProject).slice(0,20).map(cleanProject);}catch{}
const player=new DrumPlayer(()=>{$('status').textContent='Beat finished. Press Play to hear it again.';transport();},error=>{$('status').textContent=error.message;transport();});
function persist(){try{localStorage.setItem(key,JSON.stringify(project));return true;}catch{$('status').textContent='Browser storage is unavailable. Save a project file to keep this beat.';return false;}}
function remember(){undo.push(cleanProject(project));if(undo.length>40)undo.shift();redo=[];}
function transport(){$('play').disabled=starting||player.playing||exporting;$('stop').disabled=!starting&&!player.playing;$('download').disabled=exporting;$('undo').disabled=!undo.length||exporting;$('redo').disabled=!redo.length||exporting;}
function stop(){starting=false;player.stop();transport();}
function announce(message){$('status').textContent=message;}
function drawGrid(){
  const steps=project.bars*16,grid=$('grid');grid.style.setProperty('--steps',steps);grid.replaceChildren();
  const blank=document.createElement('span');blank.className='grid-corner';blank.textContent='INSTRUMENT';grid.append(blank);
  for(let step=0;step<steps;step++){const beat=document.createElement('span');beat.className='beat-label'+(step%16===0?' bar-start':'');beat.textContent=step%4===0?`${Math.floor(step/16)+1}.${Math.floor(step%16/4)+1}`:'·';beat.dataset.head=step;grid.append(beat);}
  TRACKS.forEach((track,row)=>{
    const label=document.createElement('div');label.className='track-label';
    const preview=document.createElement('button');preview.type='button';preview.className='preview';preview.textContent=track.name;preview.setAttribute('aria-label','Preview '+track.name);preview.addEventListener('click',()=>previewTrack(row));label.append(preview);
    const mute=document.createElement('button');mute.type='button';mute.className='mute';mute.textContent=project.muted[row]?'M':'●';mute.setAttribute('aria-label','Mute '+track.name);mute.setAttribute('aria-pressed',String(project.muted[row]));mute.addEventListener('click',()=>{remember();project.muted[row]=!project.muted[row];persist();drawGrid();transport();});label.append(mute);grid.append(label);
    project.pattern[row].forEach((velocity,step)=>{
      const button=document.createElement('button');button.type='button';button.className='step'+(step%4===0?' beat-start':'')+(step%16===0?' bar-start':'');button.dataset.row=row;button.dataset.step=step;updateCell(button,velocity);button.style.opacity=project.muted[row] ? .35 : 1;
      button.addEventListener('click',()=>{remember();const value=project.pattern[row][step],next=value===0 ? .4 : value<.6 ? .8 : value<.95 ? 1 : 0;project.pattern[row][step]=next;updateCell(button,next);persist();transport();});
      button.addEventListener('keydown',event=>{const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-steps,ArrowDown:steps}[event.key];if(!delta)return;event.preventDefault();const index=row*steps+step+delta;if(index>=0&&index<8*steps)grid.querySelector(`[data-row="${Math.floor(index/steps)}"][data-step="${index%steps}"]`)?.focus();});grid.append(button);
    });
  });
}
function updateCell(button,value){const row=Number(button.dataset.row),step=Number(button.dataset.step);button.dataset.level=!value?'off':value<.6?'soft':value<.95?'normal':'accent';button.setAttribute('aria-pressed',String(value>0));button.setAttribute('aria-label',`${TRACKS[row].name}, bar ${Math.floor(step/16)+1}, beat ${Math.floor(step%16/4)+1}, subdivision ${step%4+1}: ${button.dataset.level}. Click to cycle.`);}
async function previewTrack(row){try{announce('Loading drum recordings…');await player.preview(row,project);announce(TRACKS[row].name+' · recorded acoustic drum.');}catch(error){announce(error.message);}}
function draw(){
  for(const id of['name','style','bars','bpm','swing','density','volume','seed'])$(id).value=project[id];
  for(const id of['fills','humanize','loop'])$(id).checked=project[id];
  for(const id of['bpm','swing','density','volume'])$(id+'Value').textContent=project[id]+(id==='bpm'?' BPM':'%');
  $('duration').textContent=`${project.bars} ${project.bars===1?'bar':'bars'} · ${(project.bars*4*60/project.bpm).toFixed(2)} seconds`;
  drawGrid();drawMix();transport();
}
function drawMix(){$('mix').replaceChildren(...TRACKS.map((track,row)=>{const label=document.createElement('label');label.textContent=track.name;const range=document.createElement('input');range.type='range';range.min=0;range.max=100;range.value=project.mix[row];range.setAttribute('aria-label',track.name+' volume');range.addEventListener('input',()=>{project.mix[row]=Number(range.value);persist();});label.append(range);return label;}));}
function drawLibrary(){
  const list=$('library');list.replaceChildren();$('libraryCount').textContent=`${library.length} / 20 saved beats`;
  if(!library.length){const p=document.createElement('p');p.className='note';p.textContent='Save a beat below to keep several grooves in this browser.';list.append(p);}
  library.forEach((beat,index)=>{const card=document.createElement('div');card.className='saved-beat';const text=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('span');title.textContent=beat.name||'Untitled beat';detail.textContent=`${STYLES[beat.style].name} · ${beat.bpm} BPM · ${beat.bars} bars`;text.append(title,detail);card.append(text);const load=document.createElement('button');load.textContent='Load';load.setAttribute('aria-label','Load '+(beat.name||'untitled beat'));load.addEventListener('click',()=>{stop();remember();project=cleanProject(beat);persist();draw();announce('Saved beat loaded. Undo returns to your previous beat.');});const remove=document.createElement('button');remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+(beat.name||'untitled beat'));remove.addEventListener('click',()=>{const removed=library.splice(index,1)[0];saveLibrary();drawLibrary();$('restoreSaved').hidden=false;$('restoreSaved').onclick=()=>{if(library.length>=20){announce('Your library is full.');return;}library.splice(Math.min(index,library.length),0,removed);saveLibrary();drawLibrary();$('restoreSaved').hidden=true;};announce('Beat removed. Restore last removed beat is available.');});card.append(load,remove);list.append(card);});
}
function saveLibrary(){try{localStorage.setItem(libraryKey,JSON.stringify(library));return true;}catch{announce('Browser storage is unavailable. Download a project file instead.');return false;}}
for(const[id,style]of Object.entries(STYLES)){const option=document.createElement('option');option.value=id;option.textContent=style.name;$('style').append(option);}
for(const id of['name','seed'])$(id).addEventListener('input',()=>{project[id]=$(id).value;persist();});
for(const id of['bpm','swing','density','volume'])$(id).addEventListener('input',()=>{if(id==='bpm'||id==='swing')stop();project[id]=Number($(id).value);if(id==='volume')player.setVolume(project.volume);$(id+'Value').textContent=project[id]+(id==='bpm'?' BPM':'%');$('duration').textContent=`${project.bars} ${project.bars===1?'bar':'bars'} · ${(project.bars*4*60/project.bpm).toFixed(2)} seconds`;persist();});
for(const id of['fills','humanize','loop'])$(id).addEventListener('change',()=>{project[id]=$(id).checked;persist();});
$('style').addEventListener('change',()=>{stop();remember();project.style=$('style').value;project.bpm=STYLES[project.style].bpm;project.swing=STYLES[project.style].swing;project.pattern=generate(project.style,project.bars,project.density,project.fills,project.seed);persist();draw();announce('Groove loaded. Edit any step or generate a fresh variation.');});
$('bars').addEventListener('change',()=>{stop();remember();const old=project.bars*16;project.bars=Number($('bars').value);project.pattern=project.pattern.map(row=>Array.from({length:project.bars*16},(_,i)=>row[i%old]));persist();draw();announce('Pattern length changed. Undo restores the previous length.');});
$('generate').addEventListener('click',()=>{stop();remember();project.seed=crypto.getRandomValues(new Uint32Array(1))[0].toString(36);project.pattern=generate(project.style,project.bars,project.density,project.fills,project.seed);persist();draw();announce('Fresh beat generated. Your previous beat is available with Undo.');});
$('rebuild').addEventListener('click',()=>{stop();remember();project.pattern=generate(project.style,project.bars,project.density,project.fills,project.seed);persist();draw();announce('Beat rebuilt from this seed, groove, density, and fill setting.');});
$('clear').addEventListener('click',()=>{stop();remember();project.pattern=TRACKS.map(()=>Array(project.bars*16).fill(0));persist();draw();announce('Pattern cleared. Add your own hits or use Undo.');});
for(const id of['undo','redo'])$(id).addEventListener('click',()=>{const from=id==='undo'?undo:redo,to=id==='undo'?redo:undo;if(!from.length)return;stop();to.push(cleanProject(project));project=from.pop();persist();draw();});
$('play').addEventListener('click',async()=>{starting=true;transport();announce('Loading drum recordings…');try{const started=await player.start(project);if(started)announce('Playing · edit steps and mix while the beat runs.');}catch(error){announce(error.message);}finally{starting=false;transport();}});
$('stop').addEventListener('click',()=>{stop();announce('All drum sounds stopped.');});
$('saveBeat').addEventListener('click',()=>{if(library.length>=20){announce('You have 20 saved beats. Download a project or remove one to make room.');return;}library.push(cleanProject(project));const saved=saveLibrary();drawLibrary();if(saved)announce('Beat added to your saved library in this browser.');});
function filename(p=project){return(p.name.trim().replace(/[^a-z0-9_-]+/gi,'-').slice(0,50)||'still-drum-beat')+'-'+p.bpm+'bpm';}
function download(data,type,name){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
$('saveProject').addEventListener('click',()=>download(JSON.stringify(cleanProject(project),null,2),'application/json',filename()+'.json'));
$('loadProject').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>1024*1024)throw Error('Project file is too large.');const data=JSON.parse(await file.text());if(!validProject(data))throw Error('Choose a valid Still Drum Studio JSON project.');stop();remember();project=cleanProject(data);persist();draw();announce('Project loaded and saved in this browser.');}catch(error){announce(error.message);}event.target.value='';});
$('download').addEventListener('click',async()=>{stop();exporting=true;transport();announce('Rendering your acoustic drum beat…');const snapshot=cleanProject(project),repeats=Number($('repeats').value),seamless=$('exportMode').value==='loop';try{const buffer=await player.render(snapshot,repeats,seamless);download(wavWithCredit(buffer),'audio/wav',filename(snapshot)+(seamless?'-loop':'-with-tail')+'.wav');announce('WAV ready. Drum recording credits are embedded in the file.');}catch(error){announce(error.message);}finally{exporting=false;transport();}});
let previousStep=-1;function frame(){const step=player.step;if(step!==previousStep){for(const node of document.querySelectorAll('.now'))node.classList.remove('now');if(step>=0)for(const node of document.querySelectorAll(`[data-step="${step}"],[data-head="${step}"]`))node.classList.add('now');previousStep=step;}requestAnimationFrame(frame);}
window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
draw();drawLibrary();frame();
