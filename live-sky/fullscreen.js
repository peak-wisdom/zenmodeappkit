// SPDX-License-Identifier: MIT
export function setupFullscreen({stage,button,onChange=()=>{},announce=()=>{}}){
  const doc=stage.ownerDocument;
  let overlay=false,busy=false,wasExpanded=false,previousFocus=null,scrollStyles=null;
  const native=()=>doc.fullscreenElement===stage;
  const expanded=()=>overlay||native();
  function unlockScroll(){
    if(!scrollStyles)return;
    doc.documentElement.style.overflow=scrollStyles.html;doc.body.style.overflow=scrollStyles.body;scrollStyles=null;
  }
  function sync(){
    const active=expanded();stage.classList.toggle('expanded',active);stage.classList.toggle('fullscreen-overlay',overlay);
    button.textContent=active?'✕ Exit full screen':'⛶ Full screen';button.setAttribute('aria-pressed',String(active));
    button.setAttribute('aria-label',active?'Exit full screen map':'Show map in full screen');
    for(const node of stage.querySelectorAll('[data-expanded-only]'))node.hidden=!active;
    if(overlay){stage.setAttribute('role','dialog');stage.setAttribute('aria-modal','true');}
    else{stage.removeAttribute('role');stage.removeAttribute('aria-modal');}
    if(wasExpanded&&!active&&previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
    wasExpanded=active;onChange(active);
  }
  function showOverlay(){
    overlay=true;scrollStyles={html:doc.documentElement.style.overflow,body:doc.body.style.overflow};
    doc.documentElement.style.overflow='hidden';doc.body.style.overflow='hidden';sync();button.focus({preventScroll:true});
    announce('Expanded map ready. Use Exit full screen to return.');
  }
  function hideOverlay(){overlay=false;unlockScroll();sync();announce('Returned to the page.');}
  async function toggle(){
    if(busy)return;busy=true;button.disabled=true;
    try{
      if(overlay){hideOverlay();return;}
      if(native()){
        try{await doc.exitFullscreen();sync();announce('Returned to the page.');}
        catch{announce('Use Escape or your browser’s fullscreen exit control to return.');}
        return;
      }
      previousFocus=doc.activeElement;
      if(stage.requestFullscreen&&doc.fullscreenEnabled!==false){
        try{await stage.requestFullscreen();if(native()){sync();button.focus({preventScroll:true});announce('Full screen map ready. Drag to rotate; use Exit full screen to return.');return;}}
        catch{ /* Expanded in-page view also works when native fullscreen is denied. */ }
      }
      showOverlay();
    }finally{busy=false;button.disabled=false;}
  }
  button.addEventListener('click',toggle);
  doc.addEventListener('fullscreenchange',()=>{
    if(native()&&overlay){overlay=false;unlockScroll();}
    sync();
  });
  doc.addEventListener('keydown',event=>{
    if(!overlay)return;
    if(event.key==='Escape'){event.preventDefault();hideOverlay();return;}
    if(event.key!=='Tab')return;
    const nodes=[...stage.querySelectorAll('button:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])')].filter(node=>!node.closest('[hidden]'));
    const first=nodes[0],last=nodes.at(-1);if(!first)return;
    if(event.shiftKey&&(doc.activeElement===first||!stage.contains(doc.activeElement))){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(doc.activeElement===last||!stage.contains(doc.activeElement))){event.preventDefault();first.focus();}
  });
  doc.addEventListener('focusin',()=>{if(overlay&&!stage.contains(doc.activeElement))button.focus({preventScroll:true});});
  doc.defaultView.addEventListener('pagehide',()=>{if(overlay)hideOverlay();});
  sync();return {toggle,isExpanded:expanded};
}
