// Convierte la exportación de InDesign (páginas JPG + textos) al formato de la web.
// Uso: node herramientas/convertir-libros.mjs <carpeta-exportacion>
// La carpeta contiene torre/, tallerHermanos/, taller/ con p01.jpg… y paginas.json.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { LOGROS } from '../web/catalogo.js';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const origen = process.argv[2];
// subAlto: % de la altura del título que ocupa la línea fija de arriba (el resto es el nombre)
// Coronas pintadas en la escena del árbol (página 15), en % de la página.
// La imagen de la página 15 es la escena limpia (sin coronas pintadas): "Recursos/escena arbol limpia.png".
// nino: 'propio' (dueño del libro) u 'otro' (su hermano/a); anio: años a sumar al actual;
// diseno: 'contrario' = el otro modelo de corona (clásica <-> imperial).
const CORONA_REY = { x: 17.0, y: 30.6, w: 14.6, h: 15.6, giro: 0 };   // colgando de la mano del Rey
const CORONA_NINO = { x: 32.3, y: 68.4, w: 16.4, h: 14.2, giro: -6 }; // en la mano del niño
const ESCENA_HERMANOS = { 15: [{ ...CORONA_REY, nino: 'propio' }, { ...CORONA_NINO, nino: 'otro' }] };
// color: 'otro' = un color distinto al de este año (amarillo, o azul si este año es amarilla)
const ESCENA_UNO = { 15: [{ ...CORONA_REY, nino: 'propio', anio: 0 }, { ...CORONA_NINO, nino: 'propio', anio: -1, diseno: 'contrario', color: 'otro' }] };
const LIBROS = {
  torre: { ejemplo: 'Olivia', titulo: 'subtitulo-torre', subAlto: 47.9, paginasEjemplo: [], escena: ESCENA_HERMANOS },
  tallerHermanos: { ejemplo: 'Jorge', titulo: 'subtitulo-taller', subAlto: 47.9, paginasEjemplo: [], escena: ESCENA_HERMANOS },
  taller: { ejemplo: 'Jorge', titulo: 'subtitulo-gran-logro', subAlto: 34.4, paginasEjemplo: [], escena: ESCENA_UNO },
};
// Arreglos de texto: el script de exportación solo ve el texto visible del marco.
// Si una frase no cabe en el marco de InDesign, se completa aquí (mejor ampliar el marco en InDesign).
const ARREGLOS = [[/con el color exacto de$/, 'con el color exacto de tu luz.']];
const PRIMERA = 3; // las páginas 1 y 2 son guardas en blanco

for (const [clave, cfg] of Object.entries(LIBROS)) {
  const datos = JSON.parse(fs.readFileSync(path.join(origen, clave, 'paginas.json'), 'utf8'));
  const dirImg = path.join(raiz, 'web', 'img', 'libros', clave);
  fs.mkdirSync(dirImg, { recursive: true });
  const pct = (v, total) => +((v / total) * 100).toFixed(2);
  const paginas = [];
  for (const p of datos.paginas) {
    if (p.n < PRIMERA) continue;
    const nom = `p${String(p.n).padStart(2, '0')}`;
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(origen, clave, `${nom}.jpg`),
      '-vf', 'scale=640:-2', '-c:v', 'libwebp', '-quality', '78', path.join(dirImg, `${nom}.webp`)]);
    const textos = p.textos.map((t) => {
      let s = t.texto.replace(/\s+$/, '');
      // nombre de ejemplo -> {nombre}
      s = s.replace(new RegExp(`\\b${cfg.ejemplo}\\b`, 'g'), '{nombre}');
      s = s.replace(/\bal niño\b/g, '{al_nino}');
      // texto de la luz -> {LUZ} y {textoLuz}
      s = s.replace(/luz [A-ZÁÉÍÓÚÑ]+!/, 'luz {LUZ}!');
      for (const l of LOGROS) if (s.includes(l.texto)) s = s.replace(l.texto, '{textoLuz}');
      for (const [re, rep] of ARREGLOS) s = s.replace(re, rep);
      return {
        x: pct(t.x, datos.ancho), y: pct(t.y, datos.alto), w: pct(t.w, datos.ancho), h: pct(t.h, datos.alto),
        tam: +((t.tam / (datos.ancho / 2.54 * 72)) * 100).toFixed(3), // tamaño en % del ancho de página
        serif: /Minion/i.test(t.fuente), fino: /Regular/i.test(t.fuente) && !/Minion/i.test(t.fuente),
        texto: s,
      };
    });
    const huecos = p.huecos.map((h) => ({
      tipo: /OLIVIA|JORGE/i.test(h.img) ? 'corona' : 'titulo',
      x: pct(h.x, datos.ancho), y: pct(h.y, datos.alto), w: pct(h.w, datos.ancho), h: pct(h.h, datos.alto),
    }));
    for (const e of cfg.escena?.[p.n] || []) huecos.push({ tipo: 'escena', ...e });
    paginas.push({ n: p.n, img: `img/libros/${clave}/${nom}.webp`, textos, huecos, ...(cfg.paginasEjemplo.includes(p.n) ? { ejemplo: true } : {}), ...(huecos.some((h) => h.tipo === 'titulo') ? { subtitulo: `img/${cfg.titulo}.webp`, subAlto: cfg.subAlto } : {}) });
  }
  fs.writeFileSync(path.join(raiz, 'web', 'libros', `${clave}.json`), JSON.stringify({ paginas }, null, 1));
  console.log(clave, paginas.length, 'páginas');
}
