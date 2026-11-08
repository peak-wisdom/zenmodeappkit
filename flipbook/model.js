// SPDX-License-Identifier: MIT
export const MAX_FRAMES=60,MAX_POINTS=120000;
export const SIZES={landscape:[800,600],square:[600,600],portrait:[600,800]};
export const emptyFrame=()=>({id:crypto.randomUUID(),strokes:[]});
export function blankProject(){return{format:'still-flipbook',version:1,name:'My flipbook',width:800,height:600,background:'#fffaf0',fps:8,loop:true,frames:[emptyFrame()]};}
export function pointCount(project){return project.frames.reduce((n,f)=>n+f.strokes.reduce((n,s)=>n+s.points.length,0),0);}
const color=s=>typeof s==='string'&&/^#[0-9a-f]{6}$/i.test(s);
export function validProject(p){
  if(p?.format!=='still-flipbook'||p.version!==1||typeof p.name!=='string'||p.name.length>80||!Object.values(SIZES).some(([w,h])=>p.width===w&&p.height===h)||!color(p.background)||!Number.isInteger(p.fps)||p.fps<2||p.fps>24||typeof p.loop!=='boolean'||!Array.isArray(p.frames)||p.frames.length<1||p.frames.length>MAX_FRAMES)return false;
  let points=0;const ids=new Set();
  for(const f of p.frames){
    if(typeof f?.id!=='string'||f.id.length>80||ids.has(f.id)||!Array.isArray(f.strokes)||f.strokes.length>500)return false;ids.add(f.id);
    for(const s of f.strokes){
      if(!['pen','eraser'].includes(s?.tool)||!color(s.color)||!Number.isFinite(s.width)||s.width<1||s.width>36||!Array.isArray(s.points)||s.points.length<1||s.points.length>3000)return false;
      points+=s.points.length;if(points>MAX_POINTS)return false;
      if(!s.points.every(p=>Array.isArray(p)&&p.length===2&&p.every(v=>Number.isFinite(v)&&v>=0&&v<=1)))return false;
    }
  }return true;
}
export function cleanProject(p){return{format:'still-flipbook',version:1,name:p.name,width:p.width,height:p.height,background:p.background,fps:p.fps,loop:p.loop,frames:p.frames.map(f=>({id:f.id,strokes:f.strokes.map(s=>({tool:s.tool,color:s.color,width:s.width,points:s.points.map(p=>p.slice())}))}))};}
export function frameDelay(index,fps){return(Math.round((index+1)*100/fps)-Math.round(index*100/fps))*10;}
