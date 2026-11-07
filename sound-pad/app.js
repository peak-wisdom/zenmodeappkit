// SPDX-License-Identifier: MIT
import {PadAudio, RANGES, clamp, soundAt} from './audio.js?v=1';

const $ = id => document.getElementById(id);
const pad = $('pad');
const key = 'still-sound-pad-v1';
const settings = {wave: 'sine', range: 'mid', volume: 30};
const position = {x: 0.5, y: 0.5};
const audio = new PadAudio();
let pointer = null;
let keyboardKey = null;
let playing = false;
let playback = 0;
let storageAvailable = true;

try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (['sine', 'triangle', 'sawtooth'].includes(saved?.wave)) settings.wave = saved.wave;
  if (Object.hasOwn(RANGES, saved?.range)) settings.range = saved.range;
  if (Number.isFinite(saved?.volume) && saved.volume >= 0 && saved.volume <= 100) settings.volume = saved.volume;
} catch { storageAvailable = false; }

function save() {
  try { localStorage.setItem(key, JSON.stringify(settings)); }
  catch { storageAvailable = false; }
}

function render() {
  const sound = soundAt(position.x, position.y, settings.range);
  pad.style.setProperty('--x', `${position.x * 100}%`);
  pad.style.setProperty('--y', `${position.y * 100}%`);
  pad.dataset.playing = String(playing);
  $('pitch').textContent = `${Math.round(sound.frequency)} Hz`;
  $('tone').textContent = sound.brightness > 0.66 ? 'Bright' : sound.brightness < 0.33 ? 'Mellow' : 'Balanced';
  $('playing').textContent = playing ? 'Playing' : 'Ready';
  $('volumeValue').textContent = `${settings.volume}%`;
}

async function play() {
  if (playing) return;
  const request = ++playback;
  playing = true;
  render();
  $('status').textContent = 'Glide to change the sound. Release to stop.';
  try {
    const started = await audio.start(settings, position);
    if (started) audio.update(settings, position);
  } catch (error) {
    if (request !== playback) return;
    stop();
    $('status').textContent = error.message;
  }
}

function stop() {
  playback++;
  pointer = null;
  keyboardKey = null;
  playing = false;
  audio.stop();
  render();
  $('status').textContent = 'Sound released. Touch the pad to play again.';
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
  position.x = clamp(position.x + delta[0]);
  position.y = clamp(position.y + delta[1]);
  audio.update(settings, position);
  render();
});
window.addEventListener('keyup', event => { if (event.key === keyboardKey) stop(); });
pad.addEventListener('blur', stop);
window.addEventListener('blur', stop);
window.addEventListener('pagehide', stop);
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
$('stop').addEventListener('click', stop);

for (const id of ['wave', 'range', 'volume']) {
  $(id).value = settings[id];
  $(id).addEventListener('input', () => {
    settings[id] = id === 'volume' ? Number($(id).value) : $(id).value;
    audio.update(settings, position);
    save();
    render();
    $('status').textContent = storageAvailable ? 'Sound settings saved in this browser.' : 'Settings applied. Browser storage is unavailable.';
  });
}
render();
if (!storageAvailable) $('status').textContent = 'Ready to play. Browser storage is unavailable, so settings may not persist.';
