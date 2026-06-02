'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { use5SStore } from '@/lib/store'
import { S_STEPS } from '@/lib/5s-constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
  BookOpen, Plus, Trash2, Edit3, X, Check, Loader2, FileText, Layout, Paintbrush, PenTool,
  Camera, ArrowRight, Shield, Award, Truck, Cog, User, Phone, Image as ImageIcon,
  ChevronDown, ChevronRight, Eye
} from 'lucide-react'

import LayoutEditor from '@/components/5s/LayoutEditor'
import ColorCodeTable from '@/components/5s/ColorCodeTable'
import { toast } from 'sonner'

interface StandardItem {
  id: string
  sStep: number
  title: string
  description: string | null
  category: string
  content: string | null
  photoUrl: string | null
  beforePhotoUrl: string | null
  afterPhotoUrl: string | null
  responsable: string | null
  contacto: string | null
  mejoraTipo: string | null
  status: string
  version: number
  projectId: string
  zoneId: string | null
  createdAt: string
  updatedAt: string
}

const CATEGORIES = [
  { value: 'formato_mejora', label: 'Formato Estándar de Mejora', icon: Award, color: 'bg-teal-100 text-teal-800' },
  { value: 'fotos_antes', label: 'Fotos del ANTES', icon: Camera, color: 'bg-red-100 text-red-800' },
  { value: 'layout', label: 'Layout', icon: Layout, color: 'bg-blue-100 text-blue-800' },
  { value: 'marcado_suelo', label: 'Código de Colores / Marcado de Suelo', icon: Paintbrush, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'visual', label: 'Señalización Visual', icon: FileText, color: 'bg-purple-100 text-purple-800' },
  { value: 'procedimiento', label: 'Procedimiento', icon: FileText, color: 'bg-green-100 text-green-800' },
  { value: 'checklist', label: 'Checklist', icon: FileText, color: 'bg-cyan-100 text-cyan-800' },
  { value: 'senalizacion', label: 'Señalización', icon: FileText, color: 'bg-amber-100 text-amber-800' },
  { value: 'diagrama', label: 'Diagrama flujo', icon: FileText, color: 'bg-indigo-100 text-indigo-800' },
  { value: 'registro', label: 'Registro', icon: FileText, color: 'bg-rose-100 text-rose-800' },
  { value: 'otro', label: 'Otro', icon: FileText, color: 'bg-orange-100 text-orange-800' },
  { value: 'general', label: 'General', icon: FileText, color: 'bg-gray-100 text-gray-800' },
]

const MEJORA_TIPOS = [
  { value: 'seguridad', label: 'Seguridad', icon: Shield, color: 'bg-red-100 text-red-800', accent: '#CC0000' },
  { value: 'calidad', label: 'Calidad', icon: Award, color: 'bg-blue-100 text-blue-800', accent: '#0E6BA8' },
  { value: 'proceso', label: 'Proceso', icon: Cog, color: 'bg-green-100 text-green-800', accent: '#2D8C3C' },
  { value: 'logistica', label: 'Logística', icon: Truck, color: 'bg-amber-100 text-amber-800', accent: '#F5A623' },
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

// Standard template field definition (from admin "Plantillas" → "Estándares")
interface StdTemplateField {
  key: string
  label: string
  type: 'photo' | 'text' | 'number' | 'select'
  options?: string[]
  required?: boolean
}

export default function StandardsLibrary({ open, onClose }: StandardsLibraryProps) {
  const { currentProject, currentZone, currentUser } = use5SStore()
  const [standards, setStandards] = useState<StandardItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filterS, setFilterS] = useState<number | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showLayoutEditor, setShowLayoutEditor] = useState(false)
  const [showColorCodeTable, setShowColorCodeTable] = useState(false)
  const [viewingStandard, setViewingStandard] = useState<StandardItem | null>(null)

  // Template-driven fields
  const [templateFields, setTemplateFields] = useState<StdTemplateField[]>([])
  const [templateLoaded, setTemplateLoaded] = useState(false)

  // Form state
  const [formSStep, setFormSStep] = useState(1)
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState('formato_mejora')
  const [formContent, setFormContent] = useState('')
  const [formStatus, setFormStatus] = useState('activo')
  const [formVersion, setFormVersion] = useState(1)
  const [formBeforePhotoUrl, setFormBeforePhotoUrl] = useState<string | null>(null)
  const [formAfterPhotoUrl, setFormAfterPhotoUrl] = useState<string | null>(null)
  const [formResponsable, setFormResponsable] = useState('')
  const [formContacto, setFormContacto] = useState('')
  const [formMejoraTipo, setFormMejoraTipo] = useState<string>('')
  // Extra fields for fotos_antes template
  const [formZona, setFormZona] = useState('')
  const [formFecha, setFormFecha] = useState('')
  const [formObservaciones, setFormObservaciones] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState<'before' | 'after' | null>(null)

  const beforeInputRef = useRef<HTMLInputElement>(null)
  const afterInputRef = useRef<HTMLInputElement>(null)

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

  // Load the estandar template for the current S step to determine required fields
  const loadStandardTemplate = useCallback(async (sStep: number) => {
    try {
      // If the zone has a board config, fetch from that config
      if (currentZone?.boardConfigId) {
        const slotsRes = await fetch(`/api/board-slots?boardConfigId=${currentZone.boardConfigId}&sStep=${sStep}&miniStep=4`)
        const slotsJson = await slotsRes.json()
        if (slotsJson.success && slotsJson.data.length > 0) {
          const slot = slotsJson.data[0]
          const estandarTemplates = (slot.templates || []).filter(
            (t: any) => t.template?.type === 'estandar'
          )
          if (estandarTemplates.length > 0) {
            const content = typeof estandarTemplates[0].template.content === 'string'
              ? JSON.parse(estandarTemplates[0].template.content)
              : estandarTemplates[0].template.content
            if (content.fields && Array.isArray(content.fields)) {
              setTemplateFields(content.fields)
              setTemplateLoaded(true)
              return
            }
          }
        }
      }

      // Fallback: global template
      const res = await fetch(`/api/templates?type=estandar&sStep=${sStep}`)
      const json = await res.json()
      if (json.success && json.data && json.data.length > 0) {
        const content = typeof json.data[0].content === 'string'
          ? JSON.parse(json.data[0].content)
          : json.data[0].content
        if (content.fields && Array.isArray(content.fields)) {
          setTemplateFields(content.fields)
          setTemplateLoaded(true)
          return
        }
      }
    } catch (e) {
      console.error('Error loading standard template:', e)
    }
    // Default fields if no template found
    setTemplateFields([
      { key: 'beforePhotoUrl', label: 'Foto Antes', type: 'photo', required: true },
      { key: 'afterPhotoUrl', label: 'Foto Después', type: 'photo', required: true },
      { key: 'responsable', label: 'Quién lo ha hecho', type: 'text', required: true },
      { key: 'contacto', label: 'Contacto', type: 'text', required: true },
      { key: 'mejoraTipo', label: 'Tipo de Mejora', type: 'select', options: ['seguridad', 'calidad', 'proceso', 'logistica'], required: true },
    ])
    setTemplateLoaded(true)
  }, [currentZone?.boardConfigId])

  useEffect(() => {
    if (open) loadStandards()
  }, [open, loadStandards])

  const resetForm = () => {
    setFormSStep(1)
    setFormTitle('')
    setFormDescription('')
    setFormCategory('formato_mejora')
    setFormContent('')
    setFormStatus('activo')
    setFormVersion(1)
    setFormBeforePhotoUrl(null)
    setFormAfterPhotoUrl(null)
    setFormResponsable('')
    setFormContacto('')
    setFormMejoraTipo('')
    setFormZona('')
    setFormFecha('')
    setFormObservaciones('')
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
    setFormBeforePhotoUrl(std.beforePhotoUrl)
    setFormAfterPhotoUrl(std.afterPhotoUrl)
    setFormResponsable(std.responsable || '')
    setFormContacto(std.contacto || '')
    setFormMejoraTipo(std.mejoraTipo || '')
    // Load extra fields from content JSON for fotos_antes
    if (std.category === 'fotos_antes' && std.content) {
      try {
        const extra = typeof std.content === 'string' ? JSON.parse(std.content) : std.content
        setFormZona(extra.zona || '')
        setFormFecha(extra.fecha || '')
        setFormObservaciones(extra.observaciones || '')
      } catch {
        setFormZona('')
        setFormFecha('')
        setFormObservaciones('')
      }
    } else {
      setFormZona('')
      setFormFecha('')
      setFormObservaciones('')
    }
    setIsCreating(true)
  }

  const handlePhotoUpload = async (file: File, type: 'before' | 'after') => {
    if (!currentProject) return
    setIsUploading(type)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', currentProject.id)
      formData.append('filename', `${currentProject.id}_std_${type}_${Date.now()}_${file.name}`)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.success && json.url) {
        if (type === 'before') setFormBeforePhotoUrl(json.url)
        else setFormAfterPhotoUrl(json.url)
        toast.success(`Foto ${type === 'before' ? 'ANTES' : 'DESPUÉS'} subida correctamente`)
      } else {
        toast.error('Error al subir la foto')
      }
    } catch (e) {
      console.error('Upload error:', e)
      toast.error('Error al subir la foto')
    } finally {
      setIsUploading(null)
    }
  }

  const handleSave = async () => {
    if (!currentProject || !formTitle) return
    // Validate required fields from template when creating a formato_mejora
    if (isFormatoMejora) {
      const validationError = validateRequiredFields()
      if (validationError) {
        toast.error(validationError)
        return
      }
    }
    // Validate required fields for fotos_antes
    if (isFotosAntes) {
      if (!formBeforePhotoUrl) { toast.error('La Foto del ANTES es obligatoria'); return }
      if (!formResponsable.trim()) { toast.error('El nombre de quien hace la foto es obligatorio'); return }
      if (!formZona.trim()) { toast.error('La zona es obligatoria'); return }
    }
    setIsSaving(true)
    try {
      const payload: any = {
        sStep: formSStep,
        title: formTitle,
        description: formDescription || null,
        category: formCategory,
        content: formContent || null,
        status: formStatus,
        version: formVersion,
        projectId: currentProject.id,
        zoneId: currentZone?.id || null,
        createdBy: currentUser?.id || null,
      }

      // Add mejora-specific fields
      if (formCategory === 'formato_mejora' || formBeforePhotoUrl || formAfterPhotoUrl || formResponsable || formMejoraTipo) {
        payload.beforePhotoUrl = formBeforePhotoUrl || null
        payload.afterPhotoUrl = formAfterPhotoUrl || null
        payload.responsable = formResponsable || null
        payload.contacto = formContacto || null
        payload.mejoraTipo = formMejoraTipo || null
      }

      // Add fotos_antes-specific fields
      if (formCategory === 'fotos_antes') {
        payload.beforePhotoUrl = formBeforePhotoUrl || null
        payload.responsable = formResponsable || null
        payload.content = JSON.stringify({
          zona: formZona,
          fecha: formFecha,
          observaciones: formObservaciones,
        })
      }

      if (editingId) {
        await fetch('/api/standards', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        })
        toast.success('Estándar actualizado correctamente')
      } else {
        await fetch('/api/standards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        toast.success('Estándar creado correctamente')
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
      toast.success('Estándar eliminado')
    } catch (e) {
      console.error('Error deleting standard:', e)
    }
  }

  const getCategoryInfo = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[CATEGORIES.length - 1]
  const getStatusInfo = (status: string) => STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]
  const getMejoraTipoInfo = (tipo: string | null) => MEJORA_TIPOS.find(m => m.value === tipo)

  // Group standards by S-step
  const groupedByS = S_STEPS.map(s => ({
    ...s,
    items: standards.filter(std => std.sStep === s.id),
  }))

  // Check if form is in "formato mejora" mode
  const isFormatoMejora = formCategory === 'formato_mejora'
  const isFotosAntes = formCategory === 'fotos_antes'

  // Load template when S step changes during creation
  useEffect(() => {
    if (isCreating && formSStep) {
      loadStandardTemplate(formSStep)
    }
  }, [isCreating, formSStep, loadStandardTemplate])

  // Check if a field is required based on the template
  const isFieldRequired = (key: string): boolean => {
    const field = templateFields.find(f => f.key === key)
    return field?.required ?? false
  }

  // Validate required fields from template before saving
  const validateRequiredFields = (): string | null => {
    for (const field of templateFields) {
      if (!field.required) continue
      if (field.key === 'beforePhotoUrl' && !formBeforePhotoUrl) return `Foto ANTES es obligatoria`
      if (field.key === 'afterPhotoUrl' && !formAfterPhotoUrl) return `Foto DESPUÉS es obligatoria`
      if (field.key === 'responsable' && !formResponsable.trim()) return `Responsable es obligatorio`
      if (field.key === 'contacto' && !formContacto.trim()) return `Contacto es obligatorio`
      if (field.key === 'mejoraTipo' && !formMejoraTipo) return `Tipo de Mejora es obligatorio`
    }
    return null
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); resetForm(); setViewingStandard(null) } }}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-teal-600" />
            Biblioteca de Estándares
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Registra y consulta los estándares de cada S: Formato de Mejora (antes/después), Layout, Código de colores, Señalización visual, Procedimientos...
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
              <SelectTrigger className="w-52 h-8 text-xs"><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            {!isCreating && !viewingStandard && (
              <>
                <Button size="sm" onClick={() => setShowColorCodeTable(true)}
                  className="gap-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs h-8">
                  <Paintbrush className="h-3 w-3" /> Cuadro Colores
                </Button>
                <Button size="sm" onClick={() => setShowLayoutEditor(true)}
                  className="gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">
                  <PenTool className="h-3 w-3" /> Dibujar Layout
                </Button>
                <Button size="sm" onClick={() => { resetForm(); setFormCategory('fotos_antes'); setIsCreating(true) }}
                  className="gap-1 bg-red-600 hover:bg-red-700 text-white text-xs h-8">
                  <Camera className="h-3 w-3" /> Fotos Antes
                </Button>
                <Button size="sm" onClick={() => { resetForm(); setFormCategory('formato_mejora'); setIsCreating(true) }}
                  className="gap-1 bg-teal-600 hover:bg-teal-700 text-white text-xs h-8">
                  <Plus className="h-3 w-3" /> Formato Mejora
                </Button>
                <Button size="sm" variant="outline" onClick={() => { resetForm(); setIsCreating(true) }}
                  className="gap-1 text-xs h-8">
                  <Plus className="h-3 w-3" /> Otro Estándar
                </Button>
              </>
            )}
          </div>

          {/* ═══════════════ VIEW STANDARD DETAIL (Formato Mejora) ═══════════════ */}
          {viewingStandard && !isCreating && (
            <div className="flex-1 overflow-auto px-6 py-4">
              <Button variant="ghost" size="sm" onClick={() => setViewingStandard(null)}
                className="mb-3 gap-1 text-xs">
                ← Volver a la lista
              </Button>

              <StandardFormatCard std={viewingStandard} onEdit={() => { handleEdit(viewingStandard); setViewingStandard(null) }} onDelete={() => { handleDelete(viewingStandard.id); setViewingStandard(null) }} />
            </div>
          )}

          {/* ═══════════════ CREATE/EDIT FORM ═══════════════ */}
          {isCreating && !viewingStandard && (
            <div className="flex-1 overflow-auto px-6 py-4 bg-teal-50/30 space-y-4">
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
                <Label className="text-xs">Título del Estándar</Label>
                <Input value={formTitle} onChange={e => setFormTitle(e.target.value)}
                  placeholder="Ej: Mejora ubicación herramientas zona montaje" className="h-8 text-xs" />
              </div>

              <div>
                <Label className="text-xs">Descripción / Detalle de la mejora</Label>
                <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)}
                  placeholder="Describe la mejora realizada, qué problema había y cómo se ha solucionado..."
                  className="text-xs min-h-[60px]" />
              </div>

              {/* ═══ FORMATO MEJORA: Antes/Después, Responsable, Contacto, Tipo ═══ */}
              {(isFormatoMejora || formBeforePhotoUrl || formAfterPhotoUrl) && (
                <Card className="border-2 border-teal-200 bg-white">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-teal-600" />
                      <h5 className="text-sm font-bold text-teal-800">Formato Estándar de Mejora</h5>
                      {templateLoaded && (
                        <Badge variant="outline" className="text-[9px] ml-1">Plantilla cargada</Badge>
                      )}
                    </div>

                    {/* Tipo de Mejora */}
                    <div>
                      <Label className="text-xs font-semibold">
                        Tipo de Mejora {isFieldRequired('mejoraTipo') && <span className="text-red-500">*</span>}
                      </Label>
                      <div className="grid grid-cols-4 gap-2 mt-1">
                        {MEJORA_TIPOS.map(tipo => (
                          <button
                            key={tipo.value}
                            type="button"
                            onClick={() => setFormMejoraTipo(tipo.value)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 transition-all text-xs font-medium ${
                              formMejoraTipo === tipo.value
                                ? 'border-current shadow-md scale-105'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                            style={formMejoraTipo === tipo.value ? { borderColor: tipo.accent, color: tipo.accent, backgroundColor: `${tipo.accent}10` } : {}}
                          >
                            <tipo.icon className="h-4 w-4" />
                            {tipo.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fotos Antes / Después */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* ANTES */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold flex items-center gap-1">
                          <Camera className="h-3 w-3 text-red-500" />
                          ANTES (estado original) {isFieldRequired('beforePhotoUrl') && <span className="text-red-500">*</span>}
                        </Label>
                        <div className="relative border-2 border-dashed border-red-200 rounded-lg overflow-hidden bg-red-50/30 min-h-[160px] flex items-center justify-center">
                          {formBeforePhotoUrl ? (
                            <div className="relative w-full">
                              <img src={formBeforePhotoUrl} alt="Antes" className="w-full h-40 object-cover" />
                              <button type="button" onClick={() => setFormBeforePhotoUrl(null)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="text-center p-4">
                              <Camera className="h-8 w-8 text-red-300 mx-auto mb-2" />
                              <p className="text-xs text-red-400 font-medium">ANTES</p>
                              <Button variant="outline" size="sm" className="mt-2 text-xs h-7 border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => beforeInputRef.current?.click()}
                                disabled={isUploading === 'before'}>
                                {isUploading === 'before' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Camera className="h-3 w-3 mr-1" />}
                                Subir Foto
                              </Button>
                              <input ref={beforeInputRef} type="file" accept="image/*" className="hidden"
                                onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f, 'before'); e.target.value = '' }} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* DESPUÉS */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold flex items-center gap-1">
                          <Camera className="h-3 w-3 text-green-500" />
                          DESPUÉS (con mejora) {isFieldRequired('afterPhotoUrl') && <span className="text-red-500">*</span>}
                        </Label>
                        <div className="relative border-2 border-dashed border-green-200 rounded-lg overflow-hidden bg-green-50/30 min-h-[160px] flex items-center justify-center">
                          {formAfterPhotoUrl ? (
                            <div className="relative w-full">
                              <img src={formAfterPhotoUrl} alt="Después" className="w-full h-40 object-cover" />
                              <button type="button" onClick={() => setFormAfterPhotoUrl(null)}
                                className="absolute top-1 right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-green-600">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="text-center p-4">
                              <Camera className="h-8 w-8 text-green-300 mx-auto mb-2" />
                              <p className="text-xs text-green-400 font-medium">DESPUÉS</p>
                              <Button variant="outline" size="sm" className="mt-2 text-xs h-7 border-green-300 text-green-600 hover:bg-green-50"
                                onClick={() => afterInputRef.current?.click()}
                                disabled={isUploading === 'after'}>
                                {isUploading === 'after' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Camera className="h-3 w-3 mr-1" />}
                                Subir Foto
                              </Button>
                              <input ref={afterInputRef} type="file" accept="image/*" className="hidden"
                                onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f, 'after'); e.target.value = '' }} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Responsable + Contacto */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold flex items-center gap-1">
                          <User className="h-3 w-3" /> Responsable (quién lo ha hecho) {isFieldRequired('responsable') && <span className="text-red-500">*</span>}
                        </Label>
                        <Input value={formResponsable} onChange={e => setFormResponsable(e.target.value)}
                          placeholder="Nombre de la persona responsable" className="h-8 text-xs mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold flex items-center gap-1">
                          <Phone className="h-3 w-3" /> Contacto {isFieldRequired('contacto') && <span className="text-red-500">*</span>}
                        </Label>
                        <Input value={formContacto} onChange={e => setFormContacto(e.target.value)}
                          placeholder="Teléfono o email de contacto" className="h-8 text-xs mt-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ═══ FOTOS ANTES: Foto, Nombre, Zona ═══ */}
              {isFotosAntes && (
                <Card className="border-2 border-red-200 bg-white">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Camera className="h-5 w-5 text-red-600" />
                      <h5 className="text-sm font-bold text-red-800">Fotos del ANTES</h5>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Registra el estado ANTES de la zona con una foto, indica quién la hace y la zona.
                    </p>

                    {/* Foto ANTES */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold flex items-center gap-1">
                        <Camera className="h-3 w-3 text-red-500" />
                        FOTO DEL ANTES <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative border-2 border-dashed border-red-200 rounded-lg overflow-hidden bg-red-50/30 min-h-[200px] flex items-center justify-center">
                        {formBeforePhotoUrl ? (
                          <div className="relative w-full">
                            <img src={formBeforePhotoUrl} alt="Antes" className="w-full h-48 object-cover" />
                            <button type="button" onClick={() => setFormBeforePhotoUrl(null)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-center p-4">
                            <Camera className="h-10 w-10 text-red-300 mx-auto mb-2" />
                            <p className="text-sm text-red-400 font-medium">FOTO DEL ANTES</p>
                            <p className="text-xs text-red-300 mt-1">Sube una foto del estado actual de la zona</p>
                            <Button variant="outline" size="sm" className="mt-3 text-xs h-8 border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => beforeInputRef.current?.click()}
                              disabled={isUploading === 'before'}>
                              {isUploading === 'before' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Camera className="h-3 w-3 mr-1" />}
                              Subir Foto
                            </Button>
                            <input ref={beforeInputRef} type="file" accept="image/*" className="hidden"
                              onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f, 'before'); e.target.value = '' }} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Nombre + Zona */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold flex items-center gap-1">
                          <User className="h-3 w-3" /> Nombre de quien hace la foto <span className="text-red-500">*</span>
                        </Label>
                        <Input value={formResponsable} onChange={e => setFormResponsable(e.target.value)}
                          placeholder="Nombre y apellidos" className="h-8 text-xs mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" /> Zona <span className="text-red-500">*</span>
                        </Label>
                        <Input value={formZona} onChange={e => setFormZona(e.target.value)}
                          placeholder="Nombre de la zona" className="h-8 text-xs mt-1" />
                      </div>
                    </div>

                    {/* Fecha + Observaciones */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold">Fecha</Label>
                        <Input type="date" value={formFecha} onChange={e => setFormFecha(e.target.value)}
                          className="h-8 text-xs mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Observaciones</Label>
                        <Input value={formObservaciones} onChange={e => setFormObservaciones(e.target.value)}
                          placeholder="Notas adicionales..." className="h-8 text-xs mt-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Other category fields */}
              {!isFormatoMejora && !isFotosAntes && (
                <div>
                  <Label className="text-xs">Contenido / Detalles</Label>
                  <Textarea value={formContent} onChange={e => setFormContent(e.target.value)}
                    placeholder='{"campo": "valor"} o texto libre'
                    className="text-xs min-h-[60px] font-mono" />
                </div>
              )}

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

          {/* ═══════════════ STANDARDS LIST ═══════════════ */}
          {!isCreating && !viewingStandard && (
            <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-teal-500 animate-spin" /></div>
              ) : standards.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay estándares registrados</p>
                  <p className="text-xs mt-1">Añade el primero con &quot;Formato Mejora&quot; u &quot;Otro Estándar&quot;</p>
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
                        const mejoraInfo = getMejoraTipoInfo(std.mejoraTipo)
                        const isMejora = std.category === 'formato_mejora'
                        const isFotosAntesItem = std.category === 'fotos_antes'
                        // Parse zona from content for fotos_antes items
                        let fotosAntesZona = ''
                        if (isFotosAntesItem && std.content) {
                          try {
                            const extra = typeof std.content === 'string' ? JSON.parse(std.content) : std.content
                            fotosAntesZona = extra.zona || ''
                          } catch {}
                        }

                        return (
                          <Card key={std.id} className="border-l-4 cursor-pointer hover:shadow-md transition-shadow"
                            style={{ borderLeftColor: isFotosAntesItem ? '#CC0000' : (mejoraInfo?.accent || group.color) }}
                            onClick={() => setViewingStandard(std)}>
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium">{std.title}</span>
                                    <Badge className={`${catInfo.color} text-[10px]`}>{catInfo.label}</Badge>
                                    {mejoraInfo && (
                                      <Badge style={{ backgroundColor: `${mejoraInfo.accent}20`, color: mejoraInfo.accent }} className="text-[10px] font-bold">
                                        <mejoraInfo.icon className="h-3 w-3 mr-0.5" />
                                        {mejoraInfo.label}
                                      </Badge>
                                    )}
                                    <Badge className={`${statusInfo.color} text-[10px]`}>{statusInfo.label}</Badge>
                                    <Badge variant="outline" className="text-[10px]">v{std.version}</Badge>
                                  </div>
                                  {std.description && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{std.description}</p>
                                  )}

                                  {/* Mini preview for formato mejora */}
                                  {isMejora && (std.beforePhotoUrl || std.afterPhotoUrl) && (
                                    <div className="flex items-center gap-2 mt-2">
                                      {std.beforePhotoUrl && (
                                        <img src={std.beforePhotoUrl} alt="Antes" className="w-16 h-12 object-cover rounded border border-red-200" />
                                      )}
                                      <ArrowRight className="h-3 w-3 text-gray-400" />
                                      {std.afterPhotoUrl && (
                                        <img src={std.afterPhotoUrl} alt="Después" className="w-16 h-12 object-cover rounded border border-green-200" />
                                      )}
                                    </div>
                                  )}

                                  {/* Mini preview for fotos_antes */}
                                  {isFotosAntesItem && std.beforePhotoUrl && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <img src={std.beforePhotoUrl} alt="Antes" className="w-16 h-12 object-cover rounded border border-red-200" />
                                      <div className="text-[10px] text-muted-foreground">
                                        {fotosAntesZona && <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" /> {fotosAntesZona}</span>}
                                      </div>
                                    </div>
                                  )}

                                  {/* Responsable & zona inline */}
                                  {std.responsable && (
                                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" /> {std.responsable}
                                      </span>
                                      {isFotosAntesItem && fotosAntesZona && (
                                        <span className="flex items-center gap-1">
                                          <ImageIcon className="h-3 w-3" /> {fotosAntesZona}
                                        </span>
                                      )}
                                      {!isFotosAntesItem && std.contacto && (
                                        <span className="flex items-center gap-1">
                                          <Phone className="h-3 w-3" /> {std.contacto}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
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
          )}
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

// ═══════════════════════════════════════════════════════
// Standard Format Card — Full view with Before/After photos
// ═══════════════════════════════════════════════════════
function StandardFormatCard({ std, onEdit, onDelete }: { std: StandardItem; onEdit: () => void; onDelete: () => void }) {
  const mejoraInfo = getMejoraTipoInfo(std.mejoraTipo)
  const statusInfo = STATUS_OPTIONS.find(s => s.value === std.status) || STATUS_OPTIONS[0]
  const sStepData = S_STEPS.find(s => s.id === std.sStep)
  const isMejora = std.category === 'formato_mejora'
  const isFotosAntesView = std.category === 'fotos_antes'
  // Parse extra fields from content for fotos_antes
  let fotosAntesExtra: { zona?: string; fecha?: string; observaciones?: string } = {}
  if (isFotosAntesView && std.content) {
    try {
      fotosAntesExtra = typeof std.content === 'string' ? JSON.parse(std.content) : std.content
    } catch {}
  }

  const headerColor = isFotosAntesView ? '#CC0000' : (mejoraInfo?.accent || '#0d9488')

  return (
    <Card className="border-2 overflow-hidden" style={{ borderColor: headerColor }}>
      {/* Header bar */}
      <div className="px-4 py-3 flex items-center gap-2 text-white" style={{ backgroundColor: headerColor }}>
        {isFotosAntesView ? <Camera className="h-5 w-5" /> : <Award className="h-5 w-5" />}
        <span className="font-bold text-sm flex-1">
          {isFotosAntesView ? 'FOTOS DEL ANTES' : (isMejora ? 'FORMATO ESTÁNDAR DE MEJORA' : `ESTÁNDAR — ${std.category.toUpperCase()}`)}
        </span>
        {mejoraInfo && (
          <Badge className="bg-white/20 text-white border-0 text-xs font-bold">
            <mejoraInfo.icon className="h-3 w-3 mr-1" /> {mejoraInfo.label.toUpperCase()}
          </Badge>
        )}
        <Badge className="bg-white/20 text-white border-0 text-[10px]">
          S{std.sStep} — {sStepData?.japaneseName}
        </Badge>
        <Badge className={`${statusInfo.color} text-[10px]`}>{statusInfo.label}</Badge>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Title */}
        <div>
          <h3 className="text-lg font-bold">{std.title}</h3>
          {std.description && <p className="text-sm text-muted-foreground mt-1">{std.description}</p>}
        </div>

        {/* fotos_antes view: single photo + details */}
        {isFotosAntesView ? (
          <>
            {/* Foto ANTES */}
            {std.beforePhotoUrl && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                  <Camera className="h-3.5 w-3.5" /> FOTO DEL ANTES
                </div>
                <div className="border-2 border-red-200 rounded-lg overflow-hidden bg-red-50/30">
                  <img src={std.beforePhotoUrl} alt="Antes"
                    className="w-full h-64 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => window.open(std.beforePhotoUrl!, '_blank')} />
                </div>
              </div>
            )}

            {/* Details: Nombre, Zona, Fecha, Observaciones */}
            <div className="grid grid-cols-2 gap-3 bg-red-50/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">FOTÓGRAFO</p>
                  <p className="text-xs font-semibold">{std.responsable || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <ImageIcon className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">ZONA</p>
                  <p className="text-xs font-semibold">{fotosAntesExtra.zona || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">FECHA</p>
                  <p className="text-xs font-semibold">{fotosAntesExtra.fecha || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Eye className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">OBSERVACIONES</p>
                  <p className="text-xs font-semibold">{fotosAntesExtra.observaciones || '—'}</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Before / After photos (formato_mejora) */}
            {(std.beforePhotoUrl || std.afterPhotoUrl) && (
              <div className="grid grid-cols-2 gap-4">
                {/* ANTES */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                    <Camera className="h-3.5 w-3.5" /> ANTES
                  </div>
                  <div className="border-2 border-red-200 rounded-lg overflow-hidden bg-red-50/30">
                    {std.beforePhotoUrl ? (
                      <img src={std.beforePhotoUrl} alt="Antes"
                        className="w-full h-48 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(std.beforePhotoUrl!, '_blank')} />
                    ) : (
                      <div className="w-full h-48 flex items-center justify-center text-red-300">
                        <Camera className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                </div>

                {/* DESPUÉS */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-green-600">
                    <Camera className="h-3.5 w-3.5" /> DESPUÉS
                  </div>
                  <div className="border-2 border-green-200 rounded-lg overflow-hidden bg-green-50/30">
                    {std.afterPhotoUrl ? (
                      <img src={std.afterPhotoUrl} alt="Después"
                        className="w-full h-48 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(std.afterPhotoUrl!, '_blank')} />
                    ) : (
                      <div className="w-full h-48 flex items-center justify-center text-green-300">
                        <Camera className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Responsable + Contacto + Tipo */}
            <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">RESPONSABLE</p>
                  <p className="text-xs font-semibold">{std.responsable || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">CONTACTO</p>
                  <p className="text-xs font-semibold">{std.contacto || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${mejoraInfo?.accent || '#6b7280'}20` }}>
                  {mejoraInfo ? <mejoraInfo.icon className="h-4 w-4" style={{ color: mejoraInfo.accent }} /> : <Cog className="h-4 w-4 text-gray-500" />}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">TIPO DE MEJORA</p>
                  <p className="text-xs font-semibold" style={{ color: mejoraInfo?.accent }}>
                    {mejoraInfo?.label || '—'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Content (for non-mejora and non-fotos_antes standards) */}
        {std.content && !isMejora && !isFotosAntesView && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground font-medium mb-1">CONTENIDO</p>
            <p className="text-xs font-mono whitespace-pre-wrap">{std.content}</p>
          </div>
        )}

        {/* Footer: version + date */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t">
          <span>Versión {std.version} · Creado: {new Date(std.createdAt).toLocaleDateString('es-ES')} · Zona: {std.zoneId ? 'Específica' : 'Global'}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-teal-600">
              <Edit3 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function getMejoraTipoInfo(tipo: string | null) {
  return MEJORA_TIPOS.find(m => m.value === tipo)
}
