'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { use5SStore } from '@/lib/store';
import {
  S_STEPS,
  AUDIT_PASS_THRESHOLD,
} from '@/lib/5s-constants';
import type { AuditSection } from '@/lib/5s-constants';
import { fetchAllChecklistTemplates } from '@/lib/checklist-templates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Sparkles,
  BarChart3,
  ClipboardList,
  Trash2,
  ChevronDown,
  ChevronRight,
  ListChecks,
  User,
  SprayCan,
} from 'lucide-react';
import QuarterlyAuditModal from './QuarterlyAuditModal';
import PeriodicAuditModal from './PeriodicAuditModal';

interface AuditRecord {
  id: string;
  auditorName: string;
  result: string;
  score: number;
  observations: string | null;
  auditType: string;
  auditDate: string;
}

interface ActionItemData {
  id: string;
  sStep: number;
  itemId: string;
  itemDescription: string;
  hallazgo: string;
  responsable: string | null;
  prioridad: string;
  estado: string;
  fechaLimite: string | null;
  source: string;
  createdAt: string;
}

interface MaintenanceViewProps {
  embedded?: boolean;
}

export default function MaintenanceView({ embedded }: MaintenanceViewProps = {}) {
  const { setCurrentView, currentProject, currentZone, fetchProgress } = use5SStore();
  const [showQuarterlyAudit, setShowQuarterlyAudit] = useState(false);
  const [showWeeklyAudit, setShowWeeklyAudit] = useState(false);
  const [showMonthlyAudit, setShowMonthlyAudit] = useState(false);

  // Dynamic checklist data loaded from API templates
  const [weeklySections, setWeeklySections] = useState<AuditSection[]>([]);
  const [monthlySections, setMonthlySections] = useState<AuditSection[]>([]);
  const [weeklyTotalItems, setWeeklyTotalItems] = useState(0);
  const [monthlyTotalItems, setMonthlyTotalItems] = useState(0);

  const [auditHistory, setAuditHistory] = useState<AuditRecord[]>([]);
  const [actionItems, setActionItems] = useState<ActionItemData[]>([]);
  const [actionStats, setActionStats] = useState({ abierta: 0, en_proceso: 0, resuelta: 0, cerrada: 0 });
  const [stats, setStats] = useState<any>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'weekly' | 'monthly' | 'quarterly' | 'actions' | 'counters'>('overview');

  // Action plan form
  const [showNewAction, setShowNewAction] = useState(false);
  const [newAction, setNewAction] = useState({ descripcion: '', responsable: '', prioridad: 'media', fechaLimite: '' });

  useEffect(() => {
    loadData();
  }, [currentProject]);

  // Load checklist templates from API and compute weekly/monthly variants
  useEffect(() => {
    const loadChecklists = async () => {
      const templatesMap = await fetchAllChecklistTemplates('auditoria');
      // Weekly: only S3 (Seiso/cleaning) sections
      const s3Sections = templatesMap[3] || [];
      setWeeklySections(s3Sections);
      setWeeklyTotalItems(s3Sections.reduce((sum, s) => sum + s.items.length, 0));
      // Monthly: first 2 items from each section across all S
      const monthlyList: AuditSection[] = [];
      for (let s = 1; s <= 5; s++) {
        const sSections = templatesMap[s] || [];
        for (const section of sSections) {
          monthlyList.push({
            ...section,
            items: section.items.slice(0, 2),
          });
        }
      }
      setMonthlySections(monthlyList);
      setMonthlyTotalItems(monthlyList.reduce((sum, s) => sum + s.items.length, 0));
    };
    loadChecklists();
  }, []);

  const loadData = async () => {
    setIsLoadingHistory(true);
    await Promise.all([loadAuditHistory(), loadActionItems(), loadStats()]);
    setIsLoadingHistory(false);
  };

  const loadAuditHistory = async () => {
    try {
      const params = currentProject ? `?projectId=${currentProject.id}` : '';
      const res = await fetch(`/api/audit${params}`);
      const data = await res.json();
      if (data.success && data.audits) {
        const sorted = data.audits.sort((a: any, b: any) => new Date(b.auditDate).getTime() - new Date(a.auditDate).getTime());
        setAuditHistory(sorted);
      }
    } catch (error) {
      console.error('Error loading audit history:', error);
    }
  };

  const loadActionItems = async () => {
    try {
      const params = currentProject ? `?projectId=${currentProject.id}` : '';
      const res = await fetch(`/api/actions${params}`);
      const data = await res.json();
      if (data.success && data.data) {
        setActionItems(data.data);
        const counts = { abierta: 0, en_proceso: 0, resuelta: 0, cerrada: 0 };
        data.data.forEach((a: ActionItemData) => {
          if (counts[a.estado as keyof typeof counts] !== undefined) counts[a.estado as keyof typeof counts]++;
        });
        setActionStats(counts);
      }
    } catch (error) {
      console.error('Error loading action items:', error);
    }
  };

  const loadStats = async () => {
    try {
      const params = currentProject ? `?projectId=${currentProject.id}` : '';
      const res = await fetch(`/api/stats${params}`);
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleAddAction = async () => {
    if (!newAction.descripcion.trim()) return;
    try {
      await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sStep: 0,
          miniStep: 0,
          itemId: `MC-${Date.now()}`,
          itemDescription: newAction.descripcion,
          hallazgo: newAction.descripcion,
          responsable: newAction.responsable || null,
          prioridad: newAction.prioridad,
          estado: 'abierta',
          fechaLimite: newAction.fechaLimite || null,
          source: 'mejora_continua',
          projectId: currentProject?.id,
          zoneId: currentZone?.id || null,
        }),
      });
      setNewAction({ descripcion: '', responsable: '', prioridad: 'media', fechaLimite: '' });
      setShowNewAction(false);
      await loadActionItems();
    } catch (error) {
      console.error('Error adding action:', error);
    }
  };

  const handleUpdateActionEstado = async (id: string, estado: string) => {
    try {
      await fetch(`/api/actions?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      });
      await loadActionItems();
    } catch (error) {
      console.error('Error updating action:', error);
    }
  };

  const handleDeleteAction = async (id: string) => {
    try {
      await fetch(`/api/actions?id=${id}`, { method: 'DELETE' });
      await loadActionItems();
    } catch (error) {
      console.error('Error deleting action:', error);
    }
  };

  const totalActions = actionStats.abierta + actionStats.en_proceso + actionStats.resuelta + actionStats.cerrada;

  const weeklyAudits = auditHistory.filter(a => a.auditType === 'weekly');
  const monthlyAudits = auditHistory.filter(a => a.auditType === 'monthly');
  const quarterlyAudits = auditHistory.filter(a => a.auditType === 'quarterly' || (!a.auditType && a.score !== undefined && a.auditorName));

  // Calculate next audit dates
  const getNextAuditDate = (audits: AuditRecord[], months: number) => {
    if (audits.length === 0) return 'Pendiente';
    const lastAudit = new Date(audits[0].auditDate);
    const nextDate = new Date(lastAudit);
    nextDate.setMonth(nextDate.getMonth() + months);
    const today = new Date();
    const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `¡Vencida hace ${Math.abs(diffDays)} días!`;
    if (diffDays === 0) return '¡Hoy!';
    return `En ${diffDays} días (${nextDate.toLocaleDateString('es-ES')})`;
  };

  const getNextWeeklyDate = () => {
    if (weeklyAudits.length === 0) return 'Pendiente';
    const lastAudit = new Date(weeklyAudits[0].auditDate);
    const nextDate = new Date(lastAudit);
    nextDate.setDate(nextDate.getDate() + 7);
    const today = new Date();
    const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `¡Vencida hace ${Math.abs(diffDays)} días!`;
    if (diffDays === 0) return '¡Hoy!';
    return `En ${diffDays} días`;
  };

  const isWeeklyOverdue = () => {
    if (weeklyAudits.length === 0) return true;
    const lastAudit = new Date(weeklyAudits[0].auditDate);
    const nextDate = new Date(lastAudit);
    nextDate.setDate(nextDate.getDate() + 7);
    return nextDate < new Date();
  };

  const isMonthlyOverdue = () => getNextAuditDate(monthlyAudits, 1).includes('Vencida');
  const isQuarterlyOverdue = () => getNextAuditDate(quarterlyAudits, 3).includes('Vencida');

  const handleAuditComplete = () => {
    setShowQuarterlyAudit(false);
    setShowWeeklyAudit(false);
    setShowMonthlyAudit(false);
    loadData();
    fetchProgress();
  };

  const PRIORIDAD_COLORS: Record<string, string> = {
    alta: 'bg-red-100 text-red-800',
    media: 'bg-amber-100 text-amber-800',
    baja: 'bg-green-100 text-green-800',
  };

  const ESTADO_COLORS: Record<string, string> = {
    abierta: 'bg-gray-100 text-gray-800',
    en_proceso: 'bg-blue-100 text-blue-800',
    resuelta: 'bg-green-100 text-green-800',
    cerrada: 'bg-gray-100 text-gray-600',
  };

  const ESTADO_LABELS: Record<string, string> = {
    abierta: 'Abierta',
    en_proceso: 'En proceso',
    resuelta: 'Resuelta',
    cerrada: 'Cerrada',
  };

  const tabs = [
    { key: 'overview', label: 'Resumen', icon: BarChart3 },
    { key: 'weekly', label: 'Semanal', icon: SprayCan },
    { key: 'monthly', label: 'Mensual', icon: Calendar },
    { key: 'quarterly', label: 'Trimestral', icon: ShieldCheck },
    { key: 'actions', label: 'Plan Acción', icon: Zap },
    { key: 'counters', label: 'Contadores', icon: BarChart3 },
  ];

  return (
    <div className="space-y-4">
      {/* Header - only in standalone mode */}
      {!embedded && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => setCurrentView('board')} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Volver al Tablero 5S
            </Button>
          </div>
        </motion.div>
      )}

      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
              <Trophy className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-green-900">Fase de Mejora Continua</h2>
              <p className="text-sm text-green-700 mt-1">
                Taller de implementación completado. La zona está en <strong>mejora continua permanente</strong> con auditorías periódicas, plan de acción y contadores.
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

      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className={isWeeklyOverdue() ? 'border-red-200 bg-red-50' : 'border-blue-100'}>
              <CardContent className="p-3 text-center">
                <SprayCan className={`h-5 w-5 mx-auto mb-1 ${isWeeklyOverdue() ? 'text-red-500' : 'text-blue-500'}`} />
                <p className="text-2xl font-bold text-blue-700">{weeklyAudits.length}</p>
                <p className="text-xs text-muted-foreground">Auditorías Semanales</p>
                <p className={`text-[10px] mt-1 ${isWeeklyOverdue() ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                  {getNextWeeklyDate()}
                </p>
              </CardContent>
            </Card>

            <Card className={isMonthlyOverdue() ? 'border-red-200 bg-red-50' : 'border-purple-100'}>
              <CardContent className="p-3 text-center">
                <Calendar className={`h-5 w-5 mx-auto mb-1 ${isMonthlyOverdue() ? 'text-red-500' : 'text-purple-500'}`} />
                <p className="text-2xl font-bold text-purple-700">{monthlyAudits.length}</p>
                <p className="text-xs text-muted-foreground">Auditorías Mensuales</p>
                <p className={`text-[10px] mt-1 ${isMonthlyOverdue() ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                  {getNextAuditDate(monthlyAudits, 1)}
                </p>
              </CardContent>
            </Card>

            <Card className={isQuarterlyOverdue() ? 'border-red-200 bg-red-50' : 'border-orange-100'}>
              <CardContent className="p-3 text-center">
                <ShieldCheck className={`h-5 w-5 mx-auto mb-1 ${isQuarterlyOverdue() ? 'text-red-500' : 'text-orange-500'}`} />
                <p className="text-2xl font-bold text-orange-700">{quarterlyAudits.length}</p>
                <p className="text-xs text-muted-foreground">Auditorías Trimestrales</p>
                <p className={`text-[10px] mt-1 ${isQuarterlyOverdue() ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                  {getNextAuditDate(quarterlyAudits, 3)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Action plan summary */}
          <Card className="border-orange-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500" />
                Plan de Acción — Resumen
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

          {/* Scoring explanation */}
          <Card>
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold mb-2">Sistema de Puntuación — Todas las Auditorías</h4>
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
                Las anomalías (NOK) detectadas en cualquier auditoría se añaden automáticamente al Plan de Acción.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* WEEKLY TAB */}
      {activeTab === 'weekly' && (
        <div className="space-y-4">
          {/* Weekly audit info */}
          <Card className="border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <SprayCan className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-blue-900">Auditoría Semanal de Limpieza</h3>
                  <p className="text-xs text-muted-foreground">
                    Checklist de limpieza (S3 — Seiso). Se evalúa la limpieza de la zona de forma rápida y periódica.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {weeklyTotalItems} puntos a evaluar · Frecuencia: semanal
                </div>
                <Button
                  onClick={() => setShowWeeklyAudit(true)}
                  className={`gap-1.5 ${isWeeklyOverdue() ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                >
                  <Plus className="h-4 w-4" />
                  {isWeeklyOverdue() ? '¡Pendiente!' : 'Nueva Semanal'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Weekly audit history */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                Historial de Auditorías Semanales
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyAudits.length === 0 ? (
                <div className="text-center py-6">
                  <SprayCan className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay auditorías semanales registradas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {weeklyAudits.map((audit, idx) => (
                    <div key={audit.id} className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${audit.score >= AUDIT_PASS_THRESHOLD ? 'bg-green-100' : 'bg-red-100'}`}>
                          {audit.score >= AUDIT_PASS_THRESHOLD ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">Semana {weeklyAudits.length - idx}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(audit.auditDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                            {' · '}{audit.auditorName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={audit.score >= AUDIT_PASS_THRESHOLD ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {audit.score}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* MONTHLY TAB */}
      {activeTab === 'monthly' && (
        <div className="space-y-4">
          <Card className="border-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-purple-900">Auditoría Mensual 5S</h3>
                  <p className="text-xs text-muted-foreground">
                    Checklist resumido de las 5S. Evalúa los puntos clave de cada S de forma rápida.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {monthlyTotalItems} puntos a evaluar · Frecuencia: mensual
                </div>
                <Button
                  onClick={() => setShowMonthlyAudit(true)}
                  className={`gap-1.5 ${isMonthlyOverdue() ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-purple-500 hover:bg-purple-600 text-white'}`}
                >
                  <Plus className="h-4 w-4" />
                  {isMonthlyOverdue() ? '¡Pendiente!' : 'Nueva Mensual'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-500" />
                Historial de Auditorías Mensuales
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyAudits.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay auditorías mensuales registradas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {monthlyAudits.map((audit, idx) => (
                    <div key={audit.id} className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${audit.score >= AUDIT_PASS_THRESHOLD ? 'bg-green-100' : 'bg-red-100'}`}>
                          {audit.score >= AUDIT_PASS_THRESHOLD ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">Mes {monthlyAudits.length - idx}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(audit.auditDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                            {' · '}{audit.auditorName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={audit.score >= AUDIT_PASS_THRESHOLD ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {audit.score}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* QUARTERLY TAB */}
      {activeTab === 'quarterly' && (
        <div className="space-y-4">
          <Card className={isQuarterlyOverdue() ? 'border-red-200 bg-red-50/30' : 'border-orange-100'}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isQuarterlyOverdue() ? 'bg-red-100' : 'bg-orange-100'}`}>
                  {isQuarterlyOverdue() ? <AlertCircle className="h-5 w-5 text-red-500" /> : <ShieldCheck className="h-5 w-5 text-orange-500" />}
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {isQuarterlyOverdue() ? 'Auditoría Trimestral Pendiente' : 'Auditoría Trimestral 5S Completa'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Checklist completo de las 5S. Detecta estándares y anomalías.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowQuarterlyAudit(true)}
                className={`gap-1.5 ${isQuarterlyOverdue() ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}
              >
                <Plus className="h-4 w-4" />
                Nueva Trimestral
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-500" />
                Historial de Auditorías Trimestrales
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quarterlyAudits.length === 0 ? (
                <div className="text-center py-6">
                  <ShieldCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay auditorías trimestrales registradas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {quarterlyAudits.map((audit, idx) => (
                    <div key={audit.id} className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${audit.score >= AUDIT_PASS_THRESHOLD ? 'bg-green-100' : 'bg-red-100'}`}>
                          {audit.score >= AUDIT_PASS_THRESHOLD ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            Trimestre {quarterlyAudits.length - idx}
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
        </div>
      )}

      {/* ACTIONS TAB */}
      {activeTab === 'actions' && (
        <div className="space-y-4">
          <Card className="border-orange-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-orange-900">Plan de Acción Permanente</h3>
                  <p className="text-xs text-muted-foreground">
                    Todas las anomalías detectadas en auditorías se añaden aquí. Este plan de acción es permanente.
                  </p>
                </div>
                <Button onClick={() => setShowNewAction(!showNewAction)} className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus className="h-4 w-4" /> Nueva Acción
                </Button>
              </div>

              {/* Stats */}
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
            </CardContent>
          </Card>

          {/* New action form */}
          {showNewAction && (
            <Card className="border-orange-200 bg-orange-50/30">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-semibold">Nueva Acción de Mejora</h4>
                <div>
                  <label className="text-xs font-medium">Descripción *</label>
                  <Textarea
                    placeholder="Describa la acción..."
                    value={newAction.descripcion}
                    onChange={e => setNewAction(prev => ({ ...prev, descripcion: e.target.value }))}
                    className="mt-1"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium">Responsable</label>
                    <Input
                      placeholder="Nombre"
                      value={newAction.responsable}
                      onChange={e => setNewAction(prev => ({ ...prev, responsable: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Prioridad</label>
                    <Select
                      value={newAction.prioridad}
                      onValueChange={val => setNewAction(prev => ({ ...prev, prioridad: val }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="baja">Baja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Fecha límite</label>
                    <Input
                      type="date"
                      value={newAction.fechaLimite}
                      onChange={e => setNewAction(prev => ({ ...prev, fechaLimite: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowNewAction(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleAddAction} disabled={!newAction.descripcion.trim()} className="bg-orange-500 hover:bg-orange-600 text-white">
                    Agregar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions list */}
          <div className="space-y-2">
            {actionItems.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Zap className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay acciones de mejora registradas</p>
                  <p className="text-xs text-muted-foreground mt-1">Las anomalías de las auditorías aparecerán aquí automáticamente</p>
                </CardContent>
              </Card>
            ) : (
              actionItems.map((action, idx) => (
                <Card key={action.id} className={`overflow-hidden ${action.estado === 'resuelta' || action.estado === 'cerrada' ? 'opacity-60' : ''}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 mt-0.5">
                        <Badge className={PRIORIDAD_COLORS[action.prioridad] || 'bg-gray-100'}>
                          {action.prioridad}
                        </Badge>
                        <Badge className={ESTADO_COLORS[action.estado] || 'bg-gray-100'}>
                          {ESTADO_LABELS[action.estado] || action.estado}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${action.estado === 'resuelta' || action.estado === 'cerrada' ? 'line-through text-muted-foreground' : ''}`}>
                          {action.hallazgo || action.itemDescription}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {action.responsable && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" /> {action.responsable}
                            </span>
                          )}
                          {action.fechaLimite && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {new Date(action.fechaLimite).toLocaleDateString('es-ES')}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {action.source === 'mejora_continua' ? 'Mejora continua' :
                             action.source === 'actionplan' ? 'Plan de acción' :
                             action.source?.startsWith('auditoria_') ? `Auditoría ${action.source.replace('auditoria_', '')}` :
                             action.source}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Select
                          value={action.estado}
                          onValueChange={val => handleUpdateActionEstado(action.id, val)}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="abierta">Abierta</SelectItem>
                            <SelectItem value="en_proceso">En proceso</SelectItem>
                            <SelectItem value="resuelta">Resuelta</SelectItem>
                            <SelectItem value="cerrada">Cerrada</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-red-600"
                          onClick={() => handleDeleteAction(action.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* COUNTERS TAB */}
      {activeTab === 'counters' && (
        <div className="space-y-4">
          <Card className="border-green-100">
            <CardContent className="p-4">
              <h3 className="font-bold text-green-900 mb-1">Contadores Permanentes</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Los contadores siguen activos desde el taller de implementación y continúan durante la mejora continua.
              </p>

              {stats ? (
                <div className="space-y-4">
                  {/* Global counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-center">
                      <FileText className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-blue-700">{stats.total?.checklistResponses || 0}</p>
                      <p className="text-[10px] text-blue-600 font-medium">Checklists</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50 border border-green-100 text-center">
                      <ShieldCheck className="h-5 w-5 text-green-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-green-700">{stats.total?.auditResults || 0}</p>
                      <p className="text-[10px] text-green-600 font-medium">Auditorías</p>
                    </div>
                    <div className="p-3 rounded-lg bg-orange-50 border border-orange-100 text-center">
                      <Zap className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-orange-700">{stats.total?.actionItems || 0}</p>
                      <p className="text-[10px] text-orange-600 font-medium">Acciones</p>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-100 text-center">
                      <ClipboardList className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-purple-700">{stats.total?.inventory || 0}</p>
                      <p className="text-[10px] text-purple-600 font-medium">Inventario</p>
                    </div>
                    <div className="p-3 rounded-lg bg-cyan-50 border border-cyan-100 text-center">
                      <CheckCircle className="h-5 w-5 text-cyan-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-cyan-700">{stats.total?.completedSteps || 0}</p>
                      <p className="text-[10px] text-cyan-600 font-medium">Pasos Completados</p>
                    </div>
                    <div className="p-3 rounded-lg bg-pink-50 border border-pink-100 text-center">
                      <TrendingUp className="h-5 w-5 text-pink-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-pink-700">{weeklyAudits.length + monthlyAudits.length + quarterlyAudits.length}</p>
                      <p className="text-[10px] text-pink-600 font-medium">Aud. Periódicas</p>
                    </div>
                  </div>

                  {/* Per-S counters */}
                  <h4 className="text-sm font-semibold mt-4">Contadores por S</h4>
                  <div className="space-y-2">
                    {S_STEPS.map(s => {
                      const sData = stats.perS?.[s.id];
                      return (
                        <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg border" style={{ borderColor: `${s.color}30` }}>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: s.color }}>
                            S{s.id}
                          </div>
                          <span className="text-sm font-medium flex-1" style={{ color: s.color }}>{s.name}</span>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{sData?.photos || 0} fotos</span>
                            <span>{sData?.actions || 0} acciones</span>
                            <span>{sData?.completed || 0}/5 pasos</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Cargando contadores...</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Audit modals */}
      <QuarterlyAuditModal
        open={showQuarterlyAudit}
        onClose={handleAuditComplete}
      />

      <PeriodicAuditModal
        open={showWeeklyAudit}
        onClose={handleAuditComplete}
        auditType="weekly"
        sections={weeklySections}
        totalItems={weeklyTotalItems}
        title="Auditoría Semanal de Limpieza"
        subtitle="S3 — Seiso: Evaluación semanal de la limpieza de la zona"
        color="#3B82F6"
        icon={<SprayCan className="h-5 w-5 text-blue-500" />}
      />

      <PeriodicAuditModal
        open={showMonthlyAudit}
        onClose={handleAuditComplete}
        auditType="monthly"
        sections={monthlySections}
        totalItems={monthlyTotalItems}
        title="Auditoría Mensual 5S"
        subtitle="Evaluación mensual resumida de las 5S — Puntos clave por cada S"
        color="#8B5CF6"
        icon={<Calendar className="h-5 w-5 text-purple-500" />}
      />
    </div>
  );
}
