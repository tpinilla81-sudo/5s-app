import { NextRequest, NextResponse } from 'next/server'
import { db, ensureSystemConfigTable } from '@/lib/db'
import { AUDIT_CHECKLISTS, INVENTORY_CONFIGS } from '@/lib/5s-constants'

/**
 * POST /api/seed/templates
 * Non-destructive seed: creates ONLY missing templates.
 * Creates templates for ALL S steps (1-5) and ALL types.
 * Tracks seeding state in SystemConfig so it doesn't re-run needlessly.
 * Supports ?force=true to force re-seed (e.g. after adding new template types).
 */
export async function POST(request: NextRequest) {
  try {
    // Auto-migrate: ensure SystemConfig table exists before querying it
    await ensureSystemConfigTable()

    const url = new URL(request.url)
    const forceSeed = url.searchParams.get('force') === 'true'

    // Always run seed to fix miniStep values and create missing templates.
    // The seed is non-destructive — it only creates templates that don't exist
    // and fixes incorrect miniStep values. Skipping it caused missing templates.
    // force=true additionally resets miniStep and title fixes even if already correct.
    const S_JAPANESE = ['Seiri', 'Seiton', 'Seiso', 'Seiketsu', 'Shitsuke']
    const S_NAMES = ['Revisar', 'Ordenar', 'Limpiar', 'Estandarizar', 'Mantener']

    // Correct miniStep mapping by type
    const CORRECT_MINI_STEP: Record<string, number> = {
      formacion: 1,
      examen: 1,
      fotos: 2,
      inventario: 3,
      estandar: 3,
      layout: 3,
      plan_limpieza: 3,
      autoevaluacion: 4,
      plan_accion: 4,
      auditoria: 5,
      pdca: 5,
    }

    // Get all existing templates (full records, not just select)
    const existing = await db.template.findMany()

    let created = 0
    let fixed = 0

    // FIX miniStep, titles, notaMinima and legacy content on existing templates.
    // This ensures templates are always in the correct Paso regardless of previous state.
    const CORRECT_NOTA_MINIMA: Record<string, number> = {
      formacion: 80,
      examen: 80,
      autoevaluacion: 70,
      auditoria: 75,
    }
    for (const tpl of existing) {
      const correctStep = CORRECT_MINI_STEP[tpl.type]
      const correctNota = CORRECT_NOTA_MINIMA[tpl.type]
      const updates: Record<string, any> = {}
      if (correctStep && tpl.miniStep !== correctStep) {
        updates.miniStep = correctStep
      }
      if (correctNota && tpl.notaMinima !== correctNota) {
        updates.notaMinima = correctNota
      }
      // Fix legacy auditoria/autoevaluacion content: migrate from criteria/items format
      // to proper sections format using AUDIT_CHECKLISTS
      if ((tpl.type === 'auditoria' || tpl.type === 'autoevaluacion') && tpl.sStep >= 1 && tpl.sStep <= 5) {
        try {
          const parsed = typeof tpl.content === 'string' ? JSON.parse(tpl.content) : tpl.content
          // Check if legacy format (criteria or items array) or empty sections
          const isLegacy = (parsed.criteria && Array.isArray(parsed.criteria)) ||
                          (parsed.items && Array.isArray(parsed.items)) ||
                          (parsed.sections && Array.isArray(parsed.sections) && parsed.sections.length === 0)
          if (isLegacy) {
            const builtIn = AUDIT_CHECKLISTS[tpl.sStep as keyof typeof AUDIT_CHECKLISTS]
            if (builtIn && builtIn.length > 0) {
              updates.content = JSON.stringify({ sections: builtIn })
            }
          }
        } catch (e) {
          // If content can't be parsed, leave it as is
        }
      }
      // Fix empty inventario templates: seed previously created {categories:[], extraFields:[]}
      // for S1/S3/S4/S5 — replace with proper content from INVENTORY_CONFIGS
      if (tpl.type === 'inventario' && tpl.sStep >= 1 && tpl.sStep <= 5) {
        try {
          const parsed = typeof tpl.content === 'string' ? JSON.parse(tpl.content) : tpl.content
          const hasCategories = Array.isArray(parsed.categories) && parsed.categories.length > 0
          const hasExtraFields = Array.isArray(parsed.extraFields) && parsed.extraFields.length > 0
          if (!hasCategories && !hasExtraFields) {
            const defaultInvConfig = INVENTORY_CONFIGS[tpl.sStep]
            if (defaultInvConfig) {
              updates.content = JSON.stringify({
                title: defaultInvConfig.title,
                subtitle: defaultInvConfig.subtitle,
                templateName: defaultInvConfig.templateName,
                categories: defaultInvConfig.categories,
                extraFields: defaultInvConfig.extraFields,
              })
            }
          }
        } catch (e) {
          // If content can't be parsed, leave it as is
        }
      }
      if (Object.keys(updates).length > 0) {
        await db.template.update({
          where: { id: tpl.id },
          data: updates,
        })
        fixed++
      }
    }

    // Fix titles
    const afterFix = fixed > 0 ? await db.template.findMany() : existing
    let titlesFixed = 0
    for (const tpl of afterFix) {
      let newTitle = tpl.title
      const jName = S_JAPANESE[tpl.sStep - 1]

      if (tpl.type === 'formacion') newTitle = `Formación S${tpl.sStep} - ${jName}`
      else if (tpl.type === 'examen') newTitle = `Examen S${tpl.sStep} - ${jName}`
      else if (tpl.type === 'autoevaluacion') newTitle = `Autoevaluación S${tpl.sStep} - ${jName}`
      else if (tpl.type === 'auditoria') newTitle = `Auditoría S${tpl.sStep} - ${jName}`
      else if (tpl.type === 'inventario') newTitle = `Inventario S${tpl.sStep} - ${jName}`
      else if (tpl.type === 'estandar') newTitle = `Formato Estándar de Mejora - ${jName}`
      else if (tpl.type === 'plan_accion') newTitle = `Plan de Acción S${tpl.sStep} - ${jName}`
      else if (tpl.type === 'layout') newTitle = `Layout de Zona - ${jName}`
      else if (tpl.type === 'plan_limpieza') newTitle = `Plan de Inspección y Limpieza - ${jName}`
      else if (tpl.type === 'pdca') newTitle = `Tablero PDCA - ${jName}`
      else if (tpl.type === 'fotos') newTitle = `Fotos S${tpl.sStep} - ${jName}`

      if (newTitle !== tpl.title) {
        await db.template.update({
          where: { id: tpl.id },
          data: { title: newTitle },
        })
        titlesFixed++
      }
    }
    fixed += titlesFixed

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
        // Use INVENTORY_CONFIGS as the base for all S steps — provides categories, extraFields, etc.
        const defaultInvConfig = INVENTORY_CONFIGS[s]
        const inventoryContent: any = {
          title: defaultInvConfig?.title || `Inventario S${s}`,
          subtitle: defaultInvConfig?.subtitle || '',
          templateName: defaultInvConfig?.templateName || `S${s}_Inventario.xlsx`,
          categories: defaultInvConfig?.categories || [],
          extraFields: defaultInvConfig?.extraFields || [],
        }
        // S2 gets additional hierarchical dropdowns
        if (s === 2) {
          inventoryContent.desplegables_jerarquicos = {
            'MATERIALES': { prefijo_codigo: 'MAT', subcategorias: ['Consumibles', 'Materia Prima', 'Producto en proceso', 'Producto acabado'] },
            'MÁQUINAS Y EQUIPOS': { prefijo_codigo: 'MAQ', subcategorias: ['Máquinas de trabajo', 'Utillajes de trabajo', 'Equipos y accesorios de Elevación', 'Equipos de ensayo y verificación', 'Herramientas de ensamblaje', 'Equipos informáticos', 'Equipos de limpieza'] },
            'MOBILIARIO': { prefijo_codigo: 'MOB', subcategorias: ['Bancos de trabajo', 'Paneles herramienta', 'Armarios o taquillas', 'Sillas, mesas', 'Paneles u otros soportes para información'] },
            'INFORMACIÓN': { prefijo_codigo: 'INF', subcategorias: ['Planos, instrucciones, boletines de trabajo', 'Posters u otra información divulgativa', 'Información referente a indicadores', 'Carpeta o bandejas con documentación', 'Información de seguridad'] },
            'TRANSPORTE Y ALMACENAJE': { prefijo_codigo: 'TRA', subcategorias: ['Máquinas de transporte', 'Utillajes de transporte, Pallets, embalajes de madera, cajas', 'Estanterías, gavetas, contenedores', 'Bolsas, plásticos, protecciones, elementos de flejado', 'Carros de transporte'] },
          }
          // Override with richer S2 categories when using the seed's extended version
          inventoryContent.categories = [
            { value: 'materiales', label: 'MATERIALES', color: 'bg-blue-100 text-blue-800' },
            { value: 'maquinas_equipos', label: 'MÁQUINAS Y EQUIPOS', color: 'bg-purple-100 text-purple-800' },
            { value: 'mobiliario', label: 'MOBILIARIO', color: 'bg-amber-100 text-amber-800' },
            { value: 'informacion', label: 'INFORMACIÓN', color: 'bg-teal-100 text-teal-800' },
            { value: 'transporte_almacenaje', label: 'TRANSPORTE Y ALMACENAJE', color: 'bg-orange-100 text-orange-800' },
          ]
          inventoryContent.extraFields = [
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
          ]
        }

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
        const auditSections = AUDIT_CHECKLISTS[s as keyof typeof AUDIT_CHECKLISTS]
        await db.template.create({
          data: {
            type: 'autoevaluacion',
            sStep: s,
            miniStep: 4,
            title: `Autoevaluación S${s} - ${S_JAPANESE[s - 1]}`,
            description: `Checklist de autoevaluación para ${S_NAMES[s - 1]}`,
            content: JSON.stringify({ sections: auditSections || [] }),
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

      // ─── Layout de Zona (Paso 3 — solo S2 Seiton) ───
      if (!exists(s, 'layout') && s === 2) {
        await db.template.create({
          data: {
            type: 'layout',
            sStep: s,
            miniStep: 3,
            title: `Layout de Zona - ${S_JAPANESE[s - 1]}`,
            description: `Herramienta para subir o dibujar el layout de la zona en ${S_NAMES[s - 1]}. Primer estándar creado que irá a la Biblioteca de Estándares de S4.`,
            content: JSON.stringify({
              layoutType: 'zone_layout',
              description: `Layout de la zona para ${S_JAPANESE[s - 1]}. Dibuja o sube un plano de la zona indicando las áreas de trabajo, pasillos, ubicación de equipos y elementos estáticos.`,
              floorColors: [
                { color: '#0E6BA8', label: 'Azul RAL 5017 — Entrada de material', ral: 'RAL 5017' },
                { color: '#2D8C3C', label: 'Verde RAL 6032 — Salida de material premontado', ral: 'RAL 6032' },
                { color: '#E8E8E8', label: 'Blanco RAL 9003 — Elementos estáticos', ral: 'RAL 9003' },
                { color: '#F5E649', label: 'Amarillo RAL 1016 — Área de trabajo', ral: 'RAL 1016' },
                { color: '#CC0000', label: 'Rojo RAL 3000 — Equipos contra incendios', ral: 'RAL 3000' },
                { color: '#F5A623', label: 'Amarillo anaranjado RAL 1003 — Elementos de seguridad', ral: 'RAL 1003' },
              ],
              drawTools: ['select', 'rect', 'circle', 'line', 'arrow', 'text'],
              sStep: s,
              targetStandardCategory: 'layout',
              targetS4Library: true,
            }),
          },
        })
        created++
      }

      // ─── Plan de Inspección y Limpieza (Paso 3 — solo S3 Seiso) ───
      if (!exists(s, 'plan_limpieza') && s === 3) {
        await db.template.create({
          data: {
            type: 'plan_limpieza',
            sStep: s,
            miniStep: 3,
            title: `Plan de Inspección y Limpieza - ${S_JAPANESE[s - 1]}`,
            description: `Herramienta para realizar el plan de inspección y limpieza de la zona en ${S_NAMES[s - 1]}. Indica una ruta para inspeccionar los puntos de suciedad que no se pueden eliminar.`,
            content: JSON.stringify({
              planType: 'inspection_cleaning',
              description: `Plan de Inspección y Limpieza para ${S_JAPANESE[s - 1]}. Define la ruta de inspección, los puntos de suciedad que no se pueden eliminar y las acciones de limpieza para la zona.`,
              sections: [
                { key: 'ruta_inspeccion', label: 'Ruta de Inspección', type: 'route', description: 'Define el recorrido de inspección paso a paso' },
                { key: 'puntos_suciedad', label: 'Puntos de Suciedad No Eliminables', type: 'checklist', description: 'Lista de puntos de suciedad que no se pueden eliminar, con acciones preventivas' },
                { key: 'acciones_limpieza', label: 'Acciones de Limpieza', type: 'list', description: 'Acciones de limpieza a realizar en cada punto' },
                { key: 'frecuencia', label: 'Frecuencia', type: 'select', options: ['Diaria', 'Semanal', 'Quincenal', 'Mensual'], description: 'Frecuencia de inspección' },
                { key: 'responsable', label: 'Responsable', type: 'text', description: 'Persona responsable de la inspección' },
              ],
              sStep: s,
              targetStandardCategory: 'plan_limpieza',
              targetS4Library: true,
            }),
          },
        })
        created++
      }

      // ─── Auditoría Externa (Paso 5) ───
      if (!exists(s, 'auditoria')) {
        const auditSections = AUDIT_CHECKLISTS[s as keyof typeof AUDIT_CHECKLISTS]
        await db.template.create({
          data: {
            type: 'auditoria',
            sStep: s,
            miniStep: 5,
            title: `Auditoría S${s} - ${S_JAPANESE[s - 1]}`,
            description: `Criterios de auditoría para ${S_NAMES[s - 1]}`,
            content: JSON.stringify({ sections: auditSections || [] }),
            notaMinima: 75,
          },
        })
        created++
      }
      // ─── Tablero PDCA (Paso 5 — solo S5 Shitsuke) ───
      if (!exists(s, 'pdca') && s === 5) {
        await db.template.create({
          data: {
            type: 'pdca',
            sStep: s,
            miniStep: 5,
            title: `Tablero PDCA - ${S_JAPANESE[s - 1]}`,
            description: `Tablero PDCA (Plan-Do-Check-Act) como herramienta de mejora continua para dirigir las 5S tras su implementación. Incluye Plan de Acción y KPIs de progreso.`,
            content: JSON.stringify({
              pdcaType: 'continuous_improvement_board',
              description: `Tablero PDCA para ${S_JAPANESE[s - 1]}. Herramienta de mejora continua después de acabar las 5S en la que se registra y se dirige las 5S. Incluye el Plan de Acción y KPIs referentes que indican progreso y trabajo realizado y por realizar.`,
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
              sStep: s,
            }),
          },
        })
        created++
      }

    }

    const totalTemplates = await db.template.count()

    // Mark seed as completed in SystemConfig (gracefully handle missing table)
    try {
      await db.systemConfig.upsert({
        where: { key: 'templates_seeded' },
        update: { value: JSON.stringify({ completedAt: new Date().toISOString(), created, version: 2 }) },
        create: { key: 'templates_seeded', value: JSON.stringify({ completedAt: new Date().toISOString(), created, version: 2 }) },
      })
    } catch (e) {
      console.log('Could not save seed state to SystemConfig (table may not exist yet)')
    }

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
