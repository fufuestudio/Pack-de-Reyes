// Nombre "mágico" de la portada: letras doradas con contorno y relieve azul marino,
// brillos y remolinos turquesa (imitando el título generado con Gemini).
// Devuelve un SVG (texto) que ocupa la mitad inferior del cartel del título.

let n = 0;
export function svgNombre(nombre, { fuente = "'Gloock', serif", peso = 400, ancho = 0.56 } = {}) {
  const id = `t${++n}`;
  const W = 1536, H = 350;
  const texto = String(nombre).toUpperCase();
  // tamaño según longitud (los nombres largos se reducen)
  const letras = Math.max(texto.length, 3);
  // Zona útil: el interior del pergamino (sin los rollos de los lados ni el borde de abajo).
  const MAX = 250;                       // altura máxima de letra
  const anchoUtil = W * 0.68;            // ancho máximo del nombre
  const size = Math.min(MAX, anchoUtil / (letras * ancho));
  const largo = Math.min(anchoUtil, letras * size * ancho);
  const k = Math.max(size / MAX, 0.45);  // los efectos se reducen con la letra
  const base = H * 0.71 - (MAX - size) * 0.3; // centrado en vertical en el hueco del pergamino
  const x = W / 2;
  const capas = Array.from({ length: 9 }, (_, i) => i + 1);
  const t = (attrs, extra = '') =>
    `<text x="${x}" y="${base}" text-anchor="middle" font-family="${fuente}" font-weight="${peso}" font-size="${size}" textLength="${largo}" lengthAdjust="spacingAndGlyphs" ${attrs}>${escapa(texto)}</text>${extra}`;
  const estrella = (cx, cy, r) =>
    `<path d="M${cx} ${cy - r} Q${cx + r * .18} ${cy - r * .18} ${cx + r} ${cy} Q${cx + r * .18} ${cy + r * .18} ${cx} ${cy + r} Q${cx - r * .18} ${cy + r * .18} ${cx - r} ${cy} Q${cx - r * .18} ${cy - r * .18} ${cx} ${cy - r}Z" fill="#f4d27a" stroke="#8a6420" stroke-width="2"/>`;
  const izq = W / 2 - largo / 2, der = W / 2 + largo / 2;
  const remolino = (x0, x1, y, curl) => {
    const m = (x0 + x1) / 2;
    const d = `M${x0} ${y + 30} C${x0 + 60} ${y - 40}, ${m - 80} ${y - 50}, ${m} ${y} S${x1 - 60} ${y + 50}, ${x1} ${y - 10}`;
    const c = curl > 0
      ? `M${x1} ${y - 10} c18 -22 46 -14 44 8 c-2 18 -24 22 -32 8`
      : `M${x0} ${y + 30} c-22 -16 -18 -46 6 -48 c20 -2 24 22 10 28`;
    return `<g fill="none" stroke-linecap="round">
      <path d="${d}" stroke="#4a8f95" stroke-width="15" opacity=".55"/>
      <path d="${d}" stroke="#bfeeea" stroke-width="9"/>
      <path d="${d}" stroke="#e9fffd" stroke-width="3"/>
      <path d="${c}" stroke="#4a8f95" stroke-width="11" opacity=".55"/>
      <path d="${c}" stroke="#bfeeea" stroke-width="6"/></g>`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapa(texto)}">
  <defs>
    <linearGradient id="${id}o" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f9e08a"/><stop offset=".35" stop-color="#e8b843"/>
      <stop offset=".6" stop-color="#c88e22"/><stop offset=".85" stop-color="#e2ad3c"/><stop offset="1" stop-color="#f5d376"/>
    </linearGradient>
    <filter id="${id}tx" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="r"/>
      <feColorMatrix in="r" type="matrix" values="0 0 0 0 .55  0 0 0 0 .38  0 0 0 0 .1  0 0 0 .35 0" result="g"/>
      <feComposite in="g" in2="SourceGraphic" operator="in" result="gt"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="gt"/></feMerge>
    </filter>
    <filter id="${id}s" x="-5%" y="-10%" width="110%" height="130%"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#14122e" flood-opacity=".45"/></filter>
  </defs>
  <g filter="url(#${id}s)">
    ${capas.map((i) => t(`fill="#262552" stroke="#262552" stroke-width="${10 * k}" stroke-linejoin="round" transform="translate(${i * 0.9 * k} ${i * 1.3 * k})"`)).join('')}
    ${t(`fill="none" stroke="#2b2858" stroke-width="${12 * k}" stroke-linejoin="round"`)}
    ${t(`fill="url(#${id}o)" filter="url(#${id}tx)"`)}
    ${t(`fill="none" stroke="#fff1bf" stroke-opacity=".55" stroke-width="${2 * k}" transform="translate(${-1.5 * k} ${-2 * k})"`)}
  </g>
  <g transform="translate(${x} ${base - size * 0.4}) scale(${k}) translate(${-x} ${-(base - size * 0.4)})">
    ${remolino(x - (largo / k) * 0.48, x - (largo / k) * 0.08, base - size * 0.4 - 0.12 * size / k, -1)}
    ${remolino(x + (largo / k) * 0.05, x + (largo / k) * 0.5 + 30, base - size * 0.4 + 0.18 * size / k, 1)}
  </g>
  ${estrella(izq + largo * 0.36, base - size * 0.78, 16 * k)}${estrella(izq + largo * 0.12, base - size * 0.12, 12 * k)}
  ${estrella(izq + largo * 0.66, base - size * 0.66, 13 * k)}${estrella(der - largo * 0.08, base - size * 0.02, 14 * k)}
  ${estrella(izq + largo * 0.5, base - size * 0.08, 10 * k)}
</svg>`;
}

const escapa = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
