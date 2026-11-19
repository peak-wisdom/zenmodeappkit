// SPDX-License-Identifier: MIT
import {VectorTile} from './vendor/vector-tile.js';
import Pbf from './vendor/pbf.js';
import {tileCover,dataKey,parsePlaces} from './core.js';

const layers=['landcover','landuse','park','water','waterway','building','transportation'];
export function validData(data){
  if(data?.version!==1||typeof data.key!=='string'||!Number.isFinite(data.features)||!Array.isArray(data.tiles)||data.tiles.length<1||data.tiles.length>24||!data.bounds)return false;
  if(!['x0','x1','y0','y1','width','height'].every(k=>Number.isFinite(data.bounds[k]))||data.bounds.width<=0||data.bounds.height<=0)return false;
  let points=0;for(const tile of data.tiles){if(![tile.x,tile.y,tile.z].every(Number.isFinite)||!Array.isArray(tile.features))return false;
    for(const f of tile.features){if(!layers.includes(f.layer)||![2,3].includes(f.kind)||!Number.isFinite(f.extent)||f.extent<=0||!Array.isArray(f.geometry))return false;for(const ring of f.geometry){if(!Array.isArray(ring))return false;points+=ring.length;if(points>650000||ring.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))return false;}}
  }return true;
}
function simplify(ring,tolerance=2.5){
  if(ring.length<=5)return ring;const keep=new Uint8Array(ring.length),stack=[[0,ring.length-1]];keep[0]=keep[ring.length-1]=1;
  while(stack.length){const [first,last]=stack.pop(),a=ring[first],b=ring[last],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;let far=-1,distance=tolerance*tolerance;
    for(let i=first+1;i<last;i++){const p=ring[i],t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0,d=(p[0]-a[0]-dx*t)**2+(p[1]-a[1]-dy*t)**2;if(d>distance){distance=d;far=i;}}
    if(far>=0){keep[far]=1;stack.push([first,far],[far,last]);}
  }const result=ring.filter((_,i)=>keep[i]);return result.length<4&&ring[0][0]===ring.at(-1)[0]&&ring[0][1]===ring.at(-1)[1]?ring:result;
}
export function buildingRings(rings,tile,extent,area){
  if(!area)return rings;const n=2**tile.z,minimum=4/1000000*area.width*area.height*n*n*extent*extent;
  let outerSign=0,keep=false;const result=[];
  for(const ring of rings){let twice=0,minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(let i=0,j=ring.length-1;i<ring.length;j=i++){twice+=ring[j][0]*ring[i][1]-ring[i][0]*ring[j][1];minX=Math.min(minX,ring[i][0]);maxX=Math.max(maxX,ring[i][0]);minY=Math.min(minY,ring[i][1]);maxY=Math.max(maxY,ring[i][1]);}const sign=Math.sign(twice);if(!sign)continue;if(!outerSign)outerSign=sign;
    if(sign===outerSign)keep=Math.abs(twice)/2>=minimum&&maxX>=(area.x0*n-tile.x)*extent&&minX<=(area.x1*n-tile.x)*extent&&maxY>=(area.y0*n-tile.y)*extent&&minY<=(area.y1*n-tile.y)*extent;
    if(keep)result.push(ring);
  }return result;
}
export function decodeTile(bytes,tile,buildings=false,paths=false,area=null){
  const source=new VectorTile(new Pbf(new Uint8Array(bytes))),features=[];let points=0;
  for(const name of layers){if(name==='building'&&!buildings)continue;const layer=source.layers[name];if(!layer)continue;
    for(let i=0;i<layer.length;i++){
      const f=layer.feature(i);if(f.type!==2&&f.type!==3)continue;
      const cls=String(f.properties.class??''),sub=String(f.properties.subclass??'');
      if(name==='transportation'&&['rail','transit','aerialway','ferry'].includes(cls))continue;
      if(name==='transportation'&&!paths&&(['path','track'].includes(cls)&&sub!=='pedestrian'))continue;
      if(['landcover','landuse'].includes(name)&&!['wood','grass','forest','meadow','recreation_ground','village_green','garden','park','cemetery','nature_reserve'].includes(cls))continue;
      if(area){const n=2**tile.z,e=layer.extent,box=f.bbox();if(box[2]<(area.x0*n-tile.x)*e||box[0]>(area.x1*n-tile.x)*e||box[3]<(area.y0*n-tile.y)*e||box[1]>(area.y1*n-tile.y)*e)continue;}
      let rings=f.loadGeometry().map(ring=>ring.map(p=>[p.x,p.y]));
      // A tile can merge thousands of separate building footprints into one feature.
      if(name==='building')rings=buildingRings(rings,tile,layer.extent,area);
      const geometry=rings.map(ring=>simplify(ring));if(!geometry.length)continue;points+=geometry.reduce((sum,ring)=>sum+ring.length,0);
      if(points>180000||features.length>14000)throw Error('This area has too much detail. Choose a wider area or another location.');
      features.push({layer:name,kind:f.type,cls,sub,extent:layer.extent,geometry});
    }
  }return {...tile,features};
}
async function jsonRequest(url,signal){const response=await fetch(url,{signal,mode:'cors'});if(!response.ok)throw Error(response.status===429?'The map service is busy. Please wait before trying again.':'Map service unavailable ('+response.status+'). Please try again later.');return response.json();}
export function makeClient(config){
  let metadata=null,searchTime=0;const searches=new Map(),tiles=new Map();
  return {
    async search(query,signal){
      query=query.trim().slice(0,150);if(query.length<2)throw Error('Enter at least two characters, or use coordinates below.');
      const key=query.toLowerCase();if(searches.has(key))return searches.get(key);
      if(Date.now()-searchTime<1200)throw Error('Wait a moment before searching again.');searchTime=Date.now();
      const url=new URL(config.search);url.searchParams.set('q',query);url.searchParams.set('limit','6');const results=parsePlaces(await jsonRequest(url,signal));searches.set(key,results);return results;
    },
    async load(state,signal,progress=()=>{}){
      if(!metadata)metadata=await jsonRequest(config.tilejson,signal);
      const template=metadata.tiles?.find(t=>typeof t==='string'&&t.startsWith('https://tiles.openfreemap.org/'));
      if(!template)throw Error('Map source is unavailable. Please try again later.');
      const cover=tileCover(state,Math.min(14,metadata.maxzoom??14)),result=new Array(cover.tiles.length);let next=0,done=0,totalBytes=0,totalPoints=0;
      async function worker(){while(next<cover.tiles.length){if(signal?.aborted)throw new DOMException('Canceled','AbortError');const index=next++,tile=cover.tiles[index],url=template.replace('{z}',tile.z).replace('{x}',tile.urlX).replace('{y}',tile.y);
        let bytes=tiles.get(url);if(!bytes){const response=await fetch(url,{signal,mode:'cors'});if(!response.ok)throw Error('Map detail could not load ('+response.status+'). Please retry.');bytes=await response.arrayBuffer();if(bytes.byteLength>4000000)throw Error('Map tile too large. Choose a wider view.');totalBytes+=bytes.byteLength;if(totalBytes>24000000)throw Error('This map is too large. Choose a wider view.');tiles.set(url,bytes);if(tiles.size>48)tiles.delete(tiles.keys().next().value);}const parsed=decodeTile(bytes,tile,state.buildings,state.paths,cover.bounds);
        result[index]={...parsed,...tile};totalPoints+=parsed.features.reduce((sum,f)=>sum+f.geometry.reduce((n,r)=>n+r.length,0),0);if(totalPoints>650000)throw Error('This area is very detailed. Try a wider view.');progress(++done,cover.tiles.length);
      }}
      await Promise.all([worker(),worker(),worker()]);
      return {version:1,key:dataKey(state),state:{...state},bounds:cover.bounds,z:cover.z,tiles:result,date:new Date().toISOString(),features:result.reduce((n,t)=>n+t.features.length,0)};
    }
  };
}
