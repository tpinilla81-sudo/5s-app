'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Package, Plus, Trash2, Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { use5SStore } from '@/lib/store';
import { INVENTORY_CONFIGS } from '@/lib/5s-constants';
import TagPrinter from '@/components/5s/TagPrinter';

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════
interface JaulaPhoto {
  id: string;
  photoUrl: string;
  photoType: string;
  title: string;
}

interface JaulaItem {
  id: string;
  name: string;
  location: string;
  category: string;
  quantity: number;
  quantityUnneeded: number;
  price: number | null;
  photoUrl: string | null;
  photoUrls: string | null;
  jaulaStatus: string;
  jaulaFechaEntrada: string | null;
  jaulaOrigen: string | null;
  jaulaFechaSalida: string | null;
  jaulaDestino: string | null;
  jaulaFechaLimite: string | null;
  zonaOrigen: string | null;
  zonaDestino: string | null;
  extra?: Record<string, string | number>;
  project?: { name: string };
  photos?: JaulaPhoto[];
}

const S1_CONFIG = INVENTORY_CONFIGS[1];

const JAULA_STATUS = [
  { value: 'en_jaula', label: 'En Jaula', color: 'bg-red-100 text-red-800' },
  { value: 'reclamado', label: 'Reclamado', color: 'bg-amber-100 text-amber-800' },
  { value: 'transferido', label: 'Transferido', color: 'bg-green-100 text-green-800' },
];

// ═══════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════
export default function JaulaView() {
  const { currentProject, currentZone } = use5SStore();
  const [jaulaItems, setJaulaItems] = useState<JaulaItem[]>([]);
  const [jaulaFilter, setJaulaFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    loadJaulaItems();
  }, [currentProject, currentZone]);

  const loadJaulaItems = async () => {
    setIsLoading(true);
    try {
      let url = '/api/inventory?jaulaOnly=true';
      if (currentProject?.id) url += `&projectId=${currentProject.id}`;
      if (currentZone?.id) url += `&zoneId=${currentZone.id}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setJaulaItems(json.data || []);
      }
    } catch (error) {
      console.error('Error loading jaula items:', error);
      toast.error('Error al cargar la jaula');
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
          sStep: 1,
          name: '',
          location: currentZone?.name || '',
          category: 'innecesario',
          quantity: 1,
          quantityUnneeded: 1,
          price: null,
          action: 'jaula',
          projectId: currentProject.id,
          zoneId: currentZone?.id || null,
          jaulaStatus: 'en_jaula',
          jaulaFechaEntrada: new Date().toISOString(),
          extra: JSON.stringify({
            estado: '',
            frecuenciaUso: '',
            decision: 'Jaula',
            diasCuarentena: '40',
          }),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Nueva entrada agregada a la Jaula');
        await loadJaulaItems();
      } else {
        toast.error(`Error: ${json.error || 'Error desconocido'}`);
      }
    } catch (e) {
      console.error('Error adding item:', e);
      toast.error('Error de conexión');
    }
  };

  const handleUpdateField = async (itemId: string, field: string, value: any) => {
    setJaulaItems(prev => prev.map(item => {
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
        const item = jaulaItems.find(i => i.id === itemId);
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
        await loadJaulaItems();
      }
    } catch (e) {
      console.error('Error updating:', e);
      await loadJaulaItems();
    }
  };

  const filteredJaulaItems = jaulaFilter === 'all'
    ? jaulaItems
    : jaulaItems.filter(i => i.jaulaStatus === jaulaFilter);

  const totalJaulaValue = filteredJaulaItems.reduce(
    (sum, i) => sum + (i.price || 0) * (i.quantityUnneeded || i.quantity), 0
  );

  // Stats
  const enJaula = jaulaItems.filter(i => i.jaulaStatus === 'en_jaula').length;
  const reclamados = jaulaItems.filter(i => i.jaulaStatus === 'reclamado').length;
  const transferidos = jaulaItems.filter(i => i.jaulaStatus === 'transferido').length;

  const getStatusBadge = (status: string) => {
    const opt = JAULA_STATUS.find(s => s.value === status);
    if (!opt) return <Badge className="bg-gray-100 text-gray-400 text-[10px]">—</Badge>;
    return <Badge className={`text-[10px] px-1.5 py-0 ${opt.color}`}>{opt.label}</Badge>;
  };

  // Tag data for printing
  const tagItems = filteredJaulaItems
    .filter(i => !i.extra?.decision || i.extra.decision === 'Jaula')
    .map(i => {
      const dias = Number(i.extra?.diasCuarentena ?? 40);
      let fechaRevision: string | null = null;
      if (i.jaulaFechaEntrada) {
        try {
          const d = new Date(i.jaulaFechaEntrada);
          d.setDate(d.getDate() + dias);
          fechaRevision = d.toISOString();
        } catch {}
      }
      return {
        nombre: i.name,
        ubicacion: i.location,
        cantidad: i.quantityUnneeded || i.quantity,
        estado: String(i.extra?.estado ?? ''),
        frecuenciaUso: String(i.extra?.frecuenciaUso ?? ''),
        decision: 'Jaula' as string,
        fechaEntrada: i.jaulaFechaEntrada,
        fechaRevision,
        diasCuarentena: dias,
        zonaOrigen: i.zonaOrigen || i.jaulaOrigen,
      };
    });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 sm:px-4 py-2.5 border-b bg-white shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Package className="h-5 w-5 text-red-600 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold truncate">Jaula de Excedentes</h2>
            {currentZone && (
              <Badge variant="outline" className="border-red-300 text-red-700 text-[10px] shrink-0 hidden sm:inline-flex">
                {currentZone.name}
              </Badge>
            )}
            <Badge className="bg-red-100 text-red-800 text-[10px] shrink-0">
              {jaulaItems.length} elemento{jaulaItems.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <Button size="sm" className="gap-1 text-xs h-8 shrink-0 bg-red-600 hover:bg-red-700" onClick={handleAddItem}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Nueva Entrada</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        </div>

        {/* Info panel */}
        <div className="p-2.5 rounded-lg border-l-4 border-red-500 bg-red-50/30 mt-2">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-xs font-medium text-red-800">Etiqueta ROJA — Innecesario</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Elementos innecesarios clasificados en S1. Se envían a la JAULA o se ELIMINAN.
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
          {tagItems.length > 0 && <TagPrinter items={tagItems} />}
          {tagItems.length > 0 && <div className="h-4 w-px bg-gray-200 mx-1 shrink-0" />}
          {/* Status filters */}
          {[
            { key: 'all', label: 'Todos', count: jaulaItems.length, active: jaulaFilter === 'all' },
            { key: 'en_jaula', label: 'En Jaula', count: enJaula, active: jaulaFilter === 'en_jaula' },
            { key: 'reclamado', label: 'Reclamado', count: reclamados, active: jaulaFilter === 'reclamado' },
            { key: 'transferido', label: 'Transferido', count: transferidos, active: jaulaFilter === 'transferido' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setJaulaFilter(f.key)}
              className={`px-2 py-1 rounded-full text-[10px] font-medium border transition-colors whitespace-nowrap ${
                f.active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label} {f.count}
            </button>
          ))}
          {jaulaFilter !== 'all' && (
            <button onClick={() => setJaulaFilter('all')}
              className="flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] text-gray-500 hover:bg-gray-100">
              <X className="h-3 w-3" /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col px-3 sm:px-4 pb-4 min-h-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
          </div>
        ) : filteredJaulaItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Package className="h-10 w-10 text-gray-300 mb-2" />
            <p className="text-sm text-muted-foreground">
              {jaulaItems.length === 0 ? 'No hay elementos en la jaula' : 'No hay elementos con este filtro'}
            </p>
            {jaulaItems.length === 0 && (
              <Button size="sm" className="mt-3 gap-1 text-xs bg-red-600" onClick={handleAddItem}>
                <Plus className="h-3.5 w-3.5" /> Registrar primer elemento
              </Button>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            {/* Desktop table */}
            <div className="overflow-x-auto border rounded-lg hidden md:block">
              <table className="w-full text-xs border-collapse min-w-[1000px]">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="bg-red-500 text-white px-2 py-1.5 text-center font-bold border border-red-600">ELEMENTO</th>
                    <th className="bg-amber-400 text-white px-2 py-1.5 text-center font-bold border border-amber-500" colSpan={4}>CLASIFICACIÓN</th>
                    <th className="bg-sky-400 text-white px-2 py-1.5 text-center font-bold border border-sky-500" colSpan={3}>JAULA</th>
                    <th className="bg-green-500 text-white px-2 py-1.5 text-center font-bold border border-green-600" colSpan={2}>SEGUIMIENTO</th>
                    <th className="bg-gray-400 text-white px-1 py-1.5 text-center font-bold border border-gray-500 w-8">🗑</th>
                  </tr>
                  <tr>
                    <th className="bg-red-400 text-white px-1 py-1 font-semibold border border-red-300 whitespace-nowrap">Nombre</th>
                    <th className="bg-amber-300 text-white px-1 py-1 font-semibold border border-amber-300 whitespace-nowrap">Ubicación</th>
                    <th className="bg-amber-300 text-white px-1 py-1 font-semibold border border-amber-300 whitespace-nowrap">Cant.</th>
                    <th className="bg-amber-300 text-white px-1 py-1 font-semibold border border-amber-300 whitespace-nowrap">Estado</th>
                    <th className="bg-amber-300 text-white px-1 py-1 font-semibold border border-amber-300 whitespace-nowrap">Decisión</th>
                    <th className="bg-sky-300 text-white px-1 py-1 font-semibold border border-sky-300 whitespace-nowrap">F. Entrada</th>
                    <th className="bg-sky-300 text-white px-1 py-1 font-semibold border border-sky-300 whitespace-nowrap">Días cuar.</th>
                    <th className="bg-sky-300 text-white px-1 py-1 font-semibold border border-sky-300 whitespace-nowrap">F. Límite</th>
                    <th className="bg-green-400 text-white px-1 py-1 font-semibold border border-green-400 whitespace-nowrap">Estado Jaula</th>
                    <th className="bg-green-400 text-white px-1 py-1 font-semibold border border-green-400 whitespace-nowrap">F. Salida / Destino</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJaulaItems.map(item => {
                    const diasCuarentena = Number(item.extra?.diasCuarentena ?? 40);
                    let fechaLimite: string | null = item.jaulaFechaLimite || null;
                    if (!fechaLimite && item.jaulaFechaEntrada) {
                      try {
                        const d = new Date(item.jaulaFechaEntrada);
                        d.setDate(d.getDate() + diasCuarentena);
                        fechaLimite = d.toISOString();
                      } catch {}
                    }
                    const isExpired = fechaLimite && new Date(fechaLimite) < new Date();

                    return (
                      <tr key={item.id} className={`border-b hover:bg-gray-50 ${
                        item.jaulaStatus === 'transferido' ? 'bg-green-50/30' : ''
                      }`}>
                        {/* Elemento */}
                        <td className="px-1 py-1 border bg-red-50 font-medium">
                          <Input value={item.name} onChange={e => handleUpdateField(item.id, 'name', e.target.value)}
                            className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent font-medium" placeholder="Elemento" />
                        </td>
                        {/* Clasificación */}
                        <td className="px-1 py-1 border bg-amber-50">
                          <Input value={item.location} onChange={e => handleUpdateField(item.id, 'location', e.target.value)}
                            className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent" placeholder="Ubicación" />
                        </td>
                        <td className="px-1 py-1 border bg-amber-50 text-center">
                          <Input type="number" min={1} value={item.quantityUnneeded || item.quantity}
                            onChange={e => handleUpdateField(item.id, 'quantityUnneeded', Number(e.target.value))}
                            className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-10 text-center" />
                        </td>
                        <td className="px-1 py-1 border bg-amber-50 text-center">
                          <Select value={String(item.extra?.estado || '')} onValueChange={v => handleUpdateField(item.id, 'extra.estado', v)}>
                            <SelectTrigger className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-16">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {['Bueno', 'Regular', 'Malo'].map(o => (
                                <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-1 py-1 border bg-amber-50 text-center">
                          <Select value={String(item.extra?.decision || 'Jaula')} onValueChange={v => handleUpdateField(item.id, 'extra.decision', v)}>
                            <SelectTrigger className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-16">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {['Jaula', 'Tirar', 'Eliminar', 'Reubicar'].map(o => (
                                <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        {/* Jaula */}
                        <td className="px-1 py-1 border bg-sky-50 text-center">
                          <Input type="date" value={item.jaulaFechaEntrada ? new Date(item.jaulaFechaEntrada).toISOString().split('T')[0] : ''}
                            onChange={e => handleUpdateField(item.id, 'jaulaFechaEntrada', e.target.value ? new Date(e.target.value).toISOString() : null)}
                            className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent" />
                        </td>
                        <td className="px-1 py-1 border bg-sky-50 text-center">
                          <Select value={String(item.extra?.diasCuarentena || '40')} onValueChange={v => handleUpdateField(item.id, 'extra.diasCuarentena', v)}>
                            <SelectTrigger className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-12">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {['7', '15', '20', '30', '40', '60', '90'].map(o => (
                                <SelectItem key={o} value={o} className="text-xs">{o}d</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-1 py-1 border bg-sky-50 text-center">
                          {fechaLimite ? (
                            <span className={`text-[10px] ${isExpired ? 'text-red-600 font-bold' : 'text-amber-600'}`}>
                              {new Date(fechaLimite).toLocaleDateString('es-ES')}
                              {isExpired && ' ⚠'}
                            </span>
                          ) : <span className="text-[10px] text-muted-foreground">—</span>}
                        </td>
                        {/* Seguimiento */}
                        <td className="px-1 py-1 border bg-green-50 text-center">
                          <Select value={item.jaulaStatus} onValueChange={v => handleUpdateField(item.id, 'jaulaStatus', v)}>
                            <SelectTrigger className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {JAULA_STATUS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-1 py-1 border bg-green-50">
                          <div className="flex items-center gap-1">
                            <Input type="date" value={item.jaulaFechaSalida ? new Date(item.jaulaFechaSalida).toISOString().split('T')[0] : ''}
                              onChange={e => handleUpdateField(item.id, 'jaulaFechaSalida', e.target.value ? new Date(e.target.value).toISOString() : null)}
                              className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-20" />
                            <Input value={item.jaulaDestino || ''} onChange={e => handleUpdateField(item.id, 'jaulaDestino', e.target.value)}
                              className="h-6 text-[10px] p-0 px-1 border-0 bg-transparent w-16" placeholder="Dest." />
                          </div>
                        </td>
                        {/* Delete */}
                        <td className="px-1 py-1 border text-center bg-gray-50">
                          <button onClick={() => {
                            if (!confirm('¿Eliminar este elemento?')) return;
                            fetch(`/api/inventory?id=${item.id}`, { method: 'DELETE' })
                              .then(r => r.json())
                              .then(j => { if (j.success) { setJaulaItems(p => p.filter(i => i.id !== item.id)); toast.success('Eliminado'); } })
                              .catch(() => toast.error('Error'));
                          }} className="text-red-400 hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {filteredJaulaItems.map(item => {
                const diasCuarentena = Number(item.extra?.diasCuarentena ?? 40);
                let fechaLimite: string | null = item.jaulaFechaLimite || null;
                if (!fechaLimite && item.jaulaFechaEntrada) {
                  try {
                    const d = new Date(item.jaulaFechaEntrada);
                    d.setDate(d.getDate() + diasCuarentena);
                    fechaLimite = d.toISOString();
                  } catch {}
                }
                const isExpired = fechaLimite && new Date(fechaLimite) < new Date();

                return (
                  <div key={item.id} className="rounded-xl border bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <span className="text-xs font-medium truncate flex-1">{item.name || 'Sin nombre'}</span>
                      {getStatusBadge(item.jaulaStatus)}
                      <Badge className={`text-[10px] px-1.5 py-0 ${
                        item.extra?.decision === 'Jaula' ? 'bg-orange-100 text-orange-800'
                        : item.extra?.decision === 'Eliminar' ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                      }`}>
                        {String(item.extra?.decision || 'Jaula')}
                      </Badge>
                    </div>
                    <div className="px-3 pb-2 text-[11px] text-muted-foreground flex items-center gap-3">
                      <span>📦 {item.quantityUnneeded || item.quantity} uds</span>
                      {item.price && <span>💰 {(item.price * (item.quantityUnneeded || item.quantity)).toFixed(2)}€</span>}
                      {fechaLimite && (
                        <span className={isExpired ? 'text-red-600 font-bold' : 'text-amber-600'}>
                          📅 {new Date(fechaLimite).toLocaleDateString('es-ES')}{isExpired && ' ⚠'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="flex gap-6 text-xs mt-3 pt-3 border-t">
              <span className="text-gray-700">Total: <strong>{filteredJaulaItems.length}</strong> elementos</span>
              <span className="text-gray-700">Valor: <strong className="text-red-600">{totalJaulaValue.toFixed(2)} €</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Photo lightbox */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setLightboxPhoto(null)}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightboxPhoto(null)}>
            <X className="h-6 w-6" />
          </button>
          <img src={lightboxPhoto} alt="Foto" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}
