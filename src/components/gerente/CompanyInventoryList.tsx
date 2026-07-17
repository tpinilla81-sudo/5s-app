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
  Package, Filter, ArrowLeft, Euro, Edit2, Save, Loader2,
  Building2, AlertTriangle, CheckCircle2, XCircle, Search,
  TrendingDown, ShoppingCart, MapPin, User
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

interface InventoryItemData {
  id: string
  sStep: number
  name: string
  location: string | null
  category: string
  quantity: number
  action: string | null
  photoUrl: string | null
  price: number | null
  projectId: string
  createdAt: string
  updatedAt: string
  projectName: string
  projectZones: ZoneWithResponsable[]
}

interface Props {
  onBack?: () => void
}

export default function CompanyInventoryList({ onBack }: Props) {
  const { currentProject } = use5SStore()
  const company = currentProject?.company || ''

  const [items, setItems] = useState<InventoryItemData[]>([])
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Array<{ id: string; name: string; zones?: any[] }>>([])

  // Summary
  const [summary, setSummary] = useState({
    total: 0,
    byCategory: { innecesario: 0, dudoso: 0, util: 0 },
    dineroParado: 0,
    totalValue: 0,
    itemsWithValueCount: 0,
  })

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterProject, setFilterProject] = useState<string>('all')
  const [filterSStep, setFilterSStep] = useState<string>('all')
  const [searchText, setSearchText] = useState('')

  // Edit dialog
  const [editingItem, setEditingItem] = useState<InventoryItemData | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editAction, setEditAction] = useState('')
  const [saving, setSaving] = useState(false)

  // View mode
  const [viewMode, setViewMode] = useState<'all' | 'innecesario' | 'dinero'>('all')

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ company })
      if (filterCategory !== 'all') params.set('category', filterCategory)
      if (filterProject !== 'all') params.set('projectId', filterProject)
      if (filterSStep !== 'all') params.set('sStep', filterSStep)
      if (searchText) params.set('search', searchText)

      const res = await fetch(`/api/gerente/inventory?${params}`)
      const json = await res.json()
      if (json.success) {
        setItems(json.data.items)
        setProjects(json.data.projects || [])
        setSummary({
          total: json.data.total,
          byCategory: json.data.byCategory,
          dineroParado: json.data.dineroParado,
          totalValue: json.data.totalValue,
          itemsWithValueCount: json.data.itemsWithValueCount,
        })
      }
    } catch (error) {
      console.error('Error loading inventory:', error)
    } finally {
      setLoading(false)
    }
  }, [company, filterCategory, filterProject, filterSStep, searchText])

  useEffect(() => {
    if (company) loadInventory()
  }, [company, loadInventory])

  const handleEdit = (item: InventoryItemData) => {
    setEditingItem(item)
    setEditValue(item.price?.toString() || '')
    setEditCategory(item.category)
    setEditAction(item.action || '')
  }

  const handleSave = async () => {
    if (!editingItem) return
    try {
      setSaving(true)
      const res = await fetch('/api/gerente/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          price: editValue ? parseFloat(editValue) : null,
          category: editCategory,
          action: editAction || null,
        }),
      })
      if (res.ok) {
        setEditingItem(null)
        await loadInventory()
      }
    } catch (error) {
      console.error('Error saving inventory item:', error)
    } finally {
      setSaving(false)
    }
  }

  const getCategoryStyle = (category: string) => {
    const map: Record<string, string> = {
      innecesario: 'bg-red-100 text-red-700 border-red-200',
      dudoso: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      util: 'bg-green-100 text-green-700 border-green-200',
    }
    return map[category] || 'bg-gray-100 text-gray-700'
  }

  const getCategoryLabel = (category: string) => {
    const map: Record<string, string> = {
      innecesario: 'Innecesario',
      dudoso: 'Dudoso',
      util: 'Necesario',
    }
    return map[category] || category
  }

  const getCategoryIcon = (category: string) => {
    if (category === 'innecesario') return <XCircle className="h-3.5 w-3.5" />
    if (category === 'dudoso') return <AlertTriangle className="h-3.5 w-3.5" />
    return <CheckCircle2 className="h-3.5 w-3.5" />
  }

  const sStepName = (id: number) => S_STEPS.find(s => s.id === id)?.japaneseName || `S${id}`

  // Filter by view mode
  const displayedItems = items.filter(item => {
    if (viewMode === 'innecesario') return item.category === 'innecesario' || item.category === 'dudoso'
    if (viewMode === 'dinero') return (item.price || 0) > 0
    return true
  })

  const totalParadoDisplayed = displayedItems
    .filter(i => i.category === 'innecesario' || i.category === 'dudoso')
    .reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0)

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
              <Package className="h-5 w-5 text-amber-500" />
              Inventario Común de Empresa
            </h2>
            <p className="text-sm text-muted-foreground">
              {company} — {summary.total} item{summary.total !== 1 ? 's' : ''} en inventario
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="border-green-100 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-green-700">{summary.byCategory.util}</p>
            <p className="text-xs text-muted-foreground">Necesarios</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-100 bg-gradient-to-br from-yellow-50 to-white">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-yellow-700">{summary.byCategory.dudoso}</p>
            <p className="text-xs text-muted-foreground">Dudosos</p>
          </CardContent>
        </Card>
        <Card className="border-red-100 bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-3 text-center">
            <XCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-red-700">{summary.byCategory.innecesario}</p>
            <p className="text-xs text-muted-foreground">Innecesarios</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-3 text-center">
            <Euro className="h-5 w-5 text-red-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-red-800">
              {summary.dineroParado.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
            </p>
            <p className="text-xs text-muted-foreground">Dinero Parado</p>
          </CardContent>
        </Card>
        <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-3 text-center">
            <ShoppingCart className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-blue-700">
              {summary.totalValue.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
            </p>
            <p className="text-xs text-muted-foreground">Valor Total</p>
          </CardContent>
        </Card>
      </div>

      {/* View mode tabs */}
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('all')}
          className="text-xs"
        >
          Todos ({summary.total})
        </Button>
        <Button
          variant={viewMode === 'innecesario' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('innecesario')}
          className="text-xs"
        >
          Innecesarios + Dudosos ({summary.byCategory.innecesario + summary.byCategory.dudoso})
        </Button>
        <Button
          variant={viewMode === 'dinero' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('dinero')}
          className="text-xs"
        >
          Con Valor ({summary.itemsWithValueCount})
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar item..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="text-sm h-8 pl-8"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                <SelectItem value="innecesario">Innecesario</SelectItem>
                <SelectItem value="dudoso">Dudoso</SelectItem>
                <SelectItem value="util">Necesario</SelectItem>
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
          </div>
        </CardContent>
      </Card>

      {/* Info banner for "someone needs something" */}
      <Card className="border-green-100 bg-green-50/50">
        <CardContent className="p-3">
          <p className="text-sm text-green-800 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Consulta este inventario si necesitas algo. Los items innecesarios y dudosos pueden ser reubicados o compartidos entre zonas.
            {totalParadoDisplayed > 0 && (
              <span className="font-semibold ml-2">
                Dinero parado visible: {totalParadoDisplayed.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Items list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
        </div>
      ) : displayedItems.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No hay items que coincidan con los filtros</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {displayedItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card className={`hover:shadow-sm transition-shadow ${
                  item.category === 'innecesario' ? 'border-red-200 bg-red-50/20' :
                  item.category === 'dudoso' ? 'border-yellow-200 bg-yellow-50/20' : ''
                }`}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Top line */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            <Building2 className="h-3 w-3 mr-1" />
                            {item.projectName}
                          </Badge>
                          <Badge variant="outline" className="text-xs" style={{
                            borderColor: (S_STEPS.find(s => s.id === item.sStep)?.color || '#666') + '60',
                            color: S_STEPS.find(s => s.id === item.sStep)?.color || '#666',
                          }}>
                            S{item.sStep} - {sStepName(item.sStep)}
                          </Badge>
                          <Badge className={`text-xs border ${getCategoryStyle(item.category)}`}>
                            {getCategoryIcon(item.category)}
                            <span className="ml-1">{getCategoryLabel(item.category)}</span>
                          </Badge>
                          {item.quantity > 1 && (
                            <Badge variant="outline" className="text-xs">x{item.quantity}</Badge>
                          )}
                          {item.price && item.price > 0 && (
                            <Badge variant="outline" className="text-xs border-red-200 text-red-700 bg-red-50">
                              <Euro className="h-3 w-3 mr-0.5" />
                              {((item.price * item.quantity)).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €
                            </Badge>
                          )}
                        </div>

                        {/* Name and location */}
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        {item.location && (
                          <p className="text-xs text-muted-foreground">Ubicación: {item.location}</p>
                        )}
                        {item.action && (
                          <p className="text-xs text-amber-700 mt-0.5">Acción: {item.action}</p>
                        )}

                        {/* Zones with responsables */}
                        {item.projectZones.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {item.projectZones.map(z => (
                              <span
                                key={z.id}
                                className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border"
                                style={{ borderColor: z.color + '40', color: z.color }}
                              >
                                {z.name}
                                {z.responsable && (
                                  <span className="text-muted-foreground flex items-center gap-0.5">
                                    · <User className="h-2.5 w-2.5" /> {z.responsable.name}
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Edit button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleEdit(item)}
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
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-green-500" />
              Editar Item de Inventario
            </DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium">{editingItem.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {editingItem.projectName} — S{editingItem.sStep} {sStepName(editingItem.sStep)}
                  {editingItem.location && ` — ${editingItem.location}`}
                </p>
                <p className="text-xs text-muted-foreground">Cantidad: {editingItem.quantity}</p>
                {/* Zones info */}
                {editingItem.projectZones.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    {editingItem.projectZones.map(z => (
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
                    <Euro className="h-3.5 w-3.5" /> Valor Estimado (€)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="Valor estimado del item..."
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Para calcular el dinero parado en items innecesarios/dudosos
                  </p>
                </div>

                <div>
                  <Label className="text-sm">Categoría</Label>
                  <Select value={editCategory} onValueChange={setEditCategory}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="innecesario">Innecesario</SelectItem>
                      <SelectItem value="dudoso">Dudoso</SelectItem>
                      <SelectItem value="util">Necesario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm">Acción a tomar</Label>
                  <Select value={editAction} onValueChange={setEditAction}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar acción..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin acción</SelectItem>
                      <SelectItem value="Eliminar">Eliminar</SelectItem>
                      <SelectItem value="Reubicar">Reubicar</SelectItem>
                      <SelectItem value="Compartir">Compartir entre zonas</SelectItem>
                      <SelectItem value="Vender">Vender</SelectItem>
                      <SelectItem value="Donar">Donar</SelectItem>
                      <SelectItem value="Reciclar">Reciclar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Cancelar</Button>
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
