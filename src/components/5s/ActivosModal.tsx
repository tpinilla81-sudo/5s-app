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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BoxSelect, Plus, Trash2, Loader2, X, Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { use5SStore } from '@/lib/store';
import { INVENTORY_CONFIGS } from '@/lib/5s-constants';

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════
interface ActivoItem {
  id: string;
  name: string;
  location: string;
  category: string;
  quantity: number;
  quantityNeeded: number;
  price: number | null;
  extra?: Record<string, string | number>;
  zonaOrigen: string | null;
  zonaDestino: string | null;
  project?: { name: string };
}

interface ActivosModalProps {
  open: boolean;
  onClose: () => void;
}

const S2_CONFIG = INVENTORY_CONFIGS[2];

const CATEGORIA_OPTIONS = [
  { value: 'muy_frecuente', label: 'Muy frecuente', color: 'bg-green-100 text-green-800' },
  { value: 'frecuente', label: 'Frecuente', color: 'bg-blue-100 text-blue-800' },
  { value: 'ocasional', label: 'Ocasional', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'raro', label: 'Raro', color: 'bg-red-100 text-red-800' },
];

// ═══════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════
export default function ActivosModal({ open, onClose }: ActivosModalProps) {
  const { currentProject, currentZone } = use5SStore();
  const [activosItems, setActivosItems] = useState<ActivoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterCat, setFilterCat] = useState<string>('all');

  useEffect(() => {
    if (open) loadActivosItems();
  }, [open, currentProject, currentZone]);

  const loadActivosItems = async () => {
    setIsLoading(true);
    try {
      let url = `/api/inventory/activos?`;
      if (currentProject?.id) url += `projectId=${currentProject.id}&`;
      if (currentZone?.id) url += `zoneId=${currentZone.id}&`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setActivosItems(json.data || []);
      }
    } catch (error) {
      console.error('Error loading activos items:', error);
      toast.error('Error al cargar los activos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateField = async (itemId: string, field: string, value: any) => {
    setActivosItems(prev => prev.map(item => {
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
        const item = activosItems.find(i => i.id === itemId);
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
        await loadActivosItems();
      }
    } catch (e) {
      console.error('Error updating:', e);
      await loadActivosItems();
    }
  };

  const filteredItems = filterCat === 'all'
    ? activosItems
    : activosItems.filter(i => i.category === filterCat);

  const totalValue = filteredItems.reduce(
    (sum, i) => sum + (i.price || 0) * (i.quantityNeeded || i.quantity), 0
  );

  // Stats by category
  const catCounts = CATEGORIA_OPTIONS.map(c => ({
    ...c,
    count: activosItems.filter(i => i.category === c.value).length,
  }));

  const getCatBadge = (cat: string) => {
    const opt = CATEGORIA_OPTIONS.find(c => c.value === cat);
    if (!opt) return <Badge className="text-[10px]">—</Badge>;
    return <Badge className={`text-[10px] px-1.5 py-0 ${opt.color}`}>{opt.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent size="xl" className="flex flex-col overflow-hidden p-0 max-h-[90vh]">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <BoxSelect className="h-5 w-5 text-green-600" />
            <span>Activos — Registro de Necesarios</span>
            {currentZone && (
              <Badge variant="outline" className="border-green-300 text-green-700">
                {currentZone.name}
              </Badge>
            )}
            <Badge className="bg-green-100 text-green-800 ml-1">
              {activosItems.length} elemento{activosItems.length !== 1 ? 's' : ''}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col px-4 sm:px-6 pb-4 sm:pb-6 min-h-0">
          {/* Info panel */}
          <div className="p-2.5 rounded-lg border-l-4 border-green-500 bg-green-50/30 mb-3">
            <div className="flex items-center gap-2 mb-0.5">
              <BoxSelect className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs font-medium text-green-800">SEIRI→SEITON — Elementos Necesarios</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Elementos necesarios clasificados en S1. Se organizan en S2 con ubicación, método de identificación y cercanía.
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterCat('all')}
              className={`px-2 py-1 rounded-full text-[10px] font-medium border transition-colors whitespace-nowrap ${
                filterCat === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Todos {activosItems.length}
            </button>
            {catCounts.map(c => (
              <button
                key={c.value}
                onClick={() => setFilterCat(c.value)}
                className={`px-2 py-1 rounded-full text-[10px] font-medium border transition-colors whitespace-nowrap ${
                  filterCat === c.value ? 'text-white border-transparent' : 'bg-white border-gray-200 hover:opacity-80'
                }`}
                style={filterCat === c.value ? { backgroundColor: c.color.split(' ')[0].replace('bg-', '').includes('green') ? '#16a34a' : c.color.includes('blue') ? '#2563eb' : c.color.includes('yellow') ? '#ca8a04' : '#dc2626', borderColor: 'transparent' } : { color: c.color.includes('green') ? '#16a34a' : c.color.includes('blue') ? '#2563eb' : c.color.includes('yellow') ? '#ca8a04' : '#dc2626' }}
              >
                {c.label} ({c.count})
              </button>
            ))}
            {filterCat !== 'all' && (
              <button onClick={() => setFilterCat('all')}
                className="flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] text-gray-500 hover:bg-gray-100">
                <X className="h-3 w-3" /> Limpiar
              </button>
            )}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <BoxSelect className="h-10 w-10 text-gray-300 mb-2" />
              <p className="text-sm text-muted-foreground">
                {activosItems.length === 0 ? 'No hay elementos necesarios registrados' : 'No hay elementos con este filtro'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Los elementos necesarios se registran en S1 Paso 3
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              {/* Desktop table */}
              <div className="overflow-x-auto border rounded-lg hidden md:block">
                <table className="w-full text-xs border-collapse min-w-[900px]">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="bg-green-500 text-white px-2 py-1.5 text-center font-bold border border-green-600">ELEMENTO</th>
                      <th className="bg-amber-400 text-white px-2 py-1.5 text-center font-bold border border-amber-500" colSpan={3}>CLASIFICACIÓN</th>
                      <th className="bg-sky-400 text-white px-2 py-1.5 text-center font-bold border border-sky-500" colSpan={3}>ORGANIZACIÓN (S2)</th>
                      <th className="bg-gray-400 text-white px-1 py-1.5 text-center font-bold border border-gray-500 w-8">🗑</th>
                    </tr>
                    <tr>
                      <th className="bg-green-400 text-white px-1 py-1 font-semibold border border-green-300 whitespace-nowrap">Nombre</th>
                      <th className="bg-amber-300 text-white px-1 py-1 font-semibold border border-amber-300 whitespace-nowrap">Ubicación</th>
                      <th className="bg-amber-300 text-white px-1 py-1 font-semibold border border-amber-300 whitespace-nowrap">Categoría</th>
                      <th className="bg-amber-300 text-white px-1 py-1 font-semibold border border-amber-300 whitespace-nowrap">Cant.</th>
                      <th className="bg-sky-300 text-white px-1 py-1 font-semibold border border-sky-300 whitespace-nowrap">Ubicación asig.</th>
                      <th className="bg-sky-300 text-white px-1 py-1 font-semibold border border-sky-300 whitespace-nowrap">Método id.</th>
                      <th className="bg-sky-300 text-white px-1 py-1 font-semibold border border-sky-300 whitespace-nowrap">Cercanía</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map(item => (
                      <tr key={item.id} className="border-b hover:bg-gray-50 bg-green-50/20">
                        {/* Elemento */}
                        <td className="px-1 py-1 border bg-green-50 font-medium">
                          <Input value={item.name} onChange={e => handleUpdateField(item.id, 'name', e.target.value)}
                            className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent font-medium" placeholder="Elemento" />
                        </td>
                        {/* Clasificación */}
                        <td className="px-1 py-1 border bg-amber-50">
                          <Input value={item.location} onChange={e => handleUpdateField(item.id, 'location', e.target.value)}
                            className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent" placeholder="Ubicación" />
                        </td>
                        <td className="px-1 py-1 border bg-amber-50 text-center">
                          <Select value={item.category} onValueChange={v => handleUpdateField(item.id, 'category', v)}>
                            <SelectTrigger className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIA_OPTIONS.map(c => (
                                <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-1 py-1 border bg-amber-50 text-center">
                          <Input type="number" min={1} value={item.quantityNeeded || item.quantity}
                            onChange={e => handleUpdateField(item.id, 'quantityNeeded', Number(e.target.value))}
                            className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-10 text-center" />
                        </td>
                        {/* Organización S2 */}
                        <td className="px-1 py-1 border bg-sky-50">
                          <Input value={String(item.extra?.ubicacionAsignada || '')} onChange={e => handleUpdateField(item.id, 'extra.ubicacionAsignada', e.target.value)}
                            className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent" placeholder="Ubicación asig." />
                        </td>
                        <td className="px-1 py-1 border bg-sky-50 text-center">
                          <Select value={String(item.extra?.metodoIdentificacion || '')} onValueChange={v => handleUpdateField(item.id, 'extra.metodoIdentificacion', v)}>
                            <SelectTrigger className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-full">
                              <SelectValue placeholder="Método" />
                            </SelectTrigger>
                            <SelectContent>
                              {['Etiqueta', 'Código color', 'Señal visual', 'Sombra/Contorno', 'Código numérico', 'Otro'].map(o => (
                                <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-1 py-1 border bg-sky-50 text-center">
                          <Select value={String(item.extra?.cercania || '')} onValueChange={v => handleUpdateField(item.id, 'extra.cercania', v)}>
                            <SelectTrigger className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-full">
                              <SelectValue placeholder="Cercanía" />
                            </SelectTrigger>
                            <SelectContent>
                              {['Muy cerca (brazo)', 'Cerca (1-3 pasos)', 'Media distancia', 'Poco accesible'].map(o => (
                                <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        {/* Delete */}
                        <td className="px-1 py-1 border text-center bg-gray-50">
                          <button onClick={() => {
                            if (!confirm('¿Eliminar este activo?')) return;
                            fetch(`/api/inventory?id=${item.id}`, { method: 'DELETE' })
                              .then(r => r.json())
                              .then(j => { if (j.success) { setActivosItems(p => p.filter(i => i.id !== item.id)); toast.success('Eliminado'); } })
                              .catch(() => toast.error('Error'));
                          }} className="text-red-400 hover:text-red-600">
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
                      <span className="text-xs font-medium truncate flex-1">{item.name || 'Sin nombre'}</span>
                      {getCatBadge(item.category)}
                    </div>
                    <div className="px-3 pb-2 text-[11px] text-muted-foreground flex items-center gap-3">
                      <span>📦 {item.quantityNeeded || item.quantity} uds</span>
                      {item.price && <span>💰 {(item.price * (item.quantityNeeded || item.quantity)).toFixed(2)}€</span>}
                      {item.extra?.ubicacionAsignada && <span>📍 {String(item.extra.ubicacionAsignada)}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="flex gap-6 text-xs mt-3 pt-3 border-t">
                <span className="text-gray-700">Total: <strong>{filteredItems.length}</strong> elementos</span>
                <span className="text-gray-700">Valor: <strong className="text-green-600">{totalValue.toFixed(2)} €</strong></span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
