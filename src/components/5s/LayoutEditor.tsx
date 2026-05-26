'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { use5SStore } from '@/lib/store'
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
  Square, Circle, Minus, Type, MousePointer, Trash2, Download,
  Upload, Save, X, Undo2, RotateCcw, Image as ImageIcon, Palette
} from 'lucide-react'

// We need dynamic import for Konva since it needs window
let Stage: any, Layer: any, Rect: any, KCircle: any, Line: any, Text: any, KImage: any, Group: any, Arrow: any

// 5S Floor marking color codes
const FLOOR_COLORS = [
  { color: '#22C55E', label: 'Verde — Zona segura / OK', category: 'seguridad_ok' },
  { color: '#EF4444', label: 'Rojo — Peligro / Prohibido / Innecesario', category: 'peligro' },
  { color: '#F59E0B', label: 'Amarillo — Precaución / Pasillo', category: 'precaucion' },
  { color: '#3B82F6', label: 'Azul — Información / Obligatorio', category: 'informacion' },
  { color: '#8B5CF6', label: 'Morado — EPI obligatorio', category: 'epi' },
  { color: '#F97316', label: 'Naranja — Advertencia máquina', category: 'advertencia' },
  { color: '#FFFFFF', label: 'Blanco — Línea general', category: 'general' },
  { color: '#6B7280', label: 'Gris — Almacén / Stock', category: 'almacen' },
  { color: '#000000', label: 'Negro — Contorno / Pared', category: 'pared' },
]

const DRAW_TOOLS = [
  { id: 'select', label: 'Seleccionar', icon: MousePointer },
  { id: 'rect', label: 'Rectángulo / Zona', icon: Square },
  { id: 'circle', label: 'Círculo / Equipo', icon: Circle },
  { id: 'line', label: 'Línea / Pasillo', icon: Minus },
  { id: 'arrow', label: 'Flecha / Flujo', icon: RotateCcw },
  { id: 'text', label: 'Texto / Etiqueta', icon: Type },
]

interface ShapeData {
  id: string
  type: 'rect' | 'circle' | 'line' | 'arrow' | 'text'
  x: number
  y: number
  width?: number
  height?: number
  radius?: number
  points?: number[]
  fill?: string
  stroke?: string
  strokeWidth?: number
  text?: string
  fontSize?: number
  dash?: number[]
  opacity?: number
}

interface LayoutEditorProps {
  open: boolean
  onClose: () => void
  onSave?: (imageDataUrl: string, shapes: ShapeData[]) => void
  initialImage?: string | null
  initialShapes?: ShapeData[]
}

export default function LayoutEditor({ open, onClose, onSave, initialImage, initialShapes }: LayoutEditorProps) {
  const { currentProject, currentZone } = use5SStore()
  const [konvaReady, setKonvaReady] = useState(false)
  const [tool, setTool] = useState<string>('select')
  const [color, setColor] = useState('#F59E0B')
  const [shapes, setShapes] = useState<ShapeData[]>(initialShapes || [])
  const [bgImage, setBgImage] = useState<string | null>(initialImage || null)
  const [bgImageObj, setBgImageObj] = useState<HTMLImageElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [textInput, setTextInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })
  const [saveName, setSaveName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const stageRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Dynamic import of Konva (needs window)
  useEffect(() => {
    if (typeof window !== 'undefined' && !konvaReady) {
      import('react-konva').then((mod) => {
        Stage = mod.Stage
        Layer = mod.Layer
        Rect = mod.Rect
        KCircle = mod.Circle
        Line = mod.Line
        Text = mod.Text
        KImage = mod.Image
        Group = mod.Group
        Arrow = mod.Arrow
        setKonvaReady(true)
      }).catch(err => {
        console.error('Failed to load Konva:', err)
      })
    }
  }, [konvaReady])

  // Load background image
  useEffect(() => {
    if (bgImage) {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => setBgImageObj(img)
      img.src = bgImage
    } else {
      setBgImageObj(null)
    }
  }, [bgImage])

  // Responsive stage size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setStageSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) })
      }
    }
    if (open) {
      updateSize()
      window.addEventListener('resize', updateSize)
      return () => window.removeEventListener('resize', updateSize)
    }
  }, [open])

  const generateId = () => `shape_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

  const handleStageMouseDown = useCallback((e: any) => {
    if (tool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage()
      if (clickedOnEmpty) setSelectedId(null)
      return
    }

    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    if (!pos) return

    if (tool === 'text') {
      setTextPosition({ x: pos.x, y: pos.y })
      setShowTextInput(true)
      setTextInput('')
      return
    }

    setIsDrawing(true)
    setDrawStart({ x: pos.x, y: pos.y })

    if (tool === 'rect') {
      const newShape: ShapeData = {
        id: generateId(),
        type: 'rect',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        fill: color + '40',
        stroke: color,
        strokeWidth: 2,
      }
      setShapes(prev => [...prev, newShape])
      setSelectedId(newShape.id)
    } else if (tool === 'circle') {
      const newShape: ShapeData = {
        id: generateId(),
        type: 'circle',
        x: pos.x,
        y: pos.y,
        radius: 0,
        fill: color + '60',
        stroke: color,
        strokeWidth: 2,
      }
      setShapes(prev => [...prev, newShape])
      setSelectedId(newShape.id)
    } else if (tool === 'line') {
      const newShape: ShapeData = {
        id: generateId(),
        type: 'line',
        x: 0,
        y: 0,
        points: [pos.x, pos.y, pos.x, pos.y],
        stroke: color,
        strokeWidth: 4,
      }
      setShapes(prev => [...prev, newShape])
      setSelectedId(newShape.id)
    } else if (tool === 'arrow') {
      const newShape: ShapeData = {
        id: generateId(),
        type: 'arrow',
        x: 0,
        y: 0,
        points: [pos.x, pos.y, pos.x, pos.y],
        stroke: color,
        strokeWidth: 3,
        fill: color,
      }
      setShapes(prev => [...prev, newShape])
      setSelectedId(newShape.id)
    }
  }, [tool, color])

  const handleStageMouseMove = useCallback((e: any) => {
    if (!isDrawing || !drawStart) return
    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    if (!pos) return

    setShapes(prev => {
      const updated = [...prev]
      const last = updated[updated.length - 1]
      if (!last) return prev

      if (last.type === 'rect') {
        updated[updated.length - 1] = {
          ...last,
          width: pos.x - drawStart.x,
          height: pos.y - drawStart.y,
        }
      } else if (last.type === 'circle') {
        const dx = pos.x - drawStart.x
        const dy = pos.y - drawStart.y
        updated[updated.length - 1] = {
          ...last,
          radius: Math.sqrt(dx * dx + dy * dy),
        }
      } else if (last.type === 'line' || last.type === 'arrow') {
        const pts = [...last.points!]
        pts[2] = pos.x
        pts[3] = pos.y
        updated[updated.length - 1] = { ...last, points: pts }
      }
      return updated
    })
  }, [isDrawing, drawStart])

  const handleStageMouseUp = useCallback(() => {
    setIsDrawing(false)
    setDrawStart(null)
  }, [])

  const handleTextSubmit = () => {
    if (textInput && textPosition) {
      const newShape: ShapeData = {
        id: generateId(),
        type: 'text',
        x: textPosition.x,
        y: textPosition.y,
        text: textInput,
        fill: color,
        fontSize: 16,
      }
      setShapes(prev => [...prev, newShape])
      setSelectedId(newShape.id)
    }
    setShowTextInput(false)
    setTextPosition(null)
    setTextInput('')
  }

  const handleDelete = () => {
    if (selectedId) {
      setShapes(prev => prev.filter(s => s.id !== selectedId))
      setSelectedId(null)
    }
  }

  const handleUndo = () => {
    setShapes(prev => prev.slice(0, -1))
    setSelectedId(null)
  }

  const handleClear = () => {
    if (confirm('¿Borrar todo el dibujo?')) {
      setShapes([])
      setSelectedId(null)
    }
  }

  const handleExportImage = () => {
    if (stageRef.current) {
      const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 })
      const link = document.createElement('a')
      link.download = `layout_${currentZone?.name || 'zona'}_${new Date().toISOString().slice(0, 10)}.png`
      link.href = dataUrl
      link.click()
    }
  }

  const handleSaveToLibrary = async () => {
    if (!currentProject || !saveName) return
    setIsSaving(true)
    try {
      const dataUrl = stageRef.current?.toDataURL({ pixelRatio: 2 })
      const shapesJson = JSON.stringify(shapes)

      await fetch('/api/standards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sStep: 2, // Layout is primarily S2
          title: saveName,
          description: 'Layout dibujado con editor',
          category: 'layout',
          content: shapesJson,
          photoUrl: dataUrl,
          status: 'activo',
          version: 1,
          projectId: currentProject.id,
          zoneId: currentZone?.id || null,
        }),
      })

      if (onSave) onSave(dataUrl, shapes)
      alert('Layout guardado en la Biblioteca de Estándares')
      setSaveName('')
    } catch (e) {
      console.error('Error saving layout:', e)
      alert('Error al guardar el layout')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUploadBg = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('projectId', currentProject?.id || '')
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.url) setBgImage(json.url)
    } catch (e) {
      console.error('Upload error:', e)
    }
  }

  // Shape render helper
  const renderShape = (shape: ShapeData) => {
    const isSelected = shape.id === selectedId
    const commonProps = {
      onClick: () => { if (tool === 'select') setSelectedId(shape.id) },
      onTap: () => { if (tool === 'select') setSelectedId(shape.id) },
      draggable: tool === 'select',
    }

    switch (shape.type) {
      case 'rect':
        return (
          <Rect
            key={shape.id}
            {...commonProps}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            fill={shape.fill}
            stroke={isSelected ? '#00FF00' : shape.stroke}
            strokeWidth={isSelected ? 3 : shape.strokeWidth}
            onDragEnd={(e: any) => {
              setShapes(prev => prev.map(s =>
                s.id === shape.id ? { ...s, x: e.target.x(), y: e.target.y() } : s
              ))
            }}
          />
        )
      case 'circle':
        return (
          <KCircle
            key={shape.id}
            {...commonProps}
            x={shape.x}
            y={shape.y}
            radius={shape.radius}
            fill={shape.fill}
            stroke={isSelected ? '#00FF00' : shape.stroke}
            strokeWidth={isSelected ? 3 : shape.strokeWidth}
            onDragEnd={(e: any) => {
              setShapes(prev => prev.map(s =>
                s.id === shape.id ? { ...s, x: e.target.x(), y: e.target.y() } : s
              ))
            }}
          />
        )
      case 'line':
        return (
          <Line
            key={shape.id}
            {...commonProps}
            points={shape.points}
            stroke={isSelected ? '#00FF00' : shape.stroke}
            strokeWidth={isSelected ? shape.strokeWidth! + 2 : shape.strokeWidth}
            lineCap="round"
            lineJoin="round"
          />
        )
      case 'arrow':
        return (
          <Arrow
            key={shape.id}
            {...commonProps}
            points={shape.points}
            fill={shape.fill}
            stroke={isSelected ? '#00FF00' : shape.stroke}
            strokeWidth={isSelected ? shape.strokeWidth! + 2 : shape.strokeWidth}
            pointerLength={10}
            pointerWidth={10}
          />
        )
      case 'text':
        return (
          <Text
            key={shape.id}
            {...commonProps}
            x={shape.x}
            y={shape.y}
            text={shape.text}
            fontSize={shape.fontSize}
            fill={shape.fill}
            stroke={isSelected ? '#00FF00' : undefined}
            strokeWidth={isSelected ? 1 : 0}
            onDragEnd={(e: any) => {
              setShapes(prev => prev.map(s =>
                s.id === shape.id ? { ...s, x: e.target.x(), y: e.target.y() } : s
              ))
            }}
          />
        )
      default:
        return null
    }
  }

  if (!konvaReady) {
    return (
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Cargando editor...</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Square className="h-5 w-5 text-teal-600" />
            Editor de Layout
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dibuja el layout de la zona: pasillos, zonas de trabajo, ubicación de equipos, código de colores de marcado de suelo...
          </p>
        </DialogHeader>

        {/* Toolbar */}
        <div className="px-4 py-2 border-b bg-gray-50/80 flex items-center gap-2 flex-wrap shrink-0">
          {/* Drawing tools */}
          <div className="flex items-center gap-1 border-r pr-2 mr-1">
            {DRAW_TOOLS.map(t => (
              <Button key={t.id} variant={tool === t.id ? 'default' : 'ghost'} size="sm"
                onClick={() => setTool(t.id)}
                className={`h-7 w-7 p-0 text-xs ${tool === t.id ? 'bg-teal-600 text-white' : ''}`}
                title={t.label}>
                <t.icon className="h-3.5 w-3.5" />
              </Button>
            ))}
          </div>

          {/* Color */}
          <div className="relative">
            <Button variant="ghost" size="sm" onClick={() => setShowColorPicker(!showColorPicker)}
              className="h-7 gap-1.5 text-xs">
              <div className="w-4 h-4 rounded border" style={{ backgroundColor: color }} />
              <Palette className="h-3 w-3" />
            </Button>
            {showColorPicker && (
              <div className="absolute top-full left-0 z-50 mt-1 bg-white border rounded-lg shadow-xl p-2 w-64">
                <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">Código de Colores 5S — Marcado de Suelo</p>
                {FLOOR_COLORS.map(fc => (
                  <button key={fc.color} onClick={() => { setColor(fc.color); setShowColorPicker(false) }}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-gray-100 text-left">
                    <div className="w-4 h-4 rounded border shrink-0" style={{ backgroundColor: fc.color }} />
                    <span className="text-[10px]">{fc.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stroke width for lines */}
          {(tool === 'line' || tool === 'arrow') && (
            <Select value={String(shapes[shapes.length - 1]?.strokeWidth || 4)} onValueChange={v => {
              // Just visual feedback, new shapes will use this
            }}>
              <SelectTrigger className="w-20 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2">Fino</SelectItem>
                <SelectItem value="4">Medio</SelectItem>
                <SelectItem value="8">Grueso</SelectItem>
                <SelectItem value="12">Muy grueso</SelectItem>
              </SelectContent>
            </Select>
          )}

          <div className="flex-1" />

          {/* Actions */}
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}
            className="h-7 gap-1 text-xs" title="Subir plano de fondo">
            <Upload className="h-3 w-3" /> Fondo
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadBg(f) }} />
          <Button variant="ghost" size="sm" onClick={handleUndo}
            className="h-7 gap-1 text-xs" title="Deshacer">
            <Undo2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete}
            className="h-7 gap-1 text-xs text-red-500" title="Eliminar seleccionado">
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear}
            className="h-7 gap-1 text-xs text-red-500" title="Borrar todo">
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportImage}
            className="h-7 gap-1 text-xs" title="Descargar como PNG">
            <Download className="h-3 w-3" /> PNG
          </Button>
        </div>

        {/* Canvas area */}
        <div ref={containerRef} className="flex-1 min-h-0 bg-gray-100 relative"
          style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}>
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
            onTouchStart={handleStageMouseDown}
            onTouchMove={handleStageMouseMove}
            onTouchEnd={handleStageMouseUp}
          >
            <Layer>
              {/* Background image */}
              {bgImageObj && (
                <KImage image={bgImageObj}
                  x={0} y={0}
                  width={stageSize.width}
                  height={stageSize.height}
                  opacity={0.4}
                />
              )}
              {/* Grid pattern */}
              {/* Shapes */}
              {shapes.map(renderShape)}
            </Layer>
          </Stage>

          {/* Text input overlay */}
          {showTextInput && textPosition && (
            <div className="absolute bg-white border rounded shadow-lg p-2 z-50"
              style={{ left: textPosition.x, top: textPosition.y }}>
              <Input autoFocus value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleTextSubmit() }}
                placeholder="Escribe texto..."
                className="h-7 text-xs w-48" />
              <div className="flex gap-1 mt-1">
                <Button size="sm" onClick={handleTextSubmit}
                  className="h-6 text-[10px] bg-teal-600 text-white">OK</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowTextInput(false)}
                  className="h-6 text-[10px]">Cancelar</Button>
              </div>
            </div>
          )}
        </div>

        {/* Save bar */}
        <div className="px-4 py-2 border-t bg-white flex items-center gap-3 shrink-0">
          <Input value={saveName} onChange={e => setSaveName(e.target.value)}
            placeholder="Nombre del layout (ej: Layout Zona Montaje)"
            className="h-8 text-xs flex-1 max-w-xs" />
          <Button onClick={handleSaveToLibrary} disabled={isSaving || !saveName}
            className="gap-1 bg-teal-600 hover:bg-teal-700 text-white text-xs h-8">
            <Save className="h-3 w-3" />
            {isSaving ? 'Guardando...' : 'Guardar en Biblioteca de Estándares'}
          </Button>
          <div className="flex-1" />
          <Badge variant="outline" className="text-[10px]">
            {shapes.length} elementos
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  )
}
