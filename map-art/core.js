// SPDX-License-Identifier: MIT
export const MAX_LAT=85, CIRCUMFERENCE=40075.016686;
export const FORMATS={portrait:[1000,4000/3],tall:[1000,1500],square:[1000,1000],landscape:[4000/3,1000]};
export const PALETTES={
  gallery:{name:'Gallery',paper:'#f8f6f1',ink:'#292d2c',water:'#c1d3da',green:'#d9dfd0'},
  midnight:{name:'Midnight',paper:'#101d29',ink:'#e3c891',water:'#06111c',green:'#203b3c'},
  blueprint:{name:'Blueprint',paper:'#173d61',ink:'#e0edf6',water:'#0b2946',green:'#285572'},
  terracotta:{name:'Terracotta',paper:'#f5ebe1',ink:'#a0523f',water:'#bdcdd2',green:'#d2d7c1'},
  sage:{name:'Sage',paper:'#f1f3eb',ink:'#496454',water:'#afc8c9',green:'#cbd8c3'},
  ink:{name:'Ink & paper',paper:'#fcfcfa',ink:'#151515',water:'#d4d4d2',green:'#e4e4df'},
  amoled:{name:'AMOLED',paper:'#000000',ink:'#91b9b3',water:'#0b1a24',green:'#0b201a'}
};
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const wrapLon=n=>((n+180)%360+360)%360-180;
export function world(lat,lon){const s=Math.sin(clamp(lat,-MAX_LAT,MAX_LAT)*Math.PI/180);return {x:(lon+180)/360,y:.5-Math.log((1+s)/(1-s))/(4*Math.PI)};}
export function unworld(x,y){return {lat:Math.atan(Math.sinh(Math.PI*(1-2*y)))*180/Math.PI,lon:wrapLon(x*360-180)};}
export function defaults(){return {lat:48.8566,lon:2.3522,span:6,format:'portrait',layout:'gallery',palette:'gallery',colors:{...PALETTES.gallery},title:'PARIS',subtitle:'FRANCE',caption:'A place to remember',font:'serif',lineWeight:1,water:true,green:true,buildings:false,paths:false,coordinates:true,pin:false};}
const text=(value,max)=>typeof value==='string'?value.replace(/[\u0000-\u001f]/g,'').slice(0,max):'';
export function cleanState(value){
  const s=defaults();if(!value||typeof value!=='object')return s;
  for(const [key,min,max] of [['lat',-MAX_LAT,MAX_LAT],['lon',-180,180],['span',.5,30],['lineWeight',.4,2.2]])if(Number.isFinite(value[key]))s[key]=clamp(value[key],min,max);
  if(Object.hasOwn(FORMATS,value.format))s.format=value.format;if(['gallery','circle','bleed'].includes(value.layout))s.layout=value.layout;
  if(Object.hasOwn(PALETTES,value.palette))s.palette=value.palette;s.colors={...PALETTES[s.palette]};
  for(const key of ['paper','ink','water','green'])if(/^#[a-f0-9]{6}$/i.test(value.colors?.[key]))s.colors[key]=value.colors[key];
  for(const key of ['water','green','buildings','paths','coordinates','pin'])if(typeof value[key]==='boolean')s[key]=value[key];
  if(['serif','sans'].includes(value.font))s.font=value.font;
  for(const [key,max] of [['title',60],['subtitle',80],['caption',100]])if(typeof value[key]==='string')s[key]=text(value[key],max);
  return s;
}
export function layout(state){
  const [width,height]=FORMATS[state.format],margin=Math.round(width*.065),bottom=Math.round(height*.22);
  const map=state.layout==='bleed'?{x:0,y:0,width,height:height-bottom}:{x:margin,y:margin,width:width-2*margin,height:height-bottom-margin};
  if(state.layout==='circle'){const size=Math.min(map.width,map.height);map.x=(width-size)/2;map.y=margin;map.width=map.height=size;}
  return {width,height,map,textY:state.layout==='circle'?Math.max(map.y+map.height+75,height-bottom+55):height-bottom+70};
}
export function bounds(state){
  const {map}=layout(state),center=world(state.lat,state.lon),width=state.span/(CIRCUMFERENCE*Math.cos(state.lat*Math.PI/180)),height=width*map.height/map.width;
  const y=clamp(center.y,height/2,1-height/2);
  return {x0:center.x-width/2,y0:y-height/2,x1:center.x+width/2,y1:y+height/2,width,height};
}
export function dataKey(state){const b=bounds(state);return [b.x0,b.y0,b.x1,b.y1].map(n=>n.toFixed(10)).join('/')+'/'+Number(state.buildings)+'/'+Number(state.paths);}
export function tileCover(state,maxzoom=14){
  const b=bounds(state);let z=clamp(Math.ceil(Math.log2(2.6/b.width)),0,maxzoom),tiles=[];
  do{const n=2**z;tiles=[];for(let y=Math.max(0,Math.floor(b.y0*n));y<=Math.min(n-1,Math.floor((b.y1-1e-12)*n));y++)for(let x=Math.floor(b.x0*n);x<=Math.floor((b.x1-1e-12)*n);x++)tiles.push({z,x,y,urlX:((x%n)+n)%n});if(tiles.length<=24)break;z--;}while(z>=0);
  return {bounds:b,z,tiles};
}
export function coords(state){return Math.abs(state.lat).toFixed(4)+'° '+(state.lat<0?'S':'N')+' / '+Math.abs(state.lon).toFixed(4)+'° '+(state.lon<0?'W':'E');}
export function dimensions(format,longEdge){const [w,h]=FORMATS[format];return {width:Math.round(w/Math.max(w,h)*longEdge),height:Math.round(h/Math.max(w,h)*longEdge)};}
export function parsePlaces(json){
  if(!Array.isArray(json?.features))return [];
  const seen=new Set();return json.features.flatMap(f=>{const [lon,lat]=f.geometry?.coordinates??[],p=f.properties??{};if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>MAX_LAT||Math.abs(lon)>180)return [];
    const title=text(p.name||p.city||p.street,60)||'Selected place',subtitle=[p.city,p.state,p.country].filter((v,i,a)=>typeof v==='string'&&v!==title&&a.indexOf(v)===i).join(', '),key=lat.toFixed(3)+'/'+lon.toFixed(3);if(seen.has(key))return [];seen.add(key);return [{lat,lon,title,subtitle:text(subtitle,80)}];}).slice(0,6);
}
