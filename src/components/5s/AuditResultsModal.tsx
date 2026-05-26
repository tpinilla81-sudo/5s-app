'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ShieldCheck, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight,
  MapPin, User, Calendar, TrendingUp, Clock, Filter,
} from 'lucide-react';
import { use5SStore } from '@/lib/store';
import { S_STEPS } from '@/lib/5s-constants';

interface AuditRecord {
  id: string;
  sStep: number;
  auditorName: string;
  result: string;
  score: number | null;
  observations: string | null;
  auditType: string;
  checklistData: string | null;
  mejorasData: string | null;
  auditDate: string;
  projectId: string;
}

interface ActionRecord {
  id: string;
  sStep: number;
  miniStep: number;
  itemId: string;
  itemDescription: string;
  hallazgo: string;
  mejora: string | null;
  responsable: string | null;
  prioridad: string;
  estado: string;
  fechaCompromiso: string | null;
  fechaLimite: string | null;
  fechaReal: string | null;
  fechaResolucion: string | null;
  source: string;
  auditor: string | null;
  zoneId: string | null;
  verificadoPor: string | null;
  porcentaje: number | null;
  accionCorrectiva: string | null;
  accionesPreventivas: string | null;
  zone: { id: string; name: string } | null;
  // Plan de Acción fields
  numeroEntrada: number | null;
  comunicadoPor: string | null;
  semana: string | null;
  seccionDemandante: string | null;
  clienteZona: string | null;
  semanaPrevista: string | null;
  semanaReal: string | null;
}

interface AuditResultsModalProps {
  open: boolean;
  onClose: () => void;
}

type TabValue = 'resumen' | 'disfunciones' | 'seguimiento';

export default function AuditResultsModal({ open, onClose }: AuditResultsModalProps) {
  const { currentProject, currentZone, currentUser } = use5SStore();
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>('resumen');
  const [filterSStep, setFilterSStep] = useState<string>('all');
  const [filterZone, setFilterZone] = useState<string>('all');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null);
  const [zones, setZones] = useState<{ id: string; name: string; color: string }[]>([]);

  useEffect(() => {
    if (open) {
      loadData();
      loadZones();
    }
  }, [open, currentProject]);

  const loadZones = async () => {
    if (!currentProject) return;
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/zones`);
      if (res.ok) {
        const json = await res.json();
        setZones(json.zones || json.data || []);
      }
    } catch (e) {
      console.error('Error loading zones:', e);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const projectIdParam = currentProject?.id ? `?projectId=${currentProject.id}` : '';

      // Load all audits for the project
      const auditRes = await fetch(`/api/audit${projectIdParam ? projectIdParam + '&sStep=0'.replace('sStep=0&', '') : '?sStep=0'}`);
      // Actually load audits for all S steps
      const [s1Audits, s2Audits, s3Audits, s4Audits, s5Audits, quarterlyAudits] = await Promise.all([
        fetch(`/api/audit?sStep=1${currentProject?.id ? `&projectId=${currentProject.id}` : ''}`).then(r => r.json()),
        fetch(`/api/audit?sStep=2${currentProject?.id ? `&projectId=${currentProject.id}` : ''}`).then(r => r.json()),
        fetch(`/api/audit?sStep=3${currentProject?.id ? `&projectId=${currentProject.id}` : ''}`).then(r => r.json()),
        fetch(`/api/audit?sStep=4${currentProject?.id ? `&projectId=${currentProject.id}` : ''}`).then(r => r.json()),
        fetch(`/api/audit?sStep=5${currentProject?.id ? `&projectId=${currentProject.id}` : ''}`).then(r => r.json()),
        fetch(`/api/audit?sStep=0${currentProject?.id ? `&projectId=${currentProject.id}` : ''}`).then(r => r.json()),
      ]);

      const allAudits: AuditRecord[] = [
        ...(s1Audits.audits || []),
        ...(s2Audits.audits || []),
        ...(s3Audits.audits || []),
        ...(s4Audits.audits || []),
        ...(s5Audits.audits || []),
        ...(quarterlyAudits.audits || []),
      ];

      // Sort by date descending
      allAudits.sort((a, b) => new Date(b.auditDate).getTime() - new Date(a.auditDate).getTime());
      setAudits(allAudits);

      // Load all action items from audits
      const actionsParams = new URLSearchParams();
      if (currentProject?.id) actionsParams.set('projectId', currentProject.id);
      if (currentUser?.id) actionsParams.set('userId', currentUser.id);
      if (currentUser?.role) actionsParams.set('userRole', currentUser.role);
      const actionsRes = await fetch(`/api/actions?${actionsParams.toString()}`);
      const actionsJson = await actionsRes.json();
      if (actionsJson.success) {
        setActions(actionsJson.data || []);
      }
    } catch (error) {
      console.error('Error loading audit results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Per-zone scores
  const zoneScores = useMemo(() => {
    const result: Record<string, { name: string; scores: number[]; latest: number | null }> = {};

    // Overall score
    const allScores = audits.filter(a => a.score !== null).map(a => a.score!);
    result['__overall'] = {
      name: 'Auditoría (Media)',
      scores: allScores,
      latest: allScores.length > 0 ? allScores[0] : null,
    };

    // Per-zone scores from action items (using zone info)
    for (const zone of zones) {
      const zoneActions = actions.filter(a => a.zoneId === zone.id);
      // Get audits that might relate to this zone via their NOK items
      // Since audits don't have zoneId directly, we infer from action items
      result[zone.id] = {
        name: zone.name,
        scores: [],
        latest: null,
      };
    }

    // Calculate per-S-step scores
    for (let s = 1; s <= 5; s++) {
      const sAudits = audits.filter(a => a.sStep === s && a.score !== null);
      const sScores = sAudits.map(a => a.score!);
      const sStepData = S_STEPS.find(step => step.id === s);
      result[`__s${s}`] = {
        name: `S${s} ${sStepData?.name || ''}`,
        scores: sScores,
        latest: sScores.length > 0 ? sScores[0] : null,
      };
    }

    return result;
  }, [audits, actions, zones]);

  // Audit-related disfunciones (action items from audits)
  const auditDisfunciones = useMemo(() => {
    return actions.filter(a =>
      a.source === 'auditoria' ||
      a.source === 'auditoria_quarterly' ||
      a.source === 'auditoria_weekly' ||
      a.source === 'auditoria_monthly' ||
      a.source?.startsWith('auditoria')
    );
  }, [actions]);

  // Apply filters
  const filteredDisfunciones = useMemo(() => {
    let filtered = [...auditDisfunciones];

    if (filterSStep !== 'all') {
      filtered = filtered.filter(a => a.sStep === parseInt(filterSStep));
    }
    if (filterZone !== 'all') {
      filtered = filtered.filter(a => a.zoneId === filterZone || a.zone?.name === filterZone);
    }
    if (filterEstado !== 'all') {
      filtered = filtered.filter(a => a.estado === filterEstado);
    }

    return filtered;
  }, [auditDisfunciones, filterSStep, filterZone, filterEstado]);

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

  const getEstadoBadge = (estado: string) => {
    const map: Record<string, { label: string; color: string }> = {
      abierta: { label: 'Abierta', color: 'bg-red-100 text-red-800' },
      en_proceso: { label: 'En Proceso', color: 'bg-amber-100 text-amber-800' },
      resuelta: { label: 'Resuelta', color: 'bg-green-100 text-green-800' },
      cerrada: { label: 'Cerrada', color: 'bg-gray-100 text-gray-600' },
    };
    const info = map[estado] || map['abierta'];
    return <Badge className={info.color}>{info.label}</Badge>;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-ES');
  };

  // Stats
  const totalDisfunciones = auditDisfunciones.length;
  const abiertas = auditDisfunciones.filter(a => a.estado === 'abierta').length;
  const enProceso = auditDisfunciones.filter(a => a.estado === 'en_proceso').length;
  const resueltas = auditDisfunciones.filter(a => a.estado === 'resuelta' || a.estado === 'cerrada').length;

  // Per-zone aggregate scores (from latest audit per zone)
  const zoneAggScores = useMemo(() => {
    const result: { zoneName: string; avgScore: number | null; latestScore: number | null; auditCount: number }[] = [];

    // Overall
    const allAuditScores = audits.filter(a => a.score !== null && a.sStep >= 1 && a.sStep <= 5);
    if (allAuditScores.length > 0) {
      const avg = allAuditScores.reduce((s, a) => s + (a.score || 0), 0) / allAuditScores.length;
      result.push({
        zoneName: 'Auditoría (Media Global)',
        avgScore: Math.round(avg * 10) / 10,
        latestScore: allAuditScores[0]?.score || null,
        auditCount: allAuditScores.length,
      });
    }

    // Per S-step
    for (let s = 1; s <= 5; s++) {
      const sAudits = audits.filter(a => a.sStep === s && a.score !== null);
      if (sAudits.length > 0) {
        const avg = sAudits.reduce((sum, a) => sum + (a.score || 0), 0) / sAudits.length;
        const sData = S_STEPS.find(step => step.id === s);
        result.push({
          zoneName: `${sData?.name || `S${s}`}`,
          avgScore: Math.round(avg * 10) / 10,
          latestScore: sAudits[0]?.score || null,
          auditCount: sAudits.length,
        });
      }
    }

    // Per zone (from action items, we infer which zone each audit relates to)
    for (const zone of zones) {
      const zoneActionItems = auditDisfunciones.filter(a => a.zoneId === zone.id);
      if (zoneActionItems.length > 0 || zones.length > 0) {
        // Get the latest audit score for this zone
        // Since audits don't store zoneId, we calculate from NOK action items
        const zoneAuditIds = new Set(zoneActionItems.map(a => a.source + '_' + a.sStep));
        const latestScore = null; // Would need audit-zone relationship

        result.push({
          zoneName: zone.name,
          avgScore: latestScore,
          latestScore: latestScore,
          auditCount: zoneActionItems.length,
        });
      }
    }

    return result;
  }, [audits, auditDisfunciones, zones]);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <span>Resultados de Auditoría</span>
            <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
              {audits.length} auditorías
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-3">
          {/* Tabs */}
          <div className="flex gap-1 border-b pb-1">
            {[
              { key: 'resumen' as TabValue, label: 'Resumen', icon: <TrendingUp className="h-4 w-4" /> },
              { key: 'disfunciones' as TabValue, label: 'Disfunciones', icon: <AlertTriangle className="h-4 w-4" />, badge: abiertas },
              { key: 'seguimiento' as TabValue, label: 'Seguimiento', icon: <CheckCircle2 className="h-4 w-4" /> },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* TAB: Resumen */}
              {activeTab === 'resumen' && (
                <div className="space-y-4 overflow-auto flex-1">
                  {/* Score cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {zoneAggScores.map((item, idx) => (
                      <Card key={idx} className={`border-2 ${getScoreBg(item.avgScore)}`}>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <p className={`text-3xl font-black ${getScoreColor(item.avgScore)}`}>
                              {item.avgScore !== null ? `${item.avgScore}%` : '—'}
                            </p>
                            <p className="text-xs font-semibold text-gray-700 mt-1">{item.zoneName}</p>
                            {item.latestScore !== null && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Última: {item.latestScore}%
                              </p>
                            )}
                            {item.auditCount > 0 && (
                              <p className="text-[10px] text-muted-foreground">
                                {item.auditCount} auditoría(s)
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="border-2 bg-red-50 border-red-200">
                      <CardContent className="p-3 text-center">
                        <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                        <p className="text-2xl font-black text-red-600">{abiertas}</p>
                        <p className="text-xs font-semibold text-red-700">Abiertas</p>
                      </CardContent>
                    </Card>
                    <Card className="border-2 bg-amber-50 border-amber-200">
                      <CardContent className="p-3 text-center">
                        <Clock className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                        <p className="text-2xl font-black text-amber-600">{enProceso}</p>
                        <p className="text-xs font-semibold text-amber-700">En Proceso</p>
                      </CardContent>
                    </Card>
                    <Card className="border-2 bg-green-50 border-green-200">
                      <CardContent className="p-3 text-center">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
                        <p className="text-2xl font-black text-green-600">{resueltas}</p>
                        <p className="text-xs font-semibold text-green-700">Resueltas</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent audit history */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-2">Historial de Auditorías</h3>
                    <div className="space-y-2 max-h-64 overflow-auto">
                      {audits.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No hay auditorías registradas</p>
                      ) : (
                        audits.slice(0, 20).map(audit => {
                          const sStepData = S_STEPS.find(s => s.id === audit.sStep);
                          const isExpanded = expandedAudit === audit.id;

                          // Parse NOK items from checklistData
                          let nokItems: Array<{ itemId: string; hallazgo?: string; mejora?: string }> = [];
                          try {
                            if (audit.checklistData) {
                              const parsed = typeof audit.checklistData === 'string' ? JSON.parse(audit.checklistData) : audit.checklistData;
                              if (Array.isArray(parsed)) {
                                nokItems = parsed.filter((r: any) => r.status === 'nok');
                              } else if (typeof parsed === 'object') {
                                nokItems = Object.values(parsed).filter((r: any) => r.status === 'nok') as any[];
                              }
                            }
                          } catch {}

                          return (
                            <div key={audit.id} className={`rounded-lg border text-xs ${
                              audit.result === 'apto' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                            }`}>
                              <button
                                className="w-full p-2.5 flex items-center gap-2 hover:bg-black/5 transition-colors text-left"
                                onClick={() => setExpandedAudit(isExpanded ? null : audit.id)}
                              >
                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                <Badge className={audit.result === 'apto' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                  {audit.result === 'apto' ? 'Apto' : 'No Apto'}
                                </Badge>
                                {audit.score !== null && (
                                  <Badge variant="outline" className="text-[10px] font-bold">{audit.score}%</Badge>
                                )}
                                {sStepData && (
                                  <Badge variant="outline" style={{ borderColor: sStepData.color, color: sStepData.color }} className="text-[10px]">
                                    {sStepData.name}
                                  </Badge>
                                )}
                                <span className="text-muted-foreground ml-auto">
                                  {new Date(audit.auditDate).toLocaleDateString('es-ES')} — {audit.auditorName}
                                </span>
                              </button>

                              {isExpanded && (
                                <div className="px-3 pb-3 pt-0 space-y-2 border-t border-inherit">
                                  {audit.observations && (
                                    <p className="text-muted-foreground italic mt-2">"{audit.observations}"</p>
                                  )}
                                  {nokItems.length > 0 && (
                                    <div className="mt-2">
                                      <p className="font-semibold text-red-700 mb-1">
                                        Disfunciones detectadas ({nokItems.length}):
                                      </p>
                                      {nokItems.map((nok, nIdx) => (
                                        <div key={nIdx} className="pl-3 py-0.5 text-red-600">
                                          <span className="font-medium">{nok.itemId}</span>
                                          {nok.hallazgo && <span> — {nok.hallazgo}</span>}
                                          {nok.mejora && <span className="text-amber-600"> → Mejora: {nok.mejora}</span>}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Related action items for this audit */}
                                  {(() => {
                                    const relatedActions = auditDisfunciones.filter(a =>
                                      a.sStep === audit.sStep &&
                                      a.source?.startsWith('auditoria')
                                    ).slice(0, 10);

                                    if (relatedActions.length === 0) return null;

                                    return (
                                      <div className="mt-2">
                                        <p className="font-semibold text-blue-700 mb-1">
                                          Plan de Acción relacionado:
                                        </p>
                                        <div className="space-y-1">
                                          {relatedActions.map(action => (
                                            <div key={action.id} className="flex items-center gap-2 p-1.5 rounded bg-white/80 border text-[11px]">
                                              <div className="flex-1 min-w-0">
                                                <span className="font-medium">{action.hallazgo || action.itemDescription}</span>
                                                <div className="flex items-center gap-2 mt-0.5 text-muted-foreground flex-wrap">
                                                  {action.responsable && (
                                                    <span className="flex items-center gap-0.5">
                                                      <User className="h-3 w-3" /> {action.responsable}
                                                    </span>
                                                  )}
                                                  {action.fechaCompromiso && (
                                                    <span className="flex items-center gap-0.5 text-blue-600">
                                                      <Calendar className="h-3 w-3" /> Compromiso: {formatDate(action.fechaCompromiso)}
                                                    </span>
                                                  )}
                                                  {action.fechaReal && (
                                                    <span className="flex items-center gap-0.5 text-green-600">
                                                      <Calendar className="h-3 w-3" /> Cierre real: {formatDate(action.fechaReal)}
                                                    </span>
                                                  )}
                                                  {action.fechaResolucion && (
                                                    <span className="flex items-center gap-0.5 text-green-600">
                                                      <CheckCircle2 className="h-3 w-3" /> Resolución: {formatDate(action.fechaResolucion)}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              {getEstadoBadge(action.estado)}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Disfunciones */}
              {activeTab === 'disfunciones' && (
                <div className="space-y-3 overflow-auto flex-1">
                  {/* Filters */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={filterSStep} onValueChange={setFilterSStep}>
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue placeholder="Todas S" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las S</SelectItem>
                        {S_STEPS.map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>S{s.id} - {s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterZone} onValueChange={setFilterZone}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="Todas zonas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las zonas</SelectItem>
                        {zones.map(z => (
                          <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterEstado} onValueChange={setFilterEstado}>
                      <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="abierta">Abierta</SelectItem>
                        <SelectItem value="en_proceso">En Proceso</SelectItem>
                        <SelectItem value="resuelta">Resuelta</SelectItem>
                        <SelectItem value="cerrada">Cerrada</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground ml-auto">
                      Mostrando {filteredDisfunciones.length} de {totalDisfunciones}
                    </span>
                  </div>

                  {/* Disfunciones list */}
                  <div className="space-y-2">
                    {filteredDisfunciones.length === 0 ? (
                      <div className="text-center py-12">
                        <CheckCircle2 className="h-10 w-10 text-green-300 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No hay disfunciones que coincidan con los filtros</p>
                      </div>
                    ) : (
                      filteredDisfunciones.map(action => {
                        const sStepData = S_STEPS.find(s => s.id === action.sStep);
                        const isOverdue = (action.estado === 'abierta' || action.estado === 'en_proceso')
                          && action.fechaLimite
                          && new Date(action.fechaLimite).toISOString().split('T')[0] < new Date().toISOString().split('T')[0];

                        return (
                          <Card key={action.id} className={`overflow-hidden ${isOverdue ? 'border-red-300 bg-red-50/30' : ''}`}>
                            <CardContent className="p-3 space-y-2">
                              {/* Header row */}
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {sStepData && (
                                      <Badge variant="outline" style={{ borderColor: sStepData.color, color: sStepData.color }} className="text-[10px]">
                                        S{action.sStep}
                                      </Badge>
                                    )}
                                    <span className="font-semibold text-sm">{action.hallazgo || action.itemDescription}</span>
                                    {isOverdue && (
                                      <Badge className="bg-red-500 text-white text-[10px]">
                                        <AlertTriangle className="h-3 w-3 mr-0.5" /> Vencida
                                      </Badge>
                                    )}
                                  </div>
                                  {action.itemDescription && action.hallazgo && action.itemDescription !== action.hallazgo && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{action.itemDescription}</p>
                                  )}
                                </div>
                                <div className="shrink-0">
                                  {getEstadoBadge(action.estado)}
                                </div>
                              </div>

                              {/* Detail grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                {/* Concepto */}
                                <div>
                                  <span className="text-muted-foreground font-medium">Concepto</span>
                                  <p className="font-medium truncate">{action.hallazgo || '—'}</p>
                                </div>
                                {/* Plan de acción */}
                                <div>
                                  <span className="text-muted-foreground font-medium">Plan de Acción</span>
                                  <p className="font-medium truncate">{action.accionCorrectiva || action.mejora || '—'}</p>
                                </div>
                                {/* Responsable */}
                                <div>
                                  <span className="text-muted-foreground font-medium">Responsable</span>
                                  <p className="flex items-center gap-1 truncate">
                                    <User className="h-3 w-3 shrink-0" />
                                    {action.responsable || 'Sin asignar'}
                                  </p>
                                </div>
                                {/* Zona */}
                                <div>
                                  <span className="text-muted-foreground font-medium">Zona</span>
                                  <p className="flex items-center gap-1 truncate">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    {action.zone?.name || '—'}
                                  </p>
                                </div>
                                {/* Fecha compromiso */}
                                <div>
                                  <span className="text-muted-foreground font-medium">Fecha Compromiso</span>
                                  <p className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3 shrink-0 text-blue-500" />
                                    {formatDate(action.fechaCompromiso)}
                                  </p>
                                </div>
                                {/* Fecha real cierre */}
                                <div>
                                  <span className="text-muted-foreground font-medium">Fecha Real Cierre</span>
                                  <p className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3 shrink-0 text-green-500" />
                                    {formatDate(action.fechaReal || action.fechaResolucion)}
                                  </p>
                                </div>
                                {/* Acciones preventivas */}
                                <div>
                                  <span className="text-muted-foreground font-medium">Acciones Preventivas</span>
                                  <p className="truncate">{action.accionesPreventivas || '—'}</p>
                                </div>
                                {/* Verificado por */}
                                <div>
                                  <span className="text-muted-foreground font-medium">Verificado Por</span>
                                  <p className="truncate">{action.verificadoPor || '—'}</p>
                                </div>
                              </div>

                              {/* Progress bar if en_proceso */}
                              {(action.porcentaje !== null && action.porcentaje > 0) && (
                                <div className="flex items-center gap-2 text-xs">
                                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-blue-500 rounded-full transition-all"
                                      style={{ width: `${Math.min(action.porcentaje, 100)}%` }}
                                    />
                                  </div>
                                  <span className="font-medium">{action.porcentaje}%</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB: Seguimiento */}
              {activeTab === 'seguimiento' && (
                <div className="space-y-4 overflow-auto flex-1">
                  {/* Per-S-step progress */}
                  {S_STEPS.map(sStep => {
                    const sActions = auditDisfunciones.filter(a => a.sStep === sStep.id);
                    if (sActions.length === 0) return null;

                    const sAbiertas = sActions.filter(a => a.estado === 'abierta').length;
                    const sEnProceso = sActions.filter(a => a.estado === 'en_proceso').length;
                    const sResueltas = sActions.filter(a => a.estado === 'resuelta' || a.estado === 'cerrada').length;
                    const sProgress = sActions.length > 0 ? Math.round((sResueltas / sActions.length) * 100) : 0;

                    // Latest audit score
                    const sAudits = audits.filter(a => a.sStep === sStep.id && a.score !== null);
                    const latestScore = sAudits.length > 0 ? sAudits[0].score : null;

                    return (
                      <Card key={sStep.id} className="overflow-hidden">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sStep.color }} />
                              <span className="font-bold" style={{ color: sStep.color }}>
                                {sStep.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({sStep.japaneseName} - {sStep.spanishName})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {latestScore !== null && (
                                <Badge variant="outline" className={`text-xs font-bold ${getScoreColor(latestScore)}`}>
                                  Auditoría: {latestScore}%
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${sProgress}%`,
                                  backgroundColor: sStep.color,
                                }}
                              />
                            </div>
                            <span className="text-sm font-bold" style={{ color: sStep.color }}>{sProgress}%</span>
                          </div>

                          {/* Stats */}
                          <div className="flex gap-4 text-xs">
                            <span className="text-red-600 font-medium">{sAbiertas} abiertas</span>
                            <span className="text-amber-600 font-medium">{sEnProceso} en proceso</span>
                            <span className="text-green-600 font-medium">{sResueltas} resueltas</span>
                            <span className="text-muted-foreground">({sActions.length} total)</span>
                          </div>

                          {/* Actions list */}
                          <div className="space-y-1 max-h-48 overflow-auto">
                            {sActions.map(action => {
                              const isOverdue = (action.estado === 'abierta' || action.estado === 'en_proceso')
                                && action.fechaLimite
                                && new Date(action.fechaLimite).toISOString().split('T')[0] < new Date().toISOString().split('T')[0];

                              return (
                                <div key={action.id} className={`flex items-center gap-2 p-1.5 rounded text-xs ${
                                  isOverdue ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-100'
                                }`}>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium truncate block">{action.hallazgo || action.itemDescription}</span>
                                    <div className="flex items-center gap-2 mt-0.5 text-muted-foreground flex-wrap">
                                      {action.responsable && (
                                        <span><User className="h-3 w-3 inline" /> {action.responsable}</span>
                                      )}
                                      {action.fechaCompromiso && (
                                        <span className="text-blue-600">Compromiso: {formatDate(action.fechaCompromiso)}</span>
                                      )}
                                      {action.fechaReal && (
                                        <span className="text-green-600">Cierre: {formatDate(action.fechaReal)}</span>
                                      )}
                                    </div>
                                  </div>
                                  {getEstadoBadge(action.estado)}
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {auditDisfunciones.length === 0 && (
                    <div className="text-center py-12">
                      <CheckCircle2 className="h-10 w-10 text-green-300 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No hay disfunciones de auditoría registradas</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
