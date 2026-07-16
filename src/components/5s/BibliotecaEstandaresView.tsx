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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BookOpen, Plus, Trash2, Edit3, X, Check, Loader2, FileText, Layout, Paintbrush, PenTool,
  Camera, ArrowRight, Shield, Award, Truck, Cog, User, Phone, Image as ImageIcon,
  ChevronDown, ChevronRight, Eye, Search, Filter, MapPin
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
  { value: 'plan_limpieza', label: 'Plan de Inspección y Limpieza', icon: Eye, color: 'bg-cyan-100 text-cyan-800' },
  { value: 'pdca', label: 'Tablero PDCA', icon: ArrowRight, color: 'bg-orange-100 text-orange-800' },
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

interface StdTemplateField {
  key: string
  label: string
  type: 'photo' | 'text' | 'number' | 'select'
  options?: string[]
  required?: boolean
}

export default function BibliotecaEstandaresView() {
  const { currentProject, currentZone, currentUser } = use5SStore()
  const [standards, setStandards] = useState<StandardItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filterS, setFilterS] = useState<number | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
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
  const [formZona, setFormZona] = useState('')
  const [formFecha, setFormFecha] = useState('')
  const [formObservaciones, setFormObservaciones] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState<'before' | 'after' | null>(null)

  const beforeInputRef = useRef<HTMLInputElement>(null)
  const afterInputRef = useRef<HTMLInputElement>(null)

  const isFormatoMejora = formCategory === 'formato_mejora'
  const isFotosAntes = formCategory === 'fotos_antes'
  const isFotosAntesView = viewingStandard?.category === 'fotos_antes'

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

  const loadStandardTemplate = useCallback(async (sStep: number) => {
    try {
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
    loadStandards()
  }, [loadStandards])

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
    if (std.category === 'fotos_antes' && std.content) {
      try {
        const extra = typeof std.content === 'string' ? JSON.parse(std.content) : std.content
        setFormZona(extra.zona || '')
        setFormFecha(extra.fecha || '')
        setFormObservaciones(extra.observaciones || '')
      } catch {
        setFormZona(''); setFormFecha(''); setFormObservaciones('')
      }
    } else {
      setFormZona(''); setFormFecha(''); setFormObservaciones('')
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

  const isFieldRequired = (key: string) => templateFields.some(f => f.key === key && f.required)

  const validateRequiredFields = () => {
    for (const field of templateFields) {
      if (!field.required) continue
      if (field.key === 'beforePhotoUrl' && !formBeforePhotoUrl) return `Foto Antes es obligatoria`
      if (field.key === 'afterPhotoUrl' && !formAfterPhotoUrl) return `Foto Después es obligatoria`
      if (field.key === 'responsable' && !formResponsable.trim()) return `Quién lo ha hecho es obligatorio`
      if (field.key === 'contacto' && !formContacto.trim()) return `Contacto es obligatorio`
      if (field.key === 'mejoraTipo' && !formMejoraTipo) return `Tipo de Mejora es obligatorio`
    }
    return null
  }

  const handleSave = async () => {
    if (!currentProject || !formTitle) return
    if (isFormatoMejora) {
      const validationError = validateRequiredFields()
      if (validationError) { toast.error(validationError); return }
    }
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

      if (formCategory === 'formato_mejora' || formBeforePhotoUrl || formAfterPhotoUrl || formResponsable || formMejoraTipo) {
        payload.beforePhotoUrl = formBeforePhotoUrl || null
        payload.afterPhotoUrl = formAfterPhotoUrl || null
        payload.responsable = formResponsable || null
        payload.contacto = formContacto || null
        payload.mejoraTipo = formMejoraTipo || null
      }

      if (formCategory === 'fotos_antes') {
        payload.beforePhotoUrl = formBeforePhotoUrl || null
        payload.responsable = formResponsable || null
        payload.content = JSON.stringify({ zona: formZona, fecha: formFecha, observaciones: formObservaciones })
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
      loadStandards()
    } catch (e) {
      console.error('Save error:', e)
      toast.error('Error al guardar el estándar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este estándar? Esta acción no se puede deshacer.')) return
    try {
      await fetch(`/api/standards?id=${id}`, { method: 'DELETE' })
      toast.success('Estándar eliminado')
      loadStandards()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  // Filter standards by search query
  const filteredStandards = standards.filter(std => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      std.title.toLowerCase().includes(q) ||
      (std.description || '').toLowerCase().includes(q) ||
      (std.responsable || '').toLowerCase().includes(q) ||
      (std.category || '').toLowerCase().includes(q) ||
      `s${std.sStep}`.includes(q)
    )
  })

  const getCategoryInfo = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[CATEGORIES.length - 1]
  const getStatusInfo = (status: string) => STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]
  const getMejoraInfo = (tipo: string) => MEJORA_TIPOS.find(t => t.value === tipo)

  // ═══════════════════════════════════════════════════════
  // Standard Detail Card (for viewing)
  // ═══════════════════════════════════════════════════════
  const StandardFormatCard = ({ std, onEdit, onDelete }: { std: StandardItem; onEdit: () => void; onDelete: () => void }) => {
    const sStepData = S_STEPS.find(s => s.id === std.sStep)
    const isMejora = std.category === 'formato_mejora'
    const mejoraInfo = getMejoraInfo(std.mejoraTipo || '')
    const statusInfo = getStatusInfo(std.status)
    const headerColor = isFotosAntesView ? '#CC0000' : (mejoraInfo?.accent || '#0d9488')

    return (
      <Card className="border-2 overflow-hidden" style={{ borderColor: headerColor }}>
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
          <div>
            <h3 className="text-lg font-bold">{std.title}</h3>
            {std.description && <p className="text-sm text-muted-foreground mt-1">{std.description}</p>}
          </div>

          {/* Photos */}
          {(std.beforePhotoUrl || std.afterPhotoUrl) && (
            <div className="grid grid-cols-2 gap-4">
              {std.beforePhotoUrl && (
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-1">ANTES</p>
                  <img src={std.beforePhotoUrl} alt="Antes" className="w-full rounded border object-cover max-h-64" />
                </div>
              )}
              {std.afterPhotoUrl && (
                <div>
                  <p className="text-xs font-semibold text-green-600 mb-1">DESPUÉS</p>
                  <img src={std.afterPhotoUrl} alt="Después" className="w-full rounded border object-cover max-h-64" />
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {std.responsable && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span><strong>Responsable:</strong> {std.responsable}</span>
              </div>
            )}
            {std.contacto && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span><strong>Contacto:</strong> {std.contacto}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span><strong>Versión:</strong> {std.version}</span>
            </div>
            <div className="flex items-center gap-2">
              <span><strong>Fecha:</strong> {new Date(std.createdAt).toLocaleDateString('es-ES')}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={onEdit} className="gap-1"><Edit3 className="h-3 w-3" /> Editar</Button>
            <Button size="sm" variant="destructive" onClick={onDelete} className="gap-1"><Trash2 className="h-3 w-3" /> Eliminar</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-teal-50 to-emerald-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-teal-900">Biblioteca de Estándares</h2>
            <p className="text-xs text-teal-700">
              Registra y consulta los estándares de cada S: Formato de Mejora, Layout, Plan de Limpieza, Código de colores, Señalización...
            </p>
          </div>
        </div>
      </div>

      {/* Filters + Actions */}
      <div className="px-6 py-3 border-b bg-white flex items-center gap-3 flex-wrap shrink-0">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar estándares..."
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={filterS ? String(filterS) : 'all'} onValueChange={v => setFilterS(v === 'all' ? null : Number(v))}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Todas las S" /></SelectTrigger>
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
              <Paintbrush className="h-3 w-3" /> Colores Suelo
            </Button>
            <Button size="sm" onClick={() => setShowLayoutEditor(true)}
              className="gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">
              <PenTool className="h-3 w-3" /> Dibujar Layout
            </Button>
            <Button size="sm" onClick={() => { resetForm(); setFormCategory('fotos_antes'); setIsCreating(true) }}
              className="gap-1 bg-red-600 hover:bg-red-700 text-white text-xs h-8">
              <Camera className="h-3 w-3" /> Fotos Antes
            </Button>
            <Button size="sm" onClick={() => { resetForm(); setFormCategory('plan_limpieza'); setIsCreating(true) }}
              className="gap-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs h-8">
              <Eye className="h-3 w-3" /> Plan Limpieza
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

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* View Standard Detail */}
        {viewingStandard && !isCreating && (
          <div className="px-6 py-4">
            <Button variant="ghost" size="sm" onClick={() => setViewingStandard(null)}
              className="mb-3 gap-1 text-xs">
              ← Volver a la lista
            </Button>
            <StandardFormatCard
              std={viewingStandard}
              onEdit={() => { handleEdit(viewingStandard); setViewingStandard(null) }}
              onDelete={() => { handleDelete(viewingStandard.id); setViewingStandard(null) }}
            />
          </div>
        )}

        {/* Create/Edit Form */}
        {isCreating && !viewingStandard && (
          <div className="px-6 py-4 bg-teal-50/30 space-y-4">
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
                <Select value={String(formSStep)} onValueChange={v => { setFormSStep(Number(v)); loadStandardTemplate(Number(v)) }}>
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
              <Label className="text-xs">Descripción / Detalle</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)}
                placeholder="Describe la mejora realizada..."
                className="text-xs min-h-[60px]" />
            </div>

            {/* Plan de Limpieza specific fields */}
            {formCategory === 'plan_limpieza' && (
              <Card className="border-2 border-cyan-200 bg-white">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-cyan-600" />
                    <h5 className="text-sm font-bold text-cyan-800">Plan de Inspección y Limpieza</h5>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Define la ruta de inspección, los puntos de suciedad que no se pueden eliminar y las acciones de limpieza para la zona.
                  </p>
                  <div>
                    <Label className="text-xs">Zona</Label>
                    <Input value={formZona} onChange={e => setFormZona(e.target.value)}
                      placeholder="Nombre de la zona a inspeccionar" className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Ruta de Inspección</Label>
                    <Textarea value={formContent} onChange={e => setFormContent(e.target.value)}
                      placeholder="Describe la ruta paso a paso: Punto 1 → Punto 2 → Punto 3..."
                      className="text-xs min-h-[80px]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Responsable</Label>
                      <Input value={formResponsable} onChange={e => setFormResponsable(e.target.value)}
                        placeholder="Persona responsable" className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Fecha</Label>
                      <Input type="date" value={formFecha} onChange={e => setFormFecha(e.target.value)}
                        className="h-8 text-xs" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Observaciones / Puntos de suciedad no eliminables</Label>
                    <Textarea value={formObservaciones} onChange={e => setFormObservaciones(e.target.value)}
                      placeholder="Lista los puntos de suciedad que no se pueden eliminar y las acciones preventivas..."
                      className="text-xs min-h-[60px]" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Formato Mejora: Antes/Después */}
            {isFormatoMejora && (
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
                    <Label className="text-xs font-semibold">Tipo de Mejora {isFieldRequired('mejoraTipo') && <span className="text-red-500">*</span>}</Label>
                    <div className="grid grid-cols-4 gap-2 mt-1">
                      {MEJORA_TIPOS.map(tipo => (
                        <button
                          key={tipo.value}
                          type="button"
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                            formMejoraTipo === tipo.value
                              ? 'border-current shadow-sm'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          style={formMejoraTipo === tipo.value ? { borderColor: tipo.accent, color: tipo.accent, backgroundColor: `${tipo.accent}10` } : undefined}
                          onClick={() => setFormMejoraTipo(tipo.value)}
                        >
                          <tipo.icon className="h-3.5 w-3.5" />
                          {tipo.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Photos */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold">Foto ANTES {isFieldRequired('beforePhotoUrl') && <span className="text-red-500">*</span>}</Label>
                      <input type="file" accept="image/*" ref={beforeInputRef} className="hidden"
                        onChange={e => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0], 'before') }} />
                      {formBeforePhotoUrl ? (
                        <div className="relative mt-1">
                          <img src={formBeforePhotoUrl} alt="Antes" className="w-full rounded border object-cover max-h-40" />
                          <button type="button" onClick={() => setFormBeforePhotoUrl(null)}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => beforeInputRef.current?.click()}
                          className="mt-1 w-full h-32 border-2 border-dashed border-red-300 rounded-lg flex flex-col items-center justify-center text-red-500 hover:bg-red-50 transition-colors">
                          {isUploading === 'before' ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                          <span className="text-[10px] mt-1">Subir Foto ANTES</span>
                        </button>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Foto DESPUÉS {isFieldRequired('afterPhotoUrl') && <span className="text-red-500">*</span>}</Label>
                      <input type="file" accept="image/*" ref={afterInputRef} className="hidden"
                        onChange={e => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0], 'after') }} />
                      {formAfterPhotoUrl ? (
                        <div className="relative mt-1">
                          <img src={formAfterPhotoUrl} alt="Después" className="w-full rounded border object-cover max-h-40" />
                          <button type="button" onClick={() => setFormAfterPhotoUrl(null)}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => afterInputRef.current?.click()}
                          className="mt-1 w-full h-32 border-2 border-dashed border-green-300 rounded-lg flex flex-col items-center justify-center text-green-500 hover:bg-green-50 transition-colors">
                          {isUploading === 'after' ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                          <span className="text-[10px] mt-1">Subir Foto DESPUÉS</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Responsable & Contacto */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Quién lo ha hecho {isFieldRequired('responsable') && <span className="text-red-500">*</span>}</Label>
                      <Input value={formResponsable} onChange={e => setFormResponsable(e.target.value)}
                        placeholder="Nombre" className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Contacto {isFieldRequired('contacto') && <span className="text-red-500">*</span>}</Label>
                      <Input value={formContacto} onChange={e => setFormContacto(e.target.value)}
                        placeholder="Teléfono o email" className="h-8 text-xs" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fotos Antes specific */}
            {isFotosAntes && (
              <Card className="border-2 border-red-200 bg-white">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-red-600" />
                    <h5 className="text-sm font-bold text-red-800">Fotos del ANTES</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Zona *</Label>
                      <Input value={formZona} onChange={e => setFormZona(e.target.value)}
                        placeholder="Zona fotografiada" className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Fecha</Label>
                      <Input type="date" value={formFecha} onChange={e => setFormFecha(e.target.value)}
                        className="h-8 text-xs" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Foto del ANTES *</Label>
                    <input type="file" accept="image/*" ref={beforeInputRef} className="hidden"
                      onChange={e => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0], 'before') }} />
                    {formBeforePhotoUrl ? (
                      <div className="relative mt-1">
                        <img src={formBeforePhotoUrl} alt="Antes" className="w-full rounded border object-cover max-h-40" />
                        <button type="button" onClick={() => setFormBeforePhotoUrl(null)}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => beforeInputRef.current?.click()}
                        className="mt-1 w-full h-28 border-2 border-dashed border-red-300 rounded-lg flex flex-col items-center justify-center text-red-500 hover:bg-red-50">
                        {isUploading === 'before' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                        <span className="text-[10px] mt-1">Subir Foto</span>
                      </button>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Quién hace la foto *</Label>
                    <Input value={formResponsable} onChange={e => setFormResponsable(e.target.value)}
                      placeholder="Nombre" className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Observaciones</Label>
                    <Textarea value={formObservaciones} onChange={e => setFormObservaciones(e.target.value)}
                      className="text-xs min-h-[40px]" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status & Version */}
            <div className="grid grid-cols-2 gap-3">
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
                  min={1} className="h-8 text-xs" />
              </div>
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={isSaving || !formTitle}
                className="gap-1 bg-teal-600 hover:bg-teal-700 text-white">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editingId ? 'Guardar Cambios' : 'Crear Estándar'}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* Standards List */}
        {!isCreating && !viewingStandard && (
          <div className="px-6 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 text-teal-600 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Cargando estándares...</span>
              </div>
            ) : filteredStandards.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-teal-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-gray-700 mb-1">No hay estándares</h3>
                <p className="text-xs text-muted-foreground">
                  {searchQuery ? 'No se encontraron resultados para la búsqueda.' : 'Crea el primer estándar usando los botones de arriba.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground mb-2">{filteredStandards.length} estándar(es) encontrado(s)</p>
                {filteredStandards.map(std => {
                  const catInfo = getCategoryInfo(std.category)
                  const statusInfo = getStatusInfo(std.status)
                  const mejoraInfo = getMejoraInfo(std.mejoraTipo || '')
                  const sStepData = S_STEPS.find(s => s.id === std.sStep)

                  return (
                    <div key={std.id}
                      className="border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer bg-white"
                      onClick={() => setViewingStandard(std)}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: sStepData?.bgColor || '#f3f4f6' }}>
                          <catInfo.icon className="h-5 w-5" style={{ color: sStepData?.color || '#6b7280' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold truncate">{std.title}</h4>
                            <Badge className={`${catInfo.color} text-[9px]`}>{catInfo.label}</Badge>
                            <Badge className={`${statusInfo.color} text-[9px]`}>{statusInfo.label}</Badge>
                            {mejoraInfo && (
                              <Badge className={`${mejoraInfo.color} text-[9px]`}>
                                <mejoraInfo.icon className="h-2.5 w-2.5 mr-0.5" />{mejoraInfo.label}
                              </Badge>
                            )}
                          </div>
                          {std.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{std.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                            <span className="font-semibold" style={{ color: sStepData?.color }}>S{std.sStep} — {sStepData?.japaneseName}</span>
                            {std.responsable && <span>👤 {std.responsable}</span>}
                            <span>v{std.version}</span>
                            <span>{new Date(std.createdAt).toLocaleDateString('es-ES')}</span>
                          </div>
                          {/* Thumbnail preview */}
                          {(std.beforePhotoUrl || std.afterPhotoUrl) && (
                            <div className="flex gap-2 mt-2">
                              {std.beforePhotoUrl && (
                                <img src={std.beforePhotoUrl} alt="Antes" className="h-12 w-16 object-cover rounded border" />
                              )}
                              {std.afterPhotoUrl && (
                                <img src={std.afterPhotoUrl} alt="Después" className="h-12 w-16 object-cover rounded border" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(std)}
                            className="h-7 w-7 p-0 text-teal-600 hover:text-teal-700">
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(std.id)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600">
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
        )}
      </div>

      {/* Layout Editor Dialog */}
      <LayoutEditor
        open={showLayoutEditor}
        onClose={() => setShowLayoutEditor(false)}
        onSave={async (imageDataUrl, shapes) => {
          if (!currentProject) return
          try {
            // Upload the layout image
            const blob = await (await fetch(imageDataUrl)).blob()
            const formData = new FormData()
            formData.append('file', blob)
            formData.append('projectId', currentProject.id)
            formData.append('filename', `${currentProject.id}_layout_${Date.now()}.png`)
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
            const uploadJson = await uploadRes.json()

            if (uploadJson.success && uploadJson.url) {
              // Create standard with layout category
              await fetch('/api/standards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sStep: 2, // Layout is typically S2 (Seiton)
                  title: `Layout de Zona — ${currentZone?.name || 'General'}`,
                  description: 'Layout dibujado con el editor de zonas',
                  category: 'layout',
                  content: JSON.stringify({ shapes, zoneName: currentZone?.name || '' }),
                  photoUrl: uploadJson.url,
                  status: 'activo',
                  version: 1,
                  projectId: currentProject.id,
                  zoneId: currentZone?.id || null,
                  createdBy: currentUser?.id || null,
                }),
              })
              toast.success('Layout guardado como estándar')
              loadStandards()
            }
          } catch (e) {
            console.error('Error saving layout:', e)
            toast.error('Error al guardar el layout')
          }
          setShowLayoutEditor(false)
        }}
        sStep={2}
      />

      {/* Color Code Table Dialog */}
      <ColorCodeTable open={showColorCodeTable} onClose={() => setShowColorCodeTable(false)} />
    </div>
  )
}
