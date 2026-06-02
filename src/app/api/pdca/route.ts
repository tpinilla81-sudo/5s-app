import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - List PDCA items
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const zoneId = searchParams.get('zoneId');
    const phase = searchParams.get('phase');
    const sStep = searchParams.get('sStep');

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
    }

    const where: any = { projectId };
    if (zoneId) where.zoneId = zoneId;
    if (phase) where.phase = phase;
    if (sStep) where.sStep = Number(sStep);

    const items = await prisma.pDCAItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    console.error('PDCA GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create PDCA item
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, phase, sStep, responsable, prioridad, estado, fechaInicio, fechaLimite, projectId, zoneId } = body;

    if (!title || !projectId || !phase) {
      return NextResponse.json({ success: false, error: 'title, projectId, and phase are required' }, { status: 400 });
    }

    const item = await prisma.pDCAItem.create({
      data: {
        title,
        description: description || null,
        phase,
        sStep: sStep || 1,
        responsable: responsable || null,
        prioridad: prioridad || 'media',
        estado: estado || 'pendiente',
        fechaInicio: fechaInicio || new Date().toISOString(),
        fechaLimite: fechaLimite || null,
        resultado: null,
        projectId,
        zoneId: zoneId || null,
      },
    });

    return NextResponse.json({ success: true, data: item });
  } catch (error: any) {
    console.error('PDCA POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update PDCA item
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const item = await prisma.pDCAItem.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ success: true, data: item });
  } catch (error: any) {
    console.error('PDCA PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete PDCA item
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    await prisma.pDCAItem.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PDCA DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
