'use client'

import { useState, useEffect, useCallback } from 'react'
import { use5SStore } from '@/lib/store'
import { S_STEPS } from '@/lib/5s-constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Zap, Plus, Trash2, Edit3, X, Check, Loader2, ArrowRight,
  ClipboardList, BarChart3, TrendingUp, Target, Clock, AlertTriangle,
  CheckCircle, Circle, ListChecks, BookOpen, ChevronDown, ChevronRight,
  Lightbulb, Wrench, Eye, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════
interface PDCAItem {
  id: string
  title: string
  description: string | null
  phase: string // 'plan', 'do', 'check', 'act'
  sStep: number
  responsable: string | null
  prioridad: string
  estado: string
  fechaInicio: string
  fechaLimite: string | null
  resultado: string | null
  projectId: string
  zoneId: string | null
  createdAt: string
  updatedAt: string
}

interface ActionItemData {
  id: string
  numeroEntrada: number
  estado: string
  porcentaje: number
  sStep: number
}

const PHASE_CONFIG = [
  {
    key: 'plan',
    label: 'PLAN',
    labelEs: 'Planificar',
    description: 'Identificar problemas, establecer objetivos y definir planes de acción',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: Target,
  },
  {
    key: 'do',
    label: 'DO',
    labelEs: 'Ejecutar',
    description: 'Implementar las acciones planificadas y recopilar datos',
    color: '#22C55E',
    bgColor: '#DCFCE7',
    icon: Wrench,
  },
  {
    key: 'check',
    label: 'CHECK',
    labelEs: 'Verificar',
    description: 'Analizar los resultados y comparar con los objetivos',
    color: '#EAB308',
    bgColor: '#FEF9C3',
    icon: Eye,
  },
  {
    key: 'act',
    label: 'ACT',
    labelEs: 'Actuar',
    description: 'Estandarizar lo que funciona y corregir lo que no',
    color: '#F97316',
    bgColor: '#FFF7ED',
    icon: Lightbulb,
  },
]

const PRIORIDAD_OPTIONS = [
  { value: 'baja', label: 'Baja', color: 'bg-gray-100 text-gray-800' },
  { value: 'media', label: 'Media', color: 'bg-blue-100 text-blue-800' },
  { value: 'alta', label: 'Alta', color: 'bg-orange-100 text-orange-800' },
  { value: 'critica', label: 'Crítica', color: 'bg-red-100 text-red-800' },
]

const ESTADO_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente', color: 'bg-gray-100 text-gray-800' },
  { value: 'en_progreso', label: 'En Progreso', color: 'bg-blue-100 text-blue-800' },
  { value: 'completada', label: 'Completada', color: 'bg-green-100 text-green-800' },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-red-100 text-red-800' },
]

export default function PDCABoardView() {
  const { currentProject, currentZone, currentUser } = use5SStore()
  const [items, setItems] = useState<PDCAItem[]>([])
  const [actionItems, setActionItems] = useState<ActionItemData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activePhase, setActivePhase] = useState<string | null>(null)
  const [filterS, setFilterS] = useState<number | null>(null)

  // Form state
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formPhase, setFormPhase] = useState('plan')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSStep, setFormSStep] = useState(1)
  const [formResponsable, setFormResponsable] = useState('')
  const [formPrioridad, setFormPrioridad] = useState('media')
  const [formEstado, setFormEstado] = useState('pendiente')
  const [formFechaInicio, setFormFechaInicio] = useState(new Date().toISOString().slice(0, 10))
  const [formFechaLimite, setFormFechaLimite] = useState('')
  const [formResultado, setFormResultado] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const loadItems = useCallback(async () => {
    if (!currentProject) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ projectId: currentProject.id })
      if (currentZone?.id) params.set('zoneId', currentZone.id)
      if (filterS) params.set('sStep', String(filterS))

      const res = await fetch(`/api/pdca?${params}`)
      const json = await res.json()
      if (json.success) {
        setItems(json.data || [])
      }
    } catch (e) {
      console.error('Error loading PDCA items:', e)
    } finally {
      setIsLoading(false)
    }
  }, [currentProject, currentZone, filterS])

  const loadActionItems = useCallback(async () => {
    if (!currentProject) return
    try {
      const params = new URLSearchParams({ projectId: currentProject.id })
      if (currentZone?.id) params.set('zoneId', currentZone.id)
      const res = await fetch(`/api/actions?${params}`)
      const json = await res.json()
      if (json.success) {
        setActionItems(json.data || [])
      }
    } catch (e) {
      console.error('Error loading action items:', e)
    }
  }, [currentProject, currentZone])

  useEffect(() => {
    loadItems()
    loadActionItems()
  }, [loadItems, loadActionItems])

  const resetForm = () => {
    setFormPhase('plan')
    setFormTitle('')
    setFormDescription('')
    setFormSStep(1)
    setFormResponsable('')
    setFormPrioridad('media')
    setFormEstado('pendiente')
    setFormFechaInicio(new Date().toISOString().slice(0, 10))
    setFormFechaLimite('')
    setFormResultado('')
    setIsCreating(false)
    setEditingId(null)
  }

  const handleEdit = (item: PDCAItem) => {
    setEditingId(item.id)
    setFormPhase(item.phase)
    setFormTitle(item.title)
    setFormDescription(item.description || '')
    setFormSStep(item.sStep)
    setFormResponsable(item.responsable || '')
    setFormPrioridad(item.prioridad)
    setFormEstado(item.estado)
    setFormFechaInicio(item.fechaInicio ? new Date(item.fechaInicio).toISOString().slice(0, 10) : '')
    setFormFechaLimite(item.fechaLimite ? new Date(item.fechaLimite).toISOString().slice(0, 10) : '')
    setFormResultado(item.resultado || '')
    setIsCreating(true)
  }

  const handleSave = async () => {
    if (!currentProject || !formTitle || !formPhase) return
    setIsSaving(true)
    try {
      const payload: any = {
        title: formTitle,
        description: formDescription || null,
        phase: formPhase,
        sStep: formSStep,
        responsable: formResponsable || null,
        prioridad: formPrioridad,
        estado: formEstado,
        fechaInicio: formFechaInicio ? new Date(formFechaInicio).toISOString() : new Date().toISOString(),
        fechaLimite: formFechaLimite ? new Date(formFechaLimite).toISOString() : null,
        resultado: formResultado || null,
        projectId: currentProject.id,
        zoneId: currentZone?.id || null,
      }

      if (editingId) {
        await fetch('/api/pdca', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        })
        toast.success('Elemento PDCA actualizado')
      } else {
        await fetch('/api/pdca', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        toast.success('Elemento PDCA creado')
      }
      resetForm()
      loadItems()
    } catch (e) {
      console.error('Save error:', e)
      toast.error('Error al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este elemento?')) return
    try {
      await fetch(`/api/pdca?id=${id}`, { method: 'DELETE' })
      toast.success('Elemento eliminado')
      loadItems()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  // ═══════════════════════════════════════════════════════
  // KPI Calculations
  // ═══════════════════════════════════════════════════════
  const kpis = {
    total: items.length,
    plan: items.filter(i => i.phase === 'plan').length,
    do: items.filter(i => i.phase === 'do').length,
    check: items.filter(i => i.phase === 'check').length,
    act: items.filter(i => i.phase === 'act').length,
    completed: items.filter(i => i.estado === 'completada').length,
    inProgress: items.filter(i => i.estado === 'en_progreso').length,
    pending: items.filter(i => i.estado === 'pendiente').length,
    completionRate: items.length > 0 ? Math.round((items.filter(i => i.estado === 'completada').length / items.length) * 100) : 0,
    // Action Plan KPIs
    totalActions: actionItems.length,
    openActions: actionItems.filter(a => a.estado === 'abierta').length,
    inProcessActions: actionItems.filter(a => a.estado === 'en_proceso').length,
    resolvedActions: actionItems.filter(a => a.estado === 'resuelta').length,
    closedActions: actionItems.filter(a => a.estado === 'cerrada').length,
    avgProgress: actionItems.length > 0 ? Math.round(actionItems.reduce((sum, a) => sum + a.porcentaje, 0) / actionItems.length) : 0,
  }

  const filteredItems = activePhase
    ? items.filter(i => i.phase === activePhase)
    : items

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-orange-50 to-amber-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-orange-900">Tablero PDCA — Mejora Continua</h2>
            <p className="text-xs text-orange-700">
              Planificar, Ejecutar, Verificar y Actuar. Herramienta de dirección de las 5S tras su implementación.
            </p>
          </div>
          <Select value={filterS ? String(filterS) : 'all'} onValueChange={v => setFilterS(v === 'all' ? null : Number(v))}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Todas las S" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las S</SelectItem>
              {S_STEPS.map(s => <SelectItem key={s.id} value={String(s.id)}>S{s.id} — {s.japaneseName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* KPI Dashboard */}
        <div className="px-6 py-4 border-b bg-white">
          <div className="grid grid-cols-6 gap-3">
            {/* Completion Rate */}
            <Card className="border-2 border-orange-200">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-black text-orange-600">{kpis.completionRate}%</div>
                <div className="text-[10px] font-semibold text-orange-800">Completado PDCA</div>
                <div className="mt-1 h-1.5 rounded-full bg-orange-100 overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${kpis.completionRate}%` }} />
                </div>
              </CardContent>
            </Card>

            {/* Plan de Acción Progress */}
            <Card className="border-2 border-rose-200">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-black text-rose-600">{kpis.avgProgress}%</div>
                <div className="text-[10px] font-semibold text-rose-800">Progreso Acciones</div>
                <div className="mt-1 h-1.5 rounded-full bg-rose-100 overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${kpis.avgProgress}%` }} />
                </div>
              </CardContent>
            </Card>

            {/* Open Actions */}
            <Card className="border-2 border-red-200">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-black text-red-600">{kpis.openActions}</div>
                <div className="text-[10px] font-semibold text-red-800">Acciones Abiertas</div>
              </CardContent>
            </Card>

            {/* In Progress */}
            <Card className="border-2 border-blue-200">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-black text-blue-600">{kpis.inProcessActions + kpis.inProgress}</div>
                <div className="text-[10px] font-semibold text-blue-800">En Progreso</div>
              </CardContent>
            </Card>

            {/* Resolved */}
            <Card className="border-2 border-green-200">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-black text-green-600">{kpis.resolvedActions + kpis.completed}</div>
                <div className="text-[10px] font-semibold text-green-800">Completadas</div>
              </CardContent>
            </Card>

            {/* Total Items */}
            <Card className="border-2 border-gray-200">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-black text-gray-600">{kpis.total}</div>
                <div className="text-[10px] font-semibold text-gray-800">Total PDCA</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* PDCA Cycle Visualization */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="grid grid-cols-4 gap-3">
            {PHASE_CONFIG.map(phase => {
              const phaseItems = items.filter(i => i.phase === phase.key)
              const phaseCompleted = phaseItems.filter(i => i.estado === 'completada').length
              const phasePct = phaseItems.length > 0 ? Math.round((phaseCompleted / phaseItems.length) * 100) : 0
              const isActive = activePhase === phase.key

              return (
                <button
                  key={phase.key}
                  onClick={() => setActivePhase(isActive ? null : phase.key)}
                  className={`text-left rounded-xl border-2 p-4 transition-all ${
                    isActive
                      ? 'shadow-lg scale-[1.02]'
                      : 'hover:shadow-md'
                  }`}
                  style={{
                    borderColor: isActive ? phase.color : `${phase.color}40`,
                    backgroundColor: isActive ? phase.bgColor : 'white',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: phase.color }}>
                      <phase.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-black" style={{ color: phase.color }}>{phase.label}</div>
                      <div className="text-[10px] font-semibold text-gray-600">{phase.labelEs}</div>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">{phase.description}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                      <div className="h-full rounded-full transition-all" style={{ width: `${phasePct}%`, backgroundColor: phase.color }} />
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: phase.color }}>{phasePct}%</span>
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-1">
                    {phaseItems.length} elementos · {phaseCompleted} completados
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="px-6 py-3 border-b bg-white flex items-center gap-2 shrink-0">
          {activePhase && (
            <Badge className="text-xs" style={{
              backgroundColor: PHASE_CONFIG.find(p => p.key === activePhase)?.bgColor,
              color: PHASE_CONFIG.find(p => p.key === activePhase)?.color,
            }}>
              Filtrando: {PHASE_CONFIG.find(p => p.key === activePhase)?.labelEs}
              <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setActivePhase(null)} />
            </Badge>
          )}
          <div className="flex-1" />
          <Button size="sm" onClick={() => { resetForm(); setIsCreating(true) }}
            className="gap-1 bg-orange-600 hover:bg-orange-700 text-white text-xs h-8">
            <Plus className="h-3 w-3" /> Nuevo Elemento PDCA
          </Button>
        </div>

        {/* Create/Edit Form */}
        {isCreating && (
          <div className="px-6 py-4 bg-orange-50/30 space-y-4 border-b">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-orange-800">
                {editingId ? 'Editar Elemento PDCA' : 'Nuevo Elemento PDCA'}
              </h4>
              <Button variant="ghost" size="sm" onClick={resetForm} className="h-7 w-7 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Fase PDCA</Label>
                <Select value={formPhase} onValueChange={setFormPhase}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PHASE_CONFIG.map(p => (
                      <SelectItem key={p.key} value={p.key}>
                        <span className="font-bold">{p.label}</span> — {p.labelEs}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">S</Label>
                <Select value={String(formSStep)} onValueChange={v => setFormSStep(Number(v))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {S_STEPS.map(s => <SelectItem key={s.id} value={String(s.id)}>S{s.id} — {s.japaneseName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Prioridad</Label>
                <Select value={formPrioridad} onValueChange={setFormPrioridad}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORIDAD_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Título</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)}
                placeholder="Describe la acción o elemento PDCA" className="h-8 text-xs" />
            </div>

            <div>
              <Label className="text-xs">Descripción</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)}
                placeholder="Detalle del plan, acción, verificación o estandarización..."
                className="text-xs min-h-[60px]" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Responsable</Label>
                <Input value={formResponsable} onChange={e => setFormResponsable(e.target.value)}
                  placeholder="Persona responsable" className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Estado</Label>
                <Select value={formEstado} onValueChange={setFormEstado}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ESTADO_OPTIONS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Fecha Límite</Label>
                <Input type="date" value={formFechaLimite} onChange={e => setFormFechaLimite(e.target.value)}
                  className="h-8 text-xs" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Resultado / Observaciones</Label>
              <Textarea value={formResultado} onChange={e => setFormResultado(e.target.value)}
                placeholder="Resultado de la verificación, lecciones aprendidas..."
                className="text-xs min-h-[40px]" />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={isSaving || !formTitle}
                className="gap-1 bg-orange-600 hover:bg-orange-700 text-white">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editingId ? 'Guardar Cambios' : 'Crear Elemento'}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-orange-600 animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">Cargando...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="h-12 w-12 text-orange-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-gray-700 mb-1">No hay elementos PDCA</h3>
              <p className="text-xs text-muted-foreground">
                Comienza el ciclo de mejora continua creando el primer elemento.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map(item => {
                const phaseConfig = PHASE_CONFIG.find(p => p.key === item.phase)
                const prioridadInfo = PRIORIDAD_OPTIONS.find(p => p.value === item.prioridad)
                const estadoInfo = ESTADO_OPTIONS.find(e => e.value === item.estado)
                const sStepData = S_STEPS.find(s => s.id === item.sStep)
                const isOverdue = item.fechaLimite && new Date(item.fechaLimite) < new Date() && item.estado !== 'completada'

                return (
                  <div key={item.id}
                    className="border-2 rounded-xl p-4 hover:shadow-md transition-all bg-white"
                    style={{ borderLeftWidth: '4px', borderLeftColor: phaseConfig?.color || '#gray' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: phaseConfig?.bgColor }}>
                        {phaseConfig && <phaseConfig.icon className="h-4 w-4" style={{ color: phaseConfig.color }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold">{item.title}</h4>
                          <Badge className="text-[9px] font-bold text-white" style={{ backgroundColor: phaseConfig?.color }}>
                            {phaseConfig?.label}
                          </Badge>
                          <Badge className={`${prioridadInfo?.color || ''} text-[9px]`}>{prioridadInfo?.label}</Badge>
                          <Badge className={`${estadoInfo?.color || ''} text-[9px]`}>{estadoInfo?.label}</Badge>
                          {isOverdue && (
                            <Badge className="bg-red-100 text-red-800 text-[9px]">
                              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Vencido
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                          <span className="font-semibold" style={{ color: sStepData?.color }}>S{item.sStep} — {sStepData?.japaneseName}</span>
                          {item.responsable && <span>👤 {item.responsable}</span>}
                          {item.fechaLimite && (
                            <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                              📅 {new Date(item.fechaLimite).toLocaleDateString('es-ES')}
                            </span>
                          )}
                        </div>
                        {item.resultado && (
                          <div className="mt-2 p-2 rounded-lg bg-green-50 border border-green-200">
                            <p className="text-[10px] font-semibold text-green-700">Resultado:</p>
                            <p className="text-[10px] text-green-800">{item.resultado}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}
                          className="h-7 w-7 p-0 text-orange-600">
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}
                          className="h-7 w-7 p-0 text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
