// SPDX-License-Identifier: MIT
import{chooseMove}from './ai.js';
self.onmessage=({data})=>{try{self.postMessage({id:data.id,move:chooseMove(data.fen,data.level)});}catch(error){self.postMessage({id:data.id,error:error.message});}};
