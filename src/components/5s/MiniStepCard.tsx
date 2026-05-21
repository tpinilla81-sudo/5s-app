'use client';

import { motion } from 'framer-motion';
import { MINI_STEPS } from '@/lib/5s-constants';
import type { MiniStep } from '@/lib/5s-constants';
import {
  GraduationCap,
  Camera,
  ClipboardList,
  CheckSquare,
  ShieldCheck,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface MiniStepCardProps {
  miniStep: MiniStep;
  sStep: number;
  status: 'locked' | 'available' | 'completed';
  score: number | null;
  color: string;
  onClick: () => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  GraduationCap,
  Camera,
  ClipboardList,
  CheckSquare,
  ShieldCheck,
};

export default function MiniStepCard({
  miniStep,
  sStep,
  status,
  score,
  color,
  onClick,
}: MiniStepCardProps) {
  const Icon = iconMap[miniStep.icon] || GraduationCap;
  const isLocked = status === 'locked';
  const isCompleted = status === 'completed';

  return (
    <motion.div
      whileHover={!isLocked ? { scale: 1.01 } : undefined}
      whileTap={!isLocked ? { scale: 0.99 } : undefined}
    >
      <Card
        className={`
          relative overflow-hidden transition-all duration-200
          ${isLocked
            ? 'opacity-50 cursor-not-allowed bg-muted/50'
            : 'cursor-pointer hover:shadow-lg'
          }
          ${isCompleted ? 'border-green-300 bg-green-50/50' : ''}
        `}
        onClick={!isLocked ? onClick : undefined}
      >
        {/* Color accent bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5"
          style={{ backgroundColor: isLocked ? '#9ca3af' : color }}
        />

        <CardContent className="p-4 pl-5 flex items-center gap-4">
          {/* Step number circle */}
          <div
            className={`
              w-12 h-12 rounded-full flex items-center justify-center shrink-0
              ${isCompleted
                ? 'bg-green-500 text-white'
                : isLocked
                  ? 'bg-gray-200 text-gray-400'
                  : 'text-white'
              }
            `}
            style={!isCompleted && !isLocked ? { backgroundColor: color } : undefined}
          >
            {isCompleted ? (
              <span className="text-lg font-bold">✓</span>
            ) : isLocked ? (
              <Lock className="h-5 w-5" />
            ) : (
              <span className="text-lg font-bold">{miniStep.id}</span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${isLocked ? 'text-gray-400' : ''}`} style={!isLocked && !isCompleted ? { color } : undefined} />
              <h3 className={`font-semibold text-sm ${isLocked ? 'text-gray-400' : ''}`}>
                {miniStep.name}
              </h3>
            </div>
            <p className={`text-xs mt-0.5 ${isLocked ? 'text-gray-400' : 'text-muted-foreground'}`}>
              {miniStep.descriptionByS?.[sStep] || miniStep.description}
            </p>
            {isCompleted && score !== null && (
              <p className="text-xs text-green-600 font-medium mt-1">
                Puntuación: {score}%
              </p>
            )}
          </div>

          {/* Status indicator */}
          <div className="shrink-0">
            {isLocked ? (
              <Lock className="h-5 w-5 text-gray-300" />
            ) : isCompleted ? (
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-sm">✓</span>
              </div>
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
