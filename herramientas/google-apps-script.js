// =====================================================================
//  Recibir pedidos en una Hoja de Google (gratis)
//  1. Crea una Hoja de cálculo nueva en Google Drive ("Pedidos Pack Reyes").
//  2. Menú Extensiones → Apps Script. Borra lo que haya y pega este archivo.
//  3. (Opcional) Cambia AVISAR_A por tu correo para recibir un email por pedido.
//  4. Implementar → Nueva implementación → Tipo "Aplicación web"
//       Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario
//  5. Copia la URL que termina en /exec y pégala en web/catalogo.js → CONFIG.urlPedidos
// =====================================================================

const AVISAR_A = ''; // ej. 'pedidos@tudominio.com' (vacío = no enviar email)

function doPost(e) {
  const p = JSON.parse(e.postData.contents);
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(['Fecha', 'Código', 'Pack', 'Niño', 'Apellidos', 'Niño/niña', 'Logro', 'Color corona', 'Diseño corona', 'Libro',
      'Cliente', 'Email', 'Teléfono', 'Dirección', 'CP', 'Ciudad', 'Provincia', 'Urgente', 'Notas', 'Estado']);
    hoja.setFrozenRows(1);
  }
  const e2 = p.envio || {};
  (p.ninos || []).forEach((n) => {
    hoja.appendRow([new Date(), p.codigo, p.pack, n.nombre, n.apellidos, n.genero, n.logro, n.colorCorona, n.disenoCorona, n.historia,
      e2.nombre, e2.email, e2.telefono, e2.direccion, e2.cp, e2.ciudad, e2.provincia, e2.urgente ? 'Sí' : 'No', e2.notas || '', 'Pendiente de pago']);
  });
  if (AVISAR_A) {
    const lineas = (p.ninos || []).map((n) => `• ${n.nombre} ${n.apellidos} — ${n.logro} — ${n.disenoCorona} ${n.colorCorona}`);
    MailApp.sendEmail(AVISAR_A, `Nuevo pedido ${p.codigo}`, `${p.pack}\n${lineas.join('\n')}\n\nCliente: ${e2.nombre} (${e2.email}, ${e2.telefono})`);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
