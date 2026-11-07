// SPDX-License-Identifier: MIT
import {ROOTS, frequencyFor, noteName} from '../sound-pad/audio.js?v=3';
export {ROOTS, frequencyFor, noteName};
export const INSTRUMENTS = {
  guitar: {name: 'Guitar', tuning: [40, 45, 50, 55, 59, 64], description: 'Standard tuning · E2 A2 D3 G3 B3 E4'},
  ukulele: {name: 'Ukulele', tuning: [67, 60, 64, 69], description: 'Standard high-G tuning · G4 C4 E4 A4'}
};
export const QUALITIES = {
  major: {name: 'Major', suffix: '', intervals: [0, 4, 7]},
  minor: {name: 'Minor', suffix: 'm', intervals: [0, 3, 7]},
  seven: {name: 'Dominant 7', suffix: '7', intervals: [0, 4, 7, 10]},
  major7: {name: 'Major 7', suffix: 'maj7', intervals: [0, 4, 7, 11]},
  minor7: {name: 'Minor 7', suffix: 'm7', intervals: [0, 3, 7, 10]},
  sus2: {name: 'Suspended 2', suffix: 'sus2', intervals: [0, 2, 7]},
  sus4: {name: 'Suspended 4', suffix: 'sus4', intervals: [0, 5, 7]}
};

const guitarShapes = [
  {root: 4, shapes: {major: [0,2,2,1,0,0], minor: [0,2,2,0,0,0], seven: [0,2,0,1,0,0], major7: [0,2,1,1,0,0], minor7: [0,2,0,0,0,0], sus2: [0,2,4,4,0,0], sus4: [0,2,2,2,0,0]}},
  {root: 9, shapes: {major: [null,0,2,2,2,0], minor: [null,0,2,2,1,0], seven: [null,0,2,0,2,0], major7: [null,0,2,1,2,0], minor7: [null,0,2,0,1,0], sus2: [null,0,2,2,0,0], sus4: [null,0,2,2,3,0]}}
];
const ukuleleShapes = [
  {root: 0, shapes: {major: [0,0,0,3], minor: [0,3,3,3], seven: [0,0,0,1], major7: [0,0,0,2], minor7: [3,3,3,3], sus2: [0,2,3,3], sus4: [0,0,1,3]}},
  {root: 9, shapes: {major: [2,1,0,0], minor: [2,0,0,0], seven: [0,1,0,0], major7: [1,1,0,0], minor7: [0,0,0,0], sus2: [2,4,0,2], sus4: [2,2,0,0]}},
  {root: 5, shapes: {major: [2,0,1,0], minor: [1,0,1,3], seven: [2,3,1,0], major7: [2,4,1,3], minor7: [1,3,1,3], sus2: [0,0,1,3], sus4: [3,0,1,1]}}
];
const openGuitar = {
  '0-major': [null,3,2,0,1,0], '0-seven': [null,3,2,3,1,0], '0-major7': [null,3,2,0,0,0],
  '2-major': [null,null,0,2,3,2], '2-minor': [null,null,0,2,3,1], '2-seven': [null,null,0,2,1,2], '2-major7': [null,null,0,2,2,2], '2-minor7': [null,null,0,2,1,1], '2-sus2': [null,null,0,2,3,0], '2-sus4': [null,null,0,2,3,3],
  '7-major': [3,2,0,0,0,3], '7-seven': [3,2,0,0,0,1], '7-major7': [3,2,0,0,0,2], '7-sus2': [3,0,0,0,3,3], '7-sus4': [3,3,0,0,1,3]
};
const openUkulele = {'7-major': [0,2,3,2], '2-major': [2,2,2,0], '4-major': [1,4,0,2]};

export function chordName(chord) { return ROOTS[chord.root] + QUALITIES[chord.quality].suffix; }
export function validChord(chord) { return Number.isInteger(chord?.root) && chord.root >= 0 && chord.root < 12 && Object.hasOwn(QUALITIES, chord.quality); }

export function voicing(instrument, chord) {
  if (!Object.hasOwn(INSTRUMENTS, instrument) || !validChord(chord)) throw new Error('Choose an instrument and chord.');
  const open = (instrument === 'guitar' ? openGuitar : openUkulele)[`${chord.root}-${chord.quality}`];
  if (open) return [...open];
  const families = instrument === 'guitar' ? guitarShapes : ukuleleShapes;
  return families.map(family => {
    const offset = (chord.root - family.root + 12) % 12;
    return family.shapes[chord.quality].map(fret => fret === null ? null : fret + offset);
  }).sort((a, b) => Math.max(...a.filter(f => f !== null)) - Math.max(...b.filter(f => f !== null)))[0];
}

export function chordNotes(instrument, chord) {
  return voicing(instrument, chord).flatMap((fret, string) => fret === null ? [] : [{string, fret, midi: INSTRUMENTS[instrument].tuning[string] + fret}]);
}

export function fretboardSVG(instrument, chord, compact = false, instance = 'main') {
  const tuning = INSTRUMENTS[instrument].tuning, frets = voicing(instrument, chord);
  const lastFret = compact ? Math.max(5, Math.max(...frets.filter(f => f !== null)) + 1) : 12;
  const nut = 110, end = 1230;
  const at = fret => nut + (end - nut) * (1 - 2 ** (-fret / 12)) / (1 - 2 ** (-lastFret / 12));
  const yAt = string => 80 + (tuning.length - 1 - string) * 38;
  const bottom = yAt(0) + 26, height = bottom + 42;
  const gradient = `wood-${instrument}-${String(instance).replace(/[^a-z0-9_-]/gi, '')}`;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 ${height}" ${compact ? 'aria-hidden="true"' : 'role="group" aria-label="Playable '+ INSTRUMENTS[instrument].name +' fretboard"'}><defs><linearGradient id="${gradient}"><stop stop-color="#5a3826"/><stop offset=".5" stop-color="#39251d"/><stop offset="1" stop-color="#5b3b28"/></linearGradient></defs><rect x="${nut}" y="52" width="${end - nut}" height="${bottom - 52}" rx="7" fill="url(#${gradient})"/>`;
  for (let grain = 0; grain < 8; grain++) svg += `<path d="M${nut} ${62 + grain * (bottom-66)/8}H${end}" stroke="#d2a37e" opacity=".05"/>`;
  for (let fret = 1; fret <= lastFret; fret++) {
    svg += `<path d="M${at(fret)} 52V${bottom}" stroke="#b7aaa0" stroke-width="4"/><text x="${(at(fret - 1) + at(fret)) / 2}" y="34" text-anchor="middle" fill="#b4c9c2" font-size="18">${fret}</text>`;
    if ([3,5,7,9,12].includes(fret)) {
      const center = (at(fret - 1) + at(fret)) / 2, mid = (80 + yAt(0)) / 2;
      for (const y of fret === 12 ? [mid - 18, mid + 18] : [mid]) svg += `<circle cx="${center}" cy="${y}" r="6" fill="#c3ad8c" opacity=".5"/>`;
    }
  }
  svg += `<rect x="${nut-4}" y="50" width="9" height="${bottom-48}" rx="2" fill="#eadfc8"/>`;
  tuning.forEach((open, string) => {
    const y = yAt(string), thickness = 1 + (tuning.length - 1 - string) * 0.45;
    svg += `<path d="M65 ${y}H${end}" stroke="#d9cbb3" stroke-width="${thickness}"/><text x="22" y="${y+6}" text-anchor="middle" fill="#c6d8ce" font-size="17">${noteName(open)}</text>`;
    if (frets[string] === null) svg += `<text x="83" y="${y+7}" text-anchor="middle" fill="#e3a39a" font-size="22">×</text>`;
    for (let fret = 0; fret <= lastFret; fret++) {
      const x = fret ? (at(fret - 1) + at(fret)) / 2 : 80;
      const selected = frets[string] === fret;
      const midi = open + fret;
      svg += `<g${compact ? '' : ` class="fret-cell" data-cell="${string}-${fret}" data-string="${string}" data-fret="${fret}" role="button" tabindex="0" aria-label="String ${tuning.length-string}, ${noteName(open)}, fret ${fret}, ${noteName(midi)}"`}><rect x="${fret ? at(fret-1)+3 : 56}" y="${y-17}" width="${fret ? at(fret)-at(fret-1)-6 : 48}" height="34" rx="4" fill="transparent"/>`;
      if (selected) svg += `<circle cx="${x}" cy="${y}" r="14" fill="${fret ? '#b4eed5' : '#39251d'}" stroke="#b4eed5" stroke-width="3"/>`;
      if (!compact) svg += `<circle class="played-dot" cx="${x}" cy="${y}" r="15" fill="#f3c67f"/><text class="played-note" x="${x}" y="${y+5}" text-anchor="middle" font-size="11" fill="#2b271c">${noteName(midi)}</text>`;
      svg += '</g>';
    }
  });
  svg += `<text x="80" y="${height-4}" text-anchor="middle" fill="#b4c9c2" font-size="15">Open</text>`;
  return svg + '</svg>';
}
