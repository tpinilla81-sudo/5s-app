'use client'

import { useState, useEffect, useCallback } from 'react'
import { use5SStore } from '@/lib/store'
import { S_STEPS } from '@/lib/5s-constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BookOpen, Plus, Trash2, Edit3, X, Check, Loader2, FileText, Layout, Paintbrush, PenTool
} from 'lucide-react'

import LayoutEditor from '@/components/5s/LayoutEditor'
import ColorCodeTable from '@/components/5s/ColorCodeTable'

interface StandardItem {
  id: string
  sStep: number
  title: string
  description: string | null
  category: string
  content: string | null
  photoUrl: string | null
  status: string
  version: number
  projectId: string
  zoneId: string | null
  createdAt: string
  updatedAt: string
}

const CATEGORIES = [
  { value: 'layout', label: 'Layout', icon: Layout, color: 'bg-blue-100 text-blue-800' },
  { value: 'marcado_suelo', label: 'Código de Colores / Marcado de Suelo', icon: Paintbrush, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'visual', label: 'Señalización Visual', icon: FileText, color: 'bg-purple-100 text-purple-800' },
  { value: 'procedimiento', label: 'Procedimiento', icon: FileText, color: 'bg-green-100 text-green-800' },
  { value: 'general', label: 'General', icon: FileText, color: 'bg-gray-100 text-gray-800' },
]

const STATUS_OPTIONS = [
  { value: 'activo', label: 'Activo', color: 'bg-green-100 text-green-800' },
  { value: 'en_revision', label: 'En Revisión', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'obsoleto', label: 'Obsoleto', color: 'bg-red-100 text-red-800' },
]

interface StandardsLibraryProps {
  open: boolean
  onClose: () => void
}

export default function StandardsLibrary({ open, onClose }: StandardsLibraryProps) {
  const { currentProject, currentZone } = use5SStore()
  const [standards, setStandards] = useState<StandardItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filterS, setFilterS] = useState<number | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showLayoutEditor, setShowLayoutEditor] = useState(false)
  const [showColorCodeTable, setShowColorCodeTable] = useState(false)

  // Form state
  const [formSStep, setFormSStep] = useState(1)
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState('general')
  const [formContent, setFormContent] = useState('')
  const [formStatus, setFormStatus] = useState('activo')
  const [formVersion, setFormVersion] = useState(1)
  const [isSaving, setIsSaving] = useState(false)

  const loadStandards = useCallback(async () => {
    if (!currentProject) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ projectId: currentProject.id })
      if (filterS) params.set('sStep', String(filterS))
      if (filterCategory !== 'all') params.set('category', filterCategory)
      if (currentZone?.id) params.set('zoneId', currentZone.id)

      const res = await fetch(`/api/standards?${params}`)
      const json = await res.json()
      if (json.success) {
        setStandards(json.data || [])
      }
    } catch (e) {
      console.error('Error loading standards:', e)
    } finally {
      setIsLoading(false)
    }
  }, [currentProject, filterS, filterCategory, currentZone])

  useEffect(() => {
    if (open) loadStandards()
  }, [open, loadStandards])

  const resetForm = () => {
    setFormSStep(1)
    setFormTitle('')
    setFormDescription('')
    setFormCategory('general')
    setFormContent('')
    setFormStatus('activo')
    setFormVersion(1)
    setIsCreating(false)
    setEditingId(null)
  }

  const handleEdit = (std: StandardItem) => {
    setEditingId(std.id)
    setFormSStep(std.sStep)
    setFormTitle(std.title)
    setFormDescription(std.description || '')
    setFormCategory(std.category)
    setFormContent(std.content || '')
    setFormStatus(std.status)
    setFormVersion(std.version)
    setIsCreating(true)
  }

  const handleSave = async () => {
    if (!currentProject || !formTitle) return
    setIsSaving(true)
    try {
      const payload = {
        sStep: formSStep,
        title: formTitle,
        description: formDescription || null,
        category: formCategory,
        content: formContent || null,
        status: formStatus,
        version: formVersion,
        projectId: currentProject.id,
        zoneId: currentZone?.id || null,
      }

      if (editingId) {
        await fetch('/api/standards', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        })
      } else {
        await fetch('/api/standards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      resetForm()
      await loadStandards()
    } catch (e) {
      console.error('Error saving standard:', e)
      alert('Error al guardar el estándar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este estándar?')) return
    try {
      await fetch(`/api/standards?id=${id}`, { method: 'DELETE' })
      await loadStandards()
    } catch (e) {
      console.error('Error deleting standard:', e)
    }
  }

  const getCategoryInfo = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[CATEGORIES.length - 1]
  const getStatusInfo = (status: string) => STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]

  // Group standards by S-step
  const groupedByS = S_STEPS.map(s => ({
    ...s,
    items: standards.filter(std => std.sStep === s.id),
  }))

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); resetForm() } }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-teal-600" />
            Biblioteca de Estándares
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Registra y consulta los estándares de cada S: Layout, Código de colores de marcado de suelo, Señalización visual, Procedimientos...
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Filters + Add button */}
          <div className="px-6 py-3 border-b bg-gray-50/50 flex items-center gap-3 flex-wrap shrink-0">
            <Select value={filterS ? String(filterS) : 'all'} onValueChange={v => setFilterS(v === 'all' ? null : Number(v))}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Todas las S" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las S</SelectItem>
                {S_STEPS.map(s => <SelectItem key={s.id} value={String(s.id)}>S{s.id} — {s.japaneseName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            {!isCreating && (
              <>
                <Button size="sm" onClick={() => setShowColorCodeTable(true)}
                  className="gap-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs h-8">
                  <Paintbrush className="h-3 w-3" /> Cuadro Colores
                </Button>
                <Button size="sm" onClick={() => setShowLayoutEditor(true)}
                  className="gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">
                  <PenTool className="h-3 w-3" /> Dibujar Layout
                </Button>
                <Button size="sm" onClick={() => { resetForm(); setIsCreating(true) }}
                  className="gap-1 bg-teal-600 hover:bg-teal-700 text-white text-xs h-8">
                  <Plus className="h-3 w-3" /> Nuevo Estándar
                </Button>
              </>
            )}
          </div>

          {/* Create/Edit form */}
          {isCreating && (
            <div className="px-6 py-4 border-b bg-teal-50/50 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-teal-800">
                  {editingId ? 'Editar Estándar' : 'Nuevo Estándar'}
                </h4>
                <Button variant="ghost" size="sm" onClick={resetForm} className="h-7 w-7 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                  <Label className="text-xs">Categoría</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Título</Label>
                <Input value={formTitle} onChange={e => setFormTitle(e.target.value)}
                  placeholder="Ej: Layout zona de montaje" className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Descripción</Label>
                <Input value={formDescription} onChange={e => setFormDescription(e.target.value)}
                  placeholder="Descripción del estándar..." className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Contenido / Detalles (JSON o texto)</Label>
                <textarea value={formContent} onChange={e => setFormContent(e.target.value)}
                  placeholder='{"campo": "valor"} o texto libre'
                  className="w-full border rounded px-2 py-1.5 text-xs min-h-[60px] font-mono" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Estado</Label>
                  <Select value={formStatus} onValueChange={setFormStatus}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Versión</Label>
                  <Input type="number" value={formVersion} onChange={e => setFormVersion(Number(e.target.value))}
                    min={1} className="h-8 text-xs w-20" />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleSave} disabled={isSaving || !formTitle}
                    className="gap-1 bg-teal-600 hover:bg-teal-700 text-white text-xs h-8">
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    {editingId ? 'Guardar' : 'Crear'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Standards list */}
          <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-teal-500 animate-spin" /></div>
            ) : standards.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay estándares registrados</p>
                <p className="text-xs mt-1">Añade el primero con el botón &quot;Nuevo Estándar&quot;</p>
              </div>
            ) : (
              groupedByS.filter(g => g.items.length > 0).map(group => (
                <div key={group.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: group.color }}>{group.id}</div>
                    <h3 className="text-sm font-bold" style={{ color: group.color }}>
                      S{group.id} — {group.japaneseName} ({group.spanishName})
                    </h3>
                    <Badge variant="secondary" className="text-[10px]">{group.items.length}</Badge>
                  </div>
                  <div className="grid gap-2">
                    {group.items.map(std => {
                      const catInfo = getCategoryInfo(std.category)
                      const statusInfo = getStatusInfo(std.status)
                      return (
                        <Card key={std.id} className="border-l-4" style={{ borderLeftColor: group.color }}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium">{std.title}</span>
                                  <Badge className={`${catInfo.color} text-[10px]`}>{catInfo.label}</Badge>
                                  <Badge className={`${statusInfo.color} text-[10px]`}>{statusInfo.label}</Badge>
                                  <Badge variant="outline" className="text-[10px]">v{std.version}</Badge>
                                </div>
                                {std.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{std.description}</p>
                                )}
                                {std.content && (
                                  <p className="text-[10px] text-muted-foreground mt-1 font-mono bg-gray-50 rounded px-2 py-1 line-clamp-2 max-h-10 overflow-hidden">
                                    {std.content}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(std)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-teal-600">
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(std.id)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>

      {/* Layout Editor */}
      <LayoutEditor
        open={showLayoutEditor}
        onClose={() => setShowLayoutEditor(false)}
        onSave={() => { setShowLayoutEditor(false); loadStandards() }}
      />

      {/* Color Code Table */}
      <ColorCodeTable
        open={showColorCodeTable}
        onClose={() => setShowColorCodeTable(false)}
      />
    </Dialog>
  )
}
