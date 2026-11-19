// SPDX-License-Identifier: MIT
import {FORMATS,OCCASIONS,COLORS,defaults,cleanProject,validProject,validPhoto,palette,random,imagePlacement,imageURL,eventLines} from './core.js';
import {backgroundSVG} from './backgrounds.js';
import {renderCard,wrapText} from './render.js';
import {recover} from './storage.js';
import {withDpi,svgForPrint,buildPDF} from './export.js';

export async function runChecks(){
  const results=[];
  const assert=(value,message)=>{if(!value)throw Error(message);};
  const test=async(name,fn)=>{try{await fn();results.push({name,ok:true});}catch(error){results.push({name,ok:false,error:error.message});}};
  const base=defaults(),photo={id:'fixture',dataURL:'data:image/png;base64,AAAA',width:1200,height:800,name:'Fixture'};
  await test('All occasion and size combinations produce finite, self-contained artwork',()=>{
    for(const [occasion,o] of Object.entries(OCCASIONS))for(const size of Object.keys(FORMATS)){
      const state={...base,occasion,size,headline:o.headline,message:o.messages[0]},svg=renderCard(state).svg;
      assert(!/NaN|undefined|Infinity|<script|https?:\/\//.test(svg.replace('http://www.w3.org/2000/svg','')),'Invalid output: '+occasion+'/'+size);
      assert(svg.includes(o.headline.replaceAll('&','&amp;')),'Missing greeting: '+occasion);
      assert(o.palettes.every(p=>Object.hasOwn(COLORS,p)),'Unknown occasion palette');
    }
  });
  await test('Design codes reproduce artwork; new codes and occasions change it',()=>{
    assert(backgroundSVG(base)===backgroundSVG({...base}),'A code must reproduce a design');
    assert(backgroundSVG(base)!==backgroundSVG({...base,seed:'a-different-code'}),'New code had no effect');
    const a=random('repeat'),b=random('repeat');for(let i=0;i<20;i++)assert(a()===b(),'Seed sequence changed');
    assert(backgroundSVG(base)!==backgroundSVG({...base,occasion:'graduation'}),'Occasion did not affect the art');
    assert(OCCASIONS.birthday.family==='birthday'&&OCCASIONS.graduation.family==='graduation'&&OCCASIONS.babyshower.family==='nursery','Celebration families changed');
  });
  await test('Import rejects oversized text, unsupported versions, and active SVG images',()=>{
    assert(validProject(base),'Default card rejected');
    assert(!validProject({...base,message:'x'.repeat(651)}),'Oversized message accepted');
    assert(!validProject({...base,version:2}),'Unknown version accepted');
    assert(!validProject({...base,occasion:'constructor'}),'Inherited occasion accepted');
    assert(!validPhoto({...photo,dataURL:'data:image/svg+xml;base64,AAAA'}),'Active SVG accepted');
    assert(!validPhoto({...photo,width:Infinity}),'Invalid dimensions accepted');
    assert(!validPhoto({...photo,dataURL:'https://example.com/a.png'}),'Remote reference accepted as embedded data');
  });
  await test('Imported settings are whitelisted and bounded without losing editable words',()=>{
    const s=cleanProject({...base,headline:'Hello <world>\u0001',size:'bad',zoom:99,panX:-99,textScale:0,rotation:45,date:'2027-02-30',colors:{paper:'url(x)',ink:'#123456'},source:'photo',photo:null});
    assert(s.headline==='Hello <world>'&&s.size==='classic'&&s.zoom===2.5&&s.panX===-1&&s.textScale===.7&&s.rotation===0&&s.date===''&&s.source==='illustration','Settings not normalized');
    assert(s.colors.ink==='#123456'&&s.colors.paper===base.colors.paper,'Invalid color accepted');
  });
  await test('Every rotated crop covers the complete card without exposing empty edges',()=>{
    for(const size of Object.keys(FORMATS))for(const rotation of [0,90,180,270])for(const panX of [-1,0,1])for(const panY of [-1,0,1]){
      const s={...base,size,photo,source:'photo',rotation,zoom:1.4,panX,panY},p=imagePlacement(s),f=FORMATS[size];
      assert(p.x<=.001&&p.y<=.001&&p.x+p.width>=f.w-.001&&p.y+p.height>=f.h-.001,'Crop exposes an edge');
      const theta=rotation*Math.PI/180,corners=[[0,0],[p.imageWidth,0],[0,p.imageHeight],[p.imageWidth,p.imageHeight]].map(([x,y])=>[p.translate[0]+x*Math.cos(theta)-y*Math.sin(theta),p.translate[1]+x*Math.sin(theta)+y*Math.cos(theta)]);
      assert(Math.abs(Math.min(...corners.map(c=>c[0]))-p.x)<.001&&Math.abs(Math.min(...corners.map(c=>c[1]))-p.y)<.001,'Rotation translation disagrees with crop');
    }
  });
  await test('Image links require credential-free HTTPS',()=>{
    assert(imageURL('https://example.com/photo.jpg')==='https://example.com/photo.jpg','HTTPS rejected');
    for(const url of ['http://example.com/a.png','javascript:alert(1)','data:image/png;base64,AAAA','https://name:password@example.com/a.png','not a link']){let rejected=false;try{imageURL(url);}catch{rejected=true;}assert(rejected,'Unsafe link accepted: '+url);}
  });
  await test('Text wraps paragraphs, long words, and complete emoji graphemes',()=>{
    const measure=text=>[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].length;
    const lines=wrapText('one two\n\n👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦',2,1,'sans',measure);
    assert(lines.includes('')&&lines.includes('👩‍👩‍👧‍👦👩‍👩‍👧‍👦')&&lines.at(-1)==='👩‍👩‍👧‍👦','Paragraph or grapheme split');
    assert(wrapText('ABCDEFGHI',3,1,'sans',s=>s.length).join('|')==='ABC|DEF|GHI','Long word not wrapped');
  });
  await test('Overflow is reported and front exports do not include back-only details',()=>{
    const s={...base,headline:'<script>alert("x")</script>',message:'hello & goodbye',address:'PRIVATE_ADDRESS_123',sender:'PRIVATE_SENDER_456',backMessage:'PRIVATE_NOTE_789'};
    const front=renderCard(s),back=renderCard(s,'back');
    assert(front.svg.includes('&lt;script&gt;')&&!front.svg.includes('<script>'),'Text not escaped');
    assert(!/PRIVATE_ADDRESS|PRIVATE_SENDER|PRIVATE_NOTE/.test(front.svg),'Back details leaked into front');
    assert(back.svg.includes('PRIVATE_ADDRESS')&&back.svg.includes('PRIVATE_NOTE'),'Back details missing');
    assert(!renderCard(base).overflow,'Default birthday does not fit');
    assert(renderCard({...base,layout:'band',message:'WWWW '.repeat(130),headline:'A very long headline '.repeat(4),textScale:1.4}).overflow,'Front overflow not detected');
    assert(renderCard({...base,backMessage:'W'.repeat(900)},'back').overflow,'Back overflow not detected');
  });
  await test('Invitation dates keep their entered calendar day and hide when disabled',()=>{
    const s={...base,event:true,date:'2027-03-20',time:'2 pm',venue:'The garden',rsvp:'Please reply'};
    assert(eventLines(s).length===3&&eventLines(s)[0].includes('20'),'Date or details lost');
    assert(eventLines({...s,event:false}).length===0,'Disabled event details shown');
  });
  await test('Interrupted saves recover latest words and only the matching valid image',()=>{
    const record={project:{...base,source:'photo',photo},stamp:10},meta={project:{...base,source:'photo',headline:'Latest words',photo:null},photoID:'fixture',stamp:11};
    let recovered=recover(record,meta);assert(recovered.project.headline==='Latest words'&&recovered.project.photo.id==='fixture'&&!recovered.photoMissing,'Latest draft not merged');
    recovered=recover(record,{...meta,photoID:'other'});assert(recovered.photoMissing&&!recovered.project.photo&&recovered.project.source==='illustration','Wrong image restored');
    recovered=recover({...record,project:{...record.project,photo:{...photo,width:-1}}},meta);assert(recovered.photoMissing&&!recovered.project.photo,'Corrupt image reported as recovered');
    assert(recover(record,{...meta,stamp:9}).project.headline===base.headline,'Older metadata replaced newer card');
    assert(recover(null,null)===null,'Empty storage should start a new card');
  });
  await test('SVG exports have exact physical dimensions for all four print sizes',()=>{
    for(const [size,f] of Object.entries(FORMATS)){const svg=svgForPrint(renderCard({...base,size}).svg,size);assert(svg.includes('width="'+(f.inches[0]*25.4).toFixed(2)+'mm" height="'+(f.inches[1]*25.4).toFixed(2)+'mm"'),'Wrong physical size');}
  });
  await test('PNG export sets one 300-DPI pHYs chunk with a valid CRC',async()=>{
    const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,0,73,69,78,68,174,66,96,130]);
    const first=await withDpi(new Blob([png])),bytes=new Uint8Array(await(await withDpi(first)).arrayBuffer()),dv=new DataView(bytes.buffer);let count=0;
    for(let p=8;p<bytes.length;){const length=dv.getUint32(p),kind=String.fromCharCode(...bytes.slice(p+4,p+8));if(kind==='pHYs'){count++;assert(dv.getUint32(p+8)===11811&&dv.getUint32(p+12)===11811&&bytes[p+16]===1,'Wrong DPI');let crc=-1;for(const byte of bytes.slice(p+4,p+8+length)){crc^=byte;for(let bit=0;bit<8;bit++)crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1;}assert((~crc>>>0)===dv.getUint32(p+8+length),'Bad PNG CRC');}p+=length+12;}
    assert(count===1,'Duplicate or missing DPI chunk');
  });
  await test('PDF has two correct-size pages and byte-accurate cross references',async()=>{
    const bytes=new Uint8Array(await buildPDF([new Uint8Array([255,216,255,217]),new Uint8Array([255,216,255,217])],'classic').arrayBuffer()),text=new TextDecoder('latin1').decode(bytes),xref=Number(/startxref\n(\d+)/.exec(text)[1]);
    assert(text.slice(xref,xref+4)==='xref'&&/\/Count 2\b/.test(text),'PDF index or page count wrong');
    assert((text.match(/\/MediaBox \[0 0 432 288\]/g)||[]).length===2,'Wrong page dimensions');
    const rows=text.slice(xref).split('\n');for(let id=1;id<=8;id++){const offset=Number(rows[2+id].slice(0,10));assert(text.slice(offset).startsWith(id+' 0 obj\n'),'Bad PDF object offset '+id);}
    assert((text.match(/\/Width 1800 \/Height 1200/g)||[]).length===2,'Wrong PDF image resolution');
  });
  return results;
}
