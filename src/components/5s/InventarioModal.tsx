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
import { ClipboardList, Plus, CheckCircle, Download, Upload, FileSpreadsheet, BookOpen } from 'lucide-react';
import { use5SStore } from '@/lib/store';
import { S_STEPS, INVENTORY_CONFIGS, INVENTORY_CLASSIFY_THRESHOLD } from '@/lib/5s-constants';
import type { InventoryConfig } from '@/lib/5s-constants';

interface InventoryItemData {
  id?: string;
  name: string;
  location: string;
  category: string;
  quantity: number;
  price: number | null;
  action: string;
  /** Extra fields stored as JSON key-value */
  extra?: Record<string, string | number>;
}

interface InventarioModalProps {
  open: boolean;
  onClose: () => void;
  sStep: number;
  miniStep: number;
}

export default function InventarioModal({ open, onClose, sStep, miniStep }: InventarioModalProps) {
  const { fetchProgress, currentUser, adminFreeNavigation, currentProject } = use5SStore();
  const sStepData = S_STEPS.find(s => s.id === sStep);
  const config: InventoryConfig = INVENTORY_CONFIGS[sStep] || INVENTORY_CONFIGS[1];
  const isAdmin = currentUser?.role === 'admin' && adminFreeNavigation;

  const [items, setItems] = useState<InventoryItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  // New item form — includes extra fields
  const [newItem, setNewItem] = useState<Partial<InventoryItemData> & { extra?: Record<string, string | number> }>({
    name: '',
    location: '',
    category: '',
    quantity: 1,
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
      const res = await fetch(`/api/inventory?sStep=${sStep}&projectId=${currentProject?.id || ''}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data.map((item: InventoryItemData & { id: string; extra?: string }) => ({
          id: item.id,
          name: item.name,
          location: item.location || '',
          category: item.category,
          quantity: item.quantity,
          price: item.price ?? null,
          action: item.action || '',
          extra: typeof item.extra === 'string' ? JSON.parse(item.extra) : (item.extra || {}),
        })));
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.category) return;

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sStep,
          projectId: currentProject?.id,
          name: newItem.name,
          location: newItem.location,
          category: newItem.category,
          quantity: newItem.quantity || 1,
          price: newItem.price || null,
          action: newItem.action,
          extra: newItem.extra || {},
        }),
      });

      const json = await res.json();
      if (json.success) {
        setItems(prev => [...prev, {
          id: json.data.id,
          name: newItem.name || '',
          location: newItem.location || '',
          category: newItem.category || '',
          quantity: newItem.quantity || 1,
          price: newItem.price || null,
          action: newItem.action || '',
          extra: newItem.extra || {},
        }]);
        setNewItem({ name: '', location: '', category: '', quantity: 1, price: null, action: '', extra: {} });
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleImportTemplate = async () => {
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
            templateItems.map((item: InventoryItemData) => ({
              sStep,
              projectId: currentProject?.id,
              name: item.name,
              location: item.location || '',
              category: item.category,
              quantity: item.quantity || 1,
              price: item.price ?? null,
              action: item.action || '',
              extra: item.extra || {},
            }))
          ),
        });

        const importJson = await importRes.json();
        if (importJson.success) {
          await loadInventory();
        }
      }
    } catch (error) {
      console.error('Error importing template:', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  // Count classified items (items with a category assigned)
  const classifiedCount = items.filter(i => i.category && i.category !== '').length;
  const classifyPercent = items.length > 0 ? Math.round((classifiedCount / items.length) * 100) : 0;
  const canComplete = classifyPercent >= INVENTORY_CLASSIFY_THRESHOLD && items.length > 0;

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
        body: JSON.stringify({ completed: true, score: 100, notes: 'Completado por administrador (skip)', projectId: currentProject?.id }),
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
    const headerRow = ['Nombre', 'Ubicación', 'Categoría', 'Cantidad', 'Precio (€)', ...extraHeaders, 'Acción'].join(',');

    const rows = items.map(item => {
      const extraValues = config.extraFields.map(f => {
        const val = item.extra?.[f.key] ?? '';
        return String(val).replace(/,/g, ';');
      });
      const priceStr = item.price != null ? item.price.toFixed(2) : '';
      return [item.name, item.location, item.category, item.quantity, priceStr, ...extraValues, item.action].join(',');
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

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" style={{ color: sStepData?.color }} />
            <span>{config.title}</span>
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
                    <span className="text-lg">📦</span>
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
                  <div className="mt-2 flex gap-4 text-xs text-red-700">
                    <span>Innecesarios: {items.filter(i => i.category === 'innecesario').length}</span>
                    <span>Dudosos: {items.filter(i => i.category === 'dudoso').length}</span>
                    <span>Necesarios: {items.filter(i => i.category === 'util').length}</span>
                    {items.filter(i => i.category === 'innecesario' || i.category === 'dudoso').length > 0 && (
                      <span className="font-medium">
                        Valor en jaula: {items.filter(i => i.category === 'innecesario' || i.category === 'dudoso').reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0).toFixed(2)} €
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 1S: Jaula summary for items to send */}
            {sStep === 1 && items.filter(i => i.category === 'innecesario').length > 0 && (
              <Card className="border border-red-300">
                <CardContent className="p-3">
                  <h5 className="text-sm font-semibold text-red-700 mb-2">Elementos a enviar a la Jaula</h5>
                  <div className="space-y-1">
                    {items.filter(i => i.category === 'innecesario').map(item => (
                      <div key={item.id} className="flex items-center justify-between text-xs bg-red-50 rounded p-1.5">
                        <span className="font-medium">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{item.location}</span>
                          <span className="font-medium text-red-700">{item.price ? `${(item.price * item.quantity).toFixed(2)} €` : ''}</span>
                          <span className="text-muted-foreground">→ {item.action}</span>
                        </div>
                      </div>
                    ))}
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
              <a
                href={`/templates/${config.templateName}`}
                download
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Descargar Plantilla Excel
              </a>
            </div>

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
                        value={newItem.category}
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
                      <label className="text-xs font-medium">Cant.</label>
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

                  {/* Row 2: Extra fields specific to this S */}
                  {config.extraFields.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      {config.extraFields.map(field => (
                        <div key={field.key}>
                          <label className="text-xs font-medium">{field.label}</label>
                          {field.type === 'select' && field.options ? (
                            <Select
                              value={String(newItem.extra?.[field.key] ?? '')}
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
                    {/* Group by category */}
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
                  {/* Summary stats */}
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
                      <TableHead className="text-center">Cant.</TableHead>
                      <TableHead className="text-right">Precio (€)</TableHead>
                      {config.extraFields.slice(0, 2).map(f => (
                        <TableHead key={f.key}>{f.label}</TableHead>
                      ))}
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm font-medium">{item.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.location}</TableCell>
                        <TableCell>{getCategoryBadge(item.category)}</TableCell>
                        <TableCell className="text-center text-sm">{item.quantity}</TableCell>
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
      </DialogContent>
    </Dialog>
  );
}
