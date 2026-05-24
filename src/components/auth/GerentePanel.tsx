'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { use5SStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft, ShieldCheck, TrendingUp, Zap, Trophy, Building2,
  AlertCircle, CircleDot, CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react';
import RadarChart5S from '@/components/5s/RadarChart5S';

interface ProjectStats {
  id: string;
  name: string;
  company: string;
  progressPercent: number;
  avgAuditScore: number | null;
  actions: {
    abierta: number;
    en_proceso: number;
    resuelta: number;
    cerrada: number;
  };
}

interface CompanyStats {
  auditScore: number | null;
  latestAuditScore: number | null;
  progressPercent: number;
  completedMiniSteps: number;
  totalMiniSteps: number;
  quesitosEarned: number;
  actions: {
    abierta: number;
    en_proceso: number;
    resuelta: number;
    cerrada: number;
    total: number;
  };
  perProjectBreakdown: ProjectStats[] | null;
}

export default function GerentePanel() {
  const { setCurrentView } = use5SStore();
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/stats?companyScope=empresa');
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
        // Auto-expand first project
        if (json.data?.perProjectBreakdown?.length > 0) {
          setExpandedProject(json.data.perProjectBreakdown[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading company stats:', error);
    } finally {
      setIsLoading(false);
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

  const totalAbiertas = stats?.actions.abierta ?? 0;
  const totalEnCurso = stats?.actions.en_proceso ?? 0;
  const totalCerradas = (stats?.actions.resuelta ?? 0) + (stats?.actions.cerrada ?? 0);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-indigo-50/50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setCurrentView('board')} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <div className="w-px h-6 bg-gray-200" />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              G
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Panel de Gerencia</h1>
              <p className="text-xs text-muted-foreground">Indicadores globales de la empresa</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 3 Main Indicators - Company Level */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 1. Resultado de Auditorías - Empresa */}
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
                      <p className="text-xs text-muted-foreground mt-1">Puntuación media empresa</p>
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

              {/* 2. Progreso 5S - Empresa */}
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
                        {stats?.completedMiniSteps ?? 0} de {stats?.totalMiniSteps ?? 25} pasos totales
                      </p>
                      <div className="mt-2 pt-2 border-t">
                        <div className="flex items-center justify-center gap-1">
                          <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                          <span className="text-xs font-medium">{stats?.quesitosEarned ?? 0} Quesitos</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* 3. Plan de Acción - Empresa */}
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
                        <span className="text-lg font-bold text-red-600">{totalAbiertas}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CircleDot className="h-4 w-4 text-amber-500" />
                          <span className="text-sm text-gray-700">En curso</span>
                        </div>
                        <span className="text-lg font-bold text-amber-600">{totalEnCurso}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-700">Cerradas</span>
                        </div>
                        <span className="text-lg font-bold text-green-600">{totalCerradas}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Section title */}
            <div className="flex items-center gap-3 mt-8">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
              <h2 className="text-sm font-black text-gray-600 uppercase tracking-widest">
                Indicador 5S por Zona / Proyecto
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
            </div>

            {/* Per-Project: Full 5S Indicator (Radar + Table) per project */}
            {stats?.perProjectBreakdown && stats.perProjectBreakdown.length > 0 ? (
              <div className="space-y-6">
                {stats.perProjectBreakdown.map((proj, idx) => (
                  <motion.div
                    key={proj.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                  >
                    {/* Project header with mini KPIs */}
                    <div className="mb-2">
                      <div
                        className="flex items-center justify-between p-3 bg-white rounded-t-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
                        onClick={() => setExpandedProject(expandedProject === proj.id ? null : proj.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-indigo-500" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900">{proj.name}</h4>
                            <p className="text-xs text-muted-foreground">{proj.company}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Mini indicators */}
                          <div className="hidden sm:flex items-center gap-2">
                            <div className="text-center px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100">
                              <p className={`text-sm font-black ${getScoreColor(proj.avgAuditScore)}`}>
                                {proj.avgAuditScore !== null ? `${proj.avgAuditScore}%` : '—'}
                              </p>
                              <p className="text-[9px] text-gray-500 font-semibold">Auditoría</p>
                            </div>
                            <div className="text-center px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                              <p className="text-sm font-black text-emerald-600">{proj.progressPercent}%</p>
                              <p className="text-[9px] text-gray-500 font-semibold">Progreso</p>
                            </div>
                            <div className="text-center px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-100">
                              <div className="flex justify-center gap-1">
                                <span className="text-xs font-black text-red-500">{proj.actions.abierta}</span>
                                <span className="text-[9px] text-gray-400">/</span>
                                <span className="text-xs font-black text-amber-500">{proj.actions.en_proceso}</span>
                                <span className="text-[9px] text-gray-400">/</span>
                                <span className="text-xs font-black text-green-500">{proj.actions.resuelta + proj.actions.cerrada}</span>
                              </div>
                              <p className="text-[9px] text-gray-500 font-semibold">A/E/C</p>
                            </div>
                          </div>

                          {expandedProject === proj.id
                            ? <ChevronUp className="h-5 w-5 text-gray-400" />
                            : <ChevronDown className="h-5 w-5 text-gray-400" />
                          }
                        </div>
                      </div>

                      {/* Expanded: Full 5S Radar Indicator */}
                      {expandedProject === proj.id && (
                        <div className="border border-t-0 border-gray-200 rounded-b-xl overflow-hidden">
                          <RadarChart5S projectId={proj.id} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center">
                  <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No hay proyectos activos</p>
                  <p className="text-xs text-muted-foreground mt-1">Crea proyectos desde el panel de administración para ver indicadores</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
