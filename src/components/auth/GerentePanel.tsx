'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { use5SStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, ShieldCheck, TrendingUp, Zap, Trophy, Building2,
  AlertCircle, CircleDot, CheckCircle2, ChevronDown, ChevronUp,
  Package, ListChecks, MapPin, User, Calendar, AlertTriangle,
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

interface JaulaItem {
  id: string;
  name: string;
  quantity: number;
  quantityUnneeded: number;
  price: number | null;
  jaulaStatus: string;
  jaulaFechaEntrada: string | null;
  jaulaOrigen: string | null;
  jaulaFechaSalida: string | null;
  jaulaDestino: string | null;
  project: { id: string; name: string; company: string };
  extra?: any;
}

interface ActionPlanItem {
  id: string;
  sStep: number;
  itemDescription: string;
  hallazgo: string;
  responsable: string | null;
  prioridad: string;
  estado: string;
  fechaCompromiso: string | null;
  fechaLimite: string | null;
  fechaReal: string | null;
  verificadoPor: string | null;
  projectId: string;
  project?: { id: string; name: string; company: string };
  zone?: { id: string; name: string } | null;
}

type TabType = 'indicadores' | 'jaula' | 'acciones';

export default function GerentePanel() {
  const { setCurrentView, currentUser, projects } = use5SStore();
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('indicadores');

  // Jaula state
  const [jaulaItems, setJaulaItems] = useState<JaulaItem[]>([]);
  const [jaulaFilter, setJaulaFilter] = useState<string>('all');
  const [isLoadingJaula, setIsLoadingJaula] = useState(false);

  // Action plans state
  const [actionPlans, setActionPlans] = useState<ActionPlanItem[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'jaula') loadJaulaItems();
    if (activeTab === 'acciones') loadActionPlans();
  }, [activeTab]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/stats?companyScope=empresa');
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
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

  const loadJaulaItems = async () => {
    setIsLoadingJaula(true);
    try {
      const res = await fetch('/api/inventory?jaulaOnly=true');
      const json = await res.json();
      if (json.success) {
        setJaulaItems(json.data || []);
      }
    } catch (error) {
      console.error('Error loading jaula items:', error);
    } finally {
      setIsLoadingJaula(false);
    }
  };

  const loadActionPlans = async () => {
    setIsLoadingActions(true);
    try {
      const params = new URLSearchParams();
      // Pass gerente role so API returns ALL company actions
      if (currentUser?.id) params.set('userId', currentUser.id);
      if (currentUser?.role) params.set('userRole', currentUser.role);
      const res = await fetch(`/api/actions?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setActionPlans(json.data || []);
      }
    } catch (error) {
      console.error('Error loading action plans:', error);
    } finally {
      setIsLoadingActions(false);
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

  // TASK 8: Count overdue actions
  const today = new Date().toISOString().split('T')[0];
  const overdueActions = actionPlans.filter(a =>
    (a.estado === 'abierta' || a.estado === 'en_proceso')
    && a.fechaLimite
    && new Date(a.fechaLimite).toISOString().split('T')[0] < today
  );

  // Jaula filtering
  const filteredJaulaItems = jaulaFilter === 'all'
    ? jaulaItems
    : jaulaItems.filter(i => i.jaulaStatus === jaulaFilter);
  const totalJaulaValue = filteredJaulaItems.reduce((sum, i) => sum + (i.price || 0) * (i.quantityUnneeded || i.quantity), 0);

  // Action plans filtering & grouping
  const filteredActions = actionFilter === 'all'
    ? actionPlans
    : actionPlans.filter(a => a.estado === actionFilter);

  // Group actions by project
  const actionsByProject = filteredActions.reduce((acc, action) => {
    const projId = action.projectId;
    const projName = action.project?.name || 'Sin proyecto';
    if (!acc[projId]) acc[projId] = { name: projName, actions: [] };
    acc[projId].actions.push(action);
    return acc;
  }, {} as Record<string, { name: string; actions: ActionPlanItem[] }>);

  const getEstadoBadge = (estado: string) => {
    const map: Record<string, { label: string; color: string }> = {
      abierta: { label: 'Abierta', color: 'bg-red-100 text-red-800' },
      en_proceso: { label: 'En proceso', color: 'bg-amber-100 text-amber-800' },
      resuelta: { label: 'Resuelta', color: 'bg-green-100 text-green-800' },
      cerrada: { label: 'Cerrada', color: 'bg-green-100 text-green-800' },
    };
    const info = map[estado] || map['abierta'];
    return <Badge className={info.color}>{info.label}</Badge>;
  };

  const getJaulaStatusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      '': { label: '—', color: 'bg-gray-50 text-gray-400' },
      en_jaula: { label: 'En Jaula', color: 'bg-red-100 text-red-800' },
      reclamado: { label: 'Reclamado', color: 'bg-amber-100 text-amber-800' },
      transferido: { label: 'Transferido', color: 'bg-green-100 text-green-800' },
    };
    const info = map[status] || map[''];
    return <Badge className={info.color}>{info.label}</Badge>;
  };

  const tabs: { key: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'indicadores', label: 'Indicadores', icon: <TrendingUp className="h-4 w-4" /> },
    { key: 'jaula', label: 'Jaula de Excedentes', icon: <Package className="h-4 w-4" />, badge: jaulaItems.length },
    { key: 'acciones', label: 'Planes de Acción', icon: <ListChecks className="h-4 w-4" />, badge: overdueActions.length > 0 ? overdueActions.length : undefined },
  ];

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
              <p className="text-xs text-muted-foreground">Indicadores globales de la empresa ({projects.length} proyectos)</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-indigo-500 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    tab.key === 'acciones' ? 'bg-red-500 text-white' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {/* TAB: Indicadores */}
        {activeTab === 'indicadores' && (
          isLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* 3 Main Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
                  <Card className={`border-2 ${getScoreBg(stats?.auditScore ?? null)}`}>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <ShieldCheck className="h-5 w-5 text-blue-600" />
                        <h3 className="text-sm font-semibold text-gray-700">Resultado Auditorías</h3>
                      </div>
                      <div className="text-center">
                        <p className={`text-4xl font-black ${getScoreColor(stats?.auditScore ?? null)}`}>
                          {stats?.auditScore !== null && stats?.auditScore !== undefined ? `${stats.auditScore}%` : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Puntuación media empresa</p>
                        {stats?.latestAuditScore !== null && stats?.latestAuditScore !== undefined && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs text-muted-foreground">Última: <span className="font-bold">{stats.latestAuditScore}%</span></p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Card className="border-2 bg-emerald-50 border-emerald-200">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                        <h3 className="text-sm font-semibold text-gray-700">Progreso 5S</h3>
                      </div>
                      <div className="text-center">
                        <p className="text-4xl font-black text-emerald-600">{stats?.progressPercent ?? 0}%</p>
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

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Card className="border-2 bg-orange-50 border-orange-200">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="h-5 w-5 text-orange-600" />
                        <h3 className="text-sm font-semibold text-gray-700">Plan de Acción</h3>
                        {overdueActions.length > 0 && (
                          <Badge className="bg-red-500 text-white text-[10px] ml-auto">{overdueActions.length} vencida(s)</Badge>
                        )}
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

              {/* Per-Project Radar Charts */}
              <div className="flex items-center gap-3 mt-8">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                <h2 className="text-sm font-black text-gray-600 uppercase tracking-widest">
                  Indicador 5S por Zona / Proyecto
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
              </div>

              {stats?.perProjectBreakdown && stats.perProjectBreakdown.length > 0 ? (
                <div className="space-y-6">
                  {stats.perProjectBreakdown.map((proj, idx) => (
                    <motion.div key={proj.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + idx * 0.05 }}>
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
                            {expandedProject === proj.id ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                          </div>
                        </div>
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
                  </CardContent>
                </Card>
              )}
            </div>
          )
        )}

        {/* TAB: Jaula de Excedentes */}
        {activeTab === 'jaula' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-red-600" />
                <h2 className="text-lg font-bold text-gray-900">Jaula de Excedentes Global</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Filtrar por estado:</span>
                <Select value={jaulaFilter} onValueChange={setJaulaFilter}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="en_jaula">En Jaula</SelectItem>
                    <SelectItem value="reclamado">Reclamado</SelectItem>
                    <SelectItem value="transferido">Transferido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoadingJaula ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
              </div>
            ) : filteredJaulaItems.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center">
                  <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No hay elementos en la jaula de excedentes</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Elemento</TableHead>
                        <TableHead className="text-xs">Cantidad</TableHead>
                        <TableHead className="text-xs">Precio</TableHead>
                        <TableHead className="text-xs">Proyecto/Origen</TableHead>
                        <TableHead className="text-xs">F. Entrada</TableHead>
                        <TableHead className="text-xs">Estado</TableHead>
                        <TableHead className="text-xs">F. Salida</TableHead>
                        <TableHead className="text-xs">Destino</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredJaulaItems.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs font-medium">{item.name}</TableCell>
                          <TableCell className="text-xs text-center">{item.quantityUnneeded || item.quantity}</TableCell>
                          <TableCell className="text-xs text-right">{item.price ? `${(item.price * (item.quantityUnneeded || item.quantity)).toFixed(2)} €` : '—'}</TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-gray-400" />
                              {item.project?.name || item.jaulaOrigen || '—'}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{item.jaulaFechaEntrada ? new Date(item.jaulaFechaEntrada).toLocaleDateString('es-ES') : '—'}</TableCell>
                          <TableCell>{getJaulaStatusBadge(item.jaulaStatus)}</TableCell>
                          <TableCell className="text-xs">{item.jaulaFechaSalida ? new Date(item.jaulaFechaSalida).toLocaleDateString('es-ES') : '—'}</TableCell>
                          <TableCell className="text-xs">{item.jaulaDestino || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex gap-6 text-sm">
                  <span className="text-gray-700">Total elementos: <strong>{filteredJaulaItems.length}</strong></span>
                  <span className="text-gray-700">Valor total: <strong className="text-red-600">{totalJaulaValue.toFixed(2)} €</strong></span>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB: Planes de Acción */}
        {activeTab === 'acciones' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-orange-600" />
                <h2 className="text-lg font-bold text-gray-900">Planes de Acción</h2>
                {overdueActions.length > 0 && (
                  <Badge className="bg-red-500 text-white">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {overdueActions.length} vencida(s)
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Filtrar:</span>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="abierta">Abierta</SelectItem>
                    <SelectItem value="en_proceso">En proceso</SelectItem>
                    <SelectItem value="resuelta">Resuelta</SelectItem>
                    <SelectItem value="cerrada">Cerrada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoadingActions ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
              </div>
            ) : filteredActions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center">
                  <ListChecks className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No hay planes de acción</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(actionsByProject).map(([projId, projData]) => {
                  // Group by zone within project
                  const byZone = projData.actions.reduce((acc, action) => {
                    const zoneName = action.zone?.name || 'Sin zona';
                    if (!acc[zoneName]) acc[zoneName] = [];
                    acc[zoneName].push(action);
                    return acc;
                  }, {} as Record<string, ActionPlanItem[]>);

                  const projOverdue = projData.actions.filter(a =>
                    (a.estado === 'abierta' || a.estado === 'en_proceso')
                    && a.fechaLimite
                    && new Date(a.fechaLimite).toISOString().split('T')[0] < today
                  );

                  return (
                    <Card key={projId} className="overflow-hidden">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-indigo-500" />
                            <CardTitle className="text-sm font-bold">{projData.name}</CardTitle>
                            <Badge variant="secondary" className="text-xs">{projData.actions.length} acciones</Badge>
                          </div>
                          {projOverdue.length > 0 && (
                            <Badge className="bg-red-100 text-red-800 text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {projOverdue.length} vencida(s)
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 pt-0">
                        {Object.entries(byZone).map(([zoneName, zoneActions]) => (
                          <div key={zoneName} className="mb-4">
                            <div className="flex items-center gap-1.5 mb-2">
                              <MapPin className="h-3.5 w-3.5 text-purple-500" />
                              <span className="text-xs font-semibold text-purple-700">{zoneName}</span>
                              <Badge variant="outline" className="text-[10px] h-4">{zoneActions.length}</Badge>
                            </div>
                            <div className="space-y-1.5">
                              {zoneActions.map(action => {
                                const isOverdue = (action.estado === 'abierta' || action.estado === 'en_proceso')
                                  && action.fechaLimite
                                  && new Date(action.fechaLimite).toISOString().split('T')[0] < today;
                                return (
                                  <div
                                    key={action.id}
                                    className={`flex items-center gap-3 p-2 rounded-lg border text-xs ${
                                      isOverdue ? 'border-red-200 bg-red-50/50' : 'border-gray-100 bg-white'
                                    }`}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">{action.itemDescription || action.hallazgo}</p>
                                      <div className="flex items-center gap-3 mt-1 flex-wrap text-muted-foreground">
                                        {action.responsable && (
                                          <span className="flex items-center gap-1">
                                            <User className="h-3 w-3" /> {action.responsable}
                                          </span>
                                        )}
                                        {action.fechaCompromiso && (
                                          <span className="flex items-center gap-1 text-blue-600">
                                            <Calendar className="h-3 w-3" /> {new Date(action.fechaCompromiso).toLocaleDateString('es-ES')}
                                          </span>
                                        )}
                                        {action.fechaLimite && (
                                          <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-bold' : ''}`}>
                                            <Calendar className="h-3 w-3" /> Límite: {new Date(action.fechaLimite).toLocaleDateString('es-ES')}
                                          </span>
                                        )}
                                        {action.verificadoPor && (
                                          <span className="flex items-center gap-1 text-green-600">
                                            <CheckCircle2 className="h-3 w-3" /> Verif: {action.verificadoPor}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {getEstadoBadge(action.estado)}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
