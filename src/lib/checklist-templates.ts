'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AuditSection } from '@/lib/5s-constants'

/**
 * Convert template content (from API) to AuditSection[] format.
 * Template content is: { sections: [{ id, title, items: [{ id, description, hasOther }] }] }
 */
export function templateToAuditSections(content: unknown): AuditSection[] {
  if (!content || typeof content !== 'object') return []
  const parsed = content as { sections?: any[] }
  if (!parsed.sections || !Array.isArray(parsed.sections)) return []

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

/**
 * Fetch a checklist template from the API.
 * Returns the parsed sections and notaMinima, or null if not found.
 */
export async function fetchChecklistTemplate(
  type: 'autoevaluacion' | 'auditoria',
  sStep: number
): Promise<{ sections: AuditSection[]; notaMinima: number | null } | null> {
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
 * Used by AuditoriaModal and AutoevaluacionModal.
 */
export function useChecklistTemplate(
  type: 'autoevaluacion' | 'auditoria',
  sStep: number,
  enabled: boolean = true
) {
  const [sections, setSections] = useState<AuditSection[]>([])
  const [notaMinima, setNotaMinima] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    if (!enabled) return
    setIsLoading(true)
    const result = await fetchChecklistTemplate(type, sStep)
    if (result) {
      setSections(result.sections)
      if (result.notaMinima !== null) setNotaMinima(result.notaMinima)
    } else {
      setSections([])
      setNotaMinima(null)
    }
    setIsLoading(false)
  }, [type, sStep, enabled])

  useEffect(() => {
    if (enabled) load()
  }, [load])

  return { sections, notaMinima, isLoading, reload: load }
}
