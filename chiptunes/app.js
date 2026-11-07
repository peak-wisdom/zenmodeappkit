// SPDX-License-Identifier: MIT
import {DEFAULTS, ROOTS, STYLES, SCALE_NAMES, TRACKS, validateSettings, compositionKey, generate, encodeWav} from './music.js?v=1';
import {ChipPlayer, renderSong} from './audio.js?v=1';

const $ = id => document.getElementById(id);
const storageKey = 'still-chiptunes-v1';
let settings = {...DEFAULTS, tracks: {...DEFAULTS.tracks}};
let song, starting = false, exporting = false, command = 0, storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved) settings = validateSettings(saved);
} catch { /* Defaults recover invalid or unavailable saved settings. */ }

function status(message) {
  $('status').textContent = message + (storageAvailable ? '' : ' Browser storage is unavailable.');
}
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(settings)); }
  catch { storageAvailable = false; }
}
const player = new ChipPlayer(() => { starting = false; controls(); status('Phrase complete. Press Play to hear it again.'); }, error => {
  command++; starting = false; controls(); status(error.message);
});

function readSettings() {
  return validateSettings({seed: $('seed').value, root: Number($('root').value), scale: $('scale').value, style: $('style').value, bars: Number($('bars').value),
    bpm: Number($('bpm').value), volume: Number($('volume').value), loop: $('loop').checked,
    tracks: Object.fromEntries(TRACKS.map(track => [track, $(track).checked]))});
}
function dirty() { return !song || compositionKey(settings) !== song.key; }
function controls() {
  $('play').textContent = player.playing || starting ? 'Stop ■' : 'Play tune ▶';
  $('play').disabled = exporting || dirty();
  $('download').disabled = exporting || starting || dirty();
  $('playState').textContent = exporting ? 'Rendering' : starting ? 'Starting' : player.playing ? 'Playing' : dirty() ? 'Create tune' : 'Ready';
  $('bpmValue').textContent = `${settings.bpm} BPM`; $('volumeValue').textContent = `${settings.volume}%`;
  $('playhead').style.display = player.playing ? 'block' : 'none';
}
function stop(message) {
  command++; starting = false; player.stop(); controls();
  if (message) status(message);
}

function draw() {
  const colors = {lead: '#b4eed5', bass: '#d8c98b', arp: '#acadd8', drums: '#d99792'};
  const pitched = song.events.filter(event => event.track !== 'drums');
  const low = Math.min(...pitched.map(event => event.midi)) - 1, high = Math.max(...pitched.map(event => event.midi)) + 1;
  let svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 240" aria-hidden="true">';
  for (let step = 0; step <= song.steps; step += 4) svg += `<path d="M${step / song.steps * 1000} 0V240" stroke="#b4eed5" opacity="${step % 16 ? 0.07 : 0.2}"/>`;
  for (let row = 0; row < 6; row++) svg += `<path d="M0 ${row * 40}H1000" stroke="#b4eed5" opacity=".06"/>`;
  for (const event of song.events) {
    const x = event.step / song.steps * 1000;
    const y = event.track === 'drums' ? 225 : 12 + (high - event.midi) / (high - low) * 190;
    const width = Math.max(3, event.duration / song.steps * 1000 - 1);
    svg += `<rect x="${x}" y="${y}" width="${width}" height="${event.track === 'drums' ? 5 : 7}" rx="2" fill="${colors[event.track]}" opacity="${settings.tracks[event.track] ? 0.9 : 0.12}"/>`;
  }
  $('roll').innerHTML = svg + '</svg>';
  $('songTitle').textContent = `${STYLES[song.settings.style]} · ${song.settings.seed}`;
  $('songInfo').textContent = `${ROOTS[song.settings.root]} ${SCALE_NAMES[song.settings.scale].toLowerCase()} · ${song.settings.bars} bars · 4/4`;
}

function create() {
  if (exporting) return;
  try { settings = readSettings(); }
  catch (error) { status(error.message); return; }
  stop(); song = generate(settings); save(); draw(); controls();
  status('Tune ready. Press Play, or download one phrase as WAV audio.');
}
$('composer').addEventListener('submit', event => { event.preventDefault(); if ($('composer').reportValidity()) create(); });
$('newTune').addEventListener('click', () => {
  $('seed').value = 'chip-' + Array.from(crypto.getRandomValues(new Uint32Array(2)), value => value.toString(16).padStart(8, '0')).join('');
  create();
});
$('play').addEventListener('click', async () => {
  if (player.playing || starting) { stop('Playback stopped.'); return; }
  if (dirty() || exporting) return;
  if (!TRACKS.some(track => settings.tracks[track])) { status('Enable at least one channel to hear your tune.'); return; }
  const request = ++command;
  starting = true; controls(); status('Starting your tune…');
  try {
    const started = await player.start(song, settings);
    if (request !== command) return;
    starting = false; controls();
    if (started) status(settings.loop ? 'Playing in a loop. Press Stop to finish.' : 'Playing one phrase.');
  } catch (error) { if (request === command) { stop(); status(error.message); } }
});

for (const id of ['seed', 'root', 'scale', 'style', 'bars', 'bpm', 'volume', 'loop', ...TRACKS]) {
  $(id).addEventListener('input', () => {
    let next;
    try { next = readSettings(); }
    catch (error) { stop(error.message); $('play').disabled = true; $('download').disabled = true; return; }
    if (id !== 'volume') stop();
    settings = next; player.setVolume(settings.volume); save(); controls();
    if (song) draw();
    status(dirty() ? 'Settings changed. Press Create from seed to generate the updated notes.' : id === 'volume' ? 'Volume updated.' : 'Settings saved. Press Play when you are ready.');
  });
}

$('download').addEventListener('click', async () => {
  if (exporting || dirty()) return;
  if (!TRACKS.some(track => settings.tracks[track]) || settings.volume === 0) { status('Enable a channel and raise the volume before downloading audio.'); return; }
  stop(); exporting = true;
  const inputs = [...document.querySelectorAll('.lab button, .lab input, .lab select')];
  inputs.forEach(input => { input.disabled = true; });
  $('download').textContent = 'Rendering WAV…'; controls(); status('Rendering one complete phrase…');
  try {
    const buffer = await renderSong(song, {...settings, tracks: {...settings.tracks}});
    const blob = new Blob([encodeWav(buffer)], {type: 'audio/wav'});
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `still-chiptune-${settings.seed.replace(/[^a-z0-9_-]/gi, '_')}-${settings.style}.wav`;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
    status('Your chiptune WAV download is ready.');
  } catch (error) { status(error.message || 'The audio could not render. Try again.'); }
  finally {
    exporting = false; inputs.forEach(input => { input.disabled = false; });
    $('download').textContent = 'Download WAV ↗'; controls();
  }
});

document.addEventListener('visibilitychange', () => { if (document.hidden && (player.playing || starting)) stop('Playback paused while this page was away.'); });
window.addEventListener('pagehide', () => stop());
setInterval(() => {
  if (!player.playing) return;
  const step = player.step;
  $('playhead').style.left = `${step / song.steps * 100}%`;
  $('position').textContent = `Bar ${Math.floor(step / 16) + 1} · Beat ${Math.floor(step % 16 / 4) + 1}`;
}, 80);

for (const [value, name] of ROOTS.entries()) {
  const option = document.createElement('option'); option.value = value; option.textContent = name; $('root').append(option);
}
for (const [value, name] of Object.entries(SCALE_NAMES)) {
  const option = document.createElement('option'); option.value = value; option.textContent = name; $('scale').append(option);
}
for (const id of ['seed', 'root', 'scale', 'style', 'bars', 'bpm', 'volume']) $(id).value = settings[id];
$('loop').checked = settings.loop;
TRACKS.forEach(track => { $(track).checked = settings.tracks[track]; });
create();
