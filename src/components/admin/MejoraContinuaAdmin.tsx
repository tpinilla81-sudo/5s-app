'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { use5SStore } from '@/lib/store';
import { S_STEPS } from '@/lib/5s-constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles, Plan, CheckCircle2, ArrowRight, Plus, Trash2, Edit3,
  Save, Loader2, BarChart3, Target, Clock, AlertTriangle, TrendingUp,
  RotateCcw, ChevronDown, ChevronRight, FileText, Users, Calendar,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════
// PDCA Cycle Types
// ═══════════════════════════════════════════════════════

interface PDCAItem {
  id: string;
  title: string;
  description: string;
  phase: 'plan' | 'do' | 'check' | 'act';
  sStep: number;
  responsable: string | null;
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';
  fechaInicio: string;
  fechaLimite: string | null;
  resultado: string | null;
  projectId: string;
  zoneId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PDCAStat {
  plan: number;
  do: number;
  check: number;
  act: number;
  completadas: number;
  pendientes: number;
  en_progreso: number;
}

const PHASE_CONFIG = {
  plan: { label: 'Plan', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Target, description: 'Identificar oportunidades de mejora y planificar acciones' },
  do: { label: 'Do', color: 'bg-green-100 text-green-800 border-green-300', icon: ArrowRight, description: 'Ejecutar las acciones planificadas' },
  check: { label: 'Check', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: BarChart3, description: 'Verificar resultados y comparar con objetivos' },
  act: { label: 'Act', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: TrendingUp, description: 'Estandarizar o ajustar según resultados' },
};

const PRIORIDAD_CONFIG = {
  baja: { label: 'Baja', color: 'bg-gray-100 text-gray-700' },
  media: { label: 'Media', color: 'bg-blue-100 text-blue-700' },
  alta: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  critica: { label: 'Crítica', color: 'bg-red-100 text-red-700' },
};

const ESTADO_CONFIG = {
  pendiente: { label: 'Pendiente', color: 'bg-gray-100 text-gray-700' },
  en_progreso: { label: 'En Progreso', color: 'bg-blue-100 text-blue-700' },
  completada: { label: 'Completada', color: 'bg-green-100 text-green-700' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
};

export default function MejoraContinuaAdmin() {
  const { currentProject, currentZone } = use5SStore();
  const [activeView, setActiveView] = useState<'overview' | 'pdca' | 'actions' | 'indicators'>('overview');
  const [items, setItems] = useState<PDCAItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    phase: 'plan' as 'plan' | 'do' | 'check' | 'act',
    sStep: 1,
    responsable: '',
    prioridad: 'media' as 'baja' | 'media' | 'alta' | 'critica',
    fechaLimite: '',
  });

  useEffect(() => {
    loadItems();
  }, [currentProject, currentZone]);

  const loadItems = async () => {
    if (!currentProject?.id) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ projectId: currentProject.id });
      if (currentZone?.id) params.set('zoneId', currentZone.id);
      const res = await fetch(`/api/pdca?${params}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data || []);
      }
    } catch (e) {
      console.error('Error loading PDCA items:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentProject?.id || !formData.title.trim()) return;
    try {
      const body: any = {
        ...formData,
        projectId: currentProject.id,
        zoneId: currentZone?.id || null,
        responsable: formData.responsable || null,
        fechaLimite: formData.fechaLimite || null,
      };

      if (editingId) {
        body.id = editingId;
        await fetch('/api/pdca', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } else {
        await fetch('/api/pdca', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      await loadItems();
      resetForm();
    } catch (e) {
      console.error('Error saving PDCA item:', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este elemento?')) return;
    try {
      await fetch(`/api/pdca?id=${id}`, { method: 'DELETE' });
      await loadItems();
    } catch (e) {
      console.error('Error deleting PDCA item:', e);
    }
  };

  const handleStatusChange = async (id: string, estado: string) => {
    try {
      await fetch('/api/pdca', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado }),
      });
      await loadItems();
    } catch (e) {
      console.error('Error updating status:', e);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ title: '', description: '', phase: 'plan', sStep: 1, responsable: '', prioridad: 'media', fechaLimite: '' });
  };

  const startEdit = (item: PDCAItem) => {
    setEditingId(item.id);
    setFormData({
      title: item.title,
      description: item.description || '',
      phase: item.phase,
      sStep: item.sStep,
      responsable: item.responsable || '',
      prioridad: item.prioridad,
      fechaLimite: item.fechaLimite || '',
    });
    setShowForm(true);
  };

  // Stats
  const stats: PDCAStat = {
    plan: items.filter(i => i.phase === 'plan').length,
    do: items.filter(i => i.phase === 'do').length,
    check: items.filter(i => i.phase === 'check').length,
    act: items.filter(i => i.phase === 'act').length,
    completadas: items.filter(i => i.estado === 'completada').length,
    pendientes: items.filter(i => i.estado === 'pendiente').length,
    en_progreso: items.filter(i => i.estado === 'en_progreso').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-500" />
            Mejora Continua — Ciclo PDCA
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión del ciclo Plan-Do-Check-Act para la mejora continua tras completar las 5S
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
          <Plus className="h-4 w-4" /> Nueva Acción
        </Button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b">
        {[
          { key: 'overview', label: 'Resumen PDCA', icon: BarChart3 },
          { key: 'pdca', label: 'Ciclo PDCA', icon: RotateCcw },
          { key: 'actions', label: 'Acciones', icon: FileText },
          { key: 'indicators', label: 'Indicadores', icon: TrendingUp },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeView === tab.key
                ? 'border-green-500 text-green-700'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ═══ OVERVIEW ═══ */}
        {activeView === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* PDCA Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(PHASE_CONFIG).map(([key, cfg]) => (
                <Card key={key} className="border-l-4" style={{ borderLeftColor: key === 'plan' ? '#3B82F6' : key === 'do' ? '#22C55E' : key === 'check' ? '#F59E0B' : '#8B5CF6' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <cfg.icon className="h-5 w-5" style={{ color: key === 'plan' ? '#3B82F6' : key === 'do' ? '#22C55E' : key === 'check' ? '#F59E0B' : '#8B5CF6' }} />
                      <span className="text-2xl font-bold">{stats[key as keyof PDCAStat]}</span>
                    </div>
                    <p className="text-sm font-semibold">{cfg.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{cfg.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="h-6 w-6 text-gray-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats.pendientes}</p>
                  <p className="text-sm text-muted-foreground">Pendientes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <ArrowRight className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats.en_progreso}</p>
                  <p className="text-sm text-muted-foreground">En Progreso</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats.completadas}</p>
                  <p className="text-sm text-muted-foreground">Completadas</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Últimas Acciones</CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No hay acciones de mejora registradas. Crea la primera acción para comenzar el ciclo PDCA.</p>
                ) : (
                  <div className="space-y-2">
                    {items.slice(0, 5).map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50">
                        <Badge className={PHASE_CONFIG[item.phase].color}>{PHASE_CONFIG[item.phase].label}</Badge>
                        <span className="text-sm font-medium flex-1">{item.title}</span>
                        <Badge variant="outline" className={ESTADO_CONFIG[item.estado].color}>{ESTADO_CONFIG[item.estado].label}</Badge>
                        <Badge variant="outline" className={PRIORIDAD_CONFIG[item.prioridad].color}>{PRIORIDAD_CONFIG[item.prioridad].label}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ═══ PDCA CYCLE VIEW ═══ */}
        {activeView === 'pdca' && (
          <motion.div key="pdca" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* PDCA Visual Cycle */}
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(PHASE_CONFIG).map(([key, cfg]) => {
                const phaseItems = items.filter(i => i.phase === key);
                return (
                  <Card key={key} className="border-t-4" style={{ borderTopColor: key === 'plan' ? '#3B82F6' : key === 'do' ? '#22C55E' : key === 'check' ? '#F59E0B' : '#8B5CF6' }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <cfg.icon className="h-4 w-4" />
                        {cfg.label} — {cfg.description.split(' ').slice(0, 3).join(' ')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {phaseItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Sin acciones en esta fase</p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {phaseItems.map(item => (
                            <div key={item.id} className="p-2 rounded border text-sm hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={ESTADO_CONFIG[item.estado].color}>{ESTADO_CONFIG[item.estado].label}</Badge>
                                <span className="font-medium truncate">{item.title}</span>
                              </div>
                              {expandedId === item.id && (
                                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                  {item.description && <p>{item.description}</p>}
                                  {item.responsable && <p>Responsable: {item.responsable}</p>}
                                  {item.fechaLimite && <p>Fecha límite: {new Date(item.fechaLimite).toLocaleDateString('es-ES')}</p>}
                                  <div className="flex gap-1 mt-2">
                                    {item.estado !== 'completada' && (
                                      <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={(e) => { e.stopPropagation(); handleStatusChange(item.id, 'completada'); }}>Completar</Button>
                                    )}
                                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={(e) => { e.stopPropagation(); startEdit(item); }}>Editar</Button>
                                    <Button size="sm" variant="outline" className="h-6 text-[10px] text-red-600" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>Eliminar</Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ═══ ACTIONS LIST ═══ */}
        {activeView === 'actions' && (
          <motion.div key="actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3 items-center flex-wrap">
              <Select value={formData.phase} onValueChange={(v) => setFormData(prev => ({ ...prev, phase: v as any }))}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Fase" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="plan">Plan</SelectItem>
                  <SelectItem value="do">Do</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="act">Act</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Items table */}
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-green-500" /></div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles className="h-10 w-10 text-green-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No hay acciones de mejora. Crea la primera para iniciar el ciclo PDCA.</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Fase</th>
                      <th className="px-4 py-3 text-left font-medium">Título</th>
                      <th className="px-4 py-3 text-left font-medium">S-Step</th>
                      <th className="px-4 py-3 text-left font-medium">Prioridad</th>
                      <th className="px-4 py-3 text-left font-medium">Estado</th>
                      <th className="px-4 py-3 text-left font-medium">Responsable</th>
                      <th className="px-4 py-3 text-left font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3"><Badge className={PHASE_CONFIG[item.phase].color}>{PHASE_CONFIG[item.phase].label}</Badge></td>
                        <td className="px-4 py-3 font-medium">{item.title}</td>
                        <td className="px-4 py-3"><Badge variant="outline" style={{ color: S_STEPS.find(s => s.id === item.sStep)?.color }}>S{item.sStep}</Badge></td>
                        <td className="px-4 py-3"><Badge variant="outline" className={PRIORIDAD_CONFIG[item.prioridad].color}>{PRIORIDAD_CONFIG[item.prioridad].label}</Badge></td>
                        <td className="px-4 py-3">
                          <Select value={item.estado} onValueChange={(v) => handleStatusChange(item.id, v)}>
                            <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente">Pendiente</SelectItem>
                              <SelectItem value="en_progreso">En Progreso</SelectItem>
                              <SelectItem value="completada">Completada</SelectItem>
                              <SelectItem value="cancelada">Cancelada</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.responsable || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(item)}><Edit3 className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ INDICATORS ═══ */}
        {activeView === 'indicators' && (
          <motion.div key="indicators" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Indicadores de Mejora Continua</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  {/* Completion rate */}
                  <div>
                    <p className="text-sm font-medium mb-2">Tasa de Completación</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-4">
                        <div className="bg-green-500 h-4 rounded-full transition-all" style={{ width: `${items.length > 0 ? Math.round((stats.completadas / items.length) * 100) : 0}%` }} />
                      </div>
                      <span className="text-sm font-bold">{items.length > 0 ? Math.round((stats.completadas / items.length) * 100) : 0}%</span>
                    </div>
                  </div>
                  {/* PDCA balance */}
                  <div>
                    <p className="text-sm font-medium mb-2">Balance del Ciclo PDCA</p>
                    <div className="flex gap-2">
                      {Object.entries(PHASE_CONFIG).map(([key, cfg]) => (
                        <div key={key} className="flex-1 text-center">
                          <div className="text-lg font-bold" style={{ color: key === 'plan' ? '#3B82F6' : key === 'do' ? '#22C55E' : key === 'check' ? '#F59E0B' : '#8B5CF6' }}>
                            {stats[key as keyof PDCAStat]}
                          </div>
                          <div className="text-xs text-muted-foreground">{cfg.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Priority distribution */}
                  <div>
                    <p className="text-sm font-medium mb-2">Distribución por Prioridad</p>
                    <div className="space-y-1">
                      {Object.entries(PRIORIDAD_CONFIG).map(([key, cfg]) => {
                        const count = items.filter(i => i.prioridad === key).length;
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-xs w-16">{cfg.label}</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div className="h-2 rounded-full bg-current" style={{ width: `${items.length > 0 ? (count / items.length) * 100 : 0}%`, color: key === 'critica' ? '#EF4444' : key === 'alta' ? '#F97316' : key === 'media' ? '#3B82F6' : '#9CA3AF' }} />
                            </div>
                            <span className="text-xs font-medium">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* S-Step distribution */}
                  <div>
                    <p className="text-sm font-medium mb-2">Distribución por S-Step</p>
                    <div className="space-y-1">
                      {S_STEPS.map(s => {
                        const count = items.filter(i => i.sStep === s.id).length;
                        return (
                          <div key={s.id} className="flex items-center gap-2">
                            <span className="text-xs w-16" style={{ color: s.color }}>S{s.id} {s.name}</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div className="h-2 rounded-full" style={{ width: `${items.length > 0 ? (count / items.length) * 100 : 0}%`, backgroundColor: s.color }} />
                            </div>
                            <span className="text-xs font-medium">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ CREATE/EDIT FORM ═══ */}
      {showForm && (
        <Card className="border-green-200 border-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {editingId ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingId ? 'Editar Acción PDCA' : 'Nueva Acción PDCA'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-xs">Título *</Label>
                <Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Título de la acción de mejora" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Descripción</Label>
                <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Describe la acción de mejora" rows={3} />
              </div>
              <div>
                <Label className="text-xs">Fase PDCA *</Label>
                <Select value={formData.phase} onValueChange={v => setFormData(p => ({ ...p, phase: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plan">Plan — Planificar</SelectItem>
                    <SelectItem value="do">Do — Ejecutar</SelectItem>
                    <SelectItem value="check">Check — Verificar</SelectItem>
                    <SelectItem value="act">Act — Actuar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">S-Step</Label>
                <Select value={String(formData.sStep)} onValueChange={v => setFormData(p => ({ ...p, sStep: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {S_STEPS.map(s => <SelectItem key={s.id} value={String(s.id)}>S{s.id} — {s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Prioridad</Label>
                <Select value={formData.prioridad} onValueChange={v => setFormData(p => ({ ...p, prioridad: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Responsable</Label>
                <Input value={formData.responsable} onChange={e => setFormData(p => ({ ...p, responsable: e.target.value }))} placeholder="Nombre del responsable" />
              </div>
              <div>
                <Label className="text-xs">Fecha Límite</Label>
                <Input type="date" value={formData.fechaLimite} onChange={e => setFormData(p => ({ ...p, fechaLimite: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!formData.title.trim()} className="bg-green-600 hover:bg-green-700 text-white gap-2">
                <Save className="h-4 w-4" /> {editingId ? 'Guardar Cambios' : 'Crear Acción'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
