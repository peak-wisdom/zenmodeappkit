// SPDX-License-Identifier: MIT
const KEY='still-map-art-v1';
export function readSettings(){try{return JSON.parse(localStorage.getItem(KEY));}catch{return null;}}
export function saveSettings(state){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch{return false;}}
export async function openDraft(){
  if(!globalThis.indexedDB)throw Error('Browser draft storage unavailable.');
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open(KEY,1);request.onupgradeneeded=()=>request.result.createObjectStore('draft');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  db.onversionchange=()=>db.close();
  return {read:()=>new Promise((resolve,reject)=>{const tx=db.transaction('draft'),request=tx.objectStore('draft').get('current');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);}),write:value=>new Promise((resolve,reject)=>{const tx=db.transaction('draft','readwrite');tx.objectStore('draft').put(value,'current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);})};
}
