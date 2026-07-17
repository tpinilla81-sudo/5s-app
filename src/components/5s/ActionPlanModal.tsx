'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { ListChecks, Plus, Trash2, ChevronDown, ChevronRight, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';
import { toast } from 'sonner';
import { use5SStore } from '@/lib/store';
import { S_STEPS, ACTION_PLAN_MIN_ITEMS } from '@/lib/5s-constants';

interface ActionItemData {
  id: string;
  numeroEntrada: number;
  fechaEntrada: string;
  comunicadoPor: string;
  semana: string;
  seccionDemandante: string;
  clienteZona: string;
  personaDemandada: string;
  seccionDemandada: string;
  hallazgo: string; // DESCRIPCIÓN
  impactoObjetivo: string;
  enviado: string;
  accionCorrectiva: string;
  accionesPreventivas: string;
  semanaPrevista: string;
  responsable: string; // PERSONA RESPONSABLE
  porcentaje: number;
  estado: string;
  semanaReal: string;
  // Legacy fields kept for compatibility
  descripcion: string;
  fechaCompromiso: string;
  fechaLimite: string;
  fechaReal: string;
  prioridad: string;
  zoneId: string;
  zoneName: string;
  verificadoPor: string;
  sStep: number;
  miniStep: number;
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

const ESTADO_OPTIONS = [
  { value: 'abierta', label: 'Abierta', color: 'bg-red-100 text-red-800' },
  { value: 'en_proceso', label: 'En Proceso', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'resuelta', label: 'Resuelta', color: 'bg-green-100 text-green-800' },
  { value: 'cerrada', label: 'Cerrada', color: 'bg-gray-100 text-gray-600' },
];

const ENVIADO_OPTIONS = ['Sí', 'No', 'Pendiente'];

// Generate week options (W1-W52)
const WEEK_OPTIONS = Array.from({ length: 53 }, (_, i) => `W${i + 1}`);

// Color sections matching the uploaded image
const SECTION_COLORS = {
  demandante: 'bg-amber-50 border-amber-300 text-amber-900', // Yellow section
  accion: 'bg-sky-50 border-sky-300 text-sky-900',           // Blue section
  seguimiento: 'bg-orange-50 border-orange-300 text-orange-900', // Orange section
};

const HEADER_COLORS = {
  demandante: 'bg-amber-400 text-white',
  accion: 'bg-sky-400 text-white',
  seguimiento: 'bg-orange-400 text-white',
};

export default function ActionPlanModal({ open, onClose, sStep, miniStep }: ActionPlanModalProps) {
  const { fetchProgress, currentUser, adminFreeNavigation, currentProject, currentZone, canPerform, canView, hasPermission } = use5SStore();
  const sStepData = S_STEPS.find(s => s.id === sStep);
  const canSkipSteps = hasPermission('skip_steps');
  const canPerformStep = canPerform(sStep, miniStep);
  const canViewStep = canView(sStep, miniStep);
  // Permission-driven: read-only if no execute perm OR if candado closed for skip_steps users
  const isReadOnly = !canPerformStep || (canSkipSteps && !adminFreeNavigation);

  const [actions, setActions] = useState<ActionItemData[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(true);

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
      // When opened globally (miniStep=0), load ALL actions; otherwise filter by sStep
      const isGlobal = miniStep === 0;
      if (!isGlobal) {
        params.set('sStep', String(sStep));
      }
      if (currentProject?.id) params.set('projectId', currentProject.id);
      if (currentUser?.id) params.set('userId', currentUser.id);
      if (currentUser?.role) params.set('userRole', currentUser.role);
      const res = await fetch(`/api/actions?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setActions(json.data.map((a: any) => ({
          id: a.id,
          numeroEntrada: a.numeroEntrada || 0,
          fechaEntrada: a.fechaEntrada ? new Date(a.fechaEntrada).toISOString().split('T')[0] : (a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : ''),
          comunicadoPor: a.comunicadoPor || '',
          semana: a.semana || '',
          seccionDemandante: a.seccionDemandante || '',
          clienteZona: a.clienteZona || a.zone?.name || '',
          personaDemandada: a.personaDemandada || '',
          seccionDemandada: a.seccionDemandada || '',
          hallazgo: a.hallazgo || a.itemDescription || '',
          impactoObjetivo: a.impactoObjetivo || '',
          enviado: a.enviado || '',
          accionCorrectiva: a.accionCorrectiva || a.mejora || '',
          accionesPreventivas: a.accionesPreventivas || '',
          semanaPrevista: a.semanaPrevista || '',
          responsable: a.responsable || '',
          porcentaje: a.porcentaje || 0,
          estado: a.estado === 'abierta' ? 'abierta' : a.estado === 'en_proceso' ? 'en_proceso' : a.estado === 'resuelta' || a.estado === 'cerrada' ? 'resuelta' : 'abierta',
          semanaReal: a.semanaReal || '',
          // Legacy
          descripcion: a.itemDescription || a.hallazgo || '',
          fechaCompromiso: a.fechaCompromiso ? new Date(a.fechaCompromiso).toISOString().split('T')[0] : '',
          fechaLimite: a.fechaLimite ? new Date(a.fechaLimite).toISOString().split('T')[0] : '',
          fechaReal: a.fechaReal ? new Date(a.fechaReal).toISOString().split('T')[0] : '',
          prioridad: a.prioridad || 'media',
          zoneId: a.zoneId || '',
          zoneName: a.zone?.name || '',
          verificadoPor: a.verificadoPor || '',
          sStep: a.sStep || sStep,
          miniStep: a.miniStep || 3,
        })));
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

  const getNextNumero = () => {
    if (actions.length === 0) return 1;
    return Math.max(...actions.map(a => a.numeroEntrada || 0)) + 1;
  };

  const getCurrentWeek = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return `W${Math.ceil((diff / oneWeek) + start.getDay() / 7)}`;
  };

  const handleAddAction = async () => {
    if (!currentProject?.id) {
      toast.error('No hay proyecto seleccionado.');
      return;
    }

    const nextNumero = getNextNumero();
    const today = new Date().toISOString().split('T')[0];
    const currentWeek = getCurrentWeek();

    try {
      const res = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sStep,
          miniStep: 3,
          itemId: `PA-${sStep}-${Date.now()}`,
          itemDescription: '',
          hallazgo: '',
          source: 'actionplan',
          projectId: currentProject.id,
          zoneId: currentZone?.id || null,
          // New Plan de Acción fields
          numeroEntrada: nextNumero,
          fechaEntrada: today,
          semana: currentWeek,
          estado: 'abierta',
          enviado: 'Pendiente',
          porcentaje: 0,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Entrada agregada correctamente');
        await loadActions();
      } else {
        toast.error(`Error: ${json.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error adding action:', error);
      toast.error('Error de conexión al agregar la entrada');
    }
  };

  const handleUpdateField = async (actionId: string, field: string, value: any) => {
    // Optimistic update
    setActions(prev => prev.map(a =>
      a.id === actionId ? { ...a, [field]: value } : a
    ));

    try {
      const res = await fetch(`/api/actions?id=${actionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(`Error al actualizar: ${json.error || 'Error desconocido'}`);
        await loadActions(); // Revert
      }
    } catch (error) {
      console.error('Error updating action:', error);
      await loadActions(); // Revert
    }
  };

  const handleDeleteAction = async (id: string) => {
    if (!confirm('¿Eliminar esta entrada?')) return;
    try {
      const res = await fetch(`/api/actions?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setActions(prev => prev.filter(a => a.id !== id));
        toast.success('Entrada eliminada');
      } else {
        toast.error(`Error al eliminar: ${json.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error deleting action:', error);
      toast.error('Error de conexión al eliminar');
    }
  };

  // Count completed actions
  const completedCount = actions.filter(a => a.estado === 'resuelta' || a.estado === 'cerrada').length;
  const totalActions = actions.length;
  const canComplete = totalActions >= ACTION_PLAN_MIN_ITEMS;
  const progressPercent = totalActions > 0 ? Math.round((completedCount / totalActions) * 100) : 0;

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
        body: JSON.stringify({ completed: true, score: 100, notes: 'Completado por administrador (skip)', skipMissingTemplate: true, projectId: currentProject?.id, zoneId: currentZone?.id || null }),
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

  const getEstadoBadge = (estado: string) => {
    const opt = ESTADO_OPTIONS.find(e => e.value === estado);
    return opt || ESTADO_OPTIONS[0];
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent size={isFullscreen ? "fullscreen" : "xl"} className="flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" style={{ color: sStepData?.color }} />
            <span>Plan de Acción{miniStep === 0 ? ' — Global' : ` — ${sStepData?.name}`}</span>
            {sStepData && miniStep !== 0 && (
              <Badge variant="outline" style={{ borderColor: sStepData?.color, color: sStepData?.color }}>
                {sStepData?.japaneseName}
              </Badge>
            )}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="ml-auto p-1 rounded hover:bg-muted transition-colors"
              title={isFullscreen ? "Reducir ventana" : "Pantalla completa"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4 text-muted-foreground" /> : <Maximize2 className="h-4 w-4 text-muted-foreground" />}
            </button>
          </DialogTitle>
        </DialogHeader>

        {canSkipSteps && !isCompleted && (
          <div className="mx-6 flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex-shrink-0">
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

        {isReadOnly && (
          <div className="flex items-center gap-2 p-2 mx-6 flex-shrink-0 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-xs text-blue-700 font-medium">Solo lectura: {canSkipSteps ? 'Activa el candado para poder realizar pasos.' : 'Puedes ver pero no modificar.'}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
        {isCompleted ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="text-xl font-bold mb-2">¡Plan de Acción Completado!</h3>
            <p className="text-muted-foreground">
              Se han definido {totalActions} acciones, {completedCount} completadas ({progressPercent}%).
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            {/* Stats bar */}
            <div className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
              <div className="flex items-center gap-3">
                <span className="font-medium">{totalActions} entradas</span>
                <span className="text-muted-foreground">({completedCount} resueltas — {progressPercent}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleAddAction}
                  size="sm"
                  style={{ backgroundColor: sStepData?.color }}
                  className="text-white"
                >
                  <Plus className="h-4 w-4 mr-1" /> Nueva Entrada
                </Button>
              </div>
            </div>

            {/* Scrollable table */}
            <div className="flex-1 overflow-auto border rounded-lg">
              <table className="w-full text-xs border-collapse min-w-[800px] md:min-w-[1200px]">
                <thead className="sticky top-0 z-10">
                  <tr>
                    {/* Yellow section: Demanda */}
                    <th colSpan={9} className={`${HEADER_COLORS.demandante} px-2 py-1.5 text-center text-xs font-bold border border-amber-500`}>
                      DEMANDA
                    </th>
                    {/* Blue section: Acción */}
                    <th colSpan={4} className={`${HEADER_COLORS.accion} px-2 py-1.5 text-center text-xs font-bold border border-sky-500`}>
                      ACCIÓN
                    </th>
                    {/* Orange section: Seguimiento */}
                    <th colSpan={5} className={`${HEADER_COLORS.seguimiento} px-2 py-1.5 text-center text-xs font-bold border border-orange-500`}>
                      SEGUIMIENTO
                    </th>
                    <th className="bg-gray-400 text-white px-1 py-1.5 text-center text-xs font-bold border border-gray-500 w-8">
                      🗑
                    </th>
                  </tr>
                  <tr>
                    {/* Yellow section headers */}
                    <th className={`${HEADER_COLORS.demandante} px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap`}>Nº</th>
                    <th className={`${HEADER_COLORS.demandante} px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap`}>Fecha</th>
                    <th className={`${HEADER_COLORS.demandante} px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap`}>Comunicado por</th>
                    <th className={`${HEADER_COLORS.demandante} px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap`}>Semana</th>
                    <th className={`${HEADER_COLORS.demandante} px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap`}>Sección Demandante</th>
                    <th className={`${HEADER_COLORS.demandante} px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap`}>Cliente / Zona</th>
                    <th className={`${HEADER_COLORS.demandante} px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap`}>Persona Demandada</th>
                    <th className={`${HEADER_COLORS.demandante} px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap`}>Sección Demandada</th>
                    <th className={`${HEADER_COLORS.demandante} px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap`}>Descripción</th>
                    {/* Blue section headers */}
                    <th className={`${HEADER_COLORS.accion} px-1 py-1 text-center font-semibold border border-sky-400 whitespace-nowrap`}>Impacto Objetivo</th>
                    <th className={`${HEADER_COLORS.accion} px-1 py-1 text-center font-semibold border border-sky-400 whitespace-nowrap`}>Enviado</th>
                    <th className={`${HEADER_COLORS.accion} px-1 py-1 text-center font-semibold border border-sky-400 whitespace-nowrap`}>Acción Correctiva</th>
                    <th className={`${HEADER_COLORS.accion} px-1 py-1 text-center font-semibold border border-sky-400 whitespace-nowrap`}>Acciones Preventivas</th>
                    {/* Orange section headers */}
                    <th className={`${HEADER_COLORS.seguimiento} px-1 py-1 text-center font-semibold border border-orange-400 whitespace-nowrap`}>Semana Prevista</th>
                    <th className={`${HEADER_COLORS.seguimiento} px-1 py-1 text-center font-semibold border border-orange-400 whitespace-nowrap`}>Persona Responsable</th>
                    <th className={`${HEADER_COLORS.seguimiento} px-1 py-1 text-center font-semibold border border-orange-400 whitespace-nowrap`}>%</th>
                    <th className={`${HEADER_COLORS.seguimiento} px-1 py-1 text-center font-semibold border border-orange-400 whitespace-nowrap`}>Estado</th>
                    <th className={`${HEADER_COLORS.seguimiento} px-1 py-1 text-center font-semibold border border-orange-400 whitespace-nowrap`}>Semana Real</th>
                    <th className="bg-gray-300 text-gray-700 px-1 py-1 border border-gray-400 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {actions.length === 0 ? (
                    <tr>
                      <td colSpan={19} className="text-center py-12 text-muted-foreground">
                        <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay entradas en el Plan de Acción</p>
                        <p className="text-xs mt-1">Haga clic en &quot;Nueva Entrada&quot; para agregar acciones</p>
                      </td>
                    </tr>
                  ) : (
                    actions.map((action) => {
                      const isExpanded = expandedRow === action.id;
                      const estadoBadge = getEstadoBadge(action.estado);

                      return (
                        <tr key={action.id} className="hover:bg-muted/30 group">
                          {/* Yellow section: Demanda */}
                          <td className={`${SECTION_COLORS.demandante} px-1 py-1 border border-amber-200 text-center font-bold`}>
                            {action.numeroEntrada || '-'}
                          </td>
                          <td className={`${SECTION_COLORS.demandante} px-1 py-1 border border-amber-200`}>
                            <Input
                              type="date"
                              value={action.fechaEntrada}
                              onChange={e => handleUpdateField(action.id, 'fechaEntrada', e.target.value)}
                              className="h-6 text-[10px] p-0 px-1 bg-transparent border-0 focus:bg-white focus:border focus:border-amber-400"
                            />
                          </td>
                          <td className={`${SECTION_COLORS.demandante} px-1 py-1 border border-amber-200`}>
                            <Input
                              type="text"
                              value={action.comunicadoPor}
                              onChange={e => handleUpdateField(action.id, 'comunicadoPor', e.target.value)}
                              placeholder="Quién comunica"
                              className="h-6 text-[10px] p-0 px-1 bg-transparent border-0 focus:bg-white focus:border focus:border-amber-400 w-24"
                            />
                          </td>
                          <td className={`${SECTION_COLORS.demandante} px-1 py-1 border border-amber-200`}>
                            <Select
                              value={action.semana || '__none__'}
                              onValueChange={val => handleUpdateField(action.id, 'semana', val === '__none__' ? '' : val)}
                            >
                              <SelectTrigger className="h-6 text-[10px] p-0 px-1 bg-transparent border-0 w-16">
                                <SelectValue placeholder="Sem" />
                              </SelectTrigger>
                              <SelectContent className="max-h-48">
                                <SelectItem value="__none__">—</SelectItem>
                                {WEEK_OPTIONS.map(w => (
                                  <SelectItem key={w} value={w}>{w}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className={`${SECTION_COLORS.demandante} px-1 py-1 border border-amber-200`}>
                            <Input
                              type="text"
                              value={action.seccionDemandante}
                              onChange={e => handleUpdateField(action.id, 'seccionDemandante', e.target.value)}
                              placeholder="Sección"
                              className="h-6 text-[10px] p-0 px-1 bg-transparent border-0 focus:bg-white focus:border focus:border-amber-400 w-24"
                            />
                          </td>
                          <td className={`${SECTION_COLORS.demandante} px-1 py-1 border border-amber-200`}>
                            <Input
                              type="text"
                              value={action.clienteZona}
                              onChange={e => handleUpdateField(action.id, 'clienteZona', e.target.value)}
                              placeholder="Zona"
                              className="h-6 text-[10px] p-0 px-1 bg-transparent border-0 focus:bg-white focus:border focus:border-amber-400 w-24"
                            />
                          </td>
                          <td className={`${SECTION_COLORS.demandante} px-1 py-1 border border-amber-200`}>
                            <Input
                              type="text"
                              value={action.personaDemandada}
                              onChange={e => handleUpdateField(action.id, 'personaDemandada', e.target.value)}
                              placeholder="Persona"
                              className="h-6 text-[10px] p-0 px-1 bg-transparent border-0 focus:bg-white focus:border focus:border-amber-400 w-24"
                            />
                          </td>
                          <td className={`${SECTION_COLORS.demandante} px-1 py-1 border border-amber-200`}>
                            <Input
                              type="text"
                              value={action.seccionDemandada}
                              onChange={e => handleUpdateField(action.id, 'seccionDemandada', e.target.value)}
                              placeholder="Sección"
                              className="h-6 text-[10px] p-0 px-1 bg-transparent border-0 focus:bg-white focus:border focus:border-amber-400 w-24"
                            />
                          </td>
                          <td className={`${SECTION_COLORS.demandante} px-1 py-1 border border-amber-200`}>
                            <Textarea
                              value={action.hallazgo}
                              onChange={e => handleUpdateField(action.id, 'hallazgo', e.target.value)}
                              placeholder="Descripción del problema..."
                              className="h-6 text-[10px] p-0 px-1 bg-transparent border-0 focus:bg-white focus:border focus:border-amber-400 min-w-[120px] resize-none"
                              rows={1}
                            />
                          </td>

                          {/* Blue section: Acción */}
                          <td className={`${SECTION_COLORS.accion} px-1 py-1 border border-sky-200`}>
                            <Input
                              type="text"
                              value={action.impactoObjetivo}
                              onChange={e => handleUpdateField(action.id, 'impactoObjetivo', e.target.value)}
                              placeholder="Impacto"
                              className="h-6 text-[10px] p-0 px-1 bg-transparent border-0 focus:bg-white focus:border focus:border-sky-400 w-24"
                            />
                          </td>
                          <td className={`${SECTION_COLORS.accion} px-1 py-1 border border-sky-200`}>
                            <Select
                              value={action.enviado || '__none__'}
                              onValueChange={val => handleUpdateField(action.id, 'enviado', val === '__none__' ? '' : val)}
                            >
                              <SelectTrigger className="h-6 text-[10px] p-0 px-1 bg-transparent border-0 w-20">
                                <SelectValue placeholder="—"/>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">—</SelectItem>
                                {ENVIADO_OPTIONS.map(opt => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className={`${SECTION_COLORS.accion} px-1 py-1 border border-sky-200`}>
                            <Textarea
                              value={action.accionCorrectiva}
                              onChange={e => handleUpdateField(action.id, 'accionCorrectiva', e.target.value)}
                              placeholder="Acción correctiva..."
                              className="h-6 text-[10px] p-0 px-1 bg-transparent border-0 focus:bg-white focus:border focus:border-sky-400 min-w-[120px] resize-none"
                              rows={1}
                            />
                          </td>
                          <td className={`${SECTION_COLORS.accion} px-1 py-1 border border-sky-200`}>
                            <Textarea
                              value={action.accionesPreventivas}
                              onChange={e => handleUpdateField(action.id, 'accionesPreventivas', e.target.value)}
                              placeholder="Acciones preventivas..."
                              className="h-6 text-[10px] p-0 px-1 bg-transparent border-0 focus:bg-white focus:border focus:border-sky-400 min-w-[120px] resize-none"
                              rows={1}
                            />
                          </td>

                          {/* Orange section: Seguimiento */}
                          <td className={`${SECTION_COLORS.seguimiento} px-1 py-1 border border-orange-200`}>
                            <Select
                              value={action.semanaPrevista || '__none__'}
                              onValueChange={val => handleUpdateField(action.id, 'semanaPrevista', val === '__none__' ? '' : val)}
                            >
                              <SelectTrigger className="h-6 text-[10px] p-0 px-1 bg-transparent border-0 w-16">
                                <SelectValue placeholder="Sem" />
                              </SelectTrigger>
                              <SelectContent className="max-h-48">
                                <SelectItem value="__none__">—</SelectItem>
                                {WEEK_OPTIONS.map(w => (
                                  <SelectItem key={w} value={w}>{w}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className={`${SECTION_COLORS.seguimiento} px-1 py-1 border border-orange-200`}>
                            <Input
                              type="text"
                              value={action.responsable}
                              onChange={e => handleUpdateField(action.id, 'responsable', e.target.value)}
                              placeholder="Responsable"
                              className="h-6 text-[10px] p-0 px-1 bg-transparent border-0 focus:bg-white focus:border focus:border-orange-400 w-24"
                            />
                          </td>
                          <td className={`${SECTION_COLORS.seguimiento} px-1 py-1 border border-orange-200 text-center`}>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={action.porcentaje}
                              onChange={e => handleUpdateField(action.id, 'porcentaje', parseFloat(e.target.value) || 0)}
                              className="h-6 text-[10px] p-0 px-1 bg-transparent border-0 focus:bg-white focus:border focus:border-orange-400 w-12 text-center"
                            />
                          </td>
                          <td className={`${SECTION_COLORS.seguimiento} px-1 py-1 border border-orange-200`}>
                            <Select
                              value={action.estado}
                              onValueChange={val => handleUpdateField(action.id, 'estado', val)}
                            >
                              <SelectTrigger className="h-6 text-[10px] p-0 px-1 bg-transparent border-0 w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ESTADO_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className={`${SECTION_COLORS.seguimiento} px-1 py-1 border border-orange-200`}>
                            <Select
                              value={action.semanaReal || '__none__'}
                              onValueChange={val => handleUpdateField(action.id, 'semanaReal', val === '__none__' ? '' : val)}
                            >
                              <SelectTrigger className="h-6 text-[10px] p-0 px-1 bg-transparent border-0 w-16">
                                <SelectValue placeholder="Sem" />
                              </SelectTrigger>
                              <SelectContent className="max-h-48">
                                <SelectItem value="__none__">—</SelectItem>
                                {WEEK_OPTIONS.map(w => (
                                  <SelectItem key={w} value={w}>{w}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-1 py-1 border border-gray-200 text-center">
                            <button
                              onClick={() => handleDeleteAction(action.id)}
                              className="text-red-400 hover:text-red-600 transition-colors"
                              title="Eliminar entrada"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer with completion button */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-muted-foreground">
                Mín. {ACTION_PLAN_MIN_ITEMS} entradas para completar el paso
              </div>
              <Button
                onClick={handleComplete}
                disabled={!canComplete || isReadOnly}
                style={canComplete ? { backgroundColor: sStepData?.color } : undefined}
              >
                Completar Plan de Acción ({totalActions}/{ACTION_PLAN_MIN_ITEMS} mín.)
              </Button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
