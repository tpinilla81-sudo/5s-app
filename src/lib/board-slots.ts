/**
 * Board Slot Helper — Centralized access to admin-assigned board slots.
 *
 * The admin configures Boards (named configurations) that group templates
 * and standards at each S×Paso position. A Board is assigned to a Zone,
 * and when a zone loads its tablero, it uses the assigned board's configuration.
 *
 * Architecture:
 * - Board: A named configuration (e.g., "Tablero Genérico", "Tablero Mantenimiento")
 * - BoardSlotTemplate/BoardSlotStandard: Linked to a Board (not directly to project/zone)
 * - Zone.boardId: Each zone is assigned a board
 * - Default board: The generic board used by all zones without a specific assignment
 */

export interface SlotTemplateItem {
  id: string
  sStep: number
  miniStep: number
  templateId: string
  boardId: string
  order: number
  template: {
    id: string
    type: string
    title: string
    sStep: number
    miniStep: number
    scope?: string
    companyId?: string | null
    companyType?: string | null
    company?: { id: string; name: string } | null
  }
}

export interface SlotStandardItem {
  id: string
  sStep: number
  miniStep: number
  standardId: string
  boardId: string
  order: number
  standard: {
    id: string
    title: string
    sStep: number
    category: string
  }
}

export interface BoardSlotAssignment {
  sStep: number
  miniStep: number
  templates: SlotTemplateItem[]
  standards: SlotStandardItem[]
}

export interface BoardInfo {
  id: string
  name: string
  isDefault: boolean
  sector: string | null
}

// In-memory cache keyed by boardId
const cacheMap = new Map<string, {
  templates: SlotTemplateItem[]
  standards: SlotStandardItem[]
  boardInfo: BoardInfo | null
  time: number
}>()
const CACHE_TTL = 30_000 // 30 seconds

function getCacheKey(boardId?: string | null, zoneId?: string | null): string {
  return `board:${boardId || 'none'}-zone:${zoneId || 'none'}`
}

/**
 * Fetch board slot assignments from the API.
 * Results are cached for 30 seconds per boardId/zoneId combo.
 */
async function fetchAllData(boardId?: string | null, zoneId?: string | null): Promise<{
  templates: SlotTemplateItem[]
  standards: SlotStandardItem[]
  boardInfo: BoardInfo | null
}> {
  const key = getCacheKey(boardId, zoneId)
  const now = Date.now()
  const cached = cacheMap.get(key)
  if (cached && now - cached.time < CACHE_TTL) {
    return { templates: cached.templates, standards: cached.standards, boardInfo: cached.boardInfo }
  }

  try {
    const params = new URLSearchParams()
    if (boardId) params.set('boardId', boardId)
    if (zoneId) params.set('zoneId', zoneId)

    const res = await fetch(`/api/board-slots?${params.toString()}`)
    const data = await res.json()
    if (data.success) {
      const templates = data.data?.templates || []
      const standards = data.data?.standards || []
      const boardInfo: BoardInfo | null = data.data?.boardId ? {
        id: data.data.boardId,
        name: data.data.boardName,
        isDefault: data.data.boardIsDefault,
        sector: data.data.boardSector,
      } : null
      cacheMap.set(key, { templates, standards, boardInfo, time: now })
      return { templates, standards, boardInfo }
    }
  } catch (error) {
    console.error('Error fetching board slots:', error)
  }

  const fallback = cacheMap.get(key)
  return { templates: fallback?.templates || [], standards: fallback?.standards || [], boardInfo: fallback?.boardInfo || null }
}

/**
 * Get all assigned template IDs for a specific S×Paso position.
 */
export async function getAssignedTemplateIds(sStep: number, miniStep: number, boardId?: string | null, zoneId?: string | null): Promise<string[]> {
  const { templates } = await fetchAllData(boardId, zoneId)
  return templates
    .filter(s => s.sStep === sStep && s.miniStep === miniStep)
    .sort((a, b) => a.order - b.order)
    .map(s => s.templateId)
}

/**
 * Get the first assigned template ID for a specific S×Paso position (backward compat).
 */
export async function getAssignedTemplateId(sStep: number, miniStep: number, boardId?: string | null, zoneId?: string | null): Promise<string | null> {
  const ids = await getAssignedTemplateIds(sStep, miniStep, boardId, zoneId)
  return ids.length > 0 ? ids[0] : null
}

/**
 * Get all assigned standard IDs for a specific S×Paso position.
 */
export async function getAssignedStandardIds(sStep: number, miniStep: number, boardId?: string | null, zoneId?: string | null): Promise<string[]> {
  const { standards } = await fetchAllData(boardId, zoneId)
  return standards
    .filter(s => s.sStep === sStep && s.miniStep === miniStep)
    .map(s => s.standardId)
}

/**
 * Get the full board slot assignment for a specific S×Paso position.
 */
export async function getBoardSlot(sStep: number, miniStep: number, boardId?: string | null, zoneId?: string | null): Promise<BoardSlotAssignment> {
  const { templates, standards } = await fetchAllData(boardId, zoneId)
  return {
    sStep,
    miniStep,
    templates: templates.filter(s => s.sStep === sStep && s.miniStep === miniStep),
    standards: standards.filter(s => s.sStep === sStep && s.miniStep === miniStep),
  }
}

/**
 * Load the assigned template content for a specific S×Paso position.
 * Returns the FIRST assigned template's content.
 */
export async function loadAssignedTemplate<T = any>(sStep: number, miniStep: number, boardId?: string | null, zoneId?: string | null): Promise<{ content: T; notaMinima: number | null; templateId: string } | null> {
  const templateId = await getAssignedTemplateId(sStep, miniStep, boardId, zoneId)
  if (!templateId) return null

  try {
    const res = await fetch(`/api/templates?includeInactive=false`)
    const data = await res.json()
    if (data.success) {
      const template = data.data.find((t: any) => t.id === templateId)
      if (template) {
        return {
          content: JSON.parse(template.content),
          notaMinima: template.notaMinima,
          templateId: template.id,
        }
      }
    }
  } catch (error) {
    console.error('Error loading assigned template:', error)
  }

  return null
}

/**
 * Load ALL assigned template contents for a specific S×Paso position.
 */
export async function loadAllAssignedTemplates<T = any>(sStep: number, miniStep: number, boardId?: string | null, zoneId?: string | null): Promise<Array<{ content: T; notaMinima: number | null; templateId: string; type: string; title: string }>> {
  const { templates } = await getBoardSlot(sStep, miniStep, boardId, zoneId)
  if (templates.length === 0) return []

  try {
    const res = await fetch(`/api/templates?includeInactive=false`)
    const data = await res.json()
    if (data.success && data.data) {
      const results: Array<{ content: T; notaMinima: number | null; templateId: string; type: string; title: string }> = []
      for (const slotItem of templates) {
        const template = data.data.find((t: any) => t.id === slotItem.templateId)
        if (template) {
          results.push({
            content: JSON.parse(template.content),
            notaMinima: template.notaMinima,
            templateId: template.id,
            type: template.type,
            title: template.title,
          })
        }
      }
      return results
    }
  } catch (error) {
    console.error('Error loading assigned templates:', error)
  }

  return []
}

/**
 * Fetch all board slot assignments (for components that need all data at once).
 */
export async function fetchBoardSlots(boardId?: string | null, zoneId?: string | null): Promise<{ templates: SlotTemplateItem[]; standards: SlotStandardItem[]; boardInfo: BoardInfo | null }> {
  return fetchAllData(boardId, zoneId)
}

/**
 * Invalidate the cache (e.g., after a slot assignment changes).
 */
export function invalidateBoardSlotsCache(boardId?: string | null, zoneId?: string | null) {
  if (boardId || zoneId) {
    cacheMap.delete(getCacheKey(boardId, zoneId))
  } else {
    cacheMap.clear()
  }
}
