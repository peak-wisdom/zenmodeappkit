// SPDX-License-Identifier: MIT
import {layout,coords,world} from './core.js';
export const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n).toFixed(3);
const text=(x,y,value,size,fill,extra='')=>`<text x="${num(x)}" y="${num(y)}" font-size="${num(size)}" fill="${fill}" ${extra}>${escape(value)}</text>`;
function mix(a,b,t){return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');}
function geometryPath(feature,tile,b,map){
  const n=2**tile.z,project=p=>({x:map.x+((tile.x+p[0]/feature.extent)/n-b.x0)/b.width*map.width,y:map.y+((tile.y+p[1]/feature.extent)/n-b.y0)/b.height*map.height});
  return feature.geometry.map(ring=>ring.map((p,i)=>{const pt=project(p);return(i?'L':'M')+num(pt.x)+' '+num(pt.y);}).join('')+(feature.kind===3?'Z':'')).join('');
}
const roadWeight=cls=>({motorway:3.1,trunk:2.8,primary:2.2,secondary:1.75,tertiary:1.3,minor:.85,residential:.85,service:.5,path:.32,track:.4})[cls]??.65;
export function renderPoster(state,data){
  const {width,height,map,textY}=layout(state),c=state.colors,b=data.bounds,font=state.font==='serif'?"Georgia,'Times New Roman',serif":"'Segoe UI',Arial,sans-serif";
  const mask=state.layout==='circle'?`<circle cx="${map.x+map.width/2}" cy="${map.y+map.height/2}" r="${map.width/2}"/>`:`<rect x="${map.x}" y="${map.y}" width="${map.width}" height="${map.height}"/>`;
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(state.title||'Map wall art')}"><title>${escape(state.title||'Map wall art')}</title><desc>Street-map artwork centered at ${escape(coords(state))}. OpenFreeMap, © OpenMapTiles, data © OpenStreetMap contributors, ODbL. Data detail varies by location and scale.</desc><defs><clipPath id="art-crop">${mask}</clipPath>${data.tiles.map((tile,index)=>{const n=2**tile.z,x=map.x+(tile.x/n-b.x0)/b.width*map.width,y=map.y+(tile.y/n-b.y0)/b.height*map.height;return `<clipPath id="tile-${index}"><rect x="${num(x)}" y="${num(y)}" width="${num(map.width/b.width/n+.02)}" height="${num(map.height/b.height/n+.02)}"/></clipPath>`;}).join('')}</defs><rect width="${width}" height="${height}" fill="${c.paper}"/><g clip-path="url(#art-crop)" stroke-linejoin="round" stroke-linecap="round">`;
  for(const [index,tile] of data.tiles.entries()){
    svg+=`<g clip-path="url(#tile-${index})">`;
    const ordered=tile.features.filter(f=>f.layer!=='transportation').concat(tile.features.filter(f=>f.layer==='transportation').sort((a,b)=>roadWeight(a.cls)-roadWeight(b.cls)));
    for(const f of ordered){
      let style='';if(['landcover','landuse','park'].includes(f.layer)){if(!state.green)continue;style=`fill="${c.green}" stroke="none" fill-rule="evenodd"`;}
      else if(f.layer==='water'){if(!state.water)continue;style=`fill="${c.water}" stroke="none" fill-rule="evenodd"`;}
      else if(f.layer==='waterway'){if(!state.water)continue;style=`fill="none" stroke="${c.water}" stroke-width="${f.cls==='river'?2.3:.8}"`;}
      else if(f.layer==='building'){if(!state.buildings)continue;style=`fill="${mix(c.paper,c.ink,.15)}" stroke="none" fill-rule="evenodd"`;}
      else if(f.layer==='transportation')style=`fill="none" stroke="${c.ink}" stroke-width="${num(roadWeight(f.cls)*state.lineWeight)}"`;
      else continue;
      svg+=`<path d="${geometryPath(f,tile,b,map)}" ${style}/>`;
    }svg+='</g>';
  }
  if(state.pin){const w=world(state.lat,state.lon),x=map.x+(w.x-b.x0)/b.width*map.width,y=map.y+(w.y-b.y0)/b.height*map.height;svg+=`<g transform="translate(${num(x)} ${num(y)})"><circle r="16" fill="${c.paper}"/><path d="M0 9C-18-3-9-15 0-7C9-15 18-3 0 9Z" fill="${c.ink}"/></g>`;}
  svg+='</g>';
  const titleSize=Math.min(72,(width*.84)/Math.max(1,[...state.title].length*.67)),step=height>1200?43:34,anchor='text-anchor="middle"',center=width/2;
  svg+=`<g font-family="${escape(font)}">`;
  if(state.layout!=='bleed')svg+=`<path d="M${center-34} ${Math.max(map.y+map.height+10,textY-titleSize-22)}H${center+34}" stroke="${c.ink}" stroke-width="1"/>`;
  svg+=text(center,textY,state.title,titleSize,c.ink,anchor+' letter-spacing="4"');
  svg+=text(center,textY+step,state.subtitle,Math.min(19,width*.8/Math.max(1,[...state.subtitle].length*.65)),c.ink,anchor+' letter-spacing="3"');
  svg+=text(center,textY+step+31,state.caption,Math.min(17,width*.8/Math.max(1,[...state.caption].length*.6)),c.ink,anchor+' font-style="italic"');
  if(state.coordinates)svg+=text(center,textY+step+61,coords(state),13,c.ink,anchor+' letter-spacing="1.4"');
  svg+=text(center,height-20,'OpenFreeMap · © OpenMapTiles · Data © OpenStreetMap contributors',10,c.ink,anchor);
  return svg+'</g></svg>';
}
