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
import { ClipboardList, Plus, CheckCircle, Download, Upload, FileSpreadsheet, BookOpen, ArrowRight, AlertTriangle, FileUp, Maximize2, Minimize2, File, PenTool, Image as ImageIcon, Eye, Loader2, MapPin, Tag } from 'lucide-react';
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

  // S1: default category is 'innecesario' since this template is for unnecessary items
  const defaultCategory = sStep === 1 ? 'innecesario' : undefined;

  const [newItem, setNewItem] = useState<Partial<InventoryItemData> & { extra?: Record<string, string | number> }>({
    name: '',
    location: '',
    category: defaultCategory as string | undefined,
    quantity: 1,
    quantityNeeded: 0,
    quantityUnneeded: 0,
    price: null,
    action: '',
    zonaOrigen: currentZone?.name || null,
    jaulaFechaEntrada: new Date().toISOString(),
    extra: {},
  });

  // Update zonaOrigen and default category when zone/step changes
  useEffect(() => {
    setNewItem(prev => ({
      ...prev,
      zonaOrigen: currentZone?.name || prev.zonaOrigen,
      category: sStep === 1 ? 'innecesario' : prev.category,
    }));
  }, [currentZone?.name, sStep]);

  useEffect(() => {
    if (open) {
      loadInventory();
      // Load layouts for any S step that has layout support (S2 primarily, also S3/S4 for estandares)
      if (sStep === 2 || sStep === 3 || sStep === 4) loadLayouts();
      // Load custom inventory template if available
      loadCustomInventoryConfig();
      // Reset zonaOrigen to current zone when opening
      setNewItem(prev => ({ ...prev, zonaOrigen: currentZone?.name || null }));
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
          // S1: Set quantities based on category (innecesario or necesario)
          quantityNeeded: sStep === 1
            ? (item.category === 'necesario' ? (item.quantityNeeded || item.quantity || 1) : 0)
            : (item.quantityNeeded || 0),
          quantityUnneeded: sStep === 1
            ? (item.category === 'innecesario' ? (item.quantityUnneeded || item.quantity || 1) : 0)
            : (item.quantityUnneeded || 0),
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

    // Auto-calculate quantityUnneeded/Needed based on category for S1
    const qty = newItem.quantity || 1;
    const isInnecesario = sStep === 1 && newItem.category === 'innecesario';
    const isNecesario = sStep === 1 && newItem.category === 'necesario';
    const qtyNeeded = isNecesario ? qty : (newItem.quantityNeeded || 0);
    const qtyUnneeded = isInnecesario ? qty : (newItem.quantityUnneeded || 0);

    // S1: auto-set decision to extra field (only for innecesario)
    const extra = { ...(newItem.extra || {}) };
    if (sStep === 1 && isInnecesario && !extra.decision) {
      extra.decision = 'Jaula';
    }
    // S1: Keep all fields — user can fill in both necesario and innecesario fields
    // No field deletion since all fields are now visible and editable

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
          action: newItem.action || (isInnecesario ? (extra.decision || 'Jaula') : ''),
          extra,
          // Auto-set jaula status only for S1 innecesario items; necesario items go to Activos
          jaulaStatus: isInnecesario ? 'en_jaula' : '',
          jaulaFechaEntrada: isInnecesario ? (newItem.jaulaFechaEntrada || new Date().toISOString()) : null,
          jaulaOrigen: isInnecesario ? newItem.zonaOrigen || currentZone?.name || currentProject.name || '' : null,
          zonaOrigen: newItem.zonaOrigen || currentZone?.name || null,
          zonaDestino: newItem.zonaOrigen || currentZone?.name || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Elemento agregado correctamente');
        await loadInventory();
        setNewItem({ name: '', location: '', category: defaultCategory as string | undefined, quantity: 1, quantityNeeded: 0, quantityUnneeded: 0, price: null, action: '', zonaOrigen: currentZone?.name || null, jaulaFechaEntrada: new Date().toISOString(), extra: {} });
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
        zona: findCol(headerRow, 'zona', 'zona origen'),
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
          zonaOrigen: colMap.zona >= 0 ? getVal(colMap.zona) || null : null,
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
            quantityNeeded: sStep === 1 ? (item.category === 'necesario' ? (item.quantityNeeded || item.quantity || 1) : 0) : (item.quantityNeeded || 0),
            quantityUnneeded: sStep === 1 ? (item.category === 'innecesario' ? (item.quantityUnneeded || item.quantity || 1) : 0) : (item.quantityUnneeded || 0),
            price: item.price || null,
            action: item.action || '',
            extra: item.extra || {},
            jaulaStatus: sStep === 1 && item.category === 'innecesario' ? 'en_jaula' : '',
            jaulaFechaEntrada: sStep === 1 && item.category === 'innecesario' ? new Date().toISOString() : null,
            jaulaOrigen: sStep === 1 && item.category === 'innecesario' ? item.zonaOrigen || currentZone?.name || currentProject!.name || '' : null,
            zonaOrigen: item.zonaOrigen || currentZone?.name || null,
            zonaDestino: item.zonaOrigen || currentZone?.name || null,
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

  // Helper: update an extra field on an item and persist
  const handleUpdateExtra = async (itemId: string, key: string, value: string | number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const newExtra = { ...(item.extra || {}) };
    if (value === '_clear_') {
      delete newExtra[key];
    } else {
      newExtra[key] = value;
    }
    // Optimistic local update
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, extra: newExtra } : it));
    try {
      await fetch(`/api/inventory?id=${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extra: newExtra }),
      });
    } catch (e) {
      console.error('Error updating extra field:', e);
    }
  };

  // Helper: update a simple field on an item and persist
  const handleUpdateField = async (itemId: string, field: string, value: any) => {
    const cleanValue = value === '_clear_' ? null : value;
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, [field]: cleanValue } : it));
    try {
      await fetch(`/api/inventory?id=${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: cleanValue }),
      });
    } catch (e) {
      console.error('Error updating field:', e);
    }
  };

  // Count classified items
  const classifiedCount = items.filter(i => i.category && i.category !== '').length;
  const classifyPercent = items.length > 0 ? Math.round((classifiedCount / items.length) * 100) : 0;
  // For S2, S3, S4: layout must be uploaded AND classification threshold met
  const needsLayout = sStep === 2 || sStep === 3 || sStep === 4;
  // S1: No minimum percentage required — just need at least 1 item. If step 4 goes bad, it means not everything was eliminated.
  // S2-S5: Must meet classification threshold (80%)
  const canComplete = sStep === 1
    ? items.length > 0 && classifiedCount > 0
    : classifyPercent >= INVENTORY_CLASSIFY_THRESHOLD && items.length > 0 && (!needsLayout || layoutUploaded);

  // S1 specific counts: split by category
  const innecesarios = sStep === 1 ? items.filter(i => i.category === 'innecesario') : items.filter(i => i.category === 'innecesario');
  const necesarios = sStep === 1 ? items.filter(i => i.category === 'necesario') : [];
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
                {classifyPercent}%{sStep !== 1 ? ` (mín. ${INVENTORY_CLASSIFY_THRESHOLD}%)` : ''}
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
              {/* S1: Print label buttons for innecesario items — linked to the S1 Step 3 template */}
              {sStep === 1 && items.length > 0 && (() => {
                // Helper: compute revision date = entry date + diasCuarentena (default 40)
                const withRevision = (i: InventoryItemData) => {
                  let fechaRevision: string | null = null;
                  const dias = Number(i.extra?.diasCuarentena ?? 40);
                  if (i.jaulaFechaEntrada) {
                    try {
                      const d = new Date(i.jaulaFechaEntrada);
                      d.setDate(d.getDate() + dias);
                      fechaRevision = d.toISOString();
                    } catch {}
                  }
                  return fechaRevision;
                };
                const naranjaItems = items
                  .filter(i => i.category === 'innecesario' && (!i.extra?.decision || i.extra.decision === 'Jaula'))
                  .map(i => ({
                    nombre: i.name,
                    ubicacion: i.location,
                    cantidad: i.quantityUnneeded || i.quantity,
                    estado: String(i.extra?.estado ?? ''),
                    frecuenciaUso: String(i.extra?.frecuenciaUso ?? ''),
                    decision: 'Revisar Jaula',
                    categoria: String(i.category ?? 'Innecesario'),
                    fechaEntrada: i.jaulaFechaEntrada,
                    fechaRevision: withRevision(i),
                    diasCuarentena: Number(i.extra?.diasCuarentena ?? 40),
                    zonaOrigen: i.zonaOrigen || i.jaulaOrigen,
                  }));
                const rojaItems = items
                  .filter(i => i.category === 'innecesario' && i.extra?.decision === 'Eliminar')
                  .map(i => ({
                    nombre: i.name,
                    ubicacion: i.location,
                    cantidad: i.quantityUnneeded || i.quantity,
                    estado: String(i.extra?.estado ?? ''),
                    frecuenciaUso: String(i.extra?.frecuenciaUso ?? ''),
                    decision: 'Eliminar',
                    categoria: String(i.category ?? 'Innecesario'),
                    fechaEntrada: i.jaulaFechaEntrada,
                    fechaRevision: withRevision(i),
                    diasCuarentena: Number(i.extra?.diasCuarentena ?? 40),
                    zonaOrigen: i.zonaOrigen || i.jaulaOrigen,
                  }));
                return (
                  <div className="flex items-center gap-2 ml-2 pl-2 border-l border-orange-300">
                    <span className="text-[10px] text-muted-foreground font-medium">Etiquetas Plantilla:</span>
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
                  {/* Row 1: Name, Zona (read-only), Category (auto innecesario for S1), Quantity, Price */}
                  <div className="grid grid-cols-1 gap-3 items-end sm:grid-cols-5">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium">Elemento *</label>
                      <Input
                        placeholder="Nombre del elemento"
                        value={newItem.name}
                        onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    {sStep === 1 ? (
                      /* S1: Zona is pre-filled from current zone, read-only */
                      <div>
                        <label className="text-xs font-medium flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Zona
                        </label>
                        <Input
                          value={currentZone?.name || newItem.zonaOrigen || 'Sin zona'}
                          readOnly
                          className="bg-gray-50 text-gray-600"
                        />
                      </div>
                    ) : (
                      /* Non-S1: Zona selectable */
                      <div>
                        <label className="text-xs font-medium flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Zona
                        </label>
                        {currentProject?.zones && currentProject.zones.length > 0 ? (
                          <Select
                            value={newItem.zonaOrigen || currentZone?.name || undefined}
                            onValueChange={val => setNewItem(prev => ({ ...prev, zonaOrigen: val }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar zona" />
                            </SelectTrigger>
                            <SelectContent>
                              {currentProject.zones.map(z => (
                                <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder="Zona"
                            value={newItem.zonaOrigen || currentZone?.name || ''}
                            onChange={e => setNewItem(prev => ({ ...prev, zonaOrigen: e.target.value }))}
                          />
                        )}
                      </div>
                    )}
                    {sStep === 1 ? (
                      /* S1: Category is innecesario by default, shown as read-only badge */
                      <div>
                        <label className="text-xs font-medium">Categoría</label>
                        <div className="h-9 flex items-center px-3 rounded-md border bg-red-50 text-red-700 text-sm font-medium">
                          Innecesario
                        </div>
                      </div>
                    ) : (
                      /* Non-S1: Category selectable */
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
                    )}
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

                  {/* S1: All fields visible and editable — Innecesario + Necesario + Etiquetas */}
                  {sStep === 1 ? (
                    <>
                      {/* S1: Section labels */}
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded bg-red-500" />
                          <span className="text-[10px] font-medium text-red-700">Campos de Innecesario</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded bg-green-500" />
                          <span className="text-[10px] font-medium text-green-700">Campos de Necesario</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded bg-orange-500" />
                          <span className="text-[10px] font-medium text-orange-700">Datos de Etiqueta</span>
                        </div>
                      </div>

                      {/* S1: Innecesario fields — always visible and editable */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end p-2 rounded-lg border border-red-200 bg-red-50/30">
                        {['estado', 'frecuenciaUso', 'decision'].map(key => {
                          const field = config.extraFields.find(f => f.key === key);
                          if (!field) return null;
                          return (
                            <div key={field.key}>
                              <label className="text-xs font-medium text-red-700">{field.label}</label>
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
                                    {field.options.filter(opt => opt && opt.trim() !== '').map(opt => (
                                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
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
                        <div className="col-span-full flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-400" />
                          <span className="text-[9px] text-red-600 font-medium">Innecesarios → van a la Jaula (etiqueta roja/naranja)</span>
                        </div>
                      </div>

                      {/* S1: Necesario fields — always visible and editable */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end p-2 rounded-lg border border-green-200 bg-green-50/30">
                        {['ubicacionAsignada', 'metodoIdentificacion', 'cercania'].map(key => {
                          const field = config.extraFields.find(f => f.key === key);
                          if (!field) return null;
                          return (
                            <div key={field.key}>
                              <label className="text-xs font-medium text-green-700">{field.label}</label>
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
                                    {field.options.filter(opt => opt && opt.trim() !== '').map(opt => (
                                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
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
                        <div className="col-span-full flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-[9px] text-green-600 font-medium">Necesarios → van a Activos (se organizan en S2)</span>
                        </div>
                      </div>

                      {/* S1: Etiqueta fields — fecha entrada, días cuarentena, fecha revisión */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end p-2 rounded-lg border border-orange-200 bg-orange-50/30">
                        <div>
                          <label className="text-xs font-medium text-orange-700 flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            F. Entrada
                          </label>
                          <Input
                            type="date"
                            value={newItem.jaulaFechaEntrada ? new Date(newItem.jaulaFechaEntrada).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                            onChange={e => {
                              const val = e.target.value ? new Date(e.target.value + 'T12:00:00').toISOString() : null;
                              setNewItem(prev => ({ ...prev, jaulaFechaEntrada: val }));
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-orange-700 flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            Días cuarentena
                          </label>
                          <Select
                            value={String(newItem.extra?.diasCuarentena ?? 40)}
                            onValueChange={val =>
                              setNewItem(prev => ({
                                ...prev,
                                extra: { ...(prev.extra || {}), diasCuarentena: parseInt(val) || 40 },
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[7, 15, 20, 30, 40, 60, 90].map(d => (
                                <SelectItem key={d} value={String(d)}>{d} días</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-orange-700 flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            F. Revisión
                          </label>
                          <Input
                            type="date"
                            value={(() => {
                              const base = newItem.jaulaFechaEntrada || new Date().toISOString();
                              const dias = Number(newItem.extra?.diasCuarentena ?? 40);
                              try {
                                const d = new Date(base);
                                d.setDate(d.getDate() + dias);
                                return d.toISOString().split('T')[0];
                              } catch { return ''; }
                            })()}
                            readOnly
                            className="bg-orange-50"
                          />
                        </div>
                        <div className="flex items-end">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            <span className="text-[9px] text-orange-600 font-medium">Datos para etiqueta roja/naranja</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                  /* Non-S1: Original extra fields */
                  config.extraFields.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      {config.extraFields.map(field => {
                        // Dynamic subcategoria: filter options based on selected category
                        let effectiveOptions = field.type === 'select' ? field.options : undefined;
                        if (field.key === 'subcategoria' && config.desplegables_jerarquicos) {
                          const selectedCat = newItem.category;
                          if (selectedCat) {
                            const catLabel = config.categories.find(c => c.value === selectedCat)?.label;
                            const hierEntry = catLabel && config.desplegables_jerarquicos[catLabel]
                              ? config.desplegables_jerarquicos[catLabel]
                              : config.desplegables_jerarquicos[selectedCat];
                            if (hierEntry) {
                              effectiveOptions = hierEntry.subcategorias;
                            } else {
                              effectiveOptions = [];
                            }
                          } else {
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
                  )
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
                          <TableHead className="text-red-700">Estado</TableHead>
                          <TableHead className="text-red-700">Frec. uso</TableHead>
                          <TableHead className="text-red-700">Decisión</TableHead>
                          <TableHead className="text-green-700">Ubicación asig.</TableHead>
                          <TableHead className="text-green-700">Método id.</TableHead>
                          <TableHead className="text-green-700">Cercanía</TableHead>
                          <TableHead className="text-orange-700">Días cuar.</TableHead>
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
                    {items.map(item => {
                      const isInnecesario = item.category === 'innecesario';
                      const isNecesario = item.category === 'necesario';
                      const canEdit = !isReadOnly && item.id;
                      // Inline editable input style
                      const inlineInput = "h-6 text-xs border-0 p-1 focus:border focus:border-gray-300 bg-transparent hover:bg-gray-50";
                      const inlineSelect = "h-6 text-[10px] border-0 p-0 bg-transparent hover:bg-gray-50";
                      return (
                      <TableRow key={item.id} className={isInnecesario ? 'bg-red-50/50' : isNecesario ? 'bg-green-50/30' : ''}>
                        {/* Elemento */}
                        <TableCell className="text-sm font-medium">
                          {canEdit ? (
                            <Input
                              value={item.name}
                              className={inlineInput}
                              onChange={e => setItems(prev => prev.map(it => it.id === item.id ? { ...it, name: e.target.value } : it))}
                              onBlur={e => handleUpdateField(item.id!, 'name', e.target.value)}
                            />
                          ) : (
                            <span>{item.name}</span>
                          )}
                        </TableCell>
                        {/* Ubicación */}
                        <TableCell className="text-sm">
                          {canEdit ? (
                            <Input
                              value={item.location || ''}
                              className={inlineInput}
                              onChange={e => setItems(prev => prev.map(it => it.id === item.id ? { ...it, location: e.target.value } : it))}
                              onBlur={e => handleUpdateField(item.id!, 'location', e.target.value)}
                            />
                          ) : (
                            <span>{item.location || '—'}</span>
                          )}
                        </TableCell>
                        {/* Categoría */}
                        <TableCell>
                          {canEdit && sStep === 1 ? (
                            <Select
                              value={item.category || undefined}
                              onValueChange={val => {
                                const isInn = val === 'innecesario';
                                const isNec = val === 'necesario';
                                const qty = item.quantity || 1;
                                const updates: any = {
                                  category: val,
                                  quantityNeeded: isNec ? qty : 0,
                                  quantityUnneeded: isInn ? qty : 0,
                                  jaulaStatus: isInn ? 'en_jaula' : '',
                                  jaulaFechaEntrada: isInn ? (item.jaulaFechaEntrada || new Date().toISOString()) : null,
                                };
                                setItems(prev => prev.map(it => it.id === item.id ? { ...it, ...updates } : it));
                                fetch(`/api/inventory?id=${item.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(updates),
                                });
                              }}
                            >
                              <SelectTrigger className={inlineSelect}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {config.categories.filter(c => c.value && c.value.trim() !== '').map(c => (
                                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            getCategoryBadge(item.category)
                          )}
                        </TableCell>
                        {/* Cantidad */}
                        <TableCell className="text-center text-sm">
                          {canEdit ? (
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity || 1}
                              className={`${inlineInput} w-14 text-center`}
                              onChange={e => {
                                const val = parseInt(e.target.value) || 1;
                                setItems(prev => prev.map(it => it.id === item.id ? { ...it, quantity: val } : it));
                              }}
                              onBlur={e => handleUpdateField(item.id!, 'quantity', parseInt(e.target.value) || 1)}
                            />
                          ) : (
                            <span>{sStep === 1 ? (isInnecesario ? (item.quantityUnneeded || item.quantity) : isNecesario ? (item.quantityNeeded || item.quantity) : item.quantity) : item.quantity}</span>
                          )}
                        </TableCell>
                        {/* Precio */}
                        <TableCell className="text-right text-sm">
                          {canEdit ? (
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price ?? ''}
                              className={`${inlineInput} w-20 text-right`}
                              onChange={e => {
                                const val = e.target.value ? parseFloat(e.target.value) : null;
                                setItems(prev => prev.map(it => it.id === item.id ? { ...it, price: val } : it));
                              }}
                              onBlur={e => handleUpdateField(item.id!, 'price', e.target.value ? parseFloat(e.target.value) : null)}
                            />
                          ) : (
                            <span>{item.price != null ? `${item.price.toFixed(2)} €` : '—'}</span>
                          )}
                        </TableCell>
                        {sStep === 1 ? (
                          <>
                            {/* Estado (innecesario) */}
                            <TableCell className="text-sm">
                              {canEdit ? (
                                <Select
                                  value={item.extra?.estado ? String(item.extra.estado) : undefined}
                                  onValueChange={val => handleUpdateExtra(item.id!, 'estado', val)}
                                >
                                  <SelectTrigger className={inlineSelect}>
                                    <SelectValue placeholder="—" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_clear_">—</SelectItem>
                                    {['Bueno', 'Regular', 'Malo'].map(opt => (
                                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span>{String(item.extra?.estado ?? '—')}</span>
                              )}
                            </TableCell>
                            {/* Frecuencia uso (innecesario) */}
                            <TableCell className="text-sm">
                              {canEdit ? (
                                <Select
                                  value={item.extra?.frecuenciaUso ? String(item.extra.frecuenciaUso) : undefined}
                                  onValueChange={val => handleUpdateExtra(item.id!, 'frecuenciaUso', val)}
                                >
                                  <SelectTrigger className={inlineSelect}>
                                    <SelectValue placeholder="—" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_clear_">—</SelectItem>
                                    {['Diario', 'Semanal', 'Quincenal', 'Mensual', 'Trimestral', 'Anual', 'Nunca'].map(opt => (
                                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span>{String(item.extra?.frecuenciaUso ?? '—')}</span>
                              )}
                            </TableCell>
                            {/* Decisión (innecesario) */}
                            <TableCell className="text-sm">
                              {canEdit ? (
                                <Select
                                  value={item.extra?.decision ? String(item.extra.decision) : undefined}
                                  onValueChange={val => {
                                    handleUpdateExtra(item.id!, 'decision', val);
                                    // Also update jaula status based on decision
                                    const isInn = item.category === 'innecesario';
                                    if (isInn) {
                                      handleUpdateField(item.id!, 'action', val);
                                    }
                                  }}
                                >
                                  <SelectTrigger className={inlineSelect}>
                                    <SelectValue placeholder="—" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_clear_">—</SelectItem>
                                    <SelectItem value="Jaula">Jaula</SelectItem>
                                    <SelectItem value="Eliminar">Eliminar</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                item.extra?.decision ? (
                                  <Badge className={item.extra.decision === 'Jaula' ? 'bg-orange-100 text-orange-800' : item.extra.decision === 'Eliminar' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}>
                                    {String(item.extra.decision)}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )
                              )}
                            </TableCell>
                            {/* Ubicación asignada (necesario) */}
                            <TableCell className="text-sm">
                              {canEdit ? (
                                <Input
                                  value={String(item.extra?.ubicacionAsignada ?? '')}
                                  className={inlineInput}
                                  placeholder="—"
                                  onChange={e => {
                                    const val = e.target.value;
                                    setItems(prev => prev.map(it => it.id === item.id ? { ...it, extra: { ...(it.extra || {}), ubicacionAsignada: val } } : it));
                                  }}
                                  onBlur={e => handleUpdateExtra(item.id!, 'ubicacionAsignada', e.target.value)}
                                />
                              ) : (
                                <span>{String(item.extra?.ubicacionAsignada ?? '—')}</span>
                              )}
                            </TableCell>
                            {/* Método identificación (necesario) */}
                            <TableCell className="text-sm">
                              {canEdit ? (
                                <Select
                                  value={item.extra?.metodoIdentificacion ? String(item.extra.metodoIdentificacion) : undefined}
                                  onValueChange={val => handleUpdateExtra(item.id!, 'metodoIdentificacion', val)}
                                >
                                  <SelectTrigger className={inlineSelect}>
                                    <SelectValue placeholder="—" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_clear_">—</SelectItem>
                                    {['Etiqueta', 'Código color', 'Señal visual', 'Sombra/Contorno', 'Código numérico', 'Otro'].map(opt => (
                                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span>{String(item.extra?.metodoIdentificacion ?? '—')}</span>
                              )}
                            </TableCell>
                            {/* Cercanía (necesario) */}
                            <TableCell className="text-sm">
                              {canEdit ? (
                                <Select
                                  value={item.extra?.cercania ? String(item.extra.cercania) : undefined}
                                  onValueChange={val => handleUpdateExtra(item.id!, 'cercania', val)}
                                >
                                  <SelectTrigger className={inlineSelect}>
                                    <SelectValue placeholder="—" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_clear_">—</SelectItem>
                                    {['Muy cerca (brazo)', 'Cerca (1-3 pasos)', 'Media distancia', 'Poco accesible'].map(opt => (
                                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span>{String(item.extra?.cercania ?? '—')}</span>
                              )}
                            </TableCell>
                            {/* Días cuarentena (etiqueta) */}
                            <TableCell className="text-sm">
                              {canEdit ? (
                                <Select
                                  value={String(item.extra?.diasCuarentena ?? 40)}
                                  onValueChange={val => handleUpdateExtra(item.id!, 'diasCuarentena', parseInt(val) || 40)}
                                >
                                  <SelectTrigger className={inlineSelect}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[7, 15, 20, 30, 40, 60, 90].map(d => (
                                      <SelectItem key={d} value={String(d)}>{d}d</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span>{item.extra?.diasCuarentena ?? 40}d</span>
                              )}
                            </TableCell>
                          </>
                        ) : (
                          config.extraFields.slice(0, 2).map(f => (
                            <TableCell key={f.key} className="text-sm text-muted-foreground">
                              {getExtraValue(item, f.key)}
                            </TableCell>
                          ))
                        )}
                        {/* Z. Origen */}
                        <TableCell className="text-xs">
                          {canEdit ? (
                            currentProject?.zones && currentProject.zones.length > 0 ? (
                              <Select
                                value={item.zonaOrigen || undefined}
                                onValueChange={val => handleUpdateField(item.id!, 'zonaOrigen', val)}
                              >
                                <SelectTrigger className={inlineSelect}>
                                  <SelectValue placeholder="—" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_clear_">—</SelectItem>
                                  {currentProject.zones.map(z => (
                                    <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={item.zonaOrigen || ''}
                                className={inlineInput}
                                placeholder="—"
                                onBlur={e => handleUpdateField(item.id!, 'zonaOrigen', e.target.value)}
                              />
                            )
                          ) : (
                            <span className="text-muted-foreground">{item.zonaOrigen || '—'}</span>
                          )}
                        </TableCell>
                        {/* Z. Destino */}
                        <TableCell className="text-xs">
                          {canEdit ? (
                            <Select
                              value={item.zonaDestino || undefined}
                              onValueChange={val => {
                                const targetZone = currentProject?.zones?.find(z => z.name === val);
                                const updates: any = { zonaDestino: val };
                                if (targetZone) updates.zoneId = targetZone.id;
                                handleUpdateJaula(item.id!, updates);
                              }}
                            >
                              <SelectTrigger className={inlineSelect}>
                                <SelectValue placeholder="—"/>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_clear_">—</SelectItem>
                                {currentProject?.zones?.map(z => (
                                  <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>
                                )) || []}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-muted-foreground">{item.zonaDestino || '—'}</span>
                          )}
                        </TableCell>
                        {/* Delete */}
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
                    );
                    })}
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
                Completar Inventario{sStep === 1 ? '' : ` (${classifyPercent}% clasificado)`}
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
