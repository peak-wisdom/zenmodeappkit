// SPDX-License-Identifier: MIT
import {RANGES} from './audio.js?v=3';

export function locateFrequency(hz,preferredRange='mid') {
  if(!Number.isFinite(hz)||hz<55||hz>1760)throw new Error('Enter a frequency between 55 and 1760 Hz.');
  const fits=range=>RANGES[range]&&hz>=RANGES[range][0]&&hz<=RANGES[range][1];
  const range=fits(preferredRange)?preferredRange:Object.keys(RANGES).find(fits);
  const [low,high]=RANGES[range];
  return {range,x:Math.max(0,Math.min(1,Math.log(hz/low)/Math.log(high/low)))};
}

export const formatFrequency=hz=>String(Number(hz.toFixed(3)));
