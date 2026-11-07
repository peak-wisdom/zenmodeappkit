// SPDX-License-Identifier: MIT
export function move(board,direction){
  const next=board.slice();let score=0;
  for(let line=0;line<4;line++){
    const ids=Array.from({length:4},(_,i)=>direction==='left'?line*4+i:direction==='right'?line*4+3-i:direction==='up'?i*4+line:(3-i)*4+line);
    const values=ids.map(i=>board[i]).filter(Boolean),merged=[];
    for(let i=0;i<values.length;i++){if(values[i]===values[i+1]){const n=values[i]*2;merged.push(n);score+=n;i++;}else merged.push(values[i]);}
    ids.forEach((id,i)=>next[id]=merged[i]||0);
  }return{board:next,score,changed:next.some((v,i)=>v!==board[i])};
}
export function spawn(board,random=Math.random){const b=board.slice(),empty=b.flatMap((v,i)=>v?[]:[i]);if(empty.length)b[empty[Math.floor(random()*empty.length)]]=random()<.9?2:4;return b;}
export function canMove(board){return board.includes(0)||['left','up'].some(d=>move(board,d).changed);}
export function validBoard(b){return Array.isArray(b)&&b.length===16&&b.every(v=>Number.isInteger(v)&&(v===0||v>=2&&v<=2**30&&Number.isInteger(Math.log2(v))));}
