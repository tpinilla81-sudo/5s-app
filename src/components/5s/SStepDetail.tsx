'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { S_STEPS, MINI_STEPS } from '@/lib/5s-constants';
import { use5SStore } from '@/lib/store';
import MiniStepCard from './MiniStepCard';
import { ArrowLeft, Trophy, ChevronDown, ChevronRight, ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import QuesitoDisplay from './QuesitoDisplay';

export type ModalType = 'formacion' | 'fotos' | 'inventario' | 'actionplan' | 'autoevaluacion' | 'auditoria' | 'globalActionPlan' | 'globalInventory';

interface AuditHistoryItem {
  id: string;
  auditorName: string;
  result: string;
  score: number | null;
  observations: string | null;
  auditDate: string;
  checklistData: string | null;
}

interface OverdueAction {
  id: string;
  itemDescription: string;
  responsable: string | null;
  fechaLimite: string | null;
}

interface SStepDetailProps {
  sStep: number;
  onBack: () => void;
  onOpenModal: (type: ModalType, miniStep: number) => void;
}

/**
 * For miniStep 3: S1-S4 open 'inventario', S5 opens 'actionplan'
 * All other miniSteps are the same for every S.
 */
function getModalType(miniStepId: number, sStep: number): ModalType {
  if (miniStepId === 3) {
    return sStep === 5 ? 'actionplan' : 'inventario';
  }
  const map: Record<number, ModalType> = {
    1: 'formacion',
    2: 'fotos',
    4: 'autoevaluacion',
    5: 'auditoria',
  };
  return map[miniStepId] || 'formacion';
}

export default function SStepDetail({ sStep, onBack, onOpenModal }: SStepDetailProps) {
  const { getMiniStepStatus, isQuesitoEarned, progress, currentUser, adminFreeNavigation, currentProject, currentZone, employeeProgress } = use5SStore();
  const sStepData = S_STEPS.find(s => s.id === sStep);
  const earned = isQuesitoEarned(sStep);

  // TASK 6: Audit history state
  const [auditHistory, setAuditHistory] = useState<AuditHistoryItem[]>([]);
  const [showAuditHistory, setShowAuditHistory] = useState(false);

  // TASK 8: Overdue actions state
  const [overdueActions, setOverdueActions] = useState<OverdueAction[]>([]);

  const loadAuditHistory = async () => {
    try {
      const params = currentProject
        ? `?sStep=${sStep}&projectId=${currentProject.id}`
        : `?sStep=${sStep}`;
      const res = await fetch(`/api/audit${params}`);
      const json = await res.json();
      if (json.success) {
        setAuditHistory(json.audits || json.data || []);
      }
    } catch (error) {
      console.error('Error loading audit history:', error);
    }
  };

  const loadOverdueActions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const params = currentProject
        ? `?sStep=${sStep}&projectId=${currentProject.id}`
        : `?sStep=${sStep}`;
      const res = await fetch(`/api/actions${params}`);
      const json = await res.json();
      if (json.success && json.data) {
        const overdue = json.data.filter((a: any) =>
          (a.estado === 'abierta' || a.estado === 'en_proceso')
          && a.fechaLimite
          && new Date(a.fechaLimite).toISOString().split('T')[0] < today
        );
        setOverdueActions(overdue);
      }
    } catch (error) {
      console.error('Error loading overdue actions:', error);
    }
  };

  useEffect(() => {
    loadAuditHistory();
    loadOverdueActions();
  }, [sStep, currentProject]);

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

      {/* TASK 8: Overdue actions banner */}
      {overdueActions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2"
        >
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <div className="flex-1">
            <span className="text-sm text-red-700 font-medium">
              {overdueActions.length} acción(es) con fecha vencida en {sStepData.name}
            </span>
            <div className="mt-1 space-y-0.5">
              {overdueActions.slice(0, 3).map(action => (
                <p key={action.id} className="text-xs text-red-600">
                  • {action.itemDescription} {action.responsable && `(${action.responsable})`}
                </p>
              ))}
              {overdueActions.length > 3 && (
                <p className="text-xs text-red-500">... y {overdueActions.length - 3} más</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

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

      {/* TASK 6: Audit History (collapsible) */}
      {auditHistory.length > 0 && (
        <Card className="mb-4 border-2 border-blue-200 bg-blue-50/30">
          <button
            className="w-full p-3 flex items-center gap-2 hover:bg-blue-100/30 transition-colors text-left"
            onClick={() => setShowAuditHistory(!showAuditHistory)}
          >
            {showAuditHistory ? (
              <ChevronDown className="h-4 w-4 text-blue-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-blue-600" />
            )}
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-800">Historial de Auditorías</span>
            <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">{auditHistory.length}</Badge>
            <div className="ml-auto flex items-center gap-1">
              {auditHistory.filter(a => a.result === 'no_apto').length > 0 && (
                <Badge className="bg-red-100 text-red-700 text-[10px]">
                  {auditHistory.filter(a => a.result === 'no_apto').length} no apto(s)
                </Badge>
              )}
              {auditHistory.filter(a => a.result === 'apto').length > 0 && (
                <Badge className="bg-green-100 text-green-700 text-[10px]">
                  {auditHistory.filter(a => a.result === 'apto').length} apto(s)
                </Badge>
              )}
            </div>
          </button>
          {showAuditHistory && (
            <CardContent className="px-4 pb-4 pt-0 space-y-2">
              {auditHistory.map((audit, idx) => {
                // Parse checklist data to find NOK items
                let nokItems: Array<{ itemId: string; hallazgo?: string }> = [];
                try {
                  if (audit.checklistData) {
                    const parsed = typeof audit.checklistData === 'string' ? JSON.parse(audit.checklistData) : audit.checklistData;
                    if (Array.isArray(parsed)) {
                      nokItems = parsed.filter((r: any) => r.status === 'nok');
                    }
                  }
                } catch {}

                return (
                  <div
                    key={audit.id}
                    className={`p-2.5 rounded-lg border text-xs ${
                      audit.result === 'apto' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Auditoría {idx + 1}</span>
                        <Badge className={audit.result === 'apto' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {audit.result === 'apto' ? '✅ Apto' : '❌ No Apto'}
                        </Badge>
                        {audit.score !== null && (
                          <Badge variant="outline" className="text-[10px]">
                            {audit.score}%
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground">
                        {new Date(audit.auditDate).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>Auditor: <strong>{audit.auditorName}</strong></span>
                    </div>
                    {audit.observations && (
                      <p className="mt-1 text-muted-foreground italic">"{audit.observations}"</p>
                    )}
                    {nokItems.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        <p className="font-medium text-red-700">Disfunciones ({nokItems.length}):</p>
                        {nokItems.map((nok, nIdx) => (
                          <div key={nIdx} className="pl-3 text-red-600">
                            • {nok.itemId} {nok.hallazgo ? `— ${nok.hallazgo}` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          )}
        </Card>
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

            // TASK 1: Audit mini-step (5) is locked for non-admin/auditor roles
            // Responsable should NOT perform auditoría - only admin and auditor roles can
            const isAuditLocked = miniStep.id === 5
              && currentUser
              && currentUser.role !== 'admin'
              && currentUser.role !== 'auditor';
            const effectiveStatus = isAuditLocked ? 'locked' : status;

            // Employee progress info for individual steps (1, 4) when zone is selected
            const isIndividualStep = miniStep.id === 1 || miniStep.id === 4;
            const zoneEmpProgress = currentZone && isIndividualStep
              ? employeeProgress.filter(ep =>
                  ep.sStep === sStep &&
                  ep.miniStep === miniStep.id &&
                  ep.zoneId === currentZone.id
                )
              : [];
            const completedEmployees = zoneEmpProgress.filter(ep => ep.completed).length;
            const totalEmployees = zoneEmpProgress.length;

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
                  status={effectiveStatus}
                  score={miniStepProgress?.score ?? null}
                  color={sStepData.color}
                  lockedReason={isAuditLocked ? 'Solo auditores' : undefined}
                  notes={miniStepProgress?.notes ?? null}
                  onClick={() => {
                    if (effectiveStatus !== 'locked') {
                      onOpenModal(getModalType(miniStep.id, sStep), miniStep.id);
                    }
                  }}
                />
                {/* Employee completion indicator for individual steps */}
                {currentZone && isIndividualStep && totalEmployees > 0 && (
                  <div className="ml-16 mt-1 flex items-center gap-1.5">
                    <div className="flex -space-x-1">
                      {Array.from({ length: totalEmployees }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-4 h-4 rounded-full border-2 border-white text-[7px] flex items-center justify-center font-bold ${
                            i < completedEmployees ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {i < completedEmployees ? '✓' : ''}
                        </div>
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {completedEmployees}/{totalEmployees} empleados
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
