// SPDX-License-Identifier: MIT
import {BODIES,DAY,MIN,MAX,LIGHT_SECONDS,calculate,nextEvents,motionTrail,restore,defaults,parseUTC,cleanObserver,projectVector,skyPoint,csv} from './core.js';
import {renderScene,phaseSVG} from './view.js';
import {fixtures} from './validation-fixtures.js';

export function runChecks(){
  const results=[],expect=(condition,message)=>{if(!condition)throw Error(message);};
  const test=(name,fn)=>{try{fn();results.push({name,pass:true});}catch(error){results.push({name,pass:false,error:error.message});}};
  const delta=(a,b)=>Math.abs(((a-b+540)%360)-180);
  for(const f of fixtures)test('JPL Horizons · '+f.name+' · '+new Date(f.stamp).toISOString().slice(0,10)+(f.observer?' · local horizon':''),()=>{
    const p=calculate(f.stamp,f.observer,false).find(row=>row.name===f.name);
    if(f.observer){expect(Math.abs(p.altitude-f.altitude)<1/60,'Altitude differs by more than one arcminute.');expect(delta(p.azimuth,f.azimuth)<1/60,'Azimuth differs by more than one arcminute.');}
    else{
      const separation=Math.hypot(delta(p.ra*15,f.ra*15)*Math.cos(p.dec*Math.PI/180),p.dec-f.dec);
      expect(separation<1/60,'Equatorial angular separation exceeds one arcminute.');
      expect(Math.hypot(delta(p.longitude,f.longitude)*Math.cos(p.latitude*Math.PI/180),p.latitude-f.latitude)<1/60,'Ecliptic separation exceeds one arcminute.');
      expect(Math.abs(p.distance/f.distance-1)<.0005,'Geocentric distance differs by more than 0.05%.');
    }
  });
  test('Finite coordinates across the supported date range',()=>{
    for(const stamp of [MIN,Date.UTC(1950,5,1),Date.UTC(2000,0,1,12),Date.UTC(2050,6,15),MAX]){
      const rows=calculate(stamp);expect(rows.length===10,'Missing body.');
      for(const p of rows){expect(p.ra>=0&&p.ra<24&&Math.abs(p.dec)<=90&&p.longitude>=0&&p.longitude<360&&Math.abs(p.latitude)<=90,'Invalid coordinate.');expect(p.distance>0&&p.illuminated>=0&&p.illuminated<=1,'Invalid physical value.');expect(p.altitude===null&&p.azimuth===null,'Missing observer must not invent a location.');expect(Math.abs(p.lightSeconds-p.distance*LIGHT_SECONDS)<1e-8,'Invalid light travel time.');}
    }
  });
  test('UTC parsing rejects impossible dates and accepts leap days',()=>{
    expect(parseUTC('2024-02-29T23:59:59')===Date.UTC(2024,1,29,23,59,59),'Leap day rejected.');
    for(const input of ['2026-02-30T12:00','1899-12-31T23:59','2100-01-01T00:00','2026-11-15T25:00','2026-11-15T12:00Z','']){let rejected=false;try{parseUTC(input);}catch{rejected=true;}expect(rejected,'Invalid date accepted: '+input);}
  });
  test('Observer validation includes the equator and prime meridian',()=>{
    expect(cleanObserver({lat:0,lon:0,height:0})!==null,'Zero coordinate rejected.');
    for(const value of [{lat:91,lon:0,height:0},{lat:0,lon:-181,height:0},{lat:0,lon:0,height:-1},{lat:'12',lon:0,height:0}])expect(cleanObserver(value)===null,'Invalid observer accepted.');
  });
  test('Refresh restores preferences and explored dates without autoplay',()=>{
    const past=Date.UTC(2020,0,1),now=Date.UTC(2026,10,15),saved={...defaults(),stamp:past,mode:'paused',view:'sky',observer:{lat:0,lon:0,height:0},selected:'Moon',zoom:2,labels:false};
    const state=restore(JSON.parse(JSON.stringify(saved)),now);expect(state.stamp===past&&state.mode==='paused'&&state.selected==='Moon'&&state.zoom===2&&state.labels===false&&state.observer.lon===0,'Saved preference lost.');
    const live=restore({...saved,mode:'live'},now);expect(live.stamp===now&&live.mode==='live','Live refresh restored a stale time.');
    const invalid=restore({stamp:NaN,mode:'paused',selected:'bad',zoom:Infinity,observer:{lat:100}},now);expect(invalid.mode==='live'&&invalid.stamp===now&&invalid.selected==='Saturn'&&invalid.observer===null,'Invalid saved data was trusted.');
  });
  test('Topocentric lunar parallax and refraction are applied',()=>{
    const stamp=Date.UTC(2026,10,15,12),observer={lat:12.9716,lon:77.5946,height:0},geometric=calculate(stamp,observer,false),apparent=calculate(stamp,observer,true),moon=geometric.find(p=>p.name==='Moon');
    expect(Math.abs(moon.topoDec-moon.dec)>.05,'Lunar parallax was omitted.');
    const sun=geometric.find(p=>p.name==='Sun'),refracted=apparent.find(p=>p.name==='Sun');expect(refracted.altitude>sun.altitude,'Refraction should lift the low Sun.');
    expect(apparent.every(p=>p.azimuth>=0&&p.azimuth<360&&Math.abs(p.altitude)<=90),'Local coordinates out of range.');
  });
  test('Rise/set times are future events; polar no-event is handled',()=>{
    const stamp=Date.UTC(2026,10,15,12),events=nextEvents('Moon',stamp,{lat:12.9716,lon:77.5946,height:0});
    expect(events.rise>stamp&&events.set>stamp&&events.rise<stamp+2*DAY&&events.set<stamp+2*DAY,'Invalid rise/set window.');
    const polar=nextEvents('Sun',Date.UTC(2026,5,21),{lat:90,lon:0,height:0});expect(polar.rise===null&&polar.set===null,'Polar midnight Sun should have no event in 48 hours.');
    expect(nextEvents('Moon',stamp,null)===null,'A location is required.');
  });
  test('Map projections preserve direction and true distance ratios',()=>{
    const state={...defaults(),scale:'linear',yaw:0,tilt:0,zoom:1},a=projectVector([1,0,0],state),b=projectVector([2,0,0],state);expect(Math.abs((b.x-500)/(a.x-500)-2)<1e-10,'Linear distance ratio changed.');
    const n=skyPoint(0,0),east=skyPoint(0,90),zenith=skyPoint(90,180);expect(n.y===80&&east.x===215&&zenith.x===500&&zenith.y===365,'Sky orientation is wrong.');
  });
  test('Motion trails stop at the lower date boundary',()=>{
    expect(motionTrail('Mars',MIN).length===1,'Trail escaped the lower boundary.');expect(motionTrail('Moon',Date.UTC(2026,10,15)).length===61,'Expected 12-hour samples over 30 days.');
  });
  test('SVG exports have a timestamp, all bodies, and a truthful scale label',()=>{
    const state=defaults(Date.UTC(2026,10,15)),rows=calculate(state.stamp),svg=renderScene(rows,state,[],'CHECK INSTANT');
    expect(svg.includes('CHECK INSTANT')&&svg.includes('COMPRESSED DISTANCES'),'Timestamp or scale missing.');
    for(const p of BODIES)expect(svg.includes('data-body="'+p.name+'"'),'Missing map body: '+p.name);
    const empty=renderScene(rows,{...state,view:'sky'},[]);expect(empty.includes('Add your location'),'Local sky requires an observer.');
    expect(phaseSVG(0).includes('0 percent')&&phaseSVG(1).includes('100 percent'),'Phase schematic lacks an accessible label.');
  });
  test('CSV includes units, exact instant, and location metadata',()=>{
    const stamp=Date.UTC(2026,10,15,12),observer={lat:12.9716,lon:77.5946,height:0},output=csv(calculate(stamp,observer),stamp,observer,true);
    expect(output.split('\r\n').length===11,'CSV must contain 10 bodies and header.');expect(output.includes('2026-11-15T12:00:00.000Z')&&output.includes('Observer east longitude')&&output.includes('standard'),'CSV is missing context.');
  });
  return results;
}
