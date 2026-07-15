'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { use5SStore } from '@/lib/store';
import {
  S_STEPS,
  PDCA_STEPS,
  PDCA_TEMPLATES,
  AUDIT_PASS_THRESHOLD,
} from '@/lib/5s-constants';
import type { AuditSection, PDCAStep } from '@/lib/5s-constants';
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
  Play,
  SearchCheck,
  Rocket,
  RotateCcw,
  BookOpen,
  Target,
  Camera,
  Standard as StandardIcon,
} from 'lucide-react';
import QuarterlyAuditModal from './QuarterlyAuditModal';
import PeriodicAuditModal from './PeriodicAuditModal';

// Icon map for PDCA steps
const PDCA_ICONS: Record<string, React.ReactNode> = {
  D: <Play className="h-4 w-4" />,
  P: <ClipboardList className="h-4 w-4" />,
  C: <SearchCheck className="h-4 w-4" />,
  A: <Rocket className="h-4 w-4" />,
};

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
  source?: string;
  createdAt: string;
}

interface MaintenanceViewProps {
  embedded?: boolean;
}

// KPI interface
interface KPIData {
  id: string;
  name: string;
  objective: string;
  actual: number;
  target: number;
  unit: string;
  pdcaStep: number; // 1=D, 2=P, 3=C, 4=A
  frequency: string;
  responsable: string;
  trend: 'up' | 'down' | 'stable';
}

// PDCA Board Item
interface PDCAItem {
  id: string;
  letter: string; // D, P, C, A
  title: string;
  description: string;
  responsable: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string | null;
  createdAt: string;
}

const PRIORIDAD_COLORS: Record<string, string> = {
  alta: 'bg-red-100 text-red-800',
  media: 'bg-amber-100 text-amber-800',
  baja: 'bg-green-100 text-green-800',
};
const ESTADO_COLORS: Record<string, string> = {
  abierta: 'bg-red-100 text-red-700',
  en_proceso: 'bg-amber-100 text-amber-700',
  resuelta: 'bg-green-100 text-green-700',
  cerrada: 'bg-gray-100 text-gray-600',
};
const ESTADO_LABELS: Record<string, string> = {
  abierta: 'Abierta',
  en_proceso: 'En proceso',
  resuelta: 'Resuelta',
  cerrada: 'Cerrada',
};

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
  const [activeTab, setActiveTab] = useState<'overview' | 'weekly' | 'monthly' | 'quarterly' | 'actions' | 'counters' | 'pdca'>('overview');
  const [selectedPDCAStep, setSelectedPDCAStep] = useState<number>(1); // 1=D, 2=P, 3=C, 4=A

  // Action plan form
  const [showNewAction, setShowNewAction] = useState(false);
  const [newAction, setNewAction] = useState({ descripcion: '', responsable: '', prioridad: 'media', fechaLimite: '' });

  // PDCA board items
  const [pdcaItems, setPdcaItems] = useState<PDCAItem[]>([]);
  const [showNewPdcaItem, setShowNewPdcaItem] = useState(false);
  const [newPdcaItem, setNewPdcaItem] = useState({ title: '', description: '', responsable: '', dueDate: '' });

  // KPIs
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [showNewKpi, setShowNewKpi] = useState(false);
  const [newKpi, setNewKpi] = useState({ name: '', objective: '', actual: 0, target: 100, unit: '%', frequency: 'mensual', responsable: '' });

  useEffect(() => {
    loadData();
  }, [currentProject]);

  // Load checklist templates from API and compute weekly/monthly variants
  useEffect(() => {
    const loadChecklists = async () => {
      const templatesMap = await fetchAllChecklistTemplates('auditoria');
      const s3Sections = templatesMap[3] || [];
      setWeeklySections(s3Sections);
      setWeeklyTotalItems(s3Sections.reduce((sum, s) => sum + s.items.length, 0));
      const monthlyList: AuditSection[] = [];
      for (let s = 1; s <= 5; s++) {
        const sSections = templatesMap[s] || [];
        for (const section of sSections) {
          monthlyList.push({ ...section, items: section.items.slice(0, 2) });
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
    } catch (error) { console.error('Error loading audit history:', error); }
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
    } catch (error) { console.error('Error loading action items:', error); }
  };

  const loadStats = async () => {
    try {
      const params = currentProject ? `?projectId=${currentProject.id}` : '';
      const res = await fetch(`/api/stats${params}`);
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (error) { console.error('Error loading stats:', error); }
  };

  const handleAuditComplete = async () => {
    setShowQuarterlyAudit(false);
    setShowWeeklyAudit(false);
    setShowMonthlyAudit(false);
    await loadData();
    if (fetchProgress) fetchProgress();
  };

  const handleAddAction = async () => {
    if (!newAction.descripcion.trim() || !currentProject) return;
    try {
      const res = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.id,
          zoneId: currentZone?.id || null,
          sStep: 0, // 0 = mejora continua
          miniStep: 0,
          itemId: `mc_${Date.now()}`,
          itemDescription: newAction.descripcion,
          hallazgo: newAction.descripcion,
          responsable: newAction.responsable || null,
          prioridad: newAction.prioridad,
          estado: 'abierta',
          fechaLimite: newAction.fechaLimite || null,
          source: 'mejora_continua',
        }),
      });
      if (res.ok) {
        setNewAction({ descripcion: '', responsable: '', prioridad: 'media', fechaLimite: '' });
        setShowNewAction(false);
        await loadActionItems();
      }
    } catch (error) { console.error('Error adding action:', error); }
  };

  const handleUpdateActionEstado = async (actionId: string, newEstado: string) => {
    try {
      const res = await fetch('/api/actions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: actionId, estado: newEstado }),
      });
      if (res.ok) await loadActionItems();
    } catch (error) { console.error('Error updating action:', error); }
  };

  const handleDeleteAction = async (actionId: string) => {
    try {
      const res = await fetch(`/api/actions?id=${actionId}`, { method: 'DELETE' });
      if (res.ok) await loadActionItems();
    } catch (error) { console.error('Error deleting action:', error); }
  };

  // ─── Derived data ────────────────────────────────────────────────────────
  const weeklyAudits = auditHistory.filter(a => a.auditType === 'weekly');
  const monthlyAudits = auditHistory.filter(a => a.auditType === 'monthly');
  const quarterlyAudits = auditHistory.filter(a => a.auditType === 'quarterly');
  const totalActions = Object.values(actionStats).reduce((a, b) => a + b, 0);

  const getNextWeeklyDate = () => {
    if (weeklyAudits.length === 0) return 'Pendiente';
    const last = new Date(weeklyAudits[0].auditDate);
    const next = new Date(last.getTime() + 7 * 24 * 60 * 60 * 1000);
    const diff = Math.ceil((next.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return '¡Vencida!';
    if (diff === 1) return 'Mañana';
    return `En ${diff} días`;
  };

  const getNextAuditDate = (audits: AuditRecord[], months: number) => {
    if (audits.length === 0) return 'Pendiente';
    const last = new Date(audits[0].auditDate);
    const next = new Date(last.getTime() + months * 30 * 24 * 60 * 60 * 1000);
    const diff = Math.ceil((next.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return '¡Vencida!';
    if (diff <= 30) return `En ${diff} días`;
    return next.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  };

  const isWeeklyOverdue = () => {
    if (weeklyAudits.length === 0) return true;
    const last = new Date(weeklyAudits[0].auditDate);
    return Date.now() - last.getTime() > 7 * 24 * 60 * 60 * 1000;
  };

  const isMonthlyOverdue = () => {
    if (monthlyAudits.length === 0) return true;
    const last = new Date(monthlyAudits[0].auditDate);
    return Date.now() - last.getTime() > 30 * 24 * 60 * 60 * 1000;
  };

  const isQuarterlyOverdue = () => {
    if (quarterlyAudits.length === 0) return true;
    const last = new Date(quarterlyAudits[0].auditDate);
    return Date.now() - last.getTime() > 90 * 24 * 60 * 60 * 1000;
  };

  // ─── PDCA handlers ────────────────────────────────────────────────────────
  const handleAddPdcaItem = () => {
    const step = PDCA_STEPS.find(s => s.id === selectedPDCAStep);
    if (!step || !newPdcaItem.title.trim()) return;
    const item: PDCAItem = {
      id: `pdca_${Date.now()}`,
      letter: step.letter,
      title: newPdcaItem.title,
      description: newPdcaItem.description,
      responsable: newPdcaItem.responsable,
      status: 'pending',
      dueDate: newPdcaItem.dueDate || null,
      createdAt: new Date().toISOString(),
    };
    setPdcaItems(prev => [...prev, item]);
    setNewPdcaItem({ title: '', description: '', responsable: '', dueDate: '' });
    setShowNewPdcaItem(false);
  };

  const handleUpdatePdcaStatus = (id: string, status: 'pending' | 'in_progress' | 'completed') => {
    setPdcaItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  };

  const handleDeletePdcaItem = (id: string) => {
    setPdcaItems(prev => prev.filter(i => i.id !== id));
  };

  const handleAddKpi = () => {
    if (!newKpi.name.trim()) return;
    const kpi: KPIData = {
      id: `kpi_${Date.now()}`,
      name: newKpi.name,
      objective: newKpi.objective,
      actual: newKpi.actual,
      target: newKpi.target,
      unit: newKpi.unit,
      pdcaStep: selectedPDCAStep,
      frequency: newKpi.frequency,
      responsable: newKpi.responsable,
      trend: 'stable',
    };
    setKpis(prev => [...prev, kpi]);
    setNewKpi({ name: '', objective: '', actual: 0, target: 100, unit: '%', frequency: 'mensual', responsable: '' });
    setShowNewKpi(false);
  };

  const handleDeleteKpi = (id: string) => {
    setKpis(prev => prev.filter(k => k.id !== id));
  };

  // Get PDCA items for current step
  const currentPdcaItems = pdcaItems.filter(i => i.letter === PDCA_STEPS.find(s => s.id === selectedPDCAStep)?.letter);
  const currentKpis = kpis.filter(k => k.pdcaStep === selectedPDCAStep);

  // Get templates available for current PDCA step
  const availableTemplates = Object.entries(PDCA_TEMPLATES).filter(([, t]) => t.applyTo.includes(selectedPDCAStep));

  // ─── Tab configuration ──────────────────────────────────────────────────────
  const tabs = [
    { key: 'overview', label: 'Resumen', icon: BarChart3 },
    { key: 'pdca', label: 'Ciclo PDCA', icon: RotateCcw },
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

      {/* ─── Phase 6 Header ─── */}
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
              <Trophy className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-green-900">Fase 6 — Mejora Continua</h2>
                <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">1/6</Badge>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Ciclo de Deming <strong>(D-P-C-A)</strong>: Do, Plan, Check, Act. Mejora continua mediante auditorías periódicas, plan de acción y KPIs.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1">
              {PDCA_STEPS.map(s => (
                <div key={s.id} className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: s.color }} title={`${s.letter} — ${s.spanishName}`}>
                  {s.letter}
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

      {/* ─── OVERVIEW TAB ─── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* PDCA cycle visual */}
          <Card className="border-emerald-100">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-emerald-600" />
                Ciclo de Deming — PDCA
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PDCA_STEPS.map(step => (
                  <button
                    key={step.id}
                    onClick={() => { setSelectedPDCAStep(step.id); setActiveTab('pdca'); }}
                    className="p-3 rounded-xl border-2 transition-all hover:shadow-md text-left"
                    style={{ borderColor: step.color, backgroundColor: step.bgColor }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: step.color }}>
                        {step.letter}
                      </div>
                      <div>
                        <p className="text-xs font-bold" style={{ color: step.color }}>{step.name}</p>
                        <p className="text-[10px] text-muted-foreground">{step.spanishName}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">{step.description.slice(0, 60)}...</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

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

      {/* ─── PDCA TAB (Ciclo de Deming) ─── */}
      {activeTab === 'pdca' && (
        <div className="space-y-4">
          {/* PDCA Step selector */}
          <div className="grid grid-cols-4 gap-2">
            {PDCA_STEPS.map(step => (
              <button
                key={step.id}
                onClick={() => setSelectedPDCAStep(step.id)}
                className={`relative p-3 rounded-xl border-2 transition-all text-center ${
                  selectedPDCAStep === step.id
                    ? 'shadow-lg scale-[1.02]'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  borderColor: selectedPDCAStep === step.id ? step.color : `${step.color}40`,
                  backgroundColor: selectedPDCAStep === step.id ? step.bgColor : 'white',
                }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold mx-auto mb-1" style={{ backgroundColor: step.color }}>
                  {step.letter}
                </div>
                <p className="text-xs font-bold" style={{ color: step.color }}>{step.name}</p>
                <p className="text-[10px] text-muted-foreground">{step.spanishName}</p>
                {selectedPDCAStep === step.id && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full" style={{ backgroundColor: step.color }} />
                )}
              </button>
            ))}
          </div>

          {/* Current PDCA step info */}
          {(() => {
            const step = PDCA_STEPS.find(s => s.id === selectedPDCAStep)!;
            return (
              <Card style={{ borderColor: step.color }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: step.color }}>
                      {step.letter}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg" style={{ color: step.color }}>{step.name} — {step.spanishName}</h3>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </div>

                  {/* Templates available in this step */}
                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Plantillas disponibles:</p>
                    <div className="flex flex-wrap gap-2">
                      {availableTemplates.map(([key, t]) => (
                        <Badge key={key} className="text-[10px] py-1" style={{ backgroundColor: step.bgColor, color: step.color, borderColor: step.color }}>
                          {t.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* PDCA Board (Tablero PDCA) — Always visible */}
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-emerald-500" />
                  Tablero PDCA — {PDCA_STEPS.find(s => s.id === selectedPDCAStep)?.letter}
                </CardTitle>
                <Button size="sm" onClick={() => setShowNewPdcaItem(true)} className="gap-1 h-7 text-[10px]" style={{ backgroundColor: PDCA_STEPS.find(s => s.id === selectedPDCAStep)?.color }}>
                  <Plus className="h-3 w-3" /> Nuevo Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showNewPdcaItem && (
                <div className="mb-3 p-3 rounded-lg border bg-gray-50 space-y-2">
                  <div>
                    <label className="text-xs font-medium">Título *</label>
                    <Input placeholder="Título del item..." value={newPdcaItem.title} onChange={e => setNewPdcaItem(p => ({ ...p, title: e.target.value }))} className="mt-1 h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Descripción</label>
                    <Textarea placeholder="Describe el item..." value={newPdcaItem.description} onChange={e => setNewPdcaItem(p => ({ ...p, description: e.target.value }))} className="mt-1 text-xs" rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium">Responsable</label>
                      <Input placeholder="Nombre" value={newPdcaItem.responsable} onChange={e => setNewPdcaItem(p => ({ ...p, responsable: e.target.value }))} className="mt-1 h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Fecha límite</label>
                      <Input type="date" value={newPdcaItem.dueDate} onChange={e => setNewPdcaItem(p => ({ ...p, dueDate: e.target.value }))} className="mt-1 h-8 text-xs" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowNewPdcaItem(false)} className="h-7 text-xs">Cancelar</Button>
                    <Button size="sm" onClick={handleAddPdcaItem} disabled={!newPdcaItem.title.trim()} className="h-7 text-xs" style={{ backgroundColor: PDCA_STEPS.find(s => s.id === selectedPDCAStep)?.color, color: 'white' }}>Agregar</Button>
                  </div>
                </div>
              )}

              {currentPdcaItems.length === 0 ? (
                <div className="text-center py-6">
                  <RotateCcw className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No hay items en este paso del ciclo PDCA</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentPdcaItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg border bg-white">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        item.status === 'completed' ? 'bg-green-100 text-green-700' :
                        item.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {item.status === 'completed' ? <CheckCircle className="h-3.5 w-3.5" /> :
                         item.status === 'in_progress' ? <Clock className="h-3.5 w-3.5" /> :
                         <Plus className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${item.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{item.title}</p>
                        {item.description && <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>}
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.responsable && <span className="text-[10px] text-muted-foreground"><User className="h-2.5 w-2.5 inline mr-0.5" />{item.responsable}</span>}
                          {item.dueDate && <span className="text-[10px] text-muted-foreground"><Calendar className="h-2.5 w-2.5 inline mr-0.5" />{new Date(item.dueDate).toLocaleDateString('es-ES')}</span>}
                        </div>
                      </div>
                      <Select value={item.status} onValueChange={val => handleUpdatePdcaStatus(item.id, val as any)}>
                        <SelectTrigger className="h-6 w-24 text-[10px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="in_progress">En curso</SelectItem>
                          <SelectItem value="completed">Completado</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDeletePdcaItem(item.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan de Acción (D + P steps) */}
          {(selectedPDCAStep === 1 || selectedPDCAStep === 2) && (
            <Card className="border-orange-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-500" />
                  Plan de Acción
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground">
                    {actionItems.length} acciones · {actionStats.abierta} abiertas · {actionStats.en_proceso} en proceso
                  </p>
                  <Button size="sm" onClick={() => setShowNewAction(!showNewAction)} className="gap-1 bg-orange-500 hover:bg-orange-600 text-white h-7 text-[10px]">
                    <Plus className="h-3 w-3" /> Nueva
                  </Button>
                </div>

                {showNewAction && (
                  <div className="mb-3 p-3 rounded-lg border bg-orange-50/30 space-y-2">
                    <div>
                      <label className="text-xs font-medium">Descripción *</label>
                      <Textarea placeholder="Describa la acción..." value={newAction.descripcion} onChange={e => setNewAction(prev => ({ ...prev, descripcion: e.target.value }))} className="mt-1 text-xs" rows={2} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs font-medium">Responsable</label>
                        <Input placeholder="Nombre" value={newAction.responsable} onChange={e => setNewAction(prev => ({ ...prev, responsable: e.target.value }))} className="mt-1 h-8 text-xs" />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Prioridad</label>
                        <Select value={newAction.prioridad} onValueChange={val => setNewAction(prev => ({ ...prev, prioridad: val }))}>
                          <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="media">Media</SelectItem>
                            <SelectItem value="baja">Baja</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium">Fecha límite</label>
                        <Input type="date" value={newAction.fechaLimite} onChange={e => setNewAction(prev => ({ ...prev, fechaLimite: e.target.value }))} className="mt-1 h-8 text-xs" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowNewAction(false)} className="h-7 text-xs">Cancelar</Button>
                      <Button size="sm" onClick={handleAddAction} disabled={!newAction.descripcion.trim()} className="bg-orange-500 hover:bg-orange-600 text-white h-7 text-xs">Agregar</Button>
                    </div>
                  </div>
                )}

                {actionItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No hay acciones de mejora</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {actionItems.slice(0, 10).map(action => (
                      <div key={action.id} className="flex items-center gap-2 p-2 rounded-lg border bg-white text-xs">
                        <Badge className={`${PRIORIDAD_COLORS[action.prioridad] || 'bg-gray-100'} text-[9px] py-0`}>{action.prioridad}</Badge>
                        <span className="flex-1 truncate">{action.hallazgo || action.itemDescription}</span>
                        <Badge className={`${ESTADO_COLORS[action.estado] || 'bg-gray-100'} text-[9px] py-0`}>{ESTADO_LABELS[action.estado] || action.estado}</Badge>
                        <Select value={action.estado} onValueChange={val => handleUpdateActionEstado(action.id, val)}>
                          <SelectTrigger className="h-6 w-20 text-[10px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="abierta">Abierta</SelectItem>
                            <SelectItem value="en_proceso">En proceso</SelectItem>
                            <SelectItem value="resuelta">Resuelta</SelectItem>
                            <SelectItem value="cerrada">Cerrada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Realización de Estándar (P + A steps) */}
          {(selectedPDCAStep === 2 || selectedPDCAStep === 4) && (
            <Card className="border-indigo-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-500" />
                  B — Realización de Estándar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  {selectedPDCAStep === 2
                    ? 'Planificar los estándares a implementar. Definir criterios, procedimientos y métodos de verificación.'
                    : 'Estandarizar las mejoras logradas. Documentar y establecer como norma los procesos que funcionaron.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border bg-indigo-50/30">
                    <p className="text-xs font-semibold text-indigo-700 mb-1">Proceso</p>
                    <ol className="text-[10px] text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Identificar el proceso a estandarizar</li>
                      <li>Documentar el método actual (mejor práctica)</li>
                      <li>Definir criterios de calidad y medición</li>
                      <li>Establecer puntos de verificación</li>
                      <li>Formar al personal en el estándar</li>
                    </ol>
                  </div>
                  <div className="p-3 rounded-lg border bg-indigo-50/30">
                    <p className="text-xs font-semibold text-indigo-700 mb-1">Verificación</p>
                    <ul className="text-[10px] text-muted-foreground space-y-1">
                      <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> ¿El estándar está documentado?</li>
                      <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> ¿El personal está formado?</li>
                      <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> ¿Se puede medir el cumplimiento?</li>
                      <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> ¿Hay fecha de revisión?</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* KPIs (P + C steps) */}
          {(selectedPDCAStep === 2 || selectedPDCAStep === 3) && (
            <Card className="border-teal-100">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-teal-500" />
                    KPIs de Mejora
                  </CardTitle>
                  <Button size="sm" onClick={() => setShowNewKpi(true)} className="gap-1 h-7 text-[10px] bg-teal-500 hover:bg-teal-600 text-white">
                    <Plus className="h-3 w-3" /> Nuevo KPI
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showNewKpi && (
                  <div className="mb-3 p-3 rounded-lg border bg-teal-50/30 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium">Nombre del KPI *</label>
                        <Input placeholder="Ej: Tasa de cumplimiento" value={newKpi.name} onChange={e => setNewKpi(p => ({ ...p, name: e.target.value }))} className="mt-1 h-8 text-xs" />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Objetivo</label>
                        <Input placeholder="Descripción del objetivo" value={newKpi.objective} onChange={e => setNewKpi(p => ({ ...p, objective: e.target.value }))} className="mt-1 h-8 text-xs" />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-xs font-medium">Actual</label>
                        <Input type="number" value={newKpi.actual} onChange={e => setNewKpi(p => ({ ...p, actual: Number(e.target.value) }))} className="mt-1 h-8 text-xs" />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Meta</label>
                        <Input type="number" value={newKpi.target} onChange={e => setNewKpi(p => ({ ...p, target: Number(e.target.value) }))} className="mt-1 h-8 text-xs" />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Unidad</label>
                        <Select value={newKpi.unit} onValueChange={val => setNewKpi(p => ({ ...p, unit: val }))}>
                          <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="%">%</SelectItem>
                            <SelectItem value="uds">Unidades</SelectItem>
                            <SelectItem value="pts">Puntos</SelectItem>
                            <SelectItem value="€">Euros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium">Frecuencia</label>
                        <Select value={newKpi.frequency} onValueChange={val => setNewKpi(p => ({ ...p, frequency: val }))}>
                          <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="semanal">Semanal</SelectItem>
                            <SelectItem value="mensual">Mensual</SelectItem>
                            <SelectItem value="trimestral">Trimestral</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowNewKpi(false)} className="h-7 text-xs">Cancelar</Button>
                      <Button size="sm" onClick={handleAddKpi} disabled={!newKpi.name.trim()} className="bg-teal-500 hover:bg-teal-600 text-white h-7 text-xs">Agregar</Button>
                    </div>
                  </div>
                )}

                {currentKpis.length === 0 ? (
                  <div className="text-center py-4">
                    <Target className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No hay KPIs definidos para este paso</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {selectedPDCAStep === 2 ? 'Define indicadores para medir el éxito de las mejoras planificadas' : 'Verifica el cumplimiento de los KPIs definidos en la fase de Planificación'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentKpis.map(kpi => {
                      const pct = kpi.target > 0 ? Math.round((kpi.actual / kpi.target) * 100) : 0;
                      return (
                        <div key={kpi.id} className="flex items-center gap-3 p-2 rounded-lg border bg-white">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            pct >= 100 ? 'bg-green-100 text-green-700' :
                            pct >= 70 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {pct}%
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{kpi.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {kpi.actual} / {kpi.target} {kpi.unit} · {kpi.frequency}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDeleteKpi(kpi.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── WEEKLY TAB ─── */}
      {activeTab === 'weekly' && (
        <div className="space-y-4">
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
                      <Badge className={audit.score >= AUDIT_PASS_THRESHOLD ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {audit.score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── MONTHLY TAB ─── */}
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
                      <Badge className={audit.score >= AUDIT_PASS_THRESHOLD ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {audit.score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── QUARTERLY TAB ─── */}
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

      {/* ─── ACTIONS TAB ─── */}
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
          {showNewAction && (
            <Card className="border-orange-200 bg-orange-50/30">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-semibold">Nueva Acción de Mejora</h4>
                <div>
                  <label className="text-xs font-medium">Descripción *</label>
                  <Textarea placeholder="Describa la acción..." value={newAction.descripcion} onChange={e => setNewAction(prev => ({ ...prev, descripcion: e.target.value }))} className="mt-1" rows={2} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium">Responsable</label>
                    <Input placeholder="Nombre" value={newAction.responsable} onChange={e => setNewAction(prev => ({ ...prev, responsable: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Prioridad</label>
                    <Select value={newAction.prioridad} onValueChange={val => setNewAction(prev => ({ ...prev, prioridad: val }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="baja">Baja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Fecha límite</label>
                    <Input type="date" value={newAction.fechaLimite} onChange={e => setNewAction(prev => ({ ...prev, fechaLimite: e.target.value }))} className="mt-1" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowNewAction(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleAddAction} disabled={!newAction.descripcion.trim()} className="bg-orange-500 hover:bg-orange-600 text-white">Agregar</Button>
                </div>
              </CardContent>
            </Card>
          )}
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
              actionItems.map((action) => (
                <Card key={action.id} className={`overflow-hidden ${action.estado === 'resuelta' || action.estado === 'cerrada' ? 'opacity-60' : ''}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 mt-0.5">
                        <Badge className={PRIORIDAD_COLORS[action.prioridad] || 'bg-gray-100'}>{action.prioridad}</Badge>
                        <Badge className={ESTADO_COLORS[action.estado] || 'bg-gray-100'}>{ESTADO_LABELS[action.estado] || action.estado}</Badge>
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
                        <Select value={action.estado} onValueChange={val => handleUpdateActionEstado(action.id, val)}>
                          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="abierta">Abierta</SelectItem>
                            <SelectItem value="en_proceso">En proceso</SelectItem>
                            <SelectItem value="resuelta">Resuelta</SelectItem>
                            <SelectItem value="cerrada">Cerrada</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-red-600" onClick={() => handleDeleteAction(action.id)}>
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

      {/* ─── COUNTERS TAB ─── */}
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
      <QuarterlyAuditModal open={showQuarterlyAudit} onClose={handleAuditComplete} />
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
