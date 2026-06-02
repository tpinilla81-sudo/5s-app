'use client'

import { Button } from '@/components/ui/button'
import { Tag, Printer } from 'lucide-react'
import QRCode from 'qrcode'

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

async function generateQRDataURL(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 80,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
    })
  } catch {
    return ''
  }
}

export default function TagPrinter({ items }: TagPrinterProps) {
  const color = '#DC2626'
  const bgColor = '#FEF2F2'
  const borderColor = '#FCA5A5'

  const handlePrint = async () => {
    // Pre-generate QR codes for all items
    const qrPromises = items.map(async (item) => {
      const qrData = [
        `INNECESARIO`,
        `Elemento: ${item.nombre}`,
        `Ubicación: ${item.ubicacion || '—'}`,
        `Cantidad: ${item.cantidad}`,
        item.estado ? `Estado: ${item.estado}` : '',
        item.frecuenciaUso ? `Frec. uso: ${item.frecuenciaUso}` : '',
        `Decisión: ${item.decision || 'Jaula'}`,
        item.zonaOrigen ? `Zona Origen: ${item.zonaOrigen}` : '',
        item.fechaEntrada ? `F. Entrada: ${formatDate(item.fechaEntrada)}` : '',
        item.fechaRevision ? `F. Revisión: ${formatDate(item.fechaRevision)}` : '',
        `Sistema 5S — Etiqueta Roja`,
      ].filter(Boolean).join('\n')

      const qrUrl = await generateQRDataURL(qrData)
      return qrUrl
    })
    const qrCodes = await Promise.all(qrPromises)

    const tagsHtml = items.map((item, idx) => {
      // Calculate revision date: diasCuarentena from entry (default 40)
      const dias = item.diasCuarentena || 40
      const fechaRevision = item.fechaRevision || addDays(item.fechaEntrada, dias)
      const qrImg = qrCodes[idx] ? `<img src="${qrCodes[idx]}" style="width:80px; height:80px; float:right; margin: 0 0 4px 8px;" alt="QR" />` : ''

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
          ${qrImg}
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
