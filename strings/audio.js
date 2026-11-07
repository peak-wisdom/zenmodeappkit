// SPDX-License-Identifier: MIT
import {INSTRUMENTS, chordNotes, frequencyFor} from './chords.js?v=1';

export class StringPlayer {
  constructor(onEnd, onError) {
    this.context = null; this.master = null; this.output = null;
    this.buffers = new Map(); this.sources = new Set(); this.events = [];
    this.epoch = 0; this.playing = false; this.timer = null;
    this.onEnd = onEnd; this.onError = onError;
  }

  async ready(volume) {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('This browser does not support Web Audio. Try a current browser.');
    if (!this.context || this.context.state === 'closed') {
      this.context = new Audio(); this.buffers.clear();
      this.output = this.context.createDynamicsCompressor(); this.output.threshold.value = -12; this.output.ratio.value = 5;
      this.master = this.context.createGain(); this.master.gain.value = volume / 100;
      this.output.connect(this.master); this.master.connect(this.context.destination);
    }
    if (this.context.state !== 'running') await this.context.resume();
    if (this.context.state !== 'running') throw new Error('Audio could not start. Try playing again.');
    this.setVolume(volume);
  }

  setVolume(value) { if (this.master) this.master.gain.setTargetAtTime(value / 100, this.context.currentTime, 0.02); }

  stringBuffer(instrument, midi) {
    const key = `${instrument}-${midi}`;
    if (this.buffers.has(key)) return this.buffers.get(key);
    const rate = this.context.sampleRate, frequency = frequencyFor(midi);
    const delay = Math.max(2, Math.round(rate / frequency - 0.5));
    const duration = instrument === 'guitar' ? 3.2 : 1.8;
    const buffer = this.context.createBuffer(1, Math.ceil(rate * duration), rate);
    const samples = buffer.getChannelData(0), ring = new Float32Array(delay);
    let random = midi * 7919 + 31;
    for (let i = 0; i < delay; i++) { random = Math.imul(random ^ random >>> 13, 1274126177); ring[i] = ((random >>> 0) / 4294967296 * 2 - 1) * 0.8; }
    const average = ring.reduce((sum, sample) => sum + sample, 0) / delay;
    for (let i = 0; i < delay; i++) ring[i] -= average;
    const damping = instrument === 'guitar' ? 0.996 : 0.989;
    for (let i = 0; i < samples.length; i++) {
      const index = i % delay, value = ring[index];
      ring[index] = (value + ring[(index + 1) % delay]) * 0.5 * damping;
      const attack = Math.min(1, i / (rate * 0.002));
      const release = Math.min(1, (samples.length - 1 - i) / (rate * 0.04));
      samples[i] = value * attack * release;
    }
    const result = {buffer, playbackRate: frequency / (rate / (delay + 0.5))};
    if (this.buffers.size >= 32) this.buffers.delete(this.buffers.keys().next().value);
    this.buffers.set(key, result);
    return result;
  }

  schedule(instrument, note, at, velocity = 1) {
    const cached = this.stringBuffer(instrument, note.midi);
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = cached.buffer; source.playbackRate.value = cached.playbackRate;
    gain.gain.value = 0.4 * velocity;
    source.connect(gain); gain.connect(this.output);
    this.sources.add(source);
    source.onended = () => { source.disconnect(); gain.disconnect(); this.sources.delete(source); };
    source.start(at);
    this.events.push({...note, instrument, at});
  }

  async pluck(instrument, string, fret, volume) {
    const epoch = this.epoch;
    await this.ready(volume);
    if (epoch !== this.epoch) return;
    this.schedule(instrument, {string, fret, midi: INSTRUMENTS[instrument].tuning[string] + fret}, this.context.currentTime + 0.01);
  }

  arrange(instrument, chord, at, settings, single = false) {
    const notes = chordNotes(instrument, chord);
    if (settings.direction === 'up') notes.reverse();
    const beat = 60 / settings.bpm;
    if (settings.style === 'arpeggio' && !single) {
      for (let index = 0; index < settings.beats * 2; index++) this.schedule(instrument, notes[index % notes.length], at + index * beat / 2, 0.85);
    } else {
      for (let strike = 0; strike < (single ? 1 : settings.beats); strike++) {
        notes.forEach((note, index) => this.schedule(instrument, note, at + strike * beat + index * 0.032, strike ? 0.75 : 1));
      }
    }
  }

  async strum(instrument, chord, settings) {
    const epoch = this.epoch;
    await this.ready(settings.volume);
    if (epoch === this.epoch) this.arrange(instrument, chord, this.context.currentTime + 0.02, settings, true);
  }

  async start(instrument, progression, settings) {
    this.stop(); const epoch = this.epoch;
    await this.ready(settings.volume);
    if (epoch !== this.epoch) return false;
    this.playing = true; this.progression = progression; this.settings = settings;
    this.chordDuration = settings.beats * 60 / settings.bpm;
    this.startAt = this.context.currentTime + 0.08;
    let nextAt = this.startAt, index = 0, finishAt = null;
    const tick = () => {
      try {
        if (finishAt !== null) { if (this.context.currentTime >= finishAt) { this.stop(); this.onEnd(); } return; }
        if (nextAt < this.context.currentTime - 0.3) { this.stop(); this.onError(new Error('Playback paused while this page was away. Press Play to restart.')); return; }
        while (nextAt < this.context.currentTime + 0.12) {
          this.arrange(instrument, progression[index], nextAt, settings);
          nextAt += this.chordDuration; index++;
          if (index === progression.length) {
            if (!settings.loop) { finishAt = nextAt + (instrument === 'guitar' ? 3.3 : 1.9); break; }
            index = 0;
          }
        }
      } catch (error) { this.stop(); this.onError(error); }
    };
    tick();
    if (this.playing) this.timer = setInterval(tick, 30);
    return this.playing;
  }

  get chordIndex() {
    if (!this.playing) return -1;
    const elapsed = Math.max(0, Math.floor((this.context.currentTime - this.startAt) / this.chordDuration));
    return this.settings.loop ? elapsed % this.progression.length : Math.min(this.progression.length - 1, elapsed);
  }

  get activeNotes() {
    if (!this.context) return [];
    const now = this.context.currentTime;
    this.events = this.events.filter(event => event.at > now - 0.24);
    return this.events.filter(event => event.at <= now);
  }

  stop() {
    this.epoch++; this.playing = false;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null; this.events = [];
    if (!this.context) return;
    const at = this.context.currentTime;
    this.master.gain.cancelScheduledValues(at); this.master.gain.setTargetAtTime(0, at, 0.005);
    for (const source of this.sources) { try { source.stop(at + 0.04); } catch {} }
  }
}
