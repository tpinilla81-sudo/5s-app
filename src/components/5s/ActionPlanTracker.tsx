'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Camera,
  ChevronDown,
  ChevronRight,
  Filter,
  BarChart3,
  ListTodo,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { S_STEPS, AUDIT_CHECKLISTS } from '@/lib/5s-constants';
import { use5SStore } from '@/lib/store';

interface ActionItem {
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
  fechaLimite: string | null;
  fechaResolucion: string | null;
  photoRefs: string | null;
  notas: string | null;
  source: string;
  auditor: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ActionPlanTrackerProps {
  open: boolean;
  onClose: () => void;
}

const ESTADO_LABELS: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  abierta: { label: 'Abierta', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
  en_proceso: { label: 'En Proceso', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  resuelta: { label: 'Resuelta', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  cerrada: { label: 'Cerrada', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: CheckCircle },
};

const PRIORIDAD_LABELS: Record<string, { label: string; color: string }> = {
  alta: { label: 'Alta', color: 'bg-red-500 text-white' },
  media: { label: 'Media', color: 'bg-yellow-500 text-white' },
  baja: { label: 'Baja', color: 'bg-green-500 text-white' },
};

export default function ActionPlanTracker({ open, onClose }: ActionPlanTrackerProps) {
  const { currentProject } = use5SStore();
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSStep, setFilterSStep] = useState<string>('all');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('list');

  // Edit form
  const [editId, setEditId] = useState<string | null>(null);
  const [editResponsable, setEditResponsable] = useState('');
  const [editPrioridad, setEditPrioridad] = useState('media');
  const [editFechaLimite, setEditFechaLimite] = useState('');
  const [editNotas, setEditNotas] = useState('');

  useEffect(() => {
    if (open) loadActions();
  }, [open]);

  const loadActions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/actions?projectId=${currentProject?.id}`);
      const json = await res.json();
      if (json.success) {
        setActions(json.data);
      }
    } catch (error) {
      console.error('Error loading actions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredActions = useMemo(() => {
    let filtered = [...actions];
    if (filterSStep !== 'all') filtered = filtered.filter(a => a.sStep === parseInt(filterSStep));
    if (filterEstado !== 'all') filtered = filtered.filter(a => a.estado === filterEstado);
    return filtered;
  }, [actions, filterSStep, filterEstado]);

  // Stats
  const stats = useMemo(() => {
    const total = actions.length;
    const abiertas = actions.filter(a => a.estado === 'abierta').length;
    const enProceso = actions.filter(a => a.estado === 'en_proceso').length;
    const resueltas = actions.filter(a => a.estado === 'resuelta').length;
    const cerradas = actions.filter(a => a.estado === 'cerrada').length;
    const alta = actions.filter(a => a.prioridad === 'alta' && (a.estado === 'abierta' || a.estado === 'en_proceso')).length;
    const byS: Record<number, { total: number; open: number; resolved: number }> = {};
    for (let i = 1; i <= 5; i++) {
      const sActions = actions.filter(a => a.sStep === i);
      byS[i] = {
        total: sActions.length,
        open: sActions.filter(a => a.estado === 'abierta' || a.estado === 'en_proceso').length,
        resolved: sActions.filter(a => a.estado === 'resuelta' || a.estado === 'cerrada').length,
      };
    }
    return { total, abiertas, enProceso, resueltas, cerradas, alta, byS };
  }, [actions]);

  const getItemDescription = (sStep: number, itemId: string): string => {
    const sections = AUDIT_CHECKLISTS[sStep] || [];
    for (const section of sections) {
      const item = section.items.find(i => i.id === itemId);
      if (item) return item.description;
    }
    return itemId;
  };

  const handleUpdateEstado = async (id: string, newEstado: string) => {
    try {
      const res = await fetch('/api/actions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado: newEstado }),
      });
      const json = await res.json();
      if (json.success) {
        await loadActions();
      }
    } catch (error) {
      console.error('Error updating action:', error);
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const data: Record<string, unknown> = { id };
      if (editResponsable !== undefined) data.responsable = editResponsable;
      if (editPrioridad) data.prioridad = editPrioridad;
      if (editFechaLimite !== undefined) data.fechaLimite = editFechaLimite || null;
      if (editNotas !== undefined) data.notas = editNotas;
      data.itemDescription = getItemDescription(
        actions.find(a => a.id === id)?.sStep || 1,
        actions.find(a => a.id === id)?.itemId || ''
      );

      const res = await fetch('/api/actions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        setEditId(null);
        await loadActions();
      }
    } catch (error) {
      console.error('Error saving edit:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta acción?')) return;
    try {
      await fetch(`/api/actions?id=${id}`, { method: 'DELETE' });
      await loadActions();
    } catch (error) {
      console.error('Error deleting action:', error);
    }
  };

  const startEdit = (action: ActionItem) => {
    setEditId(action.id);
    setEditResponsable(action.responsable || '');
    setEditPrioridad(action.prioridad);
    setEditFechaLimite(action.fechaLimite ? action.fechaLimite.substring(0, 10) : '');
    setEditNotas(action.notas || '');
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-green-600" />
            <span>Plan de Acción 5S — Deficiencias y Resolución</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list" className="text-xs">
              <ListTodo className="h-3.5 w-3.5 mr-1" /> Acciones ({filteredActions.length})
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-xs">
              <BarChart3 className="h-3.5 w-3.5 mr-1" /> Estadísticas
            </TabsTrigger>
          </TabsList>

          {/* ===== TAB: LIST ===== */}
          <TabsContent value="list" className="mt-4 space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterSStep} onValueChange={setFilterSStep}>
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <SelectValue placeholder="Todas las S" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las S</SelectItem>
                    {S_STEPS.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        <span style={{ color: s.color }}>S{s.id}</span> — {s.japaneseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="abierta">Abierta</SelectItem>
                  <SelectItem value="en_proceso">En Proceso</SelectItem>
                  <SelectItem value="resuelta">Resuelta</SelectItem>
                  <SelectItem value="cerrada">Cerrada</SelectItem>
                </SelectContent>
              </Select>

              {/* Quick stats */}
              <div className="flex gap-1 ml-auto">
                <Badge className="bg-red-100 text-red-800 text-xs">{stats.abiertas} abiertas</Badge>
                <Badge className="bg-yellow-100 text-yellow-800 text-xs">{stats.enProceso} en proceso</Badge>
                <Badge className="bg-green-100 text-green-800 text-xs">{stats.resueltas + stats.cerradas} resueltas</Badge>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredActions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-lg font-medium">No hay acciones registradas</p>
                <p className="text-sm mt-1">Complete una autoevaluación o auditoría con NOKs para generar acciones</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActions.map(action => {
                  const sStepData = S_STEPS.find(s => s.id === action.sStep);
                  const estadoInfo = ESTADO_LABELS[action.estado] || ESTADO_LABELS.abierta;
                  const prioridadInfo = PRIORIDAD_LABELS[action.prioridad] || PRIORIDAD_LABELS.media;
                  const isExpanded = expandedId === action.id;
                  const isEditing = editId === action.id;
                  const description = action.itemDescription !== action.itemId
                    ? action.itemDescription
                    : getItemDescription(action.sStep, action.itemId);

                  return (
                    <Card
                      key={action.id}
                      className={`border-l-4 ${
                        action.estado === 'abierta' ? 'border-l-red-400' :
                        action.estado === 'en_proceso' ? 'border-l-yellow-400' :
                        action.estado === 'resuelta' ? 'border-l-green-400' : 'border-l-gray-300'
                      }`}
                    >
                      {/* Header */}
                      <button
                        className="w-full p-4 text-left hover:bg-muted/30 transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : action.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="text-xs font-mono" style={{ borderColor: sStepData?.color, color: sStepData?.color }}>
                                S{action.sStep}
                              </Badge>
                              <Badge variant="outline" className="text-xs font-mono">{action.itemId}</Badge>
                              <Badge className={`${prioridadInfo.color} text-xs`}>{prioridadInfo.label}</Badge>
                              <Badge className={`${estadoInfo.color} border text-xs`}>
                                {estadoInfo.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {action.source === 'autoevaluacion' ? 'Autoeval.' : 'Auditoría'}
                              </span>
                            </div>
                            <p className="text-sm font-medium truncate">{description}</p>
                            <p className="text-xs text-red-600 mt-1 truncate">{action.hallazgo}</p>
                          </div>
                          <div className="shrink-0">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </div>
                        </div>
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <CardContent className="px-4 pb-4 pt-0 space-y-4">
                          {/* Hallazgo */}
                          <div className="pl-4 border-l-2 border-red-200">
                            <p className="text-xs font-medium text-red-700 mb-1">Hallazgo (desviación):</p>
                            <p className="text-sm bg-red-50 p-2 rounded">{action.hallazgo}</p>
                          </div>

                          {/* Mejora */}
                          {action.mejora && (
                            <div className="pl-4 border-l-2 border-amber-200">
                              <p className="text-xs font-medium text-amber-700 mb-1">Punto a Mejorar / Acción:</p>
                              <p className="text-sm bg-amber-50 p-2 rounded">{action.mejora}</p>
                            </div>
                          )}

                          {/* Photos */}
                          {action.photoRefs && (
                            <div className="pl-4 border-l-2 border-blue-200">
                              <p className="text-xs font-medium text-blue-700 mb-1">Evidencia fotográfica:</p>
                              <div className="flex flex-wrap gap-1">
                                {JSON.parse(action.photoRefs).map((ref: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    <Camera className="h-3 w-3 mr-1" />{ref}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            {action.responsable && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span>{action.responsable}</span>
                              </div>
                            )}
                            {action.fechaLimite && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span>Límite: {new Date(action.fechaLimite).toLocaleDateString('es-ES')}</span>
                              </div>
                            )}
                            {action.fechaResolucion && (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <span>Resuelta: {new Date(action.fechaResolucion).toLocaleDateString('es-ES')}</span>
                              </div>
                            )}
                            {action.auditor && (
                              <div className="text-muted-foreground">
                                Auditor: {action.auditor}
                              </div>
                            )}
                          </div>

                          {/* Notas */}
                          {action.notas && (
                            <div className="text-xs bg-muted p-2 rounded">
                              <span className="font-medium">Notas:</span> {action.notas}
                            </div>
                          )}

                          {/* Edit form */}
                          {isEditing ? (
                            <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <Label className="text-xs">Responsable</Label>
                                  <Input
                                    value={editResponsable}
                                    onChange={e => setEditResponsable(e.target.value)}
                                    placeholder="Nombre del responsable"
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Prioridad</Label>
                                  <Select value={editPrioridad} onValueChange={setEditPrioridad}>
                                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="alta">Alta</SelectItem>
                                      <SelectItem value="media">Media</SelectItem>
                                      <SelectItem value="baja">Baja</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Fecha límite</Label>
                                  <Input
                                    type="date"
                                    value={editFechaLimite}
                                    onChange={e => setEditFechaLimite(e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs">Notas de resolución</Label>
                                <Textarea
                                  value={editNotas}
                                  onChange={e => setEditNotas(e.target.value)}
                                  placeholder="Notas sobre la resolución..."
                                  rows={2}
                                  className="text-sm"
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setEditId(null)}>Cancelar</Button>
                                <Button size="sm" onClick={() => handleSaveEdit(action.id)}>Guardar</Button>
                              </div>
                            </div>
                          ) : null}

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* State transition buttons */}
                            {action.estado === 'abierta' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                                onClick={() => handleUpdateEstado(action.id, 'en_proceso')}
                              >
                                <ArrowRight className="h-3 w-3 mr-1" /> En Proceso
                              </Button>
                            )}
                            {(action.estado === 'abierta' || action.estado === 'en_proceso') && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs border-green-300 text-green-700 hover:bg-green-50"
                                onClick={() => handleUpdateEstado(action.id, 'resuelta')}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" /> Resuelta
                              </Button>
                            )}
                            {action.estado === 'resuelta' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs border-gray-300 text-gray-600 hover:bg-gray-50"
                                onClick={() => handleUpdateEstado(action.id, 'cerrada')}
                              >
                                Cerrar
                              </Button>
                            )}
                            {action.estado === 'cerrada' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => handleUpdateEstado(action.id, 'abierta')}
                              >
                                Reabrir
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => startEdit(action)}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-red-500 hover:text-red-700"
                              onClick={() => handleDelete(action.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ===== TAB: STATS ===== */}
          <TabsContent value="stats" className="mt-4 space-y-4">
            {/* Overall stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-red-600">{stats.abiertas}</div>
                  <p className="text-xs text-muted-foreground mt-1">Abiertas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-600">{stats.enProceso}</div>
                  <p className="text-xs text-muted-foreground mt-1">En Proceso</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{stats.resueltas + stats.cerradas}</div>
                  <p className="text-xs text-muted-foreground mt-1">Resueltas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total</p>
                </CardContent>
              </Card>
            </div>

            {/* Per S stats */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">Deficiencias por S</h3>
                <div className="space-y-2">
                  {S_STEPS.map(s => {
                    const sStats = stats.byS[s.id];
                    if (!sStats || sStats.total === 0) return null;
                    const resolvePercent = sStats.total > 0 ? Math.round((sStats.resolved / sStats.total) * 100) : 0;

                    return (
                      <div key={s.id} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: s.color }}>
                          {s.id}
                        </div>
                        <span className="text-sm font-medium w-20">{s.japaneseName}</span>
                        <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${resolvePercent}%`, backgroundColor: s.color, opacity: 0.7 }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                            {sStats.resolved}/{sStats.total} ({resolvePercent}%)
                          </span>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Badge className="bg-red-100 text-red-800 text-xs">{sStats.open} abiertas</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Priority breakdown */}
            {stats.alta > 0 && (
              <Card className="border-red-200">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-red-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Acciones de Alta Prioridad Pendientes ({stats.alta})
                  </h3>
                  <div className="space-y-2 mt-2">
                    {actions
                      .filter(a => a.prioridad === 'alta' && (a.estado === 'abierta' || a.estado === 'en_proceso'))
                      .map(a => {
                        const sData = S_STEPS.find(s => s.id === a.sStep);
                        return (
                          <div key={a.id} className="flex items-center gap-2 p-2 bg-red-50 rounded">
                            <Badge variant="outline" className="text-xs" style={{ borderColor: sData?.color, color: sData?.color }}>S{a.sStep}</Badge>
                            <span className="text-sm flex-1">{a.hallazgo}</span>
                            <Badge className={a.estado === 'abierta' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>{a.estado === 'abierta' ? 'Abierta' : 'En Proceso'}</Badge>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
