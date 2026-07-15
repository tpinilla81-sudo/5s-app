import { NextResponse } from 'next/server'
import { db, ensureSystemConfigTable } from '@/lib/db'

/**
 * POST /api/fix-templates
 * One-time fix: corrects miniStep values for all existing templates
 * and creates any missing templates (layout, plan_limpieza, plan_accion, pdca).
 */
export async function POST() {
  try {
    await ensureSystemConfigTable()

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

    const S_JAPANESE = ['Seiri', 'Seiton', 'Seiso', 'Seiketsu', 'Shitsuke']

    // Fix miniStep on all existing templates
    const allTemplates = await db.template.findMany()
    let fixed = 0

    for (const tpl of allTemplates) {
      const correctStep = CORRECT_MINI_STEP[tpl.type]
      if (correctStep && tpl.miniStep !== correctStep) {
        await db.template.update({
          where: { id: tpl.id },
          data: { miniStep: correctStep },
        })
        fixed++
      }
    }

    // Fix titles for old-style templates
    let titlesFixed = 0
    const updatedTemplates = await db.template.findMany()
    for (const tpl of updatedTemplates) {
      if (tpl.title.match(/^S[1-5]\s/)) continue
      const jName = S_JAPANESE[tpl.sStep - 1]
      let newTitle = tpl.title

      if (tpl.type === 'formacion') newTitle = `Formación S${tpl.sStep} - ${jName}`
      else if (tpl.type === 'examen') newTitle = `Examen S${tpl.sStep} - ${jName}`
      else if (tpl.type === 'autoevaluacion') newTitle = `Autoevaluación S${tpl.sStep} - ${jName}`
      else if (tpl.type === 'auditoria') newTitle = `Auditoría S${tpl.sStep} - ${jName}`
      else if (tpl.type === 'inventario') newTitle = `Inventario S${tpl.sStep} - ${jName}`
      else if (tpl.type === 'estandar') newTitle = `Formato Estándar de Mejora - ${jName}`

      if (newTitle !== tpl.title) {
        await db.template.update({
          where: { id: tpl.id },
          data: { title: newTitle },
        })
        titlesFixed++
      }
    }

    // Create missing templates
    const existing = await db.template.findMany()
    const exists = (sStep: number, type: string) =>
      existing.some(t => t.sStep === sStep && t.type === type)

    let created = 0

    for (let s = 1; s <= 5; s++) {
      if (!exists(s, 'plan_accion')) {
        await db.template.create({
          data: {
            type: 'plan_accion', sStep: s, miniStep: 4,
            title: `Plan de Acción S${s} - ${S_JAPANESE[s - 1]}`,
            description: `Registro de deficiencias detectadas en autoevaluaciones y auditorías.`,
            content: JSON.stringify({
              tableType: 'plan_accion',
              columns: [
                { key: 'numeroEntrada', label: 'Nº Entrada', type: 'text', width: '100px', required: true },
                { key: 'fechaInicial', label: 'Fecha Inicial', type: 'date', width: '110px', required: true },
                { key: 'auditor', label: 'Auditor', type: 'text', width: '120px', required: true },
                { key: 'semana', label: 'Semana', type: 'text', width: '80px' },
                { key: 'zona', label: 'Zona', type: 'text', width: '100px', required: true },
                { key: 'descripcion', label: 'Descripción', type: 'textarea', width: '200px', required: true },
                { key: 'accionCorrectiva', label: 'Acción Correctiva', type: 'textarea', width: '180px', required: true },
                { key: 'accionesPreventivas', label: 'Acciones Preventivas', type: 'textarea', width: '180px' },
                { key: 'semanaPrevista', label: 'Semana Prevista', type: 'text', width: '100px' },
                { key: 'personaResponsable', label: 'Persona Responsable', type: 'text', width: '130px', required: true },
                { key: 'estado', label: 'Estado', type: 'select', width: '110px', options: ['Empezado (25%)', 'Medio (50%)', 'Casi Hecho (75%)', 'Finalizado (100%)'] },
                { key: 'progreso', label: 'Progreso %', type: 'number', width: '80px', min: 0, max: 100 },
                { key: 'semanaReal', label: 'Semana Real', type: 'text', width: '100px' },
              ],
              sourceTypes: ['autoevaluacion', 'auditoria'], sStep: s,
            }),
          },
        })
        created++
      }

      if (!exists(s, 'layout') && s === 2) {
        await db.template.create({
          data: {
            type: 'layout', sStep: s, miniStep: 3,
            title: `Layout de Zona - ${S_JAPANESE[s - 1]}`,
            description: `Herramienta para subir o dibujar el layout de la zona.`,
            content: JSON.stringify({
              layoutType: 'zone_layout',
              floorColors: [
                { color: '#0E6BA8', label: 'Azul RAL 5017 — Entrada de material', ral: 'RAL 5017' },
                { color: '#2D8C3C', label: 'Verde RAL 6032 — Salida de material', ral: 'RAL 6032' },
                { color: '#E8E8E8', label: 'Blanco RAL 9003 — Elementos estáticos', ral: 'RAL 9003' },
                { color: '#F5E649', label: 'Amarillo RAL 1016 — Área de trabajo', ral: 'RAL 1016' },
                { color: '#CC0000', label: 'Rojo RAL 3000 — Equipos contra incendios', ral: 'RAL 3000' },
                { color: '#F5A623', label: 'Amarillo anaranjado RAL 1003 — Elementos de seguridad', ral: 'RAL 1003' },
              ],
              drawTools: ['select', 'rect', 'circle', 'line', 'arrow', 'text'],
              targetStandardCategory: 'layout', targetS4Library: true,
            }),
          },
        })
        created++
      }

      if (!exists(s, 'plan_limpieza') && s === 3) {
        await db.template.create({
          data: {
            type: 'plan_limpieza', sStep: s, miniStep: 3,
            title: `Plan de Inspección y Limpieza - ${S_JAPANESE[s - 1]}`,
            description: `Plan de inspección y limpieza de la zona.`,
            content: JSON.stringify({
              planType: 'inspection_cleaning',
              sections: [
                { key: 'ruta_inspeccion', label: 'Ruta de Inspección', type: 'route' },
                { key: 'puntos_suciedad', label: 'Puntos de Suciedad No Eliminables', type: 'checklist' },
                { key: 'acciones_limpieza', label: 'Acciones de Limpieza', type: 'list' },
                { key: 'frecuencia', label: 'Frecuencia', type: 'select', options: ['Diaria', 'Semanal', 'Quincenal', 'Mensual'] },
                { key: 'responsable', label: 'Responsable', type: 'text' },
              ],
              targetStandardCategory: 'plan_limpieza', targetS4Library: true,
            }),
          },
        })
        created++
      }

      if (!exists(s, 'pdca') && s === 5) {
        await db.template.create({
          data: {
            type: 'pdca', sStep: s, miniStep: 5,
            title: `Tablero PDCA - ${S_JAPANESE[s - 1]}`,
            description: `Tablero PDCA (Plan-Do-Check-Act) como herramienta de mejora continua.`,
            content: JSON.stringify({
              pdcaType: 'continuous_improvement_board',
              phases: [
                { key: 'plan', label: 'PLAN', labelEs: 'Planificar', color: '#3B82F6' },
                { key: 'do', label: 'DO', labelEs: 'Ejecutar', color: '#22C55E' },
                { key: 'check', label: 'CHECK', labelEs: 'Verificar', color: '#EAB308' },
                { key: 'act', label: 'ACT', labelEs: 'Actuar', color: '#F97316' },
              ],
              kpis: [
                { key: 'completion_rate', label: 'Tasa de Completado' },
                { key: 'action_progress', label: 'Progreso del Plan de Acción' },
                { key: 'open_actions', label: 'Acciones Abiertas' },
                { key: 'overdue_items', label: 'Elementos Vencidos' },
              ],
              links: ['plan_accion', 'standards_library'], sStep: s,
            }),
          },
        })
        created++
      }
    }

    const finalTemplates = await db.template.findMany()
    const bySP: Record<string, string[]> = {}
    for (const t of finalTemplates) {
      const key = `S${t.sStep} Paso${t.miniStep}`
      if (!bySP[key]) bySP[key] = []
      bySP[key].push(`${t.type} → ${t.title}`)
    }
    const grouped: string[] = []
    for (const key of Object.keys(bySP).sort()) {
      grouped.push(`  ${key}:`)
      for (const item of bySP[key].sort()) grouped.push(`    ${item}`)
    }

    return NextResponse.json({
      success: true,
      message: `Corregido: ${fixed} miniStep, ${titlesFixed} títulos, ${created} creadas`,
      miniStepFixed: fixed,
      titlesFixed,
      templatesCreated: created,
      totalTemplates: finalTemplates.length,
      layout: grouped,
    })
  } catch (error) {
    console.error('Fix templates error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
