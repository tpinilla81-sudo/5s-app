import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const S_NAMES = ['Revisar', 'Ordenar', 'Limpiar', 'Estandarizar', 'Mantener']
const S_JAPANESE = ['Seiri', 'Seiton', 'Seiso', 'Seiketsu', 'Shitsuke']

const TRAINING_CONTENT: Record<number, { sections: Array<{ title: string; content: string }> }> = {
  1: {
    sections: [
      { title: '¿Qué es SEIRI (Revisar)?', content: 'Seiri significa clasificar y separar los elementos necesarios de los innecesarios en el lugar de trabajo. El objetivo es eliminar todo lo que no se necesita para realizar el trabajo diario, reduciendo el desorden y liberando espacio útil. Esta es la primera S y la base de todo el método 5S.\n\nSin una clasificación adecuada, es imposible organizar, limpiar o estandarizar eficazmente. Seiri nos enseña a ser selectivos y a cuestionar la necesidad de cada elemento presente en nuestro entorno de trabajo.' },
      { title: 'Identificación de innecesarios', content: 'Para identificar lo innecesario, pregúntate:\n\n• ¿Se ha usado en el último año?\n• ¿Es probable que se use en el futuro?\n• ¿Es reemplazable fácilmente?\n• ¿Existe otro departamento que lo necesite más?\n\nSi la respuesta a la mayoría de estas preguntas es NO, probablemente sea innecesario. Es importante ser riguroso y no guardar cosas "por si acaso".' },
      { title: 'Técnica de las tarjetas rojas', content: 'La técnica de las tarjetas rojas consiste en etiquetar todos los ítems dudosos o innecesarios con una tarjeta roja que incluye:\n\n• Nombre del ítem\n• Razón de la etiqueta (innecesario, dudoso, excesivo)\n• Fecha de etiquetado\n• Decisión propuesta (eliminar, reubicar, vender)\n\nEstos ítems se colocan en un área designada ("zona roja") y se decide su destino en un plazo definido. Esta técnica visual facilita la toma de decisiones y la participación de todo el equipo.' },
    ],
  },
  2: {
    sections: [
      { title: '¿Qué es SEITON (Ordenar)?', content: 'Seiton significa organizar los elementos necesarios de manera que sean fáciles de encontrar, usar y devolver. Cada cosa debe tener un lugar definido y visible, y cada lugar debe tener su cosa.\n\nEl principio fundamental es: un lugar para cada cosa y cada cosa en su lugar. Esto reduce el tiempo de búsqueda, evita errores y facilita la detección de anomalías.' },
      { title: 'Principio de accesibilidad', content: 'Los objetos más usados deben estar más accesibles:\n\n• Uso frecuente: al alcance de la mano\n• Uso ocasional: en lugares cercanos\n• Uso raro: en almacenamiento más lejano\n\nPiensa en la ergonomía: menos movimientos, menos esfuerzo, más eficiencia. Cada segundo counts en la productividad diaria.' },
      { title: 'Visualización y etiquetado', content: 'La visualización permite identificar de un vistazo si algo está en su lugar. Usa:\n\n• Etiquetas con nombres y códigos\n• Contornos en el suelo o paredes\n• Códigos de color por categoría\n• Señales visuales de cantidad mínima/máxima\n• Fotos del estado correcto\n\nLa regla es: cualquiera debería poder encontrar y devolver un objeto en menos de 30 segundos, incluso sin conocer el área.' },
    ],
  },
  3: {
    sections: [
      { title: '¿Qué es SEISO (Limpiar)?', content: 'Seiso significa limpiar el lugar de trabajo de forma exhaustiva, identificando y eliminando las fuentes de suciedad. La limpieza no es solo estética, es una forma de inspección que permite detectar anomalías.\n\nCuando limpiamos, tocamos y observamos cada rincón, lo que nos permite identificar fugas, grietas, desgastes y otros problemas que de otro modo pasarían desapercibidos.' },
      { title: 'Limpieza como inspección', content: 'Al limpiar, se detectan:\n\n• Fugas de aceite, agua o aire\n• Grietas y fisuras en equipos\n• Desgaste anormal de piezas\n• Cables sueltos o pelados\n• Tornillos o tuercas flojos\n\nCada hallazgo debe registrarse y reportarse. La limpieza sistemática es una herramienta de mantenimiento preventivo que puede evitar averías costosas.' },
      { title: 'Plan de limpieza', content: 'Establece un plan de limpieza que defina:\n\n• QUÉ se limpia: zonas, equipos, herramientas\n• QUIÉN limpia: responsables asignados\n• CUÁNDO se limpia: frecuencia (diaria, semanal, mensual)\n• CON QUÉ se limpia: materiales y productos necesarios\n• CÓMO se limpia: procedimientos estándar\n\nCrea mapas de zonas de limpieza y asigna responsabilidades rotativas para fomentar el conocimiento de todas las áreas.' },
    ],
  },
  4: {
    sections: [
      { title: '¿Qué es SEIKETSU (Estandarizar)?', content: 'Seiketsu significa crear estándares y normas que mantengan los logros de las 3S anteriores. Sin estandarización, es fácil volver a los malos hábitos. Los estándares convierten las mejoras en rutina.\n\nUn estándar es la mejor forma conocida de hacer un trabajo. No es permanente ni inamovible: es la base sobre la que se construye la mejora continua.' },
      { title: 'Creación de procedimientos', content: 'Documenta los procedimientos de trabajo incluyendo:\n\n• Pasos secuenciales con fotos\n• Criterios de calidad visual\n• Responsabilidades y frecuencias\n• Materiales y herramientas necesarios\n• Qué hacer si algo no cumple el estándar\n\nAsegúrate de que los estándares sean claros, visibles y fáciles de cumplir por todos. Un estándar que nadie entiende o sigue no es un estándar útil.' },
      { title: 'Gestión visual del estándar', content: 'Usa herramientas visuales para que cualquiera pueda verificar si se cumple el estándar:\n\n• Fotografías del estado correcto en lugar visible\n• Diagramas de ubicación de elementos\n• Checklists de verificación diaria\n• Tableros de control visual\n• Semáforos (verde/amarillo/rojo) de estado\n\nLa gestión visual elimina la necesidad de interpretación subjetiva y permite la autocorrección inmediata.' },
    ],
  },
  5: {
    sections: [
      { title: '¿Qué es SHITSUKE (Mantener)?', content: 'Shitsuke significa crear el hábito de respetar los estándares establecidos. Es la S más difícil porque requiere disciplina y compromiso continuo. Sin mantenimiento, todo el esfuerzo anterior se pierde.\n\nMantener no es solo cumplir reglas, es interiorizar los principios 5S como parte de la cultura diaria. Cuando la disciplina se convierte en hábito, ya no se necesita esfuerzo consciente.' },
      { title: 'Auditorías periódicas', content: 'Realiza auditorías regulares para verificar el cumplimiento:\n\n• Auditorías internas semanales (autoevaluación)\n• Auditorías cruzadas mensuales (entre departamentos)\n• Auditorías externas trimestrales (evaluador independiente)\n\nLas auditorías deben ser objetivas, constructivas y enfocadas en la mejora. No se trata de castigar, sino de identificar oportunidades de mejora y reconocer los avances del equipo.' },
      { title: 'Cultura de mejora continua', content: 'Fomenta una cultura donde todos participen activamente:\n\n• Reconoce los logros y celebra los avances\n• Comparte las mejores prácticas entre departamentos\n• Implementa un sistema de sugerencias de mejora\n• Forma a los nuevos empleados en 5S desde el primer día\n• Establece objetivos y revisa el progreso periódicamente\n\nLa mejora continua es un viaje, no un destino. Cada día podemos hacer algo un poco mejor que ayer.' },
    ],
  },
}

const EXAM_QUESTIONS: Record<number, { questions: Array<{ question: string; options: string[]; correctIndex: number }> }> = {
  1: {
    questions: [
      { question: '¿Qué significa Seiri?', options: ['Ordenar', 'Clasificar y eliminar innecesarios', 'Limpiar', 'Estandarizar'], correctIndex: 1 },
      { question: '¿Para qué sirve la técnica de las tarjetas rojas?', options: ['Para decorar', 'Para etiquetar ítems innecesarios o dudosos', 'Para señalizar salidas', 'Para identificar peligros'], correctIndex: 1 },
      { question: '¿Cuál es la pregunta clave al clasificar?', options: ['¿Cuánto cuesta?', '¿Es nuevo?', '¿Se ha usado en el último año?', '¿De quién es?'], correctIndex: 2 },
      { question: '¿Qué se hace con los ítems innecesarios?', options: ['Guardarlos', 'Eliminarlos o reubicarlos', 'Venderlos siempre', 'Ignorarlos'], correctIndex: 1 },
      { question: '¿Cuál es el beneficio principal de Seiri?', options: ['Gastar más', 'Reducir desorden y liberar espacio', 'Comprar más cosas', 'No hay beneficio'], correctIndex: 1 },
    ],
  },
  2: {
    questions: [
      { question: '¿Qué significa Seiton?', options: ['Limpiar', 'Organizar para fácil acceso', 'Eliminar', 'Auditar'], correctIndex: 1 },
      { question: '¿Dónde deben ubicarse los objetos de uso frecuente?', options: ['En el almacén', 'Al alcance de la mano', 'En la estantería alta', 'En otro departamento'], correctIndex: 1 },
      { question: '¿Qué técnica ayuda a identificar si algo está en su lugar?', options: ['Memorización', 'Visualización y etiquetado', 'Adivinación', 'Preguntar al jefe'], correctIndex: 1 },
      { question: '¿Cuál es el principio de Seiton?', options: ['Cada cosa en cualquier sitio', 'Cada cosa en su sitio, un sitio para cada cosa', 'Todo junto', 'Ninguno'], correctIndex: 1 },
      { question: '¿En cuánto tiempo debería poder encontrar cualquier herramienta?', options: ['5 minutos', 'Menos de 30 segundos', '1 hora', 'No hay límite'], correctIndex: 1 },
    ],
  },
  3: {
    questions: [
      { question: '¿Qué significa Seiso?', options: ['Ordenar', 'Limpiar e inspeccionar', 'Clasificar', 'Mantener'], correctIndex: 1 },
      { question: '¿Qué se detecta al limpiar?', options: ['Solo polvo', 'Fugas, grietas y desgastes', 'Nada importante', 'Solo cosas perdidas'], correctIndex: 1 },
      { question: '¿Qué debe incluir un plan de limpieza?', options: ['Solo qué limpiar', 'Qué, quién, cuándo y con qué', 'Solo quién limpia', 'Solo el horario'], correctIndex: 1 },
      { question: 'La limpieza es una forma de:', options: ['Ejercicio físico', 'Inspección y mantenimiento preventivo', 'Perder tiempo', 'Castigo'], correctIndex: 1 },
      { question: '¿Qué debe eliminarse además de la suciedad?', options: ['Solo lo visible', 'La fuente raíz del problema', 'Todo', 'Nada'], correctIndex: 1 },
    ],
  },
  4: {
    questions: [
      { question: '¿Qué significa Seiketsu?', options: ['Limpiar', 'Estandarizar y crear normas', 'Clasificar', 'Auditar'], correctIndex: 1 },
      { question: '¿Por qué es importante estandarizar?', options: ['Para que todo sea aburrido', 'Para mantener los logros de las 3S anteriores', 'Para gastar dinero', 'No es importante'], correctIndex: 1 },
      { question: '¿Qué herramienta ayuda a verificar el estándar?', options: ['La memoria', 'Gestión visual y fotografías', 'La intuición', 'La suerte'], correctIndex: 1 },
      { question: '¿Qué pasa sin estandarización?', options: ['Nada', 'Se vuelve a los malos hábitos', 'Mejora solo', 'Todo funciona igual'], correctIndex: 1 },
      { question: 'Un estándar es:', options: ['Algo fijo para siempre', 'La mejor forma conocida de hacer un trabajo', 'Una sugerencia opcional', 'Un documento sin valor'], correctIndex: 1 },
    ],
  },
  5: {
    questions: [
      { question: '¿Qué significa Shitsuke?', options: ['Limpiar', 'Mantener la disciplina y los hábitos', 'Clasificar', 'Ordenar'], correctIndex: 1 },
      { question: '¿Cuál es la S más difícil de mantener?', options: ['Seiri', 'Shitsuke (Mantener)', 'Seiso', 'Seiton'], correctIndex: 1 },
      { question: '¿Cómo se mantiene la disciplina 5S?', options: ['Con auditorías periódicas', 'Con suerte', 'Ignorando problemas', 'Cambiando reglas cada día'], correctIndex: 0 },
      { question: '¿Qué se debe hacer con los resultados de auditorías?', options: ['Ignorarlos', 'Usarlos para mejora continua', 'Esconderlos', 'Quejarse'], correctIndex: 1 },
      { question: '¿Cómo se fomenta la cultura 5S?', options: ['Castigando errores', 'Reconociendo logros y compartiendo buenas prácticas', 'Ignorando avances', 'Solo con dinero'], correctIndex: 1 },
    ],
  },
}

const INVENTORY_TEMPLATES: Record<number, { items: Array<{ name: string; location: string; category: string; quantity: number; action: string }> }> = {
  1: {
    items: [
      { name: 'Herramientas rotas', location: 'Taller principal', category: 'innecesario', quantity: 3, action: 'Eliminar' },
      { name: 'Material de oficina obsoleto', location: 'Oficina', category: 'innecesario', quantity: 10, action: 'Reciclar' },
      { name: 'Piezas de repuesto activas', location: 'Almacén A', category: 'util', quantity: 25, action: 'Mantener organizado' },
      { name: 'Documentación antigua', location: 'Archivo', category: 'dudoso', quantity: 50, action: 'Revisar y digitalizar' },
      { name: 'Equipos en desuso', location: 'Nave 2', category: 'innecesario', quantity: 2, action: 'Vender o donar' },
    ],
  },
  2: {
    items: [
      { name: 'Caja de herramientas', location: 'Puesto de trabajo 1', category: 'util', quantity: 1, action: 'Asignar ubicación fija' },
      { name: 'Carro de transporte', location: 'Pasillo B', category: 'util', quantity: 2, action: 'Zona marcada en suelo' },
      { name: 'Extintores', location: 'Varios puntos', category: 'util', quantity: 4, action: 'Señalizar ubicación' },
      { name: 'Palets vacíos', location: 'Zona de carga', category: 'dudoso', quantity: 8, action: 'Definir zona temporal' },
      { name: 'Contenedores de residuos', location: 'Salida trasera', category: 'util', quantity: 3, action: 'Codificar por color' },
    ],
  },
  3: {
    items: [
      { name: 'Kit de limpieza básico', location: 'Carro de limpieza', category: 'util', quantity: 2, action: 'Reponer semanalmente' },
      { name: 'Productos químicos caducados', location: 'Almacén productos', category: 'innecesario', quantity: 5, action: 'Retirar y gestionar residuo' },
      { name: 'Bayetas y trapos', location: 'Armario limpieza', category: 'util', quantity: 20, action: 'Renovar mensualmente' },
      { name: 'Aspiradora industrial', location: 'Sala máquinas', category: 'util', quantity: 1, action: 'Mantenimiento trimestral' },
      { name: 'Escobas desgastadas', location: 'Armario limpieza', category: 'innecesario', quantity: 4, action: 'Reemplazar' },
    ],
  },
  4: {
    items: [
      { name: 'Procedimientos de trabajo', location: 'Tablón oficina', category: 'util', quantity: 12, action: 'Actualizar y digitalizar' },
      { name: 'Fichas de control antiguas', location: 'Archivo', category: 'innecesario', quantity: 200, action: 'Digitalizar y eliminar papel' },
      { name: 'Señales de seguridad', location: 'Taller', category: 'util', quantity: 8, action: 'Verificar visibilidad' },
      { name: 'Manuales de equipo obsoletos', location: 'Oficina técnica', category: 'innecesario', quantity: 6, action: 'Actualizar versión' },
      { name: 'Checklists de limpieza', location: 'Carro limpieza', category: 'util', quantity: 5, action: 'Revisar contenido' },
    ],
  },
  5: {
    items: [
      { name: 'Registro de auditorías', location: 'Oficina calidad', category: 'util', quantity: 24, action: 'Mantener actualizado' },
      { name: 'Plan de formación 5S', location: 'RRHH', category: 'util', quantity: 1, action: 'Ejecutar según calendario' },
      { name: 'Actas de reuniones antiguas', location: 'Archivo', category: 'dudoso', quantity: 36, action: 'Evaluar si conservar' },
      { name: 'Panel de indicadores 5S', location: 'Entrada taller', category: 'util', quantity: 1, action: 'Actualizar semanalmente' },
      { name: 'Normativas sin difundir', location: 'Oficina', category: 'dudoso', quantity: 15, action: 'Comunicar al equipo' },
    ],
  },
}

const AUTOEVAL_CHECKLISTS: Record<number, { items: Array<{ description: string; maxScore: number }> }> = {
  1: {
    items: [
      { description: 'Se han identificado y etiquetado todos los ítems innecesarios', maxScore: 5 },
      { description: 'Se ha eliminado al menos el 80% de los ítems innecesarios', maxScore: 5 },
      { description: 'El área de trabajo está libre de objetos sin uso', maxScore: 5 },
      { description: 'Se ha definido el área de ítems dudosos con plazo de decisión', maxScore: 5 },
      { description: 'Los empleados conocen y aplican el criterio de clasificación', maxScore: 5 },
    ],
  },
  2: {
    items: [
      { description: 'Cada herramienta tiene su ubicación marcada y visible', maxScore: 5 },
      { description: 'Los objetos más usados están al alcance de la mano', maxScore: 5 },
      { description: 'Se usan códigos de color y etiquetas para identificar ubicaciones', maxScore: 5 },
      { description: 'Se puede encontrar cualquier herramienta en menos de 30 segundos', maxScore: 5 },
      { description: 'Todos los empleados conocen la ubicación de los elementos', maxScore: 5 },
    ],
  },
  3: {
    items: [
      { description: 'Todas las superficies están limpias y libres de polvo', maxScore: 5 },
      { description: 'Se ha identificado y eliminado la fuente de suciedad', maxScore: 5 },
      { description: 'Existe un plan de limpieza asignado por zonas', maxScore: 5 },
      { description: 'Los equipos están limpios y en buen estado visible', maxScore: 5 },
      { description: 'Se dispone de materiales de limpieza adecuados', maxScore: 5 },
    ],
  },
  4: {
    items: [
      { description: 'Los procedimientos están documentados y accesibles', maxScore: 5 },
      { description: 'Existen fotos del estado estándar en lugar visible', maxScore: 5 },
      { description: 'Los estándares son conocidos por todos los empleados', maxScore: 5 },
      { description: 'Se usan checklists para verificar el cumplimiento', maxScore: 5 },
      { description: 'Las desviaciones se corrigen de forma sistemática', maxScore: 5 },
    ],
  },
  5: {
    items: [
      { description: 'Se realizan auditorías periódicas (al menos mensuales)', maxScore: 5 },
      { description: 'Los resultados de auditoría se comunican a todo el equipo', maxScore: 5 },
      { description: 'Se reconocen y celebran los logros del equipo', maxScore: 5 },
      { description: 'Los nuevos empleados reciben formación 5S', maxScore: 5 },
      { description: 'Existe un sistema de sugerencias de mejora activo', maxScore: 5 },
    ],
  },
}

const AUDIT_TEMPLATES: Record<number, { criteria: Array<{ criterion: string; weight: number }> }> = {
  1: {
    criteria: [
      { criterion: 'Ausencia de ítems innecesarios en el área de trabajo', weight: 25 },
      { criterion: 'Uso efectivo de la técnica de tarjetas rojas', weight: 20 },
      { criterion: 'Definición clara de ítems necesarios vs innecesarios', weight: 20 },
      { criterion: 'Participación del personal en la clasificación', weight: 15 },
      { criterion: 'Documentación de decisiones tomadas', weight: 20 },
    ],
  },
  2: {
    criteria: [
      { criterion: 'Ubicaciones marcadas y visibles para todos los elementos', weight: 25 },
      { criterion: 'Tiempo de localización de herramientas < 30 segundos', weight: 20 },
      { criterion: 'Uso de códigos de color y señalización visual', weight: 20 },
      { criterion: 'Accesibilidad de objetos según frecuencia de uso', weight: 15 },
      { criterion: 'Conocimiento del personal sobre ubicaciones', weight: 20 },
    ],
  },
  3: {
    criteria: [
      { criterion: 'Nivel de limpieza general del área', weight: 25 },
      { criterion: 'Identificación y eliminación de fuentes de suciedad', weight: 20 },
      { criterion: 'Cumplimiento del plan de limpieza', weight: 20 },
      { criterion: 'Disponibilidad de materiales de limpieza', weight: 15 },
      { criterion: 'Integración limpieza-inspección', weight: 20 },
    ],
  },
  4: {
    criteria: [
      { criterion: 'Documentación actualizada de procedimientos', weight: 25 },
      { criterion: 'Gestión visual efectiva (fotos, checklists, señales)', weight: 20 },
      { criterion: 'Conocimiento del personal sobre estándares', weight: 20 },
      { criterion: 'Sistema de corrección de desviaciones', weight: 15 },
      { criterion: 'Revisión periódica de estándares', weight: 20 },
    ],
  },
  5: {
    criteria: [
      { criterion: 'Programa de auditorías implementado', weight: 25 },
      { criterion: 'Comunicación de resultados al equipo', weight: 20 },
      { criterion: 'Sistema de reconocimiento de logros', weight: 20 },
      { criterion: 'Formación continua de nuevos empleados', weight: 15 },
      { criterion: 'Cultura de mejora continua visible', weight: 20 },
    ],
  },
}

export async function POST() {
  try {
    // Try to clear existing templates (ignore errors on empty db)
    try {
      await db.template.deleteMany({})
    } catch {
      // Ignore delete errors
    }
    // Try to clear existing progress
    try {
      await db.progress.deleteMany({})
    } catch {
      // Ignore delete errors
    }

    for (let s = 1; s <= 5; s++) {
      // Training templates
      await db.template.create({
        data: {
          type: 'formacion',
          sStep: s,
          title: `Formación ${S_NAMES[s - 1]} - 5S`,
          description: `Contenido formativo sobre la ${s}ª S: ${S_NAMES[s - 1]} (${S_JAPANESE[s - 1]})`,
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

    // Create 25 progress records (5 S × 5 mini-steps) for each project
    const projects = await db.project.findMany()
    const projectIds = projects.length > 0 ? projects.map(p => p.id) : ['default']

    for (const projectId of projectIds) {
      for (let s = 1; s <= 5; s++) {
        for (let m = 1; m <= 5; m++) {
          await db.progress.upsert({
            where: { sStep_miniStep_projectId: { sStep: s, miniStep: m, projectId } },
            create: { sStep: s, miniStep: m, completed: false, score: null, projectId },
            update: { completed: false, score: null },
          })
        }
      }
    }

    const templates = await db.template.findMany()
    const progressCount = await db.progress.count()
    return NextResponse.json({
      success: true,
      data: {
        message: 'Base de datos inicializada correctamente',
        templatesCreated: templates.length,
        progressRecords: progressCount,
      },
    })
  } catch (error) {
    console.error('Error seeding database:', error)
    return NextResponse.json({ success: false, error: 'Error seeding database' }, { status: 500 })
  }
}
