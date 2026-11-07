// SPDX-License-Identifier: MIT
import {PadAudio, RANGES, ROOTS, SCALES, MALLETS, notesFor, clamp, soundAt} from './audio.js?v=3';

const $ = id => document.getElementById(id);
const pad = $('pad');
const key = 'still-sound-pad-v1';
const settings = {wave: 'steel-drum', range: 'mid', volume: 30, root: 0, scale: 'majorPentatonic', sustain: 1.4, mallet: 'rubber'};
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
  if (['sine', 'triangle', 'sawtooth', 'steel-drum'].includes(saved?.wave)) settings.wave = saved.wave;
  if (Object.hasOwn(RANGES, saved?.range)) settings.range = saved.range;
  if (Number.isFinite(saved?.volume) && saved.volume >= 0 && saved.volume <= 100) settings.volume = saved.volume;
  if (Number.isInteger(saved?.root) && saved.root >= 0 && saved.root < 12) settings.root = saved.root;
  if (Object.hasOwn(SCALES, saved?.scale)) settings.scale = saved.scale;
  else if (saved?.wave && saved.wave !== 'steel-drum') settings.scale = 'continuous';
  if ([0.6, 1.4, 2.8].includes(saved?.sustain)) settings.sustain = saved.sustain;
  if (Object.hasOwn(MALLETS, saved?.mallet)) settings.mallet = saved.mallet;
} catch { storageAvailable = false; }
if (settings.wave === 'steel-drum' && settings.scale === 'continuous') settings.scale = 'majorPentatonic';

function save() {
  try { localStorage.setItem(key, JSON.stringify(settings)); }
  catch { storageAvailable = false; }
}

function render() {
  const sound = soundAt(position.x, position.y, settings);
  pad.style.setProperty('--x', `${position.x * 100}%`);
  pad.style.setProperty('--y', `${position.y * 100}%`);
  pad.dataset.playing = String(playing);
  $('pitch').textContent = `${Math.round(sound.frequency)} Hz`;
  $('note').textContent = sound.note;
  $('tone').textContent = sound.brightness > 0.66 ? 'Bright' : sound.brightness < 0.33 ? 'Mellow' : 'Balanced';
  $('playing').textContent = playing ? 'Playing' : 'Ready';
  $('volumeValue').textContent = `${settings.volume}%`;
  for (const lane of $('noteLanes').children) lane.dataset.active = String(Number(lane.dataset.midi) === sound.midi);
}

function renderInstrument() {
  const drum = settings.wave === 'steel-drum';
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
  $('root').disabled = settings.scale === 'continuous' && !drum;
  $('scale').querySelector('[value="continuous"]').disabled = drum;
  $('instrumentInfo').textContent = drum
    ? `${ROOTS[settings.root]} ${SCALES[settings.scale].name.toLowerCase()} · Tap to strike. Drag across note lanes to play a melody. Higher touches strike brighter and louder.`
    : settings.scale === 'continuous' ? 'Free pitch glide. Move horizontally to bend the pitch.' : `${ROOTS[settings.root]} ${SCALES[settings.scale].name.toLowerCase()} · Pitch snaps to the labeled notes.`;
  $('instructions').textContent = drum ? 'Tap a note or drag across the pad. Steel-drum notes ring out naturally after release. Stop sound silences every note.' : 'Hold a finger or mouse button on the pad, then drag. Lift to let the sound fade.';
  $('padMessage').textContent = drum ? 'Tap a note. Let it ring.' : 'Touch & explore';
  $('keyboardHelp').textContent = drum
    ? 'Keyboard play · hold Space or Enter and use Left/Right to strike adjacent notes. Up/Down changes strike strength. Release lets the drum ring.'
    : 'Keyboard play · hold Space or Enter, then use the arrow keys to move. Release to stop.';
  for (const option of $('range').options) {
    option.textContent = drum
      ? `${{low: 'Low', mid: 'Mid', high: 'High'}[option.value]} · ${ROOTS[settings.root]}${{low: 3, mid: 4, high: 5}[option.value]}–${ROOTS[settings.root]}${{low: 5, mid: 6, high: 7}[option.value]}`
      : {low: 'Low · 55–440 Hz', mid: 'Mid · 110–880 Hz', high: 'High · 220–1760 Hz'}[option.value];
  }
  render();
}

async function play() {
  if (playing) return;
  const request = ++playback;
  playing = true;
  render();
  $('status').textContent = settings.wave === 'steel-drum' ? 'Tap and glide across the notes. Let each strike ring.' : 'Glide to change the sound. Release to stop.';
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
  if (hard) audio.stop();
  else audio.release();
  render();
  $('status').textContent = hard ? 'All sound stopped.' : settings.wave === 'steel-drum' ? 'The note is ringing out. Tap to strike again.' : 'Sound released. Touch the pad to play again.';
}

function move(event) {
  const bounds = pad.getBoundingClientRect();
  position.x = clamp((event.clientX - bounds.left) / bounds.width);
  position.y = clamp((event.clientY - bounds.top) / bounds.height);
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
  if (event.pointerId === pointer) move(event);
});
for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  pad.addEventListener(eventName, event => { if (event.pointerId === pointer) stop(); });
}
// Also release if the pointer ends outside the pad before capture is established.
window.addEventListener('pointerup', event => { if (event.pointerId === pointer) stop(); });

pad.addEventListener('keydown', event => {
  if ([' ', 'Enter'].includes(event.key)) {
    event.preventDefault();
    if (pointer === null && keyboardKey === null) {
      keyboardKey = event.key;
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
  audio.update(settings, position);
  render();
});
window.addEventListener('keyup', event => { if (event.key === keyboardKey) stop(); });
pad.addEventListener('blur', () => stop());
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
  $(id).value = settings[id];
  $(id).addEventListener('input', () => {
    settings[id] = ['volume', 'root', 'sustain'].includes(id) ? Number($(id).value) : $(id).value;
    if (settings.wave === 'steel-drum' && settings.scale === 'continuous') {
      settings.scale = 'majorPentatonic'; $('scale').value = settings.scale;
    }
    audio.update(settings, position);
    save();
    renderInstrument();
    $('status').textContent = storageAvailable ? 'Sound settings saved in this browser.' : 'Settings applied. Browser storage is unavailable.';
  });
}
renderInstrument();
if (!storageAvailable) $('status').textContent = 'Ready to play. Browser storage is unavailable, so settings may not persist.';
