'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { use5SStore } from '@/lib/store'
import { S_STEPS } from '@/lib/5s-constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Zap, Filter, ArrowLeft, Clock, User, AlertTriangle,
  CheckCircle2, XCircle, Loader2, Building2, Calendar,
  ChevronDown, ChevronUp, Edit2, Save, Euro, MapPin, Users
} from 'lucide-react'

interface ZoneWithResponsable {
  id: string
  name: string
  color: string
  responsable: {
    id: string
    name: string
    email: string
  } | null
}

interface ActionItem {
  id: string
  sStep: number
  miniStep: number
  itemId: string
  itemDescription: string
  hallazgo: string
  mejora: string | null
  responsable: string | null
  prioridad: string
  estado: string
  fechaLimite: string | null
  fechaResolucion: string | null
  photoRefs: string | null
  notas: string | null
  source: string
  auditor: string | null
  projectId: string
  createdAt: string
  updatedAt: string
  projectName: string
  projectZones: ZoneWithResponsable[]
}

interface TeamMember {
  name: string
  email: string
  zone: string | null
  role: string
}

interface ProjectWithZones {
  id: string
  name: string
  zones: Array<{
    id: string
    name: string
    color: string
    responsable: string | null
  }>
}

interface Props {
  onBack?: () => void
}

export default function CompanyActionsList({ onBack }: Props) {
  const { currentProject } = use5SStore()
  const company = currentProject?.company || ''

  const [actions, setActions] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<ProjectWithZones[]>([])
  const [responsables, setResponsables] = useState<string[]>([])
  const [availableMembers, setAvailableMembers] = useState<TeamMember[]>([])

  // Filters
  const [filterEstado, setFilterEstado] = useState<string>('all')
  const [filterPrioridad, setFilterPrioridad] = useState<string>('all')
  const [filterProject, setFilterProject] = useState<string>('all')
  const [filterSStep, setFilterSStep] = useState<string>('all')
  const [filterResponsable, setFilterResponsable] = useState<string>('all')
  const [searchText, setSearchText] = useState('')

  // Edit dialog
  const [editingAction, setEditingAction] = useState<ActionItem | null>(null)
  const [editResponsable, setEditResponsable] = useState('')
  const [editEstado, setEditEstado] = useState('')
  const [editPrioridad, setEditPrioridad] = useState('')
  const [editFechaLimite, setEditFechaLimite] = useState('')
  const [editNotas, setEditNotas] = useState('')
  const [saving, setSaving] = useState(false)

  // Sort
  const [sortBy, setSortBy] = useState<'prioridad' | 'fechaLimite' | 'estado' | 'project'>('prioridad')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const loadActions = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ company })
      if (filterEstado !== 'all') params.set('estado', filterEstado)
      if (filterPrioridad !== 'all') params.set('prioridad', filterPrioridad)
      if (filterProject !== 'all') params.set('projectId', filterProject)
      if (filterSStep !== 'all') params.set('sStep', filterSStep)
      if (filterResponsable !== 'all') params.set('responsable', filterResponsable)

      const res = await fetch(`/api/gerente/actions?${params}`)
      const json = await res.json()
      if (json.success) {
        setActions(json.data.actions)
        setProjects(json.data.projects || [])
        setResponsables(json.data.responsables)
        setAvailableMembers(json.data.availableMembers || [])
      }
    } catch (error) {
      console.error('Error loading actions:', error)
    } finally {
      setLoading(false)
    }
  }, [company, filterEstado, filterPrioridad, filterProject, filterSStep, filterResponsable])

  useEffect(() => {
    if (company) loadActions()
  }, [company, loadActions])

  const handleEdit = (action: ActionItem) => {
    setEditingAction(action)
    setEditResponsable(action.responsable || '')
    setEditEstado(action.estado)
    setEditPrioridad(action.prioridad)
    setEditFechaLimite(action.fechaLimite ? action.fechaLimite.split('T')[0] : '')
    setEditNotas(action.notas || '')
  }

  const handleSave = async () => {
    if (!editingAction) return
    try {
      setSaving(true)
      const res = await fetch('/api/gerente/actions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAction.id,
          responsable: editResponsable,
          estado: editEstado,
          prioridad: editPrioridad,
          fechaLimite: editFechaLimite || null,
          notas: editNotas,
        }),
      })
      if (res.ok) {
        setEditingAction(null)
        await loadActions()
      }
    } catch (error) {
      console.error('Error saving action:', error)
    } finally {
      setSaving(false)
    }
  }

  const isOverdue = (action: ActionItem) => {
    return action.fechaLimite &&
      new Date(action.fechaLimite) < new Date() &&
      !['cerrada', 'resuelta'].includes(action.estado)
  }

  const getEstadoStyle = (estado: string) => {
    const map: Record<string, string> = {
      abierta: 'bg-red-100 text-red-700 border-red-200',
      en_proceso: 'bg-amber-100 text-amber-700 border-amber-200',
      resuelta: 'bg-green-100 text-green-700 border-green-200',
      cerrada: 'bg-gray-100 text-gray-700 border-gray-200',
    }
    return map[estado] || 'bg-gray-100 text-gray-700'
  }

  const getEstadoLabel = (estado: string) => {
    const map: Record<string, string> = {
      abierta: 'Abierta',
      en_proceso: 'En Proceso',
      resuelta: 'Resuelta',
      cerrada: 'Cerrada',
    }
    return map[estado] || estado
  }

  const getPrioridadStyle = (prioridad: string) => {
    const map: Record<string, string> = {
      alta: 'bg-red-100 text-red-700 border-red-200',
      media: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      baja: 'bg-green-100 text-green-700 border-green-200',
    }
    return map[prioridad] || 'bg-gray-100 text-gray-700'
  }

  const getPrioridadLabel = (prioridad: string) => {
    const map: Record<string, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' }
    return map[prioridad] || prioridad
  }

  // Filter by search text
  const filteredActions = actions.filter(a => {
    if (!searchText) return true
    const text = searchText.toLowerCase()
    return a.hallazgo.toLowerCase().includes(text) ||
      a.itemDescription.toLowerCase().includes(text) ||
      (a.responsable || '').toLowerCase().includes(text) ||
      a.projectName.toLowerCase().includes(text) ||
      (a.mejora || '').toLowerCase().includes(text)
  })

  // Sort
  const sortedActions = [...filteredActions].sort((a, b) => {
    let cmp = 0
    if (sortBy === 'prioridad') {
      const prioMap: Record<string, number> = { alta: 3, media: 2, baja: 1 }
      cmp = (prioMap[a.prioridad] || 0) - (prioMap[b.prioridad] || 0)
    } else if (sortBy === 'fechaLimite') {
      const aDate = a.fechaLimite ? new Date(a.fechaLimite).getTime() : Infinity
      const bDate = b.fechaLimite ? new Date(b.fechaLimite).getTime() : Infinity
      cmp = aDate - bDate
    } else if (sortBy === 'estado') {
      const estadoMap: Record<string, number> = { abierta: 4, en_proceso: 3, resuelta: 2, cerrada: 1 }
      cmp = (estadoMap[a.estado] || 0) - (estadoMap[b.estado] || 0)
    } else if (sortBy === 'project') {
      cmp = a.projectName.localeCompare(b.projectName)
    }
    return sortDir === 'asc' ? -cmp : cmp
  })

  const overdueCount = actions.filter(isOverdue).length
  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('asc') }
  }

  const sStepName = (id: number) => S_STEPS.find(s => s.id === id)?.japaneseName || `S${id}`

  // Get unique member names for the responsable selector in edit dialog
  const uniqueMemberNames = [...new Set(availableMembers.map(m => m.name))]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="text-green-600">
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" />
              Acciones de Mejora — Listado Común
            </h2>
            <p className="text-sm text-muted-foreground">
              {company} — {actions.length} acción{actions.length !== 1 ? 'es' : ''} total
              {overdueCount > 0 && (
                <span className="text-red-600 font-medium ml-2">
                  ({overdueCount} retrasada{overdueCount !== 1 ? 's' : ''})
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <Input
              placeholder="Buscar..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="text-sm h-8"
            />
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="abierta">Abierta</SelectItem>
                <SelectItem value="en_proceso">En Proceso</SelectItem>
                <SelectItem value="resuelta">Resuelta</SelectItem>
                <SelectItem value="cerrada">Cerrada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPrioridad} onValueChange={setFilterPrioridad}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Prioridad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="baja">Baja</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Proyecto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proyectos</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSStep} onValueChange={setFilterSStep}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="S" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las S</SelectItem>
                {S_STEPS.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>S{s.id} - {s.japaneseName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterResponsable} onValueChange={setFilterResponsable}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Responsable" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {responsables.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sort buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Ordenar:</span>
        {([['prioridad', 'Prioridad'], ['fechaLimite', 'Fecha Límite'], ['estado', 'Estado'], ['project', 'Proyecto']] as const).map(([field, label]) => (
          <Button
            key={field}
            variant={sortBy === field ? 'default' : 'outline'}
            size="sm"
            className="h-6 text-xs gap-1"
            onClick={() => toggleSort(field)}
          >
            {label}
            {sortBy === field && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
          </Button>
        ))}
      </div>

      {/* Actions list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
        </div>
      ) : sortedActions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Zap className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No hay acciones que coincidan con los filtros</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {sortedActions.map((action, i) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card className={`hover:shadow-sm transition-shadow ${isOverdue(action) ? 'border-red-300 bg-red-50/30' : ''}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Top line: project + S + badges */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            <Building2 className="h-3 w-3 mr-1" />
                            {action.projectName}
                          </Badge>
                          <Badge variant="outline" className="text-xs" style={{
                            borderColor: (S_STEPS.find(s => s.id === action.sStep)?.color || '#666') + '60',
                            color: S_STEPS.find(s => s.id === action.sStep)?.color || '#666',
                          }}>
                            S{action.sStep} - {sStepName(action.sStep)}
                          </Badge>
                          <Badge className={`text-xs border ${getEstadoStyle(action.estado)}`}>
                            {getEstadoLabel(action.estado)}
                          </Badge>
                          <Badge className={`text-xs border ${getPrioridadStyle(action.prioridad)}`}>
                            {getPrioridadLabel(action.prioridad)}
                          </Badge>
                          {isOverdue(action) && (
                            <Badge className="text-xs bg-red-100 text-red-800 border border-red-300">
                              <AlertTriangle className="h-3 w-3 mr-1" /> Retrasada
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            {action.source === 'auditoria' ? 'Auditoría' : 'Autoevaluación'}
                          </Badge>
                        </div>

                        {/* Hallazgo */}
                        <p className="text-sm font-medium text-gray-900 mb-0.5">{action.hallazgo}</p>
                        {action.mejora && (
                          <p className="text-xs text-muted-foreground mb-1">Mejora: {action.mejora}</p>
                        )}

                        {/* Zones with responsables */}
                        {action.projectZones.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {action.projectZones.map(z => (
                              <span
                                key={z.id}
                                className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border"
                                style={{ borderColor: z.color + '40', color: z.color }}
                              >
                                {z.name}
                                {z.responsable && (
                                  <span className="text-muted-foreground">· {z.responsable.name}</span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Bottom line: responsable + dates */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          {action.responsable && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" /> {action.responsable}
                            </span>
                          )}
                          {action.fechaLimite && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Límite: {new Date(action.fechaLimite).toLocaleDateString('es-ES')}
                            </span>
                          )}
                          {action.fechaResolucion && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              Resuelta: {new Date(action.fechaResolucion).toLocaleDateString('es-ES')}
                            </span>
                          )}
                          {action.notas && (
                            <span className="truncate max-w-[200px]" title={action.notas}>
                              Notas: {action.notas}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Edit button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleEdit(action)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingAction} onOpenChange={(open) => !open && setEditingAction(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-green-500" />
              Editar Acción
            </DialogTitle>
          </DialogHeader>
          {editingAction && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium">{editingAction.hallazgo}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {editingAction.projectName} — S{editingAction.sStep} {sStepName(editingAction.sStep)}
                </p>
                {/* Zones info */}
                {editingAction.projectZones.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    {editingAction.projectZones.map(z => (
                      <span
                        key={z.id}
                        className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border"
                        style={{ borderColor: z.color + '40', color: z.color }}
                      >
                        {z.name}
                        {z.responsable && (
                          <span className="text-muted-foreground">· {z.responsable.name}</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-sm flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> Responsable
                  </Label>
                  <Select value={editResponsable} onValueChange={setEditResponsable}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Asignar responsable..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin asignar</SelectItem>
                      {uniqueMemberNames.map(name => (
                        <SelectItem key={name} value={name}>
                          {name}
                          {availableMembers.find(m => m.name === name)?.zone && (
                            ` (${availableMembers.find(m => m.name === name)?.zone})`
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Selecciona un miembro del equipo o escribe un nombre personalizado
                  </p>
                  <Input
                    value={editResponsable}
                    onChange={(e) => setEditResponsable(e.target.value)}
                    placeholder="O escribe un nombre personalizado..."
                    className="mt-1 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Estado</Label>
                    <Select value={editEstado} onValueChange={setEditEstado}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="abierta">Abierta</SelectItem>
                        <SelectItem value="en_proceso">En Proceso</SelectItem>
                        <SelectItem value="resuelta">Resuelta</SelectItem>
                        <SelectItem value="cerrada">Cerrada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Prioridad</Label>
                    <Select value={editPrioridad} onValueChange={setEditPrioridad}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="baja">Baja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-sm flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Fecha Límite
                  </Label>
                  <Input
                    type="date"
                    value={editFechaLimite}
                    onChange={(e) => setEditFechaLimite(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-sm">Notas</Label>
                  <Input
                    value={editNotas}
                    onChange={(e) => setEditNotas(e.target.value)}
                    placeholder="Notas adicionales..."
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAction(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
