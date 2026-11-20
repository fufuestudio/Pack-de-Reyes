// Uso: node generar.mjs NOMBRE AÑO diseño(clasica|imperial) [--sin-logo] [--separado]
// Ejemplo: node generar.mjs OLIVIA 2026 clasica
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import { DOMParser } from '@xmldom/xmldom';
import { generaCorona, aSTL } from './web/lib/crown.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = process.argv.slice(2).filter((a) => a.startsWith('--'));
const [nombre = 'OLIVIA', anio = '2026', diseno = 'clasica'] = args;

const leeFuente = (f) => { const b = fs.readFileSync(path.join(dir, 'web', 'assets', f)); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };

const r = generaCorona({
  svgCoronas: fs.readFileSync(path.join(dir, 'web/assets/coronas.svg'), 'utf8'),
  svgLogo: fs.readFileSync(path.join(dir, 'web/assets/logo.svg'), 'utf8'),
  fuenteNombre: leeFuente('ADELIA.otf'),
  fuenteAnio: leeFuente('Arimo-Bold.ttf'),
  diseno, nombre, anio,
  logo: !flags.includes('--sin-logo'),
  DOMParser,
});

const out = path.join(dir, 'salida');
fs.mkdirSync(out, { recursive: true });
const base = `${r.info.nombre}_${anio}_${diseno}`;
const escribe = (n, g) => { const dv = aSTL(g); fs.writeFileSync(path.join(out, n), Buffer.from(dv.buffer)); console.log('  ->', path.join('salida', n)); };
escribe(`${base}.stl`, r.geometry);
if (flags.includes('--separado')) {
  escribe(`${base}_cuerpo.stl`, r.partes.cuerpo);
  if (r.partes.letras) escribe(`${base}_letras.stl`, r.partes.letras);
}
console.log(r.info);
