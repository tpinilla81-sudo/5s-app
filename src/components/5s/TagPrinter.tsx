'use client'

import { Button } from '@/components/ui/button'
import { Tag, Printer } from 'lucide-react'

interface TagData {
  nombre: string
  ubicacion: string
  cantidad: number
  estado?: string
  decision?: string
  fechaEntrada?: string | null
  fechaLimite?: string | null
  zonaOrigen?: string | null
  observaciones?: string
}

interface TagPrinterProps {
  items: TagData[]
  type: 'roja' | 'naranja'
}

export default function TagPrinter({ items, type }: TagPrinterProps) {
  const isRoja = type === 'roja'
  const label = isRoja ? 'ELIMINAR' : 'JAULA — REVISAR'
  const color = isRoja ? '#EF4444' : '#F97316'
  const bgColor = isRoja ? '#FEF2F2' : '#FFF7ED'
  const borderColor = isRoja ? '#FCA5A5' : '#FDBA74'

  const handlePrint = () => {
    const tagsHtml = items.map(item => `
      <div style="
        border: 3px solid ${color};
        border-radius: 12px;
        width: 280px;
        padding: 16px;
        margin: 8px;
        background: ${bgColor};
        page-break-inside: avoid;
        font-family: Arial, sans-serif;
      ">
        <div style="
          background: ${color};
          color: white;
          text-align: center;
          padding: 8px;
          border-radius: 8px;
          font-weight: bold;
          font-size: 16px;
          margin: -16px -16px 12px -16px;
          border-radius: 8px 8px 0 0;
        ">
          🏷️ ${label}
        </div>
        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
          <tr>
            <td style="padding: 3px 0; font-weight: bold; color: #374151; width: 40%;">Elemento:</td>
            <td style="padding: 3px 0; color: #111827;">${item.nombre}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; font-weight: bold; color: #374151;">Ubicación:</td>
            <td style="padding: 3px 0; color: #111827;">${item.ubicacion || '—'}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; font-weight: bold; color: #374151;">Cantidad:</td>
            <td style="padding: 3px 0; color: #111827;">${item.cantidad}</td>
          </tr>
          ${item.estado ? `<tr><td style="padding: 3px 0; font-weight: bold; color: #374151;">Estado:</td><td style="padding: 3px 0; color: #111827;">${item.estado}</td></tr>` : ''}
          ${item.zonaOrigen ? `<tr><td style="padding: 3px 0; font-weight: bold; color: #374151;">Zona Origen:</td><td style="padding: 3px 0; color: #111827;">${item.zonaOrigen}</td></tr>` : ''}
          ${item.fechaEntrada ? `<tr><td style="padding: 3px 0; font-weight: bold; color: #374151;">F. Entrada:</td><td style="padding: 3px 0; color: #111827;">${new Date(item.fechaEntrada).toLocaleDateString('es-ES')}</td></tr>` : ''}
          ${!isRoja && item.fechaLimite ? `<tr><td style="padding: 3px 0; font-weight: bold; color: #DC2626;">F. Límite:</td><td style="padding: 3px 0; color: #DC2626; font-weight: bold;">${new Date(item.fechaLimite).toLocaleDateString('es-ES')}</td></tr>` : ''}
          ${item.observaciones ? `<tr><td style="padding: 3px 0; font-weight: bold; color: #374151;">Obs.:</td><td style="padding: 3px 0; color: #111827;">${item.observaciones}</td></tr>` : ''}
        </table>
        <div style="
          margin-top: 10px;
          padding-top: 8px;
          border-top: 2px dashed ${borderColor};
          font-size: 10px;
          color: #6B7280;
          text-align: center;
        ">
          Sistema 5S — ${isRoja ? 'Etiqueta Roja (Eliminar)' : 'Etiqueta Naranja (Jaula)'}
          <br/>
          Fecha: ${new Date().toLocaleDateString('es-ES')}
        </div>
      </div>
    `).join('')

    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiquetas ${isRoja ? 'Rojas' : 'Naranjas'} - Sistema 5S</title>
          <style>
            body { margin: 0; padding: 16px; }
            .tags-container {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              justify-content: center;
            }
            @media print {
              body { margin: 0; padding: 8px; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align: center; margin-bottom: 16px; padding: 12px; background: ${bgColor}; border: 2px solid ${color}; border-radius: 8px;">
            <button onclick="window.print()" style="
              background: ${color};
              color: white;
              border: none;
              padding: 10px 24px;
              border-radius: 6px;
              font-size: 14px;
              font-weight: bold;
              cursor: pointer;
              margin-right: 8px;
            ">🖨️ Imprimir Etiquetas</button>
            <button onclick="window.close()" style="
              background: #6B7280;
              color: white;
              border: none;
              padding: 10px 24px;
              border-radius: 6px;
              font-size: 14px;
              cursor: pointer;
            ">Cerrar</button>
            <p style="margin: 8px 0 0; font-size: 12px; color: #6B7280;">
              ${items.length} etiqueta(s) ${isRoja ? 'roja(s)' : 'naranja(s)'} lista(s) para imprimir
            </p>
          </div>
          <div class="tags-container">
            ${tagsHtml}
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <Button
      size="sm"
      onClick={handlePrint}
      className={`gap-1 text-xs h-8 ${
        isRoja
          ? 'bg-red-600 hover:bg-red-700 text-white'
          : 'bg-orange-500 hover:bg-orange-600 text-white'
      }`}
      title={`Imprimir Etiqueta ${isRoja ? 'Roja' : 'Naranja'}`}
    >
      <Tag className="h-3 w-3" />
      <Printer className="h-3 w-3" />
      {isRoja ? 'Etiqueta Roja' : 'Etiqueta Naranja'}
    </Button>
  )
}
