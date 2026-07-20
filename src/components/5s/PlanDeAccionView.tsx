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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ListChecks, Plus, Trash2, Loader2, Filter, ChevronDown,
  FileText, User, Calendar, Target, ArrowRight, CheckCircle2,
  Clock, AlertCircle, X, Expand,
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
  { value: 'abierta', label: 'Abierta', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  { value: 'en_proceso', label: 'En Proceso', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  { value: 'resuelta', label: 'Resuelta', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  { value: 'cerrada', label: 'Cerrada', color: 'bg-gray-100 text-gray-600', icon: X },
];

const WEEK_OPTIONS = Array.from({ length: 53 }, (_, i) => `W${i + 1}`);

const S_COLORS: Record<number, string> = {
  1: '#8B5CF6', 2: '#EAB308', 3: '#3B82F6', 4: '#F43F5E', 5: '#F97316',
};

const S_BG_COLORS: Record<number, string> = {
  1: 'bg-violet-100 text-violet-800',
  2: 'bg-yellow-100 text-yellow-800',
  3: 'bg-blue-100 text-blue-800',
  4: 'bg-rose-100 text-rose-800',
  5: 'bg-orange-100 text-orange-800',
};

const SECTION_COLORS = {
  demandante: 'bg-amber-50 border-amber-300',
  accion: 'bg-sky-50 border-sky-300',
  seguimiento: 'bg-orange-50 border-orange-300',
};

// ═══════════════════════════════════════════════════════
// S-Step Badge Component
// ═══════════════════════════════════════════════════════
function SStepBadge({ sStep, compact = false }: { sStep: number; compact?: boolean }) {
  const stepData = S_STEPS.find(s => s.id === sStep);
  if (compact) {
    return (
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-white font-black text-[10px] shrink-0"
        style={{ backgroundColor: S_COLORS[sStep] }}
        title={stepData ? `S${sStep} — ${stepData.japaneseName} (${stepData.spanishName})` : `S${sStep}`}
      >
        S{sStep}
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white font-black text-xs shrink-0"
        style={{ backgroundColor: S_COLORS[sStep] }}
      >
        S{sStep}
      </span>
      <span className="text-[11px] font-semibold hidden sm:inline" style={{ color: S_COLORS[sStep] }}>
        {stepData?.japaneseName}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// New Entry Dialog
// ═══════════════════════════════════════════════════════
function NewEntryDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (sStep: number) => void;
}) {
  const [selectedS, setSelectedS] = useState<number>(1);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-rose-600" />
            Nueva Entrada — Plan de Acción
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecciona desde qué S proviene la evidencia:
          </p>
          <div className="grid grid-cols-5 gap-2">
            {S_STEPS.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedS(s.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                  selectedS === s.id
                    ? 'scale-105 shadow-md'
                    : 'opacity-60 hover:opacity-80'
                }`}
                style={{
                  borderColor: selectedS === s.id ? S_COLORS[s.id] : 'transparent',
                  backgroundColor: selectedS === s.id ? S_COLORS[s.id] + '15' : 'transparent',
                }}
              >
                <span
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-sm"
                  style={{ backgroundColor: S_COLORS[s.id] }}
                >
                  S{s.id}
                </span>
                <span className="text-[10px] font-semibold" style={{ color: S_COLORS[s.id] }}>
                  {s.japaneseName}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => onConfirm(selectedS)}
            style={{ backgroundColor: S_COLORS[selectedS] }}
            className="text-white gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Crear en S{selectedS}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════
// Mobile Action Card (for small screens)
// ═══════════════════════════════════════════════════════
function ActionCard({
  action,
  onUpdateField,
  onDelete,
}: {
  action: ActionItemData;
  onUpdateField: (id: string, field: string, value: any) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const estadoInfo = ESTADO_OPTIONS.find(e => e.value === action.estado) || ESTADO_OPTIONS[0];

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      {/* Card header — always visible */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <SStepBadge sStep={action.sStep} compact />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs text-gray-500">#{action.numeroEntrada}</span>
            <span className="text-xs text-muted-foreground truncate">
              {action.hallazgo || 'Sin descripción'}
            </span>
          </div>
        </div>
        <Badge className={`text-[10px] px-1.5 py-0 ${estadoInfo.color}`}>
          {estadoInfo.label}
        </Badge>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Compact summary line */}
      {!expanded && (
        <div className="px-3 pb-2.5 flex items-center gap-3 text-[11px] text-muted-foreground">
          {action.responsable && (
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{action.responsable}</span>
          )}
          {action.semanaPrevista && (
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{action.semanaPrevista}</span>
          )}
          <span className="flex items-center gap-1"><Target className="h-3 w-3" />{action.porcentaje}%</span>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="border-t px-3 py-3 space-y-3">
          {/* DEMANDA */}
          <div>
            <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Demanda
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <Field label="Fecha" compact>
                <Input type="date" value={action.fechaEntrada} onChange={e => onUpdateField(action.id, 'fechaEntrada', e.target.value)}
                  className="h-7 text-xs p-0 px-1.5 border rounded" />
              </Field>
              <Field label="Semana" compact>
                <Select value={action.semana || 'W1'} onValueChange={v => onUpdateField(action.id, 'semana', v)}>
                  <SelectTrigger className="h-7 text-xs p-0 px-1.5 border rounded w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {WEEK_OPTIONS.map(w => <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Comunicado por" compact>
                <Input value={action.comunicadoPor} onChange={e => onUpdateField(action.id, 'comunicadoPor', e.target.value)}
                  className="h-7 text-xs p-0 px-1.5 border rounded" placeholder="Auditor" />
              </Field>
              <Field label="Sección Demand." compact>
                <Input value={action.seccionDemandante} onChange={e => onUpdateField(action.id, 'seccionDemandante', e.target.value)}
                  className="h-7 text-xs p-0 px-1.5 border rounded" placeholder="Sección" />
              </Field>
              <Field label="Zona / Cliente" compact>
                <Input value={action.clienteZona} onChange={e => onUpdateField(action.id, 'clienteZona', e.target.value)}
                  className="h-7 text-xs p-0 px-1.5 border rounded" placeholder="Zona" />
              </Field>
              <Field label="Persona Demand." compact>
                <Input value={action.personaDemandada} onChange={e => onUpdateField(action.id, 'personaDemandada', e.target.value)}
                  className="h-7 text-xs p-0 px-1.5 border rounded" placeholder="Persona" />
              </Field>
              <Field label="Sección Recept." compact>
                <Input value={action.seccionDemandada} onChange={e => onUpdateField(action.id, 'seccionDemandada', e.target.value)}
                  className="h-7 text-xs p-0 px-1.5 border rounded" placeholder="Sección" />
              </Field>
              <Field label="Impacto Obj." compact>
                <Input value={action.impactoObjetivo} onChange={e => onUpdateField(action.id, 'impactoObjetivo', e.target.value)}
                  className="h-7 text-xs p-0 px-1.5 border rounded" placeholder="Impacto" />
              </Field>
            </div>
          </div>

          {/* ACCIÓN */}
          <div>
            <div className="text-[10px] font-bold text-sky-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <ArrowRight className="h-3 w-3" /> Acción
            </div>
            <div className="space-y-1.5">
              <Field label="Descripción / Hallazgo" compact>
                <Textarea value={action.hallazgo} onChange={e => onUpdateField(action.id, 'hallazgo', e.target.value)}
                  className="text-xs p-1.5 border rounded resize-none min-h-[48px]" placeholder="Descripción de la deficiencia" rows={2} />
              </Field>
              <Field label="Acción Correctiva" compact>
                <Textarea value={action.accionCorrectiva} onChange={e => onUpdateField(action.id, 'accionCorrectiva', e.target.value)}
                  className="text-xs p-1.5 border rounded resize-none min-h-[48px]" placeholder="Acción correctiva" rows={2} />
              </Field>
              <Field label="Acciones Preventivas" compact>
                <Textarea value={action.accionesPreventivas} onChange={e => onUpdateField(action.id, 'accionesPreventivas', e.target.value)}
                  className="text-xs p-1.5 border rounded resize-none min-h-[48px]" placeholder="Acciones preventivas" rows={2} />
              </Field>
              <Field label="Enviado" compact>
                <Select value={action.enviado || 'Pendiente'} onValueChange={v => onUpdateField(action.id, 'enviado', v)}>
                  <SelectTrigger className="h-7 text-xs p-0 px-1.5 border rounded w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sí" className="text-xs">Sí</SelectItem>
                    <SelectItem value="No" className="text-xs">No</SelectItem>
                    <SelectItem value="Pendiente" className="text-xs">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>

          {/* SEGUIMIENTO */}
          <div>
            <div className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Seguimiento
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <Field label="Sem. Prevista" compact>
                <Select value={action.semanaPrevista || 'W1'} onValueChange={v => onUpdateField(action.id, 'semanaPrevista', v)}>
                  <SelectTrigger className="h-7 text-xs p-0 px-1.5 border rounded w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {WEEK_OPTIONS.map(w => <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Responsable" compact>
                <Input value={action.responsable} onChange={e => onUpdateField(action.id, 'responsable', e.target.value)}
                  className="h-7 text-xs p-0 px-1.5 border rounded" placeholder="Responsable" />
              </Field>
              <Field label="Estado" compact>
                <Select value={action.estado} onValueChange={v => onUpdateField(action.id, 'estado', v)}>
                  <SelectTrigger className="h-7 text-xs p-0 px-1.5 border rounded w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADO_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Progreso %" compact>
                <Input type="number" min={0} max={100} value={action.porcentaje}
                  onChange={e => onUpdateField(action.id, 'porcentaje', Number(e.target.value))}
                  className="h-7 text-xs p-0 px-1.5 border rounded w-full text-center" />
              </Field>
              <Field label="Sem. Real" compact>
                <Select value={action.semanaReal || 'W1'} onValueChange={v => onUpdateField(action.id, 'semanaReal', v)}>
                  <SelectTrigger className="h-7 text-xs p-0 px-1.5 border rounded w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {WEEK_OPTIONS.map(w => <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>

          {/* Delete button */}
          <div className="flex justify-end pt-1">
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1 text-xs h-7"
              onClick={() => onDelete(action.id)}>
              <Trash2 className="h-3.5 w-3.5" /> Eliminar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Field helper for mobile cards
// ═══════════════════════════════════════════════════════
function Field({ label, children, compact = false }: { label: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <div className={compact ? '' : 'space-y-1'}>
      <label className="text-[10px] font-medium text-muted-foreground leading-tight block">{label}</label>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Main Component — Unified Plan de Acción
// ═══════════════════════════════════════════════════════
export default function PlanDeAccionView() {
  const { currentUser, currentProject, currentZone } = use5SStore();
  const [actions, setActions] = useState<ActionItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [filterS, setFilterS] = useState<string>('all');
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [showNewDialog, setShowNewDialog] = useState(false);

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

  const handleAddAction = async (sStep: number) => {
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
        toast.success(`Entrada creada en S${sStep}`);
        await loadActions();
      } else {
        toast.error(`Error: ${json.error || 'Error desconocido'}`);
      }
    } catch (e) {
      console.error('Error adding action:', e);
      toast.error('Error de conexión');
    }
    setShowNewDialog(false);
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

  // Filter actions
  const filteredActions = actions
    .filter(a => filterEstado === 'all' || a.estado === filterEstado)
    .filter(a => filterS === 'all' || a.sStep === Number(filterS));

  // Stats
  const totalActions = actions.length;
  const completedActions = actions.filter(a => a.estado === 'resuelta' || a.estado === 'cerrada').length;
  const openActions = actions.filter(a => a.estado === 'abierta').length;
  const inProgressActions = actions.filter(a => a.estado === 'en_proceso').length;

  const getEstadoBadge = (estado: string) => {
    const opt = ESTADO_OPTIONS.find(e => e.value === estado);
    return opt || ESTADO_OPTIONS[0];
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 sm:px-4 py-2.5 border-b bg-white shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ListChecks className="h-5 w-5 text-rose-600 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold truncate">Plan de Acción</h2>
            <Badge variant="outline" className="text-[10px] shrink-0 hidden sm:inline-flex">
              {totalActions} entrada{totalActions !== 1 ? 's' : ''}
            </Badge>
          </div>
          <Button size="sm" className="gap-1 text-xs h-8 shrink-0" onClick={() => setShowNewDialog(true)}
            style={{ backgroundColor: '#E11D48' }}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Nueva Entrada</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterEstado('all')}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-colors whitespace-nowrap ${
              filterEstado === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Todas {totalActions}
          </button>
          <button
            onClick={() => setFilterEstado('abierta')}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-colors whitespace-nowrap ${
              filterEstado === 'abierta' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
            }`}
          >
            <AlertCircle className="h-3 w-3" /> Abiertas {openActions}
          </button>
          <button
            onClick={() => setFilterEstado('en_proceso')}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-colors whitespace-nowrap ${
              filterEstado === 'en_proceso' ? 'bg-yellow-600 text-white border-yellow-600' : 'bg-white text-yellow-600 border-yellow-200 hover:bg-yellow-50'
            }`}
          >
            <Clock className="h-3 w-3" /> En Proceso {inProgressActions}
          </button>
          <button
            onClick={() => setFilterEstado('resuelta')}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-colors whitespace-nowrap ${
              filterEstado === 'resuelta' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-600 border-green-200 hover:bg-green-50'
            }`}
          >
            <CheckCircle2 className="h-3 w-3" /> Resueltas {completedActions}
          </button>

          {/* S-step filter pills */}
          <div className="h-4 w-px bg-gray-200 mx-1 shrink-0" />
          {S_STEPS.map(s => {
            const count = actions.filter(a => a.sStep === s.id).length;
            return (
              <button
                key={s.id}
                onClick={() => setFilterS(filterS === String(s.id) ? 'all' : String(s.id))}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-colors whitespace-nowrap ${
                  filterS === String(s.id)
                    ? 'text-white border-transparent'
                    : 'bg-white border-gray-200 hover:opacity-80'
                }`}
                style={filterS === String(s.id) ? { backgroundColor: S_COLORS[s.id], borderColor: S_COLORS[s.id] } : { color: S_COLORS[s.id] }}
              >
                S{s.id} ({count})
              </button>
            );
          })}

          {/* Reset filters */}
          {(filterEstado !== 'all' || filterS !== 'all') && (
            <button
              onClick={() => { setFilterEstado('all'); setFilterS('all'); }}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              <X className="h-3 w-3" /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-rose-500 animate-spin" />
        </div>
      ) : filteredActions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <ListChecks className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-muted-foreground mb-1">
            {actions.length === 0 ? 'No hay entradas en el Plan de Acción' : 'No hay entradas con estos filtros'}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {actions.length === 0 ? 'Pulsa "Nueva Entrada" para crear la primera.' : 'Cambia los filtros o limpia la selección.'}
          </p>
          {actions.length === 0 && (
            <Button size="sm" className="gap-1 text-xs" onClick={() => setShowNewDialog(true)}
              style={{ backgroundColor: '#E11D48' }}>
              <Plus className="h-3.5 w-3.5" /> Nueva Entrada
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* MOBILE: Card-based layout */}
          <div className="flex-1 min-h-0 overflow-auto p-3 space-y-2 lg:hidden">
            {filteredActions.map(action => (
              <ActionCard
                key={action.id}
                action={action}
                onUpdateField={handleUpdateField}
                onDelete={handleDeleteAction}
              />
            ))}
          </div>

          {/* DESKTOP: Table layout */}
          <div className="flex-1 min-h-0 overflow-auto p-4 hidden lg:block">
            <div className="overflow-auto border rounded-lg">
              <table className="w-full text-xs border-collapse min-w-[1200px]">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="bg-gray-600 text-white px-1.5 py-1.5 text-center font-bold border border-gray-500 w-10">
                      Origen
                    </th>
                    <th colSpan={9} className="bg-amber-400 text-white px-2 py-1.5 text-center text-xs font-bold border border-amber-500">
                      DEMANDA
                    </th>
                    <th colSpan={4} className="bg-sky-400 text-white px-2 py-1.5 text-center text-xs font-bold border border-sky-500">
                      ACCIÓN
                    </th>
                    <th colSpan={5} className="bg-orange-400 text-white px-2 py-1.5 text-center text-xs font-bold border border-orange-500">
                      SEGUIMIENTO
                    </th>
                    <th className="bg-gray-400 text-white px-1 py-1.5 text-center text-xs font-bold border border-gray-500 w-8">
                      🗑
                    </th>
                  </tr>
                  <tr>
                    {/* Origen column */}
                    <th className="bg-gray-500 text-white px-1 py-1 text-center font-semibold border border-gray-400 whitespace-nowrap">S</th>
                    {/* Yellow section headers */}
                    <th className="bg-amber-400 text-white px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap">Nº</th>
                    <th className="bg-amber-400 text-white px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap">Fecha</th>
                    <th className="bg-amber-400 text-white px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap">Comunicado por</th>
                    <th className="bg-amber-400 text-white px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap">Semana</th>
                    <th className="bg-amber-400 text-white px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap">Sección Demand.</th>
                    <th className="bg-amber-400 text-white px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap">Zona</th>
                    <th className="bg-amber-400 text-white px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap">Persona Demand.</th>
                    <th className="bg-amber-400 text-white px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap">Sección Recept.</th>
                    <th className="bg-amber-400 text-white px-1 py-1 text-center font-semibold border border-amber-400 whitespace-nowrap">Impacto Obj.</th>
                    {/* Blue section headers */}
                    <th className="bg-sky-400 text-white px-1 py-1 text-center font-semibold border border-sky-400 whitespace-nowrap">Descripción</th>
                    <th className="bg-sky-400 text-white px-1 py-1 text-center font-semibold border border-sky-400 whitespace-nowrap">Acción Correctiva</th>
                    <th className="bg-sky-400 text-white px-1 py-1 text-center font-semibold border border-sky-400 whitespace-nowrap">Acciones Preventivas</th>
                    <th className="bg-sky-400 text-white px-1 py-1 text-center font-semibold border border-sky-400 whitespace-nowrap">Enviado</th>
                    {/* Orange section headers */}
                    <th className="bg-orange-400 text-white px-1 py-1 text-center font-semibold border border-orange-400 whitespace-nowrap">Sem. Prevista</th>
                    <th className="bg-orange-400 text-white px-1 py-1 text-center font-semibold border border-orange-400 whitespace-nowrap">Responsable</th>
                    <th className="bg-orange-400 text-white px-1 py-1 text-center font-semibold border border-orange-400 whitespace-nowrap">Estado</th>
                    <th className="bg-orange-400 text-white px-1 py-1 text-center font-semibold border border-orange-400 whitespace-nowrap">Progreso %</th>
                    <th className="bg-orange-400 text-white px-1 py-1 text-center font-semibold border border-orange-400 whitespace-nowrap">Sem. Real</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActions.map((action) => {
                    const estadoInfo = getEstadoBadge(action.estado);
                    return (
                      <tr key={action.id} className={`border-b hover:bg-gray-50 ${action.estado === 'resuelta' || action.estado === 'cerrada' ? 'bg-green-50/50' : ''}`}>
                        {/* Origen S badge */}
                        <td className="px-1 py-1 border text-center bg-gray-50">
                          <span
                            className="inline-flex items-center justify-center w-7 h-7 rounded text-white font-black text-[10px]"
                            style={{ backgroundColor: S_COLORS[action.sStep] }}
                            title={`S${action.sStep} — ${S_STEPS.find(s => s.id === action.sStep)?.japaneseName}`}
                          >
                            S{action.sStep}
                          </span>
                        </td>
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
          </div>
        </>
      )}

      {/* New Entry Dialog */}
      <NewEntryDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onConfirm={handleAddAction}
      />
    </div>
  );
}
