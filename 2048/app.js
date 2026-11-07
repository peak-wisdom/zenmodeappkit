// SPDX-License-Identifier: MIT
import{move,spawn,canMove,validBoard}from './game.js';
const $=id=>document.getElementById(id),key='still-2048-v1';let state={board:spawn(spawn(Array(16).fill(0))),score:0,best:0},previous=null;
try{const s=JSON.parse(localStorage.getItem(key));if(validBoard(s?.board)&&Number.isSafeInteger(s.score)&&s.score>=0){state.board=s.board;state.score=s.score;}if(Number.isSafeInteger(s?.best)&&s.best>=0)state.best=Math.max(s.best,state.score);}catch{}
function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{$('storage').textContent='Storage unavailable; this game lasts for this visit.';}}
function draw(){
 $('board').replaceChildren(...state.board.map((n,i)=>{const d=document.createElement('div');d.className='tile';d.dataset.value=n;d.textContent=n||'';d.style.setProperty('--power',Math.min(11,Math.log2(n||1)));d.setAttribute('aria-label',`Row ${Math.floor(i/4)+1} column ${i%4+1}: ${n||'empty'}`);return d;}));
 $('score').textContent=state.score;$('best').textContent=state.best;$('undo').disabled=!previous;
 $('status').textContent=!canMove(state.board)?'No moves left. Start a new game or undo.':state.board.some(n=>n>=2048)?'2048 reached! Keep going as far as you like.':'Merge matching tiles. Reach 2048.';
}
function turn(direction){const result=move(state.board,direction);if(!result.changed)return;previous=structuredClone(state);state.board=spawn(result.board);state.score+=result.score;state.best=Math.max(state.best,state.score);save();draw();}
for(const button of document.querySelectorAll('[data-direction]'))button.addEventListener('click',()=>turn(button.dataset.direction));
window.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;const direction={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[e.key];if(direction){e.preventDefault();turn(direction);}});
let touch=null;$('board').addEventListener('pointerdown',e=>{if(e.button!==0)return;touch={id:e.pointerId,x:e.clientX,y:e.clientY};$('board').setPointerCapture(e.pointerId);});
$('board').addEventListener('pointerup',e=>{if(touch?.id!==e.pointerId)return;const dx=e.clientX-touch.x,dy=e.clientY-touch.y;touch=null;if(Math.max(Math.abs(dx),Math.abs(dy))>25)turn(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');});$('board').addEventListener('pointercancel',()=>touch=null);
$('new').addEventListener('click',()=>{previous=structuredClone(state);state.board=spawn(spawn(Array(16).fill(0)));state.score=0;save();draw();});$('undo').addEventListener('click',()=>{if(!previous)return;const best=state.best;state=previous;state.best=Math.max(best,state.best);previous=null;save();draw();});draw();
