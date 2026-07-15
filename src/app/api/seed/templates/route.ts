import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/seed/templates
 * Non-destructive seed: creates ONLY missing templates AND fixes wrong miniStep values.
 * Creates templates for ALL S steps (1-5) and ALL types.
 */
export async function POST() {
  try {
    const S_JAPANESE = ['Seiri', 'Seiton', 'Seiso', 'Seiketsu', 'Shitsuke']
    const S_NAMES = ['Revisar', 'Ordenar', 'Limpiar', 'Estandarizar', 'Mantener']

    // Correct miniStep mapping by type
    const CORRECT_MINI_STEP: Record<string, number> = {
      formacion: 1,
      examen: 1,
      fotos: 2,
      inventario: 3,
      estandar: 3,
      autoevaluacion: 4,
      plan_accion: 4,
      auditoria: 5,
    }

    // Get all existing templates (full records, not just select)
    const existing = await db.template.findMany()

    let created = 0
    let fixed = 0

    // Fix wrong miniStep values on existing templates
    for (const tpl of existing) {
      const correctStep = CORRECT_MINI_STEP[tpl.type]
      if (correctStep && tpl.miniStep !== correctStep) {
        await db.template.update({
          where: { id: tpl.id },
          data: { miniStep: correctStep },
        })
        fixed++
      }
    }

    const exists = (sStep: number, type: string) =>
      existing.some(t => t.sStep === sStep && t.type === type)

    for (let s = 1; s <= 5; s++) {
      // ─── Formación (Paso 1) ───
      if (!exists(s, 'formacion')) {
        await db.template.create({
          data: {
            type: 'formacion',
            sStep: s,
            miniStep: 1,
            title: `Formación S${s} - ${S_JAPANESE[s - 1]}`,
            description: `Contenido formativo sobre la ${s}ª S: ${S_NAMES[s - 1]} (${S_JAPANESE[s - 1]})`,
            content: JSON.stringify({ sections: [{ title: `¿Qué es ${S_JAPANESE[s - 1]}?`, content: `Formación sobre la ${s}ª S: ${S_NAMES[s - 1]}` }] }),
            notaMinima: 80,
          },
        })
        created++
      }

      // ─── Examen (Paso 1) ───
      if (!exists(s, 'examen')) {
        await db.template.create({
          data: {
            type: 'examen',
            sStep: s,
            miniStep: 1,
            title: `Examen S${s} - ${S_JAPANESE[s - 1]}`,
            description: `Examen de evaluación sobre ${S_NAMES[s - 1]}`,
            content: JSON.stringify({ questions: [{ question: `Pregunta sobre ${S_JAPANESE[s - 1]}`, options: ['A', 'B', 'C', 'D'], correctIndex: 0 }] }),
            notaMinima: 80,
          },
        })
        created++
      }

      // ─── Fotos (Paso 2) ───
      if (!exists(s, 'fotos')) {
        const fotosDescriptions: Record<number, string> = {
          1: 'Fotografía la zona para ver qué elementos innecesarios hay antes de clasificar',
          2: 'Fotografía la zona para ver cómo está organizada antes de reordenar',
          3: 'Fotografía la zona para documentar los puntos de suciedad antes de limpiar',
          4: 'Fotografía la zona para documentar el estado actual antes de estandarizar',
          5: 'Fotografía la zona para documentar el nivel de cumplimiento de los estándares',
        }
        await db.template.create({
          data: {
            type: 'fotos',
            sStep: s,
            miniStep: 2,
            title: `Fotos S${s} - ${S_JAPANESE[s - 1]}`,
            description: `Plantilla de fotografías para ${S_NAMES[s - 1]}`,
            content: JSON.stringify({
              sections: [
                {
                  title: 'Fotografías Antes',
                  description: fotosDescriptions[s],
                  minPhotos: 3,
                  photoTypes: ['antes'],
                  instructions: 'Toma un mínimo de 3 fotografías del estado actual de la zona.',
                },
                {
                  title: 'Fotografías Después',
                  description: 'Fotografía el resultado tras aplicar las mejoras',
                  minPhotos: 3,
                  photoTypes: ['despues'],
                  instructions: 'Toma fotografías desde los mismos ángulos que las fotos "antes".',
                },
              ],
            }),
          },
        })
        created++
      }

      // ─── Inventario (Paso 3) ───
      if (!exists(s, 'inventario')) {
        const inventoryContent = s === 2
          ? {
              title: 'Inventario de Necesarios',
              subtitle: 'SEITEN — Organiza los elementos necesarios en su ubicación correcta',
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
          : { categories: [], extraFields: [] }

        await db.template.create({
          data: {
            type: 'inventario',
            sStep: s,
            miniStep: 3,
            title: `Inventario S${s} - ${S_JAPANESE[s - 1]}`,
            description: `Plantilla de inventario para ${S_NAMES[s - 1]}`,
            content: JSON.stringify(inventoryContent),
          },
        })
        created++
      }

      // ─── Estándar (Paso 3) ───
      if (!exists(s, 'estandar')) {
        await db.template.create({
          data: {
            type: 'estandar',
            sStep: s,
            miniStep: 3,
            title: `Formato Estándar de Mejora - ${S_JAPANESE[s - 1]}`,
            description: `Plantilla de formato estándar para registrar mejoras en ${S_NAMES[s - 1]}`,
            content: JSON.stringify({
              fields: [
                { key: 'beforePhotoUrl', label: 'Foto Antes', type: 'photo', required: true },
                { key: 'afterPhotoUrl', label: 'Foto Después', type: 'photo', required: true },
                { key: 'responsable', label: 'Quién lo ha hecho', type: 'text', required: true },
                { key: 'contacto', label: 'Contacto', type: 'text', required: true },
                { key: 'mejoraTipo', label: 'Tipo de Mejora', type: 'select', options: ['seguridad', 'calidad', 'proceso', 'logistica'], required: true },
              ],
            }),
          },
        })
        created++
      }

      // ─── Autoevaluación (Paso 4) ───
      if (!exists(s, 'autoevaluacion')) {
        await db.template.create({
          data: {
            type: 'autoevaluacion',
            sStep: s,
            miniStep: 4,
            title: `Autoevaluación S${s} - ${S_JAPANESE[s - 1]}`,
            description: `Checklist de autoevaluación para ${S_NAMES[s - 1]}`,
            content: JSON.stringify({ sections: [] }),
            notaMinima: 70,
          },
        })
        created++
      }

      // ─── Plan de Acción (Paso 4) ───
      if (!exists(s, 'plan_accion')) {
        await db.template.create({
          data: {
            type: 'plan_accion',
            sStep: s,
            miniStep: 4,
            title: `Plan de Acción S${s} - ${S_JAPANESE[s - 1]}`,
            description: `Registro de deficiencias detectadas en autoevaluaciones y auditorías de ${S_NAMES[s - 1]}. Incluye acciones correctivas, preventivas, responsable y seguimiento del progreso.`,
            content: JSON.stringify({
              tableType: 'plan_accion',
              description: `Plan de Acción para ${S_JAPANESE[s - 1]} (${S_NAMES[s - 1]}). Registro de deficiencias encontradas en las autoevaluaciones y auditorías, con las acciones correctivas y preventivas propuestas, responsables y fechas de realización.`,
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
              sStep: s,
            }),
          },
        })
        created++
      }

      // ─── Auditoría Externa (Paso 5) ───
      if (!exists(s, 'auditoria')) {
        await db.template.create({
          data: {
            type: 'auditoria',
            sStep: s,
            miniStep: 5,
            title: `Auditoría S${s} - ${S_JAPANESE[s - 1]}`,
            description: `Criterios de auditoría para ${S_NAMES[s - 1]}`,
            content: JSON.stringify({ sections: [] }),
            notaMinima: 75,
          },
        })
        created++
      }
    }

    const totalTemplates = await db.template.count()

    return NextResponse.json({
      success: true,
      data: {
        message: `Seed completado: ${created} creada(s), ${fixed} corregida(s), ${existing.length} ya existían`,
        templatesCreated: created,
        templatesFixed: fixed,
        templatesExisting: existing.length,
        templatesTotal: totalTemplates,
      },
    })
  } catch (error) {
    console.error('Error seeding templates:', error)
    return NextResponse.json({ success: false, error: 'Error seeding templates' }, { status: 500 })
  }
}
