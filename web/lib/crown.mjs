// Generador de Coronas Reales (Fufú Studio)
// Funciona igual en Node y en el navegador: recibe el SVG de las coronas, el logo y las fuentes,
// y devuelve una malla 3D lista para exportar a STL.
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import polygonClipping from 'polygon-clipping';

// Alturas (mm) medidas en los STL originales hechos en Fusion.
export const ALTURAS = {
  fondo: 2.0,      // pieza trasera (marrón en el SVG)
  surcos: 1.5,     // surcos grabados en el fondo de la corona JORGE
  frente: 3.0,     // corona delantera (amarilla)
  anio: 3.5,       // año en relieve
  nombre: 4.0,     // nombre en relieve
  logo: 0.6,       // logo Fufú grabado por detrás
};

// Diseños: qué elemento del SVG es cada parte (por orden de aparición en el archivo).
// Medidas finales tomadas de los STL originales.
export const DISENOS = {
  clasica: {          // la de OLIVIA
    nombreEjemplo: 'OLIVIA',
    anchoMM: 59.8,
    fondo: [1], frente: [2], rebajes: [3], surcos: [], arcos: [9],
    texto: 0, anioTexto: 2,
    logo: { anchoMM: 13.4, alturaCentroMM: 5.9 },
  },
  imperial: {         // la de JORGE
    nombreEjemplo: 'JORGE',
    anchoMM: 48.1,
    fondo: [0, 4], frente: [7], rebajes: [8], surcos: [5, 6], arcos: [10],
    texto: 1, anioTexto: 3,
    logo: { anchoMM: 13.4, alturaCentroMM: 5.9 },
  },
};

const CURVA = 16; // segmentos por curva

// ---------- utilidades SVG -> polígonos ----------
function svgDoc(text, DOMParserImpl) {
  return new DOMParserImpl().parseFromString(text, 'image/svg+xml');
}

// Lista "plana" de elementos dibujables en orden (path/ellipse/circle/rect/text), saltando defs/clipPath.
function elementos(doc) {
  const out = [];
  const walk = (n) => {
    for (let c = n.firstChild; c; c = c.nextSibling) {
      if (c.nodeType !== 1) continue;
      const tag = c.nodeName.toLowerCase();
      if (tag === 'defs' || tag === 'clippath' || tag === 'style') continue;
      if (['path', 'ellipse', 'circle', 'rect', 'polygon', 'text'].includes(tag)) out.push(c);
      else walk(c);
    }
  };
  walk(doc.documentElement);
  return out;
}

function serializa(el) {
  const attrs = [];
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i];
    if (a.name === 'class') continue;
    attrs.push(`${a.name}="${a.value}"`);
  }
  return `<${el.nodeName} ${attrs.join(' ')}/>`;
}

// Convierte un fragmento SVG en multipolígono (formato polygon-clipping), unido.
function fragmentoAPoligonos(fragment, DOMParserImpl, fillRule = 'nonzero') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><g fill="#000" fill-rule="${fillRule}">${fragment}</g></svg>`;
  const prev = globalThis.DOMParser;
  globalThis.DOMParser = DOMParserImpl;
  let data;
  try { data = new SVGLoader().parse(svg); } finally { globalThis.DOMParser = prev; }
  const polys = [];
  for (const p of data.paths) {
    for (const shape of SVGLoader.createShapes(p)) {
      const { shape: outer, holes } = shape.extractPoints(CURVA);
      const ring = (pts) => pts.map((v) => [v.x, v.y]);
      if (outer.length < 3) continue;
      polys.push([ring(outer), ...holes.filter((h) => h.length >= 3).map(ring)]);
    }
  }
  if (!polys.length) return [];
  return polygonClipping.union(...polys.map((p) => [p]));
}

function bbox(mp) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const poly of mp) for (const [x, y] of poly[0]) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

const union = (...mps) => { const l = mps.filter((m) => m && m.length); return l.length ? polygonClipping.union(...l) : []; };
const diff = (a, ...b) => { const l = b.filter((m) => m && m.length); return a.length && l.length ? polygonClipping.difference(a, ...l) : a; };
const inter = (a, b) => (a.length && b.length ? polygonClipping.intersection(a, b) : []);
const mapPts = (mp, f) => mp.map((poly) => poly.map((ring) => ring.map(f)));

// ---------- texto ----------
// Algunas fuentes (como ADELIA) tienen las letras acentuadas vacías: se montan con letra base + acento suelto.
const MARCAS = { '́': 'acute', '̀': 'grave', '̈': 'dieresis', '̃': 'tilde', '̧': 'cedilla' };
const glifoVacio = (g) => !g || g.index === 0 || !g.path || !g.path.commands || g.path.commands.length === 0;
const cacheAcentos = new WeakMap();
function glifoAcento(font, marca) {
  let c = cacheAcentos.get(font);
  if (!c) { c = {}; cacheAcentos.set(font, c); }
  if (marca in c) return c[marca];
  const buscar = marca === 'tilde' ? ['tilde', 'asciitilde'] : marca === 'grave' ? ['grave', 'acute'] : [marca];
  let res = null;
  for (const nombre of buscar) {
    for (let i = 0; i < font.glyphs.length && !res; i++) {
      const g = font.glyphs.get(i);
      if (g.name === nombre && !glifoVacio(g)) res = { g, espejo: marca === 'grave' && nombre === 'acute' };
    }
    if (res) break;
  }
  c[marca] = res;
  return res;
}
function trasladaPath(path, dx, dy, espejoCx = null) {
  for (const c of path.commands) {
    for (const [kx, ky] of [['x', 'y'], ['x1', 'y1'], ['x2', 'y2']]) {
      if (c[kx] === undefined) continue;
      if (espejoCx !== null) c[kx] = 2 * espejoCx - c[kx];
      c[kx] += dx; c[ky] += dy;
    }
  }
  return path;
}
// ¿Se puede dibujar este carácter con la fuente?
export function caracterDisponible(font, ch) {
  if (ch === ' ') return true;
  if (!glifoVacio(font.charToGlyph(ch))) return true;
  const [base, ...marcas] = ch.normalize('NFD');
  if (!marcas.length || glifoVacio(font.charToGlyph(base))) return false;
  return marcas.every((m) => MARCAS[m] && glifoAcento(font, MARCAS[m]));
}

function pathTexto(font, texto, x, y, size) {
  const total = font.getPath('', 0, 0, size); // Path vacío
  const esc = size / font.unitsPerEm;
  let cx = x, prev = null;
  for (const ch of texto) {
    let g = font.charToGlyph(ch);
    let marcas = [];
    if (glifoVacio(g) && ch !== ' ') {
      const [base, ...m] = ch.normalize('NFD');
      g = font.charToGlyph(base);
      marcas = m.map((k) => MARCAS[k]).filter(Boolean);
    }
    if (prev) cx += font.getKerningValue(prev, g) * esc;
    const p = g.getPath(cx, y, size);
    total.extend(p);
    if (marcas.length) {
      const bb = p.getBoundingBox(); // coordenadas con Y hacia abajo
      const centroBase = (bb.x1 + bb.x2) / 2;
      let arriba = bb.y1;
      for (const m of marcas) {
        const a = glifoAcento(font, m);
        if (!a) continue;
        const ap = a.g.getPath(0, 0, size);
        const ab = ap.getBoundingBox();
        const espejo = a.espejo ? (ab.x1 + ab.x2) / 2 : null;
        if (m === 'cedilla') {
          trasladaPath(ap, centroBase - (ab.x1 + ab.x2) / 2, bb.y2 - ab.y1 - size * 0.04, espejo);
        } else {
          const hueco = size * 0.05;
          trasladaPath(ap, centroBase - (ab.x1 + ab.x2) / 2, arriba - hueco - ab.y2, espejo);
          arriba -= hueco + (ab.y2 - ab.y1);
        }
        total.extend(ap);
      }
    }
    cx += (g.advanceWidth || 0) * esc;
    prev = g;
  }
  return total;
}

function anchoTexto(font, texto, size) {
  let w = 0, prev = null;
  const esc = size / font.unitsPerEm;
  for (const ch of texto) {
    let g = font.charToGlyph(ch);
    if (glifoVacio(g) && ch !== ' ') g = font.charToGlyph(ch.normalize('NFD')[0]);
    if (prev) w += font.getKerningValue(prev, g) * esc;
    w += (g.advanceWidth || 0) * esc;
    prev = g;
  }
  return w;
}

function textoAPoligonos(font, texto, x, y, size, DOMParserImpl) {
  const d = pathTexto(font, texto, x, y, size).toPathData(3);
  return fragmentoAPoligonos(`<path d="${d}"/>`, DOMParserImpl);
}

// Lee posición y tamaño del <text> del SVG original.
function datosTexto(el, doc) {
  const m = /matrix\(([^)]+)\)/.exec(el.getAttribute('transform') || '');
  const v = m ? m[1].trim().split(/[\s,]+/).map(Number) : [1, 0, 0, 1, 0, 0];
  const clases = (el.getAttribute('class') || '').split(/\s+/);
  const css = doc.getElementsByTagName('style')[0]?.textContent || '';
  let size = 12;
  for (const c of clases) {
    const r = new RegExp(`\\.${c}\\s*\\{[^}]*font-size:\\s*([\\d.]+)`).exec(css);
    if (r) size = +r[1];
  }
  return { x: v[4], y: v[5], size, contenido: el.textContent };
}

// ---------- extrusión ----------
function extruye(mp, z0, z1) {
  const geos = [];
  for (const poly of mp) {
    const toV = (ring) => ring.slice(0, ring.length - 1).map(([x, y]) => new THREE.Vector2(x, y));
    const shape = new THREE.Shape(toV(poly[0]));
    for (const h of poly.slice(1)) shape.holes.push(new THREE.Path(toV(h)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, z0);
    geos.push(g.index ? g.toNonIndexed() : g);
  }
  return geos;
}

/**
 * Genera la corona.
 * @param {object} o
 *  o.svgCoronas, o.svgLogo: texto de los SVG
 *  o.fuenteNombre, o.fuenteAnio: fuentes opentype.js ya cargadas
 *  o.diseno: 'clasica' | 'imperial'
 *  o.nombre, o.anio
 *  o.logo: true/false (grabar logo detrás)
 *  o.DOMParser: implementación de DOMParser (en navegador: window.DOMParser)
 * @returns {{ geometry: THREE.BufferGeometry, partes: object, info: object }}
 */
export function generaCorona(o) {
  const { P, sizeN, esc, nombre, anio } = perfilesCorona(o);

  // Capas (de abajo arriba). Cada capa = región 2D entre dos alturas.
  const A = ALTURAS;
  const base = union(P.fondo, P.frente);
  const capas = [
    { z0: 0, z1: A.logo, reg: diff(base, P.logo), parte: 'cuerpo' },
    { z0: A.logo, z1: A.surcos, reg: base, parte: 'cuerpo' },
    { z0: A.surcos, z1: A.fondo, reg: diff(base, diff(P.surcos, P.frente)), parte: 'cuerpo' },
    { z0: A.fondo, z1: A.frente, reg: diff(P.frente, P.rebajes, P.arcos), parte: 'cuerpo' },
    { z0: A.frente, z1: A.anio, reg: union(P.nombre, P.anio), parte: 'letras' },
    { z0: A.anio, z1: A.nombre, reg: P.nombre, parte: 'letras' },
  ];

  const partes = { cuerpo: [], letras: [] };
  for (const c of capas) if (c.reg.length) partes[c.parte].push(...extruye(c.reg, c.z0, c.z1));
  const g = {
    cuerpo: mergeGeometries(partes.cuerpo),
    letras: partes.letras.length ? mergeGeometries(partes.letras) : null,
  };
  const todo = mergeGeometries([g.cuerpo, g.letras].filter(Boolean));
  const bb = bbox(base);
  return {
    geometry: todo,
    partes: g,
    info: { ancho: +bb.w.toFixed(2), alto: +bb.h.toFixed(2), grosor: A.nombre, tamNombre: +(sizeN * esc).toFixed(2), nombre, anio },
  };
}

/**
 * Formas 2D de la corona en mm (Y hacia arriba): fondo, frente, rebajes, surcos, arcos, nombre, año y logo.
 * Mismos parámetros que generaCorona. La usan la corona 3D y la ilustración del cuento.
 */
export function perfilesCorona(o) {
  const DP = o.DOMParser || globalThis.DOMParser;
  const cfg = DISENOS[o.diseno];
  if (!cfg) throw new Error('Diseño desconocido: ' + o.diseno);
  const doc = svgDoc(o.svgCoronas, DP);
  const els = elementos(doc);
  const textos = els.filter((e) => e.nodeName.toLowerCase() === 'text');
  const formas = els.filter((e) => e.nodeName.toLowerCase() !== 'text');
  const pol = (idxs) => union(...idxs.map((i) => fragmentoAPoligonos(serializa(formas[i]), DP)));

  const fondo = pol(cfg.fondo);
  const frente = pol(cfg.frente);
  const rebajes = pol(cfg.rebajes);
  const surcos = inter(pol(cfg.surcos), fondo);
  const arcos = pol(cfg.arcos);
  const silueta = union(fondo, frente);
  const caja = bbox(silueta);
  const esc = cfg.anchoMM / caja.w; // unidades SVG -> mm

  // Nombre: centrado donde estaba el de ejemplo; si es más largo, se reduce para que quepa.
  const tN = datosTexto(textos[cfg.texto], doc);
  const anchoEjemplo = anchoTexto(o.fuenteNombre, cfg.nombreEjemplo, tN.size);
  const centroN = tN.x + anchoTexto(o.fuenteNombre, tN.contenido, tN.size) / 2;
  const nombre = (o.nombre || cfg.nombreEjemplo).toUpperCase();
  let maxAncho = anchoEjemplo * (o.margenNombre || 1.12);
  let sizeN = tN.size;
  let yN = tN.y;
  // Ancho real de la corona a la altura del nombre (con margen), para que no se corte por los lados.
  const anchoCoronaEn = (y0, y1) => {
    const fb = bbox(frente);
    const franja = inter(frente, [[[[fb.x0 - 1, y0], [fb.x1 + 1, y0], [fb.x1 + 1, y1], [fb.x0 - 1, y1], [fb.x0 - 1, y0]]]]);
    if (!franja.length) return Infinity;
    // ancho del tramo continuo más estrecho de la franja: se usa el que contiene el centro del nombre
    let mejor = 0;
    for (const poly of franja) {
      const b = bbox([poly]);
      if (centroN >= b.x0 && centroN <= b.x1) mejor = Math.max(mejor, Math.min(centroN - b.x0, b.x1 - centroN) * 2);
    }
    return mejor || Infinity;
  };
  for (let i = 0; i < 3; i++) {
    const libre = anchoCoronaEn(yN - sizeN * 0.72, yN) * 0.9;
    const limite = Math.min(maxAncho, libre);
    const anchoN = anchoTexto(o.fuenteNombre, nombre, sizeN);
    if (anchoN <= limite) break;
    const nuevo = sizeN * (limite / anchoN);
    yN -= (sizeN - nuevo) * 0.35; // mantiene el texto centrado en vertical aprox.
    sizeN = nuevo;
  }
  const anchoFinal = anchoTexto(o.fuenteNombre, nombre, sizeN);
  const polNombre = inter(textoAPoligonos(o.fuenteNombre, nombre, centroN - anchoFinal / 2, yN, sizeN, DP), frente);

  // Año: centrado donde estaba
  const tA = datosTexto(textos[cfg.anioTexto], doc);
  const anio = String(o.anio);
  const centroA = tA.x + anchoTexto(o.fuenteAnio, tA.contenido, tA.size) / 2;
  const anchoA = anchoTexto(o.fuenteAnio, anio, tA.size);
  const polAnio = inter(textoAPoligonos(o.fuenteAnio, anio, centroA - anchoA / 2, tA.y, tA.size, DP), frente);

  // Pasa todo a mm, con Y hacia arriba y el borde inferior-izquierdo en 0,0.
  const aMM = (mp) => mapPts(mp, ([x, y]) => [(x - caja.x0) * esc, (caja.y1 - y) * esc]);
  const P = {
    fondo: aMM(fondo), frente: aMM(frente), rebajes: aMM(rebajes), surcos: aMM(surcos),
    arcos: aMM(arcos), nombre: aMM(polNombre), anio: aMM(polAnio),
  };

  // Logo grabado por detrás (en espejo para que se lea al darle la vuelta).
  P.logo = [];
  if (o.logo !== false && o.svgLogo) {
    const ldoc = svgDoc(o.svgLogo, DP);
    const frag = elementos(ldoc).map(serializa).join('');
    const lp = fragmentoAPoligonos(frag, DP, 'evenodd');
    const lb = bbox(lp);
    const e = cfg.logo.anchoMM / lb.w;
    const anchoT = cfg.anchoMM;
    const cx = bbox(P.frente).cx;
    const cy = bbox(P.frente).y0 + cfg.logo.alturaCentroMM;
    P.logo = inter(
      mapPts(lp, ([x, y]) => [cx - (x - lb.cx) * e, cy - (y - lb.cy) * e]),
      union(P.fondo, P.frente),
    );
    void anchoT;
  }

  return { P, sizeN, esc, nombre, anio };
}

// STL binario (ArrayBuffer/DataView)
export function aSTL(geometry) {
  const mesh = new THREE.Mesh(geometry);
  return new STLExporter().parse(mesh, { binary: true });
}
