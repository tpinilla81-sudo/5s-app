'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { use5SStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Plus, Trash2, Edit3, Save, Loader2, BookOpen, FileCheck, ClipboardCheck, Camera,
  ChevronDown, ChevronUp, AlertTriangle, Copy, RotateCcw, X,
  Eye, Code, GripVertical, Download, Upload, ClipboardList, Award,
  ClipboardPaste, ClipboardCopy, Check, ArrowRightLeft,
  Play, SearchCheck, Rocket, Target, Sparkles,
} from 'lucide-react'
import { S_STEPS, AUDIT_CHECKLISTS, EXAM_PASS_THRESHOLD, SELF_EVAL_THRESHOLD, AUDIT_PASS_THRESHOLD, INVENTORY_CONFIGS, MC_STEP_CONFIG, MC_PASO_CONFIG, PDCA_STEPS } from '@/lib/5s-constants'

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

// TemplateTab and TEMPLATE_TABS removed — now organized by S-step → Paso

const S_COLORS: Record<number, string> = { 1: '#8B5CF6', 2: '#EAB308', 3: '#3B82F6', 4: '#F43F5E', 5: '#F97316', 6: '#16A34A' }

// MC Paso icon mapping
const MC_PASO_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Play, ClipboardList, SearchCheck, Rocket, Target,
}

const MINI_STEPS_LABELS: Record<number, string> = {
  1: 'Formación y Exámenes',
  2: 'Fotografías (Antes/Después)',
  3: 'Inventario / Estándar / Layout / Plan Limpieza',
  4: 'Autoevaluación / Plan de Acción',
  5: 'Auditoría Externa / PDCA',
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

  // S2: Use the comprehensive Seiton template matching the user's Excel structure
  // (categories by element type with hierarchical subcategories + traceability codes)
  if (sStep === 2) {
    return {
      title: 'Inventario de Necesarios',
      subtitle: 'SEITON — Organiza los elementos necesarios en su ubicación correcta',
      templateName: 'S2_Inventario_Necesarios_Seiton.xlsx',
      categories: [
        { value: 'materiales', label: 'MATERIALES', color: 'bg-blue-100 text-blue-800' },
        { value: 'maquinas_equipos', label: 'MÁQUINAS Y EQUIPOS', color: 'bg-purple-100 text-purple-800' },
        { value: 'mobiliario', label: 'MOBILIARIO', color: 'bg-amber-100 text-amber-800' },
        { value: 'informacion', label: 'INFORMACIÓN', color: 'bg-teal-100 text-teal-800' },
        { value: 'transporte_almacenaje', label: 'TRANSPORTE Y ALMACENAJE', color: 'bg-orange-100 text-orange-800' },
      ],
      extraFields: [
        { key: 'codigo', label: 'Código de Trazabilidad', type: 'text' },
        { key: 'subcategoria', label: 'Subcategoría', type: 'select', options: [
          'Consumibles', 'Materia Prima', 'Producto en proceso', 'Producto acabado',
          'Máquinas de trabajo', 'Utillajes de trabajo', 'Equipos y accesorios de Elevación',
          'Equipos de ensayo y verificación', 'Herramientas de ensamblaje', 'Equipos informáticos', 'Equipos de limpieza',
          'Bancos de trabajo', 'Paneles herramienta', 'Armarios o taquillas', 'Sillas, mesas', 'Paneles u otros soportes para información',
          'Planos, instrucciones, boletines de trabajo', 'Posters u otra información divulgativa', 'Información referente a indicadores', 'Carpeta o bandejas con documentación', 'Información de seguridad',
          'Máquinas de transporte', 'Utillajes de transporte, Pallets, embalajes de madera, cajas', 'Estanterías, gavetas, contenedores', 'Bolsas, plásticos, protecciones, elementos de flejado', 'Carros de transporte',
        ]},
        { key: 'zona_destino', label: 'Zona Actual / Destino', type: 'text' },
        { key: 'responsable', label: 'Responsable / Área', type: 'text' },
        { key: 'estado', label: 'Estado de Conservación', type: 'select', options: ['Excelente', 'Bueno', 'Regular', 'Requiere Mantenimiento'] },
      ],
      desplegables_jerarquicos: {
        'MATERIALES': { prefijo_codigo: 'MAT', subcategorias: ['Consumibles', 'Materia Prima', 'Producto en proceso', 'Producto acabado'] },
        'MÁQUINAS Y EQUIPOS': { prefijo_codigo: 'MAQ', subcategorias: ['Máquinas de trabajo', 'Utillajes de trabajo', 'Equipos y accesorios de Elevación', 'Equipos de ensayo y verificación', 'Herramientas de ensamblaje', 'Equipos informáticos', 'Equipos de limpieza'] },
        'MOBILIARIO': { prefijo_codigo: 'MOB', subcategorias: ['Bancos de trabajo', 'Paneles herramienta', 'Armarios o taquillas', 'Sillas, mesas', 'Paneles u otros soportes para información'] },
        'INFORMACIÓN': { prefijo_codigo: 'INF', subcategorias: ['Planos, instrucciones, boletines de trabajo', 'Posters u otra información divulgativa', 'Información referente a indicadores', 'Carpeta o bandejas con documentación', 'Información de seguridad'] },
        'TRANSPORTE Y ALMACENAJE': { prefijo_codigo: 'TRA', subcategorias: ['Máquinas de transporte', 'Utillajes de transporte, Pallets, embalajes de madera, cajas', 'Estanterías, gavetas, contenedores', 'Bolsas, plásticos, protecciones, elementos de flejado', 'Carros de transporte'] },
      },
    }
  }

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

function getDefaultPlanAccionContent(sStep: number) {
  const S_JAPANESE = ['Seiri', 'Seiton', 'Seiso', 'Seiketsu', 'Shitsuke']
  const S_NAMES = ['Revisar', 'Ordenar', 'Limpiar', 'Estandarizar', 'Mantener']
  return {
    tableType: 'plan_accion',
    description: `Plan de Acción para ${S_JAPANESE[sStep - 1]} (${S_NAMES[sStep - 1]}). Registro de deficiencias encontradas en las autoevaluaciones y auditorías, con las acciones correctivas y preventivas propuestas, responsables y fechas de realización.`,
    columns: [
      { key: 'numeroEntrada', label: 'Nº Entrada', type: 'text', width: '100px', description: 'Zona + S de origen + número correlativo', required: true, placeholder: 'Ej: A-S1-001' },
      { key: 'fechaInicial', label: 'Fecha Inicial', type: 'date', width: '110px', description: 'Fecha en la que entra la deficiencia', required: true },
      { key: 'auditor', label: 'Auditor', type: 'text', width: '120px', description: 'Quién ha hecho la auditoría o la autoevaluación', required: true },
      { key: 'semana', label: 'Semana', type: 'text', width: '80px', description: 'La semana de la fecha inicial' },
      { key: 'zona', label: 'Zona', type: 'text', width: '100px', description: 'Qué zona es la afectada', required: true },
      { key: 'descripcion', label: 'Descripción', type: 'textarea', width: '200px', description: 'Descripción de la deficiencia encontrada', required: true },
      { key: 'accionCorrectiva', label: 'Acción Correctiva', type: 'textarea', width: '180px', description: 'Lo que se va a hacer ahora para corregir', required: true },
      { key: 'accionesPreventivas', label: 'Acciones Preventivas', type: 'textarea', width: '180px', description: 'Lo que se va a hacer para que no ocurra otra vez' },
      { key: 'semanaPrevista', label: 'Semana Prevista', type: 'text', width: '100px', description: 'La semana prevista para llevar las acciones preventivas' },
      { key: 'personaResponsable', label: 'Persona Responsable', type: 'text', width: '130px', description: 'Quién es el responsable', required: true },
      { key: 'estado', label: 'Estado', type: 'select', width: '110px', description: 'Progreso: Empezado (25%), Medio (50%), Casi Hecho (75%), Finalizado (100%)', options: ['Empezado (25%)', 'Medio (50%)', 'Casi Hecho (75%)', 'Finalizado (100%)'] },
      { key: 'progreso', label: 'Progreso %', type: 'number', width: '80px', description: 'Progreso en %: 25, 50, 75 o 100', min: 0, max: 100 },
      { key: 'semanaReal', label: 'Semana Real', type: 'text', width: '100px', description: 'Semana real de la finalización' },
    ],
    sourceTypes: ['autoevaluacion', 'auditoria'],
    sStep: sStep,
  }
}

function getDefaultLayoutContent(sStep: number) {
  return {
    layoutType: 'zone_layout',
    description: `Layout de la zona para S${sStep}. Dibuja o sube un plano de la zona indicando las áreas de trabajo, pasillos, ubicación de equipos y elementos estáticos.`,
    floorColors: [
      { color: '#0E6BA8', label: 'Azul RAL 5017 — Entrada de material', ral: 'RAL 5017' },
      { color: '#2D8C3C', label: 'Verde RAL 6032 — Salida de material premontado', ral: 'RAL 6032' },
      { color: '#E8E8E8', label: 'Blanco RAL 9003 — Elementos estáticos', ral: 'RAL 9003' },
      { color: '#F5E649', label: 'Amarillo RAL 1016 — Área de trabajo', ral: 'RAL 1016' },
      { color: '#CC0000', label: 'Rojo RAL 3000 — Equipos contra incendios', ral: 'RAL 3000' },
      { color: '#F5A623', label: 'Amarillo anaranjado RAL 1003 — Elementos de seguridad', ral: 'RAL 1003' },
    ],
    drawTools: ['select', 'rect', 'circle', 'line', 'arrow', 'text'],
    sStep: sStep,
    targetStandardCategory: 'layout',
    targetS4Library: true,
  }
}

function getDefaultPlanLimpiezaContent(sStep: number) {
  return {
    planType: 'inspection_cleaning',
    description: `Plan de Inspección y Limpieza para S${sStep}. Define la ruta de inspección, los puntos de suciedad que no se pueden eliminar y las acciones de limpieza para la zona.`,
    sections: [
      { key: 'ruta_inspeccion', label: 'Ruta de Inspección', type: 'route', description: 'Define el recorrido de inspección paso a paso' },
      { key: 'puntos_suciedad', label: 'Puntos de Suciedad No Eliminables', type: 'checklist', description: 'Lista de puntos de suciedad que no se pueden eliminar, con acciones preventivas' },
      { key: 'acciones_limpieza', label: 'Acciones de Limpieza', type: 'list', description: 'Acciones de limpieza a realizar en cada punto' },
      { key: 'frecuencia', label: 'Frecuencia', type: 'select', options: ['Diaria', 'Semanal', 'Quincenal', 'Mensual'], description: 'Frecuencia de inspección' },
      { key: 'responsable', label: 'Responsable', type: 'text', description: 'Persona responsable de la inspección' },
    ],
    sStep: sStep,
    targetStandardCategory: 'plan_limpieza',
    targetS4Library: true,
  }
}

function getDefaultPDCAContent(sStep: number) {
  return {
    pdcaType: 'continuous_improvement_board',
    description: `Tablero PDCA para S${sStep}. Herramienta de mejora continua después de acabar las 5S en la que se registra y se dirige las 5S. Incluye el Plan de Acción y KPIs referentes que indican progreso y trabajo realizado y por realizar.`,
    phases: [
      { key: 'plan', label: 'PLAN', labelEs: 'Planificar', description: 'Identificar problemas, establecer objetivos y definir planes de acción', color: '#3B82F6' },
      { key: 'do', label: 'DO', labelEs: 'Ejecutar', description: 'Implementar las acciones planificadas y recopilar datos', color: '#22C55E' },
      { key: 'check', label: 'CHECK', labelEs: 'Verificar', description: 'Analizar los resultados y comparar con los objetivos', color: '#EAB308' },
      { key: 'act', label: 'ACT', labelEs: 'Actuar', description: 'Estandarizar lo que funciona y corregir lo que no', color: '#F97316' },
    ],
    kpis: [
      { key: 'completion_rate', label: 'Tasa de Completado', description: 'Porcentaje de elementos PDCA completados' },
      { key: 'action_progress', label: 'Progreso del Plan de Acción', description: 'Progreso medio del Plan de Acción' },
      { key: 'open_actions', label: 'Acciones Abiertas', description: 'Acciones del plan de acción en estado abierta' },
      { key: 'overdue_items', label: 'Elementos Vencidos', description: 'Elementos PDCA con fecha límite pasada' },
    ],
    links: ['plan_accion', 'standards_library'],
    sStep: sStep,
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

function InventoryConfigEditor({ content, onChange, sStep }: { content: string; onChange: (v: string) => void; sStep: number }) {
  let parsed: { categories: InvCategory[]; extraFields: InvField[]; fixedFields?: InvFixedField[]; title?: string; subtitle?: string; templateName?: string }
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

  // Built-in fields that always appear in the inventory form (not editable in template, shown for reference)
  const builtInFields: { label: string; section: string; note?: string }[] = sStep === 1
    ? [
        { label: 'Elemento', section: 'Datos básicos', note: 'Nombre del elemento (obligatorio)' },
        { label: 'Zona', section: 'Datos básicos', note: 'Se rellena automáticamente con la zona actual' },
        { label: 'Categoría', section: 'Datos básicos', note: 'Innecesario (fijo)' },
        { label: 'Cantidad', section: 'Datos básicos' },
        { label: 'Precio (€)', section: 'Datos básicos' },
        { label: 'F. Entrada', section: 'Etiqueta', note: 'Fecha de entrada a la Jaula' },
        { label: 'F. Revisión', section: 'Etiqueta', note: 'Calculada automáticamente (F. Entrada + Días cuarentena)' },
        { label: 'Z. Origen', section: 'Zonas', note: 'Zona donde se encontró el elemento' },
        { label: 'Z. Destino', section: 'Zonas', note: 'Siempre "Jaula" para innecesarios' },
      ]
    : sStep === 2
    ? [
        { label: 'Elemento', section: 'Datos básicos' },
        { label: 'Ubicación', section: 'Datos básicos' },
        { label: 'Zona', section: 'Datos básicos' },
        { label: 'Categoría', section: 'Datos básicos' },
        { label: 'Total exist.', section: 'Datos básicos' },
        { label: 'Precio (€)', section: 'Datos básicos' },
      ]
    : [
        { label: 'Elemento', section: 'Datos básicos' },
        { label: 'Ubicación', section: 'Datos básicos' },
        { label: 'Zona', section: 'Datos básicos' },
        { label: 'Categoría', section: 'Datos básicos' },
        { label: 'Total exist.', section: 'Datos básicos' },
        { label: 'Precio (€)', section: 'Datos básicos' },
      ]

  return (
    <div className="space-y-6">
      {/* BUILT-IN FIELDS (read-only reference) */}
      <div>
        <h4 className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-800">Campos fijos del formulario</Badge>
          {builtInFields.length} campo(s) — no editables
        </h4>
        <div className="border rounded-lg p-3 bg-blue-50/30 space-y-1">
          <p className="text-[10px] text-blue-600 mb-2">Estos campos siempre aparecen en el inventario y no se pueden quitar de la plantilla.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {builtInFields.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-white/60">
                <span className="font-medium text-blue-800">{f.label}</span>
                <span className="text-blue-400">—</span>
                <span className="text-blue-500 text-[10px]">{f.section}</span>
                {f.note && <span className="text-[9px] text-blue-400 italic">({f.note})</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

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
// VISUAL EDITOR: PlanAccionEditor (plan_accion)
// ═══════════════════════════════════════════════════════
interface PlanAccionColumn {
  key: string; label: string; type: string; width?: string; description?: string;
  required?: boolean; placeholder?: string; options?: string[]; min?: number; max?: number;
}

function PlanAccionEditor({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  let parsed: { tableType: string; description?: string; columns: PlanAccionColumn[]; sourceTypes?: string[] }
  try {
    parsed = JSON.parse(content)
  } catch {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
        El JSON no es válido. Corrígelo en modo JSON o carga el contenido por defecto.
      </div>
    )
  }

  const columns = parsed.columns || []

  const update = (newData: Partial<typeof parsed>) => {
    onChange(JSON.stringify({ ...parsed, ...newData }, null, 2))
  }

  const addColumn = () => {
    update({ columns: [...columns, { key: '', label: '', type: 'text' }] })
  }

  const removeColumn = (idx: number) => {
    update({ columns: columns.filter((_, i) => i !== idx) })
  }

  const updateColumn = (idx: number, field: string, value: string | boolean | number) => {
    const updated = [...columns]
    updated[idx] = { ...updated[idx], [field]: value }
    // Remove options if type is not select
    if (field === 'type' && value !== 'select') {
      const { options, ...rest } = updated[idx]
      updated[idx] = rest as PlanAccionColumn
    }
    update({ columns: updated })
  }

  const moveColumn = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= columns.length) return
    const updated = [...columns]
    ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
    update({ columns: updated })
  }

  const addOption = (cIdx: number) => {
    const updated = [...columns]
    const opts = [...(updated[cIdx].options || []), '']
    updated[cIdx] = { ...updated[cIdx], options: opts }
    update({ columns: updated })
  }

  const removeOption = (cIdx: number, oIdx: number) => {
    const updated = [...columns]
    const opts = (updated[cIdx].options || []).filter((_, i) => i !== oIdx)
    updated[cIdx] = { ...updated[cIdx], options: opts }
    update({ columns: updated })
  }

  const updateOption = (cIdx: number, oIdx: number, value: string) => {
    const updated = [...columns]
    const opts = [...(updated[cIdx].options || [])]
    opts[oIdx] = value
    updated[cIdx] = { ...updated[cIdx], options: opts }
    update({ columns: updated })
  }

  const TYPE_LABELS: Record<string, string> = { text: 'Texto', textarea: 'Texto largo', number: 'Número', date: 'Fecha', select: 'Selección' }

  return (
    <div className="space-y-4">
      {/* Description */}
      <div>
        <Label className="text-sm font-semibold text-rose-700">Descripción del Plan de Acción</Label>
        <textarea
          value={parsed.description || ''}
          onChange={(e) => update({ description: e.target.value })}
          className="w-full h-20 p-3 border rounded-lg text-sm mt-1 resize-y focus:ring-2 focus:ring-rose-300 focus:border-rose-400"
          placeholder="Descripción del plan de acción..."
        />
      </div>

      {/* Info banner */}
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
        <p className="text-xs text-rose-700">
          <strong>Plan de Acción:</strong> Registro de deficiencias detectadas en las autoevaluaciones y auditorías.
          Cada columna define un campo de la tabla donde se registrarán las acciones correctivas/preventivas, responsables y seguimiento del progreso.
        </p>
      </div>

      {/* Columns */}
      <div>
        <h4 className="text-sm font-bold text-rose-700 mb-2 flex items-center gap-2">
          <Badge className="bg-rose-100 text-rose-800">Columnas de la tabla</Badge>
          {columns.length} columna(s)
        </h4>
        <div className="space-y-2">
          {columns.map((col, cIdx) => (
            <div key={cIdx} className="border-2 rounded-lg overflow-hidden bg-white shadow-sm">
              <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border-b border-rose-200">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveColumn(cIdx, -1)} className="text-gray-300 hover:text-gray-500 leading-none">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => moveColumn(cIdx, 1)} className="text-gray-300 hover:text-gray-500 leading-none">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Badge className="bg-rose-200 text-rose-800 shrink-0 text-[10px] px-1.5 py-0.5">Col {cIdx + 1}</Badge>
                <Input value={col.key} onChange={e => updateColumn(cIdx, 'key', e.target.value)}
                  className="w-32 h-7 text-xs font-mono" placeholder="key (ej: zona)" />
                <Input value={col.label} onChange={e => updateColumn(cIdx, 'label', e.target.value)}
                  className="flex-1 h-7 text-xs" placeholder="Etiqueta (ej: Zona)" />
                <select value={col.type} onChange={e => updateColumn(cIdx, 'type', e.target.value)}
                  className="h-7 text-xs border rounded px-2">
                  <option value="text">Texto</option>
                  <option value="textarea">Texto largo</option>
                  <option value="number">Número</option>
                  <option value="date">Fecha</option>
                  <option value="select">Selección</option>
                </select>
                <label className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap cursor-pointer">
                  <input type="checkbox" checked={col.required || false}
                    onChange={e => updateColumn(cIdx, 'required', e.target.checked)}
                    className="rounded border-gray-300 h-3.5 w-3.5" />
                  Oblig.
                </label>
                <Button variant="ghost" size="sm" onClick={() => removeColumn(cIdx)}
                  className="h-7 w-7 p-0 text-red-400 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="px-3 py-2 space-y-1.5">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-[10px] text-muted-foreground">Descripción / Ayuda</Label>
                    <Input value={col.description || ''} onChange={e => updateColumn(cIdx, 'description', e.target.value)}
                      className="h-7 text-xs mt-0.5" placeholder="Texto de ayuda para este campo" />
                  </div>
                  <div className="w-28">
                    <Label className="text-[10px] text-muted-foreground">Ancho</Label>
                    <Input value={col.width || ''} onChange={e => updateColumn(cIdx, 'width', e.target.value)}
                      className="h-7 text-xs mt-0.5" placeholder="100px" />
                  </div>
                  {col.type === 'text' && (
                    <div className="w-32">
                      <Label className="text-[10px] text-muted-foreground">Placeholder</Label>
                      <Input value={col.placeholder || ''} onChange={e => updateColumn(cIdx, 'placeholder', e.target.value)}
                        className="h-7 text-xs mt-0.5" placeholder="Ej: A-S1-001" />
                    </div>
                  )}
                </div>
                {col.type === 'select' && (
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Opciones:</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(col.options || []).map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-1">
                          <Input value={opt} onChange={e => updateOption(cIdx, oIdx, e.target.value)}
                            className="h-7 text-xs w-32" placeholder={`Opción ${oIdx + 1}`} />
                          <Button variant="ghost" size="sm" onClick={() => removeOption(cIdx, oIdx)}
                            className="h-7 w-7 p-0 text-red-300 hover:text-red-500">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" onClick={() => addOption(cIdx)}
                        className="h-7 text-xs text-rose-600 hover:text-rose-700 gap-1 px-2">
                        <Plus className="h-3 w-3" /> Añadir
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addColumn} size="sm"
            className="w-full border-dashed border-2 text-rose-600 hover:bg-rose-50 hover:border-rose-400 gap-1">
            <Plus className="h-4 w-4" /> Añadir columna
          </Button>
        </div>
      </div>

      {/* Source types info */}
      <div className="bg-gray-50 border rounded-lg p-3">
        <p className="text-xs text-gray-500">
          <strong>Tipos de origen:</strong> {(parsed.sourceTypes || []).join(', ') || 'autoevaluacion, auditoria'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Las deficiencias se alimentan automáticamente desde las autoevaluaciones y auditorías de este mismo paso S.
        </p>
      </div>

      <div className="text-sm text-muted-foreground text-center">
        {columns.length} columna(s) · {columns.filter(c => c.required).length} obligatoria(s)
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// VISUAL EDITOR: LayoutTemplateEditor (layout)
// ═══════════════════════════════════════════════════════
function LayoutTemplateEditor({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  let parsed: any = {}
  try { parsed = JSON.parse(content) } catch { /* empty */ }

  const updateField = (key: string, value: any) => {
    const updated = { ...parsed, [key]: value }
    onChange(JSON.stringify(updated, null, 2))
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-700 font-semibold">Layout de Zona</p>
        <p className="text-xs text-blue-600 mt-1">
          Esta plantilla configura la herramienta de dibujo/subida de layout de zona.
          Los layouts creados se guardarán como estándares en la Biblioteca de S4.
        </p>
      </div>

      <div>
        <Label className="text-xs font-semibold">Descripción</Label>
        <Textarea
          value={parsed.description || ''}
          onChange={e => updateField('description', e.target.value)}
          placeholder="Describe el propósito del layout de zona..."
          className="text-xs min-h-[60px]"
        />
      </div>

      <div>
        <Label className="text-xs font-semibold">Tipo de Layout</Label>
        <Input
          value={parsed.layoutType || 'zone_layout'}
          onChange={e => updateField('layoutType', e.target.value)}
          className="h-8 text-xs"
        />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" checked={parsed.targetS4Library === true}
          onChange={e => updateField('targetS4Library', e.target.checked)} />
        <Label className="text-xs">Enviar a Biblioteca de Estándares de S4</Label>
      </div>

      <div className="bg-gray-50 border rounded-lg p-3">
        <p className="text-xs font-semibold text-gray-700 mb-2">Colores de Suelo (RAL)</p>
        {(parsed.floorColors || []).map((fc: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 rounded border" style={{ backgroundColor: fc.color }} />
            <span className="text-[10px]">{fc.label} ({fc.ral})</span>
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground mt-1">Los colores RAL se configuran desde el editor de layout.</p>
      </div>

      <div className="text-sm text-muted-foreground text-center">
        Layout de Zona · Herramienta de dibujo/subida integrada
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// VISUAL EDITOR: PlanLimpiezaTemplateEditor (plan_limpieza)
// ═══════════════════════════════════════════════════════
interface PlanLimpiezaSection {
  key: string; label: string; type: string; description: string; options?: string[];
}

function PlanLimpiezaTemplateEditor({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  let parsed: any = {}
  try { parsed = JSON.parse(content) } catch { /* empty */ }

  const sections: PlanLimpiezaSection[] = parsed.sections || []

  const updateField = (key: string, value: any) => {
    const updated = { ...parsed, [key]: value }
    onChange(JSON.stringify(updated, null, 2))
  }

  const updateSection = (index: number, field: string, value: any) => {
    const newSections = [...sections]
    newSections[index] = { ...newSections[index], [field]: value }
    updateField('sections', newSections)
  }

  const addSection = () => {
    const newSections = [...sections, { key: `seccion_${sections.length + 1}`, label: 'Nueva Sección', type: 'text', description: '' }]
    updateField('sections', newSections)
  }

  const removeSection = (index: number) => {
    const newSections = sections.filter((_: any, i: number) => i !== index)
    updateField('sections', newSections)
  }

  return (
    <div className="space-y-4">
      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
        <p className="text-xs text-cyan-700 font-semibold">Plan de Inspección y Limpieza</p>
        <p className="text-xs text-cyan-600 mt-1">
          Define la ruta de inspección, los puntos de suciedad no eliminables y las acciones de limpieza.
          Los planes creados se guardarán como estándares en la Biblioteca de S4.
        </p>
      </div>

      <div>
        <Label className="text-xs font-semibold">Descripción</Label>
        <Textarea
          value={parsed.description || ''}
          onChange={e => updateField('description', e.target.value)}
          placeholder="Describe el plan de inspección y limpieza..."
          className="text-xs min-h-[60px]"
        />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" checked={parsed.targetS4Library === true}
          onChange={e => updateField('targetS4Library', e.target.checked)} />
        <Label className="text-xs">Enviar a Biblioteca de Estándares de S4</Label>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold">Secciones del Plan</Label>
          <Button variant="outline" size="sm" onClick={addSection} className="h-6 text-[10px] gap-1">
            <Plus className="h-3 w-3" /> Añadir Sección
          </Button>
        </div>
        {sections.map((sec, i) => (
          <div key={i} className="bg-white border rounded-lg p-3 mb-2">
            <div className="flex items-center gap-2 mb-2">
              <Input value={sec.key} onChange={e => updateSection(i, 'key', e.target.value)}
                className="h-7 text-xs flex-1" placeholder="key" />
              <Input value={sec.label} onChange={e => updateSection(i, 'label', e.target.value)}
                className="h-7 text-xs flex-1" placeholder="Etiqueta" />
              <Select value={sec.type} onValueChange={v => updateSection(i, 'type', v)}>
                <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="route">Ruta</SelectItem>
                  <SelectItem value="checklist">Checklist</SelectItem>
                  <SelectItem value="list">Lista</SelectItem>
                  <SelectItem value="select">Selección</SelectItem>
                  <SelectItem value="text">Texto</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => removeSection(i)} className="h-7 w-7 p-0 text-red-500">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <Input value={sec.description || ''} onChange={e => updateSection(i, 'description', e.target.value)}
              className="h-7 text-xs" placeholder="Descripción de la sección" />
            {sec.type === 'select' && (
              <Input
                value={(sec.options || []).join(', ')}
                onChange={e => updateSection(i, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="h-7 text-xs mt-1" placeholder="Opciones separadas por coma"
              />
            )}
          </div>
        ))}
      </div>

      <div className="text-sm text-muted-foreground text-center">
        {sections.length} sección(es) · Plan de Inspección y Limpieza
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// VISUAL EDITOR: PDCATemplateEditor (pdca)
// ═══════════════════════════════════════════════════════
function PDCATemplateEditor({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  let parsed: any = {}
  try { parsed = JSON.parse(content) } catch { /* empty */ }

  const updateField = (key: string, value: any) => {
    const updated = { ...parsed, [key]: value }
    onChange(JSON.stringify(updated, null, 2))
  }

  return (
    <div className="space-y-4">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
        <p className="text-xs text-orange-700 font-semibold">Tablero PDCA — Mejora Continua</p>
        <p className="text-xs text-orange-600 mt-1">
          Configuración del tablero PDCA (Plan-Do-Check-Act) como herramienta de mejora continua.
          Incluye KPIs de progreso y enlace al Plan de Acción y Biblioteca de Estándares.
        </p>
      </div>

      <div>
        <Label className="text-xs font-semibold">Descripción</Label>
        <Textarea
          value={parsed.description || ''}
          onChange={e => updateField('description', e.target.value)}
          placeholder="Describe el tablero PDCA..."
          className="text-xs min-h-[60px]"
        />
      </div>

      <div>
        <Label className="text-xs font-semibold mb-2 block">Fases PDCA</Label>
        {(parsed.phases || []).map((phase: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mb-2 bg-white border rounded-lg p-2">
            <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold"
              style={{ backgroundColor: phase.color }}>
              {phase.label?.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">{phase.label}</span>
                <span className="text-[10px] text-muted-foreground">({phase.labelEs})</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{phase.description}</p>
            </div>
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground mt-1">Las fases PDCA son fijas (Plan-Do-Check-Act) y no se pueden modificar.</p>
      </div>

      <div>
        <Label className="text-xs font-semibold mb-2 block">KPIs del Tablero</Label>
        {(parsed.kpis || []).map((kpi: any, i: number) => (
          <div key={i} className="bg-white border rounded-lg p-2 mb-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-100 text-orange-800 text-[9px]">{kpi.key}</Badge>
              <span className="text-xs font-semibold">{kpi.label}</span>
            </div>
            <p className="text-[10px] text-muted-foreground ml-2">{kpi.description}</p>
          </div>
        ))}
      </div>

      <div>
        <Label className="text-xs font-semibold mb-2 block">Enlaces Integrados</Label>
        <div className="flex gap-2">
          {(parsed.links || []).map((link: string, i: number) => (
            <Badge key={i} className="bg-teal-100 text-teal-800 text-[10px]">
              {link === 'plan_accion' ? '📋 Plan de Acción' : link === 'standards_library' ? '📚 Biblioteca' : link}
            </Badge>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          El tablero PDCA se enlaza automáticamente con el Plan de Acción y la Biblioteca de Estándares.
        </p>
      </div>

      <div className="text-sm text-muted-foreground text-center">
        Tablero PDCA · Mejora Continua · {(parsed.phases || []).length} fases · {(parsed.kpis || []).length} KPIs
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// PASO DEFINITIONS — which template types belong to each paso
// ═══════════════════════════════════════════════════════
const PASO_CONFIG: { paso: number; label: string; icon: React.ComponentType<{ className?: string }>; types: string[] }[] = [
  { paso: 1, label: 'Formación y Exámenes', icon: BookOpen, types: ['formacion', 'examen'] },
  { paso: 2, label: 'Fotografías (Antes/Después)', icon: Camera, types: ['fotos'] },
  { paso: 3, label: 'Inventario / Estándar / Layout / Plan Limpieza', icon: ClipboardList, types: ['inventario', 'estandar', 'layout', 'plan_limpieza'] },
  { paso: 4, label: 'Autoevaluación / Plan de Acción', icon: ClipboardCheck, types: ['autoevaluacion', 'plan_accion'] },
  { paso: 5, label: 'Auditoría Externa / PDCA', icon: FileCheck, types: ['auditoria', 'pdca'] },
]

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
export default function TemplateManager() {
  const { currentProject } = use5SStore()
  const [templates, setTemplates] = useState<TemplateData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TemplateData | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [expandedS, setExpandedS] = useState<number | null>(null)
  const [expandedPaso, setExpandedPaso] = useState<string | null>(null) // 'S2-P3' format
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

  // Save feedback
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Fetch ALL templates at once (all types)
  const ALL_TYPES = ['formacion', 'examen', 'fotos', 'inventario', 'estandar', 'layout', 'plan_limpieza', 'autoevaluacion', 'plan_accion', 'auditoria', 'pdca'] as const

  const fetchTemplates = useCallback(async (withSeed = false) => {
    setIsLoading(true)
    try {
      // Run seed on first load to ensure miniStep values are correct.
      // The seed now fixes miniStep and creates missing templates.
      if (withSeed) {
        try {
          await fetch('/api/seed/templates', { method: 'POST' })
        } catch (e) {
          console.error('Auto-seed error:', e)
        }
      }

      // Fetch all templates
      const allTemplates: TemplateData[] = []
      for (const type of ALL_TYPES) {
        const res = await fetch(`/api/templates?type=${type}&includeInactive=true`)
        const data = await res.json()
        if (data.success && data.data) allTemplates.push(...data.data)
      }
      setTemplates(allTemplates)
    } catch (e) { console.error('Error fetching templates:', e) }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { fetchTemplates(true) }, [fetchTemplates])

  const resetForm = () => {
    setFormType('formacion')
    setFormSStep(1)
    setFormMiniStep(1)
    setFormTitle('')
    setFormDescription('')
    setFormContent('')
    setFormNotaMinima(EXAM_PASS_THRESHOLD)
    setFormActive(true)
    setEditingTemplate(null)
    setIsCreating(false)
    setEditorMode('visual')
  }

  const startCreate = (sStep: number, type: string, miniStep: number = 3) => {
    setIsCreating(true)
    setFormType(type)
    setFormSStep(sStep)
    setFormMiniStep(miniStep)
    // MC templates use sStep=0, title shows MC instead of S0
    if (sStep === 0) {
      const mcPasoLabel = MC_PASO_CONFIG.find(p => p.paso === miniStep)?.label || ''
      setFormTitle(`MC - ${mcPasoLabel}`)
    } else {
      setFormTitle(`S${sStep} - ${S_STEPS.find(s => s.id === sStep)?.japaneseName || ''}`)
    }
    setFormDescription('')
    const aplicaNota = type === 'examen' || type === 'autoevaluacion' || type === 'auditoria'
    setNotaMinimaAplica(aplicaNota)
    setFormNotaMinima(aplicaNota ? (type === 'examen' ? EXAM_PASS_THRESHOLD : type === 'autoevaluacion' ? SELF_EVAL_THRESHOLD : AUDIT_PASS_THRESHOLD) : null)
    setFormActive(true)
    setEditorMode('visual')

    // Auto-set miniStep based on type
    const autoMiniStep = type === 'formacion' || type === 'examen' ? 1 : type === 'fotos' ? 2 : type === 'inventario' || type === 'estandar' || type === 'layout' || type === 'plan_limpieza' ? 3 : type === 'autoevaluacion' || type === 'plan_accion' ? 4 : type === 'auditoria' || type === 'pdca' ? 5 : miniStep
    setFormMiniStep(autoMiniStep)

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
    } else if (type === 'layout') {
      setFormContent(JSON.stringify(getDefaultLayoutContent(sStep), null, 2))
    } else if (type === 'plan_limpieza') {
      setFormContent(JSON.stringify(getDefaultPlanLimpiezaContent(sStep), null, 2))
    } else if (type === 'pdca') {
      setFormContent(JSON.stringify(getDefaultPDCAContent(sStep), null, 2))
    } else if (type === 'plan_accion') {
      setFormContent(JSON.stringify(getDefaultPlanAccionContent(sStep), null, 2))
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
      setSaveMessage('Plantilla guardada correctamente')
      setTimeout(() => setSaveMessage(null), 3000)
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

  const handleMovePaso = async (templateId: string, newMiniStep: number) => {
    try {
      const res = await fetch('/api/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: templateId, miniStep: newMiniStep }),
      })
      const data = await res.json()
      if (data.success) {
        fetchTemplates()
        setSaveMessage(`Plantilla movida a Paso ${newMiniStep}`)
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        alert('Error al mover la plantilla: ' + data.error)
      }
    } catch (e) {
      console.error(e)
      alert('Error al mover la plantilla')
    }
  }

  // Full template export format (includes metadata + content)
  const exportTemplateData = (template: TemplateData) => ({
    _5sTemplateExport: true,
    version: 1,
    type: template.type,
    sStep: template.sStep,
    miniStep: template.miniStep,
    title: template.title,
    description: template.description,
    content: typeof template.content === 'string' ? JSON.parse(template.content) : template.content,
    notaMinima: template.notaMinima,
    active: template.active,
  })

  const handleDownload = (template: TemplateData) => {
    try {
      const data = exportTemplateData(template)
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

  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopyTemplate = async (template: TemplateData) => {
    try {
      const data = exportTemplateData(template)
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      setCopiedId(template.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Fallback: create temporary textarea
      try {
        const data = exportTemplateData(template)
        const text = JSON.stringify(data, null, 2)
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        setCopiedId(template.id)
        setTimeout(() => setCopiedId(null), 2000)
      } catch {
        alert('No se pudo copiar al portapapeles')
      }
    }
  }

  const importTemplateData = (data: any) => {
    // Check if it's a full export with metadata
    if (data && data._5sTemplateExport) {
      setFormType(data.type || 'formacion')
      setFormSStep(data.sStep || 1)
      setFormMiniStep(data.miniStep || 3)
      setFormTitle(data.title ? `${data.title} (copia)` : '')
      setFormDescription(data.description || '')
      setFormContent(JSON.stringify(data.content, null, 2))
      const aplicaNota = data.type === 'examen' || data.type === 'autoevaluacion' || data.type === 'auditoria'
      setNotaMinimaAplica(aplicaNota)
      setFormNotaMinima(data.notaMinima != null ? data.notaMinima : (aplicaNota ? (data.type === 'examen' ? EXAM_PASS_THRESHOLD : data.type === 'autoevaluacion' ? SELF_EVAL_THRESHOLD : AUDIT_PASS_THRESHOLD) : null))
      setFormActive(data.active !== false)
      setIsCreating(true)
      setEditorMode('visual')
    } else {
      // Legacy: just content, only set formContent
      setFormContent(JSON.stringify(data, null, 2))
    }
  }

  const handlePasteTemplate = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const data = JSON.parse(text)
      importTemplateData(data)
    } catch {
      alert('No se pudo leer del portapapeles. Asegúrate de que hay una plantilla copiada (formato JSON válido).')
    }
  }

  const handleDuplicateTemplate = async (template: TemplateData) => {
    try {
      const payload = {
        type: template.type,
        sStep: template.sStep,
        miniStep: template.miniStep,
        title: `${template.title} (copia)`,
        description: template.description,
        content: template.content,
        notaMinima: template.notaMinima,
        active: template.active,
      }
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) { alert('Error: ' + data.error); return }
      fetchTemplates()
    } catch {
      alert('Error al duplicar la plantilla')
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
          importTemplateData(data)
        } catch {
          alert('El archivo JSON no es válido')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const templatesByS = (sStep: number) => templates.filter(t => t.sStep === sStep)
  const templatesBySAndPaso = (sStep: number, miniStep: number) => templates.filter(t => t.sStep === sStep && t.miniStep === miniStep)

  // Count total templates for an S-step
  const countForS = (sStep: number) => templates.filter(t => t.sStep === sStep).length

  // Count templates for a specific paso within an S-step
  const countForPaso = (sStep: number, paso: number) => templates.filter(t => t.sStep === sStep && t.miniStep === paso).length
  const getTemplateSummary = (template: TemplateData) => {
    try {
      const data = typeof template.content === 'string' ? JSON.parse(template.content) : template.content
      if (data.questions) return `${data.questions.length} pregunta(s)`
      if (data.columns) return `${data.columns.length} columna(s)`
      if (data.fields) return `${data.fields.length} campo(s)`
      if (data.categories || data.extraFields) return `${(data.categories || []).length} cat. / ${(data.extraFields || []).length} campos`
      if (data.phases) return `${data.phases.length} fases PDCA · ${(data.kpis || []).length} KPIs`
      if (data.floorColors) return `${data.floorColors.length} colores RAL · Layout`
      if (data.planType === 'inspection_cleaning') return `${(data.sections || []).length} secciones · Plan Limpieza`
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
      {/* Header — title + actions */}
      <div className="flex items-center justify-between shrink-0 mb-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-green-600" />
          Plantillas Genéricas
          <Badge variant="outline" className="text-xs ml-2">
            {templates.length} plantilla{templates.length !== 1 ? 's' : ''} en total
          </Badge>
        </h2>
        <div className="flex items-center gap-2">
          {saveMessage && (
            <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded animate-pulse">
              {saveMessage}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handlePasteTemplate}
            className="gap-1 text-xs border-purple-300 text-purple-600 hover:bg-purple-50">
            <ClipboardPaste className="h-3.5 w-3.5" />
            Pegar plantilla
          </Button>
        </div>
      </div>

      {/* S-Step cards — organized by 5 pasos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto space-y-3">
          {S_STEPS.map(s => {
            const sTotal = countForS(s.id)
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
                      <span className="text-xs text-muted-foreground ml-2">— {s.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" style={{ color: S_COLORS[s.id], borderColor: S_COLORS[s.id] + '40' }}>
                      {sTotal} plantilla{sTotal !== 1 ? 's' : ''}
                    </Badge>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {/* Expanded — show 5 Pasos */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden">
                      <div className="p-4 space-y-3">
                        {PASO_CONFIG.map(pasoConfig => {
                          const pasoKey = `S${s.id}-P${pasoConfig.paso}`
                          const pasoTemplates = templatesBySAndPaso(s.id, pasoConfig.paso)
                          const pasoCount = pasoTemplates.length
                          const isPasoExpanded = expandedPaso === pasoKey
                          const PasoIcon = pasoConfig.icon

                          return (
                            <div key={pasoConfig.paso} className="rounded-lg border overflow-hidden"
                              style={{ borderColor: S_COLORS[s.id] + '25' }}>
                              {/* Paso Header */}
                              <div className="flex items-center justify-between px-3 py-2 cursor-pointer"
                                style={{ backgroundColor: S_COLORS[s.id] + '08' }}
                                onClick={() => setExpandedPaso(isPasoExpanded ? null : pasoKey)}>
                                <div className="flex items-center gap-2">
                                  <PasoIcon className="h-4 w-4" style={{ color: S_COLORS[s.id] }} />
                                  <span className="text-sm font-semibold" style={{ color: S_COLORS[s.id] }}>
                                    Paso {pasoConfig.paso}:
                                  </span>
                                  <span className="text-sm text-muted-foreground">{pasoConfig.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* Create buttons for this paso's types */}
                                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                    {pasoConfig.types.map(type => (
                                      <Button key={type} variant="outline" size="sm"
                                        className="h-6 px-2 text-[10px] gap-0.5"
                                        style={{ borderColor: S_COLORS[s.id] + '40', color: S_COLORS[s.id] }}
                                        onClick={() => startCreate(s.id, type, pasoConfig.paso)}>
                                        <Plus className="h-3 w-3" />
                                        {type === 'formacion' ? 'Formación' : type === 'examen' ? 'Examen' : type === 'autoevaluacion' ? 'Autoevaluación' : type === 'auditoria' ? 'Aud. Ext.' : type === 'inventario' ? 'Inventario' : type === 'fotos' ? 'Fotos' : type === 'plan_accion' ? 'Plan Acción' : 'Estándar'}
                                      </Button>
                                    ))}
                                  </div>
                                  <Badge variant="outline" className="text-[10px] h-5"
                                    style={{ color: S_COLORS[s.id], borderColor: S_COLORS[s.id] + '30' }}>
                                    {pasoCount}
                                  </Badge>
                                  {isPasoExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </div>
                              </div>

                              {/* Paso Expanded — template list */}
                              <AnimatePresence>
                                {isPasoExpanded && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden">
                                    <div className="px-3 pb-3 space-y-2">
                                      {pasoCount === 0 ? (
                                        <div className="text-center py-4 text-muted-foreground text-xs">
                                          Sin plantillas para este paso. Pulsa + para crear.
                                        </div>
                                      ) : (
                                        pasoTemplates.map(tpl => (
                                          <div key={tpl.id}
                                            className={`p-2.5 rounded-lg border ${tpl.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300 opacity-60'}`}>
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <Badge className="shrink-0" style={{
                                                  backgroundColor: tpl.type === 'formacion' ? '#DBEAFE' : tpl.type === 'examen' ? '#FEF3C7' : tpl.type === 'autoevaluacion' ? '#D1FAE5' : tpl.type === 'auditoria' ? '#FED7AA' : tpl.type === 'inventario' ? '#FFEDD5' : tpl.type === 'fotos' ? '#E0F2FE' : tpl.type === 'plan_accion' ? '#FFE4E6' : tpl.type === 'layout' ? '#DBEAFE' : tpl.type === 'plan_limpieza' ? '#CFFAFE' : tpl.type === 'pdca' ? '#FFF7ED' : '#EDE9FE',
                                                  color: tpl.type === 'formacion' ? '#1D4ED8' : tpl.type === 'examen' ? '#92400E' : tpl.type === 'autoevaluacion' ? '#065F46' : tpl.type === 'auditoria' ? '#9A3412' : tpl.type === 'inventario' ? '#9A3412' : tpl.type === 'fotos' ? '#0369A1' : tpl.type === 'plan_accion' ? '#9F1239' : tpl.type === 'layout' ? '#1D4ED8' : tpl.type === 'plan_limpieza' ? '#155E75' : tpl.type === 'pdca' ? '#9A3412' : '#6D28D9',
                                                }}>
                                                  {tpl.type === 'formacion' ? 'Formación' : tpl.type === 'examen' ? 'Examen' : tpl.type === 'autoevaluacion' ? 'Aut. Int.' : tpl.type === 'auditoria' ? 'Aud. Ext.' : tpl.type === 'inventario' ? 'Inventario' : tpl.type === 'fotos' ? 'Fotos' : tpl.type === 'plan_accion' ? 'Plan Acción' : tpl.type === 'layout' ? 'Layout' : tpl.type === 'plan_limpieza' ? 'Plan Limpieza' : tpl.type === 'pdca' ? 'PDCA' : 'Estándar'}
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
                                                {/* Move to Paso dropdown */}
                                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                                  <select
                                                    value={tpl.miniStep || 3}
                                                    onChange={(e) => handleMovePaso(tpl.id, Number(e.target.value))}
                                                    className="h-7 text-[10px] rounded border border-gray-200 bg-white px-1.5 pr-5 cursor-pointer hover:border-blue-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 appearance-none"
                                                    style={{ color: S_COLORS[tpl.sStep] }}
                                                    title="Mover a otro paso"
                                                  >
                                                    {[1, 2, 3, 4, 5].map(step => (
                                                      <option key={step} value={step}>
                                                        P{step}
                                                      </option>
                                                    ))}
                                                  </select>
                                                  <ArrowRightLeft className="absolute right-0.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-gray-400 pointer-events-none" />
                                                </div>
                                                <Button variant="ghost" size="sm" onClick={() => handleCopyTemplate(tpl)}
                                                  className="h-7 w-7 p-0 text-purple-500 hover:text-purple-700 hover:bg-purple-50" title="Copiar al portapapeles">
                                                  {copiedId === tpl.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDuplicateTemplate(tpl)}
                                                  className="h-7 w-7 p-0 text-amber-500 hover:text-amber-700 hover:bg-amber-50" title="Duplicar plantilla">
                                                  <ClipboardCopy className="h-3.5 w-3.5" />
                                                </Button>
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
                                        ))
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )
                        })}

                        {sTotal === 0 && (
                          <div className="text-center py-6 text-muted-foreground text-sm">
                            No hay plantillas para S{s.id}. Las plantillas por defecto se crean automáticamente.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}

          {/* ═══════════ MC — Mejora Continua (Phase 6) ═══════════ */}
          {(() => {
            const mcColor = MC_STEP_CONFIG.color
            const mcTotal = templates.filter(t => t.sStep === 0 && t.type === 'pdca').length + templates.filter(t => t.sStep === 0 && (t.type === 'plan_accion' || t.type === 'kpi' || t.type === 'estandar')).length
            const isMcExpanded = expandedS === 6
            return (
              <div className="rounded-xl border-2 overflow-hidden"
                style={{ borderColor: mcColor + '40' }}>
                {/* MC Header */}
                <div className="flex items-center justify-between px-4 py-3 cursor-pointer"
                  style={{ backgroundColor: mcColor + '10' }}
                  onClick={() => setExpandedS(isMcExpanded ? null : 6)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-sm"
                      style={{ backgroundColor: mcColor }}>
                      MC
                    </div>
                    <div>
                      <span className="font-bold" style={{ color: mcColor }}>{MC_STEP_CONFIG.japaneseName}</span>
                      <span className="text-sm text-muted-foreground ml-2">({MC_STEP_CONFIG.spanishName})</span>
                      <span className="text-xs text-muted-foreground ml-2">— Fase 6</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" style={{ color: mcColor, borderColor: mcColor + '40' }}>
                      {mcTotal} plantilla{mcTotal !== 1 ? 's' : ''}
                    </Badge>
                    {isMcExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {/* MC Expanded — PDCA steps + Objetivos */}
                <AnimatePresence>
                  {isMcExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden">
                      <div className="p-4 space-y-3">
                        {/* PDCA Steps + Objetivos */}
                        {MC_PASO_CONFIG.map(mcPaso => {
                          const pasoKey = `MC-P${mcPaso.paso}`
                          const pasoTemplates = templates.filter(t => {
                            if (mcPaso.key === 'objetivos') return t.sStep === 0 && t.type === 'kpi'
                            const pdcaStep = PDCA_STEPS.find(s => s.id === mcPaso.paso)
                            return t.sStep === 0 && t.type === 'pdca' && pdcaStep && (t.content || '').includes(`"phase": "${pdcaStep.letter.toLowerCase()}"`)
                              || (mcPaso.types.includes(t.type) && t.sStep === 0 && mcPaso.key !== 'objetivos')
                          })
                          const pasoCount = pasoTemplates.length
                          const isPasoExpanded = expandedPaso === pasoKey
                          const PasoIcon = MC_PASO_ICONS[mcPaso.icon] || ClipboardList
                          const pasoColor = mcPaso.key === 'objetivos' ? mcColor : (PDCA_STEPS.find(s => s.id === mcPaso.paso)?.color || mcColor)

                          return (
                            <div key={mcPaso.paso} className="rounded-lg border overflow-hidden"
                              style={{ borderColor: pasoColor + '25' }}>
                              {/* Paso Header */}
                              <div className="flex items-center justify-between px-3 py-2 cursor-pointer"
                                style={{ backgroundColor: pasoColor + '08' }}
                                onClick={() => setExpandedPaso(isPasoExpanded ? null : pasoKey)}>
                                <div className="flex items-center gap-2">
                                  <PasoIcon className="h-4 w-4" style={{ color: pasoColor }} />
                                  {mcPaso.key !== 'objetivos' ? (
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: pasoColor }}>
                                      {PDCA_STEPS.find(s => s.id === mcPaso.paso)?.letter}
                                    </div>
                                  ) : null}
                                  <span className="text-sm font-semibold" style={{ color: pasoColor }}>
                                    {mcPaso.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                    {mcPaso.types.map(type => (
                                      <Button key={type} variant="outline" size="sm"
                                        className="h-6 px-2 text-[10px] gap-0.5"
                                        style={{ borderColor: pasoColor + '40', color: pasoColor }}
                                        onClick={() => startCreate(0, type, mcPaso.paso)}>
                                        <Plus className="h-3 w-3" />
                                        {type === 'pdca' ? 'PDCA' : type === 'plan_accion' ? 'Plan Acción' : type === 'estandar' ? 'Estándar' : 'KPIs'}
                                      </Button>
                                    ))}
                                  </div>
                                  <Badge variant="outline" className="text-[10px] h-5"
                                    style={{ color: pasoColor, borderColor: pasoColor + '30' }}>
                                    {pasoCount}
                                  </Badge>
                                  {isPasoExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </div>
                              </div>

                              {/* Paso Expanded */}
                              <AnimatePresence>
                                {isPasoExpanded && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden">
                                    <div className="px-3 pb-3 space-y-2">
                                      {pasoCount === 0 ? (
                                        <div className="text-center py-4 text-muted-foreground text-xs">
                                          Sin plantillas para este paso. Pulsa + para crear.
                                        </div>
                                      ) : (
                                        pasoTemplates.map(tpl => (
                                          <div key={tpl.id}
                                            className={`p-2.5 rounded-lg border ${tpl.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300 opacity-60'}`}>
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <Badge variant="outline" className="text-[9px] shrink-0"
                                                  style={{ color: pasoColor, borderColor: pasoColor + '30' }}>
                                                  {tpl.type}
                                                </Badge>
                                                <div className="min-w-0">
                                                  <p className="text-sm font-medium truncate">{tpl.title}</p>
                                                  {tpl.description && <p className="text-xs text-muted-foreground truncate">{tpl.description}</p>}
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-1">
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
                                        ))
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })()}
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
                    {formSStep === 0 ? 'MC' : `S${formSStep}`}
                  </div>
                  <span className="text-sm font-semibold" style={{ color: S_COLORS[formSStep] }}>
                    {formSStep === 0 ? MC_STEP_CONFIG.japaneseName : S_STEPS.find(s => s.id === formSStep)?.japaneseName}
                  </span>
                  <Badge style={{ backgroundColor: S_COLORS[formSStep] + '20', color: S_COLORS[formSStep] }}
                    className="text-xs px-2 py-0.5 border-0 font-semibold">
                    {formSStep === 0
                      ? MC_PASO_CONFIG.find(p => p.paso === formMiniStep)?.label || `Paso ${formMiniStep}`
                      : `Paso ${formMiniStep}: ${MINI_STEPS_LABELS[formMiniStep] || `Paso ${formMiniStep}`}`}
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
                      <SelectItem value="layout">Layout de Zona</SelectItem>
                      <SelectItem value="plan_limpieza">Plan de Inspección/Limpieza</SelectItem>
                      <SelectItem value="plan_accion">Plan de Acción</SelectItem>
                      <SelectItem value="pdca">Tablero PDCA</SelectItem>
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
                      <SelectItem key={0} value="0">
                        MC - {MC_STEP_CONFIG.japaneseName} ({MC_STEP_CONFIG.spanishName})
                      </SelectItem>
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
                    {formType === 'plan_accion' && (
                      <Button variant="outline" size="sm" className="text-xs"
                        onClick={() => setFormContent(JSON.stringify(getDefaultPlanAccionContent(formSStep), null, 2))}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Cargar plan de acción por defecto
                      </Button>
                    )}
                    {formType === 'layout' && (
                      <Button variant="outline" size="sm" className="text-xs"
                        onClick={() => setFormContent(JSON.stringify(getDefaultLayoutContent(formSStep), null, 2))}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Cargar layout por defecto
                      </Button>
                    )}
                    {formType === 'plan_limpieza' && (
                      <Button variant="outline" size="sm" className="text-xs"
                        onClick={() => setFormContent(JSON.stringify(getDefaultPlanLimpiezaContent(formSStep), null, 2))}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Cargar plan de limpieza por defecto
                      </Button>
                    )}
                    {formType === 'pdca' && (
                      <Button variant="outline" size="sm" className="text-xs"
                        onClick={() => setFormContent(JSON.stringify(getDefaultPDCAContent(formSStep), null, 2))}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Cargar PDCA por defecto
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
                      <InventoryConfigEditor content={formContent} onChange={setFormContent} sStep={formSStep} />
                    )}
                    {formType === 'estandar' && (
                      <StandardTemplateEditor content={formContent} onChange={setFormContent} />
                    )}
                    {formType === 'plan_accion' && (
                      <PlanAccionEditor content={formContent} onChange={setFormContent} />
                    )}
                    {formType === 'layout' && (
                      <LayoutTemplateEditor content={formContent} onChange={setFormContent} />
                    )}
                    {formType === 'plan_limpieza' && (
                      <PlanLimpiezaTemplateEditor content={formContent} onChange={setFormContent} />
                    )}
                    {formType === 'pdca' && (
                      <PDCATemplateEditor content={formContent} onChange={setFormContent} />
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
