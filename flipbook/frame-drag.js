// SPDX-License-Identifier: MIT
// A short hold distinguishes moving a page from tapping it or scrolling the strip.
export function enableFrameDrag(strip,{canStart,onStart,onMove,announce}){
  let drag=null,timer=null,raf=null,suppressUntil=0;
  function clear(){clearTimeout(timer);cancelAnimationFrame(raf);timer=raf=null;strip.classList.remove('reordering');for(const item of strip.children)item.classList.remove('drag-source','drop-target');}
  function target(){
    if(!drag?.active)return;
    let closest=null,distance=Infinity;
    for(const item of strip.children){const rect=item.getBoundingClientRect(),d=Math.abs(drag.x-(rect.left+rect.width/2));if(d<distance){closest=item;distance=d;}}
    drag.to=Number(closest?.dataset.frame??drag.from);
    for(const item of strip.children)item.classList.toggle('drop-target',item===closest);
  }
  function tick(){
    if(!drag?.active)return;const rect=strip.getBoundingClientRect();
    const speed=drag.x<rect.left+44?-10:drag.x>rect.right-44?10:0;
    if(speed)strip.scrollLeft+=speed;target();raf=requestAnimationFrame(tick);
  }
  strip.addEventListener('pointerdown',event=>{
    const button=event.target.closest('[data-frame]');if(!button||event.button!==0||drag||!canStart())return;
    drag={id:event.pointerId,from:Number(button.dataset.frame),to:Number(button.dataset.frame),x:event.clientX,startX:event.clientX,startY:event.clientY,active:false,scroll:strip.scrollLeft};
    timer=setTimeout(()=>{if(!drag)return;onStart();strip.setPointerCapture(drag.id);drag.active=true;strip.classList.add('reordering');strip.querySelector('[data-frame="'+drag.from+'"]')?.classList.add('drag-source');announce('Moving page '+(drag.from+1)+'. Drag to its new position and release.');tick();},350);
  });
  strip.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;drag.x=event.clientX;
    if(drag.active){event.preventDefault();target();}
    else if(Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>8){clearTimeout(timer);timer=null;strip.setPointerCapture(drag.id);drag.scrolling=true;strip.scrollLeft=drag.scroll+drag.startX-event.clientX;}
  });
  function end(event,canceled){
    if(!drag||event.pointerId!==drag.id)return;const finished=drag;drag=null;clear();
    if(finished.active||finished.scrolling)suppressUntil=performance.now()+500;
    if(strip.hasPointerCapture(event.pointerId))strip.releasePointerCapture(event.pointerId);
    if(finished.active){if(canceled)announce('Page move canceled.');else onMove(finished.from,finished.to);}
  }
  strip.addEventListener('pointerup',event=>end(event,false));
  strip.addEventListener('pointerleave',event=>{if(drag&&!drag.active&&!drag.scrolling)end(event,true);});
  strip.addEventListener('pointercancel',event=>end(event,true));
  strip.addEventListener('lostpointercapture',event=>{if(!strip.hasPointerCapture(event.pointerId))end(event,true);});
  strip.addEventListener('click',event=>{if(performance.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();}},true);
  strip.addEventListener('contextmenu',event=>event.preventDefault());
  window.addEventListener('blur',()=>{if(drag)end({pointerId:drag.id},true);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&drag)end({pointerId:drag.id},true);});
}
