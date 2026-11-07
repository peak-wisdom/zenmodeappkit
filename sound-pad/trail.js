// SPDX-License-Identifier: MIT
export class PadTrail {
  constructor(canvas, {enabled=true, duration=3}={}) {
    this.canvas=canvas; this.context=canvas.getContext('2d');
    this.enabled=enabled; this.duration=duration; this.points=[];
    this.stroke=0; this.active=false; this.frame=null; this.width=1; this.height=1;
    this.resize=()=>{
      const rect=canvas.getBoundingClientRect(), ratio=Math.min(window.devicePixelRatio||1,2);
      this.width=Math.max(1,rect.width); this.height=Math.max(1,rect.height);
      canvas.width=Math.max(1,Math.round(this.width*ratio)); canvas.height=Math.max(1,Math.round(this.height*ratio));
      this.context?.setTransform(ratio,0,0,ratio,0,0); this.draw(performance.now());
    };
    if(typeof ResizeObserver!=='undefined'){this.observer=new ResizeObserver(this.resize);this.observer.observe(canvas);}
    else window.addEventListener('resize',this.resize);
    this.resize();
  }
  configure(enabled,duration) {
    this.enabled=enabled; this.duration=duration;
    if(!enabled)this.clear(); else this.schedule();
  }
  begin(x,y) {this.stroke++;this.active=true;this.add(x,y);}
  add(x,y) {
    if(!this.enabled||!this.context)return;
    if(!this.active){this.stroke++;this.active=true;}
    const now=performance.now(),last=this.points.at(-1);
    x=Math.max(0,Math.min(1,x));y=Math.max(0,Math.min(1,y));
    if(last?.stroke===this.stroke&&Math.hypot((x-last.x)*this.width,(y-last.y)*this.height)<1.5)return;
    this.points.push({x,y,time:now,stroke:this.stroke});
    if(this.points.length>512)this.points.splice(0,this.points.length-512);
    this.schedule();
  }
  end() {this.active=false;}
  schedule() {
    if(this.frame!==null||!this.points.length)return;
    this.frame=requestAnimationFrame(now=>{this.frame=null;this.draw(now);this.schedule();});
  }
  draw(now) {
    const ctx=this.context;if(!ctx)return;
    ctx.clearRect(0,0,this.width,this.height);
    const lifetime=this.duration*1000;
    this.points=this.points.filter(p=>now-p.time<lifetime);
    if(!this.points.length)return;
    const color=getComputedStyle(this.canvas).getPropertyValue('--trail-color').trim()||'#b4eed5';
    ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor=color;ctx.shadowBlur=5;
    // Eight age bands keep the tail soft without hundreds of glow passes per frame.
    for(let band=0;band<8;band++){
      const fade=1-(band+.5)/8;ctx.globalAlpha=.8*fade**1.3;ctx.lineWidth=1.5+fade*3.5;ctx.beginPath();
      for(let i=1;i<this.points.length;i++){
        const a=this.points[i-1],b=this.points[i];
        if(a.stroke!==b.stroke||Math.floor((now-b.time)/lifetime*8)!==band)continue;
        ctx.moveTo(a.x*this.width,a.y*this.height);ctx.lineTo(b.x*this.width,b.y*this.height);
      }
      ctx.stroke();
    }
    for(let i=0;i<this.points.length;i++){
      const p=this.points[i];if(i>0&&this.points[i-1].stroke===p.stroke)continue;
      const fade=Math.max(0,1-(now-p.time)/lifetime);ctx.globalAlpha=.7*fade**1.3;
      ctx.beginPath();ctx.arc(p.x*this.width,p.y*this.height,1.5+fade*1.5,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;ctx.shadowBlur=0;
  }
  clear() {
    if(this.frame!==null)cancelAnimationFrame(this.frame);
    this.frame=null;this.points=[];this.active=false;this.stroke++;
    this.context?.clearRect(0,0,this.width,this.height);
  }
}
