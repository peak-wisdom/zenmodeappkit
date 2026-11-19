// SPDX-License-Identifier: MIT
import {OCCASIONS,FORMATS,COLORS,defaults,cleanProject,validProject,newSeed,palette,imagePlacement} from './core.js';
import {backgroundSVG} from './backgrounds.js';
import {renderCard,approximateWidth} from './render.js';
import {normalizeImage,loadImageLink} from './images.js';
import {openStorage,saveMetadata} from './storage.js';
import {rasterize,svgForPrint,twoSidedPDF} from './export.js';
const $=id=>document.getElementById(id),measureCanvas=document.createElement('canvas'),measureContext=measureCanvas.getContext('2d');
const measure=(text,size,font)=>{if(!measureContext)return approximateWidth(text,size);measureContext.font=size+'px '+font;return measureContext.measureText(text).width;};
let state=defaults(),loaded=false,storage=null,undo=[],redo=[],paintTimer=null,saveTimer=null,revision=0,lastEdit=null,gallerySeeds=[],galleryStamp='',suggestion=0,importing=false,exporting=false,imageJob=0,imageController=null,imageNotice='';
let cards={front:null,back:null};
const announce=message=>$('status').textContent=message;
function galleryBatch(seed=state.seed){return [seed,...Array.from({length:5},(_,i)=>seed+'-design-'+(i+1))];}
function remember(){revision++;const saved=saveMetadata(state);$('saveState').textContent=saved?'Saving in this browser…':'Saving… Browser storage may be limited.';clearTimeout(saveTimer);saveTimer=setTimeout(flush,350);}
async function flush(){
  clearTimeout(saveTimer);if(!loaded||!storage)return;const id=revision,snapshot=state;
  try{await storage.write(snapshot);if(id===revision)$('saveState').textContent='Saved in this browser, including your current image.';}
  catch{if(id===revision)$('saveState').textContent='This browser could not save the complete card. Download an editable card to keep it.';}
}
function trimHistory(){
  while(undo.length>24)undo.shift();
  let total=0;const photos=new Set();for(let i=undo.length-1;i>=0;i--){const photo=undo[i].photo;if(photo&&!photos.has(photo.id)){photos.add(photo.id);total+=photo.dataURL.length;}if(total>24000000){undo.splice(0,i+1);break;}}
}
function commit(next,key=null){
  if(!loaded)return;const now=performance.now(),coalesce=key&&lastEdit?.key===key&&now-lastEdit.time<900,photoChanged=next.photo?.id!==state.photo?.id;
  if(!coalesce){undo.push(state);trimHistory();}redo=[];state=next;lastEdit=key?{key,time:now}:null;remember();if(key)scheduleRender();else render();if(photoChanged)flush();
}
function setView(view){if(!loaded)return;state={...state,view};saveMetadata(state);render();}
function scheduleRender(){clearTimeout(paintTimer);paintTimer=setTimeout(render,80);}
function sync(){
  for(const key of ['occasion','style','palette','size','layout','font','align','headline','recipient','message','signature','date','time','venue','rsvp','backMessage','address','sender','seed'])if(document.activeElement!==$(key))$(key).value=state[key];
  for(const key of ['texture','event','stamp'])$(key).checked=state[key];
  $('eventFields').hidden=!state.event;$('cropFields').hidden=state.source!=='photo'||!state.photo;
  $('zoom').value=Math.round(state.zoom*100);$('zoomValue').textContent=Math.round(state.zoom*100)+'%';$('panX').value=state.panX*100;$('panY').value=state.panY*100;
  $('textScale').value=state.textScale*100;$('textScaleValue').textContent=Math.round(state.textScale*100)+'%';$('panel').value=state.panel;$('panelValue').textContent=state.panel+'%';
  const c=palette(state);for(const key of ['paper','ink','accent','second'])$(key).value=c[key];
  $('frontSide').setAttribute('aria-pressed',String(state.view==='front'));$('backSide').setAttribute('aria-pressed',String(state.view==='back'));
  $('useIllustration').setAttribute('aria-pressed',String(state.source==='illustration'));$('usePhoto').setAttribute('aria-pressed',String(state.source==='photo'));$('usePhoto').disabled=!state.photo||importing;
  $('newBackground').hidden=state.view==='back';$('newBackground').disabled=!loaded||importing;$('messageCount').textContent=state.message.length+' / 650';
  const f=FORMATS[state.size];$('sizeNote').textContent=f.inches[0]+' × '+f.inches[1]+' inches · '+Math.round(f.inches[0]*300)+' × '+Math.round(f.inches[1]*300)+' px';
  $('designName').textContent=state.source==='photo'?'Your image · '+(state.photo?.name||'background'):OCCASIONS[state.occasion].label+' illustrations';
  $('undo').disabled=!loaded||!undo.length;$('redo').disabled=!loaded||!redo.length;
  $('upload').disabled=$('loadLink').disabled=importing;$('cancelImage').hidden=!importing;
  if(!importing){const photo=state.photo,placement=photo?imagePlacement(state):null,f=FORMATS[state.size],dpi=placement?Math.floor((f.w/f.inches[0])/(placement.imageWidth/photo.width)):0;$('imageStatus').textContent=imageNotice||(photo?photo.name+' · '+photo.width+' × '+photo.height+' pixels · kept in this card'+(state.source==='photo'&&dpi<150?' · Low-resolution background: about '+dpi+' DPI at this crop. A larger image will print more clearly.':''):'No custom image selected.');}
}
function renderGallery(){
  const key=[state.occasion,state.size,state.style,state.palette,state.texture,JSON.stringify(state.colors),gallerySeeds.join('/')].join('|');
  if(key!==galleryStamp){galleryStamp=key;$('backgroundChoices').replaceChildren(...gallerySeeds.map((seed,index)=>{const s={...state,seed,source:'illustration'},button=document.createElement('button');button.type='button';button.className='background-choice';button.dataset.seed=seed;button.setAttribute('aria-label',OCCASIONS[state.occasion].label+' background '+(index+1));button.innerHTML=backgroundSVG(s);const label=document.createElement('span');label.textContent=palette(s).name||'Custom colors';button.append(label);button.addEventListener('click',()=>{cancelImport(false);commit({...state,seed,source:'illustration',view:'front'});});return button;}));}
  for(const button of $('backgroundChoices').children)button.setAttribute('aria-pressed',String(state.source==='illustration'&&button.dataset.seed===state.seed));
  $('backgroundNote').textContent='Fresh '+OCCASIONS[state.occasion].label.toLowerCase()+' designs. More backgrounds brings another set; the occasion stays the same.';
}
function buildCards(){return {front:renderCard(state,'front',measure),back:renderCard(state,'back',measure)};}
function exportButtons(){
  const locked=!loaded||importing||exporting;$('downloadPNG').disabled=$('downloadSVG').disabled=locked||cards[state.view]?.overflow;$('downloadPDF').disabled=locked||cards.front?.overflow||cards.back?.overflow;$('saveProject').disabled=locked;
  $('downloadPNG').textContent='Download '+state.view+' PNG';$('downloadSVG').textContent='Download '+state.view+' SVG';
}
function render(){
  clearTimeout(paintTimer);sync();cards=buildCards();$('preview').innerHTML=cards[state.view].svg;$('preview').style.aspectRatio=FORMATS[state.size].w+'/'+FORMATS[state.size].h;
  const overflow=cards[state.view].overflow;$('fitNotice').classList.toggle('warning',overflow);
  $('fitNotice').textContent=overflow?'The '+state.view+' has more text than this layout can hold. Shorten the text, reduce its size, or choose a roomier layout.':cards.front.overflow||cards.back.overflow?'This side fits. The other side needs less text before a two-sided PDF can be made.':'Your text fits. Artwork and print files use the selected card size.';
  renderGallery();exportButtons();
}
function freshBackground(){cancelImport(false);const seed=newSeed();gallerySeeds=galleryBatch(seed);commit({...state,seed,source:'illustration',view:'front'});announce('A new '+OCCASIONS[state.occasion].label.toLowerCase()+' background is ready.');}
function cancelImport(message=true){imageJob++;imageController?.abort();imageController=null;imageNotice='';const was=importing;importing=false;if(was){sync();exportButtons();if(message)announce('Image import canceled. Your previous background is kept.');}}
async function importImage(task){
  cancelImport(false);const id=imageJob,controller=new AbortController();imageController=controller;importing=true;sync();exportButtons();$('imageStatus').textContent='Preparing your image…';
  const timeout=setTimeout(()=>controller.abort(),20000);
  try{const photo=await task(controller.signal);if(id!==imageJob)return;importing=false;commit({...state,photo,source:'photo',zoom:1,panX:0,panY:0,rotation:0,view:'front'});render();announce('Your image is ready. Adjust the crop or panel opacity to make the words easy to read.');}
  catch(error){if(id!==imageJob)return;importing=false;imageNotice=error.name==='AbortError'?'Image import timed out. Try again or upload a file.':error.message;sync();exportButtons();}
  finally{clearTimeout(timeout);if(id===imageJob){importing=false;$('upload').disabled=$('loadLink').disabled=false;$('cancelImage').hidden=true;exportButtons();}}
}
function download(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
const filename=()=>((state.headline||'postcard').replace(/[^a-z0-9_-]+/gi,'-').slice(0,55)||'postcard');
async function exportFile(kind){
  if(!loaded||importing||exporting)return;cards=buildCards();if(kind==='pdf'?(cards.front.overflow||cards.back.overflow):cards[state.view].overflow){render();announce('Please shorten the overflowing text before downloading this layout.');return;}
  const snapshot=state,side=state.view,name=filename(),source=cards[side].svg,front=cards.front.svg,back=cards.back.svg;exporting=true;exportButtons();announce('Preparing your '+(kind==='pdf'?'two-sided PDF':side+' '+kind.toUpperCase())+'…');
  try{if(kind==='svg')download(new Blob([svgForPrint(source,snapshot.size)],{type:'image/svg+xml;charset=utf-8'}),name+'-'+side+'.svg');else if(kind==='png')download(await rasterize(source,snapshot.size),name+'-'+side+'.png');else download(await twoSidedPDF(front,back,snapshot.size),name+'-two-sided.pdf');announce('Your '+(kind==='pdf'?'two-sided PDF':side+' '+kind.toUpperCase())+' is ready to keep or share.');}catch(error){announce('Export could not finish: '+error.message);}finally{exporting=false;exportButtons();}
}
function populate(id,entries){$(id).replaceChildren(...entries.map(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;return option;}));}
populate('occasion',Object.entries(OCCASIONS).map(([key,o])=>[key,o.label]));populate('size',Object.entries(FORMATS).map(([key,f])=>[key,f.name]));populate('palette',[['auto','Match the occasion'],...Object.entries(COLORS).map(([key,c])=>[key,c.name]),['custom','My custom colors']]);
for(const [id,view] of [['frontSide','front'],['backSide','back'],['editBack','back']])$(id).addEventListener('click',()=>setView(view));
for(const id of ['undo','redo'])$(id).addEventListener('click',()=>{cancelImport(false);const from=id==='undo'?undo:redo,to=id==='undo'?redo:undo;if(!from.length)return;to.push(state);const previous=from.pop();state={...previous,view:state.view};lastEdit=null;gallerySeeds=galleryBatch(state.seed);remember();render();flush();announce(id==='undo'?'Change undone.':'Change restored.');});
$('occasion').addEventListener('change',()=>{cancelImport(false);const old=OCCASIONS[state.occasion],next=OCCASIONS[$('occasion').value],seed=newSeed(),headline=state.headline===old.headline?next.headline:state.headline,message=old.messages.includes(state.message)?next.messages[0]:state.message;gallerySeeds=galleryBatch(seed);suggestion=0;commit({...state,occasion:$('occasion').value,seed,headline,message,event:['babyshower','invitation'].includes($('occasion').value),view:'front'});announce(next.label+' designs are ready. Use suggested words for a fresh message.');});
$('suggestWords').addEventListener('click',()=>{const o=OCCASIONS[state.occasion];suggestion=(suggestion+1)%o.messages.length;commit({...state,headline:o.headline,message:o.messages[suggestion],view:'front'});announce('Suggested wording added. You can edit every word.');});
$('newBackground').addEventListener('click',freshBackground);$('moreDesigns').addEventListener('click',()=>{gallerySeeds=galleryBatch(newSeed());galleryStamp='';renderGallery();announce('Six more '+OCCASIONS[state.occasion].label.toLowerCase()+' backgrounds are ready to choose.');});
$('applySeed').addEventListener('click',()=>{const seed=$('seed').value.trim();if(!seed){announce('Enter a design code to reuse it.');return;}cancelImport(false);gallerySeeds=galleryBatch(seed);commit({...state,seed,source:'illustration',view:'front'});});
for(const key of ['headline','recipient','message','signature','date','time','venue','rsvp','backMessage','address','sender'])$(key).addEventListener('input',()=>{const value=$(key).value;commit({...state,[key]:value},key);});
for(const key of ['headline','recipient','message','signature','date','time','venue','rsvp'])$(key).addEventListener('focus',()=>{if(state.view!=='front')setView('front');});
for(const key of ['backMessage','address','sender'])$(key).addEventListener('focus',()=>{if(state.view!=='back')setView('back');});
$('clearMessage').addEventListener('click',()=>commit({...state,message:''}));
for(const key of ['size','layout','style','font','align','palette'])$(key).addEventListener('change',()=>commit({...state,[key]:$(key).value}));
for(const key of ['texture','event','stamp'])$(key).addEventListener('change',()=>commit({...state,[key]:$(key).checked}));
for(const key of ['paper','ink','accent','second'])$(key).addEventListener('input',()=>commit({...state,palette:'custom',colors:{...palette(state),[key]:$(key).value}},'color-'+key));
for(const key of ['zoom','panX','panY','textScale','panel'])$(key).addEventListener('input',()=>commit({...state,[key]:Number($(key).value)/(key==='panel'?1:100)},key));
$('useIllustration').addEventListener('click',()=>{cancelImport(false);commit({...state,source:'illustration',view:'front'});});$('usePhoto').addEventListener('click',()=>{if(state.photo)commit({...state,source:'photo',view:'front'});});
$('upload').addEventListener('change',event=>{const file=event.target.files[0];if(file)importImage(()=>normalizeImage(file,file.name));event.target.value='';});
$('imageForm').addEventListener('submit',event=>{event.preventDefault();const value=$('imageLink').value.trim();importImage(signal=>loadImageLink(value,signal));});$('cancelImage').addEventListener('click',()=>cancelImport());
$('rotateImage').addEventListener('click',()=>commit({...state,rotation:(state.rotation+90)%360,panX:0,panY:0}));$('resetCrop').addEventListener('click',()=>commit({...state,zoom:1,panX:0,panY:0,rotation:0}));$('removeImage').addEventListener('click',()=>{cancelImport(false);commit({...state,photo:null,source:'illustration'});});
for(const [id,kind] of [['downloadPNG','png'],['downloadSVG','svg'],['downloadPDF','pdf']])$(id).addEventListener('click',()=>exportFile(kind));
$('saveProject').addEventListener('click',()=>{if(!loaded||exporting)return;const project=cleanProject({...state,photo:state.source==='photo'?state.photo:null});download(new Blob([JSON.stringify(project)],{type:'application/json'}),filename()+'.postcard.json');announce('Editable card downloaded. It includes both sides and your active background.');});
$('loadProject').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>24*1024*1024)throw Error('Choose a postcard project smaller than 24 MB.');const project=JSON.parse(await file.text());if(!validProject(project))throw Error('Choose a valid Still Postcard project file.');const next=cleanProject(project);if(next.photo){const image=new Image();image.src=next.photo.dataURL;await image.decode();if(image.naturalWidth!==next.photo.width||image.naturalHeight!==next.photo.height)throw Error('The project image could not be verified.');}cancelImport(false);gallerySeeds=galleryBatch(next.seed);commit(next);render();flush();announce('Your editable postcard is open and saved in this browser.');}catch(error){announce(error.message);}event.target.value='';});
document.addEventListener('keydown',event=>{if(!loaded||event.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();$(event.shiftKey?'redo':'undo').click();}else if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y'){event.preventDefault();$('redo').click();}});
window.addEventListener('pagehide',()=>{if(loaded){saveMetadata(state);flush();}imageController?.abort();});
gallerySeeds=galleryBatch();render();
(async()=>{try{storage=await openStorage();const saved=await storage.read();if(saved){state=saved.project;gallerySeeds=galleryBatch(state.seed);announce(saved.photoMissing?'Your words were restored, but the image could not be recovered. Upload it again or open a downloaded card.':'Your saved postcard is ready.');}else announce('Your first birthday card is ready. Choose another occasion or make it your own.');}catch{announce('Browser saving is unavailable. Download an editable card to keep your work.');}finally{loaded=true;$('editor').disabled=false;render();remember();flush();}})();
