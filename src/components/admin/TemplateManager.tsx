'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { use5SStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Plus, Trash2, Edit3, Save, Loader2, BookOpen, FileCheck, ClipboardCheck, Camera,
  ChevronDown, ChevronUp, AlertTriangle, Copy, RotateCcw, X,
  Eye, Code, GripVertical, Download, Upload, ClipboardList, Award,

} from 'lucide-react'
import { S_STEPS, AUDIT_CHECKLISTS, EXAM_PASS_THRESHOLD, SELF_EVAL_THRESHOLD, AUDIT_PASS_THRESHOLD, INVENTORY_CONFIGS } from '@/lib/5s-constants'

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════
interface TemplateData {
  id: string
  type: string
  sStep: number
  miniStep: number
  title: string
  description: string | null
  content: string
  notaMinima: number | null
  active: boolean
  createdAt: string
  updatedAt: string
}

type TemplateTab = 'formacion' | 'fotos' | 'inventarios' | 'estandares' | 'auditoria_interna' | 'auditoria_externa'

const TEMPLATE_TABS: { key: TemplateTab; label: string; icon: React.ComponentType<{ className?: string }>; types: string[] }[] = [
  { key: 'formacion', label: 'Formación y Exámenes', icon: BookOpen, types: ['formacion', 'examen'] },
  { key: 'fotos', label: 'Fotografías (Paso 2)', icon: Camera, types: ['fotos'] },
  { key: 'inventarios', label: 'Inventarios (Paso 3)', icon: ClipboardList, types: ['inventario'] },
  { key: 'estandares', label: 'Estándares (Paso 3)', icon: Award, types: ['estandar'] },
  { key: 'auditoria_interna', label: 'Auditorías Internas (Paso 4)', icon: ClipboardCheck, types: ['autoevaluacion'] },
  { key: 'auditoria_externa', label: 'Auditorías Externas (Paso 5)', icon: FileCheck, types: ['auditoria'] },
]

const S_COLORS: Record<number, string> = { 1: '#8B5CF6', 2: '#EAB308', 3: '#3B82F6', 4: '#F43F5E', 5: '#22C55E' }

const MINI_STEPS_LABELS: Record<number, string> = {
  1: 'Formación y Exámenes',
  2: 'Plan de Acción',
  3: 'Inventario / Estándar',
  4: 'Autoevaluación',
  5: 'Auditoría',
}

// ═══════════════════════════════════════════════════════
// DEFAULT CONTENT GENERATORS
// ═══════════════════════════════════════════════════════
function getDefaultFormationContent(sStep: number) {
  const formations: Record<number, { sections: { title: string; content: string }[] }> = {
    1: {
      sections: [
        { title: '¿Qué es Seiri (Clasificar)?', content: 'Seiri es la primera de las 5S y significa "clasificar" o "separar". Consiste en identificar y separar los elementos necesarios de los innecesarios en el lugar de trabajo, eliminando todo aquello que no se utiliza o que no aporta valor al proceso. El objetivo es crear un entorno de trabajo más limpio, seguro y eficiente, donde solo permanezcan los elementos esenciales para realizar las tareas diarias.' },
        { title: 'Objetivos de Seiri', content: '1. Eliminar del área de trabajo los elementos innecesarios que ocupan espacio y generan desorden.\n2. Liberar espacio útil para mejorar la organización y el flujo de trabajo.\n3. Reducir el tiempo de búsqueda de herramientas, materiales y documentos.\n4. Prevenir accidentes y errores causados por la acumulación de objetos innecesarios.\n5. Facilitar la identificación visual de los recursos realmente necesarios.' },
        { title: 'Metodología de implementación', content: '1. Recorrer el área de trabajo y clasificar todos los elementos en necesarios e innecesarios.\n2. Utilizar tarjetas de color rojo (Tarjetas Rojas) para marcar los elementos innecesarios.\n3. Colocar los elementos marcados en una "jaula de innecesarios" o zona temporal.\n4. Decidir el destino de cada elemento: eliminar, trasladar, donar o almacenar fuera del área.\n5. Documentar todas las decisiones y mantener un registro de los elementos retirados.\n6. Revisar periódicamente para evitar la acumulación de nuevos innecesarios.' },
        { title: 'Beneficios esperados', content: 'Al aplicar correctamente Seiri se obtienen beneficios como: mayor espacio disponible en el lugar de trabajo, reducción del tiempo perdido buscando elementos, disminución de accidentes por acumulación, mejora de la productividad al eliminar distracciones, y una cultura de orden y limpieza que se extiende a todas las áreas de la organización.' },
      ]
    },
    2: {
      sections: [
        { title: '¿Qué es Seiton (Organizar)?', content: 'Seiton es la segunda de las 5S y significa "organizar" o "ordenar". Consiste en establecer una ubicación definida para cada elemento necesario, de forma que sea fácil de encontrar, usar y devolver a su lugar. Seiton aplica el principio de "un lugar para cada cosa y cada cosa en su lugar", utilizando señalización visual, códigos de color y etiquetas para garantizar que cualquier persona pueda localizar y devolver los objetos de forma intuitiva.' },
        { title: 'Objetivos de Seiton', content: '1. Asignar una ubicación fija y lógica a cada elemento necesario del lugar de trabajo.\n2. Facilitar la localización rápida de herramientas, materiales y documentos.\n3. Garantizar que cualquier persona pueda encontrar y devolver los objetos sin necesidad de preguntar.\n4. Reducir el tiempo de preparación y cambio de herramientas.\n5. Implementar señalización visual y códigos de color para una identificación inmediata.' },
        { title: 'Metodología de implementación', content: '1. Analizar la frecuencia de uso de cada elemento: muy frecuente (cerca del puesto), frecuente (zona accesible), ocasional (almacén cercano) y raro (almacén lejano).\n2. Definir la ubicación óptima según la cercanía al punto de uso y la ergonomía.\n3. Implementar métodos de identificación: etiquetas, códigos de color, señales visuales, sombras, soportes.\n4. Crear un layout o distribución visual del área de trabajo.\n5. Señalizar pasillos, zonas de almacenamiento y ubicaciones específicas.\n6. Establecer reglas claras para la devolución de elementos a su ubicación.' },
        { title: 'Beneficios esperados', content: 'Los beneficios de aplicar Seiton incluyen: eliminación del tiempo perdido buscando herramientas o materiales, reducción de errores por confusión de elementos, mejora de la seguridad al tener pasillos despejados y zonas señalizadas, aumento de la eficiencia operativa, y una comunicación visual que permite detectar anomalías de forma inmediata.' },
      ]
    },
    3: {
      sections: [
        { title: '¿Qué es Seiso (Limpiar)?', content: 'Seiso es la tercera de las 5S y significa "limpiar" o "brillar". Va más allá de la simple limpieza: consiste en inspeccionar el lugar de trabajo mientras se limpia, identificando las fuentes de suciedad, las anomalías y los defectos. Seiso convierte la limpieza en una actividad de mantenimiento preventivo, donde cada persona es responsable de mantener su zona limpia y en condiciones óptimas.' },
        { title: 'Objetivos de Seiso', content: '1. Mantener el lugar de trabajo limpio y en condiciones óptimas de funcionamiento.\n2. Identificar y eliminar las fuentes de suciedad en su origen.\n3. Detectar anomalías, fugas, desgastes y defectos durante la limpieza.\n4. Establecer un plan de limpieza regular con responsables y frecuencias definidas.\n5. Crear el hábito de limpieza como parte de la rutina diaria de trabajo.' },
        { title: 'Metodología de implementación', content: '1. Realizar un inventario de puntos de suciedad: polvo, grasa, manchas, residuos, humedad, oxidación.\n2. Clasificar cada punto por nivel (leve, moderado, grave) y fuente (proceso, medio ambiente, falta de limpieza, escape, desgaste, derrame).\n3. Definir el método de limpieza adecuado para cada tipo de suciedad: aspirado, fregado, pulido, desinfección, reparación.\n4. Asignar frecuencias de limpieza: diaria, 3 veces por semana, semanal, quincenal, mensual.\n5. Crear un mapa de puntos de suciedad con responsables y plan de limpieza.\n6. Establecer un kit de limpieza accesible en cada zona.' },
        { title: 'Beneficios esperados', content: 'Aplicar Seiso aporta beneficios como: detección temprana de fallos y fugas, reducción de accidentes por suciedad, mejora de la calidad del producto al evitar contaminación, aumento de la vida útil de los equipos, y un entorno de trabajo más agradable y motivador para los empleados.' },
      ]
    },
    4: {
      sections: [
        { title: '¿Qué es Seiketsu (Estandarizar)?', content: 'Seiketsu es la cuarta de las 5S y significa "estandarizar" o "mantener el estado". Consiste en crear estándares, normas y procedimientos que mantengan los logros obtenidos con las 3S anteriores (Seiri, Seiton, Seiso). Seiketsu asegura que las mejoras no se pierdan con el tiempo y que todos los empleados sigan los mismos criterios de orden, organización y limpieza.' },
        { title: 'Objetivos de Seiketsu', content: '1. Crear estándares visuales y documentados para mantener los logros de las 3S.\n2. Establecer procedimientos claros que cualquier persona pueda seguir.\n3. Prevenir la reaparición de problemas ya resueltos.\n4. Implantar instrucciones visuales, diagramas y señalización permanente.\n5. Definir indicadores visuales que permitan detectar desviaciones de forma inmediata.' },
        { title: 'Metodología de implementación', content: '1. Documentar las mejores prácticas identificadas en las 3S anteriores.\n2. Crear estándares visuales: fotografías del estado correcto, diagramas de ubicación, etiquetas de identificación.\n3. Establecer procedimientos de inspección y mantenimiento con frecuencia y responsable.\n4. Implantar checklist de verificación diaria o semanal.\n5. Definir indicadores visuales de estado (semáforos, marcas de nivel, contornos).\n6. Revisar y actualizar los estándares periódicamente.' },
        { title: 'Beneficios esperados', content: 'Los beneficios de Seiketsu incluyen: consolidación de las mejoras de las 3S anteriores, reducción de la variabilidad en los procesos, facilitación de la formación de nuevos empleados, detección rápida de desviaciones, y creación de una base sólida para la mejora continua.' },
      ]
    },
    5: {
      sections: [
        { title: '¿Qué es Shitsuke (Disciplina)?', content: 'Shitsuke es la quinta y última de las 5S y significa "disciplina" o "sostener". Consiste en crear el hábito de respetar y cumplir los estándares establecidos en las 4S anteriores, de forma voluntaria y constante. Shitsuke transforma las normas en costumbres, asegurando que el orden, la organización, la limpieza y la estandarización se mantengan en el tiempo sin necesidad de supervisión constante.' },
        { title: 'Objetivos de Shitsuke', content: '1. Convertir el cumplimiento de los estándares en un hábito diario.\n2. Fomentar la autodisciplina y el compromiso personal con las 5S.\n3. Establecer mecanismos de seguimiento: auditorías internas y externas.\n4. Gestionar las anomalías detectadas y resolverlas de forma sistemática.\n5. Promover la mejora continua como filosofía de trabajo.' },
        { title: 'Metodología de implementación', content: '1. Realizar auditorías internas (autoevaluación) periódicas para verificar el cumplimiento de los estándares.\n2. Realizar auditorías externas con evaluadores independientes para objetividad.\n3. Registrar y gestionar las anomalías detectadas durante las auditorías.\n4. Establecer planes de acción correctiva con responsable y fecha límite.\n5. Comunicar los resultados de las auditorías a todo el equipo.\n6. Reconocer y premiar a los equipos que mantienen altos niveles de cumplimiento.' },
        { title: 'Beneficios esperados', content: 'Aplicar Shitsuke genera beneficios como: mantenimiento sostenido de las 5S en el tiempo, mejora continua de los procesos, mayor compromiso y motivación del personal, reducción de recaídas y problemas recurrentes, y una cultura de calidad que se extiende a todos los niveles de la organización.' },
      ]
    },
  }
  return formations[sStep] || formations[1]
}

function getDefaultExamContent(sStep: number) {
  const exams: Record<number, { questions: { question: string; options: string[]; correctIndex: number }[] }> = {
    1: {
      questions: [
        { question: '¿Cuál es el objetivo principal de Seiri (Clasificar)?', options: ['Separar lo necesario de lo innecesario', 'Organizar los elementos por tamaño', 'Limpiar las máquinas', 'Crear estándares visuales'], correctIndex: 0 },
        { question: '¿Qué herramienta se utiliza en Seiri para marcar los elementos innecesarios?', options: ['Etiqueta verde', 'Tarjeta roja', 'Código de barras', 'Señal de tráfico'], correctIndex: 1 },
        { question: '¿Dónde se colocan temporalmente los elementos marcados como innecesarios?', options: ['En el almacén principal', 'En la jaula de innecesarios', 'En la mesa del responsable', 'En el pasillo'], correctIndex: 1 },
        { question: '¿Cuál es un beneficio de aplicar Seiri correctamente?', options: ['Aumentar el número de herramientas', 'Liberar espacio útil en el área de trabajo', 'Crear más documentos', 'Añadir más pasos al proceso'], correctIndex: 1 },
        { question: '¿Qué decisión NO se puede tomar sobre un elemento innecesario?', options: ['Eliminarlo', 'Trasladarlo a otra zona', 'Dejarlo donde está sin más', 'Donarlo o almacenarlo fuera del área'], correctIndex: 2 },
        { question: '¿Cada cuánto se debe revisar el área para evitar acumulación de innecesarios?', options: ['Solo al inicio del proyecto', 'Una vez al año', 'Periódicamente de forma regular', 'Nunca, solo una vez'], correctIndex: 2 },
        { question: '¿Qué tipo de elementos se deben eliminar en Seiri?', options: ['Los que se usan diariamente', 'Los que no se utilizan o no aportan valor', 'Los más caros', 'Los que tienen etiqueta'], correctIndex: 1 },
        { question: '¿Quién debe participar en el proceso de clasificación de Seiri?', options: ['Solo el responsable del área', 'Solo el jefe de producción', 'Todas las personas que trabajan en el área', 'Solo el equipo de mantenimiento'], correctIndex: 2 },
      ]
    },
    2: {
      questions: [
        { question: '¿Cuál es el objetivo principal de Seiton (Organizar)?', options: ['Eliminar innecesarios', 'Asignar una ubicación definida a cada elemento necesario', 'Limpiar los equipos', 'Auditar el proceso'], correctIndex: 1 },
        { question: '¿Qué principio fundamental aplica Seiton?', options: ['Más es mejor', 'Un lugar para cada cosa y cada cosa en su lugar', 'Todo en una sola estantería', 'Guardar todo en cajas cerradas'], correctIndex: 1 },
        { question: '¿Dónde se deben ubicar los elementos de uso muy frecuente?', options: ['En el almacén lejano', 'Cerca del puesto de trabajo', 'En el suelo del pasillo', 'En la oficina del jefe'], correctIndex: 1 },
        { question: '¿Cuál de estos NO es un método de identificación visual en Seiton?', options: ['Etiquetas', 'Código de colores', 'Memorizar la ubicación', 'Sombras y siluetas'], correctIndex: 2 },
        { question: '¿Qué es un layout en el contexto de Seiton?', options: ['Un tipo de herramienta', 'Una distribución visual del área de trabajo', 'Un informe de auditoría', 'Un código de barras'], correctIndex: 1 },
        { question: '¿Qué se debe hacer después de usar una herramienta según Seiton?', options: ['Dejarla donde se usó', 'Devolverla a su ubicación asignada', 'Pasarla al compañero', 'Guardarla en un cajón cualquiera'], correctIndex: 1 },
        { question: '¿Cómo se clasifica la frecuencia de uso en Seiton?', options: ['Barato y caro', 'Muy frecuente, frecuente, ocasional y raro', 'Grande y pequeño', 'Nuevo y viejo'], correctIndex: 1 },
        { question: '¿Qué beneficio aporta la señalización visual en Seiton?', options: ['Decorar el lugar de trabajo', 'Permitir detectar anomalías de forma inmediata', 'Aumentar el presupuesto', 'Reducir el número de herramientas'], correctIndex: 1 },
      ]
    },
    3: {
      questions: [
        { question: '¿Cuál es el objetivo principal de Seiso (Limpiar)?', options: ['Hacer que todo brille', 'Inspeccionar mientras se limpia, identificando anomalías y fuentes de suciedad', 'Pintar las paredes', 'Comprar productos de limpieza'], correctIndex: 1 },
        { question: '¿En qué se diferencia Seiso de una limpieza normal?', options: ['En que se usa más agua', 'En que convierte la limpieza en mantenimiento preventivo', 'En que solo la hace el equipo de limpieza', 'En que se hace una vez al año'], correctIndex: 1 },
        { question: '¿Qué tipos de suciedad se deben inventariar en Seiso?', options: ['Solo polvo', 'Polvo, grasa, manchas, residuos, humedad y oxidación', 'Solo grasa', 'Solo restos de comida'], correctIndex: 1 },
        { question: '¿Quién es responsable de la limpieza en Seiso?', options: ['Solo el equipo de limpieza', 'Solo el encargado', 'Cada persona en su zona de trabajo', 'El departamento de calidad'], correctIndex: 2 },
        { question: '¿Qué se debe hacer al detectar una fuga durante la limpieza?', options: ['Ignorarla y seguir limpiando', 'Identificarla como fuente de suciedad y reportarla', 'Taparla con cinta', 'Esperar a que se seque sola'], correctIndex: 1 },
        { question: '¿Qué es un mapa de puntos de suciedad?', options: ['Un mapa del mundo', 'Una representación visual de las zonas con suciedad y sus características', 'Un plano del edificio', 'Un calendario de limpieza'], correctIndex: 1 },
        { question: '¿Qué frecuencia de limpieza se recomienda para zonas de alto tráfico?', options: ['Mensual', 'Diaria o varias veces por semana', 'Anual', 'Solo cuando está muy sucio'], correctIndex: 1 },
        { question: '¿Qué debe contener un kit de limpieza según Seiso?', options: ['Solo una escoba', 'Los productos y herramientas necesarios para la limpieza de la zona', 'Documentos de calidad', 'Herramientas de producción'], correctIndex: 1 },
      ]
    },
    4: {
      questions: [
        { question: '¿Cuál es el objetivo principal de Seiketsu (Estandarizar)?', options: ['Limpiar más rápido', 'Crear estándares que mantengan los logros de las 3S anteriores', 'Eliminar más innecesarios', 'Organizar mejor las herramientas'], correctIndex: 1 },
        { question: '¿Qué tipo de estándares se crean en Seiketsu?', options: ['Solo escritos en papel', 'Visuales y documentados: fotos, diagramas, señalización, procedimientos', 'Solo verbales', 'Solo para directivos'], correctIndex: 1 },
        { question: '¿Para qué sirven los indicadores visuales en Seiketsu?', options: ['Para decorar', 'Para detectar desviaciones del estándar de forma inmediata', 'Para contar herramientas', 'Para medir la temperatura'], correctIndex: 1 },
        { question: '¿Cuál es un ejemplo de estándar visual?', options: ['Un correo electrónico', 'Una fotografía del estado correcto de una zona', 'Una reunión verbal', 'Un memorándum interno'], correctIndex: 1 },
        { question: '¿Qué es un checklist de verificación en Seiketsu?', options: ['Una lista de compras', 'Una lista de comprobación diaria o semanal del cumplimiento de estándares', 'Un inventario de herramientas', 'Un parte de trabajo'], correctIndex: 1 },
        { question: '¿Con qué frecuencia se deben revisar los estándares?', options: ['Nunca, una vez creados son fijos', 'Periódicamente para actualizarlos y mejorarlos', 'Solo cuando hay auditoría', 'Solo si hay queja del cliente'], correctIndex: 1 },
        { question: '¿Qué S anteriores sostiene Seiketsu?', options: ['Solo Seiri', 'Solo Seiton', 'Seiri, Seiton y Seiso (las 3S anteriores)', 'Ninguna'], correctIndex: 2 },
        { question: '¿Por qué es importante documentar las mejores prácticas?', options: ['Por requisito legal', 'Para que los nuevos empleados puedan seguirlas y no se pierdan las mejoras', 'Para tener más papeleo', 'Porque lo dice el jefe'], correctIndex: 1 },
      ]
    },
    5: {
      questions: [
        { question: '¿Cuál es el objetivo principal de Shitsuke (Disciplina)?', options: ['Crear más normas', 'Crear el hábito de respetar los estándares de forma voluntaria y constante', 'Poner multas a los empleados', 'Hacer auditorías puntuales'], correctIndex: 1 },
        { question: '¿Qué tipo de auditorías se realizan en Shitsuke?', options: ['Solo financieras', 'Internas (autoevaluación) y externas (evaluadores independientes)', 'Solo de producto', 'Solo de seguridad'], correctIndex: 1 },
        { question: '¿Qué se debe hacer al detectar una anomalía en una auditoría?', options: ['Ignorarla', 'Registrarla y crear un plan de acción correctiva con responsable y fecha', 'Esperar a la próxima auditoría', 'Solo informar verbalmente'], correctIndex: 1 },
        { question: '¿Qué convierte Shitsuke en hábito?', options: ['La supervisión constante', 'El cumplimiento voluntario y constante de los estándares', 'Las sanciones económicas', 'Los castigos'], correctIndex: 1 },
        { question: '¿Por qué es importante comunicar los resultados de las auditorías?', options: ['Para señalar culpables', 'Para que todo el equipo conozca el estado y participe en la mejora', 'Para archivarlos', 'Porque es obligatorio legalmente'], correctIndex: 1 },
        { question: '¿Cuál es la última etapa del ciclo de mejora continua en 5S?', options: ['Seiri', 'Shitsuke (que a su vez reinicia el ciclo)', 'Seiton', 'Seiso'], correctIndex: 1 },
        { question: '¿Qué papel tiene el reconocimiento en Shitsuke?', options: ['No tiene ningún papel', 'Motiva al equipo a mantener altos niveles de cumplimiento', 'Genera competencia negativa', 'Solo es para directivos'], correctIndex: 1 },
        { question: '¿Qué sucede si no se aplica Shitsuke correctamente?', options: ['Nada, las 4S se mantienen solas', 'Las mejoras de las 4S anteriores se pierden con el tiempo', 'Se ahorra tiempo', 'Se reducen costes'], correctIndex: 1 },
      ]
    },
  }
  return exams[sStep] || exams[1]
}

function getDefaultChecklistContent(sStep: number) {
  const checklist = AUDIT_CHECKLISTS[sStep]
  if (!checklist) return { sections: [] }
  return {
    sections: checklist.map(section => ({
      id: section.id,
      title: section.title,
      items: section.items.map(item => ({
        id: item.id,
        description: item.description,
        hasOther: item.hasOther || false,
      }))
    }))
  }
}

function getDefaultInventoryContent(sStep: number) {
  const cfg = INVENTORY_CONFIGS[sStep]
  if (!cfg) return { categories: [], extraFields: [] }
  return {
    categories: cfg.categories.map(c => ({ value: c.value, label: c.label, color: c.color })),
    extraFields: cfg.extraFields.map(f => ({
      key: f.key, label: f.label, type: f.type,
      ...(f.options ? { options: f.options } : {}),
    })),
  }
}

function getDefaultStandardContent() {
  return {
    fields: [
      { key: 'beforePhotoUrl', label: 'Foto Antes', type: 'photo', required: true },
      { key: 'afterPhotoUrl', label: 'Foto Después', type: 'photo', required: true },
      { key: 'responsable', label: 'Quién lo ha hecho', type: 'text', required: true },
      { key: 'contacto', label: 'Contacto', type: 'text', required: true },
      { key: 'mejoraTipo', label: 'Tipo de Mejora', type: 'select', options: ['Seguridad', 'Calidad', 'Proceso', 'Logística'], required: true },
    ],
  }
}

function getDefaultFotosContent(sStep: number) {
  const descriptions: Record<number, string> = {
    1: 'Fotografía la zona para ver qué elementos innecesarios hay antes de clasificar',
    2: 'Fotografía la zona para ver cómo está organizada antes de reordenar',
    3: 'Fotografía la zona para documentar los puntos de suciedad antes de limpiar',
    4: 'Fotografía la zona para documentar el estado actual antes de estandarizar',
    5: 'Fotografía la zona para documentar el nivel de cumplimiento de los estándares',
  }
  return {
    sections: [
      {
        title: 'Fotografías Antes',
        description: descriptions[sStep] || 'Documenta el estado actual con fotografías',
        minPhotos: 3,
        photoTypes: ['antes'],
        instructions: 'Toma un mínimo de 3 fotografías del estado actual de la zona. Incluye vistas generales y detalles de los problemas detectados.',
      },
      {
        title: 'Fotografías Después',
        description: 'Fotografía el resultado tras aplicar las mejoras',
        minPhotos: 3,
        photoTypes: ['despues'],
        instructions: 'Toma fotografías desde los mismos ángulos que las fotos "antes" para poder comparar el antes y el después.',
      },
    ],
  }
}

// ═══════════════════════════════════════════════════════
// VISUAL EDITOR: ChecklistEditor (autoevaluacion / auditoria)
// ═══════════════════════════════════════════════════════
interface ChecklistSection {
  id: string
  title: string
  items: { id: string; description: string; hasOther: boolean }[]
}

function ChecklistEditor({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  let parsed: { sections: ChecklistSection[] }
  try {
    parsed = JSON.parse(content)
  } catch {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
        El JSON no es válido. Corrígelo en modo JSON o carga el contenido por defecto.
      </div>
    )
  }

  const sections = parsed.sections || []
  const sPrefix = String(content.match(/"id"\s*:\s*"(\d+)\./)?.[1] || '1')

  const update = (newSections: ChecklistSection[]) => {
    onChange(JSON.stringify({ ...parsed, sections: newSections }, null, 2))
  }

  const addSection = () => {
    const newId = `${sPrefix}.${sections.length + 1}`
    update([...sections, { id: newId, title: 'Nueva Sección', items: [] }])
  }

  const removeSection = (idx: number) => {
    update(sections.filter((_, i) => i !== idx))
  }

  const updateSection = (idx: number, field: 'id' | 'title', value: string) => {
    const updated = [...sections]
    updated[idx] = { ...updated[idx], [field]: value }
    update(updated)
  }

  const moveSection = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= sections.length) return
    const updated = [...sections]
    ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
    update(updated)
  }

  const addItem = (sectionIdx: number) => {
    const sec = sections[sectionIdx]
    const newItemId = `${sec.id}.${sec.items.length + 1}`
    const updated = [...sections]
    updated[sectionIdx] = {
      ...updated[sectionIdx],
      items: [...updated[sectionIdx].items, { id: newItemId, description: '', hasOther: false }]
    }
    update(updated)
  }

  const removeItem = (sectionIdx: number, itemIdx: number) => {
    const updated = [...sections]
    updated[sectionIdx] = {
      ...updated[sectionIdx],
      items: updated[sectionIdx].items.filter((_, i) => i !== itemIdx)
    }
    update(updated)
  }

  const updateItem = (sectionIdx: number, itemIdx: number, field: string, value: string | boolean) => {
    const updated = [...sections]
    updated[sectionIdx] = {
      ...updated[sectionIdx],
      items: updated[sectionIdx].items.map((item, i) =>
        i === itemIdx ? { ...item, [field]: value } : item
      )
    }
    update(updated)
  }

  const moveItem = (sectionIdx: number, itemIdx: number, dir: -1 | 1) => {
    const items = sections[sectionIdx].items
    const target = itemIdx + dir
    if (target < 0 || target >= items.length) return
    const updated = [...sections]
    const newItems = [...updated[sectionIdx].items]
    ;[newItems[itemIdx], newItems[target]] = [newItems[target], newItems[itemIdx]]
    updated[sectionIdx] = { ...updated[sectionIdx], items: newItems }
    update(updated)
  }

  return (
    <div className="space-y-4">
      {sections.map((section, sIdx) => (
        <div key={sIdx} className="border-2 rounded-lg overflow-hidden bg-white shadow-sm">
          {/* Section header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveSection(sIdx, -1)} className="text-gray-400 hover:text-gray-600 leading-none" title="Subir sección">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button onClick={() => moveSection(sIdx, 1)} className="text-gray-400 hover:text-gray-600 leading-none" title="Bajar sección">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <Input
              value={section.id}
              onChange={(e) => updateSection(sIdx, 'id', e.target.value)}
              className="w-20 h-9 text-sm font-mono"
              placeholder="ID"
            />
            <Input
              value={section.title}
              onChange={(e) => updateSection(sIdx, 'title', e.target.value)}
              className="flex-1 h-9 text-base font-semibold"
              placeholder="Título de sección"
            />
            <Button variant="ghost" size="sm" onClick={() => addItem(sIdx)}
              className="h-9 w-9 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" title="Añadir item">
              <Plus className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => removeSection(sIdx)}
              className="h-9 w-9 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" title="Eliminar sección">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Items */}
          <div className="p-3 space-y-2">
            {section.items.length === 0 && (
              <p className="text-sm text-muted-foreground italic px-2 py-2">Sin items. Pulsa + para añadir.</p>
            )}
            {section.items.map((item, iIdx) => (
              <div key={iIdx} className="flex items-center gap-3 group">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveItem(sIdx, iIdx, -1)} className="text-gray-300 hover:text-gray-500 leading-none" title="Subir">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => moveItem(sIdx, iIdx, 1)} className="text-gray-300 hover:text-gray-500 leading-none" title="Bajar">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Input
                  value={item.id}
                  onChange={(e) => updateItem(sIdx, iIdx, 'id', e.target.value)}
                  className="w-20 h-8 text-xs font-mono"
                  placeholder="ID"
                />
                <Input
                  value={item.description}
                  onChange={(e) => updateItem(sIdx, iIdx, 'description', e.target.value)}
                  className="flex-1 h-8 text-sm"
                  placeholder="Descripción del item"
                />
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={item.hasOther}
                    onChange={(e) => updateItem(sIdx, iIdx, 'hasOther', e.target.checked)}
                    className="rounded border-gray-300 h-4 w-4"
                  />
                  Otros
                </label>
                <Button variant="ghost" size="sm"
                  onClick={() => removeItem(sIdx, iIdx)}
                  className="h-8 w-8 p-0 text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addSection}
        className="w-full border-dashed border-2 text-green-600 hover:bg-green-50 hover:border-green-400 gap-1 h-10">
        <Plus className="h-5 w-5" />
        Añadir sección
      </Button>

      <div className="text-sm text-muted-foreground text-center">
        {sections.length} sección(es) · {sections.reduce((s, sec) => s + sec.items.length, 0)} item(s) en total
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// VISUAL EDITOR: ExamEditor (examen)
// ═══════════════════════════════════════════════════════
function ExamEditor({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  let parsed: { questions: { question: string; options: string[]; correctIndex: number }[] }
  try {
    parsed = JSON.parse(content)
  } catch {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
        El JSON no es válido. Corrígelo en modo JSON o carga el contenido por defecto.
      </div>
    )
  }

  const questions = parsed.questions || []

  const update = (newQuestions: typeof questions) => {
    onChange(JSON.stringify({ ...parsed, questions: newQuestions }, null, 2))
  }

  const addQuestion = () => {
    update([...questions, { question: '', options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'], correctIndex: 0 }])
  }

  const removeQuestion = (idx: number) => {
    update(questions.filter((_, i) => i !== idx))
  }

  const updateQuestion = (idx: number, field: string, value: any) => {
    const updated = [...questions]
    updated[idx] = { ...updated[idx], [field]: value }
    update(updated)
  }

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    const updated = [...questions]
    updated[qIdx] = { ...updated[qIdx], options: updated[qIdx].options.map((o, i) => i === oIdx ? value : o) }
    update(updated)
  }

  const addOption = (qIdx: number) => {
    const updated = [...questions]
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const newIdx = updated[qIdx].options.length
    updated[qIdx] = { ...updated[qIdx], options: [...updated[qIdx].options, `Opción ${letters[newIdx] || newIdx + 1}`] }
    update(updated)
  }

  const removeOption = (qIdx: number, oIdx: number) => {
    const updated = [...questions]
    const newOptions = updated[qIdx].options.filter((_, i) => i !== oIdx)
    let newCorrect = updated[qIdx].correctIndex
    if (newCorrect >= newOptions.length) newCorrect = 0
    else if (newCorrect > oIdx) newCorrect--
    updated[qIdx] = { ...updated[qIdx], options: newOptions, correctIndex: newCorrect }
    update(updated)
  }

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= questions.length) return
    const updated = [...questions]
    ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
    update(updated)
  }

  return (
    <div className="space-y-4">
      {questions.map((q, qIdx) => (
        <div key={qIdx} className="border-2 rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border-b border-amber-200">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveQuestion(qIdx, -1)} className="text-gray-400 hover:text-gray-600 leading-none">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button onClick={() => moveQuestion(qIdx, 1)} className="text-gray-400 hover:text-gray-600 leading-none">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <Badge className="bg-amber-200 text-amber-800 shrink-0 text-sm px-2 py-0.5">P{qIdx + 1}</Badge>
            <Input
              value={q.question}
              onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
              className="flex-1 h-9 text-base"
              placeholder="Pregunta"
            />
            <Button variant="ghost" size="sm" onClick={() => removeQuestion(qIdx)}
              className="h-9 w-9 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" title="Eliminar pregunta">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-4 space-y-2">
            {q.options.map((opt, oIdx) => (
              <div key={oIdx} className="flex items-center gap-3 group">
                <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                  <input
                    type="radio"
                    name={`correct-${qIdx}`}
                    checked={q.correctIndex === oIdx}
                    onChange={() => updateQuestion(qIdx, 'correctIndex', oIdx)}
                    className="h-4 w-4 text-green-600"
                  />
                  <span className="text-xs text-muted-foreground w-5 font-semibold">{String.fromCharCode(65 + oIdx)}</span>
                </label>
                <Input
                  value={opt}
                  onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                  className={`flex-1 h-8 text-sm ${q.correctIndex === oIdx ? 'border-green-400 bg-green-50' : ''}`}
                />
                <Button variant="ghost" size="sm"
                  onClick={() => removeOption(qIdx, oIdx)}
                  className="h-8 w-8 p-0 text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  title="Eliminar opción">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => addOption(qIdx)}
              className="h-8 text-sm text-blue-500 hover:text-blue-600 gap-1 px-3">
              <Plus className="h-4 w-4" /> Añadir opción
            </Button>
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addQuestion}
        className="w-full border-dashed border-2 text-amber-600 hover:bg-amber-50 hover:border-amber-400 gap-1 h-10">
        <Plus className="h-5 w-5" />
        Añadir pregunta
      </Button>

      <div className="text-sm text-muted-foreground text-center">
        {questions.length} pregunta(s)
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// VISUAL EDITOR: FormationEditor (formacion)
// ═══════════════════════════════════════════════════════
function FormationEditor({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  let parsed: { sections: { title: string; content: string }[] }
  try {
    parsed = JSON.parse(content)
  } catch {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
        El JSON no es válido. Corrígelo en modo JSON o carga el contenido por defecto.
      </div>
    )
  }

  const sections = parsed.sections || []

  const update = (newSections: typeof sections) => {
    onChange(JSON.stringify({ ...parsed, sections: newSections }, null, 2))
  }

  const addSection = () => {
    update([...sections, { title: '', content: '' }])
  }

  const removeSection = (idx: number) => {
    update(sections.filter((_, i) => i !== idx))
  }

  const updateSection = (idx: number, field: 'title' | 'content', value: string) => {
    const updated = [...sections]
    updated[idx] = { ...updated[idx], [field]: value }
    update(updated)
  }

  const moveSection = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= sections.length) return
    const updated = [...sections]
    ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
    update(updated)
  }

  return (
    <div className="space-y-4">
      {sections.map((sec, idx) => (
        <div key={idx} className="border-2 rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border-b border-blue-200">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveSection(idx, -1)} className="text-gray-400 hover:text-gray-600 leading-none">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button onClick={() => moveSection(idx, 1)} className="text-gray-400 hover:text-gray-600 leading-none">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <Badge className="bg-blue-200 text-blue-800 shrink-0 text-sm px-2 py-0.5">Sección {idx + 1}</Badge>
            <Input
              value={sec.title}
              onChange={(e) => updateSection(idx, 'title', e.target.value)}
              className="flex-1 h-9 text-base font-semibold"
              placeholder="Título de la sección"
            />
            <Button variant="ghost" size="sm" onClick={() => removeSection(idx)}
              className="h-9 w-9 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" title="Eliminar sección">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4">
            <textarea
              value={sec.content}
              onChange={(e) => updateSection(idx, 'content', e.target.value)}
              className="w-full h-28 p-3 border rounded-lg text-sm resize-y focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
              placeholder="Contenido de la sección..."
            />
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addSection}
        className="w-full border-dashed border-2 text-blue-600 hover:bg-blue-50 hover:border-blue-400 gap-1 h-10">
        <Plus className="h-5 w-5" />
        Añadir sección
      </Button>

      <div className="text-sm text-muted-foreground text-center">
        {sections.length} sección(es) de formación
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// VISUAL EDITOR: InventoryConfigEditor (inventario)
// ═══════════════════════════════════════════════════════
interface InvCategory { value: string; label: string; color: string }
interface InvField { key: string; label: string; type: 'select' | 'text' | 'number'; options?: string[] }

function InventoryConfigEditor({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  let parsed: { categories: InvCategory[]; extraFields: InvField[] }
  try {
    parsed = JSON.parse(content)
  } catch {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
        El JSON no es válido. Corrígelo en modo JSON o carga el contenido por defecto.
      </div>
    )
  }

  const categories = parsed.categories || []
  const extraFields = parsed.extraFields || []

  const update = (newData: Partial<typeof parsed>) => {
    onChange(JSON.stringify({ ...parsed, ...newData }, null, 2))
  }

  const addCategory = () => {
    update({ categories: [...categories, { value: '', label: '', color: 'bg-gray-100 text-gray-800' }] })
  }

  const removeCategory = (idx: number) => {
    update({ categories: categories.filter((_, i) => i !== idx) })
  }

  const updateCategory = (idx: number, field: keyof InvCategory, value: string) => {
    const updated = [...categories]
    updated[idx] = { ...updated[idx], [field]: value }
    update({ categories: updated })
  }

  const moveCategory = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= categories.length) return
    const updated = [...categories]
    ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
    update({ categories: updated })
  }

  const addField = () => {
    update({ extraFields: [...extraFields, { key: '', label: '', type: 'text' }] })
  }

  const removeField = (idx: number) => {
    update({ extraFields: extraFields.filter((_, i) => i !== idx) })
  }

  const updateField = (idx: number, field: string, value: string | boolean) => {
    const updated = [...extraFields]
    updated[idx] = { ...updated[idx], [field]: value }
    // Remove options if type is not select
    if (field === 'type' && value !== 'select') {
      const { options, ...rest } = updated[idx]
      updated[idx] = rest as InvField
    }
    update({ extraFields: updated })
  }

  const moveField = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= extraFields.length) return
    const updated = [...extraFields]
    ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
    update({ extraFields: updated })
  }

  const addOption = (fIdx: number) => {
    const updated = [...extraFields]
    const opts = [...(updated[fIdx].options || []), '']
    updated[fIdx] = { ...updated[fIdx], options: opts }
    update({ extraFields: updated })
  }

  const removeOption = (fIdx: number, oIdx: number) => {
    const updated = [...extraFields]
    const opts = (updated[fIdx].options || []).filter((_, i) => i !== oIdx)
    updated[fIdx] = { ...updated[fIdx], options: opts }
    update({ extraFields: updated })
  }

  const updateOption = (fIdx: number, oIdx: number, value: string) => {
    const updated = [...extraFields]
    const opts = [...(updated[fIdx].options || [])]
    opts[oIdx] = value
    updated[fIdx] = { ...updated[fIdx], options: opts }
    update({ extraFields: updated })
  }

  const COLOR_PRESETS = [
    'bg-green-100 text-green-800', 'bg-blue-100 text-blue-800', 'bg-yellow-100 text-yellow-800',
    'bg-red-100 text-red-800', 'bg-purple-100 text-purple-800', 'bg-orange-100 text-orange-800',
    'bg-gray-100 text-gray-800', 'bg-cyan-100 text-cyan-800', 'bg-amber-100 text-amber-800',
    'bg-teal-100 text-teal-800', 'bg-pink-100 text-pink-800',
  ]

  return (
    <div className="space-y-6">
      {/* CATEGORIES */}
      <div>
        <h4 className="text-sm font-bold text-orange-700 mb-2 flex items-center gap-2">
          <Badge className="bg-orange-100 text-orange-800">Categorías</Badge>
          {categories.length} categoría(s)
        </h4>
        <div className="space-y-2">
          {categories.map((cat, idx) => (
            <div key={idx} className="flex items-center gap-2 group border rounded-lg p-2 bg-white">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveCategory(idx, -1)} className="text-gray-300 hover:text-gray-500 leading-none">
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => moveCategory(idx, 1)} className="text-gray-300 hover:text-gray-500 leading-none">
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <Input value={cat.value} onChange={e => updateCategory(idx, 'value', e.target.value)}
                className="w-32 h-8 text-xs" placeholder="Valor (ej: muy_frecuente)" />
              <Input value={cat.label} onChange={e => updateCategory(idx, 'label', e.target.value)}
                className="flex-1 h-8 text-xs" placeholder="Etiqueta (ej: Muy frecuente)" />
              <select value={cat.color} onChange={e => updateCategory(idx, 'color', e.target.value)}
                className="h-8 text-xs border rounded px-1 max-w-[180px]">
                {COLOR_PRESETS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <Badge className={cat.color}>{cat.label || 'Preview'}</Badge>
              <Button variant="ghost" size="sm" onClick={() => removeCategory(idx)}
                className="h-8 w-8 p-0 text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addCategory} size="sm"
            className="w-full border-dashed border-2 text-orange-600 hover:bg-orange-50 hover:border-orange-400 gap-1">
            <Plus className="h-4 w-4" /> Añadir categoría
          </Button>
        </div>
      </div>

      {/* EXTRA FIELDS */}
      <div>
        <h4 className="text-sm font-bold text-teal-700 mb-2 flex items-center gap-2">
          <Badge className="bg-teal-100 text-teal-800">Campos extra</Badge>
          {extraFields.length} campo(s)
        </h4>
        <div className="space-y-2">
          {extraFields.map((field, fIdx) => (
            <div key={fIdx} className="border-2 rounded-lg overflow-hidden bg-white shadow-sm">
              <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border-b border-teal-200">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveField(fIdx, -1)} className="text-gray-300 hover:text-gray-500 leading-none">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => moveField(fIdx, 1)} className="text-gray-300 hover:text-gray-500 leading-none">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Badge className="bg-teal-200 text-teal-800 shrink-0 text-[10px] px-1.5 py-0.5">Campo {fIdx + 1}</Badge>
                <Input value={field.key} onChange={e => updateField(fIdx, 'key', e.target.value)}
                  className="w-36 h-7 text-xs font-mono" placeholder="key (ej: ubicacion)" />
                <Input value={field.label} onChange={e => updateField(fIdx, 'label', e.target.value)}
                  className="flex-1 h-7 text-xs" placeholder="Etiqueta (ej: Ubicación asignada)" />
                <select value={field.type} onChange={e => updateField(fIdx, 'type', e.target.value)}
                  className="h-7 text-xs border rounded px-2">
                  <option value="text">Texto</option>
                  <option value="number">Número</option>
                  <option value="select">Selección</option>
                </select>
                <Button variant="ghost" size="sm" onClick={() => removeField(fIdx)}
                  className="h-7 w-7 p-0 text-red-400 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {field.type === 'select' && (
                <div className="px-3 py-2 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Opciones:</Label>
                  {(field.options || []).map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-1">
                      <Input value={opt} onChange={e => updateOption(fIdx, oIdx, e.target.value)}
                        className="flex-1 h-7 text-xs" placeholder={`Opción ${oIdx + 1}`} />
                      <Button variant="ghost" size="sm" onClick={() => removeOption(fIdx, oIdx)}
                        className="h-7 w-7 p-0 text-red-300 hover:text-red-500">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => addOption(fIdx)}
                    className="h-7 text-xs text-teal-600 hover:text-teal-700 gap-1 px-2">
                    <Plus className="h-3 w-3" /> Añadir opción
                  </Button>
                </div>
              )}
            </div>
          ))}
          <Button variant="outline" onClick={addField} size="sm"
            className="w-full border-dashed border-2 text-teal-600 hover:bg-teal-50 hover:border-teal-400 gap-1">
            <Plus className="h-4 w-4" /> Añadir campo extra
          </Button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// VISUAL EDITOR: StandardTemplateEditor (estandar)
// ═══════════════════════════════════════════════════════
interface StdField { key: string; label: string; type: 'photo' | 'text' | 'number' | 'select'; options?: string[]; required?: boolean }

function StandardTemplateEditor({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  let parsed: { fields: StdField[] }
  try {
    parsed = JSON.parse(content)
  } catch {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
        El JSON no es válido. Corrígelo en modo JSON o carga el contenido por defecto.
      </div>
    )
  }

  const fields = parsed.fields || []

  const update = (newFields: StdField[]) => {
    onChange(JSON.stringify({ ...parsed, fields: newFields }, null, 2))
  }

  const addField = () => {
    update([...fields, { key: '', label: '', type: 'text', required: false }])
  }

  const removeField = (idx: number) => {
    update(fields.filter((_, i) => i !== idx))
  }

  const updateField = (idx: number, field: string, value: string | boolean) => {
    const updated = [...fields]
    updated[idx] = { ...updated[idx], [field]: value }
    // Remove options if type is not select
    if (field === 'type' && value !== 'select') {
      const { options, ...rest } = updated[idx]
      updated[idx] = rest as StdField
    }
    update(updated)
  }

  const moveField = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= fields.length) return
    const updated = [...fields]
    ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
    update(updated)
  }

  const addOption = (fIdx: number) => {
    const updated = [...fields]
    const opts = [...(updated[fIdx].options || []), '']
    updated[fIdx] = { ...updated[fIdx], options: opts }
    update(updated)
  }

  const removeOption = (fIdx: number, oIdx: number) => {
    const updated = [...fields]
    const opts = (updated[fIdx].options || []).filter((_, i) => i !== oIdx)
    updated[fIdx] = { ...updated[fIdx], options: opts }
    update(updated)
  }

  const updateOption = (fIdx: number, oIdx: number, value: string) => {
    const updated = [...fields]
    const opts = [...(updated[fIdx].options || [])]
    opts[oIdx] = value
    updated[fIdx] = { ...updated[fIdx], options: opts }
    update(updated)
  }

  const TYPE_LABELS: Record<string, string> = { photo: 'Foto', text: 'Texto', number: 'Número', select: 'Selección' }

  return (
    <div className="space-y-3">
      {fields.map((field, fIdx) => (
        <div key={fIdx} className="border-2 rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border-b border-violet-200">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveField(fIdx, -1)} className="text-gray-300 hover:text-gray-500 leading-none">
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => moveField(fIdx, 1)} className="text-gray-300 hover:text-gray-500 leading-none">
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <Badge className="bg-violet-200 text-violet-800 shrink-0 text-[10px] px-1.5 py-0.5">Campo {fIdx + 1}</Badge>
            <Input value={field.key} onChange={e => updateField(fIdx, 'key', e.target.value)}
              className="w-36 h-7 text-xs font-mono" placeholder="key (ej: beforePhotoUrl)" />
            <Input value={field.label} onChange={e => updateField(fIdx, 'label', e.target.value)}
              className="flex-1 h-7 text-xs" placeholder="Etiqueta (ej: Foto Antes)" />
            <select value={field.type} onChange={e => updateField(fIdx, 'type', e.target.value)}
              className="h-7 text-xs border rounded px-2">
              <option value="text">Texto</option>
              <option value="number">Número</option>
              <option value="select">Selección</option>
              <option value="photo">Foto</option>
            </select>
            <label className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap cursor-pointer">
              <input type="checkbox" checked={field.required || false}
                onChange={e => updateField(fIdx, 'required', e.target.checked)}
                className="rounded border-gray-300 h-3.5 w-3.5" />
              Oblig.
            </label>
            <Button variant="ghost" size="sm" onClick={() => removeField(fIdx)}
              className="h-7 w-7 p-0 text-red-400 hover:text-red-500">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          {field.type === 'select' && (
            <div className="px-3 py-2 space-y-1">
              <Label className="text-[10px] text-muted-foreground">Opciones:</Label>
              {(field.options || []).map((opt, oIdx) => (
                <div key={oIdx} className="flex items-center gap-1">
                  <Input value={opt} onChange={e => updateOption(fIdx, oIdx, e.target.value)}
                    className="flex-1 h-7 text-xs" placeholder={`Opción ${oIdx + 1}`} />
                  <Button variant="ghost" size="sm" onClick={() => removeOption(fIdx, oIdx)}
                    className="h-7 w-7 p-0 text-red-300 hover:text-red-500">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => addOption(fIdx)}
                className="h-7 text-xs text-violet-600 hover:text-violet-700 gap-1 px-2">
                <Plus className="h-3 w-3" /> Añadir opción
              </Button>
            </div>
          )}
        </div>
      ))}

      <Button variant="outline" onClick={addField} size="sm"
        className="w-full border-dashed border-2 text-violet-600 hover:bg-violet-50 hover:border-violet-400 gap-1">
        <Plus className="h-4 w-4" /> Añadir campo
      </Button>

      <div className="text-sm text-muted-foreground text-center">
        {fields.length} campo(s) · {fields.filter(f => f.required).length} obligatorio(s)
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
export default function TemplateManager() {
  const { currentProject } = use5SStore()
  const [activeTab, setActiveTab] = useState<TemplateTab>('formacion')
  const [templates, setTemplates] = useState<TemplateData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TemplateData | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [expandedS, setExpandedS] = useState<number | null>(null)
  const [editorMode, setEditorMode] = useState<'visual' | 'json'>('visual')

  // Form state
  const [formType, setFormType] = useState<string>('formacion')
  const [formSStep, setFormSStep] = useState<number>(1)
  const [formMiniStep, setFormMiniStep] = useState<number>(3)
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formNotaMinima, setFormNotaMinima] = useState<number | null>(null)
  const [notaMinimaAplica, setNotaMinimaAplica] = useState(true)
  const [formActive, setFormActive] = useState(true)

  const tabConfig = TEMPLATE_TABS.find(t => t.key === activeTab)!

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true)
    try {
      const types = tabConfig.types
      const allTemplates: TemplateData[] = []
      for (const type of types) {
        const res = await fetch(`/api/templates?type=${type}&includeInactive=true`)
        const data = await res.json()
        if (data.success && data.data) allTemplates.push(...data.data)
      }
      setTemplates(allTemplates)
    } catch (e) { console.error('Error fetching templates:', e) }
    finally { setIsLoading(false) }
  }, [tabConfig.types])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const resetForm = () => {
    setFormType(tabConfig.types[0])
    setFormSStep(1)
    setFormMiniStep(3)
    setFormTitle('')
    setFormDescription('')
    setFormContent('')
    setFormNotaMinima(activeTab === 'formacion' ? EXAM_PASS_THRESHOLD : activeTab === 'auditoria_interna' ? SELF_EVAL_THRESHOLD : activeTab === 'auditoria_externa' ? AUDIT_PASS_THRESHOLD : 0)
    setFormActive(true)
    setEditingTemplate(null)
    setIsCreating(false)
    setEditorMode('visual')
    // resetForm complete
  }

  const startCreate = (sStep: number, type: string, miniStep: number = 3) => {
    setIsCreating(true)
    setFormType(type)
    setFormSStep(sStep)
    setFormMiniStep(miniStep)
    setFormTitle(`S${sStep} - ${S_STEPS.find(s => s.id === sStep)?.japaneseName || ''}`)
    setFormDescription('')
    const aplicaNota = type === 'examen' || type === 'autoevaluacion' || type === 'auditoria'
    setNotaMinimaAplica(aplicaNota)
    setFormNotaMinima(aplicaNota ? (type === 'examen' ? EXAM_PASS_THRESHOLD : type === 'autoevaluacion' ? SELF_EVAL_THRESHOLD : AUDIT_PASS_THRESHOLD) : null)
    setFormActive(true)
    setEditorMode('visual')

    if (type === 'formacion') {
      setFormContent(JSON.stringify(getDefaultFormationContent(sStep), null, 2))
    } else if (type === 'examen') {
      setFormContent(JSON.stringify(getDefaultExamContent(sStep), null, 2))
    } else if (type === 'fotos') {
      setFormContent(JSON.stringify(getDefaultFotosContent(sStep), null, 2))
    } else if (type === 'inventario') {
      setFormContent(JSON.stringify(getDefaultInventoryContent(sStep), null, 2))
    } else if (type === 'estandar') {
      setFormContent(JSON.stringify(getDefaultStandardContent(), null, 2))
    } else {
      setFormContent(JSON.stringify(getDefaultChecklistContent(sStep), null, 2))
    }
  }

  const startEdit = (template: TemplateData) => {
    setEditingTemplate(template)
    setFormType(template.type)
    setFormSStep(template.sStep)
    setFormMiniStep(template.miniStep || 3)
    setFormTitle(template.title)
    setFormDescription(template.description || '')
    setFormContent(typeof template.content === 'string' ? template.content : JSON.stringify(template.content, null, 2))
    const aplicaNota = template.type === 'examen' || template.type === 'autoevaluacion' || template.type === 'auditoria'
    setNotaMinimaAplica(aplicaNota)
    setFormNotaMinima(template.notaMinima != null ? template.notaMinima : (aplicaNota ? (template.type === 'examen' ? EXAM_PASS_THRESHOLD : template.type === 'autoevaluacion' ? SELF_EVAL_THRESHOLD : AUDIT_PASS_THRESHOLD) : null))
    setFormActive(template.active)
    setIsCreating(true)
    setEditorMode('visual')
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Validate JSON
      try { JSON.parse(formContent) } catch { alert('El contenido JSON no es válido. Revísalo.'); setIsSaving(false); return }

      const payload = {
        type: formType,
        sStep: formSStep,
        miniStep: formMiniStep,
        title: formTitle,
        description: formDescription || null,
        content: formContent,
        notaMinima: notaMinimaAplica ? formNotaMinima : null,
        active: formActive,
      }

      if (editingTemplate) {
        const res = await fetch('/api/templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingTemplate.id, ...payload }),
        })
        const data = await res.json()
        if (!data.success) { alert('Error: ' + data.error); return }
      } else {
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!data.success) { alert('Error: ' + data.error); return }
      }

      resetForm()
      fetchTemplates()
    } catch (e) { console.error('Error saving:', e); alert('Error al guardar') }
    finally { setIsSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta plantilla?')) return
    try {
      await fetch(`/api/templates?id=${id}`, { method: 'DELETE' })
      fetchTemplates()
    } catch (e) { console.error(e) }
  }

  const handleSeedDefaults = async () => {
    if (!confirm('¿Crear plantillas por defecto para todas las S que no tengan?')) return
    setIsSaving(true)
    try {
      for (const s of S_STEPS) {
        for (const type of tabConfig.types) {
          const existing = templates.find(t => t.sStep === s.id && t.type === type && t.active)
          if (!existing) {
            let content = '{}'
            let title = ''
            let nota = EXAM_PASS_THRESHOLD
            let miniStep = 1
            if (type === 'formacion') {
              content = JSON.stringify(getDefaultFormationContent(s.id))
              title = `Formación S${s.id} - ${s.japaneseName}`
              miniStep = 1
            } else if (type === 'examen') {
              content = JSON.stringify(getDefaultExamContent(s.id))
              title = `Examen S${s.id} - ${s.japaneseName}`
              nota = EXAM_PASS_THRESHOLD
              miniStep = 1
            } else if (type === 'autoevaluacion') {
              content = JSON.stringify(getDefaultChecklistContent(s.id))
              title = `Autoevaluación S${s.id} - ${s.japaneseName}`
              nota = SELF_EVAL_THRESHOLD
              miniStep = 4
            } else if (type === 'auditoria') {
              content = JSON.stringify(getDefaultChecklistContent(s.id))
              title = `Auditoría S${s.id} - ${s.japaneseName}`
              nota = AUDIT_PASS_THRESHOLD
              miniStep = 5
            } else if (type === 'inventario') {
              content = JSON.stringify(getDefaultInventoryContent(s.id))
              title = `Inventario S${s.id} - ${s.japaneseName}`
              nota = 0
              miniStep = 3
            } else if (type === 'fotos') {
              content = JSON.stringify(getDefaultFotosContent(s.id))
              title = `Fotos S${s.id} - ${s.japaneseName}`
              nota = 0
              miniStep = 2
            } else if (type === 'estandar') {
              content = JSON.stringify(getDefaultStandardContent())
              title = `Estándar S${s.id} - ${s.japaneseName}`
              nota = 0
              miniStep = 3
            }
            await fetch('/api/templates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type, sStep: s.id, miniStep, title, content, notaMinima: nota }),
            })
          }
        }
      }
      fetchTemplates()
    } catch (e) { console.error(e) }
    finally { setIsSaving(false) }
  }

  const handleDownload = (template: TemplateData) => {
    try {
      const data = typeof template.content === 'string' ? JSON.parse(template.content) : template.content
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${template.type}_S${template.sStep}_${template.title.replace(/[^a-zA-Z0-9]/g, '_')}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Error al descargar la plantilla')
    }
  }

  const handleUploadJson = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string)
          setFormContent(JSON.stringify(data, null, 2))
        } catch {
          alert('El archivo JSON no es válido')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const templatesByS = (sStep: number) => templates.filter(t => t.sStep === sStep)

  // Count summary for a template
  const getTemplateSummary = (template: TemplateData) => {
    try {
      const data = typeof template.content === 'string' ? JSON.parse(template.content) : template.content
      if (data.questions) return `${data.questions.length} pregunta(s)`
      if (data.fields) return `${data.fields.length} campo(s)`
      if (data.categories || data.extraFields) return `${(data.categories || []).length} cat. / ${(data.extraFields || []).length} campos`
      if (data.sections) {
        const totalItems = data.sections.reduce((s: number, sec: any) => s + (sec.items?.length || 0), 0)
        return totalItems > 0 ? `${data.sections.length} sec. / ${totalItems} items` : `${data.sections.length} sección(es)`
      }
      return ''
    } catch { return '' }
  }

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full">
      {/* Tab selector — fixed */}
      <div className="flex gap-2 border-b pb-2 shrink-0">
        {TEMPLATE_TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setExpandedS(null) }}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-green-50 text-green-700 border-b-2 border-green-500'
                  : 'text-muted-foreground hover:text-foreground hover:bg-gray-50'
              }`}>
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Header actions — fixed */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-lg font-bold flex items-center gap-2">
          {(() => { const Icon = tabConfig.icon; return <Icon className="h-5 w-5 text-green-600" /> })()}
          Plantillas de {tabConfig.label}
        </h2>
        <Button variant="outline" size="sm" onClick={handleSeedDefaults} disabled={isSaving}
          className="gap-1 text-xs border-green-300 text-green-600 hover:bg-green-50">
          <RotateCcw className="h-3.5 w-3.5" />
          Crear plantillas por defecto
        </Button>
      </div>

      {/* S-Step cards — scrollable */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto space-y-3">
          {S_STEPS.map(s => {
            const sTemplates = templatesByS(s.id)
            const isExpanded = expandedS === s.id
            return (
              <div key={s.id} className="rounded-xl border-2 overflow-hidden"
                style={{ borderColor: S_COLORS[s.id] + '40' }}>
                {/* S Header */}
                <div className="flex items-center justify-between px-4 py-3 cursor-pointer"
                  style={{ backgroundColor: S_COLORS[s.id] + '10' }}
                  onClick={() => setExpandedS(isExpanded ? null : s.id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-sm"
                      style={{ backgroundColor: S_COLORS[s.id] }}>
                      S{s.id}
                    </div>
                    <div>
                      <span className="font-bold" style={{ color: S_COLORS[s.id] }}>{s.japaneseName}</span>
                      <span className="text-sm text-muted-foreground ml-2">({s.spanishName})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" style={{ color: S_COLORS[s.id], borderColor: S_COLORS[s.id] + '40' }}>
                      {sTemplates.length} plantilla{sTemplates.length !== 1 ? 's' : ''}
                    </Badge>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {/* Expanded */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden">
                      <div className="p-4 space-y-3">
                        {/* Create buttons */}
                        <div className="flex gap-2 mb-3">
                          {tabConfig.types.map(type => {
                            const defaultMiniStep = type === 'formacion' || type === 'examen' ? 1 : type === 'autoevaluacion' ? 4 : type === 'auditoria' ? 5 : 3
                            return (
                            <Button key={type} variant="outline" size="sm"
                              className="gap-1 text-xs"
                              onClick={() => startCreate(s.id, type, defaultMiniStep)}>
                              <Plus className="h-3.5 w-3.5" />
                              Nueva {type === 'formacion' ? 'Formación' : type === 'examen' ? 'Examen' : type === 'autoevaluacion' ? 'Autoevaluación' : type === 'auditoria' ? 'Auditoría Externa' : type === 'inventario' ? 'Config. Inventario' : 'Formato Estándar'}
                            </Button>
                          )})}
                        </div>

                        {/* Template list */}
                        {sTemplates.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground text-sm">
                            No hay plantillas para S{s.id}. Crea una nueva o pulsa &quot;Crear plantillas por defecto&quot;.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {sTemplates.map(tpl => (
                              <div key={tpl.id}
                                className={`p-3 rounded-lg border ${tpl.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300 opacity-60'}`}>
                                {/* S / Paso indicator */}
                                <div className="flex items-center gap-2 mb-2 px-1">
                                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold text-white"
                                    style={{ backgroundColor: S_COLORS[tpl.sStep] || '#666' }}>
                                    S{tpl.sStep}
                                  </div>
                                  <span className="text-xs text-muted-foreground">Paso {tpl.miniStep || 3}</span>
                                  <span className="text-xs text-muted-foreground">·</span>
                                  <span className="text-xs font-medium" style={{ color: S_COLORS[tpl.sStep] || '#666' }}>
                                    {MINI_STEPS_LABELS[tpl.miniStep || 3]}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <Badge className="shrink-0" style={{
                                    backgroundColor: tpl.type === 'formacion' ? '#DBEAFE' : tpl.type === 'examen' ? '#FEF3C7' : tpl.type === 'autoevaluacion' ? '#D1FAE5' : tpl.type === 'auditoria' ? '#FED7AA' : tpl.type === 'inventario' ? '#FFEDD5' : '#EDE9FE',
                                    color: tpl.type === 'formacion' ? '#1D4ED8' : tpl.type === 'examen' ? '#92400E' : tpl.type === 'autoevaluacion' ? '#065F46' : tpl.type === 'auditoria' ? '#9A3412' : tpl.type === 'inventario' ? '#9A3412' : '#6D28D9',
                                  }}>
                                    {tpl.type === 'formacion' ? 'Formación' : tpl.type === 'examen' ? 'Examen' : tpl.type === 'autoevaluacion' ? 'Aut. Int.' : tpl.type === 'auditoria' ? 'Aud. Ext.' : tpl.type === 'inventario' ? 'Inventario' : 'Estándar'}
                                  </Badge>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{tpl.title}</p>
                                    {tpl.description && <p className="text-xs text-muted-foreground truncate">{tpl.description}</p>}
                                  </div>
                                  {getTemplateSummary(tpl) && (
                                    <Badge variant="outline" className="shrink-0 text-[10px]">
                                      {getTemplateSummary(tpl)}
                                    </Badge>
                                  )}
                                  {tpl.notaMinima != null ? (
                                    <Badge variant="outline" className="shrink-0 text-xs">
                                      Nota mín: {tpl.notaMinima}%
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="shrink-0 text-xs text-gray-400 border-gray-200">
                                      Sin nota mín
                                    </Badge>
                                  )}
                                  {!tpl.active && (
                                    <Badge variant="outline" className="shrink-0 text-xs text-red-500 border-red-200">Inactiva</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  <Button variant="ghost" size="sm" onClick={() => handleDownload(tpl)}
                                    className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700" title="Descargar JSON">
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => startEdit(tpl)}
                                    className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700">
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDelete(tpl.id)}
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* EDIT / CREATE — FULL-SCREEN OVERLAY */}
      {/* ═══════════════════════════════════════════════════════ */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 flex items-center justify-center">
          <div className="bg-white w-[98vw] h-[96vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header bar */}
            <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3">
                {editingTemplate ? <Edit3 className="h-5 w-5 text-blue-500" /> : <Plus className="h-5 w-5 text-green-500" />}
                <h2 className="text-lg font-bold">
                  {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
                </h2>
                {/* S / Paso indicator inline */}
                <div className="flex items-center gap-2 ml-4 px-3 py-1.5 rounded-lg border-2"
                  style={{ backgroundColor: S_COLORS[formSStep] + '10', borderColor: S_COLORS[formSStep] + '40' }}>
                  <div className="w-7 h-7 rounded flex items-center justify-center text-white font-black text-xs"
                    style={{ backgroundColor: S_COLORS[formSStep] }}>
                    S{formSStep}
                  </div>
                  <span className="text-sm font-semibold" style={{ color: S_COLORS[formSStep] }}>
                    {S_STEPS.find(s => s.id === formSStep)?.japaneseName}
                  </span>
                  <Badge style={{ backgroundColor: S_COLORS[formSStep] + '20', color: S_COLORS[formSStep] }}
                    className="text-xs px-2 py-0.5 border-0 font-semibold">
                    Paso {formMiniStep}: {MINI_STEPS_LABELS[formMiniStep] || `Paso ${formMiniStep}`}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={resetForm}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content area — scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
              {/* Config rows */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Tipo</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger className="mt-1 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formacion">Formación</SelectItem>
                      <SelectItem value="examen">Examen</SelectItem>
                      <SelectItem value="autoevaluacion">Auditoría Interna</SelectItem>
                      <SelectItem value="auditoria">Auditoría Externa</SelectItem>
                      <SelectItem value="inventario">Inventario</SelectItem>
                      <SelectItem value="estandar">Estándar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-semibold">S (Fase)</Label>
                  <Select value={String(formSStep)} onValueChange={(v) => setFormSStep(Number(v))}>
                    <SelectTrigger className="mt-1 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {S_STEPS.map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          S{s.id} - {s.japaneseName} ({s.spanishName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Paso</Label>
                  <Select value={String(formMiniStep)} onValueChange={(v) => setFormMiniStep(Number(v))}>
                    <SelectTrigger className="mt-1 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(step => (
                        <SelectItem key={step} value={String(step)}>
                          Paso {step} — {MINI_STEPS_LABELS[step]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Nota mínima (pasa/no pasa)</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={notaMinimaAplica}
                        onChange={(e) => {
                          setNotaMinimaAplica(e.target.checked)
                          if (!e.target.checked) setFormNotaMinima(null)
                          else setFormNotaMinima(formType === 'examen' ? EXAM_PASS_THRESHOLD : formType === 'autoevaluacion' ? SELF_EVAL_THRESHOLD : AUDIT_PASS_THRESHOLD)
                        }}
                        className="rounded border-gray-300 h-4 w-4"
                      />
                      <span className="text-muted-foreground">Aplica</span>
                    </label>
                    {notaMinimaAplica ? (
                      <div className="flex items-center gap-1">
                        <Input type="number" value={formNotaMinima ?? 0} onChange={(e) => setFormNotaMinima(Number(e.target.value))}
                          min={0} max={100} className="h-10 w-20" />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">No aplica</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2">
                  <Label className="text-sm font-semibold">Título</Label>
                  <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                    className="mt-1 h-10" placeholder="Título de la plantilla" />
                </div>
                <div className="col-span-1">
                  <Label className="text-sm font-semibold">Descripción</Label>
                  <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                    className="mt-1 h-10" placeholder="Descripción opcional" />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)}
                      className="rounded border-gray-300 h-4 w-4" />
                    Plantilla activa
                  </label>
                </div>
              </div>

              {/* ═══════════ Content Editor ═══════════ */}
              <div className="flex flex-col" style={{ minHeight: 'calc(96vh - 320px)' }}>
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <Label className="text-sm font-semibold">Contenido</Label>
                  <div className="flex items-center gap-2">
                    {/* Default data buttons */}
                    {(formType === 'autoevaluacion' || formType === 'auditoria') && (
                      <Button variant="outline" size="sm" className="text-xs"
                        onClick={() => setFormContent(JSON.stringify(getDefaultChecklistContent(formSStep), null, 2))}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Cargar checklist por defecto
                      </Button>
                    )}
                    {formType === 'formacion' && (
                      <Button variant="outline" size="sm" className="text-xs"
                        onClick={() => setFormContent(JSON.stringify(getDefaultFormationContent(formSStep), null, 2))}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Cargar formación por defecto
                      </Button>
                    )}
                    {formType === 'examen' && (
                      <Button variant="outline" size="sm" className="text-xs"
                        onClick={() => setFormContent(JSON.stringify(getDefaultExamContent(formSStep), null, 2))}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Cargar examen por defecto
                      </Button>
                    )}
                    {formType === 'inventario' && (
                      <Button variant="outline" size="sm" className="text-xs"
                        onClick={() => setFormContent(JSON.stringify(getDefaultInventoryContent(formSStep), null, 2))}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Cargar inventario por defecto
                      </Button>
                    )}
                    {formType === 'estandar' && (
                      <Button variant="outline" size="sm" className="text-xs"
                        onClick={() => setFormContent(JSON.stringify(getDefaultStandardContent(), null, 2))}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Cargar estándar por defecto
                      </Button>
                    )}

                    {/* Upload JSON */}
                    <Button variant="outline" size="sm" className="text-xs" onClick={handleUploadJson}>
                      <Upload className="h-3.5 w-3.5 mr-1" />
                      Subir JSON
                    </Button>

                    {/* Visual / JSON toggle */}
                    <div className="flex rounded-md border overflow-hidden">
                      <button
                        onClick={() => setEditorMode('visual')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                          editorMode === 'visual' ? 'bg-green-100 text-green-700' : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}>
                        <Eye className="h-3.5 w-3.5" />
                        Visual
                      </button>
                      <button
                        onClick={() => setEditorMode('json')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                          editorMode === 'json' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}>
                        <Code className="h-3.5 w-3.5" />
                        JSON
                      </button>
                    </div>
                  </div>
                </div>

                {/* Editor content */}
                {editorMode === 'visual' ? (
                  <div className="border rounded-lg p-4 flex-1 overflow-y-auto bg-gray-50">
                    {(formType === 'autoevaluacion' || formType === 'auditoria') && (
                      <ChecklistEditor content={formContent} onChange={setFormContent} />
                    )}
                    {formType === 'examen' && (
                      <ExamEditor content={formContent} onChange={setFormContent} />
                    )}
                    {formType === 'formacion' && (
                      <FormationEditor content={formContent} onChange={setFormContent} />
                    )}
                    {formType === 'inventario' && (
                      <InventoryConfigEditor content={formContent} onChange={setFormContent} />
                    )}
                    {formType === 'estandar' && (
                      <StandardTemplateEditor content={formContent} onChange={setFormContent} />
                    )}
                  </div>
                ) : (
                  <textarea
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    className="w-full flex-1 p-4 border rounded-lg font-mono text-sm bg-gray-50 focus:ring-2 focus:ring-green-300 focus:border-green-400 resize-none"
                    style={{ minHeight: 'calc(96vh - 380px)' }}
                    spellCheck={false}
                  />
                )}

                {/* JSON validation preview */}
                {(() => {
                  try {
                    JSON.parse(formContent)
                    return (
                      <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                        JSON válido
                      </div>
                    )
                  } catch { return (
                    <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
                      <AlertTriangle className="h-3 w-3" />
                      JSON inválido - revisa el formato
                    </div>
                  )}
                })()}
              </div>
            </div>

            {/* Footer — Save / Cancel */}
            <div className="shrink-0 flex gap-3 justify-end px-6 py-3 border-t bg-gray-50">
              <Button variant="outline" className="h-10 px-6" onClick={resetForm}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isSaving || !formTitle || !formContent}
                className="h-10 px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingTemplate ? 'Guardar Cambios' : 'Crear Plantilla'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
