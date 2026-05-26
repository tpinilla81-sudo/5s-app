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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Package, Search, Filter, Download, Trash2, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { use5SStore } from '@/lib/store';
import { S_STEPS, INVENTORY_CONFIGS } from '@/lib/5s-constants';

interface InventoryItemData {
  id: string;
  name: string;
  location: string;
  category: string;
  quantity: number;
  quantityNeeded: number;
  quantityUnneeded: number;
  price: number | null;
  action: string;
  extra?: Record<string, string | number>;
  jaulaStatus: string;
  jaulaFechaEntrada: string | null;
  jaulaOrigen: string | null;
  jaulaFechaSalida: string | null;
  jaulaDestino: string | null;
  sStep: number;
  zoneName?: string;
}

interface GlobalInventoryModalProps {
  open: boolean;
  onClose: () => void;
}

type TabValue = 'innecesarios' | 'jaula' | 'necesarios' | 'todo';

export default function GlobalInventoryModal({ open, onClose }: GlobalInventoryModalProps) {
  const { currentProject, currentZone, currentUser } = use5SStore();
  const [items, setItems] = useState<InventoryItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>('innecesarios');
  const [searchText, setSearchText] = useState('');
  const [filterSStep, setFilterSStep] = useState<string>('all');
  const [filterZone, setFilterZone] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (open) {
      loadAllInventory();
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

  const loadAllInventory = async () => {
    setIsLoading(true);
    try {
      // Load inventory for S1 and S2 (the main inventory steps)
      const projectIdParam = currentProject?.id ? `&projectId=${currentProject.id}` : '';
      const [s1Res, s2Res] = await Promise.all([
        fetch(`/api/inventory?sStep=1${projectIdParam}`),
        fetch(`/api/inventory?sStep=2${projectIdParam}`),
      ]);

      const allItems: InventoryItemData[] = [];

      for (const [res, sStep] of [[s1Res, 1], [s2Res, 2]] as const) {
        const json = await res.json();
        if (json.success) {
          allItems.push(...json.data.map((item: any) => ({
            id: item.id,
            name: item.name,
            location: item.location || '',
            category: item.category,
            quantity: item.quantity || 1,
            quantityNeeded: item.quantityNeeded || 0,
            quantityUnneeded: item.quantityUnneeded || 0,
            price: item.price ?? null,
            action: item.action || '',
            extra: typeof item.extra === 'string' ? JSON.parse(item.extra) : (item.extra || {}),
            jaulaStatus: item.jaulaStatus || '',
            jaulaFechaEntrada: item.jaulaFechaEntrada || null,
            jaulaOrigen: item.jaulaOrigen || null,
            jaulaFechaSalida: item.jaulaFechaSalida || null,
            jaulaDestino: item.jaulaDestino || null,
            sStep,
            zoneName: item.zone?.name || '',
          })));
        }
      }

      setItems(allItems);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Categorize items
  const innecesarios = useMemo(() => items.filter(i => i.category === 'innecesario'), [items]);
  const jaulaItems = useMemo(() => items.filter(i => i.jaulaStatus === 'en_jaula' || i.jaulaStatus === 'reclamado'), [items]);
  const necesarios = useMemo(() => items.filter(i => i.category === 'util' || i.category === 'muy_frecuente' || i.category === 'frecuente'), [items]);

  // Apply filters based on tab + search + S filter + zone filter
  const getFilteredItems = (source: InventoryItemData[]) => {
    let filtered = [...source];

    // Search
    if (searchText) {
      const lower = searchText.toLowerCase();
      filtered = filtered.filter(i =>
        i.name.toLowerCase().includes(lower) ||
        i.location.toLowerCase().includes(lower) ||
        i.action.toLowerCase().includes(lower)
      );
    }

    // S filter
    if (filterSStep !== 'all') {
      filtered = filtered.filter(i => i.sStep === parseInt(filterSStep));
    }

    // Zone filter
    if (filterZone !== 'all') {
      filtered = filtered.filter(i => i.zoneName === filterZone);
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = String(a[sortField as keyof InventoryItemData] ?? '');
      const bVal = String(b[sortField as keyof InventoryItemData] ?? '');
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    return filtered;
  };

  const currentItems = useMemo(() => {
    switch (activeTab) {
      case 'innecesarios': return getFilteredItems(innecesarios);
      case 'jaula': return getFilteredItems(jaulaItems);
      case 'necesarios': return getFilteredItems(necesarios);
      case 'todo': return getFilteredItems(items);
      default: return [];
    }
  }, [activeTab, innecesarios, jaulaItems, necesarios, items, searchText, filterSStep, filterZone, sortField, sortDir]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setItems(prev => prev.filter(item => item.id !== id));
        toast.success('Elemento eliminado');
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleUpdateJaula = async (id: string, jaulaStatus: string) => {
    const updates: any = { jaulaStatus };
    if (jaulaStatus === 'transferido') {
      updates.jaulaFechaSalida = new Date().toISOString();
    }
    try {
      const res = await fetch(`/api/inventory?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) await loadAllInventory();
    } catch (e) {
      console.error('Error updating jaula:', e);
    }
  };

  const handleExport = () => {
    const headerRow = ['Nombre', 'Ubicación', 'Categoría', 'Total', 'Necesarios', 'Innecesarios', 'Precio (€)', 'Estado', 'Frec. Uso', 'Decisión', 'Jaula', 'Zona', 'S'].join(',');
    const rows = currentItems.map(item => [
      item.name,
      item.location,
      item.category,
      item.quantity,
      item.quantityNeeded,
      item.quantityUnneeded,
      item.price ?? '',
      item.extra?.estado ?? '',
      item.extra?.frecuenciaUso ?? '',
      item.extra?.decision ?? '',
      item.jaulaStatus,
      item.zoneName,
      `S${item.sStep}`,
    ].join(','));
    const csvContent = [headerRow, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventario_global_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getJaulaBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      '': { label: '—', color: 'bg-gray-50 text-gray-400' },
      en_jaula: { label: 'En Jaula', color: 'bg-red-100 text-red-800' },
      reclamado: { label: 'Reclamado', color: 'bg-amber-100 text-amber-800' },
      transferido: { label: 'Transferido', color: 'bg-green-100 text-green-800' },
    };
    const info = map[status] || map[''];
    return <Badge className={info.color}>{info.label}</Badge>;
  };

  const totalValue = (items_list: InventoryItemData[]) =>
    items_list.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-green-600" />
            <span>Inventario Global</span>
            <Badge variant="outline" className="text-xs">{items.length} elementos</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-3">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={() => setActiveTab('innecesarios')}
              className={`p-3 rounded-lg border-2 text-center transition-colors ${activeTab === 'innecesarios' ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:bg-red-50/50'}`}
            >
              <div className="text-2xl font-bold text-red-600">{innecesarios.length}</div>
              <div className="text-xs text-red-700 font-medium">Innecesarios</div>
            </button>
            <button
              onClick={() => setActiveTab('jaula')}
              className={`p-3 rounded-lg border-2 text-center transition-colors ${activeTab === 'jaula' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white hover:bg-amber-50/50'}`}
            >
              <div className="text-2xl font-bold text-amber-600">{jaulaItems.length}</div>
              <div className="text-xs text-amber-700 font-medium">En Jaula</div>
            </button>
            <button
              onClick={() => setActiveTab('necesarios')}
              className={`p-3 rounded-lg border-2 text-center transition-colors ${activeTab === 'necesarios' ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white hover:bg-green-50/50'}`}
            >
              <div className="text-2xl font-bold text-green-600">{necesarios.length}</div>
              <div className="text-xs text-green-700 font-medium">Necesarios</div>
            </button>
            <button
              onClick={() => setActiveTab('todo')}
              className={`p-3 rounded-lg border-2 text-center transition-colors ${activeTab === 'todo' ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:bg-blue-50/50'}`}
            >
              <div className="text-2xl font-bold text-blue-600">{items.length}</div>
              <div className="text-xs text-blue-700 font-medium">Todo</div>
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, ubicación..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={filterSStep} onValueChange={setFilterSStep}>
              <SelectTrigger className="w-[120px] h-9 text-xs">
                <SelectValue placeholder="Todas S" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las S</SelectItem>
                <SelectItem value="1">S1 - Seiri</SelectItem>
                <SelectItem value="2">S2 - Seiton</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterZone} onValueChange={setFilterZone}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="Todas zonas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las zonas</SelectItem>
                {zones.map(z => (
                  <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport} className="h-9 text-xs">
              <Download className="h-3.5 w-3.5 mr-1" /> Exportar CSV
            </Button>
          </div>

          {/* Value summary */}
          <div className="flex gap-4 text-xs px-1">
            <span className="text-red-700 font-medium">Valor innecesarios: {totalValue(innecesarios).toFixed(2)} €</span>
            <span className="text-amber-700 font-medium">Valor en jaula: {totalValue(jaulaItems).toFixed(2)} €</span>
            <span className="text-muted-foreground">Mostrando: {currentItems.length} elementos</span>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto border rounded-lg">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-gray-100">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold cursor-pointer hover:bg-gray-200" onClick={() => toggleSort('name')}>
                    Elemento {sortField === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-2 py-2 text-left font-semibold cursor-pointer hover:bg-gray-200" onClick={() => toggleSort('location')}>
                    Ubicación {sortField === 'location' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-2 py-2 text-center font-semibold">Cat.</th>
                  <th className="px-2 py-2 text-center font-semibold">Cant.</th>
                  <th className="px-2 py-2 text-right font-semibold">Precio</th>
                  <th className="px-2 py-2 text-center font-semibold">Estado</th>
                  <th className="px-2 py-2 text-center font-semibold">Frec. Uso</th>
                  <th className="px-2 py-2 text-center font-semibold">Decisión</th>
                  <th className="px-2 py-2 text-center font-semibold">Jaula</th>
                  <th className="px-2 py-2 text-center font-semibold">Zona</th>
                  <th className="px-2 py-2 text-center font-semibold">S</th>
                  <th className="px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={12} className="text-center py-12 text-muted-foreground">Cargando...</td></tr>
                ) : currentItems.length === 0 ? (
                  <tr><td colSpan={12} className="text-center py-12 text-muted-foreground">No hay elementos en esta categoría</td></tr>
                ) : (
                  currentItems.map(item => {
                    const isJaula = activeTab === 'jaula';
                    const catConfig = INVENTORY_CONFIGS[item.sStep]?.categories.find(c => c.value === item.category);
                    return (
                      <tr key={item.id} className={`border-t hover:bg-muted/30 ${isJaula ? 'bg-amber-50/30' : item.category === 'innecesario' ? 'bg-red-50/30' : item.category === 'util' || item.category === 'muy_frecuente' ? 'bg-green-50/30' : ''}`}>
                        <td className="px-2 py-1.5 font-medium">{item.name}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{item.location}</td>
                        <td className="px-2 py-1.5 text-center">
                          {catConfig ? (
                            <Badge className={catConfig.color}>{catConfig.label}</Badge>
                          ) : (
                            <Badge variant="secondary">{item.category}</Badge>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {item.category === 'innecesario' ? (
                            <span className="text-red-700 font-bold">{item.quantityUnneeded || item.quantity}</span>
                          ) : (
                            <span>{item.quantity}</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-right font-medium">
                          {item.price ? `${(item.price * (item.quantityUnneeded || item.quantity)).toFixed(2)} €` : '—'}
                        </td>
                        <td className="px-2 py-1.5 text-center">{String(item.extra?.estado ?? '—')}</td>
                        <td className="px-2 py-1.5 text-center">{String(item.extra?.frecuenciaUso ?? '—')}</td>
                        <td className="px-2 py-1.5 text-center">
                          <Badge className={
                            item.extra?.decision === 'Jaula' ? 'bg-red-100 text-red-800' :
                            item.extra?.decision === 'Eliminar' ? 'bg-red-100 text-red-800' :
                            item.extra?.decision === 'Reubicar' ? 'bg-blue-100 text-blue-800' :
                            item.extra?.decision === 'Vender' ? 'bg-green-100 text-green-800' :
                            item.extra?.decision === 'Donar' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {String(item.extra?.decision || item.action || '—')}
                          </Badge>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {isJaula ? (
                            <Select
                              value={item.jaulaStatus || 'en_jaula'}
                              onValueChange={val => handleUpdateJaula(item.id, val)}
                            >
                              <SelectTrigger className="h-6 text-[10px] p-0 px-1 w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="en_jaula">En Jaula</SelectItem>
                                <SelectItem value="reclamado">Reclamado</SelectItem>
                                <SelectItem value="transferido">Transferido</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            getJaulaBadge(item.jaulaStatus)
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-center text-muted-foreground">{item.zoneName || '—'}</td>
                        <td className="px-2 py-1.5 text-center">
                          <Badge variant="outline" style={{ borderColor: S_STEPS.find(s => s.id === item.sStep)?.color, color: S_STEPS.find(s => s.id === item.sStep)?.color }}>
                            S{item.sStep}
                          </Badge>
                        </td>
                        <td className="px-2 py-1.5">
                          <button onClick={() => handleDeleteItem(item.id)} className="text-red-400 hover:text-red-600">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
