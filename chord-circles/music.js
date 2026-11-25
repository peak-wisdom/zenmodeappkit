// SPDX-License-Identifier: MIT
export const mod=(n,m=12)=>(n%m+m)%m;
export const FIFTHS=[0,7,2,9,4,11,6,1,8,3,10,5];
export const TONICS={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
export const SCALES={
  major:{name:'Major / Ionian',notes:[0,2,4,5,7,9,11]},
  minor:{name:'Natural minor / Aeolian',notes:[0,2,3,5,7,8,10]},
  harmonic:{name:'Harmonic minor',notes:[0,2,3,5,7,8,11]},
  melodic:{name:'Melodic minor (ascending)',notes:[0,2,3,5,7,9,11]},
  dorian:{name:'Dorian',notes:[0,2,3,5,7,9,10]},
  phrygian:{name:'Phrygian',notes:[0,1,3,5,7,8,10]},
  lydian:{name:'Lydian',notes:[0,2,4,6,7,9,11]},
  mixolydian:{name:'Mixolydian',notes:[0,2,4,5,7,9,10]},
  locrian:{name:'Locrian',notes:[0,1,3,5,6,8,10]}
};
const q=(name,symbol,intervals,degrees=[0,2,4,6,8])=>({name,symbol,intervals,degrees});
export const QUALITIES={
  major:q('Major','',[0,4,7]),minor:q('Minor','m',[0,3,7]),
  dim:q('Diminished','dim',[0,3,6]),aug:q('Augmented','+',[0,4,8]),
  maj7:q('Major seventh','maj7',[0,4,7,11]),minor7:q('Minor seventh','m7',[0,3,7,10]),
  dom7:q('Dominant seventh','7',[0,4,7,10]),halfDim:q('Half-diminished seventh','m7♭5',[0,3,6,10]),
  dim7:q('Diminished seventh','dim7',[0,3,6,9]),minorMaj7:q('Minor major seventh','m(maj7)',[0,3,7,11]),
  augMaj7:q('Augmented major seventh','maj7♯5',[0,4,8,11]),aug7:q('Augmented seventh','7♯5',[0,4,8,10]),
  sus2:q('Suspended second','sus2',[0,2,7],[0,1,4]),
  sus4:q('Suspended fourth','sus4',[0,5,7],[0,3,4]),
  add9:q('Major add nine','add9',[0,4,7,14],[0,2,4,8]),
  minorAdd9:q('Minor add nine','m(add9)',[0,3,7,14],[0,2,4,8]),
  sixth:q('Major sixth','6',[0,4,7,9],[0,2,4,5]),
  minor6:q('Minor sixth','m6',[0,3,7,9],[0,2,4,5]),
  maj9:q('Major ninth','maj9',[0,4,7,11,14]),
  minor9:q('Minor ninth','m9',[0,3,7,10,14]),
  dom9:q('Dominant ninth','9',[0,4,7,10,14]),
  power:q('Power fifth','5',[0,7,12],[0,4,7])
};
export const INSTRUMENTS={piano:'Piano',guitar:'Plucked guitar',pad:'Warm pad',bell:'Soft bells'};
export const STYLES={block:'Whole chord',strum:'Gentle strum',up:'Arpeggio up',down:'Arpeggio down',bounce:'Arpeggio up & down',alberti:'Alberti pattern'};
const sharp=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'],flat=['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'],letters=['C','D','E','F','G','A','B'],naturals=[0,2,4,5,7,9,11];
export const displayKey=key=>key.replaceAll('#','♯').replaceAll('b','♭');
const ascii=name=>name.replaceAll('♯','#').replaceAll('♭','b');
export function validSpelling(name,pc){if(typeof name!=='string'||!/^([A-G])(?:#{1,2}|b{1,2})?$/.test(name))return false;return mod(naturals[letters.indexOf(name[0])]+(name.match(/#/g)||[]).length-(name.match(/b/g)||[]).length)===pc;}
export function spell(pc,letter){const index=letters.indexOf(letter),distance=mod(pc-naturals[index]+6)-6;return letter+(distance>0?'♯'.repeat(distance):'♭'.repeat(-distance));}
export function scaleNotes(s){const root=TONICS[s.key],letter=letters.indexOf(s.key[0]);return SCALES[s.scale].notes.map((n,i)=>({pc:mod(root+n),name:spell(mod(root+n),letters[(letter+i)%7])}));}
export function noteName(pc,s={key:'C',scale:'major',naming:'auto'}){
  pc=mod(pc);if(s.naming==='sharps')return sharp[pc];if(s.naming==='flats')return flat[pc];
  const found=scaleNotes(s).find(n=>n.pc===pc);if(found)return found.name;
  return (s.key.includes('b')||['C','F'].includes(s.key)?flat:sharp)[pc];
}
export function chordRoot(chord,s){if(s.naming==='auto'&&validSpelling(chord.spelling,chord.root))return displayKey(chord.spelling);const fromScale=scaleNotes(s).find(n=>n.pc===chord.root);if(s.naming==='auto'&&!fromScale&&QUALITIES[chord.quality].intervals[1]===3)return ['C','C♯','D','E♭','E','F','F♯','G','G♯','A','B♭','B'][chord.root];return noteName(chord.root,s);}
export function chordTones(chord,s){const root=chordRoot(chord,s),letter=letters.indexOf(root[0]),quality=QUALITIES[chord.quality];return quality.intervals.map((n,i)=>({pc:mod(chord.root+n),name:s.naming==='auto'?spell(mod(chord.root+n),letters[mod(letter+quality.degrees[i],7)]):noteName(chord.root+n,s)}));}
export function chordName(chord,s,notes=null){let name=chordRoot(chord,s)+QUALITIES[chord.quality].symbol;if(notes?.length&&mod(notes[0])!==chord.root)name+='/'+(chordTones(chord,s).find(n=>n.pc===mod(notes[0]))?.name??noteName(notes[0],s));return name;}
export function diatonic(s,sevenths=false){
  const intervals=SCALES[s.scale].notes,root=TONICS[s.key];
  return intervals.map((n,i)=>{
    const tones=Array.from({length:sevenths?4:3},(_,j)=>{const k=i+j*2;return intervals[k%7]+12*Math.floor(k/7)-n;});
    const quality=Object.keys(QUALITIES).find(key=>JSON.stringify(QUALITIES[key].intervals)===JSON.stringify(tones));
    return {root:mod(root+n),quality:quality??'major',spelling:ascii(scaleNotes(s)[i].name),degree:i,beats:4,inversion:0};
  });
}
export function roman(chord,s){
  const degree=diatonic(s).findIndex(c=>c.root===chord.root);if(degree<0)return 'Chromatic';
  const q=QUALITIES[chord.quality],minor=q.intervals[1]===3,base=['I','II','III','IV','V','VI','VII'][degree],extension=q.intervals.length===5?'9':'7',suffix=chord.quality==='halfDim'?'ø7':chord.quality.startsWith('dim')?'°'+(q.intervals.length===4?'7':''):q.intervals[2]===8?'+'+(q.intervals.length===4?(q.intervals[3]===11?'maj7':'7'):''):chord.quality==='power'?'5':chord.quality==='sus2'?'sus2':chord.quality==='sus4'?'sus4':chord.quality==='add9'||chord.quality==='minorAdd9'?'add9':chord.quality==='sixth'||chord.quality==='minor6'?'6':q.intervals.length>=4?(q.intervals[3]===11?'maj'+extension:extension):'';
  return (minor?base.toLowerCase():base)+suffix;
}
export function inScale(chord,s){const notes=scaleNotes(s).map(n=>n.pc);return QUALITIES[chord.quality].intervals.every(n=>notes.includes(mod(chord.root+n)));}
export function wheelChord(root,minor,s){
  let quality=minor?'minor':'major';
  if(s.wheel==='sevenths'){const found=diatonic(s,true).find(c=>c.root===root&&QUALITIES[c.quality].intervals[1]===(minor?3:4)&&QUALITIES[c.quality].intervals[2]===7);quality=found?.quality??(minor?'minor7':'maj7');}
  if(s.wheel==='dominants')quality=minor?'minor7':'dom7';
  const outer=minor?mod(root+3):root,outerName=['C','Db','D','Eb','E','F',s.key.includes('b')?'Gb':'F#','G','Ab','A','Bb','B'][outer],name=minor?ascii(spell(root,letters[mod(letters.indexOf(outerName[0])+5,7)])):outerName;
  return {root,quality,spelling:name,beats:s.beats,inversion:0};
}
export function voice(chord,s){
  const base=12*(s.octave+1)+chord.root,intervals=QUALITIES[chord.quality].intervals;
  let notes=intervals.map(n=>base+n),inversion=Math.min(chord.inversion,notes.length-1);
  while(inversion--){notes.push(notes.shift()+12);notes.sort((a,b)=>a-b);}
  if(s.voicing==='open'&&notes.length>2){notes[1]+=12;notes.sort((a,b)=>a-b);}
  if(s.bass)notes.unshift(base-12);
  return [...new Set(notes)].sort((a,b)=>a-b);
}
export function voicedProgression(s){
  let previous=null;
  return s.steps.map(chord=>{
    let best=voice(chord,s);
    if(s.leading&&previous){
      let cost=Infinity;
      for(let inversion=0;inversion<QUALITIES[chord.quality].intervals.length;inversion++)for(const shift of [-12,0,12]){
        const notes=voice({...chord,inversion},{...s,bass:false}).map(n=>n+shift);
        if(notes[0]<36||notes.at(-1)>96)continue;
        const score=notes.reduce((sum,n,i)=>sum+Math.abs(n-previous[Math.min(i,previous.length-1)]),0)+Math.abs(notes.reduce((a,b)=>a+b)/notes.length-previous.reduce((a,b)=>a+b)/previous.length)*.3;
        if(score<cost){cost=score;best=notes;}
      }
      previous=best;
      if(s.bass){let bass=12*s.octave+chord.root;while(bass>=best[0])bass-=12;best=[bass,...best].sort((a,b)=>a-b);}
    }else previous=voice(chord,{...s,bass:false});
    return [...new Set(best)];
  });
}
export function chordEvents(notes,beats,s,from=0){
  if(s.style==='block'||s.style==='strum')return notes.map((midi,i)=>({midi,beat:from+(s.style==='strum'?i*.055:0),duration:Math.max(.08,beats-from-(s.style==='strum'?i*.055:0)),velocity:1/Math.sqrt(notes.length)})).filter(e=>e.beat<beats);
  let order=s.style==='down'?[...notes].reverse():s.style==='bounce'?[...notes,...notes.slice(1,-1).reverse()]:s.style==='alberti'?[notes[0],notes.at(-1),notes[Math.min(1,notes.length-1)],notes.at(-1)]:notes;
  const events=[],sub=s.subdivision;
  for(let i=0;i<Math.ceil(beats*sub);i++){
    const beat=i/sub+(i%2?(s.swing/50-1)/sub:0);
    if(beat<from-1e-7||beat>=beats)continue;
    events.push({midi:order[i%order.length],beat,duration:Math.min(.9/sub,beats-beat),velocity:.8});
  }return events;
}
export function arrangement(s,repeats=1){
  const notes=voicedProgression(s),events=[],segments=[];let beat=0;
  for(let repeat=0;repeat<repeats;repeat++)s.steps.forEach((chord,index)=>{segments.push({index,beat,beats:chord.beats,notes:notes[index]});for(const e of chordEvents(notes[index],chord.beats,s))events.push({...e,beat:e.beat+beat});beat+=chord.beats;});
  return {events,segments,beats:beat,seconds:beat*60/s.bpm};
}
export const PRESETS={
  pop:{name:'Pop · I–V–vi–IV',scale:'major',degrees:[0,4,5,3],sevenths:false},
  warm:{name:'Warm · Imaj7–vi7–ii7–V7',scale:'major',degrees:[0,5,1,4],sevenths:true},
  jazz:{name:'Jazz · ii7–V7–Imaj7',scale:'major',degrees:[1,4,0],sevenths:true},
  minor:{name:'Minor · i–VI–III–VII',scale:'minor',degrees:[0,5,2,6],sevenths:false},
  cadence:{name:'Minor cadence · iiø7–V7–i',scale:'harmonic',degrees:[1,4,0],sevenths:true},
  dorian:{name:'Dorian · i7–IV7',scale:'dorian',degrees:[0,3],sevenths:true},
  fifths:{name:'Diatonic descending fifths',scale:'major',degrees:[0,3,6,2,5,1,4,0],sevenths:true},
  dominants:{name:'Full circle of dominants',scale:'major',degrees:[],sevenths:true}
};
export function preset(name,s){
  const p=PRESETS[name],settings={...s,scale:p.scale},diatonicChords=diatonic(settings,p.sevenths);
  const steps=name==='dominants'?Array.from({length:12},(_,i)=>({root:mod(TONICS[s.key]+5*i),quality:'dom7',inversion:0,beats:s.beats})):p.degrees.map(d=>({...diatonicChords[d],beats:s.beats}));
  if(name==='cadence')steps[steps.length-1].quality='minor';
  return {...settings,sevenths:p.sevenths,wheel:name==='dominants'?'dominants':p.sevenths?'sevenths':'triads',selected:{...steps[0]},steps};
}
export function defaults(){
  const s={format:'still-chord-circles',version:1,key:'C',scale:'major',naming:'auto',wheel:'triads',sevenths:false,direction:'fifths',instrument:'piano',style:'block',bpm:96,volume:55,reverb:16,subdivision:2,swing:50,octave:3,voicing:'close',bass:false,leading:true,beats:4,loop:true,metronome:false,animations:true,connections:true,tapSound:true,transposeKey:true,repeats:1,exportClick:false,selected:{root:0,quality:'major',spelling:'C',inversion:0,beats:4},steps:[]};
  return preset('pop',s);
}
export function validChord(c){return !!c&&Number.isInteger(c.root)&&c.root>=0&&c.root<12&&Object.hasOwn(QUALITIES,c.quality)&&Number.isInteger(c.inversion)&&c.inversion>=0&&c.inversion<QUALITIES[c.quality].intervals.length&&Number.isFinite(c.beats)&&c.beats>=.5&&c.beats<=16&&(c.spelling===undefined||validSpelling(c.spelling,c.root));}
export function validProject(s){return !!s&&s.format==='still-chord-circles'&&s.version===1&&Array.isArray(s.steps)&&s.steps.length<=32&&s.steps.every(validChord)&&validChord(s.selected);}
export function cleanProject(value){
  const s=defaults();if(!value||typeof value!=='object')return s;
  for(const [key,allowed] of Object.entries({key:Object.keys(TONICS),scale:Object.keys(SCALES),naming:['auto','sharps','flats'],wheel:['triads','sevenths','dominants'],direction:['fifths','fourths'],instrument:Object.keys(INSTRUMENTS),style:Object.keys(STYLES),voicing:['close','open']}))if(allowed.includes(value[key]))s[key]=value[key];
  for(const [key,min,max] of [['bpm',40,200],['volume',0,100],['reverb',0,50],['swing',50,75]])if(Number.isFinite(value[key]))s[key]=Math.round(Math.max(min,Math.min(max,value[key])));
  if([1,2,4].includes(value.subdivision))s.subdivision=value.subdivision;
  if([1,2,4].includes(value.repeats))s.repeats=value.repeats;
  if([2,3,4].includes(value.octave))s.octave=value.octave;
  if([.5,1,2,3,4,6,8,12,16].includes(value.beats))s.beats=value.beats;
  for(const key of ['sevenths','bass','leading','loop','metronome','animations','connections','tapSound','transposeKey','exportClick'])if(typeof value[key]==='boolean')s[key]=value[key];
  const chord=c=>({root:c.root,quality:c.quality,...(c.spelling?{spelling:c.spelling}:{}),inversion:c.inversion,beats:c.beats});
  if(validChord(value.selected))s.selected=chord(value.selected);
  if(Array.isArray(value.steps))s.steps=value.steps.filter(validChord).slice(0,32).map(chord);
  return s;
}
export function transpose(s,delta,key=null){
  const newKey=key??Object.keys(TONICS).find(k=>TONICS[k]===mod(TONICS[s.key]+delta)&&!k.includes('#'))??'C';
  const settings={...s,key:newKey},shift=c=>{const chord={...c,root:mod(c.root+delta)};delete chord.spelling;chord.spelling=ascii(chordRoot(chord,settings));return chord;};
  return {...settings,selected:shift(s.selected),steps:s.steps.map(shift)};
}
