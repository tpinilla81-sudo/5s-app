'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ListChecks, Plus, CheckCircle, Trash2, User, Calendar, AlertTriangle, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { use5SStore } from '@/lib/store';
import { S_STEPS, ACTION_PLAN_MIN_ITEMS } from '@/lib/5s-constants';

interface ActionItemData {
  id: string;
  descripcion: string;
  responsable: string;
  fechaCompromiso: string;
  fechaLimite: string;
  fechaReal: string;
  prioridad: 'alta' | 'media' | 'baja';
  estado: 'pendiente' | 'en_curso' | 'completada';
  zoneId: string;
  zoneName: string;
  verificadoPor: string;
}

interface ZoneData {
  id: string;
  name: string;
}

interface ActionPlanModalProps {
  open: boolean;
  onClose: () => void;
  sStep: number;
  miniStep: number;
}

const PRIORIDAD_COLORS = {
  alta: 'bg-red-100 text-red-800',
  media: 'bg-amber-100 text-amber-800',
  baja: 'bg-green-100 text-green-800',
};

const ESTADO_COLORS = {
  pendiente: 'bg-gray-100 text-gray-800',
  en_curso: 'bg-blue-100 text-blue-800',
  completada: 'bg-green-100 text-green-800',
};

const ESTADO_LABELS = {
  pendiente: 'Pendiente',
  en_curso: 'En curso',
  completada: 'Completada',
};

export default function ActionPlanModal({ open, onClose, sStep, miniStep }: ActionPlanModalProps) {
  const { fetchProgress, currentUser, adminFreeNavigation, currentProject, currentZone } = use5SStore();
  const sStepData = S_STEPS.find(s => s.id === sStep);
  const isAdmin = currentUser?.role === 'admin' && adminFreeNavigation;

  const [actions, setActions] = useState<ActionItemData[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [zones, setZones] = useState<ZoneData[]>([]);

  // New action form
  const [newAction, setNewAction] = useState<Partial<ActionItemData>>({
    descripcion: '',
    responsable: '',
    fechaCompromiso: '',
    fechaLimite: '',
    fechaReal: '',
    prioridad: 'media',
    estado: 'pendiente',
    zoneId: '',
    verificadoPor: '',
  });

  const loadZones = async () => {
    if (!currentProject) return;
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/zones`);
      if (res.ok) {
        const json = await res.json();
        setZones(json.zones || json.data || []);
      }
    } catch (error) {
      console.error('Error loading zones:', error);
    }
  };

  const loadActions = async () => {
    try {
      const params = new URLSearchParams();
      params.set('sStep', String(sStep));
      params.set('source', 'actionplan');
      if (currentProject?.id) params.set('projectId', currentProject.id);
      // Pass role-based filtering so empleado sees only their zone, responsable their projects
      if (currentUser?.id) params.set('userId', currentUser.id);
      if (currentUser?.role) params.set('userRole', currentUser.role);
      const res = await fetch(`/api/actions?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setActions(json.data.map((a: any) => ({
          id: a.id,
          descripcion: a.itemDescription || a.hallazgo || '',
          responsable: a.responsable || '',
          fechaCompromiso: a.fechaCompromiso ? new Date(a.fechaCompromiso).toISOString().split('T')[0] : '',
          fechaLimite: a.fechaLimite ? new Date(a.fechaLimite).toISOString().split('T')[0] : '',
          fechaReal: a.fechaReal ? new Date(a.fechaReal).toISOString().split('T')[0] : '',
          prioridad: a.prioridad || 'media',
          estado: a.estado === 'abierta' ? 'pendiente' : a.estado === 'en_proceso' ? 'en_curso' : a.estado === 'resuelta' || a.estado === 'cerrada' ? 'completada' : 'pendiente',
          zoneId: a.zoneId || '',
          zoneName: a.zone?.name || '',
          verificadoPor: a.verificadoPor || '',
        })));
      } else {
        console.error('Error loading actions:', json.error);
      }
    } catch (error) {
      console.error('Error loading actions:', error);
      toast.error('Error al cargar las acciones');
    }
  };

  useEffect(() => {
    if (open) {
      loadActions();
      loadZones();
    }
  }, [open, sStep]);

  const handleAddAction = async () => {
    if (!newAction.descripcion?.trim()) {
      toast.error('Describe la acción a realizar');
      return;
    }
    if (!currentProject?.id) {
      toast.error('No hay proyecto seleccionado. Selecciona un proyecto antes de agregar acciones.');
      return;
    }

    try {
      const res = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sStep,
          miniStep: 3,
          itemId: `PA-${sStep}-${Date.now()}`,
          itemDescription: newAction.descripcion,
          hallazgo: newAction.descripcion,
          responsable: newAction.responsable || null,
          prioridad: newAction.prioridad || 'media',
          estado: 'abierta',
          fechaCompromiso: newAction.fechaCompromiso || null,
          fechaLimite: newAction.fechaLimite || null,
          fechaReal: newAction.fechaReal || null,
          source: 'actionplan',
          projectId: currentProject.id,
          zoneId: newAction.zoneId || null,
          verificadoPor: null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Acción agregada correctamente');
        const zoneName = zones.find(z => z.id === newAction.zoneId)?.name || '';
        setActions(prev => [...prev, {
          id: json.data.id,
          descripcion: newAction.descripcion || '',
          responsable: newAction.responsable || '',
          fechaCompromiso: newAction.fechaCompromiso || '',
          fechaLimite: newAction.fechaLimite || '',
          fechaReal: newAction.fechaReal || '',
          prioridad: (newAction.prioridad as 'alta' | 'media' | 'baja') || 'media',
          estado: 'pendiente',
          zoneId: newAction.zoneId || '',
          zoneName,
          verificadoPor: '',
        }]);
        setNewAction({
          descripcion: '',
          responsable: '',
          fechaCompromiso: '',
          fechaLimite: '',
          fechaReal: '',
          prioridad: 'media',
          estado: 'pendiente',
          zoneId: '',
          verificadoPor: '',
        });
      } else {
        toast.error(`Error al agregar acción: ${json.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error adding action:', error);
      toast.error('Error de conexión al agregar la acción');
    }
  };

  const handleUpdateEstado = async (actionId: string, newEstado: string) => {
    const apiEstado = newEstado === 'pendiente' ? 'abierta' : newEstado === 'en_curso' ? 'en_proceso' : 'resuelta';
    const updates: any = { estado: apiEstado };
    if (newEstado === 'completada') {
      updates.fechaReal = new Date().toISOString();
    }
    try {
      const res = await fetch(`/api/actions?id=${actionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (json.success) {
        setActions(prev => prev.map(a =>
          a.id === actionId ? { ...a, estado: newEstado as ActionItemData['estado'], fechaReal: newEstado === 'completada' ? new Date().toISOString().split('T')[0] : a.fechaReal } : a
        ));
      } else {
        toast.error(`Error al actualizar: ${json.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error updating action:', error);
      toast.error('Error de conexión al actualizar');
    }
  };

  const handleUpdateVerificado = async (actionId: string, verificadoPor: string) => {
    try {
      const res = await fetch(`/api/actions?id=${actionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificadoPor }),
      });
      const json = await res.json();
      if (json.success) {
        setActions(prev => prev.map(a =>
          a.id === actionId ? { ...a, verificadoPor } : a
        ));
      } else {
        toast.error(`Error al actualizar verificación: ${json.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error updating verificado:', error);
      toast.error('Error de conexión al actualizar verificación');
    }
  };

  const handleDeleteAction = async (id: string) => {
    try {
      const res = await fetch(`/api/actions?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setActions(prev => prev.filter(a => a.id !== id));
        toast.success('Acción eliminada');
      } else {
        toast.error(`Error al eliminar: ${json.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error deleting action:', error);
      toast.error('Error de conexión al eliminar');
    }
  };

  // Count completed actions
  const completedCount = actions.filter(a => a.estado === 'completada').length;
  const totalActions = actions.length;
  const canComplete = totalActions >= ACTION_PLAN_MIN_ITEMS;
  const progressPercent = totalActions > 0 ? Math.round((completedCount / totalActions) * 100) : 0;

  // Check for overdue actions
  const today = new Date().toISOString().split('T')[0];
  const overdueActions = actions.filter(a => 
    a.estado !== 'completada' && a.fechaLimite && a.fechaLimite < today
  );

  const handleComplete = async () => {
    if (!canComplete) return;

    try {
      const res = await fetch(`/api/progress/step?sStep=${sStep}&miniStep=${miniStep}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: true,
          score: progressPercent,
          projectId: currentProject?.id,
          zoneId: currentZone?.id || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsCompleted(true);
        await fetchProgress();
      }
    } catch (error) {
      console.error('Error completing action plan:', error);
    }
  };

  const handleAdminSkip = async () => {
    try {
      const res = await fetch(`/api/progress/step?sStep=${sStep}&miniStep=${miniStep}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true, score: 100, notes: 'Completado por administrador (skip)', projectId: currentProject?.id, zoneId: currentZone?.id || null }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchProgress();
        onClose();
      }
    } catch (error) {
      console.error('Error admin skip:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" style={{ color: sStepData?.color }} />
            <span>Plan de Acción — {sStepData?.name}</span>
            <Badge variant="outline" style={{ borderColor: sStepData?.color, color: sStepData?.color }}>
              {sStepData?.japaneseName}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {isAdmin && !isCompleted && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-xs text-amber-700 font-medium">Modo Admin:</span>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={handleAdminSkip}
            >
              Completar paso sin plan
            </Button>
          </div>
        )}

        {isCompleted ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">¡Plan de Acción Completado!</h3>
            <p className="text-muted-foreground">
              Se han definido {totalActions} acciones, {completedCount} completadas ({progressPercent}%).
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* S-specific subtitle */}
            <div className="p-3 rounded-lg border-l-4" style={{ borderColor: sStepData?.color, backgroundColor: `${sStepData?.color}08` }}>
              <p className="text-sm font-medium" style={{ color: sStepData?.color }}>
                {sStepData?.id === 1 && 'Define qué elementos eliminar, reubicar o mantener y quién lo hará'}
                {sStepData?.id === 2 && 'Define las ubicaciones, etiquetas y señalización para cada elemento'}
                {sStepData?.id === 3 && 'Define las tareas de limpieza, frecuencias, responsables y métodos'}
                {sStepData?.id === 4 && 'Define las normas, procedimientos y controles visuales a implantar'}
                {sStepData?.id === 5 && 'Define los hábitos a mantener, revisiones periódicas y compromisos'}
              </p>
            </div>

            {/* Overdue alert */}
            {overdueActions.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <span className="text-sm text-red-700 font-medium">
                  {overdueActions.length} acción(es) con fecha vencida
                </span>
              </div>
            )}

            {/* Progress summary */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <span className="text-sm font-medium">Progreso del Plan</span>
                <p className="text-xs text-muted-foreground">
                  {completedCount}/{totalActions} acciones completadas
                </p>
              </div>
              <div className="flex items-center gap-2">
                {overdueActions.length > 0 && (
                  <Badge className="bg-red-100 text-red-800">{overdueActions.length} vencida(s)</Badge>
                )}
                <Badge variant={canComplete ? 'default' : 'secondary'}>
                  {totalActions} acciones (mín. {ACTION_PLAN_MIN_ITEMS})
                </Badge>
              </div>
            </div>

            {/* Add action form */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium">Descripción de la acción *</label>
                    <Textarea
                      placeholder="Describa la acción a realizar..."
                      value={newAction.descripcion || ''}
                      onChange={e => setNewAction(prev => ({ ...prev, descripcion: e.target.value }))}
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="text-xs font-medium">Responsable</label>
                      <div className="relative mt-1">
                        <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Nombre"
                          value={newAction.responsable || ''}
                          onChange={e => setNewAction(prev => ({ ...prev, responsable: e.target.value }))}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium">Fecha compromiso</label>
                      <div className="relative mt-1">
                        <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          type="date"
                          value={newAction.fechaCompromiso || ''}
                          onChange={e => setNewAction(prev => ({ ...prev, fechaCompromiso: e.target.value }))}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium">Fecha límite</label>
                      <div className="relative mt-1">
                        <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          type="date"
                          value={newAction.fechaLimite || ''}
                          onChange={e => setNewAction(prev => ({ ...prev, fechaLimite: e.target.value }))}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium">Prioridad</label>
                      <Select
                        value={newAction.prioridad || 'media'}
                        onValueChange={val => setNewAction(prev => ({ ...prev, prioridad: val as 'alta' | 'media' | 'baja' }))}
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
                      <label className="text-xs font-medium">Zona</label>
                      <Select
                        value={newAction.zoneId || '__none__'}
                        onValueChange={val => setNewAction(prev => ({ ...prev, zoneId: val === '__none__' ? '' : val }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Sin zona" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sin zona</SelectItem>
                          {zones.map(z => (
                            <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleAddAction}
                      disabled={!newAction.descripcion?.trim()}
                      size="sm"
                      style={{ backgroundColor: sStepData?.color }}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Agregar Acción
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions list */}
            {actions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay acciones definidas</p>
                <p className="text-xs mt-1">Agregue al menos {ACTION_PLAN_MIN_ITEMS} acciones para completar este paso</p>
              </div>
            ) : (
              <div className="space-y-2">
                {actions.map((action, idx) => {
                  const isOverdue = action.estado !== 'completada' && action.fechaLimite && action.fechaLimite < today;
                  return (
                  <Card
                    key={action.id}
                    className={`overflow-hidden ${action.estado === 'completada' ? 'opacity-60' : ''} ${isOverdue ? 'border-red-300 bg-red-50/30' : ''}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center gap-1 mt-0.5">
                          <span className="text-xs font-mono text-muted-foreground">#{idx + 1}</span>
                          <Badge className={PRIORIDAD_COLORS[action.prioridad]}>
                            {action.prioridad}
                          </Badge>
                          {isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${action.estado === 'completada' ? 'line-through text-muted-foreground' : ''}`}>
                            {action.descripcion}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {action.responsable && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" /> {action.responsable}
                              </span>
                            )}
                            {action.zoneName && (
                              <span className="text-xs text-purple-600 flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {action.zoneName}
                              </span>
                            )}
                            {action.fechaCompromiso && (
                              <span className="text-xs text-blue-600 flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Compromiso: {action.fechaCompromiso}
                              </span>
                            )}
                            {action.fechaLimite && (
                              <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>
                                <Calendar className="h-3 w-3" /> Límite: {action.fechaLimite}
                              </span>
                            )}
                            {action.fechaReal && action.estado === 'completada' && (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Real: {action.fechaReal}
                              </span>
                            )}
                          </div>
                          {/* Verificado por field - shown for completed actions */}
                          {action.estado === 'completada' && (
                            <div className="mt-2 flex items-center gap-2">
                              <label className="text-[10px] font-medium text-muted-foreground">Verificado por:</label>
                              <Input
                                placeholder="Nombre del verificador"
                                value={action.verificadoPor}
                                onChange={e => handleUpdateVerificado(action.id, e.target.value)}
                                className="h-6 text-xs w-48"
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Select
                            value={action.estado}
                            onValueChange={val => handleUpdateEstado(action.id, val)}
                          >
                            <SelectTrigger className="h-7 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente">Pendiente</SelectItem>
                              <SelectItem value="en_curso">En curso</SelectItem>
                              <SelectItem value="completada">Completada</SelectItem>
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
                  );
                })}
              </div>
            )}

            {/* Submit button */}
            <div className="flex justify-end">
              <Button
                onClick={handleComplete}
                disabled={!canComplete}
                style={canComplete ? { backgroundColor: sStepData?.color } : undefined}
              >
                Completar Plan de Acción ({totalActions} acciones, mín. {ACTION_PLAN_MIN_ITEMS})
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
