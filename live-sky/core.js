// SPDX-License-Identifier: MIT
import * as A from './vendor/astronomy.js';

export const DAY=86400000, AU_KM=149597870.7, LIGHT_SECONDS=AU_KM/299792.458;
export const MIN=Date.UTC(1900,0,1), MAX=Date.UTC(2100,0,1)-1;
export const BODIES=[
  {name:'Sun',color:'#ffd580',radius:17,kind:'Star'},
  {name:'Moon',color:'#d5dfed',radius:11,kind:'Natural satellite'},
  {name:'Mercury',color:'#b8b1a5',radius:8,kind:'Rocky planet'},
  {name:'Venus',color:'#edcf9e',radius:11,kind:'Rocky planet'},
  {name:'Mars',color:'#ed987b',radius:9,kind:'Rocky planet'},
  {name:'Jupiter',color:'#d9b998',radius:16,kind:'Gas giant'},
  {name:'Saturn',color:'#e2d2a2',radius:13,kind:'Gas giant'},
  {name:'Uranus',color:'#a9e3e9',radius:11,kind:'Ice giant'},
  {name:'Neptune',color:'#81a9f3',radius:10,kind:'Ice giant'},
  {name:'Pluto',color:'#c7b5aa',radius:7,kind:'Dwarf planet'}
];
export const norm=n=>((n%360)+360)%360;
const radians=n=>n*Math.PI/180;
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function validStamp(stamp){return Number.isFinite(stamp)&&stamp>=MIN&&stamp<=MAX;}
export function parseUTC(value){
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value))throw Error('Choose a complete UTC date and time.');
  const stamp=Date.parse(value+'Z');
  if(!validStamp(stamp)||new Date(stamp).toISOString().slice(0,value.length)!==value)throw Error('Choose a valid UTC date between 1900 and 2099.');
  return stamp;
}
export function cleanObserver(value){
  if(!value||!Number.isFinite(value.lat)||!Number.isFinite(value.lon)||!Number.isFinite(value.height)||Math.abs(value.lat)>90||Math.abs(value.lon)>180||value.height<0||value.height>10000)return null;
  return {lat:value.lat,lon:value.lon,height:value.height,label:typeof value.label==='string'?value.label.trim().slice(0,60):''};
}
export function defaults(now=Date.now()){
  return {mode:'live',stamp:clamp(now,MIN,MAX),view:'space',scale:'compressed',selected:'Saturn',labels:true,trail:true,refraction:true,observer:null,yaw:25,tilt:52,zoom:1,speed:DAY};
}
export function restore(value,now=Date.now()){
  const state=defaults(now);if(!value||typeof value!=='object')return state;
  if(value.mode==='paused'&&validStamp(value.stamp)){state.mode='paused';state.stamp=value.stamp;}
  for(const key of ['labels','trail','refraction'])if(typeof value[key]==='boolean')state[key]=value[key];
  if(['space','sky'].includes(value.view))state.view=value.view;
  if(['compressed','linear'].includes(value.scale))state.scale=value.scale;
  if(BODIES.some(p=>p.name===value.selected))state.selected=value.selected;
  for(const [key,min,max] of [['yaw',-360,360],['tilt',0,90],['zoom',.6,2.5]])if(Number.isFinite(value[key]))state[key]=clamp(value[key],min,max);
  if([3600000,DAY,7*DAY,-3600000,-DAY,-7*DAY].includes(value.speed))state.speed=value.speed;
  state.observer=cleanObserver(value.observer);return state;
}
export function calculate(stamp,location=null,refraction=true){
  if(!validStamp(stamp))throw Error('This date is outside the supported range, 1900–2099.');
  const date=new Date(stamp),rotation=A.Rotation_EQJ_EQD(date),sun=A.GeoVector(A.Body.Sun,date,true);
  const place=cleanObserver(location),observer=place?new A.Observer(place.lat,place.lon,place.height):null;
  return BODIES.map(spec=>{
    const vector=spec.name==='Sun'?sun:A.GeoVector(spec.name,date,true),ecl=A.Ecliptic(vector),eqj=A.EquatorFromVector(vector);
    const eq=A.EquatorFromVector(A.RotateVector(rotation,vector)),illum=A.Illumination(spec.name,date);
    const row={...spec,distance:vector.Length(),vector:[ecl.vec.x,ecl.vec.y,ecl.vec.z],longitude:ecl.elon,latitude:ecl.elat,ra:eq.ra,dec:eq.dec,constellation:A.Constellation(eqj.ra,eqj.dec).name,magnitude:illum.mag,illuminated:illum.phase_fraction,phaseAngle:illum.phase_angle,elongation:spec.name==='Sun'?0:A.AngleBetween(vector,sun),altitude:null,azimuth:null,topoRA:null,topoDec:null};
    row.km=row.distance*AU_KM;row.lightSeconds=row.distance*LIGHT_SECONDS;
    if(observer){
      const top=A.Equator(spec.name,date,observer,true,true),horizontal=A.Horizon(date,observer,top.ra,top.dec,refraction?'normal':undefined);
      row.altitude=horizontal.altitude;row.azimuth=horizontal.azimuth;row.topoRA=top.ra;row.topoDec=top.dec;
    }
    return row;
  });
}
export function nextEvents(name,stamp,location){
  const place=cleanObserver(location);if(!place||!BODIES.some(p=>p.name===name)||!validStamp(stamp))return null;
  const observer=new A.Observer(place.lat,place.lon,place.height),date=new Date(stamp),days=Math.min(2,(MAX-stamp)/DAY);
  if(days<=0)return {rise:null,set:null};
  const search=direction=>A.SearchRiseSet(name,observer,direction,date,days)?.date.getTime()??null;
  return {rise:search(1),set:search(-1)};
}
export function motionTrail(name,stamp){
  if(!BODIES.some(p=>p.name===name))return [];
  const end=Math.floor(stamp/DAY)*DAY,points=[];
  for(let i=60;i>=0;i--){const time=end-i*DAY/2;if(time<MIN||time>MAX)continue;const p=A.Ecliptic(A.GeoVector(name,new Date(time),true));points.push([p.vec.x,p.vec.y,p.vec.z]);}
  return points;
}
export function mapRadius(distance,scale){return scale==='linear'?distance/42:Math.log1p(distance/.00001)/Math.log1p(42/.00001);}
export function projectVector(vector,settings){
  const distance=Math.hypot(...vector),r=mapRadius(distance,settings.scale)*290*settings.zoom;
  const yaw=radians(settings.yaw),tilt=radians(settings.tilt),[x,y,z]=vector.map(v=>v/distance*r);
  const a=x*Math.cos(yaw)-y*Math.sin(yaw),b=x*Math.sin(yaw)+y*Math.cos(yaw);
  return {x:500+a,y:365-b*Math.cos(tilt)+z*Math.sin(tilt),depth:b*Math.sin(tilt)+z*Math.cos(tilt)};
}
export function skyPoint(altitude,azimuth){
  const r=(90-altitude)/90*285,a=radians(azimuth);
  return {x:500-r*Math.sin(a),y:365-r*Math.cos(a)};
}
export function skyLight(sunAltitude){
  if(sunAltitude===null)return 'Add a location for your local sky.';
  if(sunAltitude>=0)return 'Daylight';if(sunAltitude>=-6)return 'Civil twilight';if(sunAltitude>=-12)return 'Nautical twilight';if(sunAltitude>=-18)return 'Astronomical twilight';return 'Dark sky';
}
export function csv(rows,stamp,observer,refraction){
  const header=['UTC','Body','Geocentric RA of date (hours)','Geocentric declination of date (degrees)','True ecliptic longitude of date (degrees)','True ecliptic latitude of date (degrees)','Distance from Earth (AU)','Distance from Earth (km)','Light travel time (seconds)','Illuminated fraction','Visual magnitude','Sun separation (degrees)','IAU constellation','Topocentric altitude (degrees)','Topocentric azimuth (degrees)','Observer latitude','Observer east longitude','Observer elevation (m)','Atmospheric refraction'];
  const data=rows.map(p=>[new Date(stamp).toISOString(),p.name,p.ra,p.dec,p.longitude,p.latitude,p.distance,p.km,p.lightSeconds,p.illuminated,p.magnitude,p.elongation,p.constellation,p.altitude??'',p.azimuth??'',observer?.lat??'',observer?.lon??'',observer?.height??'',observer?(refraction?'standard':'none'):'not applicable']);
  return [header,...data].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
}
