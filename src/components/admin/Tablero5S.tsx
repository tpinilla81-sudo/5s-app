'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2, X, FileText, Award, LayoutGrid } from 'lucide-react'
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

interface BoardSlotData {
  id: string
  sStep: number
  miniStep: number
  templateId: string | null
  standardId: string | null
  projectId: string | null
  template: TemplateOption | null
  standard: StandardOption | null
}

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════

const S_COLORS: Record<number, string> = {
  1: '#8B5CF6',
  2: '#EAB308',
  3: '#3B82F6',
  4: '#F43F5E',
  5: '#F97316',
}

const S_BG_COLORS: Record<number, string> = {
  1: 'bg-violet-50 border-violet-200',
  2: 'bg-yellow-50 border-yellow-200',
  3: 'bg-blue-50 border-blue-200',
  4: 'bg-rose-50 border-rose-200',
  5: 'bg-orange-50 border-orange-200',
}

const S_HEADER_COLORS: Record<number, string> = {
  1: 'bg-violet-100 text-violet-800',
  2: 'bg-yellow-100 text-yellow-800',
  3: 'bg-blue-100 text-blue-800',
  4: 'bg-rose-100 text-rose-800',
  5: 'bg-orange-100 text-orange-800',
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
  2: { label: 'Fotografías', types: ['fotos'] },
  3: { label: 'Inventario / Estándar', types: ['inventario', 'estandar'] },
  4: { label: 'Autoevaluación', types: ['autoevaluacion'] },
  5: { label: 'Auditoría', types: ['auditoria'] },
}

const TYPE_LABELS: Record<string, string> = {
  formacion: 'Formación',
  examen: 'Examen',
  fotos: 'Fotos',
  inventario: 'Inventario',
  estandar: 'Estándar',
  autoevaluacion: 'Autoevaluación',
  auditoria: 'Auditoría',
}

const TYPE_COLORS: Record<string, string> = {
  formacion: 'bg-blue-100 text-blue-700',
  examen: 'bg-amber-100 text-amber-700',
  fotos: 'bg-pink-100 text-pink-700',
  inventario: 'bg-green-100 text-green-700',
  estandar: 'bg-purple-100 text-purple-700',
  autoevaluacion: 'bg-cyan-100 text-cyan-700',
  auditoria: 'bg-red-100 text-red-700',
}

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════

export default function Tablero5S() {
  const [slots, setSlots] = useState<BoardSlotData[]>([])
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [standards, setStandards] = useState<StandardOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [savingSlot, setSavingSlot] = useState<string | null>(null)

  // ─── Data loading ────────────────────────────────────────────────────────
  const loadSlots = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/board-slots')
      const data = await res.json()
      if (data.success) {
        setSlots(data.data || [])
      }
    } catch (error) {
      console.error('Error loading board slots:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/templates?includeInactive=false')
      const data = await res.json()
      if (data.success) {
        setTemplates(data.data || [])
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }, [])

  const loadStandards = useCallback(async () => {
    try {
      const res = await fetch('/api/standards')
      const data = await res.json()
      if (data.success && data.standards) {
        setStandards(data.standards.map((s: any) => ({
          id: s.id,
          title: s.title,
          sStep: s.sStep,
          category: s.category,
        })))
      } else if (Array.isArray(data)) {
        setStandards(data.map((s: any) => ({
          id: s.id,
          title: s.title,
          sStep: s.sStep,
          category: s.category,
        })))
      }
    } catch (error) {
      console.error('Error loading standards:', error)
    }
  }, [])

  useEffect(() => {
    loadSlots()
    loadTemplates()
    loadStandards()
  }, [loadSlots, loadTemplates, loadStandards])

  // ─── Slot helpers ────────────────────────────────────────────────────────
  const getSlot = (sStep: number, miniStep: number): BoardSlotData | undefined => {
    return slots.find(s => s.sStep === sStep && s.miniStep === miniStep)
  }

  const getTemplatesForPaso = (sStep: number, miniStep: number): TemplateOption[] => {
    const pasoConfig = PASO_LABELS[miniStep]
    if (!pasoConfig) return []
    // Get templates that match this paso's types AND this S step
    return templates.filter(t => pasoConfig.types.includes(t.type) && t.sStep === sStep)
  }

  const getStandardsForS = (sStep: number): StandardOption[] => {
    return standards.filter(s => s.sStep === sStep)
  }

  // ─── Save slot ────────────────────────────────────────────────────────
  const handleSaveSlot = async (sStep: number, miniStep: number, templateId: string | null, standardId: string | null) => {
    const key = `${sStep}-${miniStep}`
    setSavingSlot(key)
    try {
      const res = await fetch('/api/board-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sStep, miniStep, templateId, standardId }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          // Update local state
          setSlots(prev => {
            const existing = prev.findIndex(s => s.sStep === sStep && s.miniStep === miniStep)
            if (existing >= 0) {
              const updated = [...prev]
              updated[existing] = data.data
              return updated
            }
            return [...prev, data.data]
          })
        }
      }
    } catch (error) {
      console.error('Error saving board slot:', error)
    } finally {
      setSavingSlot(null)
    }
  }

  const handleClearSlot = async (sStep: number, miniStep: number) => {
    await handleSaveSlot(sStep, miniStep, null, null)
  }

  // ─── Render ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
        <p className="text-sm text-muted-foreground">Cargando tablero 5S...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
          <LayoutGrid className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Tablero 5S</h2>
          <p className="text-sm text-muted-foreground">
            Asigna plantillas y estándares a cada paso de cada S. Las plantillas se alimentan desde la biblioteca de Plantillas.
          </p>
        </div>
      </div>

      {/* Column headers */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Paso column headers */}
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
          {S_STEPS.map(s => {
            const sColor = S_COLORS[s.id]
            return (
              <div key={s.id} className="grid grid-cols-[180px_repeat(5,1fr)] gap-2 mb-2">
                {/* S label */}
                <div className={`rounded-lg border-l-4 ${S_BORDER_COLORS[s.id]} ${S_BG_COLORS[s.id]} flex flex-col items-center justify-center p-3`}>
                  <span
                    className="text-2xl font-black"
                    style={{ color: sColor }}
                  >
                    S{s.id}
                  </span>
                  <span className="text-xs font-semibold text-gray-700 mt-0.5">{s.japaneseName}</span>
                  <span className="text-[10px] text-gray-500">{s.spanishName}</span>
                </div>

                {/* Paso cells */}
                {[1, 2, 3, 4, 5].map(paso => {
                  const slot = getSlot(s.id, paso)
                  const pasoTemplates = getTemplatesForPaso(s.id, paso)
                  const pasoStandards = getStandardsForS(s.id)
                  const savingKey = `${s.id}-${paso}`
                  const isSaving = savingSlot === savingKey
                  const assignedTemplate = slot?.template
                  const assignedStandard = slot?.standard

                  return (
                    <Card
                      key={`${s.id}-${paso}`}
                      className={`border ${S_BG_COLORS[s.id]} border-l-4 ${S_BORDER_COLORS[s.id]} transition-shadow hover:shadow-md`}
                    >
                      <CardContent className="p-3 space-y-2">
                        {/* Plantilla selector */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-gray-500 uppercase flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Plantilla
                          </label>
                          <Select
                            value={slot?.templateId || '__none__'}
                            onValueChange={(val) => {
                              handleSaveSlot(s.id, paso, val === '__none__' ? null : val, slot?.standardId || null)
                            }}
                            disabled={isSaving}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Sin plantilla" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">
                                <span className="text-gray-400">— Sin plantilla —</span>
                              </SelectItem>
                              {pasoTemplates.map(t => (
                                <SelectItem key={t.id} value={t.id}>
                                  <div className="flex items-center gap-1.5">
                                    <Badge className={`text-[9px] px-1 py-0 ${TYPE_COLORS[t.type] || 'bg-gray-100 text-gray-700'}`}>
                                      {TYPE_LABELS[t.type] || t.type}
                                    </Badge>
                                    <span className="truncate max-w-[150px]">{t.title}</span>
                                  </div>
                                </SelectItem>
                              ))}
                              {pasoTemplates.length === 0 && (
                                <div className="px-2 py-1.5 text-xs text-gray-400 italic">
                                  No hay plantillas de este tipo para S{s.id}
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                          {assignedTemplate && (
                            <div className="flex items-center gap-1">
                              <Badge className={`text-[9px] px-1 py-0 ${TYPE_COLORS[assignedTemplate.type] || 'bg-gray-100 text-gray-700'}`}>
                                {TYPE_LABELS[assignedTemplate.type] || assignedTemplate.type}
                              </Badge>
                              <span className="text-[10px] text-gray-600 truncate max-w-[120px]" title={assignedTemplate.title}>
                                {assignedTemplate.title}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Estándar selector */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-gray-500 uppercase flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            Estándar
                          </label>
                          <Select
                            value={slot?.standardId || '__none__'}
                            onValueChange={(val) => {
                              handleSaveSlot(s.id, paso, slot?.templateId || null, val === '__none__' ? null : val)
                            }}
                            disabled={isSaving}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Sin estándar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">
                                <span className="text-gray-400">— Sin estándar —</span>
                              </SelectItem>
                              {pasoStandards.map(std => (
                                <SelectItem key={std.id} value={std.id}>
                                  <div className="flex items-center gap-1.5">
                                    <Badge className="text-[9px] px-1 py-0 bg-gray-100 text-gray-700">
                                      {std.category}
                                    </Badge>
                                    <span className="truncate max-w-[150px]">{std.title}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {assignedStandard && (
                            <span className="text-[10px] text-gray-600 truncate max-w-[160px] block" title={assignedStandard.title}>
                              {assignedStandard.title}
                            </span>
                          )}
                        </div>

                        {/* Saving indicator */}
                        {isSaving && (
                          <div className="flex items-center gap-1 pt-1">
                            <Loader2 className="h-3 w-3 animate-spin text-purple-500" />
                            <span className="text-[9px] text-purple-500">Guardando...</span>
                          </div>
                        )}

                        {/* Clear button */}
                        {(assignedTemplate || assignedStandard) && !isSaving && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleClearSlot(s.id, paso)}
                            className="h-6 w-full text-[10px] text-red-400 hover:text-red-600 hover:bg-red-50 p-0 mt-1"
                          >
                            <X className="h-3 w-3 mr-0.5" /> Limpiar
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold">{slots.filter(s => s.templateId || s.standardId).length}</span> de <span className="font-semibold">25</span> posiciones asignadas
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <Badge key={type} className={`text-[10px] ${TYPE_COLORS[type]}`}>
              {label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
