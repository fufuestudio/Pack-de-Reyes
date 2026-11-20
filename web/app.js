import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import opentype from 'opentype.js';
import { generaCorona, aSTL, caracterDisponible, perfilesCorona } from './lib/crown.mjs';
import { svgCoronaIlustrada } from './lib/ilustracion.js';
import { CONFIG, PACKS, LOGROS, COLORES, DISENOS_CORONA, MAX_LETRAS_NOMBRE, CERTIFICADO_DORSO } from './catalogo.js';
import { HISTORIAS, historiasDelPack } from './historias.js';
import { svgNombre } from './lib/titulo.js';
import { NARRADORA } from './narradora.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MODO_TALLER = new URLSearchParams(location.search).has('taller');
const CLAVE = `fufu-pack-reyes-${CONFIG.anio}-v2`;

// =====================================================================
//  Estado
// =====================================================================
const ninoNuevo = () => ({ nombre: '', apellidos: '', genero: '', logro: '', logroTexto: '', color: 'Amarillo', diseno: 'clasica' });
let estado = { idx: 0, pack: null, ninos: [], envio: {}, pagina: 0, vista: 'corona', enviado: null };
try {
  const g = JSON.parse(localStorage.getItem(CLAVE) || 'null');
  if (g && typeof g === 'object') estado = { ...estado, ...g, enviado: null, idx: g.enviado ? 0 : (g.idx || 0) };
} catch { /* sin almacenamiento */ }
const guarda = () => { try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch { /* nada */ } };

const packActual = () => PACKS.find((p) => p.id === estado.pack);
const logroDe = (n) => {
  if (!n) return null;
  if (n.logro === 'propio') {
    const c = COLORES.find((x) => x.color === n.color) || COLORES[0];
    let t = (n.logroTexto || '').trim().replace(/\.$/, '');
    if (t) t = t.charAt(0).toLowerCase() + t.slice(1);
    return { id: 'propio', luz: c.luz, color: c.color, hex: c.hex, resumen: n.logroTexto, texto: t ? `Significa que ${t}.` : 'Significa que ha tenido un año muy especial.' };
  }
  return LOGROS.find((l) => l.id === n.logro) || null;
};

// Lista de pantallas del configurador (una pregunta por pantalla)
const TITULOS = { pack: 'Elige tu pack', datos: '¿Cómo se llama?', logro: 'Su logro del año', corona: 'Su Corona Real', vista: 'Así queda su pack', envio: 'Datos de envío', resumen: 'Revisa tu pedido' };
function pantallas() {
  const l = [{ id: 'pack' }];
  estado.ninos.forEach((_, i) => ['datos', 'logro', 'corona', 'vista'].forEach((id) => l.push({ id, i })));
  l.push({ id: 'envio' }, { id: 'resumen' });
  return l;
}
const pantallaActual = () => pantallas()[Math.min(estado.idx, pantallas().length - 1)];
const indiceNino = () => pantallaActual().i ?? 0;
const ninoActual = () => estado.ninos[indiceNino()] || estado.ninos[0];

// =====================================================================
//  Portada
// =====================================================================
function pintaPlazo() {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const lim = new Date(CONFIG.fechaLimite + 'T00:00:00');
  const urg = new Date(CONFIG.fechaLimiteUrgente + 'T00:00:00');
  const dias = Math.round((lim - hoy) / 864e5);
  const diasU = Math.round((urg - hoy) / 864e5);
  const fmt = (d) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  let html, mini;
  if (dias >= 0) {
    html = `<span>Pedidos hasta el <strong>${fmt(lim)}</strong></span><span><b>${dias}</b> ${dias === 1 ? 'día' : 'días'} para que llegue a tiempo</span>`;
    mini = `Quedan ${dias} días para pedir`;
  } else if (diasU >= 0) {
    html = `<span>Último plazo con <strong>envío urgente</strong> hasta el ${fmt(urg)}</span>`;
    mini = 'Solo envío urgente';
  } else {
    html = '<span>El plazo para Reyes ha terminado. ¡Gracias!</span>';
    mini = 'Plazo cerrado';
  }
  $('#plazo').innerHTML = html;
  $('#plazo-mini').textContent = mini;
  $('#fecha-urgente').textContent = fmt(urg);
  $('#anio-pie').textContent = CONFIG.anio;
}

function preparaCarrusel() {
  const c = $('#carrusel'), p = $('#puntos');
  const n = c.children.length;
  p.innerHTML = '<i></i>'.repeat(n);
  const marca = () => {
    const i = Math.round(c.scrollLeft / (c.children[0].getBoundingClientRect().width + 12));
    [...p.children].forEach((d, k) => d.classList.toggle('activo', k === Math.min(i, n - 1)));
  };
  c.addEventListener('scroll', () => requestAnimationFrame(marca), { passive: true });
  marca();
}

function textoBotonAbrir() {
  const t = estado.pack ? 'Continuar mi pedido' : 'Personalizar mi pack';
  $$('[data-abrir]').forEach((b) => { if (!b.closest('#estela-portada')) b.textContent = t; });
}

// =====================================================================
//  Estela, la paje narradora (voz grabada con ElevenLabs en audio/<clave>.mp3)
// =====================================================================
const CLAVE_VOZ = 'fufu-voz';
let vozActiva = true;
try { vozActiva = localStorage.getItem(CLAVE_VOZ) !== 'no'; } catch { /* nada */ }
const voz = new Audio();
voz.preload = 'auto';
let fraseActual = null, temporizadorTexto = null;

function escribe(el, texto, msTotal) {
  clearInterval(temporizadorTexto);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = texto; return; }
  let i = 0;
  const paso = Math.max(12, Math.min(70, msTotal / texto.length));
  el.textContent = '';
  temporizadorTexto = setInterval(() => {
    i += 2;
    el.textContent = texto.slice(0, i);
    if (i >= texto.length) { el.textContent = texto; clearInterval(temporizadorTexto); }
  }, paso * 2);
}

function habla(clave, el, caja) {
  const texto = NARRADORA.frases[clave];
  if (!texto || !el) return;
  fraseActual = { clave, el, caja };
  voz.pause();
  caja?.classList.remove('hablando');
  if (!vozActiva) { escribe(el, texto, texto.length * 22); return; }
  voz.src = `audio/${clave}.mp3`;
  let empezado = false;
  const arranca = () => {
    if (empezado) return; empezado = true;
    escribe(el, texto, (voz.duration && isFinite(voz.duration) ? voz.duration * 1000 * 0.92 : texto.length * 55));
  };
  voz.onloadedmetadata = arranca;
  setTimeout(arranca, 400); // por si el audio tarda o no existe
  caja?.classList.add('hablando');
  voz.play().catch(() => caja?.classList.remove('hablando'));
}
const callaEstela = () => { voz.pause(); $$('.hablando').forEach((e) => e.classList.remove('hablando')); };
voz.addEventListener('ended', callaEstela);
voz.addEventListener('error', callaEstela);

function pintaBotonVoz() {
  const b = $('#narradora-voz');
  b.textContent = vozActiva ? '🔊' : '🔇';
  b.setAttribute('aria-pressed', String(!vozActiva));
  b.setAttribute('aria-label', vozActiva ? 'Silenciar la voz' : 'Activar la voz');
}
$('#narradora-voz').addEventListener('click', () => {
  vozActiva = !vozActiva;
  try { localStorage.setItem(CLAVE_VOZ, vozActiva ? 'si' : 'no'); } catch { /* nada */ }
  pintaBotonVoz();
  if (!vozActiva) callaEstela();
  else if (fraseActual) habla(fraseActual.clave, fraseActual.el, fraseActual.caja);
});
$('#narradora-repetir').addEventListener('click', () => {
  if (!vozActiva) { vozActiva = true; try { localStorage.setItem(CLAVE_VOZ, 'si'); } catch { /* nada */ } pintaBotonVoz(); }
  if (fraseActual) habla(fraseActual.clave, fraseActual.el, fraseActual.caja);
});
// En la portada
$('#estela-boton').addEventListener('click', () => {
  $('#estela-boton').hidden = true;
  $('#estela-portada').hidden = false;
  if (!vozActiva) { vozActiva = true; try { localStorage.setItem(CLAVE_VOZ, 'si'); } catch { /* nada */ } }
  habla('bienvenida', $('#estela-portada-texto'), $('#estela-portada'));
});
$('#estela-cerrar').addEventListener('click', () => {
  callaEstela();
  $('#estela-portada').hidden = true;
  $('#estela-boton').hidden = false;
});

// =====================================================================
//  Abrir / cerrar el configurador (con el botón atrás del móvil)
// =====================================================================
let entradasHistorial = 0;
function abreApp() {
  $('#estela-portada').hidden = true;
  $('#estela-boton').hidden = false;
  $('#app').hidden = false;
  document.body.classList.add('app-abierta');
  muestra(estado.idx, true);
}
function cierraApp() {
  callaEstela();
  $('#app').hidden = true;
  document.body.classList.remove('app-abierta');
  textoBotonAbrir();
}
$$('[data-abrir]').forEach((b) => b.addEventListener('click', abreApp));
$('#cerrar').addEventListener('click', () => {
  if (entradasHistorial > 0) { const n = entradasHistorial; entradasHistorial = 0; history.go(-n); } else cierraApp();
});
window.addEventListener('popstate', (e) => {
  entradasHistorial = Math.max(0, entradasHistorial - 1);
  const idx = e.state?.fufu;
  if (idx == null) cierraApp();
  else { if ($('#app').hidden) { $('#app').hidden = false; document.body.classList.add('app-abierta'); } muestra(idx, false); }
});

// =====================================================================
//  Pantallas
// =====================================================================
function muestra(idx, apilar) {
  const lista = pantallas();
  estado.idx = Math.max(0, Math.min(idx, lista.length - 1));
  guarda();
  if (apilar) { history.pushState({ fufu: estado.idx }, ''); entradasHistorial++; }
  const p = lista[estado.idx];
  const n = ninoActual();

  // Cabecera
  const total = lista.length;
  $('#app-paso').textContent = p.i != null && estado.ninos.length > 1
    ? `Paso ${estado.idx + 1} de ${total} · Niño ${p.i + 1} de ${estado.ninos.length}`
    : `Paso ${estado.idx + 1} de ${total}`;
  $('#app-titulo').textContent = TITULOS[p.id];
  $('#barra').style.width = `${((estado.idx + 1) / total) * 100}%`;
  const chip = $('#chip-nino');
  if (p.i != null && n?.nombre.trim() && p.id !== 'datos') {
    const l = logroDe(n);
    chip.innerHTML = `<i style="background:${l ? l.hex : 'var(--linea)'}"></i>${esc(n.nombre.trim())}`;
    chip.hidden = false;
  } else chip.hidden = true;

  // Cuerpo
  $$('.pantalla').forEach((s) => s.classList.toggle('visible', s.dataset.p === p.id));
  $('#cuerpo').scrollTop = 0;

  // Botones
  $('#atras').hidden = estado.idx === 0;
  $('#siguiente').hidden = p.id === 'resumen';
  const sig = lista[estado.idx + 1];
  $('#siguiente').textContent =
    p.id === 'envio' ? 'Ver resumen'
      : p.id === 'vista' && sig?.id === 'datos' ? 'Siguiente niño'
        : p.id === 'vista' ? 'Datos de envío' : 'Siguiente';
  limpiaError();

  // Contenido de cada pantalla
  if (p.id === 'pack') pintaPacks();
  if (p.id === 'datos') { pintaDatos(); estado.pagina = 0; }
  if (p.id === 'logro') pintaLogros();
  if (p.id === 'corona') pintaDisenos();
  if (p.id === 'vista') pintaVistaTexto();
  if (p.id === 'envio') pintaEnvio();
  if (p.id === 'resumen') pintaResumen();
  pintaEscenario();
  habla(p.id, $('#narradora-texto'), $('#narradora'));
}

// Vista previa de arriba según la pantalla
function pintaEscenario() {
  const p = pantallaActual();
  const esc_ = $('#escenario');
  const modos = { datos: 'libro', logro: 'ilus', corona: 'corona3d', vista: 'vista' };
  const modo = modos[p.id] || 'ninguno';
  esc_.dataset.modo = modo;
  $('#esc-tabs').hidden = modo !== 'vista';
  let item = modo;
  if (modo === 'vista') {
    item = { corona: 'corona3d', cuento: 'libro', cert: 'cert' }[estado.vista];
    $$('#esc-tabs [data-vista]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.vista === estado.vista)));
  }
  $$('.esc-item').forEach((el) => el.classList.toggle('visible', el.dataset.item === item));
  $('.esc-item[data-item="libro"]').classList.toggle('solo-portada', p.id === 'datos');
  if (item === 'libro') pintaLibro();
  if (item === 'ilus') pintaIlusLogro();
  if (item === 'cert') pintaCertificado();
  if (item === 'corona3d') actualizaCorona();
}
$('#esc-tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-vista]');
  if (!b) return;
  estado.vista = b.dataset.vista; estado.pagina = 0; guarda(); pintaEscenario();
});

// ---------- Pack ----------
function pintaPacks() {
  $('#packs').innerHTML = PACKS.map((p) => `
    <button type="button" class="opcion pack" data-pack="${p.id}" aria-pressed="${estado.pack === p.id}" ${p.disponible ? '' : 'disabled'}>
      ${p.nota ? `<span class="etiqueta">${esc(p.nota)}</span>` : ''}
      <img src="${esc(p.imagen || 'img/pack-uno.webp')}" alt="" loading="lazy" width="96" height="96">
      <span>
        <span class="titulo">${esc(p.titulo)}</span>
        <span class="sub">${p.ninos === 1 ? 'Corona, libro, certificado, carta y pegatinas' : `${p.ninos} coronas, ${p.ninos} libros que se leen juntos, ${p.ninos} certificados, cartas y pegatinas`}</span>
        ${p.precio != null ? `<span class="precio">${p.precio} ${CONFIG.moneda}</span>` : ''}
      </span>
    </button>`).join('');
}
$('#packs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-pack]');
  if (!b || b.disabled) return;
  estado.pack = b.dataset.pack;
  const n = packActual().ninos;
  while (estado.ninos.length < n) estado.ninos.push(ninoNuevo());
  estado.ninos.length = n;
  guarda(); pintaPacks(); limpiaError();
});

// ---------- Datos del niño ----------
const formDatos = $('#form-datos');
function pintaDatos() {
  const n = ninoActual();
  formDatos.nombre.value = n.nombre;
  formDatos.apellidos.value = n.apellidos;
  $$('input[name="genero"]', formDatos).forEach((r) => { r.checked = r.value === n.genero; });
  avisoNombre();
}
formDatos.addEventListener('input', (e) => {
  const n = ninoActual(), t = e.target;
  if (t.name === 'nombre') { n.nombre = t.value.replace(/\s+/g, ' ').replace(/^\s/, ''); avisoNombre(); pintaLibro(); }
  else if (t.name === 'apellidos') n.apellidos = t.value;
  else if (t.name === 'genero') n.genero = t.value;
  t.setAttribute?.('aria-invalid', 'false');
  guarda(); limpiaError();
});
formDatos.addEventListener('submit', (e) => { e.preventDefault(); $('#siguiente').click(); });
formDatos.nombre.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); formDatos.apellidos.focus(); } });

function avisoNombre() {
  const n = ninoActual();
  const ayuda = $('#ayuda-nombre');
  const nombre = n.nombre.trim().toUpperCase();
  let msg = 'En la corona sale en mayúsculas.', aviso = false;
  if (fuentes.nombre && nombre) {
    const raros = [...new Set([...nombre].filter((c) => !caracterDisponible(fuentes.nombre, c)))];
    if (raros.length) { msg = `La letra de la corona no tiene: ${raros.join(' ')}. Lo revisaremos a mano.`; aviso = true; }
  }
  if (!aviso && nombre.replace(/\s/g, '').length > MAX_LETRAS_NOMBRE) { msg = `Nombre largo: la letra de la corona saldrá más pequeña.`; aviso = true; }
  ayuda.textContent = msg;
  ayuda.classList.toggle('aviso', aviso);
}

// ---------- Logro ----------
function pintaLogros() {
  const n = ninoActual();
  $('#logros').innerHTML = LOGROS.map((l) => `
    <button type="button" class="opcion logro" data-logro="${l.id}" aria-pressed="${n.logro === l.id}">
      <span class="luz" style="background:${l.hex};color:${l.hex}"></span>
      <span><span class="titulo">Luz ${esc(l.luz.toLowerCase())}</span><span class="sub">${esc(l.resumen)}</span></span>
    </button>`).join('') + `
    <button type="button" class="opcion logro" data-logro="propio" aria-pressed="${n.logro === 'propio'}">
      <span class="luz" style="background:conic-gradient(#F2B632,#C8323C,#7A4FA3,#2F5DA8,#3E9B5A,#F2B632);color:#c69a3c"></span>
      <span><span class="titulo">Otro logro</span><span class="sub">Escríbelo tú</span></span>
    </button>`;
  $('#logro-propio').hidden = n.logro !== 'propio';
  $('#logro-texto').value = n.logroTexto;
  pintaColores();
}
$('#logros').addEventListener('click', (e) => {
  const b = e.target.closest('[data-logro]');
  if (!b) return;
  const n = ninoActual();
  n.logro = b.dataset.logro;
  if (n.logro !== 'propio') n.color = LOGROS.find((l) => l.id === n.logro).color;
  guarda(); pintaLogros(); pintaIlusLogro(); recolorea(); limpiaError(); muestraChip();
  if (n.logro === 'propio') $('#logro-texto').focus();
});
$('#logro-texto').addEventListener('input', (e) => { ninoActual().logroTexto = e.target.value; e.target.setAttribute('aria-invalid', 'false'); guarda(); limpiaError(); });

function pintaColores() {
  const n = ninoActual();
  $('#colores').innerHTML = COLORES.map((c) => `<button type="button" class="color" data-color="${esc(c.color)}" style="background:${c.hex}" aria-label="${esc(c.color)}" aria-pressed="${n.color === c.color}"></button>`).join('');
}
$('#colores').addEventListener('click', (e) => {
  const b = e.target.closest('[data-color]');
  if (!b) return;
  ninoActual().color = b.dataset.color;
  guarda(); pintaColores(); pintaIlusLogro(); recolorea(); muestraChip();
});
function muestraChip() {
  const n = ninoActual(), chip = $('#chip-nino'), l = logroDe(n);
  if (!chip.hidden) chip.querySelector('i').style.background = l ? l.hex : 'var(--linea)';
}

function pintaIlusLogro() {
  const cont = $('#ilus-logro');
  cont.innerHTML = ilustracionCorona(ninoActual()) || '<p class="esc-nota">Preparando la corona…</p>';
}

// ---------- Corona ----------
function pintaDisenos() {
  const n = ninoActual();
  $('#disenos').innerHTML = DISENOS_CORONA.map((d) => `
    <button type="button" class="opcion" data-diseno="${d.id}" aria-pressed="${n.diseno === d.id}">
      <span class="titulo">${esc(d.nombre)}</span><span class="sub">${esc(d.descripcion)}</span>
    </button>`).join('');
}
$('#disenos').addEventListener('click', (e) => {
  const b = e.target.closest('[data-diseno]');
  if (!b) return;
  ninoActual().diseno = b.dataset.diseno;
  guarda(); pintaDisenos(); actualizaCorona();
});

// ---------- Vista final ----------
function pintaVistaTexto() {
  const p = pantallaActual(), n = ninoActual();
  const sig = estado.ninos[p.i + 1];
  $('#vista-texto').textContent = sig
    ? `Mira su corona, su cuento y su certificado. Después, los datos de ${sig.nombre.trim() || 'tu otro peque'}.`
    : 'Mira su corona, su cuento y su certificado. Si quieres cambiar algo, vuelve atrás.';
  void n;
}

// =====================================================================
//  Cuento
// =====================================================================
// El libro completo: portada + las páginas reales exportadas de InDesign (web/libros/<clave>.json)
function datosDelLibro(i) {
  const n = estado.ninos[i];
  const clave = historiasDelPack(estado.ninos.length)[i] || 'taller';
  const h = HISTORIAS[clave];
  const l = logroDe(n);
  const nombre = n.nombre.trim() || 'Tu peque';
  const vars = {
    nombre, LUZ: l ? l.luz : '…', textoLuz: l ? l.texto : '(Elige su logro para ver esta página)',
    al_nino: n.genero === 'nina' ? 'a la niña' : 'al niño',
  };
  return { clave, h, n, nombre, vars, paginas: recursos.libros[clave]?.paginas || [] };
}
// Rellena la plantilla; el nombre y la luz se resaltan para que se vea lo personalizado
const rellena = (s, vars) => esc(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? (k === 'nombre' || k === 'LUZ' ? `<b>${esc(vars[k])}</b>` : esc(vars[k])) : m));

const cachePerfiles = new Map();
function ilustracionCorona(n, { anio = CONFIG.anio, sinAdornos = false, giro = null } = {}) {
  if (!fuentes.nombre || !recursos.svg || !n) return '';
  const nombre = n.nombre.trim() || 'NOMBRE';
  const clave = `${nombre}|${n.diseno}|${anio}`;
  try {
    if (!cachePerfiles.has(clave)) {
      cachePerfiles.set(clave, perfilesCorona({
        svgCoronas: recursos.svg, fuenteNombre: fuentes.nombre, fuenteAnio: fuentes.anio,
        diseno: n.diseno, nombre, anio, logo: false, DOMParser: window.DOMParser,
      }).P);
      if (cachePerfiles.size > 30) cachePerfiles.delete(cachePerfiles.keys().next().value);
    }
    const l = logroDe(n);
    return svgCoronaIlustrada(cachePerfiles.get(clave), { hex: l ? l.hex : '#F2B632', diseno: n.diseno, semilla: nombre, nombre, sinAdornos, giro });
  } catch (e) { console.error(e); return ''; }
}

function pintaLibro() {
  const i = indiceNino();
  if (!estado.ninos[i]) return;
  const { h, n, nombre, vars, paginas } = datosDelLibro(i);
  const total = paginas.length + 1; // + portada
  estado.pagina = Math.max(0, Math.min(estado.pagina, total - 1));
  const p = estado.pagina;
  const libro = $('#libro');
  if (p === 0) {
    const c = h.cartel;
    libro.innerHTML = `<div class="libro-portada" role="img" aria-label="Portada: ${esc(h.titulo({ nombre }))}">
      <img src="img/portada-${h.portada}.jpg" alt="">
      <div class="libro-cartel" style="left:${c.left}%;top:${c.top}%;width:${c.width}%;height:${c.height}%">
        <img src="img/subtitulo-${h.portada}.webp" alt="" style="height:47.9%">
        ${svgNombre(nombre)}
      </div></div>`;
  } else {
    const pg = paginas[p - 1];
    const huecos = pg.huecos.map((hu) => {
      const caja = `left:${hu.x}%;top:${hu.y}%;width:${hu.w}%;height:${hu.h}%`;
      if (hu.tipo === 'corona') return `<div class="hueco hueco-corona" style="${caja}">${ilustracionCorona(n)}</div>`;
      if (hu.tipo === 'escena') {
        // corona colgada en la ilustración: la de este niño o la de su hermano/a
        let quien = hu.nino === 'otro' ? (estado.ninos.find((_, k) => k !== i) || n) : n;
        if (hu.diseno === 'contrario') quien = { ...quien, diseno: quien.diseno === 'imperial' ? 'clasica' : 'imperial' };
        if (hu.color === 'otro') {
          const actual = logroDe(quien);
          const otro = COLORES.find((c) => c.color === (actual?.color === 'Amarillo' ? 'Azul' : 'Amarillo'));
          quien = { ...quien, logro: 'propio', color: otro.color };
        }
        return `<div class="hueco" style="${caja};transform:rotate(${hu.giro || 0}deg)">${ilustracionCorona(quien, { anio: CONFIG.anio + (hu.anio || 0), sinAdornos: true, giro: 0 })}</div>`;
      }
      return `<div class="libro-cartel" style="${caja}"><img src="${esc(pg.subtitulo)}" alt="" style="height:${pg.subAlto}%">${svgNombre(nombre)}</div>`;
    }).join('');
    const textos = pg.textos.map((t) => `<div class="texto-libro${t.serif ? ' serif' : ''}${t.fino ? ' fino' : ''}" style="left:${t.x}%;top:${t.y}%;width:${t.w}%;min-height:${t.h}%;font-size:${t.tam}cqw">${rellena(t.texto, vars)}</div>`).join('');
    libro.innerHTML = `<div class="libro-real"><img src="${esc(pg.img)}" alt="">${huecos}${textos}
      ${pg.ejemplo ? '<span class="sello-ejemplo">Ilustración de ejemplo</span>' : ''}</div>`;
    // precarga la siguiente página para que pase sin esperas
    const sig = paginas[p];
    if (sig) { const im = new Image(); im.src = sig.img; }
  }
  $('#pag-num').textContent = p === 0 ? 'Portada' : `Página ${p} de ${total - 1}`;
  $('#pag-ant').disabled = p === 0;
  $('#pag-sig').disabled = p === total - 1;
}
$('#pag-ant').addEventListener('click', () => { estado.pagina--; pintaLibro(); });
$('#pag-sig').addEventListener('click', () => { estado.pagina++; pintaLibro(); });
// Pasar página deslizando el dedo
(() => {
  let x0 = null;
  const libro = $('#libro');
  libro.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  libro.addEventListener('touchend', (e) => {
    if (x0 == null || pantallaActual().id === 'datos') return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0 && !$('#pag-sig').disabled) $('#pag-sig').click();
    if (dx > 0 && !$('#pag-ant').disabled) $('#pag-ant').click();
  });
})();

// =====================================================================
//  Certificado
// =====================================================================
let caraCert = 'frente';
function textoCertificado(n) {
  const l = logroDe(n);
  const lo = n.genero === 'nina' ? 'la' : 'lo';
  if (l?.certificado) return { antes: l.certificado.antes, despues: l.certificado.despues.replaceAll('{lo}', lo) };
  const t = l ? l.texto.replace(/^.*?Significa que /, '').replace(/\.$/, '') : 'ha tenido un año muy especial';
  const color = l ? l.luz.toLowerCase() : 'real';
  return {
    antes: 'Hacemos entrega de este distintivo especial a',
    despues: `, porque ${t}.\n\nLa corona ${color} es el símbolo de todo lo que ha logrado este año y del brillo especial que los Reyes han visto en su corazón.\n\nQue esta luz te acompañe siempre.`,
  };
}
function pintaCertificado() {
  const cont = $('#cert');
  const n = ninoActual();
  if (!n) return;
  $$('.cert-caras [data-cara]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cara === caraCert)));
  const nombreCompleto = `${n.nombre.trim() || 'Nombre'} ${n.apellidos.trim() || 'Apellidos'}`;
  if (caraCert === 'frente') {
    const t = textoCertificado(n);
    const coma = t.despues.startsWith(',');
    cont.innerHTML = `<img src="img/certificado-frente.webp" alt="">
      <div class="cert-texto" id="cert-texto" role="img" aria-label="Certificado de ${esc(nombreCompleto)}">
        <div class="cert-otorgado">Otorgado por Sus Majestades de Oriente</div>
        <div>${esc(t.antes)}</div>
        <div class="cert-nombre">${esc(nombreCompleto)}</div>
        <div>${coma ? ', ' : ''}${esc(coma ? t.despues.slice(1).trim() : t.despues)}</div>
      </div>`;
    ajustaTexto($('#cert-texto'));
  } else {
    cont.innerHTML = `<img src="img/certificado-dorso.webp" alt="">
      <div class="cert-dorso">
        <div class="ilus">${ilustracionCorona(n)}</div>
        <div>${esc(CERTIFICADO_DORSO)}</div>
        <div class="anio">${CONFIG.anio}</div>
        <img src="assets/logo.svg" alt="Fufú Studio">
      </div>`;
  }
}
function ajustaTexto(el) {
  if (!el) return;
  el.style.fontSize = '';
  requestAnimationFrame(() => {
    let tam = parseFloat(getComputedStyle(el).fontSize), vueltas = 0;
    while (el.scrollHeight > el.clientHeight + 1 && tam > 4 && vueltas++ < 40) { tam *= 0.94; el.style.fontSize = tam + 'px'; }
  });
}
$$('.cert-caras [data-cara]').forEach((b) => b.addEventListener('click', () => { caraCert = b.dataset.cara; pintaCertificado(); }));
new ResizeObserver(() => { if (caraCert === 'frente') ajustaTexto($('#cert-texto')); }).observe($('#cert'));
document.fonts?.load("16px 'KGManhattan'").then(() => ajustaTexto($('#cert-texto'))).catch(() => {});

// =====================================================================
//  Corona 3D
// =====================================================================
const fuentes = { nombre: null, anio: null };
const recursos = { svg: null, logo: null, libros: {} };
let three = null;
let generando = 0;

async function cargaRecursos() {
  const [svg, logo, fN, fA] = await Promise.all([
    fetch('assets/coronas.svg').then((r) => r.text()),
    fetch('assets/logo.svg').then((r) => r.text()),
    fetch('assets/ADELIA.otf').then((r) => r.arrayBuffer()),
    fetch('assets/Arimo-Bold.ttf').then((r) => r.arrayBuffer()),
  ]);
  recursos.svg = svg; recursos.logo = logo;
  fuentes.nombre = opentype.parse(fN); fuentes.anio = opentype.parse(fA);
  const claves = ['torre', 'tallerHermanos', 'taller'];
  const libros = await Promise.all(claves.map((c) => fetch(`libros/${c}.json`).then((r) => r.json())));
  claves.forEach((c, k) => { recursos.libros[c] = libros[k]; });
}

function iniciaVisor() {
  const cont = $('#visor');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  cont.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 4 / 3, 1, 1000);
  camera.position.set(0, 0, 120);
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x223355, 1.6));
  const sol = new THREE.DirectionalLight(0xffffff, 2.2); sol.position.set(40, 60, 90); scene.add(sol);
  const contra = new THREE.DirectionalLight(0xc69a3c, 1.2); contra.position.set(-60, -20, -50); scene.add(contra);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 60; controls.maxDistance = 200;
  controls.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches; controls.autoRotateSpeed = 1.6;
  const grupo = new THREE.Group(); scene.add(grupo);
  const matCuerpo = new THREE.MeshStandardMaterial({ color: 0xf2b632, roughness: .55, metalness: .05 });
  const matLetras = new THREE.MeshStandardMaterial({ color: 0xfdfbf5, roughness: .5 });
  const ajusta = () => {
    const w = cont.clientWidth, h = cont.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // aleja la cámara en pantallas estrechas para que la corona quepa entera
    camera.position.setLength(w / h < 1 ? 120 / (w / h) * 0.85 : 120);
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(ajusta).observe(cont); ajusta();
  renderer.domElement.addEventListener('pointerdown', () => { controls.autoRotate = false; });
  renderer.setAnimationLoop(() => {
    if (!cont.offsetParent) return; // no dibuja si no se ve (ahorra batería)
    controls.update(); renderer.render(scene, camera);
  });
  three = { grupo, matCuerpo, matLetras, ultimo: null, clave: '' };
}

function recolorea() {
  if (!three) return;
  const l = logroDe(ninoActual());
  three.matCuerpo.color.set(l ? l.hex : '#F2B632');
}

let temporizador;
function actualizaCorona() {
  clearTimeout(temporizador);
  temporizador = setTimeout(generaAhora, 200);
  recolorea();
}
function generaAhora() {
  if (!three || !fuentes.nombre) return;
  const n = ninoActual();
  if (!n) return;
  const nombre = n.nombre.trim() || 'NOMBRE';
  const clave = `${nombre}|${n.diseno}`;
  if (clave === three.clave) return;
  const id = ++generando;
  $('#visor-cargando').hidden = false;
  setTimeout(() => {
    if (id !== generando) return;
    try {
      const r = generaCorona({
        svgCoronas: recursos.svg, svgLogo: recursos.logo, fuenteNombre: fuentes.nombre, fuenteAnio: fuentes.anio,
        diseno: n.diseno, nombre, anio: CONFIG.anio, logo: true, DOMParser: window.DOMParser,
      });
      const g = three.grupo;
      g.children.forEach((m) => m.geometry.dispose());
      g.clear();
      g.add(new THREE.Mesh(r.partes.cuerpo, three.matCuerpo));
      if (r.partes.letras) g.add(new THREE.Mesh(r.partes.letras, three.matLetras));
      g.children.forEach((m) => { m.geometry.computeVertexNormals(); m.position.set(-r.info.ancho / 2, -r.info.alto / 2, -2); });
      three.ultimo = r; three.clave = clave;
      $('#medidas').textContent = `${Math.round(r.info.ancho)} × ${Math.round(r.info.alto)} mm`;
    } catch (err) {
      console.error(err);
      $('#medidas').textContent = '(no se pudo generar la vista previa)';
    }
    if (id === generando) $('#visor-cargando').hidden = true;
  }, 20);
}
$('#descargar-stl').addEventListener('click', () => {
  if (!three?.ultimo) return;
  const n = ninoActual();
  const dv = aSTL(three.ultimo.geometry);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([dv.buffer], { type: 'model/stl' }));
  a.download = `${three.ultimo.info.nombre}_${CONFIG.anio}_${n.diseno}.stl`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});

// =====================================================================
//  Envío
// =====================================================================
const envioForm = $('#envio-form');
function pintaEnvio() {
  for (const el of envioForm.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') el.checked = !!estado.envio[el.name];
    else el.value = estado.envio[el.name] || '';
  }
}
envioForm.addEventListener('input', (e) => {
  const t = e.target;
  estado.envio[t.name] = t.type === 'checkbox' ? t.checked : t.value;
  t.setAttribute('aria-invalid', 'false');
  guarda(); limpiaError();
});
envioForm.addEventListener('submit', (e) => { e.preventDefault(); $('#siguiente').click(); });

// =====================================================================
//  Resumen y envío del pedido
// =====================================================================
function pedido() {
  const claves = historiasDelPack(estado.ninos.length);
  return {
    anio: CONFIG.anio,
    pack: packActual()?.titulo,
    ninos: estado.ninos.map((n, i) => {
      const l = logroDe(n);
      return {
        nombre: n.nombre.trim(), apellidos: n.apellidos.trim(), genero: n.genero === 'nina' ? 'niña' : 'niño',
        logro: n.logro === 'propio' ? `Personalizado: ${n.logroTexto.trim()}` : `Luz ${l.luz.toLowerCase()} — ${l.resumen}`,
        colorCorona: l.color, disenoCorona: DISENOS_CORONA.find((d) => d.id === n.diseno)?.nombre,
        historia: HISTORIAS[claves[i]].titulo({ nombre: n.nombre.trim() }),
      };
    }),
    envio: { ...estado.envio, urgente: !!estado.envio.urgente },
  };
}
function textoPedido(p, codigo) {
  const l = [`Pedido Pack de Reyes ${p.anio}${codigo ? ' · ' + codigo : ''}`, p.pack, ''];
  p.ninos.forEach((n, i) => {
    l.push(`👑 ${i + 1}. ${n.nombre} ${n.apellidos} (${n.genero})`);
    l.push(`   Logro: ${n.logro}`);
    l.push(`   Corona: ${n.disenoCorona}, color ${n.colorCorona}`);
    l.push(`   Libro: ${n.historia}`);
  });
  const e = p.envio;
  l.push('', `Envío: ${e.nombre}`, `${e.direccion}, ${e.cp} ${e.ciudad}${e.provincia ? ' (' + e.provincia + ')' : ''}`, `Tel: ${e.telefono} · ${e.email}`);
  if (e.urgente) l.push('Envío URGENTE');
  if (e.notas) l.push(`Notas: ${e.notas}`);
  return l.join('\n');
}
function pintaResumen() {
  const p = pedido();
  const lista = pantallas();
  $('#resumen').innerHTML = p.ninos.map((n, i) => `
    <div class="tarjeta">
      <div class="tarjeta-cab"><h3>👑 ${esc(n.nombre)}</h3><button type="button" class="enlace" data-editar="${lista.findIndex((x) => x.id === 'datos' && x.i === i)}">Cambiar</button></div>
      <dl>
        <dt>Certificado</dt><dd>${esc(n.nombre)} ${esc(n.apellidos)}</dd>
        <dt>Logro</dt><dd>${esc(n.logro)}</dd>
        <dt>Corona</dt><dd>${esc(n.disenoCorona)} · ${esc(n.colorCorona)}</dd>
        <dt>Libro</dt><dd>${esc(n.historia)}</dd>
      </dl></div>`).join('') + `
    <div class="tarjeta">
      <div class="tarjeta-cab"><h3>Envío</h3><button type="button" class="enlace" data-editar="${lista.findIndex((x) => x.id === 'envio')}">Cambiar</button></div>
      <dl>
        <dt>Para</dt><dd>${esc(p.envio.nombre)}</dd>
        <dt>Dirección</dt><dd>${esc(p.envio.direccion)}, ${esc(p.envio.cp)} ${esc(p.envio.ciudad)}</dd>
        <dt>Contacto</dt><dd>${esc(p.envio.telefono)} · ${esc(p.envio.email)}</dd>
        <dt>Urgente</dt><dd>${p.envio.urgente ? 'Sí' : 'No'}</dd>
        ${p.envio.notas ? `<dt>Notas</dt><dd>${esc(p.envio.notas)}</dd>` : ''}
      </dl></div>`;
  pintaEnviar();
}
$('#resumen').addEventListener('click', (e) => {
  const b = e.target.closest('[data-editar]');
  if (b) muestra(+b.dataset.editar, true);
});
function pintaEnviar() {
  const z = $('#enviar');
  if (estado.enviado) {
    const { codigo, via } = estado.enviado;
    const extra = via === 'instagram'
      ? `<p>Hemos copiado tu pedido. <b>Pégalo en el chat de Instagram</b> de @${esc(CONFIG.instagram)} y envíalo.</p>
         <p><a class="btn btn-linea" href="https://ig.me/m/${encodeURIComponent(CONFIG.instagram)}" target="_blank" rel="noopener">Abrir Instagram otra vez</a></p>`
      : via === 'email'
        ? `<p>Se ha abierto tu correo con el pedido. <b>No olvides pulsar enviar.</b> Si no se abrió, escríbenos a <a href="mailto:${esc(CONFIG.email)}">${esc(CONFIG.email)}</a> con tu código.</p>`
        : '<p>Te escribiremos para confirmar el pago y la fecha de envío.</p>';
    z.innerHTML = `<div class="exito"><p>¡Ya casi está! Tu código de pedido es <span class="codigo">${esc(codigo)}</span>.</p>${extra}<p>¡Que brille la magia de los Reyes! ✨</p></div>`;
    return;
  }
  const b = [];
  if (CONFIG.urlPedidos) b.push('<button type="button" class="btn btn-oro" data-enviar="web">Enviar pedido</button>');
  if (CONFIG.whatsapp) b.push('<button type="button" class="btn btn-oro" data-enviar="whatsapp">Enviar por WhatsApp</button>');
  const principal = CONFIG.urlPedidos || CONFIG.whatsapp ? 'btn-linea' : 'btn-oro';
  if (CONFIG.email) b.push(`<button type="button" class="btn ${principal}" data-enviar="email">Enviar por email</button>`);
  if (CONFIG.instagram) b.push(`<button type="button" class="btn ${CONFIG.email ? 'btn-linea' : principal}" data-enviar="instagram">Enviar por Instagram</button>`);
  b.push('<button type="button" class="btn btn-linea" data-enviar="copiar">Copiar resumen</button>');
  z.innerHTML = b.join('');
}
const nuevoCodigo = () => `FUFU-${String(CONFIG.anio).slice(2)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
$('#enviar').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-enviar]');
  if (!b) return;
  const p = pedido(), codigo = nuevoCodigo(), texto = textoPedido(p, codigo), via = b.dataset.enviar;
  if (via === 'copiar') {
    try { await navigator.clipboard.writeText(texto); b.textContent = '¡Copiado!'; } catch { b.textContent = 'No se pudo copiar'; }
    return;
  }
  if (via === 'web') {
    b.disabled = true; b.textContent = 'Enviando…';
    try {
      await fetch(CONFIG.urlPedidos, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ codigo, ...p }) });
    } catch {
      b.disabled = false; b.textContent = 'Enviar pedido';
      return muestraError('No se pudo enviar. Revisa tu conexión e inténtalo otra vez.');
    }
  } else if (via === 'whatsapp') {
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  } else if (via === 'email') {
    location.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent('Pedido Pack de Reyes ' + codigo)}&body=${encodeURIComponent(texto)}`;
  } else if (via === 'instagram') {
    try { await navigator.clipboard.writeText(texto); } catch { /* nada */ }
    window.open(`https://ig.me/m/${encodeURIComponent(CONFIG.instagram)}`, '_blank', 'noopener');
  }
  estado.enviado = { codigo, via };
  guarda(); pintaEnviar();
});

// =====================================================================
//  Validación y botones Atrás / Siguiente
// =====================================================================
function muestraError(m) { $('#error').textContent = m; }
function limpiaError() { $('#error').textContent = ''; }
const marca = (el) => { el.setAttribute('aria-invalid', 'true'); el.focus(); };

function valida() {
  const p = pantallaActual(), n = ninoActual();
  if (p.id === 'pack' && !estado.pack) return 'Elige un pack para continuar.';
  if (p.id === 'datos') {
    if (!n.nombre.trim()) { marca(formDatos.nombre); return 'Escribe su nombre.'; }
    if (!n.apellidos.trim()) { marca(formDatos.apellidos); return 'Faltan los apellidos (salen en el certificado).'; }
    if (!n.genero) return 'Indica si es niño o niña.';
  }
  if (p.id === 'logro') {
    if (!n.logro) return 'Elige su logro.';
    if (n.logro === 'propio' && n.logroTexto.trim().length < 5) { marca($('#logro-texto')); return 'Escribe su logro.'; }
  }
  if (p.id === 'envio') {
    for (const el of envioForm.elements) {
      if (!el.required) continue;
      const v = el.value.trim();
      if (!v || (el.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v))) { marca(el); return 'Revisa el dato marcado en rojo.'; }
    }
  }
  return null;
}
$('#siguiente').addEventListener('click', () => {
  const err = valida();
  if (err) return muestraError(err);
  document.activeElement?.blur?.(); // cierra el teclado del móvil
  muestra(estado.idx + 1, true);
});
$('#atras').addEventListener('click', () => {
  if (entradasHistorial > 1) history.back();
  else muestra(estado.idx - 1, true);
});

// =====================================================================
//  Arranque
// =====================================================================
pintaPlazo();
preparaCarrusel();
pintaBotonVoz();
textoBotonAbrir();
if (MODO_TALLER) $('#descargar-stl').hidden = false;
iniciaVisor();
cargaRecursos()
  .then(() => {
    if (!$('#app').hidden) { pintaEscenario(); if (pantallaActual().id === 'datos') avisoNombre(); }
  })
  .catch((err) => { console.error(err); $('#visor-cargando').textContent = 'No se pudo cargar la vista previa'; });
