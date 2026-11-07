// SPDX-License-Identifier: MIT
export const noteName=midi=>['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][midi%12]+(Math.floor(midi/12)-1);
const mapping=['KeyA','KeyW','KeyS','KeyE','KeyD','KeyF','KeyT','KeyG','KeyY','KeyH','KeyU','KeyJ','KeyK','KeyO','KeyL','KeyP','Semicolon'];
export class PianoKeyboard{
  constructor(container,{first=48,onPress,onRelease,onReset=()=>{}}){
    this.container=container;this.first=first;this.onPress=onPress;this.onRelease=onRelease;this.onReset=onReset;this.held=new Map();this.codes=new Set();this.labels=true;this.external=[];
    this.draw();
    const hit=e=>{const key=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-piano]');return key&&container.contains(key)?Number(key.dataset.piano):null;};
    container.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();const midi=hit(e);if(midi===null)return;container.setPointerCapture(e.pointerId);this.press('pointer-'+e.pointerId,midi);});
    container.addEventListener('pointermove',e=>{const id='pointer-'+e.pointerId;if(!container.hasPointerCapture(e.pointerId))return;const midi=hit(e);if(this.held.get(id)===midi)return;this.release(id);if(midi!==null)this.press(id,midi);});
    for(const type of['pointerup','pointercancel','lostpointercapture'])container.addEventListener(type,e=>this.release('pointer-'+e.pointerId));
    container.addEventListener('keydown',e=>{const key=e.target.closest('[data-piano]');if(!key||!['Enter',' '].includes(e.key))return;e.preventDefault();if(!e.repeat)this.press('button-'+e.code,Number(key.dataset.piano));});
    container.addEventListener('keyup',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();this.release('button-'+e.code);}});
    container.addEventListener('focusout',()=>{for(const id of [...this.held.keys()])if(id.startsWith('button-'))this.release(id);});
    container.addEventListener('click',e=>{const key=e.target.closest('[data-piano]');if(!key||e.detail!==0)return;const id='assistive-'+key.dataset.piano;this.press(id,Number(key.dataset.piano));setTimeout(()=>this.release(id),180);});
    window.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest?.('input,select,textarea,[contenteditable="true"]'))return;const offset=mapping.indexOf(e.code);if(offset<0||e.repeat)return;e.preventDefault();this.codes.add(e.code);this.press('code-'+e.code,this.first+12+offset);});
    window.addEventListener('keyup',e=>{if(this.codes.delete(e.code)){e.preventDefault();this.release('code-'+e.code);}});
    window.addEventListener('blur',()=>{this.reset();this.onReset();});
  }
  press(id,midi){this.release(id);this.held.set(id,midi);this.onPress(id,midi);this.highlight();}
  release(id){if(!this.held.has(id))return;this.held.delete(id);this.onRelease(id);this.highlight();}
  reset(){for(const id of [...this.held.keys()])this.release(id);this.codes.clear();this.highlight();}
  setRange(first){this.reset();this.first=first;this.draw();}
  setLabels(value){this.labels=value;this.container.classList.toggle('hide-labels',!value);}
  highlight(external=this.external){this.external=external;const active=new Set([...this.held.values(),...external]);for(const key of this.container.querySelectorAll('[data-piano]'))key.classList.toggle('pressed',active.has(Number(key.dataset.piano)));}
  draw(){
    this.container.replaceChildren();this.container.classList.add('piano-keyboard');let white=0;
    for(let midi=this.first;midi<this.first+36;midi++){
      const black=[1,3,6,8,10].includes(midi%12),button=document.createElement('button');button.type='button';button.dataset.piano=midi;button.className='piano-key '+(black?'black-key':'white-key');button.setAttribute('aria-label','Play '+noteName(midi));
      button.style.left=(black?white*44-14:white*44)+'px';if(!black)white++;
      const label=document.createElement('span');label.className='key-note';label.textContent=noteName(midi);button.append(label);
      const offset=midi-(this.first+12);if(offset>=0&&offset<mapping.length){const hint=document.createElement('small');hint.className='key-shortcut';hint.textContent=mapping[offset]==='Semicolon'?';':mapping[offset].slice(3);button.append(hint);}
      this.container.append(button);
    }
    this.container.style.width=white*44+'px';this.setLabels(this.labels);this.highlight();
  }
}
