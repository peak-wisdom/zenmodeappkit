// SPDX-License-Identifier: MIT
export async function openStorage(){
  try{
    const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('still-flipbook-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('projects');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Storage is blocked by another open version.'));});
    db.onversionchange=()=>db.close();
    return{
      async read(){return new Promise((resolve,reject)=>{const request=db.transaction('projects').objectStore('projects').get('current');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});},
      async write(record){return new Promise((resolve,reject)=>{const transaction=db.transaction('projects','readwrite');transaction.objectStore('projects').put(record,'current');transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error||Error('Save interrupted.'));});}
    };
  }catch{
    return{async read(){const raw=localStorage.getItem('still-flipbook-fallback-v1');return raw?JSON.parse(raw):null;},async write(record){localStorage.setItem('still-flipbook-fallback-v1',JSON.stringify(record));}};
  }
}
