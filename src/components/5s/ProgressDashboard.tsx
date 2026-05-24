'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { S_STEPS } from '@/lib/5s-constants';
import { use5SStore } from '@/lib/store';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ShieldCheck, TrendingUp, Zap, Trophy, CheckCircle2, AlertCircle, CircleDot
} from 'lucide-react';
import QuesitoDisplay from './QuesitoDisplay';
import RadarChart5S from './RadarChart5S';

interface StatsData {
  auditScore: number | null;
  latestAuditScore: number | null;
  latestAuditDate: string | null;
  progressPercent: number;
  completedMiniSteps: number;
  totalMiniSteps: number;
  quesitosEarned: number;
  perSProgress: Record<number, {
    completed: number;
    total: number;
    percent: number;
    avgScore: number | null;
  }>;
  actions: {
    abierta: number;
    en_proceso: number;
    resuelta: number;
    cerrada: number;
    total: number;
  };
}

export default function ProgressDashboard() {
  const { currentProject, progress } = use5SStore();
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

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number | null) => {
    if (score === null) return 'bg-gray-50 border-gray-200';
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-4">
      {/* 3 Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Resultado de Auditorías */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className={`border-2 ${getScoreBg(stats?.auditScore ?? null)}`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-700">Resultado Auditorías</h3>
              </div>
              <div className="text-center">
                <p className={`text-4xl font-black ${getScoreColor(stats?.auditScore ?? null)}`}>
                  {stats?.auditScore !== null && stats?.auditScore !== undefined
                    ? `${stats.auditScore}%`
                    : '—'
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Puntuación media
                </p>
                {stats?.latestAuditScore !== null && stats?.latestAuditScore !== undefined && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Última: <span className="font-bold">{stats.latestAuditScore}%</span>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 2. Progreso 5S */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-2 bg-emerald-50 border-emerald-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-semibold text-gray-700">Progreso 5S</h3>
              </div>
              <div className="text-center">
                <p className="text-4xl font-black text-emerald-600">
                  {stats?.progressPercent ?? 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.completedMiniSteps ?? 0} de {stats?.totalMiniSteps ?? 25} pasos
                </p>
                <div className="mt-2 pt-2 border-t">
                  <div className="flex items-center justify-center gap-1">
                    <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                    <span className="text-xs font-medium">{stats?.quesitosEarned ?? 0}/5 Quesitos</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 3. Plan de Acción */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-2 bg-orange-50 border-orange-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-orange-600" />
                <h3 className="text-sm font-semibold text-gray-700">Plan de Acción</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-gray-700">Abiertas</span>
                  </div>
                  <span className="text-lg font-bold text-red-600">{stats?.actions.abierta ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CircleDot className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-gray-700">En curso</span>
                  </div>
                  <span className="text-lg font-bold text-amber-600">{stats?.actions.en_proceso ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-700">Cerradas</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {(stats?.actions.resuelta ?? 0) + (stats?.actions.cerrada ?? 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 5S Progress Indicator — Radar + Table (MAIN indicator as shown by user) */}
      {currentProject && (
        <RadarChart5S projectId={currentProject.id} />
      )}

      {/* Per-S progress bars */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Progreso por S</CardTitle>
        </CardHeader>
        <CardContent className="pb-4 space-y-3">
          {S_STEPS.map((s, i) => {
            const sStats = stats?.perSProgress?.[s.id];
            const percent = sStats?.percent ?? 0;
            const avgScore = sStats?.avgScore;

            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-xs font-semibold">{s.name}</span>
                    <span className="text-[10px] text-muted-foreground">({s.japaneseName})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {avgScore !== null && (
                      <span className="text-xs font-bold" style={{ color: s.color }}>
                        {avgScore}%
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {sStats?.completed ?? 0}/{sStats?.total ?? 5}
                    </span>
                  </div>
                </div>
                <Progress
                  value={percent}
                  className="h-2"
                  style={{ '--progress-color': s.color } as React.CSSProperties}
                />
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

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
