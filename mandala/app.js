// SPDX-License-Identifier: MIT
import {PATTERNS, PALETTES, makePattern, drawingSVG, normalizeGenerator, generatorKey, generatedPattern} from './patterns.js?v=2';

const $ = id => document.getElementById(id);
const storageKey = 'still-mandala-v1';
const validColor = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const blankDrawing = () => ({fills: {}, lines: {}, arrangement: 0});
const state = {
  pattern: 'lotus', palette: 'meadow', color: '#6a9c78', amoled: false, drawings: {},
  generator: {seed: 'still-garden', detail: 'balanced', symmetry: 'auto'}, recent: []
};
const histories = {};
let mode = 'trace';
let shapes = [];
let exporting = false;
let storageAvailable = true;

function restoreDrawing(previous, patternShapes) {
  const restored = blankDrawing();
  for (const shape of patternShapes) {
    if (validColor(previous?.fills?.[shape.id])) restored.fills[shape.id] = previous.fills[shape.id];
    shape.edges.forEach((edge, index) => {
      const lineId = `${shape.id}:${index}`;
      if (previous?.lines?.[lineId] === true) restored.lines[lineId] = true;
    });
  }
  if (Number.isInteger(previous?.arrangement)) restored.arrangement = Math.abs(previous.arrangement % 6);
  return restored;
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved || typeof saved !== 'object') return;
    if (Object.hasOwn(PATTERNS, saved.pattern)) state.pattern = saved.pattern;
    if (Object.hasOwn(PALETTES, saved.palette)) state.palette = saved.palette;
    if (validColor(saved.color)) state.color = saved.color;
    state.amoled = saved.amoled === true;
    for (const id of Object.keys(PATTERNS)) {
      const previous = saved.drawings?.[id];
      if (!previous || typeof previous !== 'object') continue;
      state.drawings[id] = restoreDrawing(previous, makePattern(id));
    }
    if (Array.isArray(saved.recent)) {
      for (const options of saved.recent.slice(-12)) {
        try {
          const config = normalizeGenerator(options);
          if (!state.recent.some(item => generatorKey(item) === generatorKey(config))) state.recent.push(config);
        } catch { /* Ignore invalid saved generator settings. */ }
      }
    }
    try {
      state.generator = normalizeGenerator(saved.generator);
      if (saved.pattern === 'generated') {
        state.pattern = 'generated';
        const key = generatorKey(state.generator);
        state.recent = state.recent.filter(item => generatorKey(item) !== key);
        state.recent.push(state.generator);
        state.recent = state.recent.slice(-12);
      }
    } catch { /* Older saved drawings have no generator settings. */ }
    for (const config of state.recent) {
      const key = generatorKey(config);
      state.drawings[key] = restoreDrawing(saved.drawings?.[key], makePattern('generated', config));
    }
  } catch {
    storageAvailable = false;
  }
}

function status(message) {
  $('status').textContent = message + (storageAvailable ? ' Saved in this browser.' : ' Browser storage is unavailable. Download your design before leaving.');
}

function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); }
  catch { storageAvailable = false; }
}

function drawing() {
  return state.drawings[currentKey()];
}

function currentKey() {
  return state.pattern === 'generated' ? generatorKey(state.generator) : state.pattern;
}

function history() {
  return histories[currentKey()] ||= {undo: [], redo: []};
}

function renderDrawing() {
  const focusedShape = document.activeElement?.dataset?.region;
  $('drawing').innerHTML = drawingSVG(shapes, drawing(), {amoled: state.amoled, mode, interactive: true});
  $('progress').textContent = `${Object.keys(drawing().fills).length} / ${shapes.length} shapes colored`;
  $('undo').disabled = history().undo.length === 0 || exporting;
  $('redo').disabled = history().redo.length === 0 || exporting;
  if (focusedShape) $('drawing').querySelector(`[data-region="${focusedShape}"]`)?.focus({preventScroll: true});
}

function edit(change, message) {
  if (exporting) return;
  const before = JSON.stringify(drawing());
  change(drawing());
  if (before === JSON.stringify(drawing())) return;
  history().undo.push(before);
  if (history().undo.length > 40) history().undo.shift();
  history().redo = [];
  save();
  renderDrawing();
  status(message);
}

function renderSwatches() {
  $('swatches').replaceChildren();
  for (const color of PALETTES[state.palette].colors) {
    const button = document.createElement('button');
    button.type = 'button';
    button.style.backgroundColor = color;
    button.setAttribute('aria-label', `Use color ${color}`);
    button.setAttribute('aria-pressed', String(color === state.color));
    button.addEventListener('click', () => {
      state.color = color;
      $('color').value = color;
      setMode('color');
      save();
      renderSwatches();
    });
    $('swatches').append(button);
  }
}

function selectPattern(id) {
  state.pattern = id;
  state.drawings[currentKey()] ||= blankDrawing();
  shapes = makePattern(id, state.generator);
  $('patternTitle').textContent = id === 'generated' ? `Generated · ${generatedPattern(state.generator).symmetry}-fold` : PATTERNS[id].name;
  for (const button of $('patterns').querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.pattern === id));
  renderRecent();
  renderDrawing();
  save();
}

function syncGeneratorControls() {
  $('seed').value = state.generator.seed;
  $('detail').value = state.generator.detail;
  $('symmetry').value = state.generator.symmetry;
}

function renderRecent() {
  $('recent').replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Choose a saved design';
  $('recent').append(placeholder);
  for (const config of [...state.recent].reverse()) {
    const option = document.createElement('option');
    option.value = generatorKey(config);
    option.textContent = `${config.seed} · ${config.detail} · ${generatedPattern(config).symmetry}-fold`;
    $('recent').append(option);
  }
  $('recent').value = state.pattern === 'generated' ? currentKey() : '';
  $('recent').disabled = exporting || state.recent.length === 0;
}

function openGenerated(options) {
  if (exporting) return;
  let config;
  try { config = normalizeGenerator(options); }
  catch (error) { status(error.message); return; }
  const key = generatorKey(config);
  const restored = Boolean(state.drawings[key]);
  state.generator = config;
  state.recent = state.recent.filter(item => generatorKey(item) !== key);
  state.recent.push(config);
  if (state.recent.length > 12) {
    const oldestKey = generatorKey(state.recent.shift());
    delete state.drawings[oldestKey];
    delete histories[oldestKey];
  }
  syncGeneratorControls();
  selectPattern('generated');
  setMode('trace');
  status(restored ? 'Saved generated design reopened.' : 'A fresh seeded pattern is ready to trace.');
}

$('newPattern').addEventListener('click', () => {
  const values = crypto.getRandomValues(new Uint32Array(2));
  const seed = 'm-' + Array.from(values, value => value.toString(16).padStart(8, '0')).join('');
  openGenerated({seed, detail: $('detail').value, symmetry: $('symmetry').value});
});
$('generatorForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!$('generatorForm').reportValidity()) return;
  openGenerated({seed: $('seed').value, detail: $('detail').value, symmetry: $('symmetry').value});
});
$('recent').addEventListener('change', () => {
  const config = state.recent.find(item => generatorKey(item) === $('recent').value);
  if (config) openGenerated(config);
});

function setMode(next) {
  mode = next;
  for (const button of document.querySelectorAll('[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
  $('modeHint').textContent = {
    trace: state.amoled ? 'Tap a pale outline to brighten it.' : 'Tap a pale line to darken it.',
    color: 'Tap inside a shape to fill it with your chosen color.',
    erase: 'Tap a shape to remove its color.'
  }[mode];
  renderDrawing();
}

function activate(target) {
  const line = target.closest('[data-line]');
  if (line && mode === 'trace') {
    edit(current => { current.lines[line.dataset.line] = true; }, 'Outline traced.');
    return;
  }
  const region = target.closest('[data-region]');
  if (!region) return;
  const id = region.dataset.region;
  edit(current => {
    if (mode === 'color') current.fills[id] = state.color;
    else if (mode === 'erase') delete current.fills[id];
    else shapes.find(shape => shape.id === id).edges.forEach((edge, index) => { current.lines[`${id}:${index}`] = true; });
  }, mode === 'trace' ? 'Shape outlined.' : mode === 'color' ? 'A little more color.' : 'Color removed.');
}

$('drawing').addEventListener('click', event => activate(event.target));
$('drawing').addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    activate(event.target);
  }
});
for (const button of document.querySelectorAll('[data-mode]')) button.addEventListener('click', () => setMode(button.dataset.mode));

$('palette').addEventListener('change', () => {
  state.palette = $('palette').value;
  state.color = PALETTES[state.palette].colors[0];
  $('color').value = state.color;
  renderSwatches();
  save();
});
$('color').addEventListener('input', () => {
  state.color = $('color').value;
  setMode('color');
  renderSwatches();
  save();
});
$('amoled').addEventListener('change', () => {
  state.amoled = $('amoled').checked;
  setMode(mode);
  save();
  status(state.amoled ? 'AMOLED background selected.' : 'Paper background selected.');
});
$('zoom').addEventListener('change', () => {
  $('drawing').style.width = `${Number($('zoom').value) * 100}%`;
});
$('fillAll').addEventListener('click', () => edit(current => {
  current.arrangement = (current.arrangement + 1) % 6;
  const colors = PALETTES[state.palette].colors;
  for (const shape of shapes) {
    current.fills[shape.id] = colors[(shape.ring * 2 + shape.sector % 3 + current.arrangement) % colors.length];
    shape.edges.forEach((edge, index) => { current.lines[`${shape.id}:${index}`] = true; });
  }
}, 'The whole mandala is colored. Undo restores your previous work.'));
$('clear').addEventListener('click', () => edit(current => {
  current.fills = {};
  current.lines = {};
}, 'A fresh pale pattern. Undo brings your work back.'));

function travel(from, to) {
  if (exporting || !history()[from].length) return;
  history()[to].push(JSON.stringify(drawing()));
  state.drawings[currentKey()] = JSON.parse(history()[from].pop());
  save();
  renderDrawing();
  status(from === 'undo' ? 'Last change undone.' : 'Change restored.');
}
$('undo').addEventListener('click', () => travel('undo', 'redo'));
$('redo').addEventListener('click', () => travel('redo', 'undo'));

$('download').addEventListener('click', async () => {
  if (exporting) return;
  exporting = true;
  const controls = [...document.querySelectorAll('.tools button, .tools input, .tools select, #zoom')];
  controls.forEach(control => { control.disabled = true; });
  $('download').textContent = 'Preparing your image…';
  let sourceURL;
  try {
    sourceURL = URL.createObjectURL(new Blob([drawingSVG(shapes, drawing(), {amoled: state.amoled})], {type: 'image/svg+xml;charset=utf-8'}));
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = sourceURL; });
    const canvas = document.createElement('canvas');
    canvas.width = 3000;
    canvas.height = 3000;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.drawImage(image, 0, 0, 3000, 3000);
    const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!png) throw new Error('PNG export failed');
    const url = URL.createObjectURL(png);
    const link = document.createElement('a');
    link.href = url;
    const designName = state.pattern === 'generated'
      ? `generated-${state.generator.seed.replace(/[^a-z0-9_-]/gi, '_')}-${state.generator.detail}-${state.generator.symmetry}`
      : state.pattern;
    link.download = `still-mandala-${designName}${state.amoled ? '-amoled' : ''}.png`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    status('Your 3000 × 3000 PNG download is ready.');
  } catch {
    status('The image could not export. Close other tabs and try again.');
  } finally {
    if (sourceURL) URL.revokeObjectURL(sourceURL);
    exporting = false;
    controls.forEach(control => { control.disabled = false; });
    $('download').textContent = 'Download PNG ↗';
    renderRecent();
    renderDrawing();
  }
});

load();
for (const [id, pattern] of Object.entries(PATTERNS)) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.pattern = id;
  button.innerHTML = drawingSVG(makePattern(id), blankDrawing()) + pattern.name;
  button.querySelector('svg').setAttribute('aria-hidden', 'true');
  button.addEventListener('click', () => { selectPattern(id); status(`${pattern.name} opened.`); });
  $('patterns').append(button);
}
for (const [id, palette] of Object.entries(PALETTES)) {
  const option = document.createElement('option');
  option.value = id;
  option.textContent = palette.name;
  $('palette').append(option);
}
$('palette').value = state.palette;
$('color').value = state.color;
$('amoled').checked = state.amoled;
syncGeneratorControls();
renderSwatches();
selectPattern(state.pattern);
setMode('trace');
status('Your mandala is ready.');
