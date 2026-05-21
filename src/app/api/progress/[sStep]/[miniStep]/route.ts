import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET specific mini-step progress
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sStep: string; miniStep: string }> }
) {
  try {
    const { sStep, miniStep } = await params;
    const sStepNum = parseInt(sStep);
    const miniStepNum = parseInt(miniStep);

    if (isNaN(sStepNum) || isNaN(miniStepNum)) {
      return NextResponse.json(
        { success: false, error: 'Parámetros inválidos' },
        { status: 400 }
      );
    }

    const progress = await db.progress.findUnique({
      where: { sStep_miniStep: { sStep: sStepNum, miniStep: miniStepNum } },
    });

    if (!progress) {
      return NextResponse.json(
        { success: false, error: 'Registro no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: progress });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener el progreso' },
      { status: 500 }
    );
  }
}

// PUT update specific mini-step progress
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sStep: string; miniStep: string }> }
) {
  try {
    const { sStep, miniStep } = await params;
    const sStepNum = parseInt(sStep);
    const miniStepNum = parseInt(miniStep);
    const body = await request.json();

    if (isNaN(sStepNum) || isNaN(miniStepNum)) {
      return NextResponse.json(
        { success: false, error: 'Parámetros inválidos' },
        { status: 400 }
      );
    }

    // Check if previous mini-step is completed (enforce sequential order)
    if (miniStepNum > 1) {
      const previousStep = await db.progress.findUnique({
        where: { sStep_miniStep: { sStep: sStepNum, miniStep: miniStepNum - 1 } },
      });

      if (!previousStep || !previousStep.completed) {
        return NextResponse.json(
          {
            success: false,
            error: `Debe completar el mini-paso ${miniStepNum - 1} antes de avanzar al ${miniStepNum}`,
          },
          { status: 400 }
        );
      }
    }

    const progress = await db.progress.upsert({
      where: { sStep_miniStep: { sStep: sStepNum, miniStep: miniStepNum } },
      update: {
        completed: body.completed ?? undefined,
        score: body.score ?? undefined,
        notes: body.notes ?? undefined,
        photoUrls: body.photoUrls ?? undefined,
        passedAt: body.completed ? new Date() : undefined,
      },
      create: {
        sStep: sStepNum,
        miniStep: miniStepNum,
        completed: body.completed ?? false,
        score: body.score,
        notes: body.notes,
        photoUrls: body.photoUrls,
        passedAt: body.completed ? new Date() : undefined,
      },
    });

    return NextResponse.json({ success: true, data: progress });
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar el progreso' },
      { status: 500 }
    );
  }
}
