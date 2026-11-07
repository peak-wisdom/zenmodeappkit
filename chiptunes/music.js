// SPDX-License-Identifier: MIT
import {ROOTS, SCALES} from '../sound-pad/audio.js?v=3';
export {ROOTS};
export const STYLES = {arcade: 'Arcade', adventure: 'Adventure', dream: 'Dreamscape'};
export const SCALE_IDS = ['major', 'minor', 'minorPentatonic', 'dorian'];
export const SCALE_NAMES = Object.fromEntries(SCALE_IDS.map(id => [id, SCALES[id].name]));
export const TRACKS = ['lead', 'bass', 'arp', 'drums'];
export const DEFAULTS = {seed: 'little-adventure', root: 0, scale: 'minor', style: 'arcade', bars: 4, bpm: 120, volume: 35, loop: true, tracks: {lead: true, bass: true, arp: false, drums: true}};

export function validateSettings(value) {
  const seed = typeof value?.seed === 'string' ? value.seed.trim() : '';
  if (!seed || seed.length > 64) throw new Error('Enter a seed between 1 and 64 characters.');
  if (!Number.isInteger(value.root) || value.root < 0 || value.root > 11) throw new Error('Choose a root note.');
  if (!SCALE_IDS.includes(value.scale) || !Object.hasOwn(STYLES, value.style)) throw new Error('Choose a scale and style.');
  if (![4, 8].includes(value.bars)) throw new Error('Choose 4 or 8 bars.');
  if (!Number.isInteger(value.bpm) || value.bpm < 60 || value.bpm > 180) throw new Error('Tempo must be between 60 and 180 BPM.');
  if (!Number.isFinite(value.volume) || value.volume < 0 || value.volume > 100) throw new Error('Volume must be between 0 and 100.');
  return {seed, root: value.root, scale: value.scale, style: value.style, bars: value.bars, bpm: value.bpm, volume: value.volume, loop: value.loop === true,
    tracks: Object.fromEntries(TRACKS.map(track => [track, value.tracks?.[track] !== false]))};
}

export function compositionKey(settings) {
  return JSON.stringify([settings.seed, settings.root, settings.scale, settings.style, settings.bars]);
}

function randomSource(seed) {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i), 16777619);
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let value = Math.imul(state ^ state >>> 15, 1 | state);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function generate(settings) {
  const config = validateSettings(settings);
  const random = randomSource(config.seed + '/' + config.style);
  const pick = values => values[Math.floor(random() * values.length)];
  const scale = SCALES[config.scale].steps;
  const pitch = (degree, octave) => octave + config.root + Math.floor(degree / scale.length) * 12 + scale[((degree % scale.length) + scale.length) % scale.length];
  const progression = pick([[0, 5, 3, 4], [0, 3, 5, 4], [0, 4, 3, 0]]).map(degree => degree % scale.length);
  const motif = Array.from({length: 8}, (_, i) => i === 0 ? 0 : pick([-2, -1, 0, 1, 2, 4]));
  const events = [];
  const add = (track, step, duration, midi, velocity = 1, kind = '') => events.push({track, step, duration, midi, velocity, kind});
  for (let bar = 0; bar < config.bars; bar++) {
    const chord = progression[bar % progression.length];
    let degree = chord + scale.length;
    for (let beat = 0; beat < 8; beat++) {
      const step = bar * 16 + beat * 2;
      degree = Math.min(scale.length * 2 + 2, Math.max(3, degree + motif[beat]));
      if (beat === 0) degree = chord + scale.length;
      if (beat === 0 || beat === 7 || random() > (config.style === 'dream' ? 0.28 : 0.14)) {
        const ending = bar === config.bars - 1 && beat === 7;
        add('lead', step, config.style === 'dream' ? 1.7 : 1.35, pitch(ending ? scale.length : degree, 60), 0.75 + random() * 0.25);
      }
      add('arp', step, 0.75, pitch(chord + [0, 2, 4, 2][beat % 4], 60), 0.65);
    }
    for (let beat = 0; beat < 4; beat++) {
      add('bass', bar * 16 + beat * 4, 3.2, pitch(chord + (beat % 2 ? 4 : 0), 36), 0.9);
      add('drums', bar * 16 + beat * 4, 0.7, 0, 0.8, beat % 2 ? 'snare' : 'kick');
      if (config.style !== 'dream' || beat % 2 === 0) add('drums', bar * 16 + beat * 4 + 2, 0.35, 0, 0.55, 'hat');
    }
  }
  events.sort((a, b) => a.step - b.step);
  return {settings: config, key: compositionKey(config), steps: config.bars * 16, events};
}

export function encodeWav(buffer) {
  const samples = buffer.getChannelData(0);
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const text = (offset, value) => [...value].forEach((letter, i) => view.setUint8(offset + i, letter.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, i) => { const value = Math.max(-1, Math.min(1, sample)); view.setInt16(44 + i * 2, value * (value < 0 ? 32768 : 32767), true); });
  return bytes;
}
