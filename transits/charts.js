// SPDX-License-Identifier: AGPL-3.0-only
import {SIGNS} from '../birth-chart/core.js';
import {escape} from '../birth-chart/report.js';
export const iconPath=name=>'icons/'+name.toLowerCase()+'.png';
export function normalizeSelection(value,names){
  const list=Array.isArray(value)?value:typeof value==='string'?[value]:[];
  return [...new Set(list.filter(name=>names.includes(name)))];
}
export function toggleSelection(selected,name){return selected.includes(name)?selected.filter(p=>p!==name):[...selected,name];}
const centers=[[500,250],[250,115],[112,250],[250,500],[112,750],[250,885],[500,750],[750,885],[888,750],[750,500],[888,250],[750,115]];
const polygons=[[[500,0],[750,250],[500,500],[250,250]],[[0,0],[500,0],[250,250]],[[0,0],[250,250],[0,500]],[[0,500],[250,250],[500,500],[250,750]],[[0,500],[250,750],[0,1000]],[[0,1000],[250,750],[500,1000]],[[500,500],[750,750],[500,1000],[250,750]],[[500,1000],[750,750],[1000,1000]],[[1000,500],[1000,1000],[750,750]],[[500,500],[750,250],[1000,500],[750,750]],[[1000,0],[1000,500],[750,250]],[[500,0],[1000,0],[750,250]]];
const cells=[[1,0],[2,0],[3,0],[3,1],[3,2],[3,3],[2,3],[1,3],[0,3],[0,2],[0,1],[0,0]];
const inside=(x,y,polygon)=>{
  let result=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const [xi,yi]=polygon[i],[xj,yj]=polygon[j];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)result=!result;
  }return result;
};
export function northSlots(house,count){
  if(!count)return [];
  const [cx,cy]=centers[house],polygon=polygons[house];
  for(let size=count<=3?48:38;size>=10;size-=2){
    const stepX=size+22,stepY=size+28,slots=[];
    for(let row=-8;row<=8;row++)for(let col=-8;col<=8;col++){
      const x=cx+col*stepX,y=cy+20+row*stepY,left=x-(size+16)/2,right=x+(size+16)/2,top=y-size/2-4,bottom=y+size/2+21;
      const clearHeader=right<cx-78||left>cx+78||bottom<cy-72||top>cy-20;
      if(clearHeader&&[[left,top],[right,top],[left,bottom],[right,bottom]].every(([x,y])=>inside(x,y,polygon)))slots.push({x,y,size});
    }
    slots.sort((a,b)=>(a.x-cx)**2+(a.y-cy-20)**2-((b.x-cx)**2+(b.y-cy-20)**2));
    if(slots.length>=count)return slots.slice(0,count).sort((a,b)=>a.y-b.y||a.x-b.x);
  }
  throw new Error('The chart could not place these planets without overlap.');
}
const text=(x,y,value,size=20,fill='#243e34')=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${size}" fill="${fill}">${escape(value)}</text>`;
function marker(p,{x,y,size},selected){
  const active=selected.includes(p.name),label=p.name+(p.motion==='Retrograde'?' R':p.motion==='Stationary'?' S':'');
  return `<g class="chart-planet" data-planet="${p.name}" role="button" tabindex="0" aria-pressed="${active}" aria-label="${active?'Deselect':'Select'} ${p.name}"><title>${label}</title><rect x="${x-size/2-7}" y="${y-size/2-5}" width="${size+14}" height="${size+28}" rx="10" fill="${active?'#d8ebdf':'transparent'}" stroke="${active?'#36765c':'transparent'}" stroke-width="2"/><image href="${iconPath(p.name)}" x="${x-size/2}" y="${y-size/2}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>${text(x,y+size/2+17,label,Math.min(16,size*.32))}</g>`;
}
export function indianChart(bodies,view,asc,selected=[]){
  const groups=Array.from({length:12},()=>[]);bodies.forEach(p=>groups[p.rashi].push(p));
  let out='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" role="group" aria-label="'+(view==='south'?'South':'North')+' Indian planetary transit chart"><rect x="1" y="1" width="998" height="998" rx="4" fill="#fffdf7" stroke="#b8aa8b" stroke-width="3"/>';
  if(view==='south'){
    cells.forEach(([col,row],s)=>{
      const x=col*250,y=row*250,ps=groups[s],cols=Math.min(3,ps.length),rows=Math.ceil(ps.length/Math.max(1,cols)),size=rows>=4?18:rows>=3?32:rows>=2?40:54;
      out+=`<rect x="${x+1}" y="${y+1}" width="248" height="248" fill="${s===asc?'#edf3e9':'#fffdf7'}" stroke="#b8aa8b" stroke-width="2"/>`+text(x+125,y+30,(s+1)+' · '+SIGNS[s],22,'#8b642e')+text(x+125,y+56,'H'+((s-asc+12)%12+1)+(s===asc?' · reference':''),17,'#657469');
      ps.forEach((p,i)=>{const c=i%cols,r=Math.floor(i/cols),n=Math.min(cols,ps.length-r*cols);out+=marker(p,{x:x+125+(c-(n-1)/2)*76,y:y+(rows>=3?70:85)+size/2+r*(size+28),size},selected);});
    });
    out+=text(500,455,'Planetary transits',38)+text(500,505,'House 1: '+SIGNS[asc],27,'#8b642e')+text(500,550,'Fixed signs · chosen reference',22,'#657469');
  }else{
    out+='<path d="M0 0L1000 1000M1000 0L0 1000M500 0L1000 500L500 1000L0 500Z" fill="none" stroke="#b8aa8b" stroke-width="3"/>';
    centers.forEach(([x,y],h)=>{const s=(asc+h)%12,ps=groups[s],slots=northSlots(h,ps.length);out+=text(x,y-53,'H'+(h+1)+' · '+(s+1),21,'#8b642e')+text(x,y-30,SIGNS[s],19,'#657469');ps.forEach((p,i)=>{out+=marker(p,slots[i],selected);});});
  }
  return out+'</svg>';
}
