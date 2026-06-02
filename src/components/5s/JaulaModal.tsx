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
import { Package, Building2, Printer, Tag } from 'lucide-react';
import { use5SStore } from '@/lib/store';
import TagPrinter from '@/components/5s/TagPrinter';

interface JaulaItem {
  id: string;
  name: string;
  location: string;
  category: string;
  quantity: number;
  quantityUnneeded: number;
  price: number | null;
  jaulaStatus: string;
  jaulaFechaEntrada: string | null;
  jaulaOrigen: string | null;
  jaulaFechaSalida: string | null;
  jaulaDestino: string | null;
  zonaOrigen: string | null;
  zonaDestino: string | null;
  extra?: Record<string, string | number>;
  project?: { name: string };
}

interface JaulaModalProps {
  open: boolean;
  onClose: () => void;
}

export default function JaulaModal({ open, onClose }: JaulaModalProps) {
  const { currentProject, currentZone } = use5SStore();
  const [jaulaItems, setJaulaItems] = useState<JaulaItem[]>([]);
  const [jaulaFilter, setJaulaFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) loadJaulaItems();
  }, [open, currentProject, currentZone]);

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
    } finally {
      setIsLoading(false);
    }
  };

  const filteredJaulaItems = jaulaFilter === 'all'
    ? jaulaItems
    : jaulaItems.filter(i => i.jaulaStatus === jaulaFilter);

  const totalJaulaValue = filteredJaulaItems.reduce(
    (sum, i) => sum + (i.price || 0) * (i.quantityUnneeded || i.quantity), 0
  );

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

  // Prepare tag data for TagPrinter — all Jaula items get red tag with QR
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
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent size="xl" className="flex flex-col overflow-hidden p-0 max-h-[90vh]">
        <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-red-600" />
            <span>Jaula de Excedentes</span>
            {currentZone && (
              <Badge variant="outline" className="border-red-300 text-red-700">
                {currentZone.name}
              </Badge>
            )}
            {jaulaItems.length > 0 && (
              <Badge className="bg-red-100 text-red-800 ml-1">
                {jaulaItems.length} elementos
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
          {/* Info panel */}
          <div className="p-3 rounded-lg border-l-4 border-red-500 bg-red-50/30 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-sm font-medium text-red-800">Etiqueta ROJA — Innecesario</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Todos los elementos de este inventario son INNECESARIOS. Se envían a la JAULA o se ELIMINAN directamente.
            </p>
          </div>

          {/* Filters & actions */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filtrar por estado:</span>
              <Select value={jaulaFilter} onValueChange={setJaulaFilter}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="en_jaula">En Jaula</SelectItem>
                  <SelectItem value="reclamado">Reclamado</SelectItem>
                  <SelectItem value="transferido">Transferido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Print label button */}
            <div className="flex items-center gap-2">
              {tagItems.length > 0 && (
                <TagPrinter items={tagItems} />
              )}
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredJaulaItems.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {jaulaItems.length === 0
                    ? 'No hay elementos en la jaula de excedentes'
                    : 'No hay elementos con el filtro seleccionado'}
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
                      <TableHead className="text-xs">Cantidad</TableHead>
                      <TableHead className="text-xs">Precio</TableHead>
                      <TableHead className="text-xs">Proyecto/Origen</TableHead>
                      <TableHead className="text-xs">F. Entrada</TableHead>
                      <TableHead className="text-xs">Estado</TableHead>
                      <TableHead className="text-xs">Decisión</TableHead>
                      <TableHead className="text-xs">F. Salida</TableHead>
                      <TableHead className="text-xs">Destino</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJaulaItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs font-medium">{item.name}</TableCell>
                        <TableCell className="text-xs text-center">{item.quantityUnneeded || item.quantity}</TableCell>
                        <TableCell className="text-xs text-right">
                          {item.price ? `${(item.price * (item.quantityUnneeded || item.quantity)).toFixed(2)} €` : '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            {item.project?.name || item.jaulaOrigen || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.jaulaFechaEntrada ? new Date(item.jaulaFechaEntrada).toLocaleDateString('es-ES') : '—'}
                        </TableCell>
                        <TableCell>{getJaulaStatusBadge(item.jaulaStatus)}</TableCell>
                        <TableCell className="text-xs">
                          <Badge className={
                            item.extra?.decision === 'Jaula' ? 'bg-orange-100 text-orange-800'
                            : item.extra?.decision === 'Eliminar' ? 'bg-red-100 text-red-800'
                            : item.extra?.decision === 'Reubicar' ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                          }>
                            {String(item.extra?.decision || 'Jaula')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.jaulaFechaSalida ? new Date(item.jaulaFechaSalida).toLocaleDateString('es-ES') : '—'}
                        </TableCell>
                        <TableCell className="text-xs">{item.jaulaDestino || item.zonaDestino || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex gap-6 text-sm mt-4">
                <span className="text-gray-700">Total elementos: <strong>{filteredJaulaItems.length}</strong></span>
                <span className="text-gray-700">Valor total: <strong className="text-red-600">{totalJaulaValue.toFixed(2)} €</strong></span>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
