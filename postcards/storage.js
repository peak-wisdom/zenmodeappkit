// SPDX-License-Identifier: MIT
import {validProject,validPhoto,cleanProject} from './core.js';
const KEY='still-postcards-v1',META=KEY+'-meta';
export function saveMetadata(project){try{localStorage.setItem(META,JSON.stringify({project:{...project,photo:null},photoID:project.photo?.id??null,stamp:Date.now()}));return true;}catch{return false;}}
export function recover(record,meta){
  if(meta&&validProject(meta.project)&&(!record||!validProject(record.project)||meta.stamp>=record.stamp)){
    const photo=meta.photoID&&meta.photoID===record?.project?.photo?.id&&validPhoto(record.project.photo)?record.project.photo:null;
    return {project:cleanProject({...meta.project,photo}),photoMissing:meta.project.source==='photo'&&!photo};
  }
  return record&&validProject(record.project)?{project:cleanProject(record.project),photoMissing:false}:null;
}
export async function openStorage(){
  let meta=null;try{meta=JSON.parse(localStorage.getItem(META));}catch{}
  try{
    if(!globalThis.indexedDB)throw Error();
    const db=await new Promise((resolve,reject)=>{const request=indexedDB.open(KEY,1);request.onupgradeneeded=()=>request.result.createObjectStore('draft');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});db.onversionchange=()=>db.close();
    return {kind:'browser',read:async()=>{const record=await new Promise((resolve,reject)=>{const request=db.transaction('draft').objectStore('draft').get('current');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});return recover(record,meta);},write:project=>new Promise((resolve,reject)=>{const tx=db.transaction('draft','readwrite');tx.objectStore('draft').put({project,stamp:Date.now()},'current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);})};
  }catch{
    return {kind:'fallback',read:async()=>{let record=null;try{record=JSON.parse(localStorage.getItem(KEY));}catch{}return recover(record,meta);},write:async project=>{localStorage.setItem(KEY,JSON.stringify({project,stamp:Date.now()}));}};
  }
}
