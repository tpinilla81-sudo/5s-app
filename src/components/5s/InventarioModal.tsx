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
import { ClipboardList, Plus, CheckCircle, Download, Upload, FileSpreadsheet, BookOpen, Package, ArrowRight, AlertTriangle, FileUp } from 'lucide-react';
import { toast } from 'sonner';
import { use5SStore } from '@/lib/store';
import { S_STEPS, INVENTORY_CONFIGS, INVENTORY_CLASSIFY_THRESHOLD } from '@/lib/5s-constants';
import type { InventoryConfig } from '@/lib/5s-constants';

interface InventoryItemData {
  id?: string;
  name: string;
  location: string;
  category: string;
  quantity: number;
  quantityNeeded: number;
  quantityUnneeded: number;
  price: number | null;
  action: string;
  extra?: Record<string, string | number>;
  jaulaStatus?: string;
  jaulaFechaEntrada?: string | null;
  jaulaOrigen?: string | null;
  jaulaFechaSalida?: string | null;
  jaulaDestino?: string | null;
}

interface InventarioModalProps {
  open: boolean;
  onClose: () => void;
  sStep: number;
  miniStep: number;
}

export default function InventarioModal({ open, onClose, sStep, miniStep }: InventarioModalProps) {
  const { fetchProgress, currentUser, adminFreeNavigation, currentProject, currentZone } = use5SStore();
  const sStepData = S_STEPS.find(s => s.id === sStep);
  const config: InventoryConfig = INVENTORY_CONFIGS[sStep] || INVENTORY_CONFIGS[1];
  const isAdmin = currentUser?.role === 'admin' && adminFreeNavigation;

  const [items, setItems] = useState<InventoryItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showJaula, setShowJaula] = useState(false);
  const [csvPreview, setCsvPreview] = useState<InventoryItemData[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const [newItem, setNewItem] = useState<Partial<InventoryItemData> & { extra?: Record<string, string | number> }>({
    name: '',
    location: '',
    category: undefined as string | undefined,
    quantity: 1,
    quantityNeeded: 0,
    quantityUnneeded: 0,
    price: null,
    action: '',
    extra: {},
  });

  useEffect(() => {
    if (open) {
      loadInventory();
    }
  }, [open, sStep]);

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const projectIdParam = currentProject?.id ? `&projectId=${currentProject.id}` : '';
      const zoneIdParam = currentZone?.id ? `&zoneId=${currentZone.id}` : '';
      const res = await fetch(`/api/inventory?sStep=${sStep}${projectIdParam}${zoneIdParam}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data.map((item: any) => ({
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
        })));
      } else {
        console.error('Error loading inventory:', json.error);
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.category) {
      toast.error('Completa el nombre y la categoría del elemento');
      return;
    }

    if (!currentProject?.id) {
      toast.error('No hay proyecto seleccionado. Selecciona un proyecto antes de agregar elementos.');
      return;
    }

    // Auto-calculate quantityUnneeded if not set
    const qty = newItem.quantity || 1;
    const qtyNeeded = newItem.quantityNeeded || 0;
    const qtyUnneeded = newItem.quantityUnneeded || (sStep === 1 ? qty - qtyNeeded : 0);

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sStep,
          projectId: currentProject.id,
          zoneId: currentZone?.id || null,
          name: newItem.name,
          location: newItem.location,
          category: newItem.category,
          quantity: qty,
          quantityNeeded: qtyNeeded,
          quantityUnneeded: qtyUnneeded,
          price: newItem.price || null,
          action: newItem.action,
          extra: newItem.extra || {},
          // Auto-set jaula status for S1 innecesario items
          jaulaStatus: sStep === 1 && newItem.category === 'innecesario' ? 'en_jaula' : '',
          jaulaFechaEntrada: sStep === 1 && newItem.category === 'innecesario' ? new Date().toISOString() : null,
          jaulaOrigen: sStep === 1 && newItem.category === 'innecesario' ? currentProject.name || '' : null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Elemento agregado correctamente');
        await loadInventory();
        setNewItem({ name: '', location: '', category: undefined as string | undefined, quantity: 1, quantityNeeded: 0, quantityUnneeded: 0, price: null, action: '', extra: {} });
      } else {
        toast.error(`Error al agregar: ${json.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Error de conexión al agregar el elemento');
    }
  };

  const handleImportTemplate = async () => {
    if (!currentProject?.id) {
      toast.error('No hay proyecto seleccionado.');
      return;
    }
    try {
      const res = await fetch(`/api/templates?type=inventario&sStep=${sStep}`);
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        const content = JSON.parse(json.data[0].content);
        const templateItems = content.items || [];

        const importRes = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            templateItems.map((item: any) => ({
              sStep,
              projectId: currentProject.id,
              zoneId: currentZone?.id || null,
              name: item.name,
              location: item.location || '',
              category: item.category,
              quantity: item.quantity || 1,
              quantityNeeded: item.quantityNeeded || 0,
              quantityUnneeded: item.quantityUnneeded || 0,
              price: item.price ?? null,
              action: item.action || '',
              extra: item.extra || {},
            }))
          ),
        });

        const importJson = await importRes.json();
        if (importJson.success) {
          toast.success('Plantilla importada correctamente');
          await loadInventory();
        } else {
          toast.error(`Error al importar plantilla: ${importJson.error || 'Error desconocido'}`);
        }
      } else {
        toast.error('No se encontró plantilla para este paso');
      }
    } catch (error) {
      console.error('Error importing template:', error);
      toast.error('Error de conexión al importar plantilla');
    }
  };

  // TASK 7: CSV Import
  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) return;

        // Parse header
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        const parsedItems: InventoryItemData[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length < 2 || !values[0]) continue;

          const item: InventoryItemData = {
            name: values[headers.indexOf('nombre')] || values[0] || '',
            location: values[headers.indexOf('ubicación')] || values[headers.indexOf('ubicacion')] || values[1] || '',
            category: values[headers.indexOf('categoría')] || values[headers.indexOf('categoria')] || config.categories[0]?.value || '',
            quantity: parseInt(values[headers.indexOf('total exist.')] || values[headers.indexOf('total')] || values[2] || '1') || 1,
            quantityNeeded: parseInt(values[headers.indexOf('necesarios')] || values[headers.indexOf('nec.')] || '0') || 0,
            quantityUnneeded: parseInt(values[headers.indexOf('innecesarios')] || values[headers.indexOf('innec.')] || '0') || 0,
            price: parseFloat(values[headers.indexOf('precio')] || values[3] || '0') || null,
            action: values[headers.indexOf('acción')] || values[headers.indexOf('accion')] || '',
            extra: {},
          };

          // Parse extra fields from CSV
          config.extraFields.forEach((field, fIdx) => {
            const val = values[headers.indexOf(field.label.toLowerCase())] || values[7 + fIdx] || '';
            if (val) {
              item.extra![field.key] = val;
            }
          });

          parsedItems.push(item);
        }

        if (parsedItems.length > 0) {
          setCsvPreview(parsedItems);
        }
      } catch (error) {
        console.error('Error parsing CSV:', error);
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  const handleConfirmCsvImport = async () => {
    if (!csvPreview || csvPreview.length === 0) return;
    if (!currentProject?.id) {
      toast.error('No hay proyecto seleccionado.');
      return;
    }
    setIsImporting(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          csvPreview.map(item => ({
            sStep,
            projectId: currentProject!.id,
            zoneId: currentZone?.id || null,
            name: item.name,
            location: item.location,
            category: item.category || config.categories[0]?.value || '',
            quantity: item.quantity || 1,
            quantityNeeded: item.quantityNeeded || 0,
            quantityUnneeded: item.quantityUnneeded || 0,
            price: item.price || null,
            action: item.action || '',
            extra: item.extra || {},
            jaulaStatus: sStep === 1 && item.category === 'innecesario' ? 'en_jaula' : '',
            jaulaFechaEntrada: sStep === 1 && item.category === 'innecesario' ? new Date().toISOString() : null,
            jaulaOrigen: sStep === 1 && item.category === 'innecesario' ? currentProject!.name || '' : null,
          }))
        ),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`${csvPreview.length} elementos importados correctamente`);
        setCsvPreview(null);
        await loadInventory();
      } else {
        toast.error(`Error al importar CSV: ${json.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast.error('Error de conexión al importar CSV');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setItems(prev => prev.filter(item => item.id !== id));
        toast.success('Elemento eliminado');
      } else {
        toast.error(`Error al eliminar: ${json.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Error de conexión al eliminar');
    }
  };

  const handleUpdateJaula = async (id: string, updates: Partial<InventoryItemData>) => {
    try {
      const res = await fetch(`/api/inventory?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (json.success) {
        await loadInventory();
      } else {
        toast.error(`Error al actualizar: ${json.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error updating jaula:', error);
      toast.error('Error de conexión al actualizar');
    }
  };

  // Count classified items
  const classifiedCount = items.filter(i => i.category && i.category !== '').length;
  const classifyPercent = items.length > 0 ? Math.round((classifiedCount / items.length) * 100) : 0;
  const canComplete = classifyPercent >= INVENTORY_CLASSIFY_THRESHOLD && items.length > 0;

  // S1 specific counts
  const innecesarios = items.filter(i => i.category === 'innecesario');
  const dudosos = items.filter(i => i.category === 'dudoso');
  const necesarios = items.filter(i => i.category === 'util');
  const jaulaItems = items.filter(i => i.jaulaStatus === 'en_jaula');
  const totalJaulaValue = jaulaItems.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);

  const handleComplete = async () => {
    if (!canComplete) return;

    try {
      const res = await fetch(`/api/progress/step?sStep=${sStep}&miniStep=${miniStep}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: true,
          score: classifyPercent,
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
      console.error('Error completing inventory:', error);
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

  const handleExport = () => {
    const extraHeaders = config.extraFields.map(f => f.label);
    const headerRow = ['Nombre', 'Ubicación', 'Categoría', 'Total exist.', 'Necesarios', 'Innecesarios', 'Precio (€)', ...extraHeaders, 'Acción'].join(',');

    const rows = items.map(item => {
      const extraValues = config.extraFields.map(f => {
        const val = item.extra?.[f.key] ?? '';
        return String(val).replace(/,/g, ';');
      });
      const priceStr = item.price != null ? item.price.toFixed(2) : '';
      return [item.name, item.location, item.category, item.quantity, item.quantityNeeded, item.quantityUnneeded, priceStr, ...extraValues, item.action].join(',');
    });

    const csvContent = [headerRow, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventario_s${sStep}_${sStepData?.japaneseName?.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getCategoryBadge = (category: string) => {
    const cat = config.categories.find(c => c.value === category);
    if (!cat) return <Badge variant="secondary">{category}</Badge>;
    return <Badge className={cat.color}>{cat.label}</Badge>;
  };

  const getExtraValue = (item: InventoryItemData, fieldKey: string) => {
    return item.extra?.[fieldKey] ?? '';
  };

  const getJaulaStatusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      '': { label: '—', color: 'bg-gray-50 text-gray-400' },
      en_jaula: { label: 'En Jaula', color: 'bg-red-100 text-red-800' },
      reclamado: { label: 'Reclamado', color: 'bg-amber-100 text-amber-800' },
      transferido: { label: 'Transferido', color: 'bg-green-100 text-green-800' },
    };
    const info = map[status] || map[''];
    return <Badge className={info.color}>{info.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" style={{ color: sStepData?.color }} />
            <span>{config.title}</span>
            <Badge variant="outline" style={{ borderColor: sStepData?.color, color: sStepData?.color }}>
              {sStepData?.japaneseName}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
        {isAdmin && !isCompleted && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-xs text-amber-700 font-medium">Modo Admin:</span>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={handleAdminSkip}
            >
              Completar paso sin inventario
            </Button>
          </div>
        )}

        {isCompleted ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">¡Inventario Completado!</h3>
            <p className="text-muted-foreground">
              Se han clasificado {classifiedCount} de {items.length} elementos ({classifyPercent}%).
            </p>
            {sStep === 1 && (
              <div className="mt-4 flex justify-center gap-4">
                <span className="text-sm text-red-600">Innecesarios: {innecesarios.length}</span>
                <span className="text-sm text-yellow-600">Dudosos: {dudosos.length}</span>
                <span className="text-sm text-green-600">Necesarios: {necesarios.length}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* S-specific subtitle */}
            <div className="p-3 rounded-lg border-l-4" style={{ borderColor: sStepData?.color, backgroundColor: `${sStepData?.color}08` }}>
              <p className="text-sm font-medium" style={{ color: sStepData?.color }}>
                {config.subtitle}
              </p>
            </div>

            {/* 1S: Jaula info panel */}
            {sStep === 1 && (
              <Card className="border-2 border-red-200 bg-red-50/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-5 w-5 text-red-600" />
                    <h4 className="font-semibold text-red-800">Sistema de Jaulas y Tarjetas</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white rounded-lg border p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-3 h-3 rounded bg-red-500"></div>
                        <span className="font-medium">Etiqueta ROJA</span>
                      </div>
                      <p className="text-muted-foreground">Enviar a la JAULA. Elemento claramente innecesario.</p>
                    </div>
                    <div className="bg-white rounded-lg border p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-3 h-3 rounded bg-orange-500"></div>
                        <span className="font-medium">Etiqueta NARANJA</span>
                      </div>
                      <p className="text-muted-foreground">Cuestionar si se envía a la JAULA. Requiere revisión.</p>
                    </div>
                    <div className="bg-white rounded-lg border p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-3 h-3 rounded bg-green-500"></div>
                        <span className="font-medium">Sin etiqueta</span>
                      </div>
                      <p className="text-muted-foreground">Elemento necesario. Mantener en su ubicación.</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs">
                    <span className="text-red-700 font-medium">Innecesarios: {innecesarios.length}</span>
                    <span className="text-yellow-700 font-medium">Dudosos: {dudosos.length}</span>
                    <span className="text-green-700 font-medium">Necesarios: {necesarios.length}</span>
                    {jaulaItems.length > 0 && (
                      <span className="text-red-800 font-bold">
                        En Jaula: {jaulaItems.length} ({totalJaulaValue.toFixed(2)} €)
                      </span>
                    )}
                  </div>
                  {jaulaItems.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 text-xs border-red-300 text-red-700 hover:bg-red-50"
                      onClick={() => setShowJaula(!showJaula)}
                    >
                      <Package className="h-3 w-3 mr-1" />
                      {showJaula ? 'Ocultar' : 'Ver'} Jaula de Excedentes ({jaulaItems.length})
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 1S: Jaula de Excedentes panel */}
            {sStep === 1 && showJaula && jaulaItems.length > 0 && (
              <Card className="border-2 border-amber-300 bg-amber-50/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-5 w-5 text-amber-600" />
                    <h4 className="font-semibold text-amber-800">Jaula de Excedentes</h4>
                    <Badge className="bg-amber-200 text-amber-900">{jaulaItems.length} elementos</Badge>
                  </div>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Elemento</TableHead>
                          <TableHead className="text-xs">Cant.</TableHead>
                          <TableHead className="text-xs">Precio</TableHead>
                          <TableHead className="text-xs">F. Entrada</TableHead>
                          <TableHead className="text-xs">Origen</TableHead>
                          <TableHead className="text-xs">Estado</TableHead>
                          <TableHead className="text-xs">F. Salida</TableHead>
                          <TableHead className="text-xs">Destino</TableHead>
                          <TableHead className="text-xs w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jaulaItems.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="text-xs font-medium">{item.name}</TableCell>
                            <TableCell className="text-xs text-center">{item.quantityUnneeded || item.quantity}</TableCell>
                            <TableCell className="text-xs text-right">{item.price ? `${(item.price * (item.quantityUnneeded || item.quantity)).toFixed(2)} €` : '—'}</TableCell>
                            <TableCell className="text-xs">{item.jaulaFechaEntrada ? new Date(item.jaulaFechaEntrada).toLocaleDateString('es-ES') : '—'}</TableCell>
                            <TableCell className="text-xs">{item.jaulaOrigen || '—'}</TableCell>
                            <TableCell>{getJaulaStatusBadge(item.jaulaStatus || '')}</TableCell>
                            <TableCell className="text-xs">{item.jaulaFechaSalida ? new Date(item.jaulaFechaSalida).toLocaleDateString('es-ES') : '—'}</TableCell>
                            <TableCell className="text-xs">{item.jaulaDestino || '—'}</TableCell>
                            <TableCell>
                              <Select
                                value={item.jaulaStatus || undefined}
                                onValueChange={val => {
                                  const updates: any = { jaulaStatus: val };
                                  if (val === 'transferido') {
                                    updates.jaulaFechaSalida = new Date().toISOString();
                                    updates.jaulaDestino = currentProject?.name || '';
                                  }
                                  if (val === 'reclamado') {
                                    updates.jaulaDestino = currentProject?.name || '';
                                  }
                                  if (item.id) handleUpdateJaula(item.id, updates);
                                }}
                              >
                                <SelectTrigger className="h-6 w-24 text-[10px]">
                                  <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="en_jaula">En Jaula</SelectItem>
                                  <SelectItem value="reclamado">Reclamado</SelectItem>
                                  <SelectItem value="transferido">Transferido</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-3 flex gap-4 text-xs text-amber-700">
                    <span>Total en Jaula: {jaulaItems.length} elementos</span>
                    <span>Valor total: {totalJaulaValue.toFixed(2)} €</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 1S: Resumen elementos innecesarios con detalles */}
            {sStep === 1 && innecesarios.length > 0 && (
              <Card className="border border-red-300">
                <CardContent className="p-3">
                  <h5 className="text-sm font-semibold text-red-700 mb-2">Elementos Innecesarios</h5>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Elemento</TableHead>
                          <TableHead className="text-xs">Ubicación</TableHead>
                          <TableHead className="text-xs text-center">Innec.</TableHead>
                          <TableHead className="text-xs text-right">Precio (€)</TableHead>
                          <TableHead className="text-xs">Estado</TableHead>
                          <TableHead className="text-xs">Frec. uso</TableHead>
                          <TableHead className="text-xs">Decisión</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {innecesarios.map(item => (
                          <TableRow key={item.id} className="bg-red-50/50">
                            <TableCell className="text-xs font-medium">{item.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{item.location}</TableCell>
                            <TableCell className="text-xs text-center text-red-700">{item.quantityUnneeded || item.quantity}</TableCell>
                            <TableCell className="text-xs text-right font-medium text-red-700">{item.price ? `${(item.price * (item.quantityUnneeded || item.quantity)).toFixed(2)} €` : '—'}</TableCell>
                            <TableCell className="text-xs">{String(item.extra?.estado ?? '—')}</TableCell>
                            <TableCell className="text-xs">{String(item.extra?.frecuenciaUso ?? '—')}</TableCell>
                            <TableCell className="text-xs">
                              <Badge className={item.extra?.decision === 'Jaula' ? 'bg-red-100 text-red-800' : item.extra?.decision === 'Eliminar' ? 'bg-red-100 text-red-800' : item.extra?.decision === 'Reubicar' ? 'bg-blue-100 text-blue-800' : item.extra?.decision === 'Vender' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                {String(item.extra?.decision || item.action || 'Jaula')}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Classification progress */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <span className="text-sm font-medium">Clasificación</span>
                <p className="text-xs text-muted-foreground">
                  {classifiedCount}/{items.length} clasificados
                </p>
              </div>
              <Badge variant={canComplete ? 'default' : 'secondary'}>
                {classifyPercent}% (mín. {INVENTORY_CLASSIFY_THRESHOLD}%)
              </Badge>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleImportTemplate}>
                <Upload className="h-4 w-4 mr-1" /> Importar Plantilla
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={items.length === 0}>
                <Download className="h-4 w-4 mr-1" /> Exportar CSV
              </Button>
              {/* TASK 7: CSV Import button */}
              <label className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground cursor-pointer">
                <FileUp className="h-4 w-4 mr-1" /> Importar CSV
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleCsvFileSelect}
                />
              </label>
              <a
                href={`/templates/${config.templateName}`}
                download
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Descargar Plantilla Excel
              </a>
            </div>

            {/* TASK 7: CSV Import Preview */}
            {csvPreview && csvPreview.length > 0 && (
              <Card className="border-2 border-blue-200 bg-blue-50/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileUp className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold text-blue-800">Vista Previa de Importación CSV</h4>
                      <Badge className="bg-blue-200 text-blue-900">{csvPreview.length} elementos</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setCsvPreview(null)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs bg-blue-600 hover:bg-blue-700"
                        onClick={handleConfirmCsvImport}
                        disabled={isImporting}
                      >
                        {isImporting ? 'Importando...' : `Confirmar Importación (${csvPreview.length})`}
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Elemento</TableHead>
                          <TableHead className="text-xs">Ubicación</TableHead>
                          <TableHead className="text-xs">Categoría</TableHead>
                          <TableHead className="text-xs">Cant.</TableHead>
                          <TableHead className="text-xs">Precio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvPreview.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs font-medium">{item.name}</TableCell>
                            <TableCell className="text-xs">{item.location}</TableCell>
                            <TableCell className="text-xs">{item.category}</TableCell>
                            <TableCell className="text-xs text-center">{item.quantity}</TableCell>
                            <TableCell className="text-xs text-right">{item.price ? `${item.price.toFixed(2)} €` : '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Add item form */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Row 1: Name, Location, Category, Quantity, Price */}
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium">Elemento *</label>
                      <Input
                        placeholder="Nombre del elemento"
                        value={newItem.name}
                        onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Ubicación</label>
                      <Input
                        placeholder="Ubicación"
                        value={newItem.location}
                        onChange={e => setNewItem(prev => ({ ...prev, location: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Categoría *</label>
                      <Select
                        value={newItem.category || undefined}
                        onValueChange={val => setNewItem(prev => ({ ...prev, category: val }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {config.categories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium">Total exist.</label>
                      <Input
                        type="number"
                        min="1"
                        value={newItem.quantity || 1}
                        onChange={e => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Precio (€)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={newItem.price ?? ''}
                        onChange={e => setNewItem(prev => ({ ...prev, price: e.target.value ? parseFloat(e.target.value) : null }))}
                      />
                    </div>
                  </div>

                  {/* S1 specific: Necesarios / Innecesarios columns */}
                  {sStep === 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                      <div>
                        <label className="text-xs font-medium text-green-700">Necesarios</label>
                        <Input
                          type="number"
                          min="0"
                          value={newItem.quantityNeeded || 0}
                          onChange={e => {
                            const needed = parseInt(e.target.value) || 0;
                            const total = newItem.quantity || 1;
                            setNewItem(prev => ({
                              ...prev,
                              quantityNeeded: needed,
                              quantityUnneeded: Math.max(0, total - needed),
                            }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-red-700">Innecesarios</label>
                        <Input
                          type="number"
                          min="0"
                          value={newItem.quantityUnneeded || 0}
                          onChange={e => setNewItem(prev => ({ ...prev, quantityUnneeded: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                  )}

                  {/* Row 2: Extra fields specific to this S */}
                  {config.extraFields.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      {config.extraFields.map(field => (
                        <div key={field.key}>
                          <label className="text-xs font-medium">{field.label}</label>
                          {field.type === 'select' && field.options ? (
                            <Select
                              value={newItem.extra?.[field.key] ? String(newItem.extra[field.key]) : undefined}
                              onValueChange={val =>
                                setNewItem(prev => ({
                                  ...prev,
                                  extra: { ...(prev.extra || {}), [field.key]: val },
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={field.label} />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options.map(opt => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : field.type === 'number' ? (
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              placeholder={field.label}
                              value={newItem.extra?.[field.key] ?? ''}
                              onChange={e =>
                                setNewItem(prev => ({
                                  ...prev,
                                  extra: { ...(prev.extra || {}), [field.key]: parseInt(e.target.value) || 0 },
                                }))
                              }
                            />
                          ) : (
                            <Input
                              placeholder={field.label}
                              value={String(newItem.extra?.[field.key] ?? '')}
                              onChange={e =>
                                setNewItem(prev => ({
                                  ...prev,
                                  extra: { ...(prev.extra || {}), [field.key]: e.target.value },
                                }))
                              }
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleAddItem}
                      disabled={!newItem.name || !newItem.category}
                      size="sm"
                      style={{ backgroundColor: sStepData?.color }}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Agregar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Biblioteca de Estándares — only for 4S */}
            {sStep === 4 && items.length > 0 && (
              <Card className="border-2 border-blue-200 bg-blue-50/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-800">Biblioteca de Estándares</h4>
                  </div>
                  <p className="text-xs text-blue-700 mb-3">
                    Resumen de todos los estándares inventariados organizados por tipo y estado de implantación.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(
                      items.reduce((acc, item) => {
                        const cat = config.categories.find(c => c.value === item.category);
                        const label = cat?.label || item.category;
                        if (!acc[label]) acc[label] = [];
                        acc[label].push(item);
                        return acc;
                      }, {} as Record<string, InventoryItemData[]>)
                    ).map(([catLabel, catItems]) => (
                      <div key={catLabel} className="bg-white rounded-lg border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{catLabel}</span>
                          <Badge variant="secondary" className="text-xs">{catItems.length}</Badge>
                        </div>
                        <div className="space-y-1">
                          {catItems.map(item => {
                            const estado = item.extra?.estadoEstandar || '—';
                            const cumplimiento = item.extra?.cumplimiento;
                            const estadoColor = estado === 'Implantado' ? 'text-green-600' : estado === 'En proceso' ? 'text-amber-600' : 'text-red-600';
                            return (
                              <div key={item.id} className="flex items-center justify-between text-xs">
                                <span className="truncate flex-1 mr-2">{item.name}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  {cumplimiento != null && (
                                    <span className="text-muted-foreground">{cumplimiento}%</span>
                                  )}
                                  <span className={estadoColor}>{estado}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-4 text-xs text-blue-700">
                    <span>Total: {items.length}</span>
                    <span>Implantados: {items.filter(i => i.extra?.estadoEstandar === 'Implantado').length}</span>
                    <span>En proceso: {items.filter(i => i.extra?.estadoEstandar === 'En proceso').length}</span>
                    <span>Pendientes: {items.filter(i => i.extra?.estadoEstandar === 'Pendiente').length}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Items table */}
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay elementos en el inventario</p>
                <p className="text-xs mt-1">Importe una plantilla o agregue elementos manualmente</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Elemento</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      {sStep === 1 && (
                        <>
                          <TableHead className="text-center text-green-700">Nec.</TableHead>
                          <TableHead className="text-center text-red-700">Innec.</TableHead>
                        </>
                      )}
                      <TableHead className="text-right">Precio (€)</TableHead>
                      {config.extraFields.slice(0, 2).map(f => (
                        <TableHead key={f.key}>{f.label}</TableHead>
                      ))}
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(item => (
                      <TableRow key={item.id} className={item.jaulaStatus === 'en_jaula' ? 'bg-red-50/50' : ''}>
                        <TableCell className="text-sm font-medium">{item.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.location}</TableCell>
                        <TableCell>{getCategoryBadge(item.category)}</TableCell>
                        <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                        {sStep === 1 && (
                          <>
                            <TableCell className="text-center text-sm text-green-700">{item.quantityNeeded || '—'}</TableCell>
                            <TableCell className="text-center text-sm text-red-700">
                              {item.quantityUnneeded || (item.category === 'innecesario' ? item.quantity : '—')}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-right text-sm">{item.price != null ? `${item.price.toFixed(2)} €` : '—'}</TableCell>
                        {config.extraFields.slice(0, 2).map(f => (
                          <TableCell key={f.key} className="text-sm text-muted-foreground">
                            {getExtraValue(item, f.key)}
                          </TableCell>
                        ))}
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-destructive"
                            onClick={() => item.id && handleDeleteItem(item.id)}
                          >
                            ×
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Submit button */}
            <div className="flex justify-end">
              <Button
                onClick={handleComplete}
                disabled={!canComplete || items.length === 0}
                style={canComplete ? { backgroundColor: sStepData?.color } : undefined}
              >
                Completar Inventario ({classifyPercent}% clasificado)
              </Button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
