'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Card, CardContent } from '@/components/ui/card';
import { BoxSelect, Building2 } from 'lucide-react';
import { use5SStore } from '@/lib/store';

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
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = filterCat === 'all'
    ? activosItems
    : activosItems.filter(i => i.category === filterCat);

  const totalValue = filteredItems.reduce(
    (sum, i) => sum + (i.price || 0) * (i.quantityNeeded || i.quantity), 0
  );

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent size="xl" className="flex flex-col overflow-hidden p-0 max-h-[90vh]">
        <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BoxSelect className="h-5 w-5 text-green-600" />
            <span>Activos (Elementos Necesarios)</span>
            {currentZone && (
              <Badge variant="outline" className="border-green-300 text-green-700">
                {currentZone.name}
              </Badge>
            )}
            {activosItems.length > 0 && (
              <Badge className="bg-green-100 text-green-800 ml-1">
                {activosItems.length} elementos
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
          {/* Info panel */}
          <div className="p-3 rounded-lg border-l-4 border-green-500 bg-green-50/30 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-sm font-medium text-green-800">Activos — Elementos Necesarios</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Los elementos necesarios clasificados en S1 (Seiri). Se organizan en S2 (Seiton) con ubicación, método de identificación y cercanía.
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filtrar:</span>
              <Select value={filterCat} onValueChange={setFilterCat}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="necesario">Necesario</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredItems.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <BoxSelect className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {activosItems.length === 0
                    ? 'No hay elementos necesarios (activos) inventariados'
                    : 'No hay elementos con el filtro seleccionado'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Los elementos necesarios se registran en S1 Paso 3 (Inventario de Clasificación)
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Elemento</TableHead>
                      <TableHead className="text-xs">Ubicación</TableHead>
                      <TableHead className="text-xs">Categoría</TableHead>
                      <TableHead className="text-xs">Cantidad</TableHead>
                      <TableHead className="text-xs">Precio</TableHead>
                      <TableHead className="text-xs">Ubicación asig.</TableHead>
                      <TableHead className="text-xs">Método id.</TableHead>
                      <TableHead className="text-xs">Cercanía</TableHead>
                      <TableHead className="text-xs">Proyecto/Origen</TableHead>
                      <TableHead className="text-xs">Z. Destino</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map(item => (
                      <TableRow key={item.id} className="bg-green-50/30">
                        <TableCell className="text-xs font-medium">{item.name}</TableCell>
                        <TableCell className="text-xs">{item.location || '—'}</TableCell>
                        <TableCell className="text-xs">
                          <Badge className="bg-green-100 text-green-800">Necesario</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-center">{item.quantityNeeded || item.quantity}</TableCell>
                        <TableCell className="text-xs text-right">
                          {item.price ? `${(item.price * (item.quantityNeeded || item.quantity)).toFixed(2)} €` : '—'}
                        </TableCell>
                        <TableCell className="text-xs">{String(item.extra?.ubicacionAsignada ?? '—')}</TableCell>
                        <TableCell className="text-xs">{String(item.extra?.metodoIdentificacion ?? '—')}</TableCell>
                        <TableCell className="text-xs">{String(item.extra?.cercania ?? '—')}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            {item.project?.name || item.zonaOrigen || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{item.zonaDestino || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex gap-6 text-sm mt-4">
                <span className="text-gray-700">Total elementos: <strong>{filteredItems.length}</strong></span>
                <span className="text-gray-700">Valor total: <strong className="text-green-600">{totalValue.toFixed(2)} €</strong></span>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
