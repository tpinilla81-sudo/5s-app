'use client';

import { motion } from 'framer-motion';
import { S_STEPS, MINI_STEPS } from '@/lib/5s-constants';
import { use5SStore } from '@/lib/store';
import MiniStepCard from './MiniStepCard';
import { ArrowLeft, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import QuesitoDisplay from './QuesitoDisplay';

interface SStepDetailProps {
  sStep: number;
  onBack: () => void;
  onOpenModal: (type: 'formacion' | 'fotos' | 'actionplan' | 'autoevaluacion' | 'auditoria', miniStep: number) => void;
}

const MODAL_TYPE_MAP: Record<number, 'formacion' | 'fotos' | 'actionplan' | 'autoevaluacion' | 'auditoria'> = {
  1: 'formacion',
  2: 'fotos',
  3: 'actionplan',
  4: 'autoevaluacion',
  5: 'auditoria',
};

export default function SStepDetail({ sStep, onBack, onOpenModal }: SStepDetailProps) {
  const { getMiniStepStatus, isQuesitoEarned, progress } = use5SStore();
  const sStepData = S_STEPS.find(s => s.id === sStep);
  const earned = isQuesitoEarned(sStep);

  if (!sStepData) return null;

  const sProgress = progress.filter(p => p.sStep === sStep);
  const completedCount = sProgress.filter(p => p.completed).length;
  const progressPercent = (completedCount / 5) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: sStepData.color }}
            />
            <h2 className="text-xl font-bold" style={{ color: sStepData.color }}>
              {sStepData.name}
            </h2>
            <span className="text-sm text-muted-foreground">
              ({sStepData.japaneseName} - {sStepData.spanishName})
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {sStepData.description}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6 px-1">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Progreso</span>
          <span className="text-sm text-muted-foreground">{completedCount}/5 completados</span>
        </div>
        <Progress value={progressPercent} className="h-3" />
      </div>

      {/* Quesito display */}
      {earned && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-6 p-4 rounded-lg border-2 bg-green-50 border-green-200 flex items-center gap-3"
        >
          <Trophy className="h-8 w-8 text-green-500" />
          <div>
            <p className="font-bold text-green-700">¡Quesito Obtenido!</p>
            <p className="text-sm text-green-600">Ha completado todos los mini-pasos de {sStepData.name}</p>
          </div>
          <div className="ml-auto">
            <QuesitoDisplay sStep={sStep} />
          </div>
        </motion.div>
      )}

      {/* Mini-steps vertical path */}
      <div className="relative">
        {/* Connecting line */}
        <div
          className="absolute left-8 top-12 bottom-12 w-0.5"
          style={{ backgroundColor: `${sStepData.color}30` }}
        />

        <div className="space-y-4">
          {MINI_STEPS.map((miniStep, index) => {
            const status = getMiniStepStatus(sStep, miniStep.id);
            const miniStepProgress = sProgress.find(p => p.miniStep === miniStep.id);

            return (
              <motion.div
                key={miniStep.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <MiniStepCard
                  miniStep={miniStep}
                  sStep={sStep}
                  status={status}
                  score={miniStepProgress?.score ?? null}
                  color={sStepData.color}
                  onClick={() => {
                    if (status !== 'locked') {
                      onOpenModal(MODAL_TYPE_MAP[miniStep.id], miniStep.id);
                    }
                  }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
