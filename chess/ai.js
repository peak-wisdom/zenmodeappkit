// SPDX-License-Identifier: MIT
import{Chess}from './vendor/chess.js';
const values={p:100,n:320,b:330,r:500,q:900,k:0};
function evaluate(game){let score=0;const board=game.board();for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=board[r][c];if(!p)continue;const center=3.5-Math.abs(3.5-c)+3.5-Math.abs(3.5-r),advance=p.color==='w'?6-r:r-1;const bonus=p.type==='p'?advance*8:p.type==='n'||p.type==='b'?center*5:0;score+=(values[p.type]+bonus)*(p.color==='w'?1:-1);}return score*(game.turn()==='w'?1:-1);}
function ordered(game){return game.moves({verbose:true}).sort((a,b)=>(values[b.captured]||0)*10-(values[a.captured]||0)*10+(b.promotion?800:0)-(a.promotion?800:0));}
export function chooseMove(fen,level='medium',random=Math.random){
 const game=new Chess(fen),moves=ordered(game);if(!moves.length)return null;
 const deadline=Date.now()+({easy:180,medium:650,hard:1400}[level]||650),maxDepth={easy:1,medium:2,hard:3}[level]||2;let best=moves[0],nodes=0;
 function search(depth,alpha,beta,ply){if((++nodes&63)===0&&Date.now()>deadline)throw Error('timeout');if(game.isCheckmate())return-100000+ply;if(game.isDraw())return 0;if(depth===0)return evaluate(game);let score=-Infinity;for(const move of ordered(game)){game.move(move);let value;try{value=-search(depth-1,-beta,-alpha,ply+1);}finally{game.undo();}score=Math.max(score,value);alpha=Math.max(alpha,value);if(alpha>=beta)break;}return score;}
 for(let depth=1;depth<=maxDepth;depth++){const scored=[];try{for(const move of moves){if(Date.now()>deadline)throw Error('timeout');game.move(move);let score;try{score=-search(depth-1,-Infinity,Infinity,1);}finally{game.undo();}scored.push({move,score});}scored.sort((a,b)=>b.score-a.score);if(level==='easy'){const candidates=scored.filter(v=>v.score>=scored[0].score-55).slice(0,5);best=candidates[Math.floor(random()*candidates.length)].move;}else best=scored[0].move;}catch{break;}}
 return{from:best.from,to:best.to,...(best.promotion?{promotion:best.promotion}:{})};
}
