// SPDX-License-Identifier: MIT
import {PadAudio, RANGES, ROOTS, SCALES, MALLETS, notesFor, clamp, soundAt} from './audio.js?v=3';

import {locateFrequency,formatFrequency} from './tuning.js?v=1';
import {PadTrail} from './trail.js?v=1';

const $ = id => document.getElementById(id);
const pad = $('pad');
const key = 'still-sound-pad-v1';
const settings = {wave: 'sine', synthWave: 'sine', range: 'mid', volume: 30, root: 0, scale: 'continuous', drumScale: 'majorPentatonic', hold: false, freeGlideVersion: 1, sustain: 1.4, mallet: 'rubber', trail: true, trailDuration: 3};
const position = {x: 0.5, y: 0.5};
const audio = new PadAudio(() => {
  const mallet = $('malletVisual');
  if (!mallet.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const animation of mallet.getAnimations()) animation.cancel();
  mallet.animate([
    {transform: 'translate(-50%, -10px) rotate(-45deg)'},
    {transform: 'translate(-50%, -3px) rotate(-25deg)', offset: 0.3},
    {transform: 'translate(-50%, -10px) rotate(-35deg)'}
  ], {duration: 180, easing: 'ease-out'});
});
let pointer = null;
let keyboardKey = null;
let playing = false;
let playback = 0;
let storageAvailable = true;

try {
  const saved = JSON.parse(localStorage.getItem(key));
  const synths=['sine','triangle','sawtooth'];
  if(synths.includes(saved?.synthWave))settings.synthWave=saved.synthWave;
  else if(synths.includes(saved?.wave))settings.synthWave=saved.wave;
  settings.wave=saved?.freeGlideVersion===1&&saved.wave==='steel-drum'?'steel-drum':settings.synthWave;
  if(Object.hasOwn(RANGES,saved?.range))settings.range=saved.range;
  if(Number.isFinite(saved?.volume)&&saved.volume>=0&&saved.volume<=100)settings.volume=saved.volume;
  if(Number.isInteger(saved?.root)&&saved.root>=0&&saved.root<12)settings.root=saved.root;
  const drumScale=saved?.drumScale||saved?.scale;
  if(drumScale!=='continuous'&&Object.hasOwn(SCALES,drumScale))settings.drumScale=drumScale;
  settings.scale=settings.wave==='steel-drum'?settings.drumScale:'continuous';
  if([.6,1.4,2.8].includes(saved?.sustain))settings.sustain=saved.sustain;
  if(Object.hasOwn(MALLETS,saved?.mallet))settings.mallet=saved.mallet;
  if(typeof saved?.trail==='boolean')settings.trail=saved.trail;
  if([1,3,6].includes(saved?.trailDuration))settings.trailDuration=saved.trailDuration;
  if(typeof saved?.hold==='boolean')settings.hold=saved.hold;
  if(settings.wave!=='steel-drum'&&Number.isFinite(saved?.frequency)&&saved.frequency>=55&&saved.frequency<=1760){const target=locateFrequency(saved.frequency,settings.range);settings.range=target.range;position.x=target.x;}
} catch {storageAvailable=false;}

const trail = new PadTrail($('trailCanvas'), {enabled: settings.trail, duration: settings.trailDuration});

function save() {
  try { localStorage.setItem(key, JSON.stringify(settings)); }
  catch { storageAvailable = false; }
}

function render() {
  const sound = soundAt(position.x, position.y, settings);
  pad.style.setProperty('--x', `${position.x * 100}%`);
  pad.style.setProperty('--y', `${position.y * 100}%`);
  pad.dataset.playing = String(playing);
  $('pitch').textContent = `${formatFrequency(sound.frequency)} Hz`;
  if(settings.wave!=='steel-drum'){settings.frequency=sound.frequency;if(document.activeElement!==$('exactFrequency'))$('exactFrequency').value=formatFrequency(sound.frequency);}
  $('note').textContent = sound.note;
  $('tone').textContent = sound.brightness > 0.66 ? 'Bright' : sound.brightness < 0.33 ? 'Mellow' : 'Balanced';
  $('playing').textContent = playing ? (settings.hold&&settings.wave!=='steel-drum'&&pointer===null&&keyboardKey===null?'Frequency held':'Playing') : 'Ready';
  $('volumeValue').textContent = `${settings.volume}%`;
  for (const lane of $('noteLanes').children) lane.dataset.active = String(Number(lane.dataset.midi) === sound.midi);
}

function renderInstrument() {
  const drum = settings.wave === 'steel-drum';
  document.querySelector('.instrument').dataset.mode=drum?'drum':'synth';
  $('hold').disabled=drum;
  $('holdHelp').textContent=drum?'Drum notes ring out naturally. Hold sound is available in the continuous synth pad.':'With Hold sound on, lift your finger to keep this frequency playing. Touch another spot to change it. Stop sound ends it.';
  $('steelMode').setAttribute('aria-pressed',String(drum)); $('synthMode').setAttribute('aria-pressed',String(!drum)); $('wave').disabled=drum; $('wave').value=settings.synthWave;
  const notes = notesFor(settings);
  $('noteLanes').replaceChildren();
  notes.forEach((note, index) => {
    const lane = document.createElement('span');
    lane.className = 'note-lane';
    lane.style.left = `${index / (notes.length - 1) * 100}%`;
    lane.dataset.midi = note.midi;
    lane.textContent = notes.length > 18 && index % 2 ? '·' : note.name;
    if (index === 0) lane.classList.add('first');
    if (index === notes.length - 1) lane.classList.add('last');
    $('noteLanes').append(lane);
  });
  $('sustain').disabled = !drum;
  $('mallet').disabled = !drum;
  pad.dataset.instrument = drum ? 'drum' : 'synth';
  pad.dataset.mallet = settings.mallet;
  $('malletInfo').textContent = drum ? {
    soft: 'Soft mallet · a rounded, mellow attack with fewer bright overtones.',
    rubber: 'Rubber mallet · a balanced steel-drum strike with a natural ring.',
    wood: 'Wood mallet · a sharper, brighter strike with a shorter ring.'
  }[settings.mallet] : 'Mallets shape the steel-drum voice. Choose Steel drum to use them.';
  $('root').disabled = !drum;
  $('scale').disabled = !drum;
  $('scale').querySelector('[value="continuous"]').disabled = drum;
  $('instrumentInfo').textContent = drum
    ? `${ROOTS[settings.root]} ${SCALES[settings.scale].name.toLowerCase()} · Tap to strike. Drag across note lanes to play a melody. Higher touches strike brighter and louder.`
    : settings.scale === 'continuous' ? 'Free pitch glide. Move horizontally to bend the pitch.' : `${ROOTS[settings.root]} ${SCALES[settings.scale].name.toLowerCase()} · Pitch snaps to the labeled notes.`;
  $('instructions').textContent = drum ? 'Tap a note or drag across the pad. Steel-drum notes ring out naturally after release. Stop sound silences every note.' : (settings.hold?'Touch and drag to explore any frequency. Lift to hold the last sound; touch again to change it.':'Hold a finger or mouse button on the pad, then drag through any frequency. Lift to let the sound fade.');
  $('padMessage').textContent = drum ? 'Tap a note. Let it ring.' : 'Touch & explore';
  $('keyboardHelp').textContent = drum
    ? 'Keyboard play · hold Space or Enter and use Left/Right to strike adjacent notes. Up/Down changes strike strength. Release lets the drum ring.'
    : settings.hold ? 'Keyboard play · hold Space or Enter and use the arrows. Release to keep the frequency playing. Stop sound ends it.' : 'Keyboard play · hold Space or Enter, then use the arrow keys to move. Release to stop.';
  for (const option of $('range').options) {
    option.textContent = drum
      ? `${{low: 'Low', mid: 'Mid', high: 'High'}[option.value]} · ${ROOTS[settings.root]}${{low: 3, mid: 4, high: 5}[option.value]}–${ROOTS[settings.root]}${{low: 5, mid: 6, high: 7}[option.value]}`
      : {low: 'Low · 55–440 Hz', mid: 'Mid · 110–880 Hz', high: 'High · 220–1760 Hz'}[option.value];
  }
  render();
}

async function play() {
  if (playing) {render();return;}
  const request = ++playback;
  playing = true;
  render();
  $('status').textContent = settings.wave === 'steel-drum' ? 'Tap and glide across the notes. Let each strike ring.' : (settings.hold?'Glide through any frequency. Lift to keep the last sound playing.':'Glide through any frequency. Release to stop.');
  try {
    const started = await audio.start(settings, position);
    if (started) audio.update(settings, position);
  } catch (error) {
    if (request !== playback) return;
    stop(true);
    $('status').textContent = error.message;
  }
}

function stop(hard = false) {
  playback++;
  pointer = null;
  keyboardKey = null;
  playing = false;
  trail.end();
  save();
  if (hard) audio.stop();
  else audio.release();
  render();
  $('status').textContent = hard ? 'All sound stopped.' : settings.wave === 'steel-drum' ? 'The note is ringing out. Tap to strike again.' : 'Sound released. Touch the pad to play again.';
}

function releaseInput() {
  pointer=null;keyboardKey=null;trail.end();save();
  if(settings.hold&&playing&&settings.wave!=='steel-drum'){
    render();$('status').textContent='Holding '+formatFrequency(soundAt(position.x,position.y,settings).frequency)+' Hz. Touch to change it, or press Stop sound.';
  }else stop();
}

function move(event) {
  const bounds = pad.getBoundingClientRect();
  position.x = clamp((event.clientX - bounds.left) / bounds.width);
  position.y = clamp((event.clientY - bounds.top) / bounds.height);
  trail.add(position.x,position.y);
  audio.update(settings, position);
  render();
}

pad.addEventListener('pointerdown', event => {
  if (pointer !== null || keyboardKey !== null || event.button !== 0) return;
  event.preventDefault();
  pointer = event.pointerId;
  pad.focus({preventScroll: true});
  pad.setPointerCapture(pointer);
  move(event);
  play();
});
pad.addEventListener('pointermove', event => {
  if (event.pointerId === pointer) {
    const bounds = pad.getBoundingClientRect();
    for (const sample of event.getCoalescedEvents?.() || []) trail.add(clamp((sample.clientX-bounds.left)/bounds.width),clamp((sample.clientY-bounds.top)/bounds.height));
    move(event);
  }
});
for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  pad.addEventListener(eventName, event => { if (event.pointerId === pointer) {if(eventName==='pointerup')releaseInput();else stop(true);} });
}
// Also release if the pointer ends outside the pad before capture is established.
window.addEventListener('pointerup', event => { if (event.pointerId === pointer) releaseInput(); });

pad.addEventListener('keydown', event => {
  if ([' ', 'Enter'].includes(event.key)) {
    event.preventDefault();
    if (pointer === null && keyboardKey === null) {
      keyboardKey = event.key;
      trail.begin(position.x,position.y);
      play();
    }
    return;
  }
  const moves = {ArrowLeft: [-0.025, 0], ArrowRight: [0.025, 0], ArrowUp: [0, -0.025], ArrowDown: [0, 0.025]};
  const delta = moves[event.key];
  if (!delta) return;
  event.preventDefault();
  const notes = notesFor(settings);
  const step = notes.length ? 1 / (notes.length - 1) : 0.025;
  position.x = clamp(position.x + Math.sign(delta[0]) * step);
  position.y = clamp(position.y + delta[1]);
  if (playing) trail.add(position.x,position.y);
  audio.update(settings, position);
  render();
});
window.addEventListener('keyup', event => { if (event.key === keyboardKey) releaseInput(); });
pad.addEventListener('blur', () => {if(pointer!==null||keyboardKey!==null)releaseInput();else if(!settings.hold||settings.wave==='steel-drum')stop();});
window.addEventListener('blur', () => stop(true));
window.addEventListener('pagehide', () => stop(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(true); });
$('stop').addEventListener('click', () => stop(true));

for (const [value, name] of ROOTS.entries()) {
  const option = document.createElement('option'); option.value = value; option.textContent = name; $('root').append(option);
}
for (const [value, scale] of Object.entries(SCALES)) {
  const option = document.createElement('option'); option.value = value; option.textContent = scale.name; $('scale').append(option);
}
for (const id of ['wave', 'range', 'volume', 'root', 'scale', 'sustain', 'mallet']) {
  $(id).value = id==='wave'?settings.synthWave:settings[id];
  $(id).addEventListener('input', () => {
    settings[id] = ['volume', 'root', 'sustain'].includes(id) ? Number($(id).value) : $(id).value;
    if(id==='wave')settings.synthWave=settings.wave;
    if(id==='scale'&&settings.scale!=='continuous')settings.drumScale=settings.scale;
    if (settings.wave === 'steel-drum' && settings.scale === 'continuous') {
      settings.scale = 'majorPentatonic'; $('scale').value = settings.scale;
    }
    audio.update(settings, position);
    save();
    renderInstrument();
    $('status').textContent = storageAvailable ? 'Sound settings saved in this browser.' : 'Settings applied. Browser storage is unavailable.';
  });
}
for(const [id,wave] of [['steelMode','steel-drum'],['synthMode',null]]) $(id).addEventListener('click',()=>{
  stop(true);settings.wave=wave||settings.synthWave;settings.scale=wave?settings.drumScale:'continuous';$('scale').value=settings.scale;save();renderInstrument();
});
renderInstrument();
if (!storageAvailable) $('status').textContent = 'Ready to play. Browser storage is unavailable, so settings may not persist.';

$('trail').checked=settings.trail;$('trailDuration').value=settings.trailDuration;
$('trailDuration').disabled=!settings.trail;
$('trail').addEventListener('change',()=>{settings.trail=$('trail').checked;trail.configure(settings.trail,settings.trailDuration);$('trailDuration').disabled=!settings.trail;save();});
$('trailDuration').addEventListener('change',()=>{settings.trailDuration=Number($('trailDuration').value);trail.configure(settings.trail,settings.trailDuration);save();});
$('clearTrail').addEventListener('click',()=>trail.clear());
window.addEventListener('pagehide',()=>trail.clear());
document.addEventListener('visibilitychange',()=>{if(document.hidden)trail.clear();});

$('hold').checked=settings.hold;
$('hold').addEventListener('change',()=>{settings.hold=$('hold').checked;if(!settings.hold&&playing&&pointer===null&&keyboardKey===null)stop(true);save();renderInstrument();});
save();

async function tuneFrequency(value) {
  try {
    const hz=Number(value),target=locateFrequency(hz,settings.range);
    if(settings.wave==='steel-drum')stop(true);
    settings.wave=settings.synthWave;settings.scale='continuous';settings.range=target.range;settings.hold=true;
    position.x=target.x;$('range').value=target.range;$('scale').value='continuous';$('hold').checked=true;$('exactFrequency').value=formatFrequency(hz);
    trail.begin(position.x,position.y);trail.end();audio.update(settings,position);renderInstrument();save();
    await play();if(playing)releaseInput();
  } catch(error) {$('status').textContent=error.message;$('exactFrequency').focus();}
}
$('frequencyForm').addEventListener('submit',event=>{event.preventDefault();tuneFrequency($('exactFrequency').value);});
$('frequency432').addEventListener('click',()=>tuneFrequency(432));
