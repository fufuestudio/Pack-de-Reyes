// Textos de los libros (sacados de los PDF finales) convertidos en plantillas.
// n = { nombre, genero: 'nino' | 'nina', luz, textoLuz }

const al = (n) => (n.genero === 'nina' ? 'a la niña' : 'al niño');

export const HISTORIAS = {
  taller: {
    titulo: (n) => `El Taller de las Estrellas y El Gran Logro de ${n.nombre}`,
    portada: 'taller',
    cartel: { left: 17.5, top: 6.2, width: 68.4, height: 31.6 },
    ilustracion: 2,
    paginas: [
      () => 'En lo más alto del Palacio de Oriente, donde las torres tocan las nubes, existe una habitación secreta que muy pocos conocen: El Taller de las Estrellas. Allí no se fabrican juguetes normales. Allí, entre engranajes de oro y vapor de nubes, se guardan los recuerdos más brillantes de todos los niños del mundo.',
      (n) => `—¡Mirad esto! —exclamó el Rey Gaspar, señalando una página que brillaba con fuerza—. Aquí dice que <b>${n.nombre}</b> ha tenido un año increíble.\n\nEl Rey Baltasar se ajustó las gafas y sonrió: —Es cierto. Lo he visto desde mi camello. Pero, ¿qué luz ha brillado más fuerte en su corazón este año?`,
      (n) => `Los tres Reyes Magos observaron atentamente la luz que salía del libro. Esta no era una luz cualquiera...\n\n—¡Es una luz <b>${n.luz}</b>! —dijo Melchor—. ${n.textoLuz}`,
      (n) => `—Entonces está decidido —sentenció Baltasar, golpeando su bastón en el suelo—. ¡${n.nombre} no necesita un regalo cualquiera! Merece su propia Corona Real de Logro Anual.`,
    ],
  },
  torre: {
    titulo: (n) => `La Torre de los Reyes y El Gran Logro de ${n.nombre}`,
    portada: 'torre',
    // Posición (en % de la portada) de la imagen del título en Portadas.ai
    cartel: { left: 17.5, top: 6.4, width: 66.4, height: 30.6 },
    ilustracion: 2, // página con la corona ilustrada (0 = primera página tras la portada)
    paginas: [
      () => 'En la parte más alta del Palacio de Oriente, hay una biblioteca silenciosa llena de libros antiguos y telescopios. Allí es donde Melchor, Gaspar y Baltasar deciden quién entra en la lista de “Niños Extraordinarios”.',
      (n) => `Esa noche, Baltasar estaba mirando por el gran ventanal hacia las estrellas. —¡Venid a ver! —dijo—. He estado observando a <b>${n.nombre}</b> todo el año.\n\nGaspar abrió el Gran Libro y asintió: —Es cierto. Este año ha brillado con mucha fuerza. Melchor se acercó para ver mejor el brillo especial que rodeaba ${al(n)} y exclamó...`,
      (n) => `—¡Es una luz <b>${n.luz}</b>! —dijo Melchor—. ${n.textoLuz}`,
      (n) => `—Se merece una Corona Real —decidieron los tres Reyes. Rápidamente, Gaspar escribió la orden oficial en un pergamino dorado: “Una corona especial para ${n.nombre}”.\n\nEnrolló el papel y lo metió en el Tubo de Cristal, un conducto mágico que baja directo al taller. ¡Fiuuuuuu!`,
    ],
  },
  tallerHermanos: {
    titulo: (n) => `El Taller de las Estrellas y El Gran Logro de ${n.nombre}`,
    portada: 'taller',
    cartel: { left: 17.5, top: 6.2, width: 68.4, height: 31.6 },
    ilustracion: 2,
    paginas: [
      () => 'Muy por debajo de las torres del palacio, existe un lugar ruidoso y divertido: El Taller de las Estrellas. Está lleno de engranajes gigantes, vapor de colores y duendes que esperan órdenes.',
      (n) => `Todo estaba tranquilo hasta que... ¡CLING! Del Tubo de Cristal que viene del techo, cayó un pergamino dorado a toda velocidad. Un duende lo recogió y leyó en voz alta: —¡Atención todos! ¡Ha llegado una orden urgente desde la Torre! Es para <b>${n.nombre}</b>.`,
      (n) => `El jefe del taller leyó las instrucciones de los Reyes Magos y dijo...\n\n—¡Es una luz <b>${n.luz}</b>! ${n.textoLuz}`,
      (n) => `—¡Manos a la obra! —gritaron los ayudantes. Apretaron el botón rojo y la cinta transportadora empezó a moverse: ¡Clac, clac, zzum! La máquina tejió la corona hilo a hilo y justo al final, grabó el nombre <b>${n.nombre}</b> en el centro, todavía caliente y brillante.`,
    ],
  },
};

// Qué historia recibe cada niño según el pack.
export function historiasDelPack(numNinos) {
  if (numNinos === 1) return ['taller'];
  if (numNinos === 2) return ['torre', 'tallerHermanos'];
  return ['torre', 'tallerHermanos', 'tallerHermanos']; // pack de 3: pendiente de tercera historia
}
