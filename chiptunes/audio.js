// SPDX-License-Identifier: MIT
import {frequencyFor} from '../sound-pad/audio.js?v=3';

function makeRack(context, volume) {
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -12; compressor.ratio.value = 5;
  const master = context.createGain(); master.gain.value = volume / 100;
  compressor.connect(master); master.connect(context.destination);
  const noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const samples = noise.getChannelData(0);
  let state = 32767;
  for (let i = 0; i < samples.length; i++) { state = (state >> 1) | (((state ^ (state >> 1)) & 1) << 14); samples[i] = state & 1 ? 1 : -1; }
  return {context, compressor, master, noise, waves: new Map(), nodes: new Set()};
}

function pulse(rack, duty) {
  if (rack.waves.has(duty)) return rack.waves.get(duty);
  const real = new Float32Array(65), imaginary = new Float32Array(65);
  for (let harmonic = 1; harmonic < real.length; harmonic++) real[harmonic] = 2 * Math.sin(Math.PI * harmonic * duty) / (Math.PI * harmonic);
  const wave = rack.context.createPeriodicWave(real, imaginary);
  rack.waves.set(duty, wave);
  return wave;
}

function scheduleNote(rack, event, at, stepDuration, style) {
  const context = rack.context;
  const gain = context.createGain();
  let source, filter;
  let duration = event.duration * stepDuration;
  let level = {lead: 0.12, bass: 0.14, arp: 0.055, drums: 0.1}[event.track] * event.velocity;
  if (event.kind === 'snare' || event.kind === 'hat') {
    source = context.createBufferSource(); source.buffer = rack.noise;
    filter = context.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = event.kind === 'hat' ? 6500 : 1400;
    duration = event.kind === 'hat' ? 0.045 : 0.12;
    source.connect(filter); filter.connect(gain);
  } else {
    source = context.createOscillator();
    if (event.kind === 'kick') {
      source.type = 'sine'; source.frequency.setValueAtTime(130, at); source.frequency.exponentialRampToValueAtTime(38, at + 0.1);
      duration = 0.16; level = 0.25 * event.velocity;
    } else {
      source.frequency.setValueAtTime(frequencyFor(event.midi), at);
      if (event.track === 'bass' || style === 'dream') source.type = 'triangle';
      else source.setPeriodicWave(pulse(rack, style === 'adventure' ? 0.25 : 0.5));
    }
    source.connect(gain);
  }
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(level, at + 0.004);
  gain.gain.setValueAtTime(level * 0.75, at + Math.max(0.006, duration * 0.6));
  gain.gain.linearRampToValueAtTime(0, at + duration);
  gain.connect(rack.compressor);
  rack.nodes.add(source);
  source.onended = () => { source.disconnect(); filter?.disconnect(); gain.disconnect(); rack.nodes.delete(source); };
  source.start(at); source.stop(at + duration + 0.005);
}

export class ChipPlayer {
  constructor(onEnd, onError) {
    this.context = null; this.rack = null; this.timer = null; this.request = 0;
    this.onEnd = onEnd; this.onError = onError; this.playing = false;
  }

  async start(song, settings) {
    this.stop();
    const request = ++this.request;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('This browser does not support Web Audio. Try a current browser.');
    if (!this.context || this.context.state === 'closed') this.context = new Audio();
    if (this.context.state !== 'running') await this.context.resume();
    if (request !== this.request) return false;
    if (this.context.state !== 'running') throw new Error('Audio could not start. Press Play again.');
    this.song = song; this.settings = settings;
    this.rack = makeRack(this.context, settings.volume);
    this.stepDuration = 60 / settings.bpm / 4;
    this.startAt = this.context.currentTime + 0.06; this.nextAt = this.startAt; this.nextStep = 0; this.finishAt = null;
    this.playing = true;
    const schedule = () => {
      try {
        if (this.finishAt !== null) {
          if (this.context.currentTime >= this.finishAt) { this.stop(); this.onEnd(); }
          return;
        }
        // Resume from the present if the browser briefly throttles this page.
        if (this.nextAt < this.context.currentTime - 0.25) {
          this.stop(); this.onError(new Error('Playback paused while the browser was inactive. Press Play to restart.')); return;
        }
        while (this.nextAt < this.context.currentTime + 0.12) {
          for (const event of song.events) {
            if (event.step === this.nextStep && settings.tracks[event.track]) scheduleNote(this.rack, event, this.nextAt, this.stepDuration, settings.style);
          }
          this.nextAt += this.stepDuration;
          this.nextStep++;
          if (this.nextStep === song.steps) {
            if (!settings.loop) { this.finishAt = this.nextAt + 0.2; break; }
            this.nextStep = 0;
          }
        }
      } catch (error) { this.stop(); this.onError(error); }
    };
    schedule();
    if (this.playing) this.timer = setInterval(schedule, 25);
    return this.playing;
  }

  get step() {
    if (!this.playing) return 0;
    const elapsed = Math.max(0, Math.floor((this.context.currentTime - this.startAt) / this.stepDuration));
    return this.settings.loop ? elapsed % this.song.steps : Math.min(this.song.steps - 1, elapsed);
  }

  setVolume(value) {
    if (this.rack) this.rack.master.gain.setTargetAtTime(value / 100, this.context.currentTime, 0.025);
  }

  stop() {
    this.request++; this.playing = false;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    if (!this.rack) return;
    const rack = this.rack, at = this.context.currentTime;
    rack.master.gain.cancelScheduledValues(at); rack.master.gain.setTargetAtTime(0, at, 0.005);
    for (const node of rack.nodes) { try { node.stop(at + 0.035); } catch {} }
    setTimeout(() => { rack.compressor.disconnect(); rack.master.disconnect(); }, 80);
    this.rack = null;
  }
}

export async function renderSong(song, settings) {
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!Offline) throw new Error('Audio export is unavailable in this browser. Try a current browser.');
  const stepDuration = 60 / settings.bpm / 4;
  const context = new Offline(1, Math.ceil((song.steps * stepDuration + 0.3) * 44100), 44100);
  const rack = makeRack(context, settings.volume);
  for (const event of song.events) if (settings.tracks[event.track]) scheduleNote(rack, event, event.step * stepDuration + 0.02, stepDuration, settings.style);
  return context.startRendering();
}
