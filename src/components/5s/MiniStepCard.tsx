'use client';

import { motion } from 'framer-motion';
import { MINI_STEPS, EXAM_PASS_THRESHOLD, AUDIT_PASS_THRESHOLD } from '@/lib/5s-constants';
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
  status: 'locked' | 'available' | 'completed' | 'completed_viewonly';
  score: number | null;
  color: string;
  onClick: () => void;
  lockedReason?: string;
  notes?: string | null;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  GraduationCap,
  Camera,
  ClipboardList,
  CheckSquare,
  ShieldCheck,
};

/**
 * Parse notes JSON to extract exam/audit result data for badges.
 */
function parseNotesForBadge(notes: string | null, miniStepId: number): { passed: boolean | null; label: string } {
  if (!notes) return { passed: null, label: '' };

  try {
    const data = JSON.parse(notes);

    // Exam (miniStep 1): check score from progress
    if (miniStepId === 1) {
      // The notes might have score info or type
      if (data.type === 'examen' || data.type === 'formacion') {
        // Score is passed separately via `score` prop
        return { passed: null, label: '' };
      }
    }

    // Audit (miniStep 5): check result
    if (miniStepId === 5) {
      if (data.result === 'apto') {
        return { passed: true, label: 'Apto' };
      }
      if (data.result === 'no_apto') {
        return { passed: false, label: 'No Apto' };
      }
    }

    return { passed: null, label: '' };
  } catch {
    return { passed: null, label: '' };
  }
}

export default function MiniStepCard({
  miniStep,
  sStep,
  status,
  score,
  color,
  onClick,
  lockedReason,
  notes,
}: MiniStepCardProps) {
  const Icon = iconMap[miniStep.icon] || GraduationCap;
  const isLocked = status === 'locked';
  const isCompleted = status === 'completed' || status === 'completed_viewonly';
  const isViewOnly = status === 'completed_viewonly';

  // TASK 5: Visual test completion indicator
  const auditBadge = parseNotesForBadge(notes, miniStep.id);
  const examBadge = miniStep.id === 1 && score !== null
    ? { passed: score >= EXAM_PASS_THRESHOLD, label: score >= EXAM_PASS_THRESHOLD ? 'Apto' : 'No Apto' }
    : null;

  const showBadge = isCompleted && (examBadge || auditBadge.passed !== null);
  const badgePassed = examBadge ? examBadge.passed : auditBadge.passed;
  const badgeLabel = examBadge ? examBadge.label : auditBadge.label;

  return (
    <motion.div
      whileHover={!isLocked && !isViewOnly ? { scale: 1.01 } : undefined}
      whileTap={!isLocked && !isViewOnly ? { scale: 0.99 } : undefined}
    >
      <Card
        className={`
          relative overflow-hidden transition-all duration-200
          ${isLocked
            ? 'opacity-50 cursor-not-allowed bg-muted/50'
            : isViewOnly
              ? 'cursor-not-allowed bg-green-50/30'
              : 'cursor-pointer hover:shadow-lg'
          }
          ${isCompleted ? 'border-green-300 bg-green-50/50' : ''}
        `}
        onClick={!isLocked && !isViewOnly ? onClick : undefined}
      >
        {/* Color accent bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5"
          style={{ backgroundColor: isLocked ? '#9ca3af' : isViewOnly ? '#6ee7b7' : color }}
        />

        <CardContent className="p-4 pl-5 flex items-center gap-4">
          {/* Step number circle */}
          <div
            className={`
              w-12 h-12 rounded-full flex items-center justify-center shrink-0
              ${isCompleted
                ? isViewOnly
                  ? 'bg-green-400/70 text-white/80'
                  : 'bg-green-500 text-white'
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
              <Icon className={`h-4 w-4 ${isLocked ? 'text-gray-400' : isViewOnly ? 'text-green-500' : ''}`} style={!isLocked && !isCompleted ? { color } : undefined} />
              <h3 className={`font-semibold text-sm ${isLocked ? 'text-gray-400' : ''}`}>
                {miniStep.name}
              </h3>
              {/* TASK 5: Visual badge for passed/failed */}
              {showBadge && badgePassed !== null && (
                <span
                  className={`inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded ${
                    badgePassed
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {badgePassed ? '✅' : '❌'} {badgeLabel}
                </span>
              )}
            </div>
            <p className={`text-xs mt-0.5 ${isLocked ? 'text-gray-400' : 'text-muted-foreground'}`}>
              {miniStep.descriptionByS?.[sStep] || miniStep.description}
            </p>
            {/* TASK 1: Show locked reason (e.g., "Solo auditores") */}
            {(isLocked || isViewOnly) && lockedReason && (
              <p className="text-xs mt-1 font-medium text-amber-600 flex items-center gap-1">
                <Lock className="h-3 w-3" /> {lockedReason}
              </p>
            )}
            {isCompleted && score !== null && !isViewOnly && (
              <p className="text-xs text-green-600 font-medium mt-1">
                Puntuación: {score}%
              </p>
            )}
          </div>

          {/* Status indicator */}
          <div className="shrink-0">
            {isLocked ? (
              <Lock className="h-5 w-5 text-gray-300" />
            ) : isViewOnly ? (
              <Lock className="h-5 w-5 text-green-300" />
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
