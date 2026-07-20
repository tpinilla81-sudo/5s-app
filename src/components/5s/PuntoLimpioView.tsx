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
  Droplets, Plus, Trash2, Loader2, ChevronDown, Filter,
  CheckCircle2, Clock, AlertCircle, X, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { use5SStore } from '@/lib/store';
import { INVENTORY_CONFIGS } from '@/lib/5s-constants';
import type { InventoryConfig } from '@/lib/5s-constants';

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════
interface PuntoLimpioItem {
  id: string;
  name: string;
  location: string;
  category: string;
  quantity: number;
  price: number | null;
  extra?: Record<string, string | number>;
  photoUrl: string | null;
  zonaOrigen: string | null;
  zonaDestino: string | null;
  project?: { name: string };
  createdAt: string;
}

const S3_CONFIG = INVENTORY_CONFIGS[3];
const defaultConfig = INVENTORY_CONFIGS[3];

const ESTADO_LIMPIEZA = [
  { value: 'pendiente', label: 'Pendiente', color: 'bg-red-100 text-red-800' },
  { value: 'en_proceso', label: 'En Proceso', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'limpio', label: 'Limpio', color: 'bg-green-100 text-green-800' },
  { value: 'verificado', label: 'Verificado', color: 'bg-blue-100 text-blue-800' },
];

// ═══════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════
export default function PuntoLimpioView() {
  const { currentProject, currentZone } = use5SStore();
  const [items, setItems] = useState<PuntoLimpioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [customConfig, setCustomConfig] = useState<InventoryConfig | null>(null);
  const [hasTemplate, setHasTemplate] = useState<boolean | null>(null);

  const config: InventoryConfig = customConfig || INVENTORY_CONFIGS[3];

  const loadCustomInventoryConfig = async () => {
    try {
      // If the zone has a board config, fetch inventory template from that config
      if (currentZone?.boardConfigId) {
        const slotsRes = await fetch(`/api/board-slots?boardConfigId=${currentZone.boardConfigId}&sStep=3&miniStep=3`);
        const slotsJson = await slotsRes.json();
        if (slotsJson.success && slotsJson.data.length > 0) {
          const slot = slotsJson.data[0];
          const inventarioTemplates = (slot.templates || []).filter(
            (t: any) => t.template?.type === 'inventario'
          );
          if (inventarioTemplates.length > 0) {
            const content = JSON.parse(inventarioTemplates[0].template.content);
            if (content.categories && content.extraFields) {
              setCustomConfig({
                title: content.title || defaultConfig.title,
                subtitle: content.subtitle || defaultConfig.subtitle,
                templateName: content.templateName || defaultConfig.templateName,
                categories: content.categories,
                extraFields: content.extraFields,
                ...(content.desplegables_jerarquicos ? { desplegables_jerarquicos: content.desplegables_jerarquicos } : {}),
              });
              setHasTemplate(true);
            } else {
              setCustomConfig(null);
              setHasTemplate(true);
            }
          } else {
            setCustomConfig(null);
            setHasTemplate(true);
          }
        } else {
          setCustomConfig(null);
          setHasTemplate(true);
        }
      } else {
        // Fallback: load global template
        const res = await fetch(`/api/templates?type=inventario&sStep=3&miniStep=3`);
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
          const content = JSON.parse(json.data[0].content);
          if (content.categories && content.extraFields) {
            setCustomConfig({
              title: content.title || defaultConfig.title,
              subtitle: content.subtitle || defaultConfig.subtitle,
              templateName: content.templateName || defaultConfig.templateName,
              categories: content.categories,
              extraFields: content.extraFields,
              ...(content.desplegables_jerarquicos ? { desplegables_jerarquicos: content.desplegables_jerarquicos } : {}),
            });
            setHasTemplate(true);
          } else {
            setCustomConfig(null);
            setHasTemplate(true);
          }
        } else {
          setCustomConfig(null);
          setHasTemplate(true);
        }
      }
    } catch (e) {
      console.error('Error loading custom inventory config:', e);
      setCustomConfig(null);
      setHasTemplate(true);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadItems();
    loadCustomInventoryConfig();
  }, [currentProject, currentZone]);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      let url = `/api/inventory?sStep=3`;
      if (currentProject?.id) url += `&projectId=${currentProject.id}`;
      if (currentZone?.id) url += `&zoneId=${currentZone.id}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setItems(json.data || []);
      }
    } catch (error) {
      console.error('Error loading punto limpio items:', error);
      toast.error('Error al cargar los puntos de suciedad');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!currentProject?.id) {
      toast.error('No hay proyecto seleccionado');
      return;
    }
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sStep: 3,
          name: '',
          location: currentZone?.name || '',
          category: 'polvo',
          quantity: 1,
          price: null,
          action: 'limpiar',
          projectId: currentProject.id,
          zoneId: currentZone?.id || null,
          extra: JSON.stringify({
            nivel: 'Moderado',
            fuente: '',
            metodoLimpieza: '',
            frecuenciaLimpieza: '',
            estadoLimpieza: 'pendiente',
          }),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Punto de suciedad agregado');
        await loadItems();
      } else {
        toast.error(`Error: ${json.error || 'Error desconocido'}`);
      }
    } catch (e) {
      console.error('Error adding item:', e);
      toast.error('Error de conexión');
    }
  };

  const handleUpdateField = async (itemId: string, field: string, value: any) => {
    // Optimistic update
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      if (field.startsWith('extra.')) {
        const extraKey = field.replace('extra.', '');
        return { ...item, extra: { ...item.extra, [extraKey]: value } };
      }
      return { ...item, [field]: value };
    }));

    try {
      let body: any;
      if (field.startsWith('extra.')) {
        const extraKey = field.replace('extra.', '');
        const item = items.find(i => i.id === itemId);
        const updatedExtra = { ...(item?.extra || {}), [extraKey]: value };
        body = { extra: JSON.stringify(updatedExtra) };
      } else {
        body = { [field]: value };
      }
      const res = await fetch(`/api/inventory?id=${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(`Error al actualizar: ${json.error || 'Error'}`);
        await loadItems();
      }
    } catch (e) {
      console.error('Error updating:', e);
      await loadItems();
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('¿Eliminar este punto de suciedad?')) return;
    try {
      const res = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setItems(prev => prev.filter(i => i.id !== id));
        toast.success('Punto eliminado');
      } else {
        toast.error(`Error: ${json.error || 'Error'}`);
      }
    } catch (e) {
      console.error('Error deleting:', e);
      toast.error('Error de conexión');
    }
  };

  // Filters
  const filteredItems = items
    .filter(i => filterCategory === 'all' || i.category === filterCategory)
    .filter(i => {
      if (filterEstado === 'all') return true;
      return (i.extra?.estadoLimpieza || 'pendiente') === filterEstado;
    });

  // Stats
  const pendientes = items.filter(i => (i.extra?.estadoLimpieza || 'pendiente') === 'pendiente').length;
  const enProceso = items.filter(i => (i.extra?.estadoLimpieza || 'pendiente') === 'en_proceso').length;
  const limpios = items.filter(i => (i.extra?.estadoLimpieza || 'pendiente') === 'limpio').length;
  const verificados = items.filter(i => (i.extra?.estadoLimpieza || 'pendiente') === 'verificado').length;

  // Derive ESTADO_LIMPIEZA from config if available, otherwise use hardcoded fallback
  const estadoLimpiezaOptions = (() => {
    const configField = config.extraFields.find(f => f.key === 'estadoLimpieza');
    if (configField?.options && configField.options.length > 0) {
      return configField.options.map((opt, idx) => ({
        value: opt.toLowerCase().replace(/\s+/g, '_'),
        label: opt,
        color: ESTADO_LIMPIEZA[idx]?.color || 'bg-gray-100 text-gray-800',
      }));
    }
    return ESTADO_LIMPIEZA;
  })();

  const getEstadoBadge = (estado: string) => {
    const opt = estadoLimpiezaOptions.find(e => e.value === estado) || estadoLimpiezaOptions[0];
    return <Badge className={`text-[10px] px-1.5 py-0 ${opt.color}`}>{opt.label}</Badge>;
  };

  const getCategoryLabel = (cat: string) => {
    const catObj = config.categories.find(c => c.value === cat);
    return catObj?.label || cat;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 sm:px-4 py-2.5 border-b bg-white shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Droplets className="h-5 w-5 text-blue-600 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold truncate">Punto Limpio — Registro de Suciedad</h2>
            {currentZone && (
              <Badge variant="outline" className="border-blue-300 text-blue-700 text-[10px] shrink-0 hidden sm:inline-flex">
                {currentZone.name}
              </Badge>
            )}
            <Badge className="bg-blue-100 text-blue-800 text-[10px] shrink-0">
              {items.length} punto{items.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <Button size="sm" className="gap-1 text-xs h-8 shrink-0 bg-blue-600 hover:bg-blue-700" onClick={handleAddItem}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Nuevo Punto</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>

        {/* Info panel */}
        <div className="p-2.5 rounded-lg border-l-4 border-blue-500 bg-blue-50/30 mt-2">
          <div className="flex items-center gap-2 mb-0.5">
            <Droplets className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-medium text-blue-800">SEISO — Puntos de Suciedad</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Registro de puntos de suciedad identificados en S3. Cada punto tiene estado de limpieza, método y frecuencia.
          </p>
        </div>

        {/* Filter pills + Add button */}
        <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
          {/* Estado filters */}
          {[
            { key: 'all', label: 'Todos', count: items.length, active: filterEstado === 'all' },
            { key: 'pendiente', label: 'Pendiente', count: pendientes, active: filterEstado === 'pendiente' },
            { key: 'en_proceso', label: 'En Proceso', count: enProceso, active: filterEstado === 'en_proceso' },
            { key: 'limpio', label: 'Limpio', count: limpios, active: filterEstado === 'limpio' },
            { key: 'verificado', label: 'Verificado', count: verificados, active: filterEstado === 'verificado' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterEstado(f.key === 'all' ? 'all' : f.key)}
              className={`px-2 py-1 rounded-full text-[10px] font-medium border transition-colors whitespace-nowrap ${
                f.active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label} {f.count}
            </button>
          ))}
          <div className="h-4 w-px bg-gray-200 mx-1 shrink-0" />
          {/* Category filter */}
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-7 text-[10px] w-28 border-gray-200">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos los tipos</SelectItem>
              {config.categories.map(c => (
                <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterEstado !== 'all' || filterCategory !== 'all') && (
            <button
              onClick={() => { setFilterEstado('all'); setFilterCategory('all'); }}
              className="flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] text-gray-500 hover:bg-gray-100"
            >
              <X className="h-3 w-3" /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col px-3 sm:px-4 pb-4 min-h-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Droplets className="h-10 w-10 text-gray-300 mb-2" />
            <p className="text-sm text-muted-foreground">
              {items.length === 0 ? 'No hay puntos de suciedad registrados' : 'No hay puntos con estos filtros'}
            </p>
            {items.length === 0 && (
              <Button size="sm" className="mt-3 gap-1 text-xs bg-blue-600" onClick={handleAddItem}>
                <Plus className="h-3.5 w-3.5" /> Registrar primer punto
              </Button>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            {/* Desktop table */}
            <div className="overflow-x-auto border rounded-lg hidden md:block">
              <table className="w-full text-xs border-collapse min-w-[900px]">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="bg-blue-500 text-white px-2 py-1.5 text-center font-bold border border-blue-600">Tipo</th>
                    <th className="bg-amber-400 text-white px-2 py-1.5 text-center font-bold border border-amber-500" colSpan={3}>IDENTIFICACIÓN</th>
                    <th className="bg-sky-400 text-white px-2 py-1.5 text-center font-bold border border-sky-500" colSpan={3}>LIMPIEZA</th>
                    <th className="bg-green-500 text-white px-2 py-1.5 text-center font-bold border border-green-600" colSpan={2}>SEGUIMIENTO</th>
                    <th className="bg-gray-400 text-white px-1 py-1.5 text-center font-bold border border-gray-500 w-8">🗑</th>
                  </tr>
                  <tr>
                    <th className="bg-blue-400 text-white px-1 py-1 font-semibold border border-blue-300 whitespace-nowrap">Categoría</th>
                    <th className="bg-amber-300 text-white px-1 py-1 font-semibold border border-amber-300 whitespace-nowrap">Punto</th>
                    <th className="bg-amber-300 text-white px-1 py-1 font-semibold border border-amber-300 whitespace-nowrap">Ubicación</th>
                    <th className="bg-amber-300 text-white px-1 py-1 font-semibold border border-amber-300 whitespace-nowrap">Nivel</th>
                    <th className="bg-sky-300 text-white px-1 py-1 font-semibold border border-sky-300 whitespace-nowrap">Fuente</th>
                    <th className="bg-sky-300 text-white px-1 py-1 font-semibold border border-sky-300 whitespace-nowrap">Método</th>
                    <th className="bg-sky-300 text-white px-1 py-1 font-semibold border border-sky-300 whitespace-nowrap">Frecuencia</th>
                    <th className="bg-green-400 text-white px-1 py-1 font-semibold border border-green-400 whitespace-nowrap">Estado</th>
                    <th className="bg-green-400 text-white px-1 py-1 font-semibold border border-green-400 whitespace-nowrap">Responsable</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => (
                    <tr key={item.id} className={`border-b hover:bg-gray-50 ${
                      (item.extra?.estadoLimpieza === 'limpio' || item.extra?.estadoLimpieza === 'verificado') ? 'bg-green-50/30' : ''
                    }`}>
                      {/* Type */}
                      <td className="px-1 py-1 border text-center bg-blue-50">
                        <Badge className={`text-[10px] px-1.5 py-0 ${
                          config.categories.find(c => c.value === item.category)?.color || 'bg-gray-100 text-gray-800'
                        }`}>
                          {getCategoryLabel(item.category)}
                        </Badge>
                      </td>
                      {/* Identificación */}
                      <td className="px-1 py-1 border bg-amber-50">
                        <Input value={item.name} onChange={e => handleUpdateField(item.id, 'name', e.target.value)}
                          className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent" placeholder="Descripción" />
                      </td>
                      <td className="px-1 py-1 border bg-amber-50">
                        <Input value={item.location} onChange={e => handleUpdateField(item.id, 'location', e.target.value)}
                          className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent" placeholder="Ubicación" />
                      </td>
                      <td className="px-1 py-1 border bg-amber-50 text-center">
                        <Select value={String(item.extra?.nivel || 'Moderado')} onValueChange={v => handleUpdateField(item.id, 'extra.nivel', v)}>
                          <SelectTrigger className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(config.extraFields.find(f => f.key === 'nivel')?.options || ['Leve', 'Moderado', 'Grave']).map(o => (
                              <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      {/* Limpieza */}
                      <td className="px-1 py-1 border bg-sky-50">
                        <Select value={String(item.extra?.fuente || '')} onValueChange={v => handleUpdateField(item.id, 'extra.fuente', v)}>
                          <SelectTrigger className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-full">
                            <SelectValue placeholder="Fuente" />
                          </SelectTrigger>
                          <SelectContent>
                            {(config.extraFields.find(f => f.key === 'fuente')?.options || ['Proceso productivo', 'Medio ambiente', 'Falta de limpieza', 'Escape/Fuga', 'Desgaste', 'Derrame', 'Otro']).map(o => (
                              <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-1 py-1 border bg-sky-50">
                        <Select value={String(item.extra?.metodoLimpieza || '')} onValueChange={v => handleUpdateField(item.id, 'extra.metodoLimpieza', v)}>
                          <SelectTrigger className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-full">
                            <SelectValue placeholder="Método" />
                          </SelectTrigger>
                          <SelectContent>
                            {(config.extraFields.find(f => f.key === 'metodoLimpieza')?.options || ['Aspirado', 'Fregado', 'Pulido', 'Desinfección', 'Reparación', 'Otro']).map(o => (
                              <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-1 py-1 border bg-sky-50 text-center">
                        <Select value={String(item.extra?.frecuenciaLimpieza || '')} onValueChange={v => handleUpdateField(item.id, 'extra.frecuenciaLimpieza', v)}>
                          <SelectTrigger className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-20">
                            <SelectValue placeholder="Frec." />
                          </SelectTrigger>
                          <SelectContent>
                            {(config.extraFields.find(f => f.key === 'frecuenciaLimpieza')?.options || ['Diaria', '3 veces/semana', 'Semanal', 'Quincenal', 'Mensual']).map(o => (
                              <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      {/* Seguimiento */}
                      <td className="px-1 py-1 border bg-green-50 text-center">
                        <Select value={String(item.extra?.estadoLimpieza || 'pendiente')} onValueChange={v => handleUpdateField(item.id, 'extra.estadoLimpieza', v)}>
                          <SelectTrigger className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {estadoLimpiezaOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-1 py-1 border bg-green-50">
                        <Input value={String(item.extra?.responsable || '')} onChange={e => handleUpdateField(item.id, 'extra.responsable', e.target.value)}
                          className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent" placeholder="Responsable" />
                      </td>
                      {/* Delete */}
                      <td className="px-1 py-1 border text-center bg-gray-50">
                        <button onClick={() => handleDeleteItem(item.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {filteredItems.map(item => (
                <div key={item.id} className="rounded-xl border bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${
                      config.categories.find(c => c.value === item.category)?.color || 'bg-gray-100'
                    }`}>

                      {getCategoryLabel(item.category)}
                    </Badge>
                    <span className="text-xs font-medium truncate flex-1">{item.name || 'Sin descripción'}</span>
                    {getEstadoBadge(String(item.extra?.estadoLimpieza || 'pendiente'))}
                  </div>
                  <div className="px-3 pb-2 text-[11px] text-muted-foreground">
                    {item.location && <span className="mr-3">📍 {item.location}</span>}
                    {item.extra?.nivel && <span className="mr-3">⚡ {item.extra.nivel}</span>}
                    {item.extra?.metodoLimpieza && <span>🧹 {item.extra.metodoLimpieza}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
