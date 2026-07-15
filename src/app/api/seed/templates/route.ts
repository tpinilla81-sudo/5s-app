import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/seed/templates
 * Non-destructive seed: creates ONLY missing templates (does NOT delete existing ones).
 * Creates templates for ALL S steps (1-5) and ALL types.
 */
export async function POST() {
  try {
    const S_JAPANESE = ['Seiri', 'Seiton', 'Seiso', 'Seiketsu', 'Shitsuke']
    const S_NAMES = ['Revisar', 'Ordenar', 'Limpiar', 'Estandarizar', 'Mantener']

    // Get all existing templates to check what's already there
    const existing = await db.template.findMany({ select: { sStep: true, type: true, active: true } })

    const exists = (sStep: number, type: string) =>
      existing.some(t => t.sStep === sStep && t.type === type && t.active)

    let created = 0

    for (let s = 1; s <= 5; s++) {
      // ─── Formación ───
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

      // ─── Examen ───
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
        // S2: Use the comprehensive Seiton template with proper categories
        const inventoryContent = s === 2
          ? {
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
        message: `Seed completado: ${created} plantilla(s) creada(s), ${existing.length} ya existían`,
        templatesCreated: created,
        templatesExisting: existing.length,
        templatesTotal: totalTemplates,
      },
    })
  } catch (error) {
    console.error('Error seeding templates:', error)
    return NextResponse.json({ success: false, error: 'Error seeding templates' }, { status: 500 })
  }
}
