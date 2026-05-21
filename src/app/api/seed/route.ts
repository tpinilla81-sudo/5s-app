import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const S_NAMES = ['Revisar', 'Ordenar', 'Limpiar', 'Estandarizar', 'Mantener']

const TRAINING_CONTENT: Record<number, Array<{ title: string; content: string }>> = {
  1: [
    { title: '¿Qué es SEIRI (Revisar)?', content: 'Seiri significa clasificar y separar los elementos necesarios de los innecesarios en el lugar de trabajo. El objetivo es eliminar todo lo que no se necesita para realizar el trabajo diario, reduciendo el desorden y liberando espacio útil.' },
    { title: 'Identificación de innecesarios', content: 'Para identificar lo innecesario, pregúntate: ¿Se ha usado en el último año? ¿Es probable que se use en el futuro? ¿Es reemplazable fácilmente? Si la respuesta es no, probablemente sea innecesario.' },
    { title: 'Técnica de las tarjetas rojas', content: 'La técnica de las tarjetas rojas consiste en etiquetar todos los ítems dudosos o innecesarios con una tarjeta roja. Estos ítems se colocan en un área designada y se decide su destino: eliminar, reubicar o mantener.' },
  ],
  2: [
    { title: '¿Qué es SEITON (Ordenar)?', content: 'Seiton significa organizar los elementos necesarios de manera que sean fáciles de encontrar, usar y devolver. Cada cosa debe tener un lugar definido y visible, y cada lugar debe tener su cosa.' },
    { title: 'Principio de accesibilidad', content: 'Los objetos más usados deben estar más accesibles. Los de uso frecuente al alcance de la mano, los de uso ocasional en lugares cercanos, y los de uso raro en almacenamiento más lejano.' },
    { title: 'Visualización y etiquetado', content: 'La visualización permite identificar de un vistazo si algo está en su lugar. Usa etiquetas, contornos, códigos de color y señales visuales para marcar la ubicación correcta de cada elemento.' },
  ],
  3: [
    { title: '¿Qué es SEISO (Limpiar)?', content: 'Seiso significa limpiar el lugar de trabajo de forma exhaustiva, identificando y eliminando las fuentes de suciedad. La limpieza no es solo estética, es una forma de inspección que permite detectar anomalías.' },
    { title: 'Limpieza como inspección', content: 'Al limpiar, se detectan fugas, grietas, desgastes y otras anomalías que de otro modo pasarían desapercibidas. La limpieza sistemática es una herramienta de mantenimiento preventivo.' },
    { title: 'Plan de limpieza', content: 'Establece un plan de limpieza que defina qué se limpia, quién lo limpia, cuándo y con qué materiales. Asigna responsabilidades y crea mapas de zonas de limpieza.' },
  ],
  4: [
    { title: '¿Qué es SEIKETSU (Estandarizar)?', content: 'Seiketsu significa crear estándares y normas que mantengan los logros de las 3S anteriores. Sin estandarización, es fácil volver a los malos hábitos. Los estándares convierten las mejoras en hábitos.' },
    { title: 'Creación de procedimientos', content: 'Documenta los procedimientos de trabajo, las normas de orden y limpieza, y los estándares visuales. Asegúrate de que sean claros, visibles y fáciles de cumplir por todos.' },
    { title: 'Gestión visual del estándar', content: 'Usa fotografías del estado correcto, diagramas, checklists y tableros de control visual para que cualquiera pueda verificar si se cumple el estándar establecido.' },
  ],
  5: [
    { title: '¿Qué es SHITSUKE (Mantener)?', content: 'Shitsuke significa crear el hábito de respetar los estándares establecidos. Es la S más difícil porque requiere disciplina y compromiso continuo. Sin mantenimiento, todo el esfuerzo anterior se pierde.' },
    { title: 'Auditorías periódicas', content: 'Realiza auditorías regulares para verificar el cumplimiento de los estándares. Las auditorías deben ser objetivas, constructivas y enfocadas en la mejora continua.' },
    { title: 'Cultura de mejora continua', content: 'Fomenta una cultura donde todos participen activamente en mantener y mejorar el lugar de trabajo. Reconoce los logros, comparte las mejores prácticas y celebra los avances.' },
  ],
}

const EXAM_QUESTIONS: Record<number, Array<{ question: string; options: string[]; correctAnswer: number }>> = {
  1: [
    { question: '¿Qué significa Seiri?', options: ['Ordenar', 'Clasificar y eliminar innecesarios', 'Limpiar', 'Estandarizar'], correctAnswer: 1 },
    { question: '¿Para qué sirve la técnica de las tarjetas rojas?', options: ['Para decorar', 'Para etiquetar ítems innecesarios o dudosos', 'Para señalizar salidas', 'Para identificar peligros'], correctAnswer: 1 },
    { question: '¿Cuál es la pregunta clave al clasificar?', options: ['¿Cuánto cuesta?', '¿Es nuevo?', '¿Se ha usado en el último año?', '¿De quién es?'], correctAnswer: 2 },
    { question: '¿Qué se hace con los ítems innecesarios?', options: ['Guardarlos', 'Eliminarlos o reubicarlos', 'Venderlos', 'Ignorarlos'], correctAnswer: 1 },
    { question: '¿Cuál es el beneficio principal de Seiri?', options: ['Gastar más', 'Reducir desorden y liberar espacio', 'Comprar más cosas', 'Ninguno'], correctAnswer: 1 },
  ],
  2: [
    { question: '¿Qué significa Seiton?', options: ['Limpiar', 'Organizar para fácil acceso', 'Eliminar', 'Auditar'], correctAnswer: 1 },
    { question: '¿Dónde deben ubicarse los objetos de uso frecuente?', options: ['En el almacén', 'Al alcance de la mano', 'En la estantería alta', 'En otro departamento'], correctAnswer: 1 },
    { question: '¿Qué técnica ayuda a identificar si algo está en su lugar?', options: ['Memorización', 'Visualización y etiquetado', 'Adivinación', 'Preguntar al jefe'], correctAnswer: 1 },
    { question: '¿Cuál es el principio de Seiton?', options: ['Cada cosa en cualquier sitio', 'Cada cosa en su sitio, un sitio para cada cosa', 'Todo junto', 'Ninguno'], correctAnswer: 1 },
    { question: '¿Qué tipo de señales se usan en Seiton?', options: ['Señales de tráfico', 'Códigos de color y contornos', 'Señales de humo', 'Banderas'], correctAnswer: 1 },
  ],
  3: [
    { question: '¿Qué significa Seiso?', options: ['Ordenar', 'Limpiar e inspeccionar', 'Clasificar', 'Mantener'], correctAnswer: 1 },
    { question: '¿Qué se detecta al limpiar?', options: ['Polvo solamente', 'Fugas, grietas y desgastes', 'Nada importante', 'Cosas perdidas'], correctAnswer: 1 },
    { question: '¿Qué debe incluir un plan de limpieza?', options: ['Solo qué limpiar', 'Qué, quién, cuándo y con qué', 'Solo quién limpia', 'Solo el horario'], correctAnswer: 1 },
    { question: 'La limpieza es una forma de:', options: ['Ejercicio', 'Inspección y mantenimiento preventivo', 'Perder tiempo', 'Castigo'], correctAnswer: 1 },
    { question: '¿Qué fuente de suciedad debe eliminarse?', options: ['La que se ve', 'La raíz del problema', 'Todas las anteriores son falsas', 'Ninguna'], correctAnswer: 1 },
  ],
  4: [
    { question: '¿Qué significa Seiketsu?', options: ['Limpiar', 'Estandarizar y crear normas', 'Clasificar', 'Auditar'], correctAnswer: 1 },
    { question: '¿Por qué es importante estandarizar?', options: ['Para que todo sea igual', 'Para mantener los logros de las 3S anteriores', 'Para gastar dinero', 'No es importante'], correctAnswer: 1 },
    { question: '¿Qué herramienta ayuda a verificar el estándar?', options: ['Memoria', 'Gestión visual y fotografías', 'Intuición', 'Suerte'], correctAnswer: 1 },
    { question: '¿Qué pasa sin estandarización?', options: ['Nada', 'Se vuelve a los malos hábitos', 'Mejora solo', 'Todo funciona bien'], correctAnswer: 1 },
    { question: '¿Qué incluye un estándar visual?', options: ['Solo texto', 'Fotos del estado correcto y checklists', 'Solo colores', 'Nada específico'], correctAnswer: 1 },
  ],
  5: [
    { question: '¿Qué significa Shitsuke?', options: ['Limpiar', 'Mantener la disciplina y los hábitos', 'Clasificar', 'Ordenar'], correctAnswer: 1 },
    { question: '¿Cuál es la S más difícil de mantener?', options: ['Seiri', 'Shitsuke (Mantener)', 'Seiso', 'Seiton'], correctAnswer: 1 },
    { question: '¿Cómo se mantiene la disciplina 5S?', options: ['Con auditorías periódicas', 'Con suerte', 'Ignorando problemas', 'Cambiando reglas cada día'], correctAnswer: 0 },
    { question: '¿Qué se debe hacer con los resultados de auditorías?', options: ['Ignorarlos', 'Usarlos para mejora continua', 'Esconderlos', 'Quejarse'], correctAnswer: 1 },
    { question: '¿Cómo se fomenta la cultura 5S?', options: ['Castigando errores', 'Reconociendo logros y compartiendo buenas prácticas', 'Ignorando avances', 'Solo con dinero'], correctAnswer: 1 },
  ],
}

const INVENTORY_TEMPLATES: Record<number, Array<{ name: string; location: string; category: string; action: string }>> = {
  1: [
    { name: 'Herramientas rotas', location: 'Taller principal', category: 'innecesario', action: 'Eliminar' },
    { name: 'Material de oficina obsoleto', location: 'Oficina', category: 'innecesario', action: 'Reciclar' },
    { name: 'Piezas de repuesto activas', location: 'Almacén A', category: 'util', action: 'Mantener organizado' },
    { name: 'Documentación antigua', location: 'Archivo', category: 'dudoso', action: 'Revisar y digitalizar' },
    { name: 'Equipos en desuso', location: 'Nave 2', category: 'innecesario', action: 'Vender o donar' },
  ],
  2: [
    { name: 'Caja de herramientas', location: 'Puesto de trabajo 1', category: 'util', action: 'Asignar ubicación fija' },
    { name: 'Carro de transporte', location: 'Pasillo B', category: 'util', action: 'Zona marcada en suelo' },
    { name: 'Extintores', location: 'Varios puntos', category: 'util', action: 'Señalizar ubicación' },
    { name: 'Palets vacíos', location: 'Zona de carga', category: 'dudoso', action: 'Definir zona temporal' },
    { name: 'Contenedores de residuos', location: 'Salida trasera', category: 'util', action: 'Codificar por color' },
  ],
  3: [
    { name: 'Kit de limpieza básico', location: 'Carro de limpieza', category: 'util', action: 'Reponer semanalmente' },
    { name: 'Productos químicos caducados', location: 'Almacén productos', category: 'innecesario', action: 'Retirar y gestionar residuo' },
    { name: 'Bayetas y trapos', location: 'Armario limpieza', category: 'util', action: 'Renovar mensualmente' },
    { name: 'Aspiradora industrial', location: 'Sala máquinas', category: 'util', action: 'Mantenimiento trimestral' },
    { name: 'Escobas desgastadas', location: 'Armario limpieza', category: 'innecesario', action: 'Reemplazar' },
  ],
  4: [
    { name: 'Procedimientos de trabajo', location: 'Tablón oficina', category: 'util', action: 'Actualizar y digitalizar' },
    { name: 'Fichas de control antiguas', location: 'Archivo', category: 'innecesario', action: 'Digitalizar y eliminar papel' },
    { name: 'Señales de seguridad', location: 'Taller', category: 'util', action: 'Verificar visibilidad' },
    { name: 'Manuales de equipo obsoletos', location: 'Oficina técnica', category: 'innecesario', action: 'Actualizar versión' },
    { name: 'Checklists de limpieza', location: 'Carro limpieza', category: 'util', action: 'Revisar contenido' },
  ],
  5: [
    { name: 'Registro de auditorías', location: 'Oficina calidad', category: 'util', action: 'Mantener actualizado' },
    { name: 'Plan de formación 5S', location: 'RRHH', category: 'util', action: 'Ejecutar según calendario' },
    { name: 'Actas de reuniones antiguas', location: 'Archivo', category: 'dudoso', action: 'Evaluar si conservar' },
    { name: 'Panel de indicadores 5S', location: 'Entrada taller', category: 'util', action: 'Actualizar semanalmente' },
    { name: 'Normativas sin difundir', location: 'Oficina', category: 'dudoso', action: 'Comunicar al equipo' },
  ],
}

const AUTOEVAL_CHECKLISTS: Record<number, Array<{ item: string; maxScore: number }>> = {
  1: [
    { item: 'Se han identificado y etiquetado todos los ítems innecesarios', maxScore: 5 },
    { item: 'Se ha eliminado al menos el 80% de los ítems innecesarios', maxScore: 5 },
    { item: 'El área de trabajo está libre de objetos sin uso', maxScore: 5 },
    { item: 'Se ha definido el área de ítems dudosos con plazo de decisión', maxScore: 5 },
    { item: 'Los empleados conocen y aplican el criterio de clasificación', maxScore: 5 },
  ],
  2: [
    { item: 'Cada herramienta tiene su ubicación marcada y visible', maxScore: 5 },
    { item: 'Los objetos más usados están al alcance de la mano', maxScore: 5 },
    { item: 'Se usan códigos de color y etiquetas para identificar ubicaciones', maxScore: 5 },
    { item: 'Se puede encontrar cualquier herramienta en menos de 30 segundos', maxScore: 5 },
    { item: 'Todos los empleados conocen la ubicación de los elementos', maxScore: 5 },
  ],
  3: [
    { item: 'Todas las superficies están limpias y libres de polvo', maxScore: 5 },
    { item: 'Se ha identificado y eliminado la fuente de suciedad', maxScore: 5 },
    { item: 'Existe un plan de limpieza asignado por zonas', maxScore: 5 },
    { item: 'Los equipos están limpios y en buen estado visible', maxScore: 5 },
    { item: 'Se dispone de materiales de limpieza adecuados', maxScore: 5 },
  ],
  4: [
    { item: 'Los procedimientos están documentados y accesibles', maxScore: 5 },
    { item: 'Existen fotos del estado estándar en lugar visible', maxScore: 5 },
    { item: 'Los estándares son conocidos por todos los empleados', maxScore: 5 },
    { item: 'Se usan checklists para verificar el cumplimiento', maxScore: 5 },
    { item: 'Las desviaciones se corrigen de forma sistemática', maxScore: 5 },
  ],
  5: [
    { item: 'Se realizan auditorías periódicas (al menos mensuales)', maxScore: 5 },
    { item: 'Los resultados de auditoría se comunican a todo el equipo', maxScore: 5 },
    { item: 'Se reconocen y celebran los logros del equipo', maxScore: 5 },
    { item: 'Los nuevos empleados reciben formación 5S', maxScore: 5 },
    { item: 'Existe un sistema de sugerencias de mejora activo', maxScore: 5 },
  ],
}

const AUDIT_TEMPLATES: Record<number, Array<{ criterion: string; weight: number }>> = {
  1: [
    { criterion: 'Ausencia de ítems innecesarios en el área de trabajo', weight: 25 },
    { criterion: 'Uso efectivo de la técnica de tarjetas rojas', weight: 20 },
    { criterion: 'Definición clara de ítems necesarios vs innecesarios', weight: 20 },
    { criterion: 'Participación del personal en la clasificación', weight: 15 },
    { criterion: 'Documentación de decisiones tomadas', weight: 20 },
  ],
  2: [
    { criterion: 'Ubicaciones marcadas y visibles para todos los elementos', weight: 25 },
    { criterion: 'Tiempo de localización de herramientas < 30 segundos', weight: 20 },
    { criterion: 'Uso de códigos de color y señalización visual', weight: 20 },
    { criterion: 'Accesibilidad de objetos según frecuencia de uso', weight: 15 },
    { criterion: 'Conocimiento del personal sobre ubicaciones', weight: 20 },
  ],
  3: [
    { criterion: 'Nivel de limpieza general del área', weight: 25 },
    { criterion: 'Identificación y eliminación de fuentes de suciedad', weight: 20 },
    { criterion: 'Cumplimiento del plan de limpieza', weight: 20 },
    { criterion: 'Disponibilidad de materiales de limpieza', weight: 15 },
    { criterion: 'Integración limpieza-inspección', weight: 20 },
  ],
  4: [
    { criterion: 'Documentación actualizada de procedimientos', weight: 25 },
    { criterion: 'Gestión visual efectiva (fotos, checklists, señales)', weight: 20 },
    { criterion: 'Conocimiento del personal sobre estándares', weight: 20 },
    { criterion: 'Sistema de corrección de desviaciones', weight: 15 },
    { criterion: 'Revisión periódica de estándares', weight: 20 },
  ],
  5: [
    { criterion: 'Programa de auditorías implementado', weight: 25 },
    { criterion: 'Comunicación de resultados al equipo', weight: 20 },
    { criterion: 'Sistema de reconocimiento de logros', weight: 20 },
    { criterion: 'Formación continua de nuevos empleados', weight: 15 },
    { criterion: 'Cultura de mejora continua visible', weight: 20 },
  ],
}

export async function POST() {
  try {
    // Clear existing templates
    await db.template.deleteMany({})

    for (let s = 1; s <= 5; s++) {
      // Training templates
      await db.template.create({
        data: {
          type: 'formacion',
          sStep: s,
          title: `Formación ${S_NAMES[s - 1]} - 5S`,
          description: `Contenido formativo sobre la ${s}ª S: ${S_NAMES[s - 1]}`,
          content: JSON.stringify(TRAINING_CONTENT[s]),
        },
      })

      // Exam templates
      await db.template.create({
        data: {
          type: 'examen',
          sStep: s,
          title: `Examen ${S_NAMES[s - 1]} - 5S`,
          description: `Examen de evaluación sobre ${S_NAMES[s - 1]}`,
          content: JSON.stringify(EXAM_QUESTIONS[s]),
        },
      })

      // Inventory templates
      await db.template.create({
        data: {
          type: 'inventario',
          sStep: s,
          title: `Plantilla Inventario ${S_NAMES[s - 1]}`,
          description: `Plantilla de inventario para ${S_NAMES[s - 1]}`,
          content: JSON.stringify(INVENTORY_TEMPLATES[s]),
        },
      })

      // Self-evaluation templates
      await db.template.create({
        data: {
          type: 'autoevaluacion',
          sStep: s,
          title: `Autoevaluación ${S_NAMES[s - 1]}`,
          description: `Checklist de autoevaluación para ${S_NAMES[s - 1]}`,
          content: JSON.stringify(AUTOEVAL_CHECKLISTS[s]),
        },
      })

      // Audit templates
      await db.template.create({
        data: {
          type: 'auditoria',
          sStep: s,
          title: `Auditoría ${S_NAMES[s - 1]}`,
          description: `Criterios de auditoría para ${S_NAMES[s - 1]}`,
          content: JSON.stringify(AUDIT_TEMPLATES[s]),
        },
      })
    }

    const templates = await db.template.findMany()
    return NextResponse.json({ 
      message: 'Base de datos inicializada correctamente', 
      templatesCreated: templates.length,
      templates 
    })
  } catch (error) {
    console.error('Error seeding database:', error)
    return NextResponse.json({ error: 'Error seeding database' }, { status: 500 })
  }
}
