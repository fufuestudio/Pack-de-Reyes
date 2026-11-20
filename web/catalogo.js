// =====================================================================
//  CATÁLOGO DEL PACK DE REYES — edita aquí precios, colores, logros...
// =====================================================================

export const CONFIG = {
  anio: 2026,
  // Fecha límite de pedidos (año-mes-día). Se muestra una cuenta atrás.
  fechaLimite: '2026-12-15',
  fechaLimiteUrgente: '2026-12-21',
  // Dónde llegan los pedidos:
  //  - urlPedidos: URL del Google Apps Script (ver /herramientas/google-apps-script.js). Si está vacía, no se usa.
  //  - whatsapp: número con prefijo, sin + ni espacios (ej. 34600111222). Si está vacío, no se muestra.
  //  - email: correo de pedidos. Si está vacío, no se muestra.
  //  - instagram: usuario de Instagram (sin @). Abre un mensaje directo con el pedido copiado.
  urlPedidos: '',
  whatsapp: '',
  email: 'fufuestudio@gmail.com',
  instagram: 'fufu_estudio',
  moneda: '€',
};

// Packs disponibles. precio: null = no se muestra precio.
export const PACKS = [
  { id: 'uno', ninos: 1, titulo: 'Pack para un niño o niña', precio: null, disponible: true, imagen: 'img/pack-uno.webp' },
  { id: 'dos', ninos: 2, titulo: 'Pack hermanos (2)', precio: null, disponible: true, imagen: 'img/pack-hermanos.webp' },
  { id: 'tres', ninos: 3, titulo: 'Pack hermanos (3)', precio: null, disponible: false, nota: 'Próximamente', imagen: 'img/pack-hermanos.webp' },
];

// Cada logro es una "luz" que los Reyes ven en el Gran Libro. El color de la luz es el color de la corona.
// propuesta: true = texto nuevo sugerido, todavía no está en tus libros (revísalo).
export const LOGROS = [
  {
    id: 'dorada', luz: 'DORADA', color: 'Amarillo', hex: '#F2B632',
    resumen: 'Imaginación, creatividad y logros excepcionales',
    texto: 'Brillante como el sol. Significa que ha conseguido logros excepcionales y sobresalientes. Su imaginación y creatividad brillaron todo el año.',
    // Texto del certificado (antes y después del nombre). {lo} = lo/la según niño o niña.
    certificado: {
      antes: 'Esta Corona Amarilla ha sido creada especialmente para celebrar el brillo único de',
      despues: 'Este reconocimiento se concede a quienes han demostrado un espíritu alegre, luminoso y lleno de creatividad. La Corona Amarilla representa la calidez de sus ideas, la energía con la que afronta cada día y ese entusiasmo que contagia a todos los que {lo} rodean. Es símbolo de un año lleno de descubrimientos, sonrisas, metas alcanzadas y momentos que han dejado huella.\n\nQue su luz siga creciendo y que nunca deje de sorprender al mundo con su imaginación y su alegría.\n\nGracias por aportar color y magia al año que termina. Para nosotros, ha sido un honor acompañarte desde el cielo en cada uno de tus logros.',
    },
  },
  {
    id: 'azul', luz: 'AZUL', color: 'Azul', hex: '#2F5DA8',
    resumen: 'Bondad, calma y buen comportamiento',
    texto: 'Tranquila como el mar en calma. Significa que su bondad y su buen comportamiento han sido un ejemplo para todos.',
    certificado: {
      antes: 'Hacemos entrega de este distintivo especial a',
      despues: ', por su fuerza interior, su paciencia y su capacidad de seguir adelante incluso cuando el camino se vuelve difícil.\n\nLa corona azul es el símbolo de su resiliencia, de su tranquilidad y de ese corazón firme que sabe que cada día es una nueva oportunidad.\n\nQue su calma siga transformando el mundo. Gracias por enseñarnos que la verdadera fuerza también puede ser silenciosa.',
    },
  },
  {
    id: 'roja', luz: 'ROJA', color: 'Rojo', hex: '#C8323C', propuesta: true,
    resumen: 'Valentía y superar los miedos',
    texto: 'Cálida como el fuego del hogar. Significa que ha sido muy valiente y se ha atrevido a enfrentarse a sus miedos.',
  },
  {
    id: 'verde', luz: 'VERDE', color: 'Verde', hex: '#3E9B5A', propuesta: true,
    resumen: 'Esfuerzo y aprender cosas nuevas',
    texto: 'Fuerte como un árbol que no para de crecer. Significa que se ha esforzado muchísimo y ha aprendido cosas nuevas cada día.',
  },
  {
    id: 'rosa', luz: 'ROSA', color: 'Rosa', hex: '#E58BB0', propuesta: true,
    resumen: 'Cariño y ayudar a los demás',
    texto: 'Suave como un abrazo. Significa que ha cuidado y ayudado a los demás con muchísimo cariño.',
  },
  {
    id: 'morada', luz: 'MORADA', color: 'Morado', hex: '#7A4FA3', propuesta: true,
    resumen: 'Paciencia y superar retos difíciles',
    texto: 'Profunda como el cielo de la noche de Reyes. Significa que ha superado retos difíciles con mucha paciencia y fuerza interior.',
  },
];

// Texto del reverso del certificado ({anio} se sustituye por el año).
export const CERTIFICADO_DORSO = 'Este certificado forma parte de la colección oficial de Logros Anuales entregados por Sus Majestades los Reyes Magos de Oriente.\n\nCada pieza ha sido creada con dedicación para celebrar los momentos más especiales del año. Fufú Studio se enorgullece de preservar esta tradición con diseños únicos y artesanales.';

// Colores de filamento disponibles para un logro personalizado.
export const COLORES = LOGROS.map(({ color, hex, luz }) => ({ color, hex, luz }));

// Diseños de corona (deben existir en lib/crown.mjs → DISENOS).
export const DISENOS_CORONA = [
  { id: 'clasica', nombre: 'Corona clásica', descripcion: 'Cinco puntas y aro para colgar' },
  { id: 'imperial', nombre: 'Corona imperial', descripcion: 'Cruz real y cúpula' },
];

// Máximo de letras recomendado para que el nombre se lea bien en la corona.
export const MAX_LETRAS_NOMBRE = 10;
