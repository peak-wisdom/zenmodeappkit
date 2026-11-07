// SPDX-License-Identifier: MIT
import {ROOTS, INSTRUMENTS, QUALITIES, validChord, chordName, chordNotes, noteName, fretboardSVG} from './chords.js?v=1';
import {StringPlayer} from './audio.js?v=1';

const $ = id => document.getElementById(id);
const storageKey = 'still-string-studio-v1';
const state = {instrument: 'guitar', chord: {root: 0, quality: 'major'}, progression: [{root: 0, quality: 'major'}, {root: 7, quality: 'major'}, {root: 9, quality: 'minor'}, {root: 5, quality: 'major'}], bpm: 100, beats: 4, style: 'strum', direction: 'down', volume: 35, loop: false};
let operation = 0, starting = false, shownIndex = -1, storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (Object.hasOwn(INSTRUMENTS, saved?.instrument)) state.instrument = saved.instrument;
  if (validChord(saved?.chord)) state.chord = {root: saved.chord.root, quality: saved.chord.quality};
  if (Array.isArray(saved?.progression)) state.progression = saved.progression.filter(validChord).slice(0, 16).map(chord => ({root: chord.root, quality: chord.quality}));
  if (Number.isInteger(saved?.bpm) && saved.bpm >= 60 && saved.bpm <= 180) state.bpm = saved.bpm;
  if ([1, 2, 4].includes(saved?.beats)) state.beats = saved.beats;
  if (['strum', 'arpeggio'].includes(saved?.style)) state.style = saved.style;
  if (['down', 'up'].includes(saved?.direction)) state.direction = saved.direction;
  if (Number.isFinite(saved?.volume) && saved.volume >= 0 && saved.volume <= 100) state.volume = saved.volume;
  state.loop = saved?.loop === true;
} catch { /* Defaults remain usable when saved data cannot be read. */ }

function save() { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { storageAvailable = false; } }
function status(message) { $('status').textContent = message + (storageAvailable ? '' : ' Browser storage is unavailable.'); }
const player = new StringPlayer(() => { starting = false; shownIndex = -1; controls(); markCurrent(); status('Tune complete. Your chords are ready to play again.'); }, error => {
  operation++; starting = false; shownIndex = -1; controls(); markCurrent(); status(error.message);
});

function controls() {
  $('play').textContent = player.playing || starting ? 'Stop tune ■' : 'Play tune ▶';
  $('play').disabled = state.progression.length === 0;
  $('clear').disabled = state.progression.length === 0;
  $('add').disabled = state.progression.length >= 16;
  $('count').textContent = `${state.progression.length} / 16 chords`;
  $('bpmValue').textContent = `${state.bpm} BPM`; $('volumeValue').textContent = `${state.volume}%`;
}
function stop(message) {
  operation++; starting = false; shownIndex = -1; player.stop(); controls(); markCurrent();
  if (message) status(message);
}
function stopTune() { if (player.playing || starting) stop(); }
function markCurrent() {
  for (const card of $('progression').children) card.classList.toggle('current', Number(card.dataset.index) === shownIndex);
}

function showChord(chord, persist = true) {
  state.chord = {...chord};
  $('root').value = chord.root; $('quality').value = chord.quality;
  $('chordTitle').textContent = chordName(chord);
  $('tuning').textContent = INSTRUMENTS[state.instrument].description;
  $('fretboard').innerHTML = fretboardSVG(state.instrument, chord);
  const notes = chordNotes(state.instrument, chord).map(note => noteName(note.midi));
  $('chordNotes').textContent = `Chord notes · ${notes.join(' · ')}`;
  if (persist) save();
}

function renderProgression() {
  $('progression').replaceChildren();
  state.progression.forEach((chord, index) => {
    const card = document.createElement('article'); card.className = 'chord-card'; card.dataset.index = index;
    card.innerHTML = `<button type="button" class="view-chord" data-action="view" aria-label="View chord ${index+1}, ${chordName(chord)}"><strong>${chordName(chord)}</strong>${fretboardSVG(state.instrument, chord, true, 'card-'+index)}</button><div class="card-actions"><button type="button" data-action="play" aria-label="Play chord ${index+1}, ${chordName(chord)}">Play ♫</button><button type="button" data-action="left" aria-label="Move chord ${index+1} earlier" ${index===0?'disabled':''}>←</button><button type="button" data-action="right" aria-label="Move chord ${index+1} later" ${index===state.progression.length-1?'disabled':''}>→</button><button type="button" class="remove" data-action="remove" aria-label="Remove chord ${index+1}, ${chordName(chord)}">×</button></div>`;
    $('progression').append(card);
  });
  $('empty').hidden = state.progression.length > 0;
  markCurrent(); controls();
}

async function playChord(chord) {
  stopTune(); showChord(chord);
  const request = operation;
  try {
    await player.strum(state.instrument, chord, {...state});
    if (request === operation) status(`${chordName(chord)} strummed. Tap a string to explore its notes.`);
  } catch (error) { if (request === operation) status(error.message); }
}
$('strum').addEventListener('click', () => playChord(state.chord));
$('add').addEventListener('click', () => {
  if (state.progression.length >= 16) return;
  stopTune(); state.progression.push({...state.chord}); save(); renderProgression(); status(`${chordName(state.chord)} added to your tune.`);
});
$('progression').addEventListener('click', event => {
  const button = event.target.closest('button[data-action]'); if (!button) return;
  const index = Number(button.closest('[data-index]').dataset.index), action = button.dataset.action;
  if (action === 'play') { playChord(state.progression[index]); return; }
  stopTune();
  if (action === 'view') { showChord(state.progression[index]); status(`${chordName(state.chord)} shown on the fretboard.`); return; }
  if (action === 'remove') state.progression.splice(index, 1);
  else {
    const destination = index + (action === 'left' ? -1 : 1);
    if (destination < 0 || destination >= state.progression.length) return;
    [state.progression[index], state.progression[destination]] = [state.progression[destination], state.progression[index]];
  }
  save(); renderProgression(); status('Chord progression updated.');
});

async function pluck(target) {
  const cell = target.closest('[data-cell]'); if (!cell) return;
  stopTune();
  const string = Number(cell.dataset.string), fret = Number(cell.dataset.fret), request = operation;
  try {
    await player.pluck(state.instrument, string, fret, state.volume);
    if (request === operation) status(`Played ${noteName(INSTRUMENTS[state.instrument].tuning[string] + fret)} · string ${INSTRUMENTS[state.instrument].tuning.length-string}, fret ${fret}.`);
  } catch (error) { if (request === operation) status(error.message); }
}
$('fretboard').addEventListener('click', event => pluck(event.target));
$('fretboard').addEventListener('keydown', event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); pluck(event.target); } });

$('play').addEventListener('click', async () => {
  if (player.playing || starting) { stop('Tune stopped.'); return; }
  if (!state.progression.length) return;
  const request = ++operation; starting = true; controls(); status('Starting your chord progression…');
  try {
    const started = await player.start(state.instrument, state.progression.map(chord => ({...chord})), {...state});
    if (request !== operation) return;
    starting = false; player.setVolume(state.volume); controls();
    if (started) status('Playing your tune. The fretboard follows every chord.');
  } catch (error) { if (request === operation) { stop(); status(error.message); } }
});
$('stop').addEventListener('click', () => stop('All sound stopped.'));
$('clear').addEventListener('click', () => { stop(); state.progression = []; save(); renderProgression(); status('Tune cleared. Choose chords above to begin again.'); });

for (const [value, name] of ROOTS.entries()) { const option = document.createElement('option'); option.value = value; option.textContent = name; $('root').append(option); }
for (const [value, quality] of Object.entries(QUALITIES)) { const option = document.createElement('option'); option.value = value; option.textContent = quality.name; $('quality').append(option); }
for (const id of ['instrument', 'bpm', 'beats', 'style', 'direction', 'volume']) $(id).value = state[id];
$('loop').checked = state.loop;
for (const id of ['root', 'quality']) $(id).addEventListener('change', () => { stop(); showChord({root: Number($('root').value), quality: $('quality').value}); controls(); status('Chord ready. Strum it or add it to your tune.'); });
for (const id of ['instrument', 'bpm', 'beats', 'style', 'direction', 'volume', 'loop']) {
  $(id).addEventListener('input', () => {
    if (id !== 'volume') stop();
    state[id] = id === 'loop' ? $('loop').checked : ['bpm', 'beats', 'volume'].includes(id) ? Number($(id).value) : $(id).value;
    player.setVolume(state.volume); save(); controls();
    if (id === 'instrument') { showChord(state.chord); renderProgression(); }
    status('Settings saved in this browser.');
  });
}

setInterval(() => {
  const index = player.chordIndex;
  if (index >= 0 && index !== shownIndex) {
    shownIndex = index; showChord(state.progression[index], false); markCurrent();
    const container = $('progression'), card = container.children[index];
    if (card.offsetLeft < container.scrollLeft) container.scrollLeft = card.offsetLeft;
    else if (card.offsetLeft + card.offsetWidth > container.scrollLeft + container.clientWidth) container.scrollLeft = card.offsetLeft + card.offsetWidth - container.clientWidth;
  }
  const notes = new Set(player.activeNotes.filter(note => note.instrument === state.instrument).map(note => `${note.string}-${note.fret}`));
  for (const cell of $('fretboard').querySelectorAll('[data-cell]')) cell.classList.toggle('active', notes.has(cell.dataset.cell));
}, 70);
document.addEventListener('visibilitychange', () => { if (document.hidden) stop('Playback paused while this page was away.'); });
window.addEventListener('pagehide', () => stop());
showChord(state.chord); renderProgression();
