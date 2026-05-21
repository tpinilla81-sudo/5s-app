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
import { ClipboardList, Plus, CheckCircle, Download, Upload } from 'lucide-react';
import { use5SStore } from '@/lib/store';
import { S_STEPS, INVENTORY_CLASSIFY_THRESHOLD } from '@/lib/5s-constants';

interface InventoryItemData {
  id?: string;
  name: string;
  location: string;
  category: string;
  quantity: number;
  action: string;
}

interface InventarioModalProps {
  open: boolean;
  onClose: () => void;
  sStep: number;
  miniStep: number;
}

const CATEGORIES = [
  { value: 'util', label: 'Útil', color: 'bg-green-100 text-green-800' },
  { value: 'innecesario', label: 'Innecesario', color: 'bg-red-100 text-red-800' },
  { value: 'dudoso', label: 'Dudoso', color: 'bg-yellow-100 text-yellow-800' },
];

export default function InventarioModal({ open, onClose, sStep, miniStep }: InventarioModalProps) {
  const { fetchProgress } = use5SStore();
  const sStepData = S_STEPS.find(s => s.id === sStep);

  const [items, setItems] = useState<InventoryItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  // New item form
  const [newItem, setNewItem] = useState<Partial<InventoryItemData>>({
    name: '',
    location: '',
    category: '',
    quantity: 1,
    action: '',
  });

  useEffect(() => {
    if (open) {
      loadInventory();
    }
  }, [open, sStep]);

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/inventory?sStep=${sStep}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data.map((item: InventoryItemData & { id: string }) => ({
          id: item.id,
          name: item.name,
          location: item.location || '',
          category: item.category,
          quantity: item.quantity,
          action: item.action || '',
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
          name: newItem.name,
          location: newItem.location,
          category: newItem.category,
          quantity: newItem.quantity || 1,
          action: newItem.action,
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
          action: newItem.action || '',
        }]);
        setNewItem({ name: '', location: '', category: '', quantity: 1, action: '' });
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
              name: item.name,
              location: item.location || '',
              category: item.category,
              quantity: item.quantity || 1,
              action: item.action || '',
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

  const classifiedCount = items.filter(i => i.category === 'util' || i.category === 'innecesario').length;
  const classifyPercent = items.length > 0 ? Math.round((classifiedCount / items.length) * 100) : 0;
  const canComplete = classifyPercent >= INVENTORY_CLASSIFY_THRESHOLD;

  const handleComplete = async () => {
    if (!canComplete) return;

    try {
      const res = await fetch(`/api/progress/${sStep}/${miniStep}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: true,
          score: classifyPercent,
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

  const handleExport = () => {
    const csvContent = [
      ['Nombre', 'Ubicación', 'Categoría', 'Cantidad', 'Acción'].join(','),
      ...items.map(item =>
        [item.name, item.location, item.category, item.quantity, item.action].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventario_s${sStep}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getCategoryBadge = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    if (!cat) return <Badge variant="secondary">{category}</Badge>;
    return <Badge className={cat.color}>{cat.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" style={{ color: sStepData?.color }} />
            <span>Inventario</span>
            <Badge variant="outline" style={{ borderColor: sStepData?.color, color: sStepData?.color }}>
              {sStepData?.name}
            </Badge>
          </DialogTitle>
        </DialogHeader>

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
            {/* Classification progress */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <span className="text-sm font-medium">Clasificación</span>
                <p className="text-xs text-muted-foreground">
                  {classifiedCount}/{items.length} clasificados (útil/innecesario)
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
            </div>

            {/* Add item form */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium">Nombre *</label>
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
                        {CATEGORIES.map(cat => (
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
                      <TableHead>Nombre</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-center">Cant.</TableHead>
                      <TableHead>Acción</TableHead>
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
                        <TableCell className="text-sm text-muted-foreground">{item.action}</TableCell>
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
