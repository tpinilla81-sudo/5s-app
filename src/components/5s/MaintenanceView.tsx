'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { use5SStore } from '@/lib/store';
import { S_STEPS, AUDIT_PASS_THRESHOLD } from '@/lib/5s-constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  ShieldCheck,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  ArrowLeft,
  Zap,
  FileText,
} from 'lucide-react';
import QuarterlyAuditModal from './QuarterlyAuditModal';

interface QuarterlyAuditRecord {
  id: string;
  auditorName: string;
  result: string;
  score: number;
  observations: string | null;
  auditDate: string;
}

export default function MaintenanceView() {
  const { setCurrentView, currentProject, fetchProgress } = use5SStore();
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditHistory, setAuditHistory] = useState<QuarterlyAuditRecord[]>([]);
  const [actionStats, setActionStats] = useState({ abierta: 0, en_proceso: 0, resuelta: 0, cerrada: 0 });
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Calculate completion date (date of last completed audit step)
  const completionDate = 'Completado';

  useEffect(() => {
    loadAuditHistory();
    loadActionStats();
  }, [currentProject]);

  const loadAuditHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const params = currentProject ? `?projectId=${currentProject.id}` : '';
      const res = await fetch(`/api/audit${params}`);
      const data = await res.json();
      if (data.success && data.audits) {
        // Filter only quarterly audits (sStep=0) and sort by date desc
        const quarterly = data.audits
          .filter((a: any) => a.sStep === 0)
          .sort((a: any, b: any) => new Date(b.auditDate).getTime() - new Date(a.auditDate).getTime());
        setAuditHistory(quarterly);
      }
    } catch (error) {
      console.error('Error loading audit history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadActionStats = async () => {
    try {
      const params = currentProject ? `?projectId=${currentProject.id}` : '';
      const res = await fetch(`/api/stats${params}`);
      const data = await res.json();
      if (data.success && data.data?.actionsByStatus) {
        setActionStats(data.data.actionsByStatus);
      }
    } catch (error) {
      console.error('Error loading action stats:', error);
    }
  };

  const totalActions = actionStats.abierta + actionStats.en_proceso + actionStats.resuelta + actionStats.cerrada;

  // Calculate next quarterly audit date
  const getNextAuditDate = () => {
    if (auditHistory.length === 0) return 'Próxima: Inmediata';
    const lastAudit = new Date(auditHistory[0].auditDate);
    const nextDate = new Date(lastAudit);
    nextDate.setMonth(nextDate.getMonth() + 3);
    const today = new Date();
    const isOverdue = nextDate < today;
    const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return isOverdue
      ? `¡Vencida hace ${Math.abs(diffDays)} días!`
      : `Próxima: en ${diffDays} días (${nextDate.toLocaleDateString('es-ES')})`;
  };

  const isNextAuditOverdue = () => {
    if (auditHistory.length === 0) return true;
    const lastAudit = new Date(auditHistory[0].auditDate);
    const nextDate = new Date(lastAudit);
    nextDate.setMonth(nextDate.getMonth() + 3);
    return nextDate < new Date();
  };

  const handleAuditComplete = () => {
    setShowAuditModal(false);
    loadAuditHistory();
    loadActionStats();
    fetchProgress();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => setCurrentView('board')} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Volver al Tablero 5S
          </Button>
        </div>

        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
                <Trophy className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-green-900">¡Taller de Implementación 5S Completado!</h2>
                <p className="text-sm text-green-700 mt-1">
                  La zona ha completado las 5S. Ahora entra en la fase de <strong>mantenimiento y mejora continua</strong> con auditorías trimestrales.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-1">
                {S_STEPS.map(s => (
                  <div key={s.id} className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: s.color }}>
                    S{s.id}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-orange-100">
            <CardContent className="p-3 text-center">
              <ShieldCheck className="h-5 w-5 text-orange-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-orange-700">{auditHistory.length}</p>
              <p className="text-xs text-muted-foreground">Auditorías Trimestrales</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className={isNextAuditOverdue() ? 'border-red-200 bg-red-50' : 'border-blue-100'}>
            <CardContent className="p-3 text-center">
              <Calendar className={`h-5 w-5 mx-auto mb-1 ${isNextAuditOverdue() ? 'text-red-500' : 'text-blue-500'}`} />
              <p className={`text-xs font-medium ${isNextAuditOverdue() ? 'text-red-700' : 'text-blue-700'}`}>
                {getNextAuditDate()}
              </p>
              <p className="text-xs text-muted-foreground">Frecuencia Trimestral</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-green-100">
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-5 w-5 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-700">
                {auditHistory.length > 0 ? `${auditHistory[0].score}%` : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Última Puntuación</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-purple-100">
            <CardContent className="p-3 text-center">
              <Zap className="h-5 w-5 text-purple-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-purple-700">{totalActions}</p>
              <p className="text-xs text-muted-foreground">Acciones de Mejora</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* New audit button */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className={`border-2 ${isNextAuditOverdue() ? 'border-red-300 bg-red-50/50' : 'border-orange-200 bg-orange-50/30'}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isNextAuditOverdue() ? 'bg-red-100' : 'bg-orange-100'}`}>
                {isNextAuditOverdue() ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <Clock className="h-5 w-5 text-orange-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {isNextAuditOverdue() ? 'Auditoría Trimestral Pendiente' : 'Realizar Auditoría Trimestral'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isNextAuditOverdue() && auditHistory.length > 0
                    ? 'La auditoría trimestral está vencida. Realízala lo antes posible.'
                    : 'Evalúa las 5S de forma conjunta con el checklist completo.'}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowAuditModal(true)}
              className={`gap-1.5 ${isNextAuditOverdue() ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}
            >
              <Plus className="h-4 w-4" />
              Nueva Auditoría
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Audit history */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-500" />
              Historial de Auditorías Trimestrales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingHistory ? (
              <p className="text-xs text-muted-foreground text-center py-4">Cargando...</p>
            ) : auditHistory.length === 0 ? (
              <div className="text-center py-6">
                <ShieldCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No hay auditorías trimestrales registradas</p>
                <p className="text-xs text-muted-foreground mt-1">Realiza la primera auditoría trimestral</p>
              </div>
            ) : (
              <div className="space-y-2">
                {auditHistory.map((audit, idx) => (
                  <div key={audit.id} className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${audit.score >= AUDIT_PASS_THRESHOLD ? 'bg-green-100' : 'bg-red-100'}`}>
                        {audit.score >= AUDIT_PASS_THRESHOLD ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          Auditoría {auditHistory.length - idx}
                          {idx === 0 && <span className="text-xs text-muted-foreground ml-1">(última)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(audit.auditDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                          {' · '}Auditor: {audit.auditorName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={audit.score >= AUDIT_PASS_THRESHOLD ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {audit.score}%
                      </Badge>
                      <Badge className={audit.result === 'apto' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
                        {audit.result === 'apto' ? 'Apto' : 'No Apto'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Action plan tracking */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="border-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              Plan de Acción — Seguimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalActions === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No hay acciones de mejora registradas</p>
            ) : (
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-2 rounded-lg bg-red-50">
                  <p className="text-lg font-bold text-red-600">{actionStats.abierta}</p>
                  <p className="text-[10px] text-red-700 font-medium">Abiertas</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-50">
                  <p className="text-lg font-bold text-amber-600">{actionStats.en_proceso}</p>
                  <p className="text-[10px] text-amber-700 font-medium">En Proceso</p>
                </div>
                <div className="p-2 rounded-lg bg-green-50">
                  <p className="text-lg font-bold text-green-600">{actionStats.resuelta}</p>
                  <p className="text-[10px] text-green-700 font-medium">Resueltas</p>
                </div>
                <div className="p-2 rounded-lg bg-gray-50">
                  <p className="text-lg font-bold text-gray-600">{actionStats.cerrada}</p>
                  <p className="text-[10px] text-gray-700 font-medium">Cerradas</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Audit scoring explanation */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-2">Sistema de Puntuación — Auditoría Trimestral</h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-lg font-bold text-blue-700">90%</p>
                <p className="text-[10px] text-blue-600">Checklist (máx.)</p>
              </div>
              <div className="p-2 rounded-lg bg-green-50 border border-green-100">
                <p className="text-lg font-bold text-green-700">+5%</p>
                <p className="text-[10px] text-green-600">Por mejora (máx. 2)</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-50 border border-orange-100">
                <p className="text-lg font-bold text-orange-700">75%</p>
                <p className="text-[10px] text-orange-600">Mínimo Apto</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              La auditoría trimestral evalúa las 5S de forma conjunta. Cada mejora documentada suma +5% a la puntuación del checklist (máximo 2 mejoras = +10%).
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quarterly audit modal */}
      <QuarterlyAuditModal
        open={showAuditModal}
        onClose={handleAuditComplete}
      />
    </div>
  );
}
