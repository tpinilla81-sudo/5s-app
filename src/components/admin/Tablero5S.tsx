'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, X, FileText, Award, LayoutGrid, Plus, Trash2, Copy, Star, Settings } from 'lucide-react'
import { S_STEPS } from '@/lib/5s-constants'

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

interface TemplateOption {
  id: string; type: string; title: string; sStep: number; miniStep: number
}

interface StandardOption {
  id: string; title: string; sStep: number; category: string
}

interface BoardSlotData {
  id: string; sStep: number; miniStep: number; templateId: string | null; standardId: string | null; boardId: string | null
  template: TemplateOption | null; standard: StandardOption | null
}

interface BoardData {
  id: string; name: string; description: string | null; isDefault: boolean; companyId: string | null
  slots: BoardSlotData[]; _count?: { zones: number }
}

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════

const S_COLORS: Record<number, string> = { 1: '#8B5CF6', 2: '#EAB308', 3: '#3B82F6', 4: '#F43F5E', 5: '#F97316' }
const S_BG_COLORS: Record<number, string> = { 1: 'bg-violet-50 border-violet-200', 2: 'bg-yellow-50 border-yellow-200', 3: 'bg-blue-50 border-blue-200', 4: 'bg-rose-50 border-rose-200', 5: 'bg-orange-50 border-orange-200' }
const S_BORDER_COLORS: Record<number, string> = { 1: 'border-l-violet-500', 2: 'border-l-yellow-500', 3: 'border-l-blue-500', 4: 'border-l-rose-500', 5: 'border-l-orange-500' }

const PASO_LABELS: Record<number, { label: string; types: string[] }> = {
  1: { label: 'Formación y Exámenes', types: ['formacion', 'examen'] },
  2: { label: 'Fotografías', types: ['fotos'] },
  3: { label: 'Inventario / Estándar', types: ['inventario', 'estandar'] },
  4: { label: 'Autoevaluación', types: ['autoevaluacion'] },
  5: { label: 'Auditoría', types: ['auditoria'] },
}

const TYPE_LABELS: Record<string, string> = {
  formacion: 'Formación', examen: 'Examen', fotos: 'Fotos', inventario: 'Inventario',
  estandar: 'Estándar', autoevaluacion: 'Autoevaluación', auditoria: 'Auditoría',
}

const TYPE_COLORS: Record<string, string> = {
  formacion: 'bg-blue-100 text-blue-700', examen: 'bg-amber-100 text-amber-700',
  fotos: 'bg-pink-100 text-pink-700', inventario: 'bg-green-100 text-green-700',
  estandar: 'bg-purple-100 text-purple-700', autoevaluacion: 'bg-cyan-100 text-cyan-700',
  auditoria: 'bg-red-100 text-red-700',
}

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════

export default function Tablero5S() {
  const [boards, setBoards] = useState<BoardData[]>([])
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [slots, setSlots] = useState<BoardSlotData[]>([])
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [standards, setStandards] = useState<StandardOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [savingSlot, setSavingSlot] = useState<string | null>(null)
  const [showCreateBoard, setShowCreateBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [newBoardDesc, setNewBoardDesc] = useState('')
  const [copyFromBoard, setCopyFromBoard] = useState<string | null>(null)

  // ─── Data loading ────────────────────────────────────────────────────────
  const loadBoards = useCallback(async () => {
    try {
      const res = await fetch('/api/boards')
      const data = await res.json()
      if (data.success) {
        const boardsData = data.data || []
        setBoards(boardsData)
        // Auto-select default board if none selected
        if (!selectedBoardId && boardsData.length > 0) {
          const defaultBoard = boardsData.find((b: BoardData) => b.isDefault) || boardsData[0]
          setSelectedBoardId(defaultBoard.id)
          setSlots(defaultBoard.slots || [])
        }
      }
    } catch (error) { console.error('Error loading boards:', error) }
  }, [selectedBoardId])

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/templates?includeInactive=false')
      const data = await res.json()
      if (data.success) setTemplates(data.data || [])
    } catch (error) { console.error('Error loading templates:', error) }
  }, [])

  const loadStandards = useCallback(async () => {
    try {
      const res = await fetch('/api/standards')
      const data = await res.json()
      const list = data.standards || (Array.isArray(data) ? data : [])
      setStandards(list.map((s: any) => ({ id: s.id, title: s.title, sStep: s.sStep, category: s.category })))
    } catch (error) { console.error('Error loading standards:', error) }
  }, [])

  useEffect(() => { loadBoards(); loadTemplates(); loadStandards() }, [loadBoards, loadTemplates, loadStandards])

  // ─── Board selection ─────────────────────────────────────────────────────
  const handleSelectBoard = (boardId: string) => {
    setSelectedBoardId(boardId)
    const board = boards.find(b => b.id === boardId)
    setSlots(board?.slots || [])
  }

  // ─── Create board ────────────────────────────────────────────────────────
  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBoardName.trim(),
          description: newBoardDesc.trim() || null,
          isDefault: false,
          copyFromBoardId: copyFromBoard,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setShowCreateBoard(false)
          setNewBoardName('')
          setNewBoardDesc('')
          setCopyFromBoard(null)
          await loadBoards()
          setSelectedBoardId(data.data.id)
          setSlots(data.data.slots || [])
        }
      }
    } catch (error) { console.error('Error creating board:', error) }
    finally { setIsLoading(false) }
  }

  // ─── Delete board ────────────────────────────────────────────────────────
  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('¿Eliminar este tablero? Las zonas que lo usen volverán al tablero por defecto.')) return
    try {
      const res = await fetch(`/api/boards/${boardId}`, { method: 'DELETE' })
      if (res.ok) {
        await loadBoards()
        if (selectedBoardId === boardId) {
          const defaultBoard = boards.find(b => b.isDefault && b.id !== boardId)
          if (defaultBoard) { setSelectedBoardId(defaultBoard.id); setSlots(defaultBoard.slots || []) }
        }
      }
    } catch (error) { console.error('Error deleting board:', error) }
  }

  // ─── Slot helpers ────────────────────────────────────────────────────────
  const getSlot = (sStep: number, miniStep: number) => slots.find(s => s.sStep === sStep && s.miniStep === miniStep)
  const getTemplatesForPaso = (sStep: number, miniStep: number) => {
    const pasoConfig = PASO_LABELS[miniStep]
    if (!pasoConfig) return []
    return templates.filter(t => pasoConfig.types.includes(t.type) && t.sStep === sStep)
  }
  const getStandardsForS = (sStep: number) => standards.filter(s => s.sStep === sStep)

  // ─── Save slot ────────────────────────────────────────────────────────
  const handleSaveSlot = async (sStep: number, miniStep: number, templateId: string | null, standardId: string | null) => {
    const key = `${sStep}-${miniStep}`
    setSavingSlot(key)
    try {
      const res = await fetch('/api/board-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sStep, miniStep, templateId, standardId, boardId: selectedBoardId }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setSlots(prev => {
            const existing = prev.findIndex(s => s.sStep === sStep && s.miniStep === miniStep)
            if (existing >= 0) { const updated = [...prev]; updated[existing] = data.data; return updated }
            return [...prev, data.data]
          })
        }
      }
    } catch (error) { console.error('Error saving board slot:', error) }
    finally { setSavingSlot(null) }
  }

  const handleClearSlot = async (sStep: number, miniStep: number) => {
    await handleSaveSlot(sStep, miniStep, null, null)
  }

  const selectedBoard = boards.find(b => b.id === selectedBoardId)

  // ─── Render ──────────────────────────────────────────────────────────
  if (isLoading && boards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
        <p className="text-sm text-muted-foreground">Cargando tableros...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <LayoutGrid className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Configuración de Tableros</h2>
            <p className="text-sm text-muted-foreground">
              Crea y configura tableros 5S. Asigna plantillas y estándares a cada posición.
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateBoard(true)} className="gap-2" size="sm">
          <Plus className="h-4 w-4" /> Nuevo Tablero
        </Button>
      </div>

      {/* Board selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Tablero activo:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {boards.map(board => (
                <Button
                  key={board.id}
                  variant={selectedBoardId === board.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSelectBoard(board.id)}
                  className="gap-1.5"
                >
                  {board.isDefault && <Star className="h-3 w-3 text-yellow-400" />}
                  {board.name}
                  {board._count?.zones ? (
                    <Badge variant="secondary" className="text-[9px] ml-1 px-1">{board._count.zones} zona{board._count.zones > 1 ? 's' : ''}</Badge>
                  ) : null}
                </Button>
              ))}
            </div>
          </div>

          {/* Board info */}
          {selectedBoard && (
            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  {selectedBoard.description || 'Sin descripción'}
                  {selectedBoard.isDefault && <span className="ml-2 text-yellow-600 font-medium">(Tablero por defecto)</span>}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {slots.filter(s => s.templateId || s.standardId).length} de 25 posiciones asignadas
                </p>
              </div>
              {!selectedBoard.isDefault && (
                <Button variant="ghost" size="sm" onClick={() => handleDeleteBoard(selectedBoard.id)} className="text-red-500 hover:text-red-700 gap-1">
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create board dialog */}
      {showCreateBoard && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Crear Nuevo Tablero</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Nombre *</label>
                <Input value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} placeholder="Ej: Tablero Taller" className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Descripción</label>
                <Input value={newBoardDesc} onChange={(e) => setNewBoardDesc(e.target.value)} placeholder="Opcional" className="h-8 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Copiar configuración de:</label>
              <Select value={copyFromBoard || '__none__'} onValueChange={(v) => setCopyFromBoard(v === '__none__' ? null : v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Empezar vacío" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Empezar vacío</SelectItem>
                  {boards.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      <div className="flex items-center gap-1.5">
                        <Copy className="h-3 w-3" /> {b.name} {b.isDefault ? '(Genérico)' : ''}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreateBoard} disabled={!newBoardName.trim()} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Crear
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowCreateBoard(false); setNewBoardName(''); setNewBoardDesc(''); setCopyFromBoard(null) }}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Column headers */}
      {selectedBoardId && (
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
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

            {S_STEPS.map(s => {
              const sColor = S_COLORS[s.id]
              return (
                <div key={s.id} className="grid grid-cols-[180px_repeat(5,1fr)] gap-2 mb-2">
                  <div className={`rounded-lg border-l-4 ${S_BORDER_COLORS[s.id]} ${S_BG_COLORS[s.id]} flex flex-col items-center justify-center p-3`}>
                    <span className="text-2xl font-black" style={{ color: sColor }}>S{s.id}</span>
                    <span className="text-xs font-semibold text-gray-700 mt-0.5">{s.japaneseName}</span>
                    <span className="text-[10px] text-gray-500">{s.spanishName}</span>
                  </div>

                  {[1, 2, 3, 4, 5].map(paso => {
                    const slot = getSlot(s.id, paso)
                    const pasoTemplates = getTemplatesForPaso(s.id, paso)
                    const pasoStandards = getStandardsForS(s.id)
                    const savingKey = `${s.id}-${paso}`
                    const isSaving = savingSlot === savingKey
                    const assignedTemplate = slot?.template
                    const assignedStandard = slot?.standard

                    return (
                      <Card key={`${s.id}-${paso}`} className={`border ${S_BG_COLORS[s.id]} border-l-4 ${S_BORDER_COLORS[s.id]} transition-shadow hover:shadow-md`}>
                        <CardContent className="p-3 space-y-2">
                          {/* Plantilla selector */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-gray-500 uppercase flex items-center gap-1">
                              <FileText className="h-3 w-3" /> Plantilla
                            </label>
                            <Select
                              value={slot?.templateId || '__none__'}
                              onValueChange={(val) => handleSaveSlot(s.id, paso, val === '__none__' ? null : val, slot?.standardId || null)}
                              disabled={isSaving}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sin plantilla" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__"><span className="text-gray-400">— Sin plantilla —</span></SelectItem>
                                {pasoTemplates.map(t => (
                                  <SelectItem key={t.id} value={t.id}>
                                    <div className="flex items-center gap-1.5">
                                      <Badge className={`text-[9px] px-1 py-0 ${TYPE_COLORS[t.type] || 'bg-gray-100 text-gray-700'}`}>{TYPE_LABELS[t.type] || t.type}</Badge>
                                      <span className="truncate max-w-[150px]">{t.title}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                                {pasoTemplates.length === 0 && <div className="px-2 py-1.5 text-xs text-gray-400 italic">No hay plantillas para S{s.id}</div>}
                              </SelectContent>
                            </Select>
                            {assignedTemplate && (
                              <div className="flex items-center gap-1">
                                <Badge className={`text-[9px] px-1 py-0 ${TYPE_COLORS[assignedTemplate.type] || 'bg-gray-100 text-gray-700'}`}>{TYPE_LABELS[assignedTemplate.type] || assignedTemplate.type}</Badge>
                                <span className="text-[10px] text-gray-600 truncate max-w-[120px]" title={assignedTemplate.title}>{assignedTemplate.title}</span>
                              </div>
                            )}
                          </div>

                          {/* Estándar selector */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-gray-500 uppercase flex items-center gap-1">
                              <Award className="h-3 w-3" /> Estándar
                            </label>
                            <Select
                              value={slot?.standardId || '__none__'}
                              onValueChange={(val) => handleSaveSlot(s.id, paso, slot?.templateId || null, val === '__none__' ? null : val)}
                              disabled={isSaving}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sin estándar" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__"><span className="text-gray-400">— Sin estándar —</span></SelectItem>
                                {pasoStandards.map(std => (
                                  <SelectItem key={std.id} value={std.id}>
                                    <div className="flex items-center gap-1.5">
                                      <Badge className="text-[9px] px-1 py-0 bg-gray-100 text-gray-700">{std.category}</Badge>
                                      <span className="truncate max-w-[150px]">{std.title}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {assignedStandard && (
                              <span className="text-[10px] text-gray-600 truncate max-w-[160px] block" title={assignedStandard.title}>{assignedStandard.title}</span>
                            )}
                          </div>

                          {isSaving && (
                            <div className="flex items-center gap-1 pt-1">
                              <Loader2 className="h-3 w-3 animate-spin text-purple-500" />
                              <span className="text-[9px] text-purple-500">Guardando...</span>
                            </div>
                          )}

                          {(assignedTemplate || assignedStandard) && !isSaving && (
                            <Button variant="ghost" size="sm" onClick={() => handleClearSlot(s.id, paso)} className="h-6 w-full text-[10px] text-red-400 hover:text-red-600 hover:bg-red-50 p-0 mt-1">
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
      )}

      {/* Summary */}
      {selectedBoardId && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold">{slots.filter(s => s.templateId || s.standardId).length}</span> de <span className="font-semibold">25</span> posiciones asignadas
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(TYPE_LABELS).map(([type, label]) => (
              <Badge key={type} className={`text-[10px] ${TYPE_COLORS[type]}`}>{label}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
