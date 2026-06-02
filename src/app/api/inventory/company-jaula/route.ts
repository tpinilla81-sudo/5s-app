import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/inventory/company-jaula
// Returns all jaula items (sStep=1, jaulaStatus!='') across all projects of a given company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const statusFilter = searchParams.get('status') // jaulaStatus filter
    const expirationStatus = searchParams.get('expiration') // 'expired', 'near_expiry', 'ok'

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'companyId es requerido' }, { status: 400 })
    }

    // Find all projects for this company
    const projects = await db.project.findMany({
      where: { companyId, active: true },
      select: { id: true, name: true, company: true },
    })

    const projectIds = projects.map(p => p.id)

    if (projectIds.length === 0) {
      return NextResponse.json({ success: true, data: [], summary: { total: 0, enJaula: 0, vencidos: 0, proximosVencer: 0, valorTotal: 0 } })
    }

    const where: any = {
      sStep: 1,
      projectId: { in: projectIds },
      jaulaStatus: { not: '' },
    }

    if (statusFilter) {
      where.jaulaStatus = statusFilter
    }

    const items = await db.inventoryItem.findMany({
      where,
      orderBy: { jaulaFechaEntrada: 'desc' },
      include: {
        project: { select: { id: true, name: true, company: true } },
        zone: { select: { id: true, name: true } },
      },
    })

    const now = new Date()

    const parsed = items.map(item => {
      const extra = item.extra ? JSON.parse(item.extra) : null
      const fechaLimite = item.jaulaFechaLimite
      const diasRestantes = fechaLimite
        ? Math.ceil((new Date(fechaLimite).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null

      let estadoTemporal: string = 'sin_fecha'
      if (fechaLimite) {
        if (diasRestantes !== null && diasRestantes < 0) estadoTemporal = 'vencido'
        else if (diasRestantes !== null && diasRestantes <= 15) estadoTemporal = 'proximo_vencer'
        else estadoTemporal = 'ok'
      }

      return {
        ...item,
        extra,
        diasRestantes,
        estadoTemporal,
        projectName: item.project?.name || '',
        zoneName: item.zone?.name || '',
      }
    })

    // Filter by expiration status if requested
    let filtered = parsed
    if (expirationStatus === 'expired') {
      filtered = parsed.filter(i => i.estadoTemporal === 'vencido')
    } else if (expirationStatus === 'near_expiry') {
      filtered = parsed.filter(i => i.estadoTemporal === 'proximo_vencer')
    } else if (expirationStatus === 'ok') {
      filtered = parsed.filter(i => i.estadoTemporal === 'ok')
    }

    // Summary
    const enJaula = parsed.filter(i => i.jaulaStatus === 'en_jaula').length
    const vencidos = parsed.filter(i => i.estadoTemporal === 'vencido').length
    const proximosVencer = parsed.filter(i => i.estadoTemporal === 'proximo_vencer').length
    const valorTotal = parsed.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0)

    return NextResponse.json({
      success: true,
      data: filtered,
      summary: {
        total: parsed.length,
        enJaula,
        vencidos,
        proximosVencer,
        valorTotal,
        projects: projects.length,
      },
    })
  } catch (error) {
    console.error('Error fetching company jaula items:', error)
    return NextResponse.json({ success: false, error: 'Error al obtener elementos de jaula' }, { status: 500 })
  }
}
