// SPDX-License-Identifier: MIT
import {FORMATS,palette,typeface,eventLines,imagePlacement} from './core.js';
import {backgroundArtwork} from './backgrounds.js';
export const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number(v).toFixed(2);
const graphemes=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
export function approximateWidth(text,size){return [...text].reduce((sum,c)=>sum+(c===' '?.3:/[ilI.,!'|]/.test(c)?.28:/[MW@]/.test(c)?.88:c.codePointAt(0)>1000?1:.53),0)*size;}
export function wrapText(text,width,size,font,measure=approximateWidth){
  const lines=[];for(const paragraph of String(text).split('\n')){if(!paragraph){lines.push('');continue;}let line='';for(const word of paragraph.split(/\s+/)){
    if(line&&measure(line+' '+word,size,font)>width){lines.push(line);line='';}
    if(measure(word,size,font)>width){if(line){lines.push(line);line='';}let part='';for(const char of graphemes?[...graphemes.segment(word)].map(g=>g.segment):[...word]){if(part&&measure(part+char,size,font)>width){lines.push(part);part='';}part+=char;}line=part;}
    else line+=(line?' ':'')+word;
  }if(line)lines.push(line);}return lines;
}
function textBlock(lines,x,top,size,font,color,align='left',height=1.3,extra=''){
  const anchor=align==='center'?'middle':'start';return `<text x="${n(x)}" y="${n(top+size)}" font-family="${escape(font)}" font-size="${n(size)}" text-anchor="${anchor}" fill="${color}" ${extra}>${lines.map((line,i)=>`<tspan x="${n(x)}" dy="${i?n(size*height):0}">${escape(line)}</tspan>`).join('')}</text>`;
}
function photoBackground(state){
  const p=imagePlacement(state),{w,h}=FORMATS[state.size],c=palette(state);
  return `<rect width="${w}" height="${h}" fill="${c.paper}"/><g transform="translate(${n(p.translate[0])} ${n(p.translate[1])}) rotate(${p.rotation})"><image href="${state.photo.dataURL}" width="${n(p.imageWidth)}" height="${n(p.imageHeight)}" preserveAspectRatio="none"/></g>`;
}
export function contentBox(state){const {w,h}=FORMATS[state.size];return state.layout==='left'?{x:w*.07,y:h*.09,w:w*.6,h:h*.82}:state.layout==='band'?{x:w*.06,y:h*.48,w:w*.88,h:h*.46}:{x:w*.12,y:h*.12,w:w*.76,h:h*.76};}
function front(state,measure){
  const {w,h}=FORMATS[state.size],c=palette(state),font=typeface(state),unit=Math.min(w,h)/600,box=contentBox(state),padding=28*unit,availableWidth=box.w-2*padding,availableHeight=box.h-2*padding;
  const fields=[{value:state.recipient,size:22,gap:13,extra:'letter-spacing="1"'},{value:state.headline,size:54,gap:19,leading:1.12},{value:state.message,size:24,gap:16,leading:1.4},{value:eventLines(state).join('\n'),size:18,gap:16,leading:1.45},{value:state.signature,size:22,gap:0,extra:'font-style="italic"'}].filter(f=>f.value);
  let factor=1,blocks=[],total=0;
  do{total=0;blocks=fields.map(f=>{const minimum=f.size===54?26:f.size===18?15:16,size=Math.max(minimum*unit,f.size*unit*state.textScale*factor),lines=wrapText(f.value,availableWidth,size,font,measure),leading=f.leading??1.3,height=lines.length*size*leading,gap=f.gap*unit*factor;total+=height+gap;return {...f,size,lines,height,gap,leading};});if(total<=availableHeight||factor<=.68)break;factor=Math.max(.68,factor-.04);}while(true);
  const overflow=total>availableHeight+.5;let top=box.y+padding+Math.max(0,(availableHeight-total)/2),body='';
  for(const block of blocks){body+=textBlock(block.lines,state.align==='center'?box.x+box.w/2:box.x+padding,top,block.size,font,c.ink,state.align,block.leading,block.extra??'');top+=block.height+block.gap;}
  const bg=state.source==='photo'&&state.photo?photoBackground(state):backgroundArtwork(state),radius=state.style==='cut'?6*unit:22*unit;
  return {art:`${bg}<defs><clipPath id="front-text"><rect x="${n(box.x+padding-2)}" y="${n(box.y+padding-2)}" width="${n(availableWidth+4)}" height="${n(availableHeight+4)}"/></clipPath></defs><rect x="${n(box.x)}" y="${n(box.y)}" width="${n(box.w)}" height="${n(box.h)}" rx="${n(radius)}" fill="${c.paper}" fill-opacity="${state.panel/100}"/><rect x="${n(box.x+8*unit)}" y="${n(box.y+8*unit)}" width="${n(box.w-16*unit)}" height="${n(box.h-16*unit)}" rx="${n(Math.max(0,radius-5))}" fill="none" stroke="${c.accent}" stroke-opacity=".45" stroke-width="${unit}"/><g clip-path="url(#front-text)">${body}</g>`,overflow};
}
function fit(value,box,initial,font,measure,minimum=15){let size=initial,lines=[];do{lines=wrapText(value,box.w,size,font,measure);if(lines.length*size*1.4<=box.h||size<=minimum)break;size-=.5;}while(true);return {lines,size,overflow:lines.length*size*1.4>box.h+.5};}
function back(state,measure){
  const {w,h}=FORMATS[state.size],c=palette(state),font=typeface(state),unit=Math.min(w,h)/600,m=44*unit,mid=w*.53;
  let svg=`<rect width="${w}" height="${h}" fill="${c.paper}"/><rect x="${m/2}" y="${m/2}" width="${w-m}" height="${h-m}" rx="${10*unit}" fill="none" stroke="${c.accent}" stroke-opacity=".35"/><path d="M${mid} ${h*.15}V${h-m}" stroke="${c.accent}" stroke-width="${1.2*unit}"/>`;
  svg+=textBlock(['POSTCARD'],m,m,16*unit,font,c.ink,'left',1,'letter-spacing="4"');
  const messageBox={x:m,y:m+65*unit,w:mid-m-35*unit,h:h*.62-m-65*unit},message=fit(state.backMessage,messageBox,24*unit,font,measure,16*unit);
  svg+=textBlock(message.lines,messageBox.x,messageBox.y,message.size,font,c.ink,'left',1.4);
  const senderBox={x:m,y:h*.76,w:mid-m-35*unit,h:h*.2},sender=fit(state.sender,senderBox,17*unit,font,measure,14*unit);
  if(state.sender)svg+=textBlock(['FROM'],m,h*.70,11*unit,font,c.ink,'left',1,'letter-spacing="2"')+textBlock(sender.lines,senderBox.x,senderBox.y,sender.size,font,c.ink,'left',1.4);
  const addressBox={x:mid+35*unit,y:h*.4,w:w-mid-70*unit,h:h*.48},address=fit([state.recipient,state.address].filter(Boolean).join('\n'),addressBox,23*unit,font,measure,16*unit);
  if(state.address||state.recipient)svg+=textBlock(address.lines,addressBox.x,addressBox.y,address.size,font,c.ink,'left',1.4);
  else for(let i=0;i<4;i++)svg+=`<path d="M${addressBox.x} ${addressBox.y+(i+1)*42*unit}H${w-m}" stroke="${c.accent}" stroke-opacity=".5"/>`;
  if(state.stamp){const sw=100*unit,sh=112*unit,x=w-m-sw,y=m;svg+=`<rect x="${x}" y="${y}" width="${sw}" height="${sh}" rx="3" fill="none" stroke="${c.accent}" stroke-dasharray="4 5"/>`+textBlock(['PLACE','STAMP','HERE'],x+sw/2,y+23*unit,12*unit,font,c.ink,'center',1.6);}
  return {art:svg,overflow:message.overflow||sender.overflow||address.overflow};
}
export function renderCard(state,side='front',measure=approximateWidth){const {w,h}=FORMATS[state.size],result=side==='back'?back(state,measure):front(state,measure);return {...result,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escape(side==='front'?state.headline||'Postcard front':'Postcard back')}"><title>${escape(side==='front'?state.headline||'Postcard front':'Postcard back')}</title>${result.art}</svg>`};}
