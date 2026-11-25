// SPDX-License-Identifier: MIT
import {defaults,SCALES,TONICS,QUALITIES,FIFTHS,diatonic,chordName,chordTones,scaleNotes,voice,voicedProgression,chordEvents,arrangement,preset,transpose,validProject,cleanProject,validChord,wheelChord,validSpelling} from './music.js';
import {midi,wav} from './exports.js';
import {wheelSVG,order} from './wheel.js';
export async function runChecks(){
  const results=[],assert=(value,message)=>{if(!value)throw Error(message);},test=async(name,fn)=>{try{await fn();results.push({name,ok:true});}catch(error){results.push({name,ok:false,error:error.message});}},base=defaults();
  await test('C major contains the expected seven triads and seventh chords',()=>{
    assert(diatonic(base).map(c=>c.quality).join(',')==='major,minor,minor,major,major,minor,dim','Wrong major triads');
    assert(diatonic(base,true).map(c=>c.quality).join(',')==='maj7,minor7,minor7,maj7,dom7,minor7,halfDim','Wrong major sevenths');
    assert(diatonic(base).map(c=>chordName(c,base)).join(',')==='C,Dm,Em,F,G,Am,Bdim','Wrong chord labels');
  });
  await test('A harmonic minor provides B half-diminished and E dominant seventh',()=>{
    const s={...base,key:'A',scale:'harmonic'},chords=diatonic(s,true);
    assert(chords[1].root===11&&chords[1].quality==='halfDim','Wrong iiø7');
    assert(chords[4].root===4&&chords[4].quality==='dom7','Wrong V7');
    assert(chords[0].quality==='minorMaj7'&&chords[2].quality==='augMaj7'&&chords[6].quality==='dim7','Wrong harmonic minor sevenths');
  });
  await test('Dorian, Mixolydian, and melodic minor have their characteristic harmony',()=>{
    assert(diatonic({...base,key:'D',scale:'dorian'})[3].quality==='major','Dorian IV should be major');
    assert(diatonic({...base,key:'G',scale:'mixolydian'},true)[0].quality==='dom7','Mixolydian tonic should be dominant 7');
    const melodic=diatonic({...base,key:'A',scale:'melodic'},true);assert(melodic[5].quality==='halfDim'&&melodic[6].quality==='halfDim','Melodic minor sixth/seventh wrong');
  });
  await test('Enharmonic spelling retains E-sharp, B-sharp, and diminished sevenths',()=>{
    assert(scaleNotes({...base,key:'F#'}).map(n=>n.name).join(' ')==='F♯ G♯ A♯ B C♯ D♯ E♯','F-sharp major spelling wrong');
    assert(scaleNotes({...base,key:'C#'}).at(-1).name==='B♯','C-sharp leading note should be B-sharp');
    const tones=chordTones({root:0,quality:'dim7'},base).map(n=>n.name);assert(tones.join(' ')==='C E♭ G♭ B♭♭','Diminished seventh spelling wrong');assert(chordName(wheelChord(1,true,base),base)==='C♯m','E major must pair with C-sharp minor');assert(chordName(wheelChord(6,true,base),base)==='F♯m','A major must pair with F-sharp minor');assert(!validSpelling('Db',0),'Wrong enharmonic root accepted');
  });
  await test('Every key and scale yields recognized, valid triads and sevenths',()=>{
    for(const key of Object.keys(TONICS))for(const scale of Object.keys(SCALES))for(const sevenths of [false,true]){
      const s={...base,key,scale},chords=diatonic(s,sevenths);assert(chords.length===7&&chords.every(validChord),'Invalid chord in '+key+' '+scale);
      for(const chord of chords){const pitches=QUALITIES[chord.quality].intervals.map(n=>(n+chord.root)%12);assert(pitches.every(pc=>scaleNotes(s).some(n=>n.pc===pc)),'Non-diatonic quality fallback in '+key+' '+scale);}
    }
  });
  await test('The fifths and fourths circles visit all twelve pitches in opposite orders',()=>{
    assert(new Set(FIFTHS).size===12&&FIFTHS[0]===0&&FIFTHS[1]===7&&FIFTHS[11]===5,'Wrong fifths order');
    assert(order({...base,direction:'fourths'}).slice(0,4).join(',')==='0,5,10,3','Wrong fourths order');
    const svg=wheelSVG(base);assert((svg.match(/data-root=/g)||[]).length===24&&!/NaN|undefined|Infinity/.test(svg),'Invalid interactive wheel');
  });
  await test('Inversions and open voicings preserve pitches and select the right bass',()=>{
    const chord={root:0,quality:'major',inversion:1,beats:4};
    assert(voice(chord,{...base,bass:false}).join(',')==='52,55,60','First inversion incorrect');
    assert(voice({...chord,inversion:2},{...base,bass:false}).join(',')==='55,60,64','Second inversion incorrect');
    assert(voice({...chord,inversion:0},{...base,voicing:'open',bass:false}).join(',')==='48,55,64','Open voicing incorrect');
    assert(voice(chord,{...base,bass:true})[0]===36,'Low root bass incorrect');
  });
  await test('Automatic voice leading keeps every chord tone and avoids large root-position jumps',()=>{
    const voices=voicedProgression(base),rootVoices=voicedProgression({...base,leading:false});
    const distance=rows=>rows.slice(1).reduce((sum,row,i)=>sum+row.reduce((total,n,j)=>total+Math.abs(n-rows[i][j]),0),0);
    assert(distance(voices)<distance(rootVoices),'Voice leading did not reduce movement');
    voices.forEach((notes,i)=>{const expected=QUALITIES[base.steps[i].quality].intervals.map(n=>(base.steps[i].root+n)%12);assert(notes.every(n=>expected.includes(n%12))&&expected.every(pc=>notes.some(n=>n%12===pc)),'Voice leading changed the harmony');});
  });
  await test('Transposition preserves chord qualities, rhythm, and round-trip pitch classes',()=>{
    const shifted=transpose(base,2,'D');assert(shifted.steps.map(c=>c.root).join(',')==='2,9,11,7','Wrong D-major progression');
    assert(shifted.steps.map(c=>c.quality).join(',')===base.steps.map(c=>c.quality).join(','),'Qualities changed');
    assert(transpose(shifted,-2,'C').steps.every((c,i)=>['root','quality','inversion','beats','spelling'].every(k=>c[k]===base.steps[i][k])),'Transpose round-trip failed');
    assert(preset('dominants',base).steps.map(c=>c.root).join(',')==='0,5,10,3,8,1,6,11,4,9,2,7','Wrong dominant resolutions');
  });
  await test('Arpeggios, swing, and partial-chord resume keep events inside their chord',()=>{
    const s={...base,style:'up',subdivision:2,swing:75},events=chordEvents([48,52,55],2,s);
    assert(events.map(e=>e.beat).join(',')==='0,0.75,1,1.75','Wrong swung eighth-note timing');
    assert(events.map(e=>e.midi).join(',')==='48,52,55,48','Wrong arpeggio order');
    const resumed=chordEvents([48,52,55],2,s,.6);assert(resumed.every(e=>e.beat>=.6&&e.beat+e.duration<=2.000001),'Resume scheduled out-of-bounds events');
    for(const style of ['block','strum','up','down','bounce','alberti'])assert(chordEvents([48,52,55,59,62],.5,{...base,style}).every(e=>e.beat>=0&&e.duration>0&&e.beat+e.duration<=.50001),'Short chord event exceeds its boundary');
  });
  await test('Songs validate on import and restore bounded settings without autoplay state',()=>{
    assert(validProject(base),'Default song invalid');assert(!validProject({...base,version:2}),'Unsupported version accepted');assert(!validProject({...base,steps:Array(33).fill(base.steps[0])}),'Too many chords accepted');assert(!validProject({...base,selected:{...base.selected,quality:'constructor'}}),'Inherited quality accepted');
    const s=cleanProject({...base,bpm:999,volume:-1,key:'bad',octave:99,playing:true,selected:{...base.selected,root:12}});assert(s.bpm===200&&s.volume===0&&s.key==='C'&&s.octave===3&&s.selected.root===0&&!Object.hasOwn(s,'playing'),'Unsafe settings restored');
  });
  await test('MIDI contains valid tempo, matched note events, and the full arrangement length',async()=>{
    const bytes=new Uint8Array(await midi(base,2).arrayBuffer()),view=new DataView(bytes.buffer),tag=(a,b)=>String.fromCharCode(...bytes.slice(a,b));
    assert(tag(0,4)==='MThd'&&view.getUint32(4)===6&&view.getUint16(8)===0&&view.getUint16(12)===480&&tag(14,18)==='MTrk','Invalid MIDI header');
    assert(view.getUint32(18)===bytes.length-22,'MIDI track length wrong');
    let p=22,tick=0,tempo=0,notes=0,ending=false;const held=new Map(),readVariable=()=>{let n=0,b;do{b=bytes[p++];n=n*128+(b&127);}while(b&128);return n;};
    while(p<bytes.length){tick+=readVariable();const status=bytes[p++];if(status===255){const type=bytes[p++],length=readVariable();if(type===81)tempo=(bytes[p]<<16)|(bytes[p+1]<<8)|bytes[p+2];if(type===47)ending=true;p+=length;}else if((status&240)===192)p++;else{const note=bytes[p++],velocity=bytes[p++];assert(note<=127&&velocity<=127,'Invalid MIDI note or velocity');if((status&240)===144&&velocity){notes++;held.set(note,(held.get(note)||0)+1);}else{const count=held.get(note)||0;assert(count>0,'MIDI note off without note on');held.set(note,count-1);}}}
    assert(tempo===625000&&tick===15360&&notes>0&&ending&&[...held.values()].every(n=>n===0),'MIDI timing or note lifetimes incorrect');
  });
  await test('WAV has stereo PCM headers and clamps peaks correctly',async()=>{
    const channels=[new Float32Array([0,.5,-1,2]),new Float32Array([-.5,1,0,-2])],buffer={length:4,numberOfChannels:2,sampleRate:44100,getChannelData:n=>channels[n]},bytes=await wav(buffer).arrayBuffer(),view=new DataView(bytes),tag=(a,n)=>String.fromCharCode(...new Uint8Array(bytes,a,n));
    assert(tag(0,4)==='RIFF'&&tag(8,4)==='WAVE'&&view.getUint16(22,true)===2&&view.getUint32(24,true)===44100&&view.getUint16(34,true)===16,'Invalid WAV header');
    assert(view.getUint32(40,true)===16&&view.getInt16(56,true)===32767&&view.getInt16(58,true)===-32768,'WAV sample encoding incorrect');
    assert(arrangement(base).beats===16&&arrangement(base).seconds===10,'Default arrangement duration incorrect');
  });
  return results;
}
