'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Paintbrush, X, ZoomIn, Image as ImageIcon } from 'lucide-react'

// Company standard: CUADRO DE COLORES - SEÑALIZACIÓN EN SUELO Y COMPONENTES
interface ColorEntry {
  id: number
  description: string
  colorName: string
  ralCode: string
  hex: string
  sample: string // CSS for the color swatch - can be gradient or solid
  comments: string
  dimensions: string
  pattern?: 'solid' | 'yellow_black_stripes' | 'white_red_stripes' | 'red_green_stripes' | 'green_white_stripes'
}

const COLOR_ENTRIES: ColorEntry[] = [
  {
    id: 1,
    description: 'Entrada de material para montaje o recepción, zona de suministro de material por logística',
    colorName: 'Azul',
    ralCode: 'RAL 5017',
    hex: '#0E6BA8',
    sample: '#0E6BA8',
    comments: 'Solo marcar aquellos elementos que se mueven. Los anclados al suelo no marcar.',
    dimensions: '50 mm',
  },
  {
    id: 2,
    description: 'Salida de material premontado hacia otra zona de montaje',
    colorName: 'Verde',
    ralCode: 'RAL 6032',
    hex: '#2D8C3C',
    sample: '#2D8C3C',
    comments: '',
    dimensions: '50 mm',
  },
  {
    id: 3,
    description: 'Elementos estáticos (carros de herramientas, mesas de trabajo, utilajes fijos...)',
    colorName: 'Blanco de seguridad',
    ralCode: 'RAL 9003',
    hex: '#E8E8E8',
    sample: '#E8E8E8',
    comments: '',
    dimensions: '51 mm',
  },
  {
    id: 4,
    description: 'Área de trabajo',
    colorName: 'Amarillo',
    ralCode: 'RAL 1016',
    hex: '#F5E649',
    sample: '#F5E649',
    comments: '',
    dimensions: '50 mm',
  },
  {
    id: 5,
    description: 'Equipos e instalaciones protección contra incendios',
    colorName: 'Rojo',
    ralCode: 'RAL 3000',
    hex: '#CC0000',
    sample: '#CC0000',
    comments: 'Zona a cubrir cubriendo el espacio ocupado por el equipo en el suelo.',
    dimensions: '',
  },
  {
    id: 6,
    description: 'Elementos de seguridad (barandillas, barreras...)',
    colorName: 'Amarillo anaranjado',
    ralCode: 'RAL 1003',
    hex: '#F5A623',
    sample: '#F5A623',
    comments: 'Pasillos principales: RAL 6032 — Delimitación exterior: RAL 1016.',
    dimensions: 'Todo el interior (verde); 100 mm (amarillo)',
  },
  {
    id: 7,
    description: 'Pasillos y zonas de paso',
    colorName: 'Franjas amarillas y negras',
    ralCode: '—',
    hex: '#8B8B00',
    sample: 'repeating-linear-gradient(45deg, #F5E649 0px, #F5E649 6px, #222222 6px, #222222 12px)',
    comments: 'Acompañar del pictograma relacionado.',
    dimensions: '100 mm',
    pattern: 'yellow_black_stripes',
  },
  {
    id: 8,
    description: 'Áreas de riesgo permanente (máquinas en movimiento, riesgo de golpes, caída de objetos, puertas automáticas en movimiento, agujero, foso...)',
    colorName: 'Franjas blancas y rojas',
    ralCode: '—',
    hex: '#FF6666',
    sample: 'repeating-linear-gradient(45deg, #FFFFFF 0px, #FFFFFF 6px, #CC0000 6px, #CC0000 12px)',
    comments: 'Acompañar del pictograma relacionado.',
    dimensions: '50 mm',
    pattern: 'white_red_stripes',
  },
  {
    id: 9,
    description: 'Área con riesgo de explosión, trabajos en caliente prohibidos y verificación eléctrica con tensión',
    colorName: 'Franjas rojas y verdes',
    ralCode: '—',
    hex: '#CC4444',
    sample: 'repeating-linear-gradient(45deg, #CC0000 0px, #CC0000 6px, #2D8C3C 6px, #2D8C3C 12px)',
    comments: '',
    dimensions: '50 mm',
    pattern: 'red_green_stripes',
  },
  {
    id: 10,
    description: 'Área de trabajos en caliente',
    colorName: 'Franjas verdes y blancas',
    ralCode: '—',
    hex: '#66CC66',
    sample: 'repeating-linear-gradient(45deg, #2D8C3C 0px, #2D8C3C 6px, #FFFFFF 6px, #FFFFFF 12px)',
    comments: '',
    dimensions: '50 mm',
    pattern: 'green_white_stripes',
  },
  {
    id: 11,
    description: 'Medio Ambiente (área para gestión de residuos)',
    colorName: 'Gris',
    ralCode: 'RAL 7001',
    hex: '#8E9498',
    sample: '#8E9498',
    comments: 'En Buriel y Somozas se está pintando el suelo de este color.',
    dimensions: '',
  },
  {
    id: 12,
    description: 'Fondo del suelo',
    colorName: 'Naranja',
    ralCode: 'RAL 2004',
    hex: '#E85D04',
    sample: '#E85D04',
    comments: '',
    dimensions: '',
  },
]

interface ColorCodeTableProps {
  open: boolean
  onClose: () => void
}

export default function ColorCodeTable({ open, onClose }: ColorCodeTableProps) {
  const [showOriginal, setShowOriginal] = useState(false)
  const [zoomedEntry, setZoomedEntry] = useState<ColorEntry | null>(null)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setZoomedEntry(null) } }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Paintbrush className="h-5 w-5 text-yellow-600" />
            Cuadro de Colores — Señalización en Suelo y Componentes
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Estándar de código de colores para marcado de suelo y componentes en nave y exterior. Líneas de suelo según normativa RAL.
          </p>
        </DialogHeader>

        {/* Toolbar */}
        <div className="px-6 py-2 border-b bg-gray-50/50 flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setShowOriginal(!showOriginal)}
            className="gap-1 text-xs h-7">
            <ImageIcon className="h-3 w-3" />
            {showOriginal ? 'Ver Tabla' : 'Ver Imagen Original'}
          </Button>
          <div className="flex-1" />
          <span className="text-[10px] text-muted-foreground">
            Fecha elaboración: 01/09/17 · Última modificación: 08/04/19
          </span>
        </div>

        {showOriginal ? (
          /* Original image viewer */
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-100">
            <img
              src="/standards/cuadro_colores_suelo.png"
              alt="Cuadro de Colores - Señalización en Suelo y Componentes"
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            />
          </div>
        ) : (
          /* Professional table view */
          <div className="flex-1 overflow-auto px-4 py-3">
            {/* Table header */}
            <div className="bg-green-700 text-white rounded-t-lg grid gap-0 text-[10px] font-bold"
              style={{ gridTemplateColumns: '30px 1fr 80px 60px 50px 1fr 80px' }}>
              <div className="px-2 py-2 text-center border-r border-green-600">#</div>
              <div className="px-2 py-2 border-r border-green-600">DESCRIPCIÓN</div>
              <div className="px-2 py-2 border-r border-green-600">COLOR Y DETALLES</div>
              <div className="px-2 py-2 border-r border-green-600 text-center">CÓDIGO</div>
              <div className="px-2 py-2 border-r border-green-600 text-center">MUESTRA</div>
              <div className="px-2 py-2 border-r border-green-600">COMENTARIOS</div>
              <div className="px-2 py-2 text-center">DIMENSIONES</div>
            </div>

            {/* Section header */}
            <div className="bg-gray-200 text-gray-700 px-2 py-1.5 text-[10px] font-bold border-b border-gray-300">
              LÍNEAS DE SUELO EN NAVE Y EN EXTERIOR
            </div>

            {/* Table rows */}
            {COLOR_ENTRIES.map((entry, idx) => (
              <div
                key={entry.id}
                className={`grid gap-0 text-[10px] border-b border-gray-200 hover:bg-blue-50/50 transition-colors cursor-pointer ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                }`}
                style={{ gridTemplateColumns: '30px 1fr 80px 60px 50px 1fr 80px' }}
                onClick={() => setZoomedEntry(entry)}
              >
                <div className="px-2 py-2 text-center font-bold text-gray-500 border-r border-gray-100">{entry.id}</div>
                <div className="px-2 py-2 border-r border-gray-100 leading-tight">{entry.description}</div>
                <div className="px-2 py-2 border-r border-gray-100 font-medium">{entry.colorName}</div>
                <div className="px-2 py-2 text-center border-r border-gray-100 font-mono text-[9px]">{entry.ralCode}</div>
                <div className="px-2 py-2 border-r border-gray-100 flex items-center justify-center">
                  <div
                    className="w-8 h-8 rounded border border-gray-300 shadow-sm"
                    style={{
                      background: entry.sample,
                      backgroundSize: entry.pattern ? '12px 12px' : undefined,
                    }}
                  />
                </div>
                <div className="px-2 py-2 border-r border-gray-100 text-gray-600 leading-tight">{entry.comments}</div>
                <div className="px-2 py-2 text-center font-mono">{entry.dimensions}</div>
              </div>
            ))}

            {/* Footer note */}
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-[10px] text-amber-800 font-medium">
                Nota: Las franjas inclinadas (amarillo/negro, blanco/rojo, rojo/verde, verde/blanco) deben aplicarse en diagonal a 45 grados. 
                Siempre acompañar del pictograma relacionado cuando se indique. Solo marcar aquellos elementos que se mueven; los anclados al suelo no se marcan.
              </p>
            </div>
          </div>
        )}

        {/* Zoomed entry detail */}
        {zoomedEntry && (
          <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={() => setZoomedEntry(null)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-bold text-gray-900">Detalle del Color #{zoomedEntry.id}</h3>
                <Button variant="ghost" size="sm" onClick={() => setZoomedEntry(null)} className="h-6 w-6 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <div
                  className="w-24 h-24 rounded-lg border-2 border-gray-200 shadow-lg"
                  style={{
                    background: zoomedEntry.sample,
                    backgroundSize: zoomedEntry.pattern ? '16px 16px' : undefined,
                  }}
                />
                <div className="flex-1 space-y-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Color</span>
                    <p className="text-sm font-bold">{zoomedEntry.colorName}</p>
                  </div>
                  {zoomedEntry.ralCode !== '—' && (
                    <div>
                      <span className="text-[10px] text-muted-foreground">Código RAL</span>
                      <p className="text-sm font-mono font-bold">{zoomedEntry.ralCode}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-muted-foreground">HEX</span>
                    <p className="text-xs font-mono">{zoomedEntry.hex}</p>
                  </div>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">Descripción</span>
                <p className="text-xs leading-relaxed">{zoomedEntry.description}</p>
              </div>
              {zoomedEntry.comments && (
                <div className="bg-blue-50 p-2 rounded-lg">
                  <span className="text-[10px] text-blue-600 font-semibold">Comentarios</span>
                  <p className="text-xs text-blue-800 mt-0.5">{zoomedEntry.comments}</p>
                </div>
              )}
              {zoomedEntry.dimensions && (
                <div>
                  <span className="text-[10px] text-muted-foreground">Dimensiones</span>
                  <p className="text-xs font-mono">{zoomedEntry.dimensions}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
