'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { use5SStore } from '@/lib/store'
import { S_STEPS } from '@/lib/5s-constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Camera, Plus, Trash2, X, Check, Loader2, Image as ImageIcon, Upload, ZoomIn,
  ChevronLeft, ChevronRight, BarChart3, LayoutGrid, Columns, ArrowLeftRight
} from 'lucide-react'

// Neon accent colors per S-step
const S_NEON_COLORS: Record<number, string> = {
  1: '#A855F7', // purple
  2: '#EAB308', // yellow
  3: '#3B82F6', // blue
  4: '#F43F5E', // rose
  5: '#F97316', // orange
}

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
  { value: 'antes', label: 'Antes', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  { value: 'despues', label: 'Después', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { value: 'referencia', label: 'Referencia', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { value: 'hallazgo', label: 'Hallazgo', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { value: 'mejora', label: 'Mejora', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
]

type ViewMode = 'grid' | 'compare'

interface PhotoLibraryProps {
  open: boolean
  onClose: () => void
  initialSStep?: number
}

export default function PhotoLibrary({ open, onClose, initialSStep }: PhotoLibraryProps) {
  const { currentProject, currentZone } = use5SStore()
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filterS, setFilterS] = useState<number | null>(initialSStep || null)
  const [filterType, setFilterType] = useState<string>('all')
  const [isCreating, setIsCreating] = useState(false)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [previewList, setPreviewList] = useState<PhotoItem[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showStats, setShowStats] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [formSStep, setFormSStep] = useState(initialSStep || 1)
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPhotoType, setFormPhotoType] = useState('antes')
  const [formCategory, setFormCategory] = useState('general')
  const [formPhotoUrl, setFormPhotoUrl] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Update filter when initialSStep changes
  useEffect(() => {
    if (initialSStep) {
      setFilterS(initialSStep)
      setFormSStep(initialSStep)
    }
  }, [initialSStep])

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
    setFormSStep(filterS || 1)
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

  const openPreview = (photo: PhotoItem, groupPhotos: PhotoItem[]) => {
    const idx = groupPhotos.findIndex(p => p.id === photo.id)
    setPreviewIndex(idx >= 0 ? idx : 0)
    setPreviewList(groupPhotos)
  }

  const navigatePreview = (direction: number) => {
    if (previewIndex === null) return
    const newIdx = previewIndex + direction
    if (newIdx >= 0 && newIdx < previewList.length) {
      setPreviewIndex(newIdx)
    }
  }

  // Group photos by S-step
  const groupedByS = S_STEPS.map(s => ({
    ...s,
    items: photos.filter(p => p.sStep === s.id),
  })).filter(g => g.items.length > 0)

  // Before/After pairs for compare view
  const beforeAfterPairs = useCallback(() => {
    const pairs: { antes: PhotoItem; despues: PhotoItem | null; sStep: number }[] = []
    const antesPhotos = photos.filter(p => p.photoType === 'antes')
    
    for (const antes of antesPhotos) {
      const despues = photos.find(p => 
        p.photoType === 'despues' && 
        p.sStep === antes.sStep &&
        p.title.toLowerCase().includes(antes.title.toLowerCase().split(' - ')[0] || '')
      ) || null
      pairs.push({ antes, despues, sStep: antes.sStep })
    }
    return pairs
  }, [photos])

  // Statistics
  const stats = {
    total: photos.length,
    byType: PHOTO_TYPES.map(t => ({
      ...t,
      count: photos.filter(p => p.photoType === t.value).length
    })),
    byS: S_STEPS.map(s => ({
      ...s,
      count: photos.filter(p => p.sStep === s.id).length
    })).filter(s => s.count > 0),
  }

  const currentPreview = previewIndex !== null ? previewList[previewIndex] : null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); resetForm(); setPreviewIndex(null) } }}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0 bg-gray-950 border-gray-800 text-gray-100">
        <DialogHeader className="px-6 py-4 border-b border-gray-800 shrink-0 bg-gray-950">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5" style={{ color: filterS ? S_NEON_COLORS[filterS] : '#A855F7' }} />
            <span>Biblioteca de Fotos</span>
            {filterS && (
              <Badge className="text-[10px] border" style={{ 
                borderColor: S_NEON_COLORS[filterS] + '60', 
                color: S_NEON_COLORS[filterS],
                backgroundColor: S_NEON_COLORS[filterS] + '15'
              }}>
                S{filterS}
              </Badge>
            )}
          </DialogTitle>
          <p className="text-xs text-gray-500 mt-1">
            Registro fotográfico: fotos antes/después, de referencia, hallazgos y mejoras.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Filters + Actions */}
          <div className="px-6 py-3 border-b border-gray-800 bg-gray-900/50 flex items-center gap-3 flex-wrap shrink-0">
            <Select value={filterS ? String(filterS) : 'all'} onValueChange={v => setFilterS(v === 'all' ? null : Number(v))}>
              <SelectTrigger className="w-36 h-8 text-xs bg-gray-800 border-gray-700 text-gray-200">
                <SelectValue placeholder="Todas las S" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="all" className="text-gray-200">Todas las S</SelectItem>
                {S_STEPS.map(s => (
                  <SelectItem key={s.id} value={String(s.id)} className="text-gray-200">
                    <span style={{ color: S_NEON_COLORS[s.id] }}>S{s.id}</span> — {s.japaneseName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40 h-8 text-xs bg-gray-800 border-gray-700 text-gray-200">
                <SelectValue placeholder="Tipo de foto" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="all" className="text-gray-200">Todos los tipos</SelectItem>
                {PHOTO_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value} className="text-gray-200">{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1" />

            {/* View mode toggle */}
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                title="Vista cuadrícula"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('compare')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'compare' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                title="Vista antes/después"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              onClick={() => setShowStats(!showStats)}
              className={`p-1.5 rounded-md transition-colors ${showStats ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              title="Estadísticas"
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </button>

            {!isCreating && (
              <Button size="sm" onClick={() => { resetForm(); setIsCreating(true) }}
                className="gap-1 text-white text-xs h-8" style={{ backgroundColor: filterS ? S_NEON_COLORS[filterS] : '#A855F7' }}>
                <Plus className="h-3 w-3" /> Registrar Foto
              </Button>
            )}
          </div>

          {/* Stats panel */}
          {showStats && (
            <div className="px-6 py-3 border-b border-gray-800 bg-gray-900/30 shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold" style={{ color: filterS ? S_NEON_COLORS[filterS] : '#A855F7' }}>{stats.total}</p>
                  <p className="text-[10px] text-gray-500 mt-1">Total fotos</p>
                </div>
                {stats.byType.filter(t => t.count > 0).map(t => (
                  <div key={t.value} className="bg-gray-800/50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-gray-200">{t.count}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{t.label}</p>
                  </div>
                ))}
              </div>
              {stats.byS.length > 0 && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {stats.byS.map(s => (
                    <div key={s.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full" 
                      style={{ backgroundColor: S_NEON_COLORS[s.id] + '15', border: `1px solid ${S_NEON_COLORS[s.id]}30` }}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: S_NEON_COLORS[s.id] }} />
                      <span className="text-[10px] font-medium" style={{ color: S_NEON_COLORS[s.id] }}>S{s.id}</span>
                      <span className="text-[10px] text-gray-400">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Create form */}
          {isCreating && (
            <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/50 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold" style={{ color: formSStep ? S_NEON_COLORS[formSStep] : '#A855F7' }}>
                  Registrar Nueva Foto
                </h4>
                <Button variant="ghost" size="sm" onClick={resetForm} className="h-7 w-7 p-0 text-gray-400 hover:text-white">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-400">S</Label>
                  <Select value={String(formSStep)} onValueChange={v => setFormSStep(Number(v))}>
                    <SelectTrigger className="h-8 text-xs bg-gray-800 border-gray-700 text-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      {S_STEPS.map(s => (
                        <SelectItem key={s.id} value={String(s.id)} className="text-gray-200">
                          <span style={{ color: S_NEON_COLORS[s.id] }}>S{s.id}</span> — {s.japaneseName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-400">Tipo de foto</Label>
                  <Select value={formPhotoType} onValueChange={setFormPhotoType}>
                    <SelectTrigger className="h-8 text-xs bg-gray-800 border-gray-700 text-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      {PHOTO_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value} className="text-gray-200">{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-400">Título</Label>
                <Input value={formTitle} onChange={e => setFormTitle(e.target.value)}
                  placeholder="Ej: Zona de montaje antes de reorganizar" 
                  className="h-8 text-xs bg-gray-800 border-gray-700 text-gray-200 placeholder:text-gray-600" />
              </div>
              <div>
                <Label className="text-xs text-gray-400">Descripción</Label>
                <Input value={formDescription} onChange={e => setFormDescription(e.target.value)}
                  placeholder="Notas adicionales..." 
                  className="h-8 text-xs bg-gray-800 border-gray-700 text-gray-200 placeholder:text-gray-600" />
              </div>
              <div>
                <Label className="text-xs text-gray-400">Foto</Label>
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
                    className="gap-1 text-xs h-8 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
                    <Upload className="h-3 w-3" /> Subir archivo
                  </Button>
                  <span className="text-[10px] text-gray-600">o URL:</span>
                  <Input value={formPhotoUrl} onChange={e => setFormPhotoUrl(e.target.value)}
                    placeholder="https://..." className="h-8 text-xs flex-1 bg-gray-800 border-gray-700 text-gray-200 placeholder:text-gray-600" />
                </div>
                {formPhotoUrl && (
                  <div className="mt-2 w-24 h-24 rounded border border-gray-700 overflow-hidden">
                    <img src={formPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving || !formTitle || !formPhotoUrl}
                  className="gap-1 text-white text-xs h-8" style={{ backgroundColor: formSStep ? S_NEON_COLORS[formSStep] : '#A855F7' }}>
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Registrar Foto
                </Button>
              </div>
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: filterS ? S_NEON_COLORS[filterS] : '#A855F7' }} />
              </div>
            ) : photos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Camera className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay fotos registradas</p>
                <p className="text-xs mt-1">Registra la primera foto con el botón &quot;Registrar Foto&quot;</p>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID VIEW - Grouped by S-step */
              groupedByS.map(group => (
                <div key={group.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: S_NEON_COLORS[group.id] }}>{group.id}</div>
                    <h3 className="text-sm font-bold" style={{ color: S_NEON_COLORS[group.id] }}>
                      S{group.id} — {group.japaneseName}
                    </h3>
                    <Badge variant="outline" className="text-[10px] border-gray-700 text-gray-400">{group.items.length} fotos</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {group.items.map(photo => {
                      const typeInfo = getPhotoTypeInfo(photo.photoType)
                      return (
                        <div key={photo.id} className="overflow-hidden group relative rounded-lg border border-gray-800 bg-gray-900 hover:border-gray-700 transition-colors">
                          <div className="aspect-square bg-gray-800 relative cursor-pointer"
                            onClick={() => openPreview(photo, group.items)}>
                            {photo.photoUrl ? (
                              <img src={photo.photoUrl} alt={photo.title}
                                className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-gray-700" />
                              </div>
                            )}
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            {/* Neon glow border on hover */}
                            <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                              style={{ boxShadow: `inset 0 0 20px ${S_NEON_COLORS[group.id]}30` }} />
                          </div>
                          <div className="p-2">
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge className={`${typeInfo.color} text-[9px] border`}>{typeInfo.label}</Badge>
                              <button
                                onClick={() => handleDelete(photo.id)}
                                className="h-5 w-5 p-0 ml-auto text-gray-600 hover:text-red-400 transition-colors">
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </div>
                            <p className="text-xs font-medium mt-1 line-clamp-1 text-gray-200">{photo.title}</p>
                            {photo.description && (
                              <p className="text-[10px] text-gray-500 line-clamp-1">{photo.description}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            ) : (
              /* COMPARE VIEW - Before/After pairs */
              <div className="space-y-4">
                {beforeAfterPairs().length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <ArrowLeftRight className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No hay pares antes/después</p>
                    <p className="text-xs mt-1">Registra fotos de tipo &quot;Antes&quot; y &quot;Después&quot; para comparar</p>
                  </div>
                ) : (
                  beforeAfterPairs().map((pair, idx) => (
                    <div key={idx} className="border border-gray-800 rounded-xl overflow-hidden bg-gray-900">
                      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800"
                        style={{ backgroundColor: S_NEON_COLORS[pair.sStep] + '10' }}>
                        <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: S_NEON_COLORS[pair.sStep] }}>{pair.sStep}</div>
                        <span className="text-xs font-medium text-gray-300 line-clamp-1">{pair.antes.title}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-px bg-gray-800">
                        {/* ANTES */}
                        <div className="relative bg-gray-900 cursor-pointer" onClick={() => openPreview(pair.antes, [pair.antes, pair.despues].filter(Boolean) as PhotoItem[])}>
                          {pair.antes.photoUrl ? (
                            <img src={pair.antes.photoUrl} alt="Antes" className="w-full aspect-[4/3] object-cover" />
                          ) : (
                            <div className="w-full aspect-[4/3] flex items-center justify-center bg-gray-800">
                              <ImageIcon className="h-8 w-8 text-gray-700" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-red-500/80 text-white text-[9px] border-0 backdrop-blur-sm">ANTES</Badge>
                          </div>
                        </div>
                        {/* DESPUÉS */}
                        <div className="relative bg-gray-900 cursor-pointer" onClick={() => pair.despues && openPreview(pair.despues, [pair.antes, pair.despues].filter(Boolean) as PhotoItem[])}>
                          {pair.despues?.photoUrl ? (
                            <img src={pair.despues.photoUrl} alt="Después" className="w-full aspect-[4/3] object-cover" />
                          ) : (
                            <div className="w-full aspect-[4/3] flex items-center justify-center bg-gray-800 border-2 border-dashed border-gray-700">
                              <div className="text-center">
                                <ImageIcon className="h-8 w-8 text-gray-700 mx-auto mb-1" />
                                <p className="text-[10px] text-gray-600">Sin foto después</p>
                              </div>
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-emerald-500/80 text-white text-[9px] border-0 backdrop-blur-sm">DESPUÉS</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Photo preview overlay with navigation */}
        {currentPreview && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
            onClick={() => setPreviewIndex(null)}>
            {/* Navigation arrows */}
            {previewList.length > 1 && previewIndex! > 0 && (
              <button className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors text-white z-10"
                onClick={(e) => { e.stopPropagation(); navigatePreview(-1) }}>
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {previewList.length > 1 && previewIndex! < previewList.length - 1 && (
              <button className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors text-white z-10"
                onClick={(e) => { e.stopPropagation(); navigatePreview(1) }}>
                <ChevronRight className="h-5 w-5" />
              </button>
            )}

            <div className="max-w-[90vw] max-h-[85vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
              <img src={currentPreview.photoUrl} alt={currentPreview.title}
                className="max-w-full max-h-[75vh] object-contain rounded-lg" />
              <div className="mt-3 text-center">
                <p className="text-sm font-medium text-gray-200">{currentPreview.title}</p>
                <div className="flex items-center gap-2 justify-center mt-1">
                  <Badge className={`${getPhotoTypeInfo(currentPreview.photoType).color} text-[10px] border`}>
                    {getPhotoTypeInfo(currentPreview.photoType).label}
                  </Badge>
                  <span className="text-[10px] text-gray-500">
                    S{currentPreview.sStep} • {previewIndex! + 1}/{previewList.length}
                  </span>
                </div>
                {currentPreview.description && (
                  <p className="text-xs text-gray-500 mt-1">{currentPreview.description}</p>
                )}
              </div>
            </div>

            <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors text-white"
              onClick={() => setPreviewIndex(null)}>
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
