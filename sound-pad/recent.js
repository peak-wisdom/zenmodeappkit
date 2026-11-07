// SPDX-License-Identifier: MIT
import {formatFrequency} from './tuning.js?v=1';
export const RECENT_LIMIT=20;
export function cleanRecent(values) {
  if(!Array.isArray(values))return [];
  const seen=new Set();
  return values.filter(hz=>{
    if(!Number.isFinite(hz)||hz<55||hz>1760)return false;
    const key=formatFrequency(hz);if(seen.has(key))return false;seen.add(key);return true;
  }).slice(0,RECENT_LIMIT);
}
export function addRecent(values,hz) {return cleanRecent([hz,...values]);}
