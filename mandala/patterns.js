// SPDX-License-Identifier: MIT
export const PATTERNS = {
  lotus: {name: 'Lotus bloom', rings: [['petal', 8, 30, 112], ['petal', 16, 120, 212], ['petal', 24, 220, 326], ['petal', 32, 334, 450]]},
  star: {name: 'Starlight', rings: [['kite', 8, 30, 106], ['petal', 16, 114, 204], ['kite', 24, 212, 320], ['kite', 32, 328, 450]]},
  mosaic: {name: 'Sun mosaic', rings: [['petal', 12, 30, 104], ['fan', 24, 112, 186], ['kite', 24, 194, 282], ['fan', 36, 290, 366], ['petal', 36, 374, 450]]},
  rosette: {name: 'Garden rosette', rings: [['petal', 6, 30, 114], ['kite', 12, 122, 212], ['petal', 18, 220, 328], ['fan', 36, 336, 388], ['petal', 36, 396, 450]]}
};

export const PALETTES = {
  meadow: {name: 'Meadow', colors: ['#355e52', '#6a9c78', '#adc58d', '#f0cc79', '#d48b71', '#a67ca6']},
  sunrise: {name: 'Sunrise', colors: ['#f2bc70', '#e9966f', '#cd6c83', '#a36a99', '#6e709d', '#e7cf98']},
  ocean: {name: 'Ocean', colors: ['#235b76', '#3e829c', '#74b9bb', '#a6d1c1', '#d5dfaf', '#b394c6']},
  jewel: {name: 'Jewel', colors: ['#22577a', '#2a9d8f', '#7b4a9e', '#bd4773', '#dd8c35', '#d6bd64']}
};

const point = (radius, angle) => {
  const radians = (angle - 90) * Math.PI / 180;
  return [500 + radius * Math.cos(radians), 500 + radius * Math.sin(radians)].map(value => value.toFixed(3)).join(' ');
};

export function normalizeGenerator(options) {
  const seed = typeof options?.seed === 'string' ? options.seed.trim() : '';
  const detail = options?.detail;
  const symmetry = String(options?.symmetry);
  if (!seed || seed.length > 64) throw new Error('Enter a seed between 1 and 64 characters.');
  if (!['simple', 'balanced', 'intricate'].includes(detail)) throw new Error('Choose a detail level.');
  if (!['auto', '6', '8', '10', '12', '16'].includes(symmetry)) throw new Error('Choose a symmetry setting.');
  return {seed, detail, symmetry};
}

export function generatorKey(options) {
  const {seed, detail, symmetry} = normalizeGenerator(options);
  return 'generated:' + JSON.stringify([seed, detail, symmetry]);
}

function seededRandom(seed) {
  // FNV-1a followed by Mulberry32. Keep this stable so saved seeds recreate their geometry.
  let state = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    state = Math.imul(state ^ seed.charCodeAt(index), 16777619);
  }
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let value = Math.imul(state ^ state >>> 15, 1 | state);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function generatedPattern(options) {
  const config = normalizeGenerator(options);
  const random = seededRandom(config.seed);
  const pick = values => values[Math.floor(random() * values.length)];
  const symmetry = config.symmetry === 'auto' ? pick([6, 8, 10, 12, 16]) : Number(config.symmetry);
  const ringCount = {simple: 3, balanced: 4, intricate: 6}[config.detail] + Math.floor(random() * 2);
  const gap = 6 + random() * 5;
  const weights = Array.from({length: ringCount}, () => 0.7 + random() * 0.8);
  const available = 420 - gap * (ringCount - 1);
  const weightTotal = weights.reduce((total, weight) => total + weight, 0);
  const rotation = random() * 360;
  let inner = 30;
  const rings = weights.map(weight => {
    const outer = inner + weight / weightTotal * available;
    const multiplier = 1 + Math.floor(random() * Math.min(3, Math.floor(48 / symmetry)));
    const count = symmetry * multiplier;
    const shape = pick(['petal', 'kite', 'fan', 'arch']);
    // Narrow motifs in thin outer rings so their curves stay within their radial band.
    const band = outer - inner;
    const safeWidth = Math.acos(inner / (inner + band * 0.24)) * 180 / Math.PI * count / 360 * 0.85;
    const settings = {
      rotation: rotation + random() * 360 / count,
      width: Math.min(0.28 + random() * 0.19, safeWidth),
      shoulder: 0.25 + random() * 0.25,
      taper: 0.64 + random() * 0.22
    };
    const ring = [shape, count, inner, outer, settings];
    inner = outer + gap;
    return ring;
  });
  return {name: 'Seeded mandala', rings, symmetry};
}

export function makePattern(id, options) {
  const pattern = id === 'generated' ? generatedPattern(options) : PATTERNS[id];
  if (!pattern) throw new Error('Unknown mandala pattern');
  const shapes = [{id: 'center', ring: 0, sector: 0, path: 'M 500 476 A 24 24 0 1 1 500 524 A 24 24 0 1 1 500 476 Z', edges: ['M 500 476 A 24 24 0 1 1 500 524 A 24 24 0 1 1 500 476']}];
  pattern.rings.forEach(([type, count, inner, outer, settings = {}], ring) => {
    const step = 360 / count;
    for (let sector = 0; sector < count; sector++) {
      const angle = sector * step + (settings.rotation ?? (ring % 2 ? step / 2 : 0));
      const start = point(inner, angle), end = point(outer, angle);
      let edges;
      if (type === 'petal') {
        const width = step * (settings.width ?? 0.46), band = outer - inner;
        const shoulder = settings.shoulder ?? 0.3, taper = settings.taper ?? 0.78;
        edges = [
          `M ${start} C ${point(inner + band * shoulder, angle - width)} ${point(inner + band * taper, angle - width)} ${end}`,
          `M ${end} C ${point(inner + band * taper, angle + width)} ${point(inner + band * shoulder, angle + width)} ${start}`
        ];
      } else if (type === 'kite') {
        const left = point((inner + outer) / 2, angle - step * (settings.width ?? 0.46));
        const right = point((inner + outer) / 2, angle + step * (settings.width ?? 0.46));
        edges = [`M ${start} L ${left}`, `M ${left} L ${end}`, `M ${end} L ${right}`, `M ${right} L ${start}`];
      } else if (type === 'arch') {
        const width = step * settings.width, band = outer - inner;
        const left = point(inner, angle - width), right = point(inner, angle + width);
        edges = [
          `M ${left} C ${point(inner + band * 0.55, angle - width)} ${point(outer, angle - width)} ${end}`,
          `M ${end} C ${point(outer, angle + width)} ${point(inner + band * 0.55, angle + width)} ${right}`,
          `M ${right} A ${inner} ${inner} 0 0 0 ${left}`
        ];
      } else {
        const left = angle - step * (settings.width ?? 0.44), right = angle + step * (settings.width ?? 0.44);
        const a = point(inner, left), b = point(outer, left), c = point(outer, right), d = point(inner, right);
        edges = [`M ${a} L ${b}`, `M ${b} A ${outer} ${outer} 0 0 1 ${c}`, `M ${c} L ${d}`, `M ${d} A ${inner} ${inner} 0 0 0 ${a}`];
      }
      // Join each edge into one closed fill region, keeping edges independently traceable.
      const path = edges.map((edge, index) => index ? edge.replace(/^M [\d.]+ [\d.]+ /, '') : edge).join(' ') + ' Z';
      shapes.push({id: `r${ring}-${sector}`, ring: ring + 1, sector, path, edges});
    }
  });
  return shapes;
}

export function drawingSVG(shapes, drawing, {amoled = false, mode = 'trace', interactive = false} = {}) {
  const paper = amoled ? '#000000' : '#fffdf7';
  const pale = amoled ? '#4a525b' : '#c9cbc4';
  const ink = amoled ? '#f2f5f2' : '#243e34';
  const regions = shapes.map((shape, index) => `<path d="${shape.path}" fill="${drawing.fills[shape.id] || paper}"${interactive ? ` data-region="${shape.id}" role="button" tabindex="0" aria-label="${mode === 'trace' ? 'Trace' : mode === 'erase' ? 'Erase color from' : 'Color'} shape ${index + 1}"` : ''}/>`).join('');
  const lines = shapes.map(shape => shape.edges.map((edge, index) => {
    const id = `${shape.id}:${index}`;
    return `<path d="${edge}" fill="none" stroke="${drawing.lines[id] ? ink : pale}" stroke-width="${drawing.lines[id] ? 2.6 : 1.6}" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>`;
  }).join('')).join('');
  const targets = interactive && mode === 'trace' ? shapes.map(shape => shape.edges.map((edge, index) => `<path d="${edge}" data-line="${shape.id}:${index}" fill="none" stroke="transparent" stroke-width="14" pointer-events="stroke"/>`).join('')).join('') : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="3000" height="3000"${interactive ? ' role="group" aria-label="Interactive mandala drawing"' : ''}><rect width="1000" height="1000" fill="${paper}"/>${regions}${lines}${targets}</svg>`;
}
