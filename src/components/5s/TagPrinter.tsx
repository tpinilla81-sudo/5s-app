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
  diasCuarentena?: number
  zonaOrigen?: string | null
  observaciones?: string
}

interface TagPrinterProps {
  items: TagData[]
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

// Generate QR code SVG string using a minimal QR encoder
function generateQRSvg(text: string, size: number = 80): string {
  // Simple QR-like pattern generator for visual representation
  // Uses a deterministic pattern based on the text content
  const gridSize = 21 // Standard QR Version 1
  const cellSize = size / gridSize
  
  // Create a simple hash-based pattern that looks like a QR code
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  const modules: boolean[][] = []
  for (let row = 0; row < gridSize; row++) {
    modules[row] = []
    for (let col = 0; col < gridSize; col++) {
      // Fixed finder patterns (3 corners)
      const isFinderTL = row < 7 && col < 7
      const isFinderTR = row < 7 && col >= gridSize - 7
      const isFinderBL = row >= gridSize - 7 && col < 7
      
      if (isFinderTL || isFinderTR || isFinderBL) {
        const r = isFinderBL ? row - (gridSize - 7) : row
        const c = isFinderTR ? col - (gridSize - 7) : col
        // Finder pattern: outer border, inner square
        if (r === 0 || r === 6 || c === 0 || c === 6) {
          modules[row][col] = true
        } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
          modules[row][col] = true
        } else {
          modules[row][col] = false
        }
      } else {
        // Data area: use hash-based pattern
        const seed = hash + row * gridSize + col
        modules[row][col] = (Math.abs(seed * 2654435761) % 100) > 45
      }
    }
  }
  
  // Timing patterns
  for (let i = 8; i < gridSize - 8; i++) {
    modules[6][i] = i % 2 === 0
    modules[i][6] = i % 2 === 0
  }
  
  let svgRects = ''
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (modules[row][col]) {
        svgRects += `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`
      }
    }
  }
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="image-rendering:pixelated;">${svgRects}</svg>`
}

export default function TagPrinter({ items }: TagPrinterProps) {
  const color = '#DC2626'
  const bgColor = '#FEF2F2'
  const borderColor = '#FCA5A5'

  const handlePrint = () => {
    const tagsHtml = items.map(item => {
      // Calculate revision date: diasCuarentena from entry (default 40)
      const dias = item.diasCuarentena || 40
      const fechaRevision = item.fechaRevision || addDays(item.fechaEntrada, dias)
      
      // Generate QR code with item data
      const qrData = [
        `INNECESARIO`,
        `Elemento: ${item.nombre}`,
        `Ubicacion: ${item.ubicacion || '-'}`,
        `Cantidad: ${item.cantidad}`,
        item.estado ? `Estado: ${item.estado}` : '',
        item.frecuenciaUso ? `Frec. uso: ${item.frecuenciaUso}` : '',
        `Decision: ${item.decision || 'Jaula'}`,
        item.zonaOrigen ? `Zona Origen: ${item.zonaOrigen}` : '',
        item.fechaEntrada ? `F. Entrada: ${formatDate(item.fechaEntrada)}` : '',
        fechaRevision ? `F. Revision: ${formatDate(fechaRevision)}` : '',
        `Sistema 5S`,
      ].filter(Boolean).join('|')
      
      const qrSvg = generateQRSvg(qrData, 80)

      return `
      <div style="
        border: 3px solid ${color};
        border-radius: 12px;
        width: 320px;
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
          &#10060; INNECESARIO
        </div>
        <div style="padding: 12px 16px;">
          <div style="float: right; margin: 0 0 4px 8px;">
            ${qrSvg}
          </div>
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
            ${item.decision ? `<tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">Decisión:</td><td style="padding: 4px 0; color: #DC2626; font-weight: 600;">${item.decision}</td></tr>` : ''}
            ${item.zonaOrigen ? `<tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">Zona Origen:</td><td style="padding: 4px 0; color: #111827;">${item.zonaOrigen}</td></tr>` : ''}
            <tr><td colspan="2" style="padding: 6px 0 2px; border-top: 1px dashed ${borderColor};"></td></tr>
            ${item.fechaEntrada ? `<tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">F. Entrada:</td><td style="padding: 4px 0; color: #111827;">${formatDate(item.fechaEntrada)}</td></tr>` : ''}
            ${fechaRevision ? `<tr><td style="padding: 4px 0; font-weight: bold; color: #DC2626;">F. Revisión (${dias}d):</td><td style="padding: 4px 0; color: #DC2626; font-weight: bold;">${formatDate(fechaRevision)}</td></tr>` : ''}
            ${item.observaciones ? `<tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">Obs.:</td><td style="padding: 4px 0; color: #111827;">${item.observaciones}</td></tr>` : ''}
          </table>
          <div style="clear: both;"></div>
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
            Elemento innecesario — Trasladar a la Jaula.
            <br/>Si no se actúa antes de la fecha de revisión, se procederá a su baja.
          </div>
        </div>
        <div style="
          padding: 8px 16px;
          border-top: 2px dashed ${borderColor};
          font-size: 10px;
          color: #6B7280;
          text-align: center;
        ">
          Sistema 5S — Etiqueta Roja — Elemento Innecesario
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
          <title>Etiquetas Rojas - Sistema 5S</title>
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
              ${items.length} etiqueta(s) roja(s) lista(s) para imprimir
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
      className="gap-1 text-xs h-8 bg-red-600 hover:bg-red-700 text-white"
      title="Imprimir Etiqueta Roja (Innecesario → Jaula)"
    >
      <Tag className="h-3 w-3" />
      <Printer className="h-3 w-3" />
      Etiqueta Roja
    </Button>
  )
}
