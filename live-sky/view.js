// SPDX-License-Identifier: MIT
import {projectVector,skyPoint,mapRadius} from './core.js';
export const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=value=>Number(value).toFixed(2);
const text=(x,y,value,size=14,extra='')=>`<text x="${num(x)}" y="${num(y)}" font-size="${size}" ${extra}>${escape(value)}</text>`;
const path=points=>points.map((p,i)=>(i?'L':'M')+num(p.x)+' '+num(p.y)).join(' ');
export function phaseSVG(fraction){
  const k=Math.max(-1,Math.min(1,2*fraction-1)),r=32,x=40,y=40;
  const d=`M${x} ${y-r} A${r} ${r} 0 0 1 ${x} ${y+r} A${Math.max(.001,Math.abs(k)*r)} ${r} 0 0 ${k<0?0:1} ${x} ${y-r}Z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" role="img" aria-label="${Math.round(fraction*100)} percent illuminated; phase schematic"><circle cx="40" cy="40" r="32" fill="#1a2839"/><path d="${d}" fill="#e9dfbe"/></svg>`;
}
function definitions(rows){
  return `<defs><radialGradient id="sky-background"><stop stop-color="#152737"/><stop offset="1" stop-color="#060e18"/></radialGradient><radialGradient id="earth-sphere" cx="32%" cy="28%"><stop stop-color="#8dcde3"/><stop offset=".45" stop-color="#367897"/><stop offset="1" stop-color="#102638"/></radialGradient><clipPath id="earth-clip"><circle r="20"/></clipPath>${rows.map(p=>`<radialGradient id="sphere-${p.name}" cx="30%" cy="25%"><stop stop-color="#fff5df"/><stop offset=".28" stop-color="${p.color}"/><stop offset="1" stop-color="#${p.name==='Sun'?'ac5b21':'14202c'}"/></radialGradient><clipPath id="clip-${p.name}"><circle r="${p.radius}"/></clipPath>`).join('')}</defs>`;
}
function earth(){
  return '<g aria-label="Earth, the reference center"><circle r="29" fill="#76b9d3" opacity=".07"/><circle r="22" fill="none" stroke="#8cc8df" stroke-opacity=".5"/><circle r="20" fill="url(#earth-sphere)"/><g clip-path="url(#earth-clip)" fill="#9cbfa5" opacity=".75"><path d="M-17-9-9-15-3-9-5-3 2 0 0 5-5 7-7 16-12 8-11 1-18-3ZM5-15 18-9 24 0 14 1 9-4 5-3 1-10ZM11 8 18 10 15 17 8 15Z"/></g><text x="0" y="43" text-anchor="middle" font-size="14" font-weight="600" fill="#bce9e1">EARTH</text><text x="0" y="59" text-anchor="middle" font-size="10" fill="#9eafc3">reference center</text></g>';
}
function planet(p,point,selected,sky=false){
  const r=sky?Math.max(7,p.radius*.7):p.radius;
  let art=`<circle r="${r}" fill="url(#sphere-${p.name})"/>`;
  if(!sky&&p.name==='Jupiter')art+=`<g clip-path="url(#clip-Jupiter)" fill="none" stroke="#8a6152" stroke-opacity=".45"><path d="M-20-8Q0-3 20-8M-20 2Q0 7 20 2M-20 10Q0 14 20 10" stroke-width="3"/></g>`;
  if(p.name==='Saturn')art+=`<ellipse rx="${r*1.8}" ry="${r*.48}" fill="none" stroke="#d2c39a" stroke-width="${sky?2:3}" transform="rotate(-24)" opacity=".8"/>`;
  if(p.name==='Sun')art=`<circle r="${r+7}" fill="#efb44e" opacity=".08"/>`+art;
  return `<g class="body-marker" data-body="${p.name}" tabindex="0" role="button" aria-pressed="${selected}" aria-label="Select ${p.name}${sky?', altitude '+p.altitude.toFixed(1)+' degrees':''}" transform="translate(${num(point.x)} ${num(point.y)})"><title>${p.name}</title><circle r="24" fill="transparent"/>${selected?`<circle r="${Math.max(22,r+8)}" fill="none" stroke="#bce9e1" stroke-width="1.5" stroke-dasharray="3 4"/>`:''}${art}</g>`;
}
function labels(points,selected,all){
  const chosen=points.filter(p=>all||p.name===selected),result=[];
  for(const right of [false,true]){
    const group=chosen.filter(p=>(p.point.x>=500)===right).sort((a,b)=>a.point.y-b.point.y);
    let last=70;for(const p of group){p.labelY=Math.max(last+45,Math.min(640,p.point.y));last=p.labelY;}
    if(last>650){const shift=last-650;for(const p of group)p.labelY-=shift;}
    for(const p of group){const x=right?895:105,end=right?876:124,anchor=right?'end':'start';
      result.push(`<g class="body-label" data-body="${p.name}" style="cursor:pointer"><path d="M${num(p.point.x)} ${num(p.point.y)}L${end} ${num(p.labelY-4)}" stroke="${p.color}" stroke-opacity=".3" fill="none"/>${text(x,p.labelY-8,p.name,15,`text-anchor="${anchor}" fill="${p.color}" font-weight="600"`)}${text(x,p.labelY+9,p.distance<.01?Math.round(p.km).toLocaleString('en-US')+' km':p.distance.toFixed(3)+' AU',11,`text-anchor="${anchor}" fill="#93a9bc"`)}</g>`);
    }
  }return result.join('');
}
function space(rows,state,trail){
  const pieces=[];
  // Background points are decorative, not a star catalog.
  for(let i=0;i<85;i++){const x=(i*173+71)%980+10,y=(i*277+31)%660+50;pieces.push(`<circle cx="${x}" cy="${y}" r="${i%4===0?1.3:.7}" fill="#bfd8ea" opacity="${i%3===0?.3:.12}"/>`);}
  for(const au of [.01,1,5,30]){
    const radius=mapRadius(au,state.scale)*290*state.zoom;if(radius<8)continue;
    const circle=Array.from({length:97},(_,i)=>{const a=i/96*2*Math.PI;return projectVector([au*Math.cos(a),au*Math.sin(a),0],state);});
    pieces.push(`<path d="${path(circle)}Z" fill="none" stroke="#7897b3" stroke-opacity=".18" stroke-dasharray="${au===1?'none':'3 7'}"/>`);
    const p=projectVector([au,0,0],state);pieces.push(text(p.x+8,p.y+16,au+' AU',10,'fill="#738ca2"'));
  }
  const zero=projectVector([42,0,0],state),quarter=projectVector([0,42,0],state);
  pieces.push(`<path d="M${num(zero.x)} ${num(zero.y)}L500 365L${num(quarter.x)} ${num(quarter.y)}" stroke="#7698ae" stroke-opacity=".18" fill="none"/>`);
  pieces.push(text(zero.x,zero.y+30,'0° · equinox',11,'fill="#93a9bc" text-anchor="middle"'));
  if(state.trail&&trail.length){const spec=rows.find(p=>p.name===state.selected);pieces.push(`<path d="${path(trail.map(v=>projectVector(v,state)))}" fill="none" stroke="${spec.color}" stroke-width="2" opacity=".55" stroke-dasharray="2 4"/>`);}
  const points=rows.map(p=>({...p,point:projectVector(p.vector,state)}));
  const ordered=[...points,{name:'Earth',point:{x:500,y:365,depth:0}}].sort((a,b)=>a.point.depth-b.point.depth);
  for(const p of ordered)pieces.push(p.name==='Earth'?'<g transform="translate(500 365)">'+earth()+'</g>':planet(p,p.point,p.name===state.selected));
  pieces.push(labels(points,state.selected,state.labels));
  pieces.push(text(32,718,state.scale==='linear'?'TRUE DISTANCE RATIOS · 42 AU reference radius':'COMPRESSED DISTANCES · logarithmic radial scale',11,'fill="#9eafc3" letter-spacing="1.2"'));
  pieces.push(text(968,718,'Planet sizes & surfaces are illustrative',11,'fill="#9eafc3" text-anchor="end"'));
  return pieces.join('');
}
function sky(rows,state){
  if(!state.observer)return `<circle cx="500" cy="365" r="285" fill="#132332" stroke="#547382" stroke-dasharray="3 9"/>${text(500,340,'A sky of your own.',27,'fill="#c3e7e1" text-anchor="middle"')}${text(500,380,'Add your location below to see what is above your horizon.',15,'fill="#a4b8c9" text-anchor="middle"')}`;
  const pieces=['<circle cx="500" cy="365" r="285" fill="#0c1c29" stroke="#81b2af" stroke-opacity=".6"/>'];
  for(const altitude of [0,30,60]){
    const r=(90-altitude)/90*285;pieces.push(`<circle cx="500" cy="365" r="${r}" fill="none" stroke="#6c92a3" stroke-opacity=".3" stroke-dasharray="3 7"/>`+text(506,365-r+17,altitude+'°',11,'fill="#8aa9b8"'));
  }
  for(let a=0;a<360;a+=45){const p=skyPoint(0,a);pieces.push(`<path d="M500 365L${num(p.x)} ${num(p.y)}" stroke="#6c92a3" stroke-opacity=".2"/>`);}
  for(const [name,az] of [['N',0],['E',90],['S',180],['W',270]]){const p=skyPoint(-8,az);pieces.push(text(p.x,p.y+5,name,18,'text-anchor="middle" fill="#bce9e1"'));}
  pieces.push(text(500,359,'+',17,'text-anchor="middle" fill="#92b3c5"')+text(500,384,'zenith · 90°',10,'text-anchor="middle" fill="#92b3c5"'));
  const above=rows.filter(p=>p.altitude>=0).map(p=>({...p,point:skyPoint(p.altitude,p.azimuth)}));
  for(const p of above)pieces.push(planet(p,p.point,p.name===state.selected,true));
  pieces.push(labels(above,state.selected,state.labels));
  if(!above.some(p=>p.name===state.selected))pieces.push(text(500,690,state.selected+' is below the horizon at this instant.',14,'text-anchor="middle" fill="#b7c8d9"'));
  pieces.push(text(500,724,'LOOKING UP · north at top, east at left · only bodies above the horizon are drawn',12,'text-anchor="middle" fill="#9eafc3"'));
  return pieces.join('');
}
export function renderScene(rows,state,trail=[],caption=''){
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 760" role="group" aria-label="${state.view==='space'?'Earth-centered planetary positions':'Local sky above the horizon'}"><style>text{font-family:system-ui,sans-serif}.body-marker:focus{outline:none}.body-marker:focus circle:first-of-type{stroke:#fff;stroke-width:2}</style>${definitions(rows)}<rect width="1000" height="760" fill="url(#sky-background)"/>${text(32,34,state.view==='space'?'EARTH / LIVE SKY':'YOUR LOCAL SKY',11,'fill="#bce9e1" letter-spacing="2"')}${text(968,34,caption,12,'fill="#a4b8c9" text-anchor="end"')}${state.view==='space'?space(rows,state,trail):sky(rows,state)}</svg>`;
}
