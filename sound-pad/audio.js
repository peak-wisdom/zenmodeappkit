// SPDX-License-Identifier: MIT
export const RANGES = {low: [55, 440], mid: [110, 880], high: [220, 1760]};
export const clamp = value => Math.min(1, Math.max(0, value));

export function soundAt(x, y, range = 'mid') {
  const [low, high] = RANGES[range];
  const brightness = 1 - clamp(y);
  return {
    frequency: low * (high / low) ** clamp(x),
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
  }

  async start(settings, position) {
    const request = ++this.request;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('This browser does not support Web Audio. Try a current browser.');
    if (!this.context || this.context.state === 'closed') this.context = new Audio();
    if (this.context.state !== 'running') await this.context.resume();
    // A finger may lift while the browser is enabling audio.
    if (request !== this.request) return false;
    if (this.context.state !== 'running') throw new Error('Audio could not start. Touch the pad again to enable sound.');
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    oscillator.type = settings.wave;
    filter.type = 'lowpass';
    filter.Q.value = 0.65;
    gain.gain.value = 0;
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    oscillator.onended = () => { oscillator.disconnect(); filter.disconnect(); gain.disconnect(); };
    this.voice = {oscillator, filter, gain};
    this.update(settings, position, true);
    oscillator.start();
    return true;
  }

  update(settings, position, initial = false) {
    if (!this.voice) return;
    const now = this.context.currentTime;
    const sound = soundAt(position.x, position.y, settings.range);
    const {oscillator, filter, gain} = this.voice;
    oscillator.type = settings.wave;
    if (initial) {
      oscillator.frequency.setValueAtTime(sound.frequency, now);
      filter.frequency.setValueAtTime(sound.cutoff, now);
    } else {
      oscillator.frequency.setTargetAtTime(sound.frequency, now, 0.025);
      filter.frequency.setTargetAtTime(sound.cutoff, now, 0.035);
    }
    gain.gain.setTargetAtTime(sound.level * settings.volume / 100, now, 0.025);
  }

  stop() {
    this.request++;
    if (!this.voice) return;
    const {oscillator, gain} = this.voice;
    const now = this.context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0, now, 0.015);
    oscillator.stop(now + 0.12);
    this.voice = null;
  }
}
