'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  Camera, Plus, Trash2, X, Check, Loader2, Image as ImageIcon, Upload, ZoomIn
} from 'lucide-react'

interface PhotoItem {
  id: string
  sStep: number
  miniStep: number
  title: string
  description: string | null
  photoUrl: string
  photoType: string
  category: string
  tags: string | null
  projectId: string
  zoneId: string | null
  uploadedBy: string | null
  createdAt: string
  updatedAt: string
}

const PHOTO_TYPES = [
  { value: 'antes', label: 'Antes', color: 'bg-red-100 text-red-800' },
  { value: 'despues', label: 'Después', color: 'bg-green-100 text-green-800' },
  { value: 'referencia', label: 'Referencia', color: 'bg-blue-100 text-blue-800' },
  { value: 'hallazgo', label: 'Hallazgo', color: 'bg-orange-100 text-orange-800' },
  { value: 'mejora', label: 'Mejora', color: 'bg-purple-100 text-purple-800' },
]

interface PhotoLibraryProps {
  open: boolean
  onClose: () => void
}

export default function PhotoLibrary({ open, onClose }: PhotoLibraryProps) {
  const { currentProject, currentZone } = use5SStore()
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filterS, setFilterS] = useState<number | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [isCreating, setIsCreating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [formSStep, setFormSStep] = useState(1)
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPhotoType, setFormPhotoType] = useState('antes')
  const [formCategory, setFormCategory] = useState('general')
  const [formPhotoUrl, setFormPhotoUrl] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const loadPhotos = useCallback(async () => {
    if (!currentProject) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ projectId: currentProject.id })
      if (filterS) params.set('sStep', String(filterS))
      if (filterType !== 'all') params.set('photoType', filterType)
      if (currentZone?.id) params.set('zoneId', currentZone.id)

      const res = await fetch(`/api/photo-library?${params}`)
      const json = await res.json()
      if (json.success) {
        setPhotos(json.data || [])
      }
    } catch (e) {
      console.error('Error loading photos:', e)
    } finally {
      setIsLoading(false)
    }
  }, [currentProject, filterS, filterType, currentZone])

  useEffect(() => {
    if (open) loadPhotos()
  }, [open, loadPhotos])

  const resetForm = () => {
    setFormSStep(1)
    setFormTitle('')
    setFormDescription('')
    setFormPhotoType('antes')
    setFormCategory('general')
    setFormPhotoUrl('')
    setIsCreating(false)
  }

  const handleFileUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('projectId', currentProject?.id || '')

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (json.url) {
        setFormPhotoUrl(json.url)
      } else {
        alert('Error al subir la foto')
      }
    } catch (e) {
      console.error('Upload error:', e)
      alert('Error al subir la foto')
    }
  }

  const handleSave = async () => {
    if (!currentProject || !formTitle) return
    setIsSaving(true)
    try {
      const payload = {
        sStep: formSStep,
        miniStep: 2,
        title: formTitle,
        description: formDescription || null,
        photoUrl: formPhotoUrl || '',
        photoType: formPhotoType,
        category: formCategory,
        projectId: currentProject.id,
        zoneId: currentZone?.id || null,
      }

      if (!payload.photoUrl) {
        alert('Debes subir una foto o indicar una URL')
        setIsSaving(false)
        return
      }

      await fetch('/api/photo-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      resetForm()
      await loadPhotos()
    } catch (e) {
      console.error('Error saving photo:', e)
      alert('Error al guardar la foto')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta foto del registro?')) return
    try {
      await fetch(`/api/photo-library?id=${id}`, { method: 'DELETE' })
      await loadPhotos()
    } catch (e) {
      console.error('Error deleting photo:', e)
    }
  }

  const getPhotoTypeInfo = (type: string) => PHOTO_TYPES.find(t => t.value === type) || PHOTO_TYPES[0]

  // Group photos by S-step
  const groupedByS = S_STEPS.map(s => ({
    ...s,
    items: photos.filter(p => p.sStep === s.id),
  }))

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); resetForm() } }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5 text-indigo-600" />
            Biblioteca de Fotos
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Registro fotográfico: fotos antes/después, de referencia, hallazgos y mejoras por cada S.
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
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Tipo de foto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {PHOTO_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            {!isCreating && (
              <Button size="sm" onClick={() => { resetForm(); setIsCreating(true) }}
                className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8">
                <Plus className="h-3 w-3" /> Registrar Foto
              </Button>
            )}
          </div>

          {/* Create form */}
          {isCreating && (
            <div className="px-6 py-4 border-b bg-indigo-50/50 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-indigo-800">Registrar Nueva Foto</h4>
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
                  <Label className="text-xs">Tipo de foto</Label>
                  <Select value={formPhotoType} onValueChange={setFormPhotoType}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PHOTO_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Título</Label>
                <Input value={formTitle} onChange={e => setFormTitle(e.target.value)}
                  placeholder="Ej: Zona de montaje antes de reorganizar" className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Descripción</Label>
                <Input value={formDescription} onChange={e => setFormDescription(e.target.value)}
                  placeholder="Notas adicionales..." className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Foto</Label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) await handleFileUpload(file)
                    }}
                  />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}
                    className="gap-1 text-xs h-8">
                    <Upload className="h-3 w-3" /> Subir archivo
                  </Button>
                  <span className="text-[10px] text-muted-foreground">o URL:</span>
                  <Input value={formPhotoUrl} onChange={e => setFormPhotoUrl(e.target.value)}
                    placeholder="https://..." className="h-8 text-xs flex-1" />
                </div>
                {formPhotoUrl && (
                  <div className="mt-2 w-24 h-24 rounded border overflow-hidden">
                    <img src={formPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving || !formTitle || !formPhotoUrl}
                  className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8">
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Registrar Foto
                </Button>
              </div>
            </div>
          )}

          {/* Photos grid */}
          <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-indigo-500 animate-spin" /></div>
            ) : photos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay fotos registradas</p>
                <p className="text-xs mt-1">Registra la primera foto con el botón &quot;Registrar Foto&quot;</p>
              </div>
            ) : (
              groupedByS.filter(g => g.items.length > 0).map(group => (
                <div key={group.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: group.color }}>{group.id}</div>
                    <h3 className="text-sm font-bold" style={{ color: group.color }}>
                      S{group.id} — {group.japaneseName}
                    </h3>
                    <Badge variant="secondary" className="text-[10px]">{group.items.length} fotos</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {group.items.map(photo => {
                      const typeInfo = getPhotoTypeInfo(photo.photoType)
                      return (
                        <Card key={photo.id} className="overflow-hidden group relative">
                          <div className="aspect-square bg-gray-100 relative cursor-pointer"
                            onClick={() => setPreviewUrl(photo.photoUrl)}>
                            {photo.photoUrl ? (
                              <img src={photo.photoUrl} alt={photo.title}
                                className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-gray-300" />
                              </div>
                            )}
                            {/* Overlay on hover */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          <CardContent className="p-2">
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge className={`${typeInfo.color} text-[9px]`}>{typeInfo.label}</Badge>
                              <Button variant="ghost" size="sm"
                                onClick={() => handleDelete(photo.id)}
                                className="h-5 w-5 p-0 ml-auto text-muted-foreground hover:text-red-600">
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                            <p className="text-xs font-medium mt-1 line-clamp-1">{photo.title}</p>
                            {photo.description && (
                              <p className="text-[10px] text-muted-foreground line-clamp-1">{photo.description}</p>
                            )}
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

        {/* Photo preview overlay */}
        {previewUrl && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center"
            onClick={() => setPreviewUrl(null)}>
            <img src={previewUrl} alt="Preview" className="max-w-[90vw] max-h-[90vh] object-contain" />
            <button className="absolute top-4 right-4 text-white hover:text-gray-300"
              onClick={() => setPreviewUrl(null)}>
              <X className="h-8 w-8" />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
