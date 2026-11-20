# Pack de Reyes Magos · Fufú Studio

Web de pedidos con configurador y generador de coronas 3D.

## Probar la web en tu ordenador

```bash
node servidor.mjs
```

Abre http://localhost:5173. Con `http://localhost:5173/?taller` aparece además el botón **Descargar STL** de cada corona.

## Generar una corona STL a mano

```bash
node generar.mjs LUCÍA 2026 clasica --separado
```

- Diseños: `clasica` (la de Olivia) o `imperial` (la de Jorge).
- `--separado` crea también `_cuerpo.stl` y `_letras.stl` para imprimir a dos colores.
- `--sin-logo` quita el logo grabado por detrás.
- Los archivos salen en la carpeta `salida/`.

## Qué editar

| Archivo | Para qué |
|---|---|
| `web/catalogo.js` | Año, fecha límite, precios, logros, colores, a dónde llegan los pedidos |
| `web/historias.js` | Títulos y portadas de cada cuento |
| `web/libros/*.json` | Páginas del cuento (se generan con `herramientas/convertir-libros.mjs` desde los InDesign) |
| `web/lib/crown.mjs` | Alturas y medidas de las coronas (`ALTURAS`, `DISENOS`) |
| `web/assets/coronas.svg` | Formas de las coronas (exportado de Illustrator) |

## Recibir pedidos

Elige una o varias opciones en `web/catalogo.js`:

- `urlPedidos`: los pedidos llegan a una Hoja de Google. Instrucciones en `herramientas/google-apps-script.js`.
- `whatsapp`: el cliente envía el resumen por WhatsApp.
- `email`: el cliente envía el resumen por correo.

## Publicar

Es una web estática (carpeta `web/`), sin compilar. Se publica sola en **GitHub Pages**: cada vez que se suben cambios a la rama `main`, el flujo `.github/workflows/publicar.yml` publica la carpeta `web/`.

Primera vez: en GitHub, *Settings → Pages → Build and deployment → Source: GitHub Actions*.

**Fuentes:** ADELIA y KGManhattanScript se publican con licencia web de Fufú Studio. El año de la corona usa **Arimo Bold** (gratis, licencia Apache). `arialbd.ttf` no se sube al repositorio (es de Microsoft); solo se usa en local si está.
