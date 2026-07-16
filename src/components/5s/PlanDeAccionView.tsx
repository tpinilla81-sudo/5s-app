'use client';

import { useState, useEffect, useCallback } from 'react';
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
import {
  ListChecks, Plus, Trash2, ChevronDown, ChevronRight,
  Loader2, AlertTriangle, CheckCircle, Clock, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { use5SStore } from '@/lib/store';
import { S_STEPS } from '@/lib/5s-constants';

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════
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
  hallazgo: string;
  impactoObjetivo: string;
  enviado: string;
  accionCorrectiva: string;
  accionesPreventivas: string;
  semanaPrevista: string;
  responsable: string;
  porcentaje: number;
  estado: string;
  semanaReal: string;
  sStep: number;
  miniStep: number;
  zoneName: string;
}

interface ZoneData {
  id: string;
  name: string;
}

const ESTADO_OPTIONS = [
  { value: 'abierta', label: 'Abierta', color: 'bg-red-100 text-red-800' },
  { value: 'en_proceso', label: 'En Proceso', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'resuelta', label: 'Resuelta', color: 'bg-green-100 text-green-800' },
  { value: 'cerrada', label: 'Cerrada', color: 'bg-gray-100 text-gray-600' },
];

const WEEK_OPTIONS = Array.from({ length: 53 }, (_, i) => `W${i + 1}`);

const S_COLORS: Record<number, string> = {
  1: '#8B5CF6', 2: '#EAB308', 3: '#3B82F6', 4: '#F43F5E', 5: '#F97316',
};

const HEADER_COLORS = {
  demandante: 'bg-amber-400 text-white',
  accion: 'bg-sky-400 text-white',
  seguimiento: 'bg-orange-400 text-white',
};

const SECTION_COLORS = {
  demandante: 'bg-amber-50 border-amber-300',
  accion: 'bg-sky-50 border-sky-300',
  seguimiento: 'bg-orange-50 border-orange-300',
};

// ═══════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════
export default function PlanDeAccionView() {
  const { currentUser, currentProject, currentZone } = use5SStore();
  const [actions, setActions] = useState<ActionItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedS, setExpandedS] = useState<number | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [zones, setZones] = useState<ZoneData[]>([]);

  // Load zones
  useEffect(() => {
    if (!currentProject) return;
    const loadZones = async () => {
      try {
        const res = await fetch(`/api/projects/${currentProject.id}/zones`);
        if (res.ok) {
          const json = await res.json();
          setZones(json.zones || json.data || []);
        }
      } catch (e) { console.error('Error loading zones:', e); }
    };
    loadZones();
  }, [currentProject?.id]);

  // Load ALL actions for the project
  const loadActions = useCallback(async () => {
    if (!currentProject?.id) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('projectId', currentProject.id);
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
          estado: a.estado || 'abierta',
          semanaReal: a.semanaReal || '',
          sStep: a.sStep || 1,
          miniStep: a.miniStep || 4,
          zoneName: a.zone?.name || '',
        })));
      }
    } catch (e) {
      console.error('Error loading actions:', e);
      toast.error('Error al cargar las acciones');
    } finally {
      setIsLoading(false);
    }
  }, [currentProject?.id, currentUser?.id, currentUser?.role]);

  useEffect(() => { loadActions(); }, [loadActions]);

  const getNextNumero = (sStep: number) => {
    const sActions = actions.filter(a => a.sStep === sStep);
    if (sActions.length === 0) return 1;
    return Math.max(...sActions.map(a => a.numeroEntrada || 0)) + 1;
  };

  const getCurrentWeek = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return `W${Math.ceil((diff / oneWeek) + start.getDay() / 7)}`;
  };

  const handleAddAction = async (sStep: number) => {
    if (!currentProject?.id) {
      toast.error('No hay proyecto seleccionado.');
      return;
    }
    const nextNumero = getNextNumero(sStep);
    const today = new Date().toISOString().split('T')[0];
    const currentWeek = getCurrentWeek();
    try {
      const res = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sStep,
          miniStep: 4,
          itemId: `PA-${sStep}-${Date.now()}`,
          itemDescription: '',
          hallazgo: '',
          source: 'actionplan',
          projectId: currentProject.id,
          zoneId: currentZone?.id || null,
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
        toast.success('Entrada agregada');
        await loadActions();
      } else {
        toast.error(`Error: ${json.error || 'Error desconocido'}`);
      }
    } catch (e) {
      console.error('Error adding action:', e);
      toast.error('Error de conexión');
    }
  };

  const handleUpdateField = async (actionId: string, field: string, value: any) => {
    setActions(prev => prev.map(a => a.id === actionId ? { ...a, [field]: value } : a));
    try {
      const res = await fetch(`/api/actions?id=${actionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(`Error al actualizar: ${json.error || 'Error desconocido'}`);
        await loadActions();
      }
    } catch (e) {
      console.error('Error updating action:', e);
      await loadActions();
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
    } catch (e) {
      console.error('Error deleting action:', e);
      toast.error('Error de conexión');
    }
  };

  // Filter actions by estado
  const filteredActions = filterEstado === 'all'
    ? actions
    : actions.filter(a => a.estado === filterEstado);

  // Group by S-step
  const actionsByS = (sStep: number) => filteredActions.filter(a => a.sStep === sStep);
  const countByS = (sStep: number) => actions.filter(a => a.sStep === sStep).length;
  const completedByS = (sStep: number) => actions.filter(a => a.sStep === sStep && (a.estado === 'resuelta' || a.estado === 'cerrada')).length;

  const getEstadoBadge = (estado: string) => {
    const opt = ESTADO_OPTIONS.find(e => e.value === estado);
    return opt || ESTADO_OPTIONS[0];
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white shrink-0">
        <div className="flex items-center gap-3">
          <ListChecks className="h-5 w-5 text-rose-600" />
          <h2 className="text-lg font-bold">Plan de Acción</h2>
          <Badge variant="outline" className="text-xs">
            {actions.length} entrada{actions.length !== 1 ? 's' : ''} en total
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter by estado */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Filtrar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {ESTADO_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={loadActions}
            className="gap-1 text-xs">
            <Loader2 className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-rose-500 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto p-4 space-y-3">
          {S_STEPS.map(s => {
            const sActions = actionsByS(s.id);
            const sCount = countByS(s.id);
            const sCompleted = completedByS(s.id);
            const isExpanded = expandedS === s.id;

            return (
              <div key={s.id} className="rounded-xl border-2 overflow-hidden"
                style={{ borderColor: S_COLORS[s.id] + '40' }}>
                {/* S Header */}
                <div className="flex items-center justify-between px-4 py-3 cursor-pointer"
                  style={{ backgroundColor: S_COLORS[s.id] + '10' }}
                  onClick={() => setExpandedS(isExpanded ? null : s.id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-sm"
                      style={{ backgroundColor: S_COLORS[s.id] }}>
                      S{s.id}
                    </div>
                    <div>
                      <span className="font-bold" style={{ color: S_COLORS[s.id] }}>{s.japaneseName}</span>
                      <span className="text-sm text-muted-foreground ml-2">({s.spanishName})</span>
                      <span className="text-xs text-muted-foreground ml-2">— {s.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Progress mini-bar */}
                    {sCount > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${sCount > 0 ? Math.round((sCompleted / sCount) * 100) : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{sCompleted}/{sCount}</span>
                      </div>
                    )}
                    <Button size="sm" className="h-7 text-xs text-white gap-1"
                      style={{ backgroundColor: S_COLORS[s.id] }}
                      onClick={(e) => { e.stopPropagation(); handleAddAction(s.id); }}>
                      <Plus className="h-3.5 w-3.5" /> Nueva Entrada
                    </Button>
                    <Badge variant="outline" style={{ color: S_COLORS[s.id], borderColor: S_COLORS[s.id] + '40' }}>
                      {sCount} entrada{sCount !== 1 ? 's' : ''}
                    </Badge>
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </div>

                {/* Expanded table */}
                {isExpanded && (
                  <div className="p-3">
                    {sActions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No hay entradas para S{s.id} — {s.japaneseName}. Pulsa &quot;Nueva Entrada&quot; para añadir.
                      </div>
                    ) : (
                      <div className="overflow-auto border rounded-lg">
                        <table className="w-full text-xs border-collapse min-w-[1200px]">
                          <thead className="sticky top-0 z-10">
                            <tr>
                              <th colSpan={9} className={`${HEADER_COLORS.demandante} px-2 py-1.5 text-center text-xs font-bold border border-amber-500`}>
                                DEMANDA
                              </th>
                              <th colSpan={4} className={`${HEADER_COLORS.accion} px-2 py-1.5 text-center text-xs font-bold border border-sky-500`}>
                                ACCIÓN
                              </th>
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
                              <th className={`${HEADER_COLORS.demandante} px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap`}>Sección Demand.</th>
                              <th className={`${HEADER_COLORS.demandante} px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap`}>Zona</th>
                              <th className={`${HEADER_COLORS.demandante} px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap`}>Persona Demand.</th>
                              <th className={`${HEADER_COLORS.demandante} px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap`}>Sección Demand.</th>
                              <th className={`${HEADER_COLORS.demandante} px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap`}>Impacto Obj.</th>
                              {/* Blue section headers */}
                              <th className={`${HEADER_COLORS.accion} px-1 py-1 text-center font-semibold border border-sky-400 whitespace-nowrap`}>Descripción</th>
                              <th className={`${HEADER_COLORS.accion} px-1 py-1 text-center font-semibold border border-sky-400 whitespace-nowrap`}>Acción Correctiva</th>
                              <th className={`${HEADER_COLORS.accion} px-1 py-1 text-center font-semibold border border-sky-400 whitespace-nowrap`}>Acciones Preventivas</th>
                              <th className={`${HEADER_COLORS.accion} px-1 py-1 text-center font-semibold border border-sky-400 whitespace-nowrap`}>Enviado</th>
                              {/* Orange section headers */}
                              <th className={`${HEADER_COLORS.seguimiento} px-1 py-1 text-center font-semibold border border-orange-400 whitespace-nowrap`}>Sem. Prevista</th>
                              <th className={`${HEADER_COLORS.seguimiento} px-1 py-1 text-center font-semibold border border-orange-400 whitespace-nowrap`}>Responsable</th>
                              <th className={`${HEADER_COLORS.seguimiento} px-1 py-1 text-center font-semibold border border-orange-400 whitespace-nowrap`}>Estado</th>
                              <th className={`${HEADER_COLORS.seguimiento} px-1 py-1 text-center font-semibold border border-orange-400 whitespace-nowrap`}>Progreso %</th>
                              <th className={`${HEADER_COLORS.seguimiento} px-1 py-1 text-center font-semibold border border-orange-400 whitespace-nowrap`}>Sem. Real</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sActions.map((action) => {
                              const estadoInfo = getEstadoBadge(action.estado);
                              return (
                                <tr key={action.id} className={`border-b hover:bg-gray-50 ${action.estado === 'resuelta' || action.estado === 'cerrada' ? 'bg-green-50/50' : ''}`}>
                                  {/* Yellow: Demanda */}
                                  <td className={`px-1 py-1 border ${SECTION_COLORS.demandante} text-center font-mono font-bold`}>
                                    {action.numeroEntrada || '—'}
                                  </td>
                                  <td className={`px-1 py-1 border ${SECTION_COLORS.demandante}`}>
                                    <Input type="date" value={action.fechaEntrada} onChange={e => handleUpdateField(action.id, 'fechaEntrada', e.target.value)}
                                      className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent" />
                                  </td>
                                  <td className={`px-1 py-1 border ${SECTION_COLORS.demandante}`}>
                                    <Input value={action.comunicadoPor} onChange={e => handleUpdateField(action.id, 'comunicadoPor', e.target.value)}
                                      className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent" placeholder="Auditor" />
                                  </td>
                                  <td className={`px-1 py-1 border ${SECTION_COLORS.demandante} text-center`}>
                                    <Select value={action.semana || 'W1'} onValueChange={v => handleUpdateField(action.id, 'semana', v)}>
                                      <SelectTrigger className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-16">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-48">
                                        {WEEK_OPTIONS.map(w => <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className={`px-1 py-1 border ${SECTION_COLORS.demandante}`}>
                                    <Input value={action.seccionDemandante} onChange={e => handleUpdateField(action.id, 'seccionDemandante', e.target.value)}
                                      className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent" placeholder="Sección" />
                                  </td>
                                  <td className={`px-1 py-1 border ${SECTION_COLORS.demandante}`}>
                                    <Input value={action.clienteZona} onChange={e => handleUpdateField(action.id, 'clienteZona', e.target.value)}
                                      className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent" placeholder="Zona" />
                                  </td>
                                  <td className={`px-1 py-1 border ${SECTION_COLORS.demandante}`}>
                                    <Input value={action.personaDemandada} onChange={e => handleUpdateField(action.id, 'personaDemandada', e.target.value)}
                                      className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent" placeholder="Persona" />
                                  </td>
                                  <td className={`px-1 py-1 border ${SECTION_COLORS.demandante}`}>
                                    <Input value={action.seccionDemandada} onChange={e => handleUpdateField(action.id, 'seccionDemandada', e.target.value)}
                                      className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent" placeholder="Sección" />
                                  </td>
                                  <td className={`px-1 py-1 border ${SECTION_COLORS.demandante}`}>
                                    <Input value={action.impactoObjetivo} onChange={e => handleUpdateField(action.id, 'impactoObjetivo', e.target.value)}
                                      className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent" placeholder="Impacto" />
                                  </td>
                                  {/* Blue: Acción */}
                                  <td className={`px-1 py-1 border ${SECTION_COLORS.accion}`}>
                                    <Textarea value={action.hallazgo} onChange={e => handleUpdateField(action.id, 'hallazgo', e.target.value)}
                                      className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent resize-none min-h-[24px]" placeholder="Descripción deficiencia" rows={1} />
                                  </td>
                                  <td className={`px-1 py-1 border ${SECTION_COLORS.accion}`}>
                                    <Textarea value={action.accionCorrectiva} onChange={e => handleUpdateField(action.id, 'accionCorrectiva', e.target.value)}
                                      className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent resize-none min-h-[24px]" placeholder="Acción correctiva" rows={1} />
                                  </td>
                                  <td className={`px-1 py-1 border ${SECTION_COLORS.accion}`}>
                                    <Textarea value={action.accionesPreventivas} onChange={e => handleUpdateField(action.id, 'accionesPreventivas', e.target.value)}
                                      className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent resize-none min-h-[24px]" placeholder="Acciones preventivas" rows={1} />
                                  </td>
                                  <td className={`px-1 py-1 border ${SECTION_COLORS.accion} text-center`}>
                                    <Select value={action.enviado || 'Pendiente'} onValueChange={v => handleUpdateField(action.id, 'enviado', v)}>
                                      <SelectTrigger className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-16">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Sí" className="text-xs">Sí</SelectItem>
                                        <SelectItem value="No" className="text-xs">No</SelectItem>
                                        <SelectItem value="Pendiente" className="text-xs">Pendiente</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  {/* Orange: Seguimiento */}
                                  <td className={`px-1 py-1 border ${SECTION_COLORS.seguimiento} text-center`}>
                                    <Select value={action.semanaPrevista || 'W1'} onValueChange={v => handleUpdateField(action.id, 'semanaPrevista', v)}>
                                      <SelectTrigger className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-16">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-48">
                                        {WEEK_OPTIONS.map(w => <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className={`px-1 py-1 border ${SECTION_COLORS.seguimiento}`}>
                                    <Input value={action.responsable} onChange={e => handleUpdateField(action.id, 'responsable', e.target.value)}
                                      className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent" placeholder="Responsable" />
                                  </td>
                                  <td className={`px-1 py-1 border ${SECTION_COLORS.seguimiento} text-center`}>
                                    <Select value={action.estado} onValueChange={v => handleUpdateField(action.id, 'estado', v)}>
                                      <SelectTrigger className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-20">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ESTADO_OPTIONS.map(opt => (
                                          <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className={`px-1 py-1 border ${SECTION_COLORS.seguimiento} text-center`}>
                                    <Input type="number" min={0} max={100} value={action.porcentaje}
                                      onChange={e => handleUpdateField(action.id, 'porcentaje', Number(e.target.value))}
                                      className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-14 text-center" />
                                  </td>
                                  <td className={`px-1 py-1 border ${SECTION_COLORS.seguimiento} text-center`}>
                                    <Select value={action.semanaReal || 'W1'} onValueChange={v => handleUpdateField(action.id, 'semanaReal', v)}>
                                      <SelectTrigger className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-16">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-48">
                                        {WEEK_OPTIONS.map(w => <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  {/* Delete */}
                                  <td className="px-1 py-1 border text-center bg-gray-50">
                                    <button onClick={() => handleDeleteAction(action.id)}
                                      className="text-red-400 hover:text-red-600 transition-colors">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
