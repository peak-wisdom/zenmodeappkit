// SPDX-License-Identifier: MIT
import{MAX_FRAMES,SIZES,blankProject,emptyFrame,validProject,cleanProject}from './model.js';
import{drawLayer,drawPaper}from './draw.js';
import{openStorage}from './storage.js';
const $=id=>document.getElementById(id),paper=$('paper'),layer=document.createElement('canvas'),ghost=document.createElement('canvas');
let project=blankProject(),selected=0,prefs={tool:'pen',color:'#183b31',size:8,onion:true,opacity:25};
let undo=[],redo=[],draft=null,strokePointer=null,storage=null,loaded=false,revision=0,paintRequest=null;
let playing=false,playIndex=0,startAt=0,playRequest=null,gifWorker=null,exporting=false,exportJob=0;
let thumbnails=new WeakMap();
const announce=text=>$('status').textContent=text;

function save(){
  if(!loaded||!storage)return;const id=++revision;$('saveState').textContent='Saving…';
  storage.write({project,prefs,selected}).then(()=>{if(id===revision)$('saveState').textContent='Saved in this browser';}).catch(()=>{if(id===revision)$('saveState').textContent='Browser save unavailable. Download a project file to keep your drawings.';});
}
function paint(){
  const frame=project.frames[playing?playIndex:selected];
  if(paper.width!==project.width)paper.width=project.width;if(paper.height!==project.height)paper.height=project.height;
  $('stage').style.aspectRatio=project.width+'/'+project.height;$('stage').dataset.tool=prefs.tool;
  const ctx=paper.getContext('2d');ctx.fillStyle=project.background;ctx.fillRect(0,0,paper.width,paper.height);
  if(!playing&&prefs.onion&&selected>0){drawLayer(ghost,project.frames[selected-1],paper.width,paper.height);ctx.globalAlpha=prefs.opacity/100;ctx.drawImage(ghost,0,0);ctx.globalAlpha=1;}
  drawLayer(layer,frame,paper.width,paper.height,playing?null:draft);ctx.drawImage(layer,0,0);
  $('frameLabel').textContent=(playing?'Playing frame ':'Frame ')+((playing?playIndex:selected)+1)+' of '+project.frames.length;
  $('onionNote').textContent=playing?'Preview shows each finished frame.':prefs.onion&&selected>0?'The faint drawing is the previous frame. It stays out of your exports.':'Draw this frame, then add a blank page to see it faintly underneath.';
}
function schedulePaint(){if(paintRequest===null)paintRequest=requestAnimationFrame(()=>{paintRequest=null;paint();});}
function thumbnail(frame){
  if(thumbnails.has(frame))return thumbnails.get(frame);
  const canvas=document.createElement('canvas'),temp=document.createElement('canvas');
  drawPaper(canvas,frame,{...project,width:120,height:Math.round(120*project.height/project.width)},temp);
  const url=canvas.toDataURL('image/png');thumbnails.set(frame,url);return url;
}
function drawFrames(){
  const focused=$('frames').contains(document.activeElement);
  $('frames').replaceChildren(...project.frames.map((frame,index)=>{
    const button=document.createElement('button');button.type='button';button.className='frame-button';button.dataset.frame=index;
    button.setAttribute('aria-label','Select frame '+(index+1));if(index===selected)button.setAttribute('aria-current','true');
    const image=document.createElement('img');image.src=thumbnail(frame);image.alt='';const label=document.createElement('span');label.textContent=String(index+1).padStart(2,'0');button.append(image,label);
    button.addEventListener('click',()=>{beforeAction();selected=index;render();save();});return button;
  }));
  $('frameCount').textContent=project.frames.length+' / '+MAX_FRAMES+' frames';
  if(focused)$('frames').querySelector(`[data-frame="${selected}"]`)?.focus({preventScroll:true});
}
function render(){
  if(document.activeElement!==$('name'))$('name').value=project.name;
  $('size').value=Object.keys(SIZES).find(k=>SIZES[k][0]===project.width&&SIZES[k][1]===project.height);
  $('background').value=project.background;$('fps').value=project.fps;$('fpsValue').textContent=project.fps+' FPS';$('loop').checked=project.loop;
  $('color').value=prefs.color;$('brush').value=prefs.size;$('brushValue').textContent=prefs.size+' px';$('onion').checked=prefs.onion;$('opacity').value=prefs.opacity;$('opacityValue').textContent=prefs.opacity+'%';$('opacity').disabled=!prefs.onion;
  $('pen').setAttribute('aria-pressed',String(prefs.tool==='pen'));$('eraser').setAttribute('aria-pressed',String(prefs.tool==='eraser'));
  $('undo').disabled=!undo.length;$('redo').disabled=!redo.length;$('earlier').disabled=selected===0;$('later').disabled=selected===project.frames.length-1;
  $('add').disabled=$('duplicate').disabled=project.frames.length>=MAX_FRAMES;$('delete').disabled=project.frames.length===1;
  $('previous').disabled=selected===0;$('next').disabled=selected===project.frames.length-1;$('play').textContent=playing?'Pause ❚❚':'Play ▶';
  $('duration').textContent=(project.frames.length/project.fps).toFixed(2)+' seconds';
  drawFrames();paint();
}
function commit(next,index=selected){
  if(!validProject(next)){announce('This project is full. Save a backup, then remove frames or undo a drawing to make room.');paint();return false;}
  undo.push({project,selected});if(undo.length>30)undo.shift();redo=[];
  if(next.background!==project.background||next.width!==project.width||next.height!==project.height)thumbnails=new WeakMap();
  project=next;selected=Math.max(0,Math.min(next.frames.length-1,index));render();save();return true;
}
function point(event){const rect=paper.getBoundingClientRect();return[Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))];}
function addPoint(event){
  const p=point(event),last=draft.points.at(-1);if(last&&Math.hypot((p[0]-last[0])*project.width,(p[1]-last[1])*project.height)<.6)return;
  if(draft.points.length>=3000)draft.points=draft.points.filter((_,i)=>i%2===0);draft.points.push(p);
}
function finishStroke(){
  if(!draft)return;const stroke=draft,id=strokePointer;draft=null;strokePointer=null;
  try{if(paper.hasPointerCapture(id))paper.releasePointerCapture(id);}catch{}
  const frames=project.frames.slice();frames[selected]={...frames[selected],strokes:[...frames[selected].strokes,stroke]};
  if(commit({...project,frames}))announce('Frame '+(selected+1)+' updated.');
}
paper.addEventListener('pointerdown',event=>{
  if(!loaded||exporting||strokePointer!==null||event.button!==0)return;
  event.preventDefault();stopPlayback();paper.focus({preventScroll:true});strokePointer=event.pointerId;
  draft={tool:prefs.tool,color:prefs.color,width:prefs.size,points:[point(event)]};paper.setPointerCapture(event.pointerId);schedulePaint();
});
paper.addEventListener('pointermove',event=>{if(event.pointerId!==strokePointer||!draft)return;for(const sample of event.getCoalescedEvents?.()||[])addPoint(sample);addPoint(event);schedulePaint();});
for(const type of['pointerup','pointercancel','lostpointercapture'])paper.addEventListener(type,event=>{if(event.pointerId===strokePointer)finishStroke();});
function stopPlayback(){
  if(!playing)return;
  for(const b of $('frames').children)b.classList.remove('now');playing=false;cancelAnimationFrame(playRequest);playRequest=null;selected=playIndex;render();save();
}
function beforeAction(){finishStroke();stopPlayback();}
function startPlayback(){
  finishStroke();if(playing){stopPlayback();return;}
  playing=true;playIndex=0;startAt=performance.now();$('play').textContent='Pause ❚❚';
  let previous=-1;
  function tick(now){
    if(!playing)return;const index=Math.floor((now-startAt)*project.fps/1000);
    if(!project.loop&&index>=project.frames.length){playIndex=project.frames.length-1;stopPlayback();announce('Animation finished.');return;}
    playIndex=index%project.frames.length;
    if(playIndex!==previous){previous=playIndex;paint();for(const b of $('frames').children)b.classList.toggle('now',Number(b.dataset.frame)===playIndex);}
    playRequest=requestAnimationFrame(tick);
  }tick(startAt);announce('Playing your flipbook. Pause to keep drawing.');
}
$('play').addEventListener('click',startPlayback);
for(const [id,delta]of[['previous',-1],['next',1]])$(id).addEventListener('click',()=>{beforeAction();selected=Math.max(0,Math.min(project.frames.length-1,selected+delta));render();save();});
for(const id of['add','duplicate'])$(id).addEventListener('click',()=>{
  beforeAction();if(project.frames.length>=MAX_FRAMES)return;
  const frame=id==='add'?emptyFrame():{...project.frames[selected],id:crypto.randomUUID()};const frames=project.frames.slice();frames.splice(selected+1,0,frame);
  if(commit({...project,frames},selected+1)){announce(id==='add'?'Blank frame added. The previous frame is a faint guide.':'Frame duplicated. Draw or erase to change this copy.');$('frames').querySelector(`[data-frame="${selected}"]`)?.scrollIntoView({block:'nearest',inline:'nearest'});}
});
$('delete').addEventListener('click',()=>{beforeAction();if(project.frames.length===1)return;const frames=project.frames.filter((_,i)=>i!==selected);if(commit({...project,frames},Math.min(selected,frames.length-1)))announce('Frame deleted. Undo brings it back.');});
for(const [id,delta]of[['earlier',-1],['later',1]])$(id).addEventListener('click',()=>{beforeAction();const destination=selected+delta;if(destination<0||destination>=project.frames.length)return;const frames=project.frames.slice();[frames[selected],frames[destination]]=[frames[destination],frames[selected]];commit({...project,frames},destination);});
$('clearFrame').addEventListener('click',()=>{beforeAction();const frames=project.frames.slice();frames[selected]={...frames[selected],strokes:[]};commit({...project,frames});announce('Current frame cleared. Undo restores the drawing.');});
$('new').addEventListener('click',()=>{beforeAction();commit(blankProject(),0);announce('New flipbook ready. Undo returns to your previous project.');});
for(const id of['undo','redo'])$(id).addEventListener('click',()=>{
  beforeAction();const from=id==='undo'?undo:redo,to=id==='undo'?redo:undo;if(!from.length)return;
  to.push({project,selected});const state=from.pop();project=state.project;selected=state.selected;thumbnails=new WeakMap();render();save();
});
for(const tool of['pen','eraser'])$(tool).addEventListener('click',()=>{finishStroke();prefs={...prefs,tool};render();save();});
for(const id of['color','brush','onion','opacity'])$(id).addEventListener('input',()=>{finishStroke();prefs={...prefs,[{brush:'size',opacity:'opacity',color:'color',onion:'onion'}[id]]:id==='onion'?$(id).checked:id==='color'?$(id).value:Number($(id).value)};render();save();});
$('name').addEventListener('input',()=>{project={...project,name:$('name').value};save();});
$('size').addEventListener('change',()=>{beforeAction();const[width,height]=SIZES[$('size').value];commit({...project,width,height});});
$('background').addEventListener('change',()=>{beforeAction();commit({...project,background:$('background').value});});
$('fps').addEventListener('input',()=>{beforeAction();project={...project,fps:Number($('fps').value)};render();save();});
$('loop').addEventListener('change',()=>{project={...project,loop:$('loop').checked};save();});
function filename(){return(project.name.trim().replace(/[^a-z0-9_-]+/gi,'-').slice(0,60)||'still-flipbook');}
function download(data,type,name){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
$('saveProject').addEventListener('click',()=>{beforeAction();download(JSON.stringify(cleanProject(project)),'application/json',filename()+'.flipbook.json');announce('Editable project ready to download.');});
$('loadProject').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{if(file.size>12*1024*1024)throw Error('Choose a project smaller than 12 MB.');const data=JSON.parse(await file.text());if(!validProject(data))throw Error('Choose a valid Still Flipbook project file.');beforeAction();commit(cleanProject(data),0);announce('Project loaded and saved in this browser.');}catch(error){announce(error.message);}event.target.value='';
});
$('downloadPNG').addEventListener('click',()=>{beforeAction();const canvas=document.createElement('canvas');drawPaper(canvas,project.frames[selected],project,document.createElement('canvas'));const name=filename()+'-frame-'+(selected+1)+'.png';canvas.toBlob(blob=>{if(blob)download(blob,'image/png',name);else announce('PNG could not be created. Please try again.');},'image/png');});
function finishExport(){gifWorker?.terminate();gifWorker=null;exporting=false;$('editor').disabled=false;$('cancelExport').hidden=true;render();}
function cancelExport(){if(!exporting)return;exportJob++;finishExport();announce('GIF export canceled.');}
$('cancelExport').addEventListener('click',cancelExport);
$('downloadGIF').addEventListener('click',()=>{
  beforeAction();const snapshot=project,name=filename()+'.gif',job=++exportJob,canvas=document.createElement('canvas'),temp=document.createElement('canvas');
  exporting=true;$('editor').disabled=true;$('cancelExport').hidden=false;$('exportProgress').textContent='Preparing GIF…';
  try{
    const worker=new Worker(new URL('./gif-worker.js',import.meta.url),{type:'module'});gifWorker=worker;
    const send=index=>{drawPaper(canvas,snapshot.frames[index],snapshot,temp);const rgba=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;worker.postMessage({type:'frame',index,rgba:rgba.buffer},[rgba.buffer]);};
    worker.onmessage=({data})=>{if(job!==exportJob)return;try{
      if(data.type==='ready')send(0);
      else if(data.type==='next'){$('exportProgress').textContent='Encoding frame '+(data.completed+1)+' / '+snapshot.frames.length;send(data.completed);}
      else if(data.type==='done'){download(data.bytes,'image/gif',name);finishExport();$('exportProgress').textContent='GIF ready to download.';announce('Your animation is ready. Previous-frame guides stay out of the GIF.');}
      else if(data.type==='error')throw Error(data.message);
    }catch(error){finishExport();$('exportProgress').textContent='';announce('GIF export failed: '+error.message);}};
    worker.onerror=()=>{if(job!==exportJob)return;finishExport();$('exportProgress').textContent='';announce('GIF export could not start. Save your project and try again.');};
    worker.postMessage({type:'start',width:snapshot.width,height:snapshot.height,fps:snapshot.fps,loop:snapshot.loop,count:snapshot.frames.length});
  }catch(error){finishExport();announce('GIF export is unavailable: '+error.message);}
});
document.addEventListener('keydown',event=>{
  if(!loaded||exporting||event.target.closest?.('input,select,textarea,[contenteditable="true"]'))return;
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();$(event.shiftKey?'redo':'undo').click();}
  else if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y'){event.preventDefault();$('redo').click();}
  else if(event.code==='Space'&&!event.target.closest('button')){event.preventDefault();startPlayback();}
});
window.addEventListener('pagehide',()=>{finishStroke();stopPlayback();cancelExport();save();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){finishStroke();stopPlayback();}});
(async()=>{
  try{
    storage=await openStorage();const record=await storage.read();
    if(record&&validProject(record.project)){
      project=cleanProject(record.project);selected=Number.isInteger(record.selected)?Math.max(0,Math.min(project.frames.length-1,record.selected)):0;
      const p=record.prefs;if(p&&['pen','eraser'].includes(p.tool))prefs.tool=p.tool;if(/^#[0-9a-f]{6}$/i.test(p?.color))prefs.color=p.color;
      if(Number.isFinite(p?.size)&&p.size>=1&&p.size<=36)prefs.size=p.size;if(typeof p?.onion==='boolean')prefs.onion=p.onion;if(Number.isFinite(p?.opacity)&&p.opacity>=0&&p.opacity<=60)prefs.opacity=p.opacity;
      $('saveState').textContent='Restored from this browser';
    }else if(record)announce('The browser copy could not be read. Load a downloaded project to recover it.');else $('saveState').textContent='Auto-save ready in this browser';
  }catch{$('saveState').textContent='Browser storage unavailable. Download projects to keep them.';}
  finally{loaded=true;$('editor').disabled=false;render();}
})();
