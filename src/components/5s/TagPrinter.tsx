'use client'

import { Button } from '@/components/ui/button'
import { Tag, Printer } from 'lucide-react'

interface TagData {
  nombre: string
  ubicacion: string
  cantidad: number
  estado?: string
  frecuenciaUso?: string
  decision?: string
  categoria?: string
  fechaEntrada?: string | null
  fechaRevision?: string | null
  zonaOrigen?: string | null
  observaciones?: string
}

interface TagPrinterProps {
  items: TagData[]
  type: 'roja' | 'naranja'
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return '—'
  }
}

function addDays(dateStr: string | null | undefined, days: number): string | null {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + days)
    return d.toISOString()
  } catch {
    return null
  }
}

export default function TagPrinter({ items, type }: TagPrinterProps) {
  const isRoja = type === 'roja'
  const label = isRoja ? 'INNECESARIO' : 'REVISAR — JAULA'
  const color = isRoja ? '#DC2626' : '#EA580C'
  const bgColor = isRoja ? '#FEF2F2' : '#FFF7ED'
  const borderColor = isRoja ? '#FCA5A5' : '#FDBA74'
  const footerText = isRoja ? 'Etiqueta Roja — Elemento Innecesario (Eliminar)' : 'Etiqueta Naranja — Revisar en Jaula (Decidir en S2)'

  const handlePrint = () => {
    const tagsHtml = items.map(item => {
      // Calculate revision date: 40 days from entry
      const fechaRevision = item.fechaRevision || addDays(item.fechaEntrada, 40)

      return `
      <div style="
        border: 3px solid ${color};
        border-radius: 12px;
        width: 300px;
        padding: 0;
        margin: 8px;
        background: ${bgColor};
        page-break-inside: avoid;
        font-family: Arial, sans-serif;
        overflow: hidden;
      ">
        <div style="
          background: ${color};
          color: white;
          text-align: center;
          padding: 10px 16px;
          font-weight: bold;
          font-size: 16px;
          letter-spacing: 1px;
        ">
          ${isRoja ? '&#10060;' : '&#9888;&#65039;'} ${label}
        </div>
        <div style="padding: 12px 16px;">
          <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #374151; width: 45%;">Elemento:</td>
              <td style="padding: 4px 0; color: #111827; font-weight: 600;">${item.nombre}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #374151;">Ubicación:</td>
              <td style="padding: 4px 0; color: #111827;">${item.ubicacion || '—'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #374151;">Cantidad:</td>
              <td style="padding: 4px 0; color: #111827;">${item.cantidad}</td>
            </tr>
            ${item.categoria ? `<tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">Categoría:</td><td style="padding: 4px 0; color: #111827;">${item.categoria}</td></tr>` : ''}
            ${item.estado ? `<tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">Estado:</td><td style="padding: 4px 0; color: #111827;">${item.estado}</td></tr>` : ''}
            ${item.frecuenciaUso ? `<tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">Frec. uso:</td><td style="padding: 4px 0; color: #111827;">${item.frecuenciaUso}</td></tr>` : ''}
            ${item.decision ? `<tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">Decisión:</td><td style="padding: 4px 0; color: ${isRoja ? '#DC2626' : '#EA580C'}; font-weight: 600;">${item.decision}</td></tr>` : ''}
            ${item.zonaOrigen ? `<tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">Zona Origen:</td><td style="padding: 4px 0; color: #111827;">${item.zonaOrigen}</td></tr>` : ''}
            <tr><td colspan="2" style="padding: 6px 0 2px; border-top: 1px dashed ${borderColor};"></td></tr>
            ${item.fechaEntrada ? `<tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">F. Entrada:</td><td style="padding: 4px 0; color: #111827;">${formatDate(item.fechaEntrada)}</td></tr>` : ''}
            ${fechaRevision ? `<tr><td style="padding: 4px 0; font-weight: bold; color: #DC2626;">F. Revisión (40d):</td><td style="padding: 4px 0; color: #DC2626; font-weight: bold;">${formatDate(fechaRevision)}</td></tr>` : ''}
            ${item.observaciones ? `<tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">Obs.:</td><td style="padding: 4px 0; color: #111827;">${item.observaciones}</td></tr>` : ''}
          </table>
          ${!isRoja ? `
          <div style="
            margin-top: 8px;
            padding: 6px 8px;
            background: #FFF7ED;
            border: 1px solid #FDBA74;
            border-radius: 6px;
            font-size: 10px;
            color: #9A3412;
            text-align: center;
          ">
            Si nadie reclama este elemento antes de la fecha de revisión, se eliminará.
            <br/>Este elemento permanece en la zona para decidir en S2 (Necesarios).
          </div>
          ` : `
          <div style="
            margin-top: 8px;
            padding: 6px 8px;
            background: #FEF2F2;
            border: 1px solid #FCA5A5;
            border-radius: 6px;
            font-size: 10px;
            color: #991B1B;
            text-align: center;
          ">
            Elemento innecesario — Eliminar de la zona.
            <br/>Si no se elimina antes de la fecha de revisión, se procederá a su baja.
          </div>
          `}
        </div>
        <div style="
          padding: 8px 16px;
          border-top: 2px dashed ${borderColor};
          font-size: 10px;
          color: #6B7280;
          text-align: center;
        ">
          Sistema 5S — ${footerText}
          <br/>
          Impreso: ${new Date().toLocaleDateString('es-ES')}
        </div>
      </div>
    `}).join('')

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
            ">Imprimir Etiquetas</button>
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
      title={`Imprimir Etiqueta ${isRoja ? 'Roja (Innecesario)' : 'Naranja (Revisar Jaula)'}`}
    >
      <Tag className="h-3 w-3" />
      <Printer className="h-3 w-3" />
      {isRoja ? 'Etiqueta Roja' : 'Etiqueta Naranja'}
    </Button>
  )
}
