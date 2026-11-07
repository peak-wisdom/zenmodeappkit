// SPDX-License-Identifier: MIT
export const VOICES=['square','pulse','triangle','piano'];
export function validProject(p){return p?.format==='still-chiptune-studio'&&p.version===1&&[16,32,64].includes(p.steps)&&Number.isInteger(p.bpm)&&p.bpm>=60&&p.bpm<=180&&Array.isArray(p.notes)&&p.notes.length<=128&&p.notes.every(n=>Number.isInteger(n.step)&&n.step>=0&&Number.isInteger(n.duration)&&n.duration>=1&&n.step+n.duration<=p.steps&&Number.isInteger(n.midi)&&n.midi>=48&&n.midi<=83&&VOICES.includes(n.voice))&&Array.from({length:p.steps},(_,i)=>p.notes.filter(n=>i>=n.step&&i<n.step+n.duration).length).every(n=>n<=16);}
export function songFor(project){return{steps:project.steps,events:project.notes.map(n=>({...n,track:'lead',velocity:.8}))};}
export function blank(){return{format:'still-chiptune-studio',version:1,steps:32,bpm:110,notes:[]};}
