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

export function makePattern(id) {
  const pattern = PATTERNS[id];
  if (!pattern) throw new Error('Unknown mandala pattern');
  const shapes = [{id: 'center', ring: 0, sector: 0, path: 'M 500 476 A 24 24 0 1 1 500 524 A 24 24 0 1 1 500 476 Z', edges: ['M 500 476 A 24 24 0 1 1 500 524 A 24 24 0 1 1 500 476']}];
  pattern.rings.forEach(([type, count, inner, outer], ring) => {
    const step = 360 / count;
    for (let sector = 0; sector < count; sector++) {
      const angle = sector * step + (ring % 2 ? step / 2 : 0);
      const start = point(inner, angle), end = point(outer, angle);
      let edges;
      if (type === 'petal') {
        const width = step * 0.46, band = outer - inner;
        edges = [
          `M ${start} C ${point(inner + band * 0.3, angle - width)} ${point(inner + band * 0.78, angle - width)} ${end}`,
          `M ${end} C ${point(inner + band * 0.78, angle + width)} ${point(inner + band * 0.3, angle + width)} ${start}`
        ];
      } else if (type === 'kite') {
        const left = point((inner + outer) / 2, angle - step * 0.46);
        const right = point((inner + outer) / 2, angle + step * 0.46);
        edges = [`M ${start} L ${left}`, `M ${left} L ${end}`, `M ${end} L ${right}`, `M ${right} L ${start}`];
      } else {
        const left = angle - step * 0.44, right = angle + step * 0.44;
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
