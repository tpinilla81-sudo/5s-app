'use client'

import { useState, useEffect, useCallback } from 'react'
import { AUDIT_CHECKLISTS } from '@/lib/5s-constants'
import type { AuditSection } from '@/lib/5s-constants'

/**
 * Convert template content (from API) to AuditSection[] format.
 * Template content can be in several formats:
 *   - Standard: { sections: [{ id, title, items: [{ id, description, hasOther }] }] }
 *   - Legacy autoeval: { items: [{ description, maxScore }] }
 *   - Legacy audit: { criteria: [{ criterion, weight }] }
 * All formats are normalized to AuditSection[].
 */
export function templateToAuditSections(content: unknown): AuditSection[] {
  if (!content || typeof content !== 'object') return []
  const parsed = content as Record<string, any>

  // ── Standard format: { sections: [...] } ──
  if (parsed.sections && Array.isArray(parsed.sections)) {
    return parsed.sections.map((section: any, sIdx: number) => ({
      id: section.id || `sec-${sIdx}`,
      title: section.title || `Sección ${sIdx + 1}`,
      items: (section.items || []).map((item: any, iIdx: number) => ({
        id: item.id || `item-${sIdx}-${iIdx}`,
        description: item.description || '',
        hasOther: item.hasOther || false,
      })),
    }))
  }

  // ── Legacy autoeval format: { items: [{ description, maxScore }] } ──
  // Convert to a single section with all items
  if (parsed.items && Array.isArray(parsed.items)) {
    return [{
      id: 'sec-autoeval',
      title: 'Puntos de Verificación',
      items: parsed.items.map((item: any, iIdx: number) => ({
        id: item.id || `item-autoeval-${iIdx}`,
        description: item.description || item.criterion || '',
        hasOther: item.hasOther || false,
      })),
    }]
  }

  // ── Legacy audit format: { criteria: [{ criterion, weight }] } ──
  // Convert to a single section with all criteria as items
  if (parsed.criteria && Array.isArray(parsed.criteria)) {
    return [{
      id: 'sec-audit',
      title: 'Criterios de Auditoría',
      items: parsed.criteria.map((c: any, iIdx: number) => ({
        id: c.id || `item-audit-${iIdx}`,
        description: c.criterion || c.description || '',
        hasOther: c.hasOther || false,
      })),
    }]
  }

  return []
}

/**
 * Fetch a checklist template from the API.
 * If boardConfigId is provided, tries the board config first, then falls back to global.
 * Returns the parsed sections and notaMinima, or null if not found.
 */
export async function fetchChecklistTemplate(
  type: 'autoevaluacion' | 'auditoria',
  sStep: number,
  miniStep: number = type === 'autoevaluacion' ? 4 : 5,
  boardConfigId?: string | null
): Promise<{ sections: AuditSection[]; notaMinima: number | null } | null> {
  // If board config is provided, try it first
  if (boardConfigId) {
    try {
      const slotsRes = await fetch(`/api/board-slots?boardConfigId=${boardConfigId}&sStep=${sStep}&miniStep=${miniStep}`)
      const slotsJson = await slotsRes.json()
      if (slotsJson.success && slotsJson.data.length > 0) {
        const slot = slotsJson.data[0]
        const matchingTemplates = (slot.templates || []).filter(
          (t: any) => t.template?.type === type
        )
        if (matchingTemplates.length > 0) {
          const tpl = matchingTemplates[0].template
          const parsed = typeof tpl.content === 'string' ? JSON.parse(tpl.content) : tpl.content
          const sections = templateToAuditSections(parsed)
          if (sections.length > 0) {
            return { sections, notaMinima: tpl.notaMinima ?? null }
          }
        }
      }
    } catch (e) {
      console.error(`Error fetching ${type} template from board config for S${sStep}:`, e)
    }
  }

  // Fallback: global template
  try {
    const res = await fetch(`/api/templates?type=${type}&sStep=${sStep}`)
    const json = await res.json()
    if (json.success && json.data && json.data.length > 0) {
      const tpl = json.data[0]
      const parsed = typeof tpl.content === 'string' ? JSON.parse(tpl.content) : tpl.content
      const sections = templateToAuditSections(parsed)
      if (sections.length > 0) {
        return { sections, notaMinima: tpl.notaMinima ?? null }
      }
    }
  } catch (e) {
    console.error(`Error fetching ${type} template for S${sStep}:`, e)
  }

  // ── Final fallback: use AUDIT_CHECKLISTS from constants ──
  // These are the built-in checklists that ship with the app
  const builtIn = AUDIT_CHECKLISTS[sStep as keyof typeof AUDIT_CHECKLISTS]
  if (builtIn && builtIn.length > 0) {
    return { sections: builtIn, notaMinima: null }
  }

  return null
}

/**
 * Fetch all audit templates (autoevaluacion or auditoria) for all S-steps.
 * Returns a map of sStep → AuditSection[]
 */
export async function fetchAllChecklistTemplates(
  type: 'autoevaluacion' | 'auditoria'
): Promise<Record<number, AuditSection[]>> {
  const result: Record<number, AuditSection[]> = {}
  try {
    const res = await fetch(`/api/templates?type=${type}&includeInactive=false`)
    const json = await res.json()
    if (json.success && json.data) {
      for (const tpl of json.data) {
        const parsed = typeof tpl.content === 'string' ? JSON.parse(tpl.content) : tpl.content
        const sections = templateToAuditSections(parsed)
        if (sections.length > 0) {
          result[tpl.sStep] = sections
        }
      }
    }
  } catch (e) {
    console.error(`Error fetching all ${type} templates:`, e)
  }

  // ── Fallback: fill missing S-steps from AUDIT_CHECKLISTS constants ──
  for (let s = 1; s <= 5; s++) {
    if (!result[s] || result[s].length === 0) {
      const builtIn = AUDIT_CHECKLISTS[s as keyof typeof AUDIT_CHECKLISTS]
      if (builtIn && builtIn.length > 0) {
        result[s] = builtIn
      }
    }
  }

  return result
}

/**
 * Find the description for a given itemId by searching across all templates.
 * Used by ActionPlanTracker to display item descriptions.
 */
export async function fetchItemDescription(sStep: number, itemId: string): Promise<string> {
  // Try auditoria template first, then autoevaluacion
  for (const type of ['auditoria', 'autoevaluacion'] as const) {
    const data = await fetchChecklistTemplate(type, sStep)
    if (data) {
      for (const section of data.sections) {
        const item = section.items.find(i => i.id === itemId)
        if (item) return item.description
      }
    }
  }
  return itemId
}

/**
 * React hook to load a checklist template from the API.
 * If boardConfigId is provided, tries the board config first, then falls back to global.
 * Used by AuditoriaModal and AutoevaluacionModal.
 */
export function useChecklistTemplate(
  type: 'autoevaluacion' | 'auditoria',
  sStep: number,
  enabled: boolean = true,
  boardConfigId?: string | null
) {
  const [sections, setSections] = useState<AuditSection[]>([])
  const [notaMinima, setNotaMinima] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    if (!enabled) return
    setIsLoading(true)
    const result = await fetchChecklistTemplate(type, sStep, undefined, boardConfigId)
    if (result) {
      setSections(result.sections)
      if (result.notaMinima !== null) setNotaMinima(result.notaMinima)
    } else {
      setSections([])
      setNotaMinima(null)
    }
    setIsLoading(false)
  }, [type, sStep, enabled, boardConfigId])

  useEffect(() => {
    if (enabled) load()
  }, [load])

  return { sections, notaMinima, isLoading, reload: load }
}
