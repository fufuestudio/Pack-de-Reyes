// Ilustración de la Corona Real para el cuento (estilo de las imágenes de Gemini):
// misma forma que la corona impresa, en el color del logro, con volumen, brillos,
// nombre en blanco, año en relieve y remolinos y estrellas alrededor.
// Recibe las formas de perfilesCorona() (mm, Y hacia arriba) y devuelve un SVG (texto).

let cuenta = 0;

const hexARgb = (h) => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mezcla = (a, b, t) => { const x = hexARgb(a), y = hexARgb(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`; };

// Aleatorio con semilla (el mismo nombre da siempre el mismo dibujo)
function azar(semilla) {
  let s = 0;
  for (const c of String(semilla)) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const aPath = (mp) => mp.map((poly) => poly.map((ring) =>
  'M' + ring.map(([x, y]) => `${x.toFixed(2)} ${(-y).toFixed(2)}`).join('L') + 'Z').join('')).join('');

function bbox(mp) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const poly of mp) for (const [x, y] of poly[0]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

const estrella = (cx, cy, r, color) => {
  const p = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; p.push(`${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`); }
  return `<path d="M${p.join('L')}Z" fill="${color}" stroke-linejoin="round"/>`;
};
const destello = (cx, cy, r, color) =>
  `<path d="M${cx} ${cy - r}Q${cx + r * .15} ${cy - r * .15} ${cx + r} ${cy}Q${cx + r * .15} ${cy + r * .15} ${cx} ${cy + r}Q${cx - r * .15} ${cy + r * .15} ${cx - r} ${cy}Q${cx - r * .15} ${cy - r * .15} ${cx} ${cy - r}Z" fill="${color}"/>`;

/**
 * @param {object} P   formas de perfilesCorona(o).P
 * @param {object} op  { hex, diseno, semilla }
 */
export function svgCoronaIlustrada(P, { hex = '#F2B632', diseno = 'clasica', semilla = 'x', nombre = '', sinAdornos = false, giro: giroFijo = null } = {}) {
  const id = `ci${++cuenta}`;
  const r = azar(semilla + hex + diseno);
  const todo = [...P.fondo, ...P.frente];
  const b = bbox(todo);
  // Lienzo: la corona centrada con espacio alrededor para la decoración
  // sinAdornos: solo la corona (para colocarla dentro de otra ilustración)
  const m = Math.max(b.w, b.h) * (sinAdornos ? 0.08 : 0.42);
  const vb = { x: b.x0 - m, y: -(b.y1 + m * (sinAdornos ? 1 : 0.8)), w: b.w + 2 * m, h: b.h + (sinAdornos ? 2 : 1.6) * m };
  const cx = b.cx, cy = -b.cy;
  const giro = giroFijo ?? (diseno === 'imperial' ? -6 : -11);

  const base = hex;
  const oscuro = mezcla(hex, '#000000', 0.2);
  const muyOscuro = mezcla(hex, '#000000', 0.45);
  const claro = mezcla(hex, '#ffffff', 0.4);
  const s = b.w / 60; // escala de efectos (las coronas miden ~50–60 mm)

  const frente = aPath(P.frente);
  const huecos = aPath([...P.rebajes, ...P.arcos]);

  // Puntitos de brillo sobre la corona
  const puntos = Array.from({ length: 70 }, () => {
    const x = b.x0 + r() * b.w, y = -(b.y0 + r() * b.h), rr = (0.12 + r() * 0.3) * s;
    const col = r() < 0.75 ? '#fff' : mezcla(hex, '#000000', 0.3);
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${rr.toFixed(2)}" fill="${col}" opacity="${(0.25 + r() * 0.5).toFixed(2)}"/>`;
  }).join('');

  // Decoración alrededor: remolinos, estrellas, destellos y confeti
  const colores = ['#e2b54e', '#8fd3d0', '#a07fd8', '#e9c46a', '#e2b54e', '#8fd3d0'];
  // Remolinos: bandas de purpurina que rodean la corona (algunas pasan por delante)
  const remolino = (i) => {
    const ang = (i / 6) * Math.PI * 2 + r() * 0.6;
    const R = Math.max(b.w, b.h) * (0.46 + r() * 0.16);
    const giroArco = 0.55 + r() * 0.45;
    const x0 = cx + Math.cos(ang) * R, y0 = cy + Math.sin(ang) * R * 0.8;
    const x1 = cx + Math.cos(ang + giroArco) * R * 0.95, y1 = cy + Math.sin(ang + giroArco) * R * 0.78;
    const qx = cx + Math.cos(ang + giroArco / 2) * R * (1.05 + r() * 0.35), qy = cy + Math.sin(ang + giroArco / 2) * R * (0.8 + r() * 0.4);
    const col = colores[i % colores.length];
    const d = `M${x0.toFixed(1)} ${y0.toFixed(1)}Q${qx.toFixed(1)} ${qy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    const sent = r() < 0.5 ? 1 : -1;
    const rizo = `M${x1.toFixed(1)} ${y1.toFixed(1)}c${(2.4 * s * sent).toFixed(1)} ${(-2.6 * s).toFixed(1)} ${(5.5 * s * sent).toFixed(1)} ${(-0.8 * s).toFixed(1)} ${(4 * s * sent).toFixed(1)} ${(1.6 * s).toFixed(1)}c${(-1.1 * s * sent).toFixed(1)} ${(1.6 * s).toFixed(1)} ${(-3 * s * sent).toFixed(1)} ${(0.8 * s).toFixed(1)} ${(-2.4 * s * sent).toFixed(1)} ${(-0.6 * s).toFixed(1)}`;
    return `<g fill="none" stroke-linecap="round">
      <path d="${d}" stroke="${col}" stroke-width="${(2.2 * s).toFixed(2)}" opacity=".28"/>
      <path d="${d}" stroke="${col}" stroke-width="${(1.5 * s).toFixed(2)}" stroke-dasharray="${(0.25 * s).toFixed(2)} ${(0.55 * s).toFixed(2)}" opacity=".9"/>
      <path d="${d}" stroke="${mezcla(col, '#ffffff', 0.5)}" stroke-width="${(0.3 * s).toFixed(2)}" opacity=".9"/>
      <path d="${rizo}" stroke="${col}" stroke-width="${(0.55 * s).toFixed(2)}" opacity=".9"/></g>`;
  };
  const remolinosDetras = [0, 1, 2, 3, 5].map(remolino).join('');
  const remolinosDelante = [4].map(remolino).join('');
  const adornos = Array.from({ length: 26 }, () => {
    const ang = r() * Math.PI * 2, R = Math.max(b.w, b.h) * (0.45 + r() * 0.35);
    const x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R * 0.85;
    const t = r(), col = colores[Math.floor(r() * colores.length)];
    if (t < 0.3) return estrella(x, y, (1.1 + r() * 0.9) * s, col);
    if (t < 0.6) return destello(x, y, (1 + r() * 1.2) * s, col);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${((0.3 + r() * 0.5) * s).toFixed(2)}" fill="${col}"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}" role="img" aria-label="Corona Real de ${String(nombre).replace(/[<>&"]/g, '')}">
  <defs>
    <filter id="${id}v" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${(0.9 * s).toFixed(2)}" result="bl"/>
      <feSpecularLighting in="bl" surfaceScale="${(1.6 * s).toFixed(2)}" specularConstant="${sinAdornos ? '.12' : '.32'}" specularExponent="22" lighting-color="#ffffff" result="sp">
        <feDistantLight azimuth="235" elevation="48"/>
      </feSpecularLighting>
      <feComposite in="sp" in2="SourceAlpha" operator="in" result="spi"/>
      <feOffset in="SourceAlpha" dx="${(0.7 * s).toFixed(2)}" dy="${(1 * s).toFixed(2)}" result="of"/>
      <feComposite in="SourceAlpha" in2="of" operator="out" result="borde"/>
      <feGaussianBlur in="borde" stdDeviation="${(0.5 * s).toFixed(2)}" result="borde2"/>
      <feColorMatrix in="borde2" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .22 0" result="luzBorde"/>
      <feTurbulence type="fractalNoise" baseFrequency="${(1.8 / s).toFixed(3)}" numOctaves="3" seed="7" result="ru"/>
      <feColorMatrix in="ru" type="matrix" values="0 0 0 0 ${hexARgb(hex).map((v) => (v / 255 * 0.55).toFixed(3)).join('  0 0 0 0 ')}  0 0 0 2.2 -1.05" result="grano"/>
      <feComposite in="grano" in2="SourceAlpha" operator="in" result="granoIn"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="granoIn"/><feMergeNode in="spi"/><feMergeNode in="luzBorde"/></feMerge>
    </filter>
    <filter id="${id}s" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="${(0.6 * s).toFixed(2)}" dy="${(1.6 * s).toFixed(2)}" stdDeviation="${(1.4 * s).toFixed(2)}" flood-color="${muyOscuro}" flood-opacity=".35"/>
    </filter>
    <filter id="${id}t" x="-10%" y="-20%" width="120%" height="150%">
      <feDropShadow dx="${(0.25 * s).toFixed(2)}" dy="${(0.55 * s).toFixed(2)}" stdDeviation="${(0.35 * s).toFixed(2)}" flood-color="${muyOscuro}" flood-opacity=".55"/>
    </filter>
    <clipPath id="${id}c"><path d="${frente}"/></clipPath>
    <radialGradient id="${id}l" cx="30%" cy="25%" r="75%">
      <stop offset="0" stop-color="#fff" stop-opacity="${sinAdornos ? '.1' : '.28'}"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".12"/>
    </radialGradient>
  </defs>
  ${sinAdornos ? '' : remolinosDetras + adornos}
  <g transform="rotate(${giro} ${cx.toFixed(1)} ${cy.toFixed(1)})">
    <g filter="url(#${id}s)">
      <path d="${aPath(P.fondo)}" fill="${oscuro}" filter="url(#${id}v)"/>
      ${P.surcos.length ? `<path d="${aPath(P.surcos)}" fill="${muyOscuro}" opacity=".45"/>` : ''}
      <path d="${frente}${huecos}" fill-rule="evenodd" fill="${base}" filter="url(#${id}v)"/>
    </g>
    <g clip-path="url(#${id}c)"><rect x="${b.x0}" y="${-b.y1}" width="${b.w}" height="${b.h}" fill="url(#${id}l)"/>${puntos}</g>
    <path d="${aPath(P.anio)}" fill="${claro}" filter="url(#${id}t)"/>
    <path d="${aPath(P.nombre)}" fill="#fdf8ec" filter="url(#${id}t)"/>
  </g>
  ${sinAdornos ? '' : `<g opacity=".85">${remolinosDelante}</g>`}
</svg>`;
}
