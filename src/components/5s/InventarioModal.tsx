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
import { ClipboardList, Plus, CheckCircle, Download, Upload, FileSpreadsheet, BookOpen, ArrowRight, AlertTriangle, FileUp, Maximize2, Minimize2, File, PenTool, Image as ImageIcon, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { use5SStore } from '@/lib/store';
import { S_STEPS, INVENTORY_CONFIGS, INVENTORY_CLASSIFY_THRESHOLD } from '@/lib/5s-constants';
import type { InventoryConfig } from '@/lib/5s-constants';
import LayoutEditor from '@/components/5s/LayoutEditor';
import ColorCodeTable from '@/components/5s/ColorCodeTable';
import TagPrinter from '@/components/5s/TagPrinter';

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
  zonaOrigen?: string | null;
  zonaDestino?: string | null;
}

interface InventarioModalProps {
  open: boolean;
  onClose: () => void;
  sStep: number;
  miniStep: number;
}

export default function InventarioModal({ open, onClose, sStep, miniStep }: InventarioModalProps) {
  const { fetchProgress, currentUser, adminFreeNavigation, currentProject, currentZone, canPerform, canView, hasPermission } = use5SStore();
  const sStepData = S_STEPS.find(s => s.id === sStep);
  const defaultConfig: InventoryConfig = INVENTORY_CONFIGS[sStep] || INVENTORY_CONFIGS[1];
  const [customConfig, setCustomConfig] = useState<InventoryConfig | null>(null);
  const [hasTemplate, setHasTemplate] = useState<boolean | null>(null); // null = loading, false = no template, true = has template
  const config: InventoryConfig = customConfig || defaultConfig;
  const canSkipSteps = hasPermission('skip_steps');
  const canPerformStep = canPerform(sStep, miniStep);
  const canViewStep = canView(sStep, miniStep);
  // Permission-driven: read-only if no execute perm OR if candado closed for skip_steps users
  const isReadOnly = !canPerformStep || (canSkipSteps && !adminFreeNavigation);

  const [items, setItems] = useState<InventoryItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [csvPreview, setCsvPreview] = useState<InventoryItemData[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [showLayoutEditor, setShowLayoutEditor] = useState(false);
  const [showColorCodeTable, setShowColorCodeTable] = useState(false);
  const [savedLayouts, setSavedLayouts] = useState<{ id: string; title: string; photoUrl: string | null; createdAt: string }[]>([]);
  const [layoutUploaded, setLayoutUploaded] = useState(false);

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
      // Load layouts for any S step that has layout support (S2 primarily, also S3/S4 for estandares)
      if (sStep === 2 || sStep === 3 || sStep === 4) loadLayouts();
      // Load custom inventory template if available
      loadCustomInventoryConfig();
    }
  }, [open, sStep]);

  const loadCustomInventoryConfig = async () => {
    try {
      // If the zone has a board config, fetch inventory template from that config
      if (currentZone?.boardConfigId) {
        const slotsRes = await fetch(`/api/board-slots?boardConfigId=${currentZone.boardConfigId}&sStep=${sStep}&miniStep=3`);
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
              setHasTemplate(false);
            }
          } else {
            // No inventario template assigned in this board slot
            setCustomConfig(null);
            setHasTemplate(false);
          }
        } else {
          // No slot configured for this step
          setCustomConfig(null);
          setHasTemplate(false);
        }
      } else {
        // Fallback: load global template
        const res = await fetch(`/api/templates?type=inventario&sStep=${sStep}&miniStep=3`);
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
            setHasTemplate(false);
          }
        } else {
          setCustomConfig(null);
          setHasTemplate(false);
        }
      }
    } catch (e) {
      console.error('Error loading custom inventory config:', e);
      setCustomConfig(null);
      setHasTemplate(false);
    }
  };

  const loadLayouts = async () => {
    if (!currentProject) return
    try {
      const params = new URLSearchParams({ projectId: currentProject.id, category: 'layout', sStep: String(sStep) })
      if (currentZone?.id) params.set('zoneId', currentZone.id)
      const res = await fetch(`/api/standards?${params}`)
      const json = await res.json()
      if (json.success) {
        setSavedLayouts(json.data.map((s: any) => ({
          id: s.id,
          title: s.title,
          photoUrl: s.photoUrl,
          createdAt: s.createdAt,
        })))
        setLayoutUploaded(json.data.length > 0)
      }
    } catch (e) {
      console.error('Error loading layouts:', e)
    }
  }

  const handleUploadLayoutImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentProject) return
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', currentProject.id)
      formData.append('filename', `${currentProject.id}_layout_${sStep}_${Date.now()}.png`)
      console.log('[InventarioModal] Uploading layout image:', file.name, 'size:', (file.size / 1024).toFixed(1) + 'KB')
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        console.error('[InventarioModal] Upload HTTP error:', res.status)
        toast.error(`Error al subir imagen (HTTP ${res.status})`)
        e.target.value = ''
        return
      }
      const json = await res.json()
      if (json.success && json.url) {
        const layoutDescriptions: Record<number, string> = {
          2: 'Layout subido como imagen con marcado de suelo según estándar de colores',
          3: 'Layout subido como imagen con puntos de suciedad y zonas de limpieza',
          4: 'Layout subido como imagen con estándares implantados señalados',
        }
        // Save as a layout standard
        const standardPayload = {
          sStep,
          title: `Layout ${currentZone?.name || 'zona'} ${sStepData?.japaneseName || ''} (subido)`,
          description: layoutDescriptions[sStep] || 'Layout subido como imagen',
          category: 'layout',
          photoUrl: json.url,
          status: 'activo',
          version: 1,
          projectId: currentProject.id,
          zoneId: currentZone?.id || null,
        }
        console.log('[InventarioModal] Saving layout standard:', {
          sStep, category: 'layout', hasPhotoUrl: true,
          projectId: currentProject.id, zoneId: currentZone?.id,
        })
        const saveRes = await fetch('/api/standards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(standardPayload),
        })
        if (!saveRes.ok) {
          console.error('[InventarioModal] Standards API HTTP error:', saveRes.status)
          toast.error(`Error al guardar estándar (HTTP ${saveRes.status})`)
          e.target.value = ''
          return
        }
        const saveJson = await saveRes.json()
        if (saveJson.success) {
          toast.success('Layout subido y guardado en Biblioteca de Estándares')
          await loadLayouts()
        } else {
          console.error('[InventarioModal] Standards API error:', saveJson.error)
          toast.error(`Error al guardar estándar: ${saveJson.error || 'Error desconocido'}`)
        }
      } else {
        console.error('[InventarioModal] Upload failed:', json.error)
        toast.error(`Error al subir imagen: ${json.error || 'Error desconocido'}`)
      }
    } catch (e) {
      console.error('[InventarioModal] Upload error:', e)
      toast.error('Error al subir la imagen del layout')
    }
    e.target.value = ''
  }

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
          category: item.category || '',
          quantity: item.quantity || 1,
          // S1: Force quantities (all items are innecesario)
          quantityNeeded: sStep === 1 ? 0 : (item.quantityNeeded || 0),
          quantityUnneeded: sStep === 1 ? (item.quantityUnneeded || item.quantity || 1) : (item.quantityUnneeded || 0),
          price: item.price ?? null,
          action: item.action || '',
          extra: typeof item.extra === 'string' ? JSON.parse(item.extra) : (item.extra || {}),
          jaulaStatus: item.jaulaStatus || '',
          jaulaFechaEntrada: item.jaulaFechaEntrada || null,
          jaulaOrigen: item.jaulaOrigen || null,
          jaulaFechaSalida: item.jaulaFechaSalida || null,
          jaulaDestino: item.jaulaDestino || null,
          zonaOrigen: item.zonaOrigen || null,
          zonaDestino: item.zonaDestino || null,
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
    const qtyUnneeded = newItem.quantityUnneeded || (sStep === 1 ? qty : 0);

    // S1: auto-set decision to extra field
    const extra = { ...(newItem.extra || {}) };
    if (sStep === 1 && !extra.decision) {
      extra.decision = 'Jaula';
    }

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
          category: newItem.category || '',
          quantity: qty,
          quantityNeeded: qtyNeeded,
          quantityUnneeded: qtyUnneeded,
          price: newItem.price || null,
          action: newItem.action || (sStep === 1 ? (extra.decision || 'Jaula') : ''),
          extra,
          // Auto-set jaula status for S1 (all items are innecesario)
          jaulaStatus: sStep === 1 ? 'en_jaula' : '',
          jaulaFechaEntrada: sStep === 1 ? new Date().toISOString() : null,
          jaulaOrigen: sStep === 1 ? currentZone?.name || currentProject.name || '' : null,
          zonaOrigen: currentZone?.name || null,
          zonaDestino: currentZone?.name || null,
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
      let templateItems: any[] = [];

      if (currentZone?.boardConfigId) {
        // Fetch from board config
        const slotsRes = await fetch(`/api/board-slots?boardConfigId=${currentZone.boardConfigId}&sStep=${sStep}&miniStep=3`);
        const slotsJson = await slotsRes.json();
        if (slotsJson.success && slotsJson.data.length > 0) {
          const slot = slotsJson.data[0];
          const inventarioTemplates = (slot.templates || []).filter(
            (t: any) => t.template?.type === 'inventario'
          );
          if (inventarioTemplates.length > 0) {
            const content = JSON.parse(inventarioTemplates[0].template.content);
            templateItems = content.items || [];
          }
        }
      } else {
        // Fallback: global template
        const res = await fetch(`/api/templates?type=inventario&sStep=${sStep}`);
        const json = await res.json();
        if (json.success && json.data.length > 0) {
          const content = JSON.parse(json.data[0].content);
          templateItems = content.items || [];
        }
      }

      if (templateItems.length === 0) {
        toast.error('No se encontró plantilla para este paso');
        return;
      }

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
    } catch (error) {
      console.error('Error importing template:', error);
      toast.error('Error de conexión al importar plantilla');
    }
  };

  // Unified file import: supports both .csv and .xlsx files
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileName = file.name.toLowerCase();
      let dataRows: string[][] = [];
      let headerRow: string[] = [];

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Parse Excel file using xlsx library
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0]; // Use first sheet
        const sheet = workbook.Sheets[sheetName];
        const rawData: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        
        if (rawData.length < 2) {
          toast.error('El archivo está vacío o no tiene datos');
          e.target.value = '';
          return;
        }

        // Find the header row: look for a row that contains 'Nº' or 'Elemento' or 'Nombre'
        let headerIdx = 0;
        for (let i = 0; i < Math.min(10, rawData.length); i++) {
          const rowStr = rawData[i].map(c => String(c).toLowerCase()).join('|');
          if (rowStr.includes('elemento') || rowStr.includes('nombre') || rowStr.includes('nº') || rowStr.includes('punto')) {
            headerIdx = i;
            break;
          }
        }
        headerRow = rawData[headerIdx].map((h: any) => String(h).trim().toLowerCase());
        dataRows = rawData.slice(headerIdx + 1).filter(row => {
          // Count non-empty, non-numeric-only cells
          const meaningfulCells = row.filter(cell => {
            const v = String(cell).trim();
            return v !== '' && v !== '0';
          });
          // A row with data must have at least 2 meaningful cells (name + something)
          // This filters out empty numbered rows and footer rows
          if (meaningfulCells.length < 2) return false;
          // Skip footer rows like "TOTAL ELEMENTOS", "Notas:", etc.
          const firstMeaningful = meaningfulCells[0].toLowerCase();
          if (firstMeaningful.includes('total') || firstMeaningful.includes('notas') || firstMeaningful.includes('clasificación')) return false;
          return true;
        });
      } else if (fileName.endsWith('.csv')) {
        // Parse CSV file
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) {
          toast.error('El archivo CSV está vacío o no tiene datos');
          e.target.value = '';
          return;
        }
        headerRow = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^\uFEFF/, '')); // Remove BOM
        dataRows = lines.slice(1).filter(l => l.trim()).map(l => l.split(',').map(v => v.trim()));
      } else {
        toast.error('Formato no soportado. Usa .xlsx o .csv');
        e.target.value = '';
        return;
      }

      // Flexible column mapping: map various header names to standard fields
      const findCol = (headers: string[], ...names: string[]): number => {
        for (const name of names) {
          const idx = headers.findIndex(h => h.includes(name));
          if (idx >= 0) return idx;
        }
        return -1;
      };

      const colMap = {
        name: findCol(headerRow, 'elemento', 'nombre', 'punto', 'estándar', 'práctica', 'estandar', 'practica'),
        location: findCol(headerRow, 'ubicación', 'ubicacion', 'ámbito', 'ambito', 'proceso'),
        category: findCol(headerRow, 'categoría', 'categoria', 'clasificación', 'clasificacion', 'tipo'),
        quantity: findCol(headerRow, 'cantidad', 'total exist', 'total'),
        quantityNeeded: findCol(headerRow, 'necesarios', 'nec.'),
        quantityUnneeded: findCol(headerRow, 'innecesarios', 'innec.'),
        price: findCol(headerRow, 'precio'),
        action: findCol(headerRow, 'acción', 'accion', 'decisión', 'decision', 'método', 'metodo'),
        estado: findCol(headerRow, 'estado'),
        frecuenciaUso: findCol(headerRow, 'frecuencia'),
        nivel: findCol(headerRow, 'nivel'),
        fuente: findCol(headerRow, 'fuente'),
        cercania: findCol(headerRow, 'cercanía', 'cercania'),
        documentado: findCol(headerRow, 'documentado'),
        cumplimiento: findCol(headerRow, 'cumplimiento'),
        ubicacionAsignada: findCol(headerRow, 'ubicación asignada', 'asignada'),
        metodoIdentificacion: findCol(headerRow, 'método identificación', 'identificación', 'identificacion'),
        frecuenciaLimpieza: findCol(headerRow, 'frecuencia limpieza'),
        metodoLimpieza: findCol(headerRow, 'método limpieza'),
        responsable: findCol(headerRow, 'responsable'),
        observaciones: findCol(headerRow, 'observacione'),
      };

      const parsedItems: InventoryItemData[] = [];
      for (const values of dataRows) {
        const strValues = values.map(v => String(v).trim());
        // Skip rows that are just a number (empty data rows from template)
        if (strValues.length < 2) continue;
        const nonEmptyCount = strValues.filter(v => v !== '' && v !== '0').length;
        if (nonEmptyCount < 1) continue;

        const getVal = (idx: number, fallback?: string) => idx >= 0 && idx < strValues.length ? strValues[idx] : (fallback || '');

        const item: InventoryItemData = {
          name: getVal(colMap.name, strValues[1] || strValues[0] || ''),
          location: getVal(colMap.location, strValues[2] || ''),
          category: getVal(colMap.category) || config.categories[0]?.value || '',
          quantity: parseInt(getVal(colMap.quantity, strValues[4] || '1')) || 1,
          quantityNeeded: parseInt(getVal(colMap.quantityNeeded, '0')) || 0,
          quantityUnneeded: parseInt(getVal(colMap.quantityUnneeded, '0')) || 0,
          price: parseFloat(getVal(colMap.price, '0')) || null,
          action: getVal(colMap.action, '') || getVal(colMap.observaciones, ''),
          extra: {},
        };

        // S1: All items are innecesario by nature, set default decision
        if (sStep === 1) {
          item.quantityUnneeded = item.quantity;
          item.quantityNeeded = 0;
          if (colMap.estado >= 0) item.extra!['estado'] = getVal(colMap.estado);
          if (colMap.frecuenciaUso >= 0) item.extra!['frecuenciaUso'] = getVal(colMap.frecuenciaUso);
          // Map classification/decision columns
          const decisionVal = getVal(colMap.category) || getVal(colMap.action, '');
          if (decisionVal) {
            const lower = decisionVal.toLowerCase();
            if (lower.includes('jaula') || lower.includes('red') || lower.includes('etiqueta')) {
              item.extra!['decision'] = 'Jaula';
            } else if (lower.includes('elimin')) {
              item.extra!['decision'] = 'Eliminar';
            } else {
              item.extra!['decision'] = 'Jaula'; // Default for S1
            }
          }
          if (!item.extra!['decision']) item.extra!['decision'] = 'Jaula';
        } else if (sStep === 2) {
          if (colMap.ubicacionAsignada >= 0) item.extra!['ubicacionAsignada'] = getVal(colMap.ubicacionAsignada);
          if (colMap.metodoIdentificacion >= 0) item.extra!['metodoIdentificacion'] = getVal(colMap.metodoIdentificacion);
          if (colMap.cercania >= 0) item.extra!['cercania'] = getVal(colMap.cercania);
          if (colMap.frecuenciaUso >= 0) item.extra!['frecuenciaUso'] = getVal(colMap.frecuenciaUso);
        } else if (sStep === 3) {
          if (colMap.nivel >= 0) item.extra!['nivel'] = getVal(colMap.nivel);
          if (colMap.fuente >= 0) item.extra!['fuente'] = getVal(colMap.fuente);
          if (colMap.metodoLimpieza >= 0) item.extra!['metodoLimpieza'] = getVal(colMap.metodoLimpieza);
          if (colMap.frecuenciaLimpieza >= 0) item.extra!['frecuenciaLimpieza'] = getVal(colMap.frecuenciaLimpieza);
        } else if (sStep === 4) {
          if (colMap.estado >= 0) item.extra!['estadoEstandar'] = getVal(colMap.estado);
          if (colMap.documentado >= 0) item.extra!['documentado'] = getVal(colMap.documentado);
          if (colMap.cumplimiento >= 0) item.extra!['cumplimiento'] = getVal(colMap.cumplimiento);
        } else if (sStep === 5) {
          if (colMap.frecuenciaUso >= 0) item.extra!['frecuencia'] = getVal(colMap.frecuenciaUso);
          if (colMap.nivel >= 0) item.extra!['practica'] = getVal(colMap.nivel);
        }

        // Also check config.extraFields for any remaining fields
        config.extraFields.forEach((field) => {
          if (item.extra![field.key]) return; // Already mapped above
          const val = getVal(findCol(headerRow, field.label.toLowerCase()), '');
          if (val) {
            item.extra![field.key] = val;
          }
        });

        // Skip items with no name
        if (!item.name) continue;
        parsedItems.push(item);
      }

      if (parsedItems.length > 0) {
        setCsvPreview(parsedItems);
        toast.info(`${parsedItems.length} elementos encontrados. Revisa y confirma la importación.`);
      } else {
        toast.error('No se encontraron elementos válidos en el archivo. Asegúrate de rellenar las filas con datos.');
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Error al procesar el archivo. Verifica el formato.');
    }
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
            quantityNeeded: sStep === 1 ? 0 : (item.quantityNeeded || 0),
            quantityUnneeded: sStep === 1 ? (item.quantityUnneeded || item.quantity || 1) : (item.quantityUnneeded || 0),
            price: item.price || null,
            action: item.action || '',
            extra: item.extra || {},
            jaulaStatus: sStep === 1 ? 'en_jaula' : '',
            jaulaFechaEntrada: sStep === 1 ? new Date().toISOString() : null,
            jaulaOrigen: sStep === 1 ? currentZone?.name || currentProject!.name || '' : null,
            zonaOrigen: currentZone?.name || null,
            zonaDestino: currentZone?.name || null,
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
  // For S2, S3, S4: layout must be uploaded AND classification threshold met
  const needsLayout = sStep === 2 || sStep === 3 || sStep === 4;
  const canComplete = classifyPercent >= INVENTORY_CLASSIFY_THRESHOLD && items.length > 0 && (!needsLayout || layoutUploaded);

  // S1 specific counts: all items are innecesario by definition in S1
  const innecesarios = sStep === 1 ? items : items.filter(i => i.category === 'innecesario');
  const jaulaItems = items.filter(i => i.jaulaStatus === 'en_jaula');
  const totalJaulaValue = jaulaItems.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);

  const handleComplete = async () => {
    if (!canComplete) return;
    // Extra guard: check layout for S2/S3/S4
    if (needsLayout && !layoutUploaded) {
      toast.error('Debes dibujar o subir un layout antes de completar este paso');
      return;
    }

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
    <>
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent size={isFullscreen ? "fullscreen" : "xl"} className="flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" style={{ color: sStepData?.color }} />
            <span>{config.title}</span>
            <Badge variant="outline" style={{ borderColor: sStepData?.color, color: sStepData?.color }}>
              {sStepData?.japaneseName}
            </Badge>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="ml-auto p-1 rounded hover:bg-muted transition-colors"
              title={isFullscreen ? "Reducir ventana" : "Pantalla completa"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4 text-muted-foreground" /> : <Maximize2 className="h-4 w-4 text-muted-foreground" />}
            </button>
          </DialogTitle>
        </DialogHeader>

        {canSkipSteps && !isCompleted && (
          <div className="mx-6 flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex-shrink-0">
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

        {isReadOnly && (
          <div className="flex items-center gap-2 p-2 mx-6 flex-shrink-0 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-xs text-blue-700 font-medium">Solo lectura: {canSkipSteps ? 'Activa el candado para poder realizar pasos.' : 'Puedes ver pero no modificar.'}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
        {hasTemplate === null ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
            <span className="ml-3 text-muted-foreground">Cargando plantilla...</span>
          </div>
        ) : hasTemplate === false ? (
          <div className="text-center py-16">
            <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-500 mb-2">Sin plantilla configurada</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              El administrador no ha configurado ninguna plantilla de inventario para S{sStep} ({sStepData?.japaneseName}) en el Paso 3.
              Contacta con el administrador para que configure la plantilla desde el panel de administración.
            </p>
          </div>
        ) : isCompleted ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">¡Inventario Completado!</h3>
            <p className="text-muted-foreground">
              Se han clasificado {classifiedCount} de {items.length} elementos ({classifyPercent}%).
            </p>
            {sStep === 1 && (
              <div className="mt-4 flex justify-center gap-4">
                <span className="text-sm text-red-600">Innecesarios: {innecesarios.length}</span>
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

            {/* ═══ LAYOUT DE LA ZONA — S2 (Marcado de Suelo), S3 (Limpieza), S4 (Estándares) ═══ */}
            {(sStep === 2 || sStep === 3 || sStep === 4) && (
              <Card className="border-2 border-blue-200 bg-blue-50/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <PenTool className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-800">
                      {sStep === 2 ? 'Layout de la Zona — Marcado de Suelo' 
                        : sStep === 3 ? 'Layout de la Zona — Puntos de Limpieza' 
                        : 'Layout de la Zona — Estándares Implantados'}
                    </h4>
                    <Badge className={layoutUploaded ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                      {layoutUploaded ? 'Layout adjuntado' : 'Pendiente'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {sStep === 2
                      ? 'Dibuja o sube el layout de la zona con el marcado de suelo según el estándar de colores. Esto es obligatorio para completar el paso 3 de S2 (Seiton).'
                      : sStep === 3
                      ? 'Dibuja o sube el layout de la zona indicando los puntos de suciedad y las zonas de limpieza. Esto forma parte del inventario de S3 (Seiso).'
                      : 'Dibuja o sube el layout de la zona con los estándares implantados señalados. Esto forma parte del inventario de S4 (Seiketsu).'}
                  </p>

                  {/* Action buttons */}
                  {!isReadOnly && (
                    <div className="flex items-center gap-2 mb-4">
                      <Button size="sm" onClick={() => setShowLayoutEditor(true)}
                        className="gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">
                        <PenTool className="h-3 w-3" /> Dibujar Layout
                      </Button>
                      {sStep === 2 && (
                        <Button variant="outline" size="sm" onClick={() => setShowColorCodeTable(true)}
                          className="gap-1 text-xs h-8 border-yellow-400 text-yellow-700 hover:bg-yellow-50">
                          <Eye className="h-3 w-3" /> Ver Estándar Colores
                        </Button>
                      )}
                      <div className="relative">
                        <Button variant="outline" size="sm"
                          className="gap-1 text-xs h-8 border-green-400 text-green-700 hover:bg-green-50"
                          onClick={() => document.getElementById('layout-upload-s2')?.click()}>
                          <Upload className="h-3 w-3" /> Subir Imagen/Croquis
                        </Button>
                        <input id="layout-upload-s2" type="file" accept="image/*" className="hidden"
                          onChange={handleUploadLayoutImage} />
                      </div>
                    </div>
                  )}

                  {/* Saved layout previews */}
                  {savedLayouts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {savedLayouts.map(layout => (
                        <div key={layout.id} className="border rounded-lg overflow-hidden bg-white">
                          {layout.photoUrl ? (
                            <img src={layout.photoUrl} alt={layout.title}
                              className="w-full h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(layout.photoUrl!, '_blank')} />
                          ) : (
                            <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                              Sin imagen
                            </div>
                          )}
                          <div className="px-2 py-1.5 flex items-center justify-between">
                            <span className="text-[10px] font-medium truncate">{layout.title}</span>
                            <span className="text-[9px] text-muted-foreground">
                              {new Date(layout.createdAt).toLocaleDateString('es-ES')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-white rounded-lg border border-dashed border-blue-300">
                      <PenTool className="h-8 w-8 text-blue-300 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No hay layout adjuntado</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Dibuja o sube el layout de la zona</p>
                    </div>
                  )}
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
            <div className="flex gap-2 flex-wrap items-center">
              <Button variant="outline" size="sm" onClick={handleImportTemplate}>
                <Upload className="h-4 w-4 mr-1" /> Importar Plantilla
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={items.length === 0}>
                <Download className="h-4 w-4 mr-1" /> Exportar CSV
              </Button>
              {/* Unified file import: accepts .xlsx and .csv */}
              <label className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground cursor-pointer">
                <FileUp className="h-4 w-4 mr-1" /> Importar Archivo
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileImport}
                />
              </label>
              <a
                href={`/templates/${config.templateName}`}
                download
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Descargar Plantilla Excel
              </a>
              {/* S1: Print label buttons for innecesario items */}
              {sStep === 1 && items.length > 0 && (() => {
                const naranjaItems = items
                  .filter(i => !i.extra?.decision || i.extra.decision === 'Jaula')
                  .map(i => ({
                    nombre: i.name,
                    ubicacion: i.location,
                    cantidad: i.quantityUnneeded || i.quantity,
                    estado: String(i.extra?.estado ?? ''),
                    decision: String(i.extra?.decision || 'Jaula'),
                    fechaEntrada: i.jaulaFechaEntrada,
                    zonaOrigen: i.zonaOrigen || i.jaulaOrigen,
                  }));
                const rojaItems = items
                  .filter(i => i.extra?.decision === 'Eliminar')
                  .map(i => ({
                    nombre: i.name,
                    ubicacion: i.location,
                    cantidad: i.quantityUnneeded || i.quantity,
                    estado: String(i.extra?.estado ?? ''),
                    decision: 'Eliminar',
                    fechaEntrada: i.jaulaFechaEntrada,
                    zonaOrigen: i.zonaOrigen || i.jaulaOrigen,
                  }));
                return (
                  <div className="flex items-center gap-2 ml-2 pl-2 border-l">
                    {naranjaItems.length > 0 && (
                      <TagPrinter items={naranjaItems} type="naranja" />
                    )}
                    {rojaItems.length > 0 && (
                      <TagPrinter items={rojaItems} type="roja" />
                    )}
                  </div>
                );
              })()}
            </div>

            {/* TASK 7: CSV Import Preview */}
            {csvPreview && csvPreview.length > 0 && (
              <Card className="border-2 border-blue-200 bg-blue-50/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileUp className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold text-blue-800">Vista Previa de Importación</h4>
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
                  {/* Row 1: Name, Location, (Category for non-S1), Quantity, Price */}
                  <div className="grid grid-cols-1 gap-3 items-end sm:grid-cols-6">
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
                        onValueChange={val => setNewItem(prev => ({ ...prev, category: val, extra: { ...(prev.extra || {}), subcategoria: undefined } }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {config.categories.filter(cat => cat.value && cat.value.trim() !== '').map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium">{sStep === 1 ? 'Cantidad' : 'Total exist.'}</label>
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

                  {/* S1: No Necesarios/Innecesarios fields needed — all items are innecesario by default */}

                  {/* Row 2: Extra fields specific to this S */}
                  {config.extraFields.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      {config.extraFields.map(field => {
                        // Dynamic subcategoria: filter options based on selected category
                        let effectiveOptions = field.type === 'select' ? field.options : undefined;
                        if (field.key === 'subcategoria' && config.desplegables_jerarquicos) {
                          const selectedCat = newItem.category;
                          if (selectedCat) {
                            // Find the matching hierarchical entry by category value or label
                            const catLabel = config.categories.find(c => c.value === selectedCat)?.label;
                            const hierEntry = catLabel && config.desplegables_jerarquicos[catLabel]
                              ? config.desplegables_jerarquicos[catLabel]
                              : config.desplegables_jerarquicos[selectedCat];
                            if (hierEntry) {
                              effectiveOptions = hierEntry.subcategorias;
                            } else {
                              effectiveOptions = []; // No matching category → empty subcategories
                            }
                          } else {
                            // No category selected yet → show all options
                            effectiveOptions = Object.values(config.desplegables_jerarquicos).flatMap(h => h.subcategorias);
                          }
                        }
                        return (
                        <div key={field.key}>
                          <label className="text-xs font-medium">{field.label}</label>
                          {field.type === 'select' && effectiveOptions ? (
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
                                {effectiveOptions.filter(opt => opt && opt.trim() !== '').map(opt => (
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
                        );
                      })}
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
                      <TableHead className="text-center">{sStep === 1 ? 'Cantidad' : 'Total'}</TableHead>
                      <TableHead className="text-right">Precio (€)</TableHead>
                      {sStep === 1 ? (
                        <>
                          <TableHead>Estado</TableHead>
                          <TableHead>Frec. uso</TableHead>
                          <TableHead>Decisión</TableHead>
                        </>
                      ) : (
                        config.extraFields.slice(0, 2).map(f => (
                          <TableHead key={f.key}>{f.label}</TableHead>
                        ))
                      )}
                      <TableHead>Z. Origen</TableHead>
                      <TableHead>Z. Destino</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(item => (
                      <TableRow key={item.id} className={item.jaulaStatus === 'en_jaula' ? 'bg-red-50/50' : ''}>
                        <TableCell className="text-sm font-medium">
                          {!isReadOnly && item.id ? (
                            <Input
                              value={item.name}
                              className="h-6 text-xs border-0 p-1 focus:border focus:border-gray-300 bg-transparent hover:bg-gray-50"
                              onChange={e => {
                                setItems(prev => prev.map(it => it.id === item.id ? { ...it, name: e.target.value } : it));
                              }}
                              onBlur={e => {
                                if (item.id) {
                                  handleUpdateJaula(item.id, { name: e.target.value } as any);
                                }
                              }}
                            />
                          ) : (
                            <span>{item.name}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {!isReadOnly && item.id ? (
                            <Input
                              value={item.location || ''}
                              className="h-6 text-xs border-0 p-1 focus:border focus:border-gray-300 bg-transparent hover:bg-gray-50"
                              onChange={e => {
                                setItems(prev => prev.map(it => it.id === item.id ? { ...it, location: e.target.value } : it));
                              }}
                              onBlur={e => {
                                if (item.id) {
                                  handleUpdateJaula(item.id, { location: e.target.value } as any);
                                }
                              }}
                            />
                          ) : (
                            <span>{item.location}</span>
                          )}
                        </TableCell>
                        <TableCell>{getCategoryBadge(item.category)}</TableCell>
                        <TableCell className="text-center text-sm">{sStep === 1 ? (item.quantityUnneeded || item.quantity) : item.quantity}</TableCell>
                        <TableCell className="text-right text-sm">{item.price != null ? `${item.price.toFixed(2)} €` : '—'}</TableCell>
                        {sStep === 1 ? (
                          <>
                            <TableCell className="text-sm text-muted-foreground">{String(item.extra?.estado ?? '—')}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{String(item.extra?.frecuenciaUso ?? '—')}</TableCell>
                            <TableCell className="text-sm">
                              <Badge className={item.extra?.decision === 'Jaula' ? 'bg-red-100 text-red-800' : item.extra?.decision === 'Eliminar' ? 'bg-red-100 text-red-800' : item.extra?.decision === 'Reubicar' ? 'bg-blue-100 text-blue-800' : item.extra?.decision === 'Vender' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                {String(item.extra?.decision || item.action || 'Jaula')}
                              </Badge>
                            </TableCell>
                          </>
                        ) : (
                          config.extraFields.slice(0, 2).map(f => (
                            <TableCell key={f.key} className="text-sm text-muted-foreground">
                              {getExtraValue(item, f.key)}
                            </TableCell>
                          ))
                        )}
                        <TableCell className="text-xs text-muted-foreground">{item.zonaOrigen || '—'}</TableCell>
                        <TableCell className="text-xs">
                          {!isReadOnly && item.id ? (
                            <Select
                              value={item.zonaDestino || undefined}
                              onValueChange={val => {
                                // Find the zone object to get the zoneId
                                const targetZone = currentProject?.zones?.find(z => z.name === val);
                                const updates: any = { zonaDestino: val };
                                // Also move the item to the new zone (update zoneId)
                                if (targetZone) {
                                  updates.zoneId = targetZone.id;
                                }
                                handleUpdateJaula(item.id!, updates);
                              }}
                            >
                              <SelectTrigger className="h-6 w-24 text-[10px]">
                                <SelectValue placeholder="—"/>
                              </SelectTrigger>
                              <SelectContent>
                                {currentProject?.zones?.map(z => (
                                  <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>
                                )) || []}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-muted-foreground">{item.zonaDestino || '—'}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-destructive"
                            onClick={() => item.id && handleDeleteItem(item.id)}
                            disabled={isReadOnly}
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
                disabled={!canComplete || items.length === 0 || isReadOnly}
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

      {/* Layout Editor — rendered OUTSIDE the InventarioModal Dialog to avoid nested Dialog issues */}
      <LayoutEditor
        open={showLayoutEditor}
        onClose={() => setShowLayoutEditor(false)}
        onSave={() => { setShowLayoutEditor(false); loadLayouts() }}
        sStep={sStep}
      />

      {/* Color Code Table for S2 */}
      {sStep === 2 && (
        <ColorCodeTable
          open={showColorCodeTable}
          onClose={() => setShowColorCodeTable(false)}
        />
      )}
    </>
  );
}
