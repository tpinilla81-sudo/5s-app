'use client'

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Loader2, X, FileText, Award, Settings2, Plus, Trash2, Edit3, Save,
  ChevronDown, ChevronUp, Star, Copy, LayoutGrid,
} from 'lucide-react'
import { S_STEPS } from '@/lib/5s-constants'

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

interface TemplateOption {
  id: string
  type: string
  title: string
  sStep: number
  miniStep: number
}

interface StandardOption {
  id: string
  title: string
  sStep: number
  category: string
}

interface SlotTemplate {
  id: string
  slotId: string
  templateId: string
  sortOrder: number
  template: TemplateOption
}

interface SlotStandard {
  id: string
  slotId: string
  standardId: string
  sortOrder: number
  standard: StandardOption
}

interface BoardSlotData {
  id: string
  boardConfigId: string
  sStep: number
  miniStep: number
  templates: SlotTemplate[]
  standards: SlotStandard[]
}

interface BoardConfigData {
  id: string
  name: string
  description: string | null
  isDefault: boolean
  _count?: { slots: number; zones: number }
}

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════

const S_COLORS: Record<number, string> = {
  1: '#8B5CF6', 2: '#EAB308', 3: '#3B82F6', 4: '#F43F5E', 5: '#F97316',
}

const S_BG_COLORS: Record<number, string> = {
  1: 'bg-violet-50 border-violet-200',
  2: 'bg-yellow-50 border-yellow-200',
  3: 'bg-blue-50 border-blue-200',
  4: 'bg-rose-50 border-rose-200',
  5: 'bg-orange-50 border-orange-200',
}

const S_BORDER_COLORS: Record<number, string> = {
  1: 'border-l-violet-500',
  2: 'border-l-yellow-500',
  3: 'border-l-blue-500',
  4: 'border-l-rose-500',
  5: 'border-l-orange-500',
}

const PASO_LABELS: Record<number, { label: string; types: string[] }> = {
  1: { label: 'Formación y Exámenes', types: ['formacion', 'examen'] },
  2: { label: 'Fotografías (Antes/Después)', types: ['fotos'] },
  3: { label: 'Inventario / Estándar / Layout / Plan Limpieza', types: ['inventario', 'estandar', 'layout', 'plan_limpieza'] },
  4: { label: 'Autoevaluación / Plan de Acción', types: ['autoevaluacion', 'plan_accion'] },
  5: { label: 'Auditoría Externa / PDCA', types: ['auditoria', 'pdca'] },
}

const TYPE_LABELS: Record<string, string> = {
  formacion: 'Formación', examen: 'Examen', fotos: 'Fotos',
  inventario: 'Inventario', estandar: 'Estándar', layout: 'Layout',
  plan_limpieza: 'Plan Limpieza', autoevaluacion: 'Autoevaluación',
  plan_accion: 'Plan de Acción', auditoria: 'Auditoría', pdca: 'PDCA',
}

const TYPE_COLORS: Record<string, string> = {
  formacion: 'bg-blue-100 text-blue-700', examen: 'bg-amber-100 text-amber-700',
  fotos: 'bg-pink-100 text-pink-700', inventario: 'bg-green-100 text-green-700',
  estandar: 'bg-purple-100 text-purple-700', layout: 'bg-indigo-100 text-indigo-700',
  plan_limpieza: 'bg-sky-100 text-sky-700', autoevaluacion: 'bg-cyan-100 text-cyan-700',
  plan_accion: 'bg-orange-100 text-orange-700', auditoria: 'bg-red-100 text-red-700',
  pdca: 'bg-rose-100 text-rose-700',
}

const REFERENCE_WIDTH = 1100

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════

export default function Tablero5S() {
  const [configs, setConfigs] = useState<BoardConfigData[]>([])
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null)
  const [slots, setSlots] = useState<BoardSlotData[]>([])
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [standards, setStandards] = useState<StandardOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [savingSlot, setSavingSlot] = useState<string | null>(null)
  const [expandedCell, setExpandedCell] = useState<string | null>(null)

  // ─── Responsive scaling ───────────────────────────────────────────────
  const boardContainerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)

  const boardVisible = !!(selectedConfigId && configs.length > 0 && !isLoading)

  useLayoutEffect(() => {
    const container = boardContainerRef.current
    if (!container) return

    const update = () => {
      const containerWidth = container.clientWidth
      if (containerWidth === 0) return
      const newZoom = containerWidth / REFERENCE_WIDTH
      setZoom(newZoom)
    }

    update()

    const ro = new ResizeObserver(update)
    ro.observe(container)

    return () => ro.disconnect()
  }, [boardVisible])

  // Config edit dialog
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const [editingConfig, setEditingConfig] = useState<BoardConfigData | null>(null)
  const [configName, setConfigName] = useState('')
  const [configDescription, setConfigDescription] = useState('')
  const [configIsDefault, setConfigIsDefault] = useState(false)
  const [isSavingConfig, setIsSavingConfig] = useState(false)

  // ─── Data loading ────────────────────────────────────────────────────────
  const loadConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/board-configs')
      const data = await res.json()
      if (data.success) {
        const configsData = data.data || []
        setConfigs(configsData)
        // Auto-select default or first
        if (!selectedConfigId && configsData.length > 0) {
          const defaultConfig = configsData.find((c: BoardConfigData) => c.isDefault)
          setSelectedConfigId((defaultConfig || configsData[0]).id)
        }
      }
    } catch (error) {
      console.error('Error loading board configs:', error)
    }
  }, [selectedConfigId])

  const loadSlots = useCallback(async () => {
    if (!selectedConfigId) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/board-slots?boardConfigId=${selectedConfigId}`)
      const data = await res.json()
      if (data.success) {
        setSlots(data.data || [])
      }
    } catch (error) {
      console.error('Error loading board slots:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedConfigId])

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/templates?includeInactive=false')
      const data = await res.json()
      if (data.success) setTemplates(data.data || [])
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }, [])

  const loadStandards = useCallback(async () => {
    try {
      const res = await fetch('/api/standards')
      const data = await res.json()
      const list = data.standards || (Array.isArray(data) ? data : [])
      setStandards(list.map((s: any) => ({
        id: s.id, title: s.title, sStep: s.sStep, category: s.category,
      })))
    } catch (error) {
      console.error('Error loading standards:', error)
    }
  }, [])

  useEffect(() => { loadConfigs() }, [loadConfigs])
  useEffect(() => { if (selectedConfigId) loadSlots() }, [loadSlots])
  useEffect(() => { loadTemplates(); loadStandards() }, [loadTemplates, loadStandards])

  // ─── Slot helpers ────────────────────────────────────────────────────────
  const getSlot = (sStep: number, miniStep: number): BoardSlotData | undefined =>
    slots.find(s => s.sStep === sStep && s.miniStep === miniStep)

  const getTemplatesForPaso = (sStep: number, miniStep: number): TemplateOption[] => {
    const pasoConfig = PASO_LABELS[miniStep]
    if (!pasoConfig) return []
    return templates.filter(t => pasoConfig.types.includes(t.type) && t.sStep === sStep)
  }

  const getStandardsForS = (sStep: number): StandardOption[] =>
    standards.filter(s => s.sStep === sStep)

  // ─── Save slot ──────────────────────────────────────────────────────────
  const handleSaveSlot = async (sStep: number, miniStep: number, templateIds: string[], standardIds: string[]) => {
    if (!selectedConfigId) return
    const key = `${sStep}-${miniStep}`
    setSavingSlot(key)
    try {
      const res = await fetch('/api/board-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardConfigId: selectedConfigId, sStep, miniStep, templateIds, standardIds }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setSlots(prev => {
            const idx = prev.findIndex(s => s.sStep === sStep && s.miniStep === miniStep)
            if (idx >= 0) { const u = [...prev]; u[idx] = data.data; return u }
            return [...prev, data.data]
          })
        }
      }
    } catch (error) { console.error('Error saving board slot:', error) }
    finally { setSavingSlot(null) }
  }

  const handleToggleTemplate = async (sStep: number, miniStep: number, templateId: string) => {
    const slot = getSlot(sStep, miniStep)
    const currentIds = slot?.templates.map(t => t.templateId) || []
    const newIds = currentIds.includes(templateId) ? currentIds.filter(id => id !== templateId) : [...currentIds, templateId]
    await handleSaveSlot(sStep, miniStep, newIds, slot?.standards.map(s => s.standardId) || [])
  }

  const handleToggleStandard = async (sStep: number, miniStep: number, standardId: string) => {
    const slot = getSlot(sStep, miniStep)
    const templateIds = slot?.templates.map(t => t.templateId) || []
    const currentIds = slot?.standards.map(s => s.standardId) || []
    const newIds = currentIds.includes(standardId) ? currentIds.filter(id => id !== standardId) : [...currentIds, standardId]
    await handleSaveSlot(sStep, miniStep, templateIds, newIds)
  }

  const handleClearSlot = async (sStep: number, miniStep: number) => {
    await handleSaveSlot(sStep, miniStep, [], [])
    setExpandedCell(null)
  }

  // ─── Config CRUD ─────────────────────────────────────────────────────────
  const openNewConfig = () => {
    setEditingConfig(null)
    setConfigName('')
    setConfigDescription('')
    setConfigIsDefault(configs.length === 0)
    setShowConfigDialog(true)
  }

  const openEditConfig = (config: BoardConfigData) => {
    setEditingConfig(config)
    setConfigName(config.name)
    setConfigDescription(config.description || '')
    setConfigIsDefault(config.isDefault)
    setShowConfigDialog(true)
  }

  const handleSaveConfig = async () => {
    if (!configName) return
    setIsSavingConfig(true)
    try {
      if (editingConfig) {
        await fetch('/api/board-configs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingConfig.id, name: configName, description: configDescription, isDefault: configIsDefault }),
        })
      } else {
        await fetch('/api/board-configs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: configName, description: configDescription, isDefault: configIsDefault }),
        })
      }
      setShowConfigDialog(false)
      await loadConfigs()
    } catch (error) { console.error('Error saving config:', error) }
    finally { setIsSavingConfig(false) }
  }

  const handleDeleteConfig = async (id: string) => {
    if (!confirm('¿Eliminar este tablero? Las zonas que lo usen quedarán sin tablero asignado.')) return
    try {
      await fetch(`/api/board-configs?id=${id}`, { method: 'DELETE' })
      if (selectedConfigId === id) setSelectedConfigId(null)
      await loadConfigs()
    } catch (error) { console.error('Error deleting config:', error) }
  }

  const handleDuplicateConfig = async (config: BoardConfigData) => {
    const newName = `${config.name} (copia)`
    try {
      const res = await fetch('/api/board-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: config.description }),
      })
      const data = await res.json()
      if (data.success && data.data) {
        // Now copy all slots from the original config
        const sourceSlotsRes = await fetch(`/api/board-slots?boardConfigId=${config.id}`)
        const sourceSlotsData = await sourceSlotsRes.json()
        if (sourceSlotsData.success && sourceSlotsData.data) {
          for (const slot of sourceSlotsData.data) {
            const templateIds = slot.templates.map((t: SlotTemplate) => t.templateId)
            const standardIds = slot.standards.map((s: SlotStandard) => s.standardId)
            await fetch('/api/board-slots', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                boardConfigId: data.data.id,
                sStep: slot.sStep,
                miniStep: slot.miniStep,
                templateIds,
                standardIds,
              }),
            })
          }
        }
        await loadConfigs()
        setSelectedConfigId(data.data.id)
      }
    } catch (error) { console.error('Error duplicating config:', error) }
  }

  const handleSetDefault = async (config: BoardConfigData) => {
    try {
      await fetch('/api/board-configs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: config.id, isDefault: true }),
      })
      await loadConfigs()
    } catch (error) { console.error('Error setting default:', error) }
  }

  // ─── Render ──────────────────────────────────────────────────────────
  const selectedConfig = configs.find(c => c.id === selectedConfigId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
          <Settings2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Configuración de Tableros</h2>
          <p className="text-sm text-muted-foreground">
            Crea tableros con plantillas y estándares. Luego asígnalos a las zonas de cada proyecto.
          </p>
        </div>
      </div>

      {/* Board configs selector + CRUD */}
      <div className="border rounded-xl p-4 bg-gradient-to-r from-gray-50 to-white space-y-3">
        <div className="flex items-center gap-3">
          <Label className="text-sm font-semibold whitespace-nowrap">Tablero:</Label>
          <Select value={selectedConfigId || ''} onValueChange={setSelectedConfigId}>
            <SelectTrigger className="h-9 flex-1 max-w-md">
              <SelectValue placeholder="Selecciona un tablero" />
            </SelectTrigger>
            <SelectContent>
              {configs.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    {c.isDefault && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                    <span>{c.name}</span>
                    {c._count && (
                      <span className="text-xs text-gray-400">
                        ({c._count.zones} zona{c._count.zones !== 1 ? 's' : ''})
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={openNewConfig} className="gap-1">
            <Plus className="h-4 w-4" /> Nuevo
          </Button>
          {selectedConfig && (
            <>
              <Button variant="outline" size="sm" onClick={() => openEditConfig(selectedConfig)} className="gap-1">
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDuplicateConfig(selectedConfig)} className="gap-1">
                <Copy className="h-3.5 w-3.5" />
              </Button>
              {!selectedConfig.isDefault && (
                <Button variant="outline" size="sm" onClick={() => handleSetDefault(selectedConfig)}
                  className="gap-1 text-amber-600 hover:text-amber-700" title="Establecer como predeterminado">
                  <Star className="h-3.5 w-3.5" />
                </Button>
              )}
              {configs.length > 1 && (
                <Button variant="outline" size="sm" onClick={() => handleDeleteConfig(selectedConfig.id)}
                  className="gap-1 text-red-500 hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}
        </div>
        {selectedConfig && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <LayoutGrid className="h-3 w-3" />
            <span>Tablero: <strong>{selectedConfig.name}</strong></span>
            {selectedConfig.isDefault && (
              <Badge className="text-[9px] bg-amber-100 text-amber-700 border-0 px-1.5 py-0">
                <Star className="h-2.5 w-2.5 mr-0.5 fill-amber-500 text-amber-500" />Predeterminado
              </Badge>
            )}
            {selectedConfig.description && <span>· {selectedConfig.description}</span>}
          </div>
        )}
      </div>

      {/* No configs message */}
      {configs.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <LayoutGrid className="h-12 w-12 text-gray-300 mx-auto" />
          <p className="text-muted-foreground">No hay tableros configurados.</p>
          <Button onClick={openNewConfig} className="gap-2">
            <Plus className="h-4 w-4" /> Crear el primer tablero
          </Button>
        </div>
      )}

      {/* Board grid */}
      {selectedConfigId && configs.length > 0 && (
        isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
          </div>
        ) : (
          <div
            ref={boardContainerRef}
            className="w-full overflow-hidden"
          >
            <div
              style={{
                zoom: zoom,
                width: REFERENCE_WIDTH,
                transformOrigin: 'top left',
              }}
            >
              {/* Column headers */}
              <div className="grid grid-cols-[180px_repeat(5,1fr)] gap-2 mb-2">
                <div />
                {[1, 2, 3, 4, 5].map(paso => (
                  <div key={paso} className="text-center">
                    <div className="bg-gray-100 rounded-t-lg px-3 py-2">
                      <p className="text-xs font-bold text-gray-600">PASO {paso}</p>
                      <p className="text-[10px] text-gray-500 leading-tight">{PASO_LABELS[paso]?.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* S rows */}
              {S_STEPS.map(s => (
                <div key={s.id} className="grid grid-cols-[180px_repeat(5,1fr)] gap-2 mb-2">
                  <div className={`rounded-lg border-l-4 ${S_BORDER_COLORS[s.id]} ${S_BG_COLORS[s.id]} flex flex-col items-center justify-center p-3`}>
                    <span className="text-2xl font-black" style={{ color: S_COLORS[s.id] }}>S{s.id}</span>
                    <span className="text-xs font-semibold text-gray-700 mt-0.5">{s.japaneseName}</span>
                    <span className="text-[10px] text-gray-500">{s.spanishName}</span>
                  </div>

                  {[1, 2, 3, 4, 5].map(paso => {
                    const slot = getSlot(s.id, paso)
                    const pasoTemplates = getTemplatesForPaso(s.id, paso)
                    const pasoStandards = getStandardsForS(s.id)
                    const savingKey = `${s.id}-${paso}`
                    const isSaving = savingSlot === savingKey
                    const isExpanded = expandedCell === savingKey
                    const assignedTemplates = slot?.templates || []
                    const assignedStandards = slot?.standards || []
                    const hasAssignments = assignedTemplates.length > 0 || assignedStandards.length > 0

                    return (
                      <Card key={savingKey}
                        className={`border ${S_BG_COLORS[s.id]} border-l-4 ${S_BORDER_COLORS[s.id]} transition-all cursor-pointer hover:shadow-md ${isExpanded ? 'ring-2 ring-indigo-400 shadow-lg' : ''}`}
                        onClick={() => setExpandedCell(isExpanded ? null : savingKey)}>
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            {/* Templates */}
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3 text-gray-500" />
                              <span className="text-[10px] font-semibold text-gray-500 uppercase">Plantillas</span>
                              <Badge className="text-[9px] px-1.5 py-0 ml-auto bg-indigo-100 text-indigo-700">{assignedTemplates.length}</Badge>
                            </div>
                            {assignedTemplates.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {assignedTemplates.map(at => (
                                  <Badge key={at.id} className={`text-[9px] px-1 py-0 ${TYPE_COLORS[at.template.type] || 'bg-gray-100 text-gray-700'}`}>
                                    {TYPE_LABELS[at.template.type] || at.template.type}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-gray-400 italic">Sin plantillas</p>
                            )}

                            {/* Standards */}
                            <div className="flex items-center gap-1 mt-1">
                              <Award className="h-3 w-3 text-gray-500" />
                              <span className="text-[10px] font-semibold text-gray-500 uppercase">Estándares</span>
                              <Badge className="text-[9px] px-1.5 py-0 ml-auto bg-amber-100 text-amber-700">{assignedStandards.length}</Badge>
                            </div>
                            {assignedStandards.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {assignedStandards.map(as_ => (
                                  <Badge key={as_.id} className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700">
                                    {as_.standard.title.length > 20 ? as_.standard.title.slice(0, 20) + '...' : as_.standard.title}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-gray-400 italic">Sin estándares</p>
                            )}

                            <div className="flex items-center justify-center pt-1">
                              {isExpanded ? <ChevronUp className="h-3 w-3 text-gray-400" /> : <ChevronDown className="h-3 w-3 text-gray-400" />}
                            </div>
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t space-y-3" onClick={e => e.stopPropagation()}>
                              {/* Template checkboxes */}
                              <div>
                                <p className="text-[10px] font-bold text-gray-600 uppercase mb-2 flex items-center gap-1">
                                  <FileText className="h-3 w-3" /> Seleccionar Plantillas
                                </p>
                                {pasoTemplates.length === 0 ? (
                                  <p className="text-[10px] text-gray-400 italic px-2">
                                    No hay plantillas para S{s.id} Paso {paso}. Créalas en Plantillas.
                                  </p>
                                ) : (
                                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                    {pasoTemplates.map(t => {
                                      const isSelected = assignedTemplates.some(at => at.templateId === t.id)
                                      return (
                                        <label key={t.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors ${isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                                          <Checkbox checked={isSelected} onCheckedChange={() => handleToggleTemplate(s.id, paso, t.id)} disabled={isSaving} className="h-3.5 w-3.5" />
                                          <Badge className={`text-[9px] px-1 py-0 shrink-0 ${TYPE_COLORS[t.type] || 'bg-gray-100 text-gray-700'}`}>{TYPE_LABELS[t.type] || t.type}</Badge>
                                          <span className="truncate text-gray-700">{t.title}</span>
                                        </label>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Standard checkboxes */}
                              <div>
                                <p className="text-[10px] font-bold text-gray-600 uppercase mb-2 flex items-center gap-1">
                                  <Award className="h-3 w-3" /> Seleccionar Estándares
                                </p>
                                {pasoStandards.length === 0 ? (
                                  <p className="text-[10px] text-gray-400 italic px-2">
                                    No hay estándares para S{s.id}. Créalos en Plantillas → Estándares.
                                  </p>
                                ) : (
                                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                    {pasoStandards.map(std => {
                                      const isSelected = assignedStandards.some(as_ => as_.standardId === std.id)
                                      return (
                                        <label key={std.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors ${isSelected ? 'bg-amber-50 border border-amber-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                                          <Checkbox checked={isSelected} onCheckedChange={() => handleToggleStandard(s.id, paso, std.id)} disabled={isSaving} className="h-3.5 w-3.5" />
                                          <Badge className="text-[9px] px-1 py-0 bg-gray-100 text-gray-600 shrink-0">{std.category}</Badge>
                                          <span className="truncate text-gray-700">{std.title}</span>
                                        </label>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>

                              {isSaving && (
                                <div className="flex items-center gap-1 pt-1">
                                  <Loader2 className="h-3 w-3 animate-spin text-purple-500" />
                                  <span className="text-[9px] text-purple-500">Guardando...</span>
                                </div>
                              )}

                              {hasAssignments && !isSaving && (
                                <Button variant="ghost" size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleClearSlot(s.id, paso) }}
                                  className="h-6 w-full text-[10px] text-red-400 hover:text-red-600 hover:bg-red-50 p-0 mt-1">
                                  <Trash2 className="h-3 w-3 mr-0.5" /> Quitar todo
                                </Button>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Summary */}
      {selectedConfigId && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold">{slots.filter(s => s.templates.length > 0 || s.standards.length > 0).length}</span> de <span className="font-semibold">25</span> posiciones con asignaciones
            {' · '}
            <span className="font-semibold">{slots.reduce((acc, s) => acc + s.templates.length, 0)}</span> plantillas
            {' · '}
            <span className="font-semibold">{slots.reduce((acc, s) => acc + s.standards.length, 0)}</span> estándares
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(TYPE_LABELS).map(([type, label]) => (
              <Badge key={type} className={`text-[10px] ${TYPE_COLORS[type]}`}>{label}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Config Edit/Create Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingConfig ? <Edit3 className="h-5 w-5 text-blue-500" /> : <Plus className="h-5 w-5 text-green-500" />}
              {editingConfig ? 'Editar Tablero' : 'Nuevo Tablero'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre del Tablero</Label>
              <Input value={configName} onChange={e => setConfigName(e.target.value)} className="mt-1" placeholder="Ej: Tablero General, Tablero Almacén..." />
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Input value={configDescription} onChange={e => setConfigDescription(e.target.value)} className="mt-1" placeholder="Descripción del tablero" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={configIsDefault} onChange={e => setConfigIsDefault(e.target.checked)} className="rounded border-gray-300 h-4 w-4" />
              <span className="text-sm">Tablero predeterminado (se asigna a zonas sin tablero)</span>
            </label>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowConfigDialog(false)}>Cancelar</Button>
              <Button onClick={handleSaveConfig} disabled={!configName || isSavingConfig}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white gap-2">
                {isSavingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingConfig ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
