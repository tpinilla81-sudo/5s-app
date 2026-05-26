import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sStep = searchParams.get('sStep')
    const projectId = searchParams.get('projectId')
    const source = searchParams.get('source')
    const estado = searchParams.get('estado')
    const userId = searchParams.get('userId')
    const userRole = searchParams.get('userRole')
    const jaulaOnly = searchParams.get('jaulaOnly')

    // TASK 3: jaulaOnly query for global jaula view
    if (jaulaOnly === 'true') {
      const jaulaItems = await db.inventoryItem.findMany({
        where: {
          jaulaStatus: { not: '' },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          project: {
            select: { id: true, name: true, company: true },
          },
        },
      })
      const parsed = jaulaItems.map(item => ({
        ...item,
        extra: item.extra ? JSON.parse(item.extra) : null,
      }))
      return NextResponse.json({ success: true, data: parsed })
    }

    // TASK 4: Role-based filtering for action plans
    if (userRole && userId) {
      if (userRole === 'gerente') {
        // Gerente sees ALL action plans across all projects
        const where: any = {}
        if (sStep !== null) where.sStep = parseInt(sStep!)
        if (source) where.source = source
        if (estado) where.estado = estado

        const actions = await db.actionItem.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            zone: { select: { id: true, name: true } },
            project: { select: { id: true, name: true, company: true } },
          },
        })
        return NextResponse.json({ success: true, data: actions })
      }

      if (userRole === 'responsable') {
        // Responsable sees action plans from their own projects only
        const memberships = await db.projectMember.findMany({
          where: { userId, role: 'responsable' },
          select: { projectId: true },
        })
        const projectIds = memberships.map(m => m.projectId)
        const where: any = { projectId: { in: projectIds } }
        if (sStep !== null) where.sStep = parseInt(sStep!)
        if (source) where.source = source
        if (estado) where.estado = estado

        const actions = await db.actionItem.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            zone: { select: { id: true, name: true } },
            project: { select: { id: true, name: true, company: true } },
          },
        })
        return NextResponse.json({ success: true, data: actions })
      }

      if (userRole === 'empleado') {
        // Empleado sees action plans from their zones only
        const memberZones = await db.memberZone.findMany({
          where: {
            member: { userId },
          },
          select: { zoneId: true },
        })
        const zoneIds = memberZones.map(mz => mz.zoneId)
        const where: any = { zoneId: { in: zoneIds } }
        if (sStep !== null) where.sStep = parseInt(sStep!)
        if (source) where.source = source
        if (estado) where.estado = estado

        const actions = await db.actionItem.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            zone: { select: { id: true, name: true } },
            project: { select: { id: true, name: true, company: true } },
          },
        })
        return NextResponse.json({ success: true, data: actions })
      }
    }

    // Default: standard filtering
    const where: any = {}
    if (sStep !== null) where.sStep = parseInt(sStep)
    if (projectId) where.projectId = projectId
    if (source) where.source = source
    if (estado) where.estado = estado

    const actions = await db.actionItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        zone: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ success: true, data: actions })
  } catch (error) {
    console.error('Error fetching actions:', error)
    return NextResponse.json({ success: false, error: 'Error fetching actions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sStep,
      miniStep,
      itemId,
      itemDescription,
      hallazgo,
      mejora,
      responsable,
      prioridad,
      estado,
      fechaCompromiso,
      fechaLimite,
      fechaReal,
      source,
      auditor,
      projectId,
      zoneId,
      verificadoPor,
      // Plan de Acción table fields
      numeroEntrada,
      fechaEntrada,
      comunicadoPor,
      semana,
      seccionDemandante,
      clienteZona,
      personaDemandada,
      seccionDemandada,
      impactoObjetivo,
      enviado,
      accionCorrectiva,
      accionesPreventivas,
      semanaPrevista,
      porcentaje,
      semanaReal,
    } = body

    if (!hallazgo && !itemDescription) {
      return NextResponse.json({ success: false, error: 'Missing description' }, { status: 400 })
    }

    // Validate projectId
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required. No project selected.' }, { status: 400 })
    }

    // Verify project exists
    const projectExists = await db.project.findUnique({ where: { id: projectId } })
    if (!projectExists) {
      return NextResponse.json({ success: false, error: `Project with id '${projectId}' not found` }, { status: 400 })
    }

    // Auto-increment numeroEntrada per project if not provided
    let nextNumero = numeroEntrada;
    if (nextNumero === undefined || nextNumero === null) {
      const lastAction = await db.actionItem.findFirst({
        where: { projectId },
        orderBy: { numeroEntrada: 'desc' },
      });
      nextNumero = (lastAction?.numeroEntrada || 0) + 1;
    }

    const action = await db.actionItem.create({
      data: {
        sStep: sStep || 0,
        miniStep: miniStep || 3,
        itemId: itemId || `ACT-${Date.now()}`,
        itemDescription: itemDescription || '',
        hallazgo: hallazgo || itemDescription || '',
        mejora: mejora || null,
        responsable: responsable || null,
        prioridad: prioridad || 'media',
        estado: estado || 'abierta',
        fechaCompromiso: fechaCompromiso ? new Date(fechaCompromiso) : null,
        fechaLimite: fechaLimite ? new Date(fechaLimite) : null,
        fechaReal: fechaReal ? new Date(fechaReal) : null,
        source: source || 'actionplan',
        auditor: auditor || null,
        zoneId: zoneId || null,
        verificadoPor: verificadoPor || null,
        projectId: projectId || '',
        numeroEntrada: nextNumero,
        fechaEntrada: fechaEntrada ? new Date(fechaEntrada) : new Date(),
        comunicadoPor: comunicadoPor || null,
        semana: semana || null,
        seccionDemandante: seccionDemandante || null,
        clienteZona: clienteZona || null,
        personaDemandada: personaDemandada || null,
        seccionDemandada: seccionDemandada || null,
        impactoObjetivo: impactoObjetivo || null,
        enviado: enviado || null,
        accionCorrectiva: accionCorrectiva || null,
        accionesPreventivas: accionesPreventivas || null,
        semanaPrevista: semanaPrevista || null,
        porcentaje: porcentaje !== undefined ? porcentaje : 0,
        semanaReal: semanaReal || null,
      },
    })

    return NextResponse.json({ success: true, data: action })
  } catch (error) {
    console.error('Error creating action:', error)
    return NextResponse.json({ success: false, error: 'Error creating action' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing action ID' }, { status: 400 })
    }

    const body = await request.json()
    const updateData: any = {}

    if (body.estado !== undefined) updateData.estado = body.estado
    if (body.prioridad !== undefined) updateData.prioridad = body.prioridad
    if (body.responsable !== undefined) updateData.responsable = body.responsable
    if (body.mejora !== undefined) updateData.mejora = body.mejora
    if (body.notas !== undefined) updateData.notas = body.notas
    if (body.fechaCompromiso !== undefined) updateData.fechaCompromiso = body.fechaCompromiso ? new Date(body.fechaCompromiso) : null
    if (body.fechaLimite !== undefined) updateData.fechaLimite = body.fechaLimite ? new Date(body.fechaLimite) : null
    if (body.fechaReal !== undefined) updateData.fechaReal = body.fechaReal ? new Date(body.fechaReal) : null
    if (body.zoneId !== undefined) updateData.zoneId = body.zoneId || null
    if (body.verificadoPor !== undefined) updateData.verificadoPor = body.verificadoPor || null
    // Plan de Acción table fields
    if (body.numeroEntrada !== undefined) updateData.numeroEntrada = body.numeroEntrada
    if (body.fechaEntrada !== undefined) updateData.fechaEntrada = body.fechaEntrada ? new Date(body.fechaEntrada) : null
    if (body.comunicadoPor !== undefined) updateData.comunicadoPor = body.comunicadoPor
    if (body.semana !== undefined) updateData.semana = body.semana
    if (body.seccionDemandante !== undefined) updateData.seccionDemandante = body.seccionDemandante
    if (body.clienteZona !== undefined) updateData.clienteZona = body.clienteZona
    if (body.personaDemandada !== undefined) updateData.personaDemandada = body.personaDemandada
    if (body.seccionDemandada !== undefined) updateData.seccionDemandada = body.seccionDemandada
    if (body.impactoObjetivo !== undefined) updateData.impactoObjetivo = body.impactoObjetivo
    if (body.enviado !== undefined) updateData.enviado = body.enviado
    if (body.accionCorrectiva !== undefined) updateData.accionCorrectiva = body.accionCorrectiva
    if (body.accionesPreventivas !== undefined) updateData.accionesPreventivas = body.accionesPreventivas
    if (body.semanaPrevista !== undefined) updateData.semanaPrevista = body.semanaPrevista
    if (body.porcentaje !== undefined) updateData.porcentaje = body.porcentaje
    if (body.semanaReal !== undefined) updateData.semanaReal = body.semanaReal

    // If resolving, set resolution date
    if (body.estado === 'resuelta' || body.estado === 'cerrada') {
      updateData.fechaResolucion = new Date()
      updateData.fechaReal = updateData.fechaReal || new Date()
    }

    const action = await db.actionItem.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: action })
  } catch (error) {
    console.error('Error updating action:', error)
    return NextResponse.json({ success: false, error: 'Error updating action' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing action ID' }, { status: 400 })
    }

    await db.actionItem.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting action:', error)
    return NextResponse.json({ success: false, error: 'Error deleting action' }, { status: 500 })
  }
}
