// SPDX-License-Identifier: MIT
export const RANGES = {low: [55, 440], mid: [110, 880], high: [220, 1760]};
export const clamp = value => Math.min(1, Math.max(0, value));
export const ROOTS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export const SCALES = {
  continuous: {name: 'Free glide', steps: []},
  majorPentatonic: {name: 'Major pentatonic', steps: [0, 2, 4, 7, 9]},
  minorPentatonic: {name: 'Minor pentatonic', steps: [0, 3, 5, 7, 10]},
  major: {name: 'Major', steps: [0, 2, 4, 5, 7, 9, 11]},
  minor: {name: 'Natural minor', steps: [0, 2, 3, 5, 7, 8, 10]},
  dorian: {name: 'Dorian', steps: [0, 2, 3, 5, 7, 9, 10]},
  chromatic: {name: 'Chromatic', steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}
};

export const frequencyFor = midi => 440 * 2 ** ((midi - 69) / 12);
export const noteName = midi => ROOTS[midi % 12] + (Math.floor(midi / 12) - 1);

export function notesFor(settings) {
  const scale = settings.wave === 'steel-drum' && (!settings.scale || settings.scale === 'continuous') ? 'majorPentatonic' : settings.scale || 'continuous';
  const steps = SCALES[scale].steps;
  if (!steps.length) return [];
  const root = settings.root || 0;
  let low, high;
  if (settings.wave === 'steel-drum') {
    low = {low: 48, mid: 60, high: 72}[settings.range] + root;
    high = low + 24;
  } else {
    const bounds = RANGES[settings.range];
    low = Math.ceil(69 + 12 * Math.log2(bounds[0] / 440));
    high = Math.floor(69 + 12 * Math.log2(bounds[1] / 440));
  }
  const notes = [];
  for (let midi = low; midi <= high; midi++) {
    if (steps.includes(((midi - root) % 12 + 12) % 12)) notes.push({midi, name: noteName(midi), frequency: frequencyFor(midi)});
  }
  return notes;
}

export function soundAt(x, y, options = 'mid') {
  const settings = typeof options === 'string' ? {range: options} : options;
  const [low, high] = RANGES[settings.range];
  const brightness = 1 - clamp(y);
  const notes = notesFor(settings);
  const note = notes[Math.round(clamp(x) * (notes.length - 1))];
  return {
    frequency: note ? note.frequency : low * (high / low) ** clamp(x),
    midi: note?.midi,
    note: note?.name || 'Free glide',
    cutoff: 240 * 25 ** brightness,
    level: 0.08 + brightness * 0.22,
    brightness
  };
}

export class PadAudio {
  constructor() {
    this.context = null;
    this.voice = null;
    this.request = 0;
    this.held = false;
    this.lastNote = null;
    this.hits = new Set();
    this.output = null;
    this.master = null;
  }

  async start(settings, position) {
    const request = ++this.request;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('This browser does not support Web Audio. Try a current browser.');
    if (!this.context || this.context.state === 'closed') {
      this.context = new Audio();
      this.output = this.context.createDynamicsCompressor();
      this.output.threshold.value = -10;
      this.output.ratio.value = 6;
      this.master = this.context.createGain();
      this.master.gain.value = settings.volume / 100;
      this.output.connect(this.master);
      this.master.connect(this.context.destination);
    }
    if (this.context.state !== 'running') await this.context.resume();
    // A finger may lift while the browser is enabling audio.
    if (request !== this.request) return false;
    if (this.context.state !== 'running') throw new Error('Audio could not start. Touch the pad again to enable sound.');
    this.held = true;
    this.lastNote = null;
    if (settings.wave === 'steel-drum') {
      this.update(settings, position);
      return true;
    }
    this.createVoice(settings, position);
    return true;
  }

  createVoice(settings, position) {
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    oscillator.type = settings.wave;
    filter.type = 'lowpass';
    filter.Q.value = 0.65;
    gain.gain.value = 0;
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);
    oscillator.onended = () => { oscillator.disconnect(); filter.disconnect(); gain.disconnect(); };
    this.voice = {oscillator, filter, gain};
    this.update(settings, position, true);
    oscillator.start();
  }

  update(settings, position, initial = false) {
    if (this.master && this.context.state !== 'closed') this.master.gain.setTargetAtTime(settings.volume / 100, this.context.currentTime, 0.02);
    if (!this.held) return;
    const sound = soundAt(position.x, position.y, settings);
    if (settings.wave === 'steel-drum') {
      this.releaseVoice();
      if (sound.midi !== this.lastNote) {
        this.strike(settings, sound);
        this.lastNote = sound.midi;
      }
      return;
    }
    if (!this.voice) {
      this.createVoice(settings, position);
      return;
    }
    this.lastNote = null;
    const now = this.context.currentTime;
    const {oscillator, filter, gain} = this.voice;
    oscillator.type = settings.wave;
    if (initial) {
      oscillator.frequency.setValueAtTime(sound.frequency, now);
      filter.frequency.setValueAtTime(sound.cutoff, now);
    } else {
      oscillator.frequency.setTargetAtTime(sound.frequency, now, 0.025);
      filter.frequency.setTargetAtTime(sound.cutoff, now, 0.035);
    }
    gain.gain.setTargetAtTime(sound.level, now, 0.025);
  }

  strike(settings, sound) {
    // A struck steelpan-like tone, built from decaying modes with a bright attack.
    while (this.hits.size >= 12) this.fadeHit(this.hits.values().next().value);
    const now = this.context.currentTime;
    const sustain = settings.sustain || 1.4;
    const hit = {parts: [], ended: 0};
    this.hits.add(hit);
    const modes = [[1, 1, 1], [2.005, 0.45, 0.68], [3.97, 0.18, 0.4], [5.43, 0.07, 0.22]];
    modes.forEach(([ratio, weight, decay], index) => {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      const frequency = Math.min(sound.frequency * ratio, this.context.sampleRate * 0.45);
      const level = (0.07 + sound.brightness * 0.15) * weight * (index ? 0.3 + sound.brightness * 0.7 : 1);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency * 1.008, now);
      oscillator.frequency.exponentialRampToValueAtTime(frequency, now + 0.055);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(level, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.025 + sustain * decay);
      oscillator.connect(gain);
      gain.connect(this.output);
      oscillator.onended = () => {
        oscillator.disconnect(); gain.disconnect();
        if (++hit.ended === modes.length) this.hits.delete(hit);
      };
      hit.parts.push({oscillator, gain});
      oscillator.start(now);
      oscillator.stop(now + 0.06 + sustain * decay);
    });
  }

  fadeHit(hit) {
    const now = this.context.currentTime;
    for (const {oscillator, gain} of hit.parts) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, 0.01);
      oscillator.stop(now + 0.08);
    }
    this.hits.delete(hit);
  }

  releaseVoice() {
    if (!this.voice) return;
    const {oscillator, gain} = this.voice;
    const now = this.context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0, now, 0.015);
    oscillator.stop(now + 0.12);
    this.voice = null;
  }

  release() {
    this.request++;
    this.held = false;
    this.lastNote = null;
    this.releaseVoice();
  }

  stop() {
    this.release();
    for (const hit of this.hits) this.fadeHit(hit);
  }
}
