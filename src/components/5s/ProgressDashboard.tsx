'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { S_STEPS } from '@/lib/5s-constants';
import { use5SStore } from '@/lib/store';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Trophy, Target, TrendingUp, Camera, ClipboardList,
  CheckSquare, ShieldCheck, Zap, FileText, AlertTriangle
} from 'lucide-react';
import QuesitoDisplay from './QuesitoDisplay';

interface StatsData {
  total: {
    inventory: number;
    checklistResponses: number;
    actionItems: number;
    auditResults: number;
    examAnswers: number;
    photos: number;
    completedSteps: number;
    autoevaluaciones: number;
    auditorias: number;
  };
  perS: Record<number, {
    inventory: number;
    checklist: number;
    actions: number;
    completed: number;
    photos: number;
  }>;
  actionsByStatus: {
    abierta: number;
    en_proceso: number;
    resuelta: number;
    cerrada: number;
  };
  inventoryByS: Record<number, number>;
}

export default function ProgressDashboard() {
  const { progress, getCompletedCount, isQuesitoEarned, currentProject } = use5SStore();
  const { sSteps: completedSSteps, miniSteps: completedMiniSteps, total: totalMiniSteps } = getCompletedCount();
  const overallPercent = totalMiniSteps > 0 ? Math.round((completedMiniSteps / totalMiniSteps) * 100) : 0;
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    loadStats();
  }, [currentProject, progress]);

  const loadStats = async () => {
    try {
      const params = currentProject ? `?projectId=${currentProject.id}` : '';
      const res = await fetch(`/api/stats${params}`);
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const total = stats?.total;
  const actionsByStatus = stats?.actionsByStatus;

  return (
    <div className="space-y-4">
      {/* Main summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 text-purple-500 mx-auto mb-1" />
              <p className="text-2xl font-bold">{completedMiniSteps}</p>
              <p className="text-xs text-muted-foreground">Mini-pasos</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
              <p className="text-2xl font-bold">{completedSSteps}</p>
              <p className="text-xs text-muted-foreground">Quesitos</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold">{overallPercent}%</p>
              <p className="text-xs text-muted-foreground">General</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Data counters - Photos, Inventory, Checklists, Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-blue-100">
            <CardContent className="p-3 text-center">
              <Camera className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-blue-700">{total?.photos ?? 0}</p>
              <p className="text-xs text-muted-foreground">Fotos</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-amber-100">
            <CardContent className="p-3 text-center">
              <ClipboardList className="h-5 w-5 text-amber-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-amber-700">{total?.inventory ?? 0}</p>
              <p className="text-xs text-muted-foreground">Inventario</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-green-100">
            <CardContent className="p-3 text-center">
              <CheckSquare className="h-5 w-5 text-green-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-green-700">{total?.autoevaluaciones ?? 0}</p>
              <p className="text-xs text-muted-foreground">Autoevaluaciones</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-red-100">
            <CardContent className="p-3 text-center">
              <ShieldCheck className="h-5 w-5 text-red-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-red-700">{total?.auditorias ?? 0}</p>
              <p className="text-xs text-muted-foreground">Auditorías</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Actions / Improvement tracking */}
      {(total?.actionItems ?? 0) > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-orange-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500" />
                Acciones de Mejora
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-red-600">{actionsByStatus?.abierta ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Abiertas</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-600">{actionsByStatus?.en_proceso ?? 0}</p>
                  <p className="text-xs text-muted-foreground">En Proceso</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">{actionsByStatus?.resuelta ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Resueltas</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-600">{actionsByStatus?.cerrada ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Cerradas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Overall progress bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progreso General</span>
            <span className="text-sm text-muted-foreground">{completedMiniSteps}/{totalMiniSteps}</span>
          </div>
          <Progress value={overallPercent} className="h-3" />
        </CardContent>
      </Card>

      {/* Per-S progress with data counts */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {S_STEPS.map((s, i) => {
          const sProgress = progress.filter(p => p.sStep === s.id);
          const sCompleted = sProgress.filter(p => p.completed).length;
          const sPercent = (sCompleted / 5) * 100;
          const earned = isQuesitoEarned(s.id);
          const sStats = stats?.perS?.[s.id];

          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
            >
              <Card className={`h-full ${earned ? 'border-green-300' : ''}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-xs font-semibold truncate">{s.name}</span>
                    {earned && <span className="text-xs">✅</span>}
                  </div>
                  <Progress value={sPercent} className="h-2 mb-1" />
                  <p className="text-xs text-muted-foreground text-center mb-2">
                    {sCompleted}/5 pasos
                  </p>
                  {/* Data counts per S */}
                  <div className="grid grid-cols-2 gap-1 text-center border-t pt-2">
                    <div>
                      <p className="text-xs font-bold" style={{ color: s.color }}>{sStats?.photos ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground">Fotos</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: s.color }}>{sStats?.inventory ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground">Items</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: s.color }}>{sStats?.checklist ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground">Checklist</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: s.color }}>{sStats?.actions ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground">Acciones</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quesitos display */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Quesitos Obtenidos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-2">
          <QuesitoDisplay size={100} />
        </CardContent>
        <div className="px-4 pb-3 flex justify-center gap-4 flex-wrap">
          {S_STEPS.map(s => (
            <div key={s.id} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-muted-foreground">{s.name}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
