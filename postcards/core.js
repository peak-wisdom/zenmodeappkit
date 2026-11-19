// SPDX-License-Identifier: MIT
export const FORMATS={classic:{name:'Classic · 6 × 4 in',w:900,h:600,inches:[6,4]},portrait:{name:'Portrait · 5 × 7 in',w:750,h:1050,inches:[5,7]},square:{name:'Square · 6 × 6 in',w:900,h:900,inches:[6,6]},wide:{name:'Large · 7 × 5 in',w:1050,h:750,inches:[7,5]}};
export const COLORS={
  petal:{name:'Rose & cream',paper:'#fff6ef',ink:'#66364c',accent:'#da8494',second:'#e2ad69'},
  sky:{name:'Blue skies',paper:'#f1f8fd',ink:'#23465b',accent:'#7fb3cf',second:'#e7bd72'},
  sage:{name:'Sage garden',paper:'#f4f7ef',ink:'#3e5848',accent:'#90ac88',second:'#d6ab78'},
  gold:{name:'Golden hour',paper:'#fff7e7',ink:'#69502c',accent:'#d6aa56',second:'#b67d68'},
  lilac:{name:'Lavender',paper:'#f7f2fe',ink:'#57436c',accent:'#ad96cf',second:'#dda5b3'},
  clay:{name:'Terracotta',paper:'#fff4eb',ink:'#744536',accent:'#cc896c',second:'#9ba98a'},
  navy:{name:'Midnight gold',paper:'#102b3e',ink:'#fff3d9',accent:'#dfb864',second:'#90b9bb'},
  mint:{name:'Mint & peach',paper:'#eff9f4',ink:'#365b51',accent:'#8ec4b3',second:'#e8af91'}
};
const occasion=(label,family,headline,messages,palettes,font='serif')=>({label,family,headline,messages,palettes,font});
export const OCCASIONS={
  birthday:occasion('Birthday','birthday','Happy Birthday!',['Wishing you a day full of laughter, little surprises, and everything you love.','Here’s to another wonderful trip around the sun. May this year be your brightest yet.','Celebrating you today, and all the joy you bring to the world.'],['petal','sky','mint','lilac'],'rounded'),
  graduation:occasion('Graduation','graduation','You did it!',['Your hard work has opened a new door. Here’s to the adventures waiting on the other side.','Dream boldly. Keep learning. The world is ready for what you’ll do next.','So proud of everything you have accomplished. This is only the beginning.'],['navy','gold','sage']),
  babyshower:occasion('Baby shower','nursery','A little joy is on the way',['Join us in celebrating a tiny new beginning and a whole lot of love.','The sweetest adventure is about to begin. Showering your growing family with love.','A little wonder, a lot of love, and a beautiful new chapter ahead.'],['mint','sky','lilac','petal']),
  newbaby:occasion('New baby','nursery','Welcome, little one',['So much love for someone so small. Wishing your family beautiful first moments together.','A new little person. A whole new world of love. Congratulations!','May your days be filled with tiny smiles, warm cuddles, and wonderful discoveries.'],['sky','mint','petal']),
  wedding:occasion('Wedding','wedding','A beautiful beginning',['May your life together be full of kindness, adventure, and a love that grows every day.','Two hearts. One wonderful story. Wishing you a lifetime of happiness together.','Here’s to the promises you make and all the memories still to come.'],['sage','petal','gold']),
  anniversary:occasion('Anniversary','love','Another year of us',['Every ordinary day with you is something worth celebrating. Here’s to many more.','A love that keeps growing, a story that keeps getting better. Happy anniversary.','For all we have shared, and all the chapters still ahead.'],['petal','clay','navy']),
  thankyou:occasion('Thank you','botanical','A little note of thanks',['Your kindness made a difference. Thank you for being so thoughtful.','Some people make the world feel a little warmer. You are one of them. Thank you.','Grateful for your time, your care, and the thought you put into everything you do.'],['sage','mint','clay']),
  congratulations:occasion('Congratulations','fireworks','Something worth celebrating',['You made it happen. So happy to celebrate this wonderful moment with you.','A well-earned achievement and an exciting new chapter. Congratulations!','Here’s to your hard work, your courage, and everything that comes next.'],['gold','navy','lilac']),
  getwell:occasion('Get well soon','garden','Sending a little sunshine',['Wishing you rest, comfort, and brighter days ahead. Take all the time you need.','Thinking of you and sending warm wishes, one gentle day at a time.','A little note to remind you that you are loved and being thought of.'],['sage','sky','mint']),
  mothersday:occasion('Mother’s Day','botanical','For all your love',['For the little things, the big things, and everything in between. Thank you.','You make ordinary days feel special. Celebrating you with so much love.','A little card for someone who means more than words can say.'],['petal','lilac','sage']),
  fathersday:occasion('Father’s Day','mountains','For all you do',['For your steady encouragement, your kindness, and all the adventures we share. Thank you.','The best memories are the ones we make together. Celebrating you today.','Here’s to the stories, the laughter, and everything you have taught me.'],['sky','sage','navy']),
  friendship:occasion('Friendship','friendship','So glad there is you',['Life is a little brighter, funnier, and kinder with you in it.','For the conversations, the adventures, and the comfortable silences. Thank you for being my friend.','A small hello for someone who makes a big difference.'],['mint','petal','sky'],'rounded'),
  love:occasion('Love & Valentine’s','love','You are my favorite',['Of all the little things I love about life, you are my favorite.','A little reminder that you are loved, today and every day.','For the everyday moments that become wonderful because of you.'],['petal','clay','lilac']),
  newyear:occasion('New Year','fireworks','To fresh beginnings',['Wishing you a year of good company, small joys, and wonderful new possibilities.','Here’s to the moments we will remember and the adventures we have yet to find.','May the coming year bring peace, laughter, and a little room to dream.'],['navy','gold','sky']),
  christmas:occasion('Christmas','winter','Warm Christmas wishes',['Wishing you a season filled with warmth, good company, and moments to treasure.','May your celebrations be bright and your home be full of love.','Sending a little festive cheer and a whole lot of warm wishes.'],['sage','petal','gold']),
  diwali:occasion('Diwali','diwali','A little more light',['May the festival of lights bring warmth, joy, and beautiful new beginnings to your home.','Wishing you bright celebrations, sweet moments, and a year filled with happiness.','May every little light bring a little more hope, peace, and togetherness.'],['gold','clay','navy']),
  eid:occasion('Eid','eid','Eid Mubarak',['Wishing you and your loved ones peace, happiness, and a beautiful celebration together.','May this special day bring kindness, gratitude, and moments to treasure.','Sending warm wishes for a joyful Eid and blessings for the days ahead.'],['navy','sage','gold']),
  invitation:occasion('Invitation','invitation','You are invited',['Good company makes a special day even better. We would love to celebrate with you.','A lovely occasion, a few favorite people, and a little time together. Please join us.','Save a little space in your calendar for something wonderful.'],['petal','gold','mint']),
  travel:occasion('Travel & greetings','travel','Greetings from here',['A little piece of this place, sent with a lot of love. Wish you were here.','Collecting moments, finding new favorites, and thinking of you along the way.','New places, small adventures, and a postcard to bring you along.'],['sky','clay','sage'])
};
export const FONTS={serif:"Georgia,'Times New Roman',serif",sans:"'Segoe UI',Arial,sans-serif",rounded:"'Trebuchet MS',Arial,sans-serif",handwritten:"'Comic Sans MS','Bradley Hand',cursive"};
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function hash(value){let h=2166136261;for(const c of String(value)){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function random(seed){let n=hash(seed);return()=>{n+=0x6d2b79f5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function newSeed(){const bytes=new Uint32Array(2);if(globalThis.crypto?.getRandomValues)crypto.getRandomValues(bytes);else{bytes[0]=Math.random()*4294967296;bytes[1]=Date.now();}return [...bytes].map(n=>n.toString(36)).join('-');}
export function defaults(){return {format:'still-postcard',version:1,view:'front',occasion:'birthday',seed:'a-little-celebration',style:'soft',palette:'auto',colors:{...COLORS.petal},size:'classic',layout:'center',font:'auto',align:'center',textScale:1,panel:88,texture:true,source:'illustration',photo:null,zoom:1,panX:0,panY:0,rotation:0,headline:OCCASIONS.birthday.headline,recipient:'',message:OCCASIONS.birthday.messages[0],signature:'With love',event:false,date:'',time:'',venue:'',rsvp:'',backMessage:'A little note, just for you.',address:'',sender:'',stamp:true};}
const limits={headline:100,recipient:80,message:650,signature:100,time:60,venue:140,rsvp:120,backMessage:900,address:400,sender:250,seed:60};
export function validPhoto(photo){return !!photo&&typeof photo.dataURL==='string'&&photo.dataURL.length<=14000000&&/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]+=*$/i.test(photo.dataURL)&&Number.isFinite(photo.width)&&Number.isFinite(photo.height)&&photo.width>0&&photo.height>0&&photo.width<=3000&&photo.height<=3000;}
export function validProject(value){return !!value&&typeof value==='object'&&value.format==='still-postcard'&&value.version===1&&Object.hasOwn(OCCASIONS,value.occasion)&&Object.entries(limits).every(([key,max])=>value[key]===undefined||typeof value[key]==='string'&&value[key].length<=max)&&(value.photo===null||value.photo===undefined||validPhoto(value.photo));}
export function cleanProject(value){
  const s=defaults();if(!value||typeof value!=='object')return s;
  if(Object.hasOwn(OCCASIONS,value.occasion))s.occasion=value.occasion;
  for(const key of Object.keys(limits))if(typeof value[key]==='string')s[key]=value[key].replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').slice(0,limits[key]);
  for(const [key,options] of Object.entries({view:['front','back'],style:['soft','cut','line'],palette:['auto','custom',...Object.keys(COLORS)],size:Object.keys(FORMATS),layout:['center','left','band'],font:['auto',...Object.keys(FONTS)],align:['left','center'],source:['illustration','photo']}))if(options.includes(value[key]))s[key]=value[key];
  for(const [key,min,max] of [['textScale',.7,1.4],['panel',0,100],['zoom',1,2.5],['panX',-1,1],['panY',-1,1]])if(Number.isFinite(value[key]))s[key]=clamp(value[key],min,max);
  if([0,90,180,270].includes(value.rotation))s.rotation=value.rotation;
  for(const key of ['texture','event','stamp'])if(typeof value[key]==='boolean')s[key]=value[key];
  for(const key of ['paper','ink','accent','second'])if(/^#[a-f0-9]{6}$/i.test(value.colors?.[key]))s.colors[key]=value.colors[key];
  if(typeof value.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value.date)&&!Number.isNaN(Date.parse(value.date+'T12:00:00Z'))&&new Date(value.date+'T12:00:00Z').toISOString().startsWith(value.date))s.date=value.date;
  if(validPhoto(value.photo))s.photo={id:typeof value.photo.id==='string'?value.photo.id.slice(0,60):'photo-'+hash(value.photo.dataURL),dataURL:value.photo.dataURL,width:value.photo.width,height:value.photo.height,name:typeof value.photo.name==='string'?value.photo.name.slice(0,100):'Background image'};
  if(s.source==='photo'&&!s.photo)s.source='illustration';return s;
}
export function palette(state){if(state.palette==='custom')return state.colors;const names=OCCASIONS[state.occasion].palettes,key=state.palette==='auto'?names[hash(state.seed+'-palette')%names.length]:state.palette;return COLORS[key]??COLORS.petal;}
export function typeface(state){return FONTS[state.font==='auto'?OCCASIONS[state.occasion].font:state.font]??FONTS.serif;}
export function eventLines(state){if(!state.event)return [];let date='';if(state.date){const [y,m,d]=state.date.split('-').map(Number);date=new Date(Date.UTC(y,m-1,d,12)).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'});}return [[date,state.time].filter(Boolean).join(' · '),state.venue,state.rsvp].filter(Boolean);}
export function imagePlacement(state){
  const {w,h}=FORMATS[state.size],photo=state.photo;if(!photo)return null;
  const rotated=state.rotation%180!==0,iw=rotated?photo.height:photo.width,ih=rotated?photo.width:photo.height,scale=Math.max(w/iw,h/ih)*state.zoom,dw=iw*scale,dh=ih*scale,x=(w-dw)*(state.panX+1)/2,y=(h-dh)*(state.panY+1)/2;
  const translate=state.rotation===90?[x+dw,y]:state.rotation===180?[x+dw,y+dh]:state.rotation===270?[x,y+dh]:[x,y];
  return {x,y,width:dw,height:dh,imageWidth:photo.width*scale,imageHeight:photo.height*scale,translate,rotation:state.rotation};
}
export function imageURL(value){let url;try{url=new URL(value);}catch{throw Error('Enter a complete HTTPS link to an image.');}if(url.protocol!=='https:'||url.username||url.password)throw Error('Use an HTTPS image link without a username or password.');return url.href;}
