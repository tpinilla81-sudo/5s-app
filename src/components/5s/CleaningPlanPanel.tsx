'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Sparkles, Plus, Trash2, Edit, Save, X, Droplets, Clock, Wrench, MapPin,
} from 'lucide-react'
import { use5SStore } from '@/lib/store'
import { toast } from 'sonner'

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

interface CleaningPoint {
  id: string
  puntoLimpieza: string
  tipoSuciedad: string
  ubicacion: string
  frecuencia: string
  productoLimpieza: string
  herramientaLimpieza: string
  responsable: string
  tiempoEstimado: string
  observaciones: string
}

interface CleaningPlanPanelProps {
  sStep: number
  inventoryItems: Array<{ name: string; location?: string | null; category: string; extra?: string | null }>
  isReadOnly: boolean
}

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════

const TIPO_SUCIEDAD_OPTIONS = ['Polvo', 'Grasa', 'Mancha', 'Residuos', 'Humedad', 'Oxidación', 'Otro']
const FRECUENCIA_OPTIONS = ['Diaria', '3 veces/semana', 'Semanal', 'Quincenal', 'Mensual', 'Trimestral']
const PRODUCTO_OPTIONS = ['Desengrasante', 'Detergente neutro', 'Desinfectante', 'Limpiacristales', 'Desincrustante', 'Disolvente', 'Agua jabonosa', 'Otro']
const HERRAMIENTA_OPTIONS = ['Paño/microfibra', 'Mopa/fregona', 'Escoba/cepillo', 'Aspiradora', 'Pulidora', 'Bayeta', 'Rasqueta', 'Esponja', 'Otro']

const FRECUENCIA_COLORS: Record<string, string> = {
  'Diaria': 'bg-red-100 text-red-800',
  '3 veces/semana': 'bg-orange-100 text-orange-800',
  'Semanal': 'bg-amber-100 text-amber-800',
  'Quincenal': 'bg-yellow-100 text-yellow-800',
  'Mensual': 'bg-blue-100 text-blue-800',
  'Trimestral': 'bg-gray-100 text-gray-800',
}

const EMPTY_POINT: Omit<CleaningPoint, 'id'> = {
  puntoLimpieza: '',
  tipoSuciedad: '',
  ubicacion: '',
  frecuencia: '',
  productoLimpieza: '',
  herramientaLimpieza: '',
  responsable: '',
  tiempoEstimado: '',
  observaciones: '',
}

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════

export default function CleaningPlanPanel({ sStep, inventoryItems, isReadOnly }: CleaningPlanPanelProps) {
  const { currentProject, currentZone, currentUser } = use5SStore()
  const [cleaningPoints, setCleaningPoints] = useState<CleaningPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingPoint, setEditingPoint] = useState<CleaningPoint | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Load existing cleaning plan from standards
  const loadCleaningPlan = useCallback(async () => {
    if (!currentProject) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        projectId: currentProject.id,
        category: 'procedimiento',
        sStep: String(sStep),
      })
      if (currentZone?.id) params.set('zoneId', currentZone.id)
      const res = await fetch(`/api/standards?${params}`)
      const json = await res.json()
      if (json.success && json.data) {
        // Filter for cleaning plan standards (those with content containing cleaningPlan: true)
        const planStandards = json.data.filter((s: any) => {
          try {
            const content = typeof s.content === 'string' ? JSON.parse(s.content) : s.content
            return content?.cleaningPlan === true
          } catch { return false }
        })
        if (planStandards.length > 0) {
          // Load points from the first plan
          try {
            const content = typeof planStandards[0].content === 'string'
              ? JSON.parse(planStandards[0].content) : planStandards[0].content
            setCleaningPoints(content.points || [])
          } catch {
            setCleaningPoints([])
          }
        }
      }
    } catch (e) {
      console.error('Error loading cleaning plan:', e)
    } finally {
      setIsLoading(false)
    }
  }, [currentProject, currentZone, sStep])

  useEffect(() => {
    loadCleaningPlan()
  }, [loadCleaningPlan])

  // Save cleaning plan to standards
  const saveCleaningPlan = async (points: CleaningPoint[]) => {
    if (!currentProject) return
    setIsSaving(true)
    try {
      // Check if a cleaning plan standard already exists
      const params = new URLSearchParams({
        projectId: currentProject.id,
        category: 'procedimiento',
        sStep: String(sStep),
      })
      if (currentZone?.id) params.set('zoneId', currentZone.id)
      const res = await fetch(`/api/standards?${params}`)
      const json = await res.json()
      const existing = (json.data || []).find((s: any) => {
        try {
          const content = typeof s.content === 'string' ? JSON.parse(s.content) : s.content
          return content?.cleaningPlan === true
        } catch { return false }
      })

      const planContent = JSON.stringify({ cleaningPlan: true, points })

      if (existing) {
        // Update
        await fetch('/api/standards', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: existing.id, content: planContent }),
        })
      } else {
        // Create
        await fetch('/api/standards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sStep,
            title: `Plan de Limpieza e Inspección — S${sStep}`,
            description: 'Plan de limpieza definido a partir del inventario de puntos de suciedad',
            category: 'procedimiento',
            content: planContent,
            status: 'activo',
            version: 1,
            projectId: currentProject.id,
            zoneId: currentZone?.id || null,
          }),
        })
      }
      toast.success('Plan de limpieza guardado')
    } catch (e) {
      console.error('Error saving cleaning plan:', e)
      toast.error('Error al guardar el plan de limpieza')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddPoint = () => {
    setEditingPoint({ id: `new_${Date.now()}`, ...EMPTY_POINT })
    setShowForm(true)
  }

  const handleEditPoint = (point: CleaningPoint) => {
    setEditingPoint({ ...point })
    setShowForm(true)
  }

  const handleDeletePoint = (id: string) => {
    const updated = cleaningPoints.filter(p => p.id !== id)
    setCleaningPoints(updated)
    saveCleaningPlan(updated)
  }

  const handleSavePoint = () => {
    if (!editingPoint) return
    if (!editingPoint.puntoLimpieza || !editingPoint.frecuencia || !editingPoint.responsable) {
      toast.error('Completa al menos: Punto de Limpieza, Frecuencia y Responsable')
      return
    }

    let updated: CleaningPoint[]
    const existingIdx = cleaningPoints.findIndex(p => p.id === editingPoint.id)
    if (existingIdx >= 0) {
      updated = [...cleaningPoints]
      updated[existingIdx] = editingPoint
    } else {
      updated = [...cleaningPoints, editingPoint]
    }
    setCleaningPoints(updated)
    saveCleaningPlan(updated)
    setShowForm(false)
    setEditingPoint(null)
  }

  // Generate points from inventory items (auto-fill from dirt points inventory)
  const handleGenerateFromInventory = () => {
    if (inventoryItems.length === 0) {
      toast.error('No hay puntos de suciedad en el inventario para generar el plan')
      return
    }

    const existingNames = new Set(cleaningPoints.map(p => p.puntoLimpieza.toLowerCase()))
    const newPoints: CleaningPoint[] = []

    for (const item of inventoryItems) {
      if (existingNames.has(item.name.toLowerCase())) continue

      // Parse extra fields for auto-fill
      let extraData: Record<string, string> = {}
      if (item.extra) {
        try { extraData = JSON.parse(item.extra) } catch {}
      }

      newPoints.push({
        id: `gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        puntoLimpieza: item.name,
        tipoSuciedad: item.category || '',
        ubicacion: item.location || '',
        frecuencia: extraData.frecuenciaLimpieza || '',
        productoLimpieza: extraData.metodoLimpieza || '',
        herramientaLimpieza: '',
        responsable: '',
        tiempoEstimado: '',
        observaciones: '',
      })
    }

    if (newPoints.length === 0) {
      toast.info('Todos los puntos del inventario ya están en el plan de limpieza')
      return
    }

    const updated = [...cleaningPoints, ...newPoints]
    setCleaningPoints(updated)
    saveCleaningPlan(updated)
    toast.success(`${newPoints.length} puntos generados desde el inventario. Completa frecuencia, productos y responsable.`)
  }

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <span className="ml-2 text-xs text-muted-foreground">Cargando plan de limpieza...</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-800">
            Plan de Limpieza e Inspección ({cleaningPoints.length} puntos)
          </span>
        </div>
        {!isReadOnly && (
          <div className="flex items-center gap-2">
            {inventoryItems.length > 0 && (
              <Button size="sm" variant="outline"
                onClick={handleGenerateFromInventory}
                className="gap-1 text-[10px] h-7 border-blue-300 text-blue-700 hover:bg-blue-50">
                <Sparkles className="h-3 w-3" /> Generar desde Inventario
              </Button>
            )}
            <Button size="sm" onClick={handleAddPoint}
              className="gap-1 text-[10px] h-7 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-3 w-3" /> Añadir Punto
            </Button>
          </div>
        )}
      </div>

      {/* Cleaning points table */}
      {cleaningPoints.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="bg-blue-50 border-b">
                  <th className="text-left p-2 font-semibold text-blue-800">Punto</th>
                  <th className="text-left p-2 font-semibold text-blue-800">Tipo</th>
                  <th className="text-left p-2 font-semibold text-blue-800">Ubicación</th>
                  <th className="text-left p-2 font-semibold text-blue-800">Frecuencia</th>
                  <th className="text-left p-2 font-semibold text-blue-800">Producto</th>
                  <th className="text-left p-2 font-semibold text-blue-800">Herramienta</th>
                  <th className="text-left p-2 font-semibold text-blue-800">Responsable</th>
                  <th className="text-left p-2 font-semibold text-blue-800">Min</th>
                  {!isReadOnly && <th className="p-2"></th>}
                </tr>
              </thead>
              <tbody>
                {cleaningPoints.map((point, idx) => (
                  <tr key={point.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/30`}>
                    <td className="p-2 font-medium max-w-[120px] truncate" title={point.puntoLimpieza}>
                      {point.puntoLimpieza}
                    </td>
                    <td className="p-2">
                      {point.tipoSuciedad && (
                        <Badge className={`text-[8px] px-1 py-0 ${
                          point.tipoSuciedad === 'Grasa' ? 'bg-yellow-100 text-yellow-800' :
                          point.tipoSuciedad === 'Polvo' ? 'bg-gray-100 text-gray-800' :
                          point.tipoSuciedad === 'Oxidación' ? 'bg-amber-100 text-amber-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {point.tipoSuciedad}
                        </Badge>
                      )}
                    </td>
                    <td className="p-2 max-w-[80px] truncate" title={point.ubicacion}>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5 text-gray-400 shrink-0" />
                        {point.ubicacion || '-'}
                      </div>
                    </td>
                    <td className="p-2">
                      {point.frecuencia ? (
                        <Badge className={`text-[8px] px-1 py-0 ${FRECUENCIA_COLORS[point.frecuencia] || 'bg-gray-100 text-gray-800'}`}>
                          {point.frecuencia}
                        </Badge>
                      ) : <span className="text-red-400">—</span>}
                    </td>
                    <td className="p-2 max-w-[80px] truncate" title={point.productoLimpieza}>
                      <div className="flex items-center gap-1">
                        <Droplets className="h-2.5 w-2.5 text-cyan-400 shrink-0" />
                        {point.productoLimpieza || '-'}
                      </div>
                    </td>
                    <td className="p-2 max-w-[80px] truncate" title={point.herramientaLimpieza}>
                      <div className="flex items-center gap-1">
                        <Wrench className="h-2.5 w-2.5 text-gray-400 shrink-0" />
                        {point.herramientaLimpieza || '-'}
                      </div>
                    </td>
                    <td className="p-2 max-w-[80px] truncate" title={point.responsable}>
                      {point.responsable || <span className="text-red-400">—</span>}
                    </td>
                    <td className="p-2 text-center">
                      {point.tiempoEstimado || '-'}
                    </td>
                    {!isReadOnly && (
                      <td className="p-1">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEditPoint(point)}
                            className="p-1 rounded hover:bg-blue-100 transition-colors">
                            <Edit className="h-3 w-3 text-blue-500" />
                          </button>
                          <button onClick={() => handleDeletePoint(point.id)}
                            className="p-1 rounded hover:bg-red-100 transition-colors">
                            <Trash2 className="h-3 w-3 text-red-400" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-white rounded-lg border border-dashed border-blue-300">
          <Droplets className="h-10 w-10 text-blue-300 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No hay puntos de limpieza definidos</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Añade puntos manualmente o genéralos desde el inventario de puntos de suciedad
          </p>
        </div>
      )}

      {/* Summary badges */}
      {cleaningPoints.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {FRECUENCIA_OPTIONS.map(freq => {
            const count = cleaningPoints.filter(p => p.frecuencia === freq).length
            if (count === 0) return null
            return (
              <Badge key={freq} className={`text-[9px] ${FRECUENCIA_COLORS[freq] || 'bg-gray-100'}`}>
                {freq}: {count}
              </Badge>
            )
          })}
          {cleaningPoints.filter(p => !p.frecuencia).length > 0 && (
            <Badge className="text-[9px] bg-red-100 text-red-800">
              Sin frecuencia: {cleaningPoints.filter(p => !p.frecuencia).length}
            </Badge>
          )}
        </div>
      )}

      {/* Edit/Add Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditingPoint(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-600" />
              {editingPoint?.id.startsWith('new_') ? 'Nuevo Punto de Limpieza' : 'Editar Punto de Limpieza'}
            </DialogTitle>
          </DialogHeader>

          {editingPoint && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Punto de Limpieza / Inspección *</Label>
                <Input value={editingPoint.puntoLimpieza}
                  onChange={e => setEditingPoint({ ...editingPoint, puntoLimpieza: e.target.value })}
                  placeholder="Ej: Banco de trabajo principal" className="h-8 text-xs" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tipo de Suciedad</Label>
                  <Select value={editingPoint.tipoSuciedad} onValueChange={v => setEditingPoint({ ...editingPoint, tipoSuciedad: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {TIPO_SUCIEDAD_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Ubicación</Label>
                  <Input value={editingPoint.ubicacion}
                    onChange={e => setEditingPoint({ ...editingPoint, ubicacion: e.target.value })}
                    placeholder="Ej: Línea 2, puesto 3" className="h-8 text-xs" />
                </div>
              </div>

              <div>
                <Label className="text-xs">Frecuencia de Limpieza *</Label>
                <Select value={editingPoint.frecuencia} onValueChange={v => setEditingPoint({ ...editingPoint, frecuencia: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar frecuencia" /></SelectTrigger>
                  <SelectContent>
                    {FRECUENCIA_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Producto de Limpieza</Label>
                  <Select value={editingPoint.productoLimpieza} onValueChange={v => setEditingPoint({ ...editingPoint, productoLimpieza: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Producto" /></SelectTrigger>
                    <SelectContent>
                      {PRODUCTO_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Herramienta</Label>
                  <Select value={editingPoint.herramientaLimpieza} onValueChange={v => setEditingPoint({ ...editingPoint, herramientaLimpieza: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Herramienta" /></SelectTrigger>
                    <SelectContent>
                      {HERRAMIENTA_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Responsable *</Label>
                  <Input value={editingPoint.responsable}
                    onChange={e => setEditingPoint({ ...editingPoint, responsable: e.target.value })}
                    placeholder="Nombre" className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Tiempo (min)</Label>
                  <Input type="number" value={editingPoint.tiempoEstimado}
                    onChange={e => setEditingPoint({ ...editingPoint, tiempoEstimado: e.target.value })}
                    placeholder="Ej: 10" className="h-8 text-xs" />
                </div>
              </div>

              <div>
                <Label className="text-xs">Observaciones / Instrucciones</Label>
                <Input value={editingPoint.observaciones}
                  onChange={e => setEditingPoint({ ...editingPoint, observaciones: e.target.value })}
                  placeholder="Instrucciones especiales..." className="h-8 text-xs" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditingPoint(null) }}
                  className="text-xs h-8">Cancelar</Button>
                <Button size="sm" onClick={handleSavePoint}
                  className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white gap-1">
                  <Save className="h-3 w-3" /> Guardar Punto
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
