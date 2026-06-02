'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { use5SStore } from '@/lib/store';
import { S_STEPS } from '@/lib/5s-constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  BookOpen, Plus, Trash2, Edit3, Save, Loader2, Layout, Paintbrush,
  Camera, ArrowRight, Shield, Award, Truck, Cog, User, Phone,
  Eye, ChevronDown, ChevronRight, FileText, Image as ImageIcon,
  Search, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import LayoutEditor from '@/components/5s/LayoutEditor';
import ColorCodeTable from '@/components/5s/ColorCodeTable';

// ═══════════════════════════════════════════════════════
// TYPES & CONFIG
// ═══════════════════════════════════════════════════════

interface StandardItem {
  id: string; sStep: number; title: string; description: string | null; category: string;
  content: string | null; photoUrl: string | null; beforePhotoUrl: string | null; afterPhotoUrl: string | null;
  responsable: string | null; contacto: string | null; mejoraTipo: string | null;
  status: string; version: number; projectId: string; zoneId: string | null; createdAt: string; updatedAt: string;
}

const CATEGORIES = [
  { value: 'formato_mejora', label: 'Formato Estándar de Mejora', icon: Award, color: 'bg-teal-100 text-teal-800' },
  { value: 'layout', label: 'Layout', icon: Layout, color: 'bg-blue-100 text-blue-800' },
  { value: 'marcado_suelo', label: 'Código de Colores / Marcado de Suelo', icon: Paintbrush, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'visual', label: 'Señalización Visual', icon: FileText, color: 'bg-purple-100 text-purple-800' },
  { value: 'procedimiento', label: 'Procedimiento', icon: FileText, color: 'bg-green-100 text-green-800' },
  { value: 'checklist', label: 'Checklist', icon: FileText, color: 'bg-cyan-100 text-cyan-800' },
  { value: 'senalizacion', label: 'Señalización', icon: FileText, color: 'bg-amber-100 text-amber-800' },
  { value: 'diagrama', label: 'Diagrama flujo', icon: FileText, color: 'bg-indigo-100 text-indigo-800' },
  { value: 'registro', label: 'Registro', icon: FileText, color: 'bg-rose-100 text-rose-800' },
  { value: 'otro', label: 'Otro', icon: FileText, color: 'bg-orange-100 text-orange-800' },
  { value: 'general', label: 'General', icon: FileText, color: 'bg-gray-100 text-gray-800' },
];

const MEJORA_TIPOS = [
  { value: 'seguridad', label: 'Seguridad', icon: Shield, color: 'bg-red-100 text-red-800' },
  { value: 'calidad', label: 'Calidad', icon: Award, color: 'bg-blue-100 text-blue-800' },
  { value: 'proceso', label: 'Proceso', icon: Cog, color: 'bg-green-100 text-green-800' },
  { value: 'logistica', label: 'Logística', icon: Truck, color: 'bg-amber-100 text-amber-800' },
];

const STATUS_OPTIONS = [
  { value: 'activo', label: 'Activo', color: 'bg-green-100 text-green-800' },
  { value: 'en_revision', label: 'En Revisión', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'obsoleto', label: 'Obsoleto', color: 'bg-red-100 text-red-800' },
];

export default function StandardsAdmin() {
  const { currentProject, currentZone } = use5SStore();
  const [standards, setStandards] = useState<StandardItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterS, setFilterS] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Editing
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [viewingStandard, setViewingStandard] = useState<StandardItem | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [formSStep, setFormSStep] = useState(1);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('formato_mejora');
  const [formContent, setFormContent] = useState('');
  const [formStatus, setFormStatus] = useState('activo');
  const [formResponsable, setFormResponsable] = useState('');
  const [formContacto, setFormContacto] = useState('');
  const [formMejoraTipo, setFormMejoraTipo] = useState('');
  const [formBeforePhotoUrl, setFormBeforePhotoUrl] = useState<string | null>(null);
  const [formAfterPhotoUrl, setFormAfterPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<'before' | 'after' | null>(null);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const loadStandards = useCallback(async () => {
    if (!currentProject) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ projectId: currentProject.id });
      if (filterS) params.set('sStep', String(filterS));
      if (filterCategory !== 'all') params.set('category', filterCategory);
      if (currentZone?.id) params.set('zoneId', currentZone.id);
      const res = await fetch(`/api/standards?${params}`);
      const json = await res.json();
      if (json.success) setStandards(json.data || []);
    } catch (e) { console.error('Error loading standards:', e); }
    finally { setIsLoading(false); }
  }, [currentProject, filterS, filterCategory, currentZone]);

  useEffect(() => { loadStandards(); }, [loadStandards]);

  const handleSave = async () => {
    if (!currentProject?.id || !formTitle.trim()) return;
    setIsSaving(true);
    try {
      const body: any = {
        sStep: formSStep, title: formTitle, description: formDescription || null,
        category: formCategory, content: formContent || null, status: formStatus,
        responsable: formResponsable || null, contacto: formContacto || null,
        mejoraTipo: formMejoraTipo || null, projectId: currentProject.id,
        zoneId: currentZone?.id || null, beforePhotoUrl: formBeforePhotoUrl, afterPhotoUrl: formAfterPhotoUrl,
      };
      if (editingId) {
        body.id = editingId;
        await fetch('/api/standards', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        toast.success('Estándar actualizado');
      } else {
        await fetch('/api/standards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        toast.success('Estándar creado');
      }
      await loadStandards();
      resetForm();
    } catch (e) { console.error('Error saving standard:', e); toast.error('Error al guardar'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este estándar?')) return;
    try {
      await fetch(`/api/standards?id=${id}`, { method: 'DELETE' });
      toast.success('Estándar eliminado');
      await loadStandards();
    } catch (e) { toast.error('Error al eliminar'); }
  };

  const handlePhotoUpload = async (file: File, type: 'before' | 'after') => {
    setIsUploading(type);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'standard');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.success) {
        if (type === 'before') setFormBeforePhotoUrl(json.url);
        else setFormAfterPhotoUrl(json.url);
      }
    } catch (e) { console.error('Upload error:', e); }
    finally { setIsUploading(null); }
  };

  const startEdit = (std: StandardItem) => {
    setEditingId(std.id);
    setFormSStep(std.sStep);
    setFormTitle(std.title);
    setFormDescription(std.description || '');
    setFormCategory(std.category);
    setFormContent(std.content || '');
    setFormStatus(std.status);
    setFormResponsable(std.responsable || '');
    setFormContacto(std.contacto || '');
    setFormMejoraTipo(std.mejoraTipo || '');
    setFormBeforePhotoUrl(std.beforePhotoUrl);
    setFormAfterPhotoUrl(std.afterPhotoUrl);
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false); setEditingId(null);
    setFormSStep(1); setFormTitle(''); setFormDescription(''); setFormCategory('formato_mejora');
    setFormContent(''); setFormStatus('activo'); setFormResponsable(''); setFormContacto('');
    setFormMejoraTipo(''); setFormBeforePhotoUrl(null); setFormAfterPhotoUrl(null);
  };

  // Filter
  const filtered = standards.filter(s => {
    if (searchTerm && !s.title.toLowerCase().includes(searchTerm.toLowerCase()) && !(s.description || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getCategoryInfo = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[CATEGORIES.length - 1];
  const getStatusInfo = (status: string) => STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  const getMejoraInfo = (tipo: string | null) => tipo ? MEJORA_TIPOS.find(m => m.value === tipo) : null;

  return (
    <div className="space-y-6">
      {/* Hidden file inputs */}
      <input type="file" ref={beforeInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], 'before')} />
      <input type="file" ref={afterInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], 'after')} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-500" />
            Estándares
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Gestión completa de estándares y formatos de mejora</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="h-4 w-4" /> Nuevo Estándar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar estándar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterS !== null ? String(filterS) : 'all'} onValueChange={v => setFilterS(v === 'all' ? null : Number(v))}>
          <SelectTrigger className="w-40"><SelectValue placeholder="S-Step" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {S_STEPS.map(s => <SelectItem key={s.id} value={String(s.id)}>S{s.id} — {s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs">{filtered.length} estándares</Badge>
      </div>

      {/* Standards List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-teal-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 text-teal-300 mx-auto mb-3" />
          <p className="text-muted-foreground">No hay estándares. Crea el primero para comenzar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(std => {
            const catInfo = getCategoryInfo(std.category);
            const statusInfo = getStatusInfo(std.status);
            const mejoraInfo = getMejoraInfo(std.mejoraTipo);
            const isMejora = std.category === 'formato_mejora';
            const isExpanded = expandedId === std.id;

            return (
              <Card key={std.id} className="overflow-hidden border-l-4" style={{ borderLeftColor: S_STEPS.find(s => s.id === std.sStep)?.color || '#6b7280' }}>
                <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpandedId(isExpanded ? null : std.id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: S_STEPS.find(s => s.id === std.sStep)?.color }}>
                      S{std.sStep}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold truncate">{std.title}</h3>
                      {std.description && <p className="text-xs text-muted-foreground truncate">{std.description}</p>}
                    </div>
                    <Badge className={catInfo.color}>{catInfo.label}</Badge>
                    {mejoraInfo && <Badge className={mejoraInfo.color}>{mejoraInfo.label}</Badge>}
                    <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                    <div className="flex gap-1 ml-2">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={e => { e.stopPropagation(); startEdit(std); }}><Edit3 className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={e => { e.stopPropagation(); handleDelete(std.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t px-4 py-4 bg-gray-50/50 space-y-4">
                    {/* Before/After photos */}
                    {(std.beforePhotoUrl || std.afterPhotoUrl) && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-red-600"><Camera className="h-3.5 w-3.5" /> ANTES</div>
                          <div className="border-2 border-red-200 rounded-lg overflow-hidden bg-red-50/30">
                            {std.beforePhotoUrl ? (
                              <img src={std.beforePhotoUrl} alt="Antes" className="w-full h-40 object-cover cursor-pointer hover:opacity-80" onClick={() => window.open(std.beforePhotoUrl!, '_blank')} />
                            ) : (
                              <div className="w-full h-40 flex items-center justify-center text-red-300"><Camera className="h-10 w-10" /></div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-green-600"><Camera className="h-3.5 w-3.5" /> DESPUÉS</div>
                          <div className="border-2 border-green-200 rounded-lg overflow-hidden bg-green-50/30">
                            {std.afterPhotoUrl ? (
                              <img src={std.afterPhotoUrl} alt="Después" className="w-full h-40 object-cover cursor-pointer hover:opacity-80" onClick={() => window.open(std.afterPhotoUrl!, '_blank')} />
                            ) : (
                              <div className="w-full h-40 flex items-center justify-center text-green-300"><Camera className="h-10 w-10" /></div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Details */}
                    <div className="grid grid-cols-3 gap-3">
                      {std.responsable && <div className="text-xs"><span className="text-muted-foreground">Responsable:</span> <span className="font-medium">{std.responsable}</span></div>}
                      {std.contacto && <div className="text-xs"><span className="text-muted-foreground">Contacto:</span> <span className="font-medium">{std.contacto}</span></div>}
                      {std.mejoraTipo && <div className="text-xs"><span className="text-muted-foreground">Tipo mejora:</span> <span className="font-medium">{mejoraInfo?.label}</span></div>}
                    </div>
                    {std.content && (
                      <div className="bg-white rounded-lg p-3 border">
                        <p className="text-[10px] text-muted-foreground font-medium mb-1">CONTENIDO</p>
                        <p className="text-sm whitespace-pre-wrap">{std.content}</p>
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground">
                      Creado: {new Date(std.createdAt).toLocaleString('es-ES')} · Actualizado: {new Date(std.updatedAt).toLocaleString('es-ES')}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══ CREATE/EDIT FORM — Full Page Dialog ═══ */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => resetForm()}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold flex items-center gap-2">
                {editingId ? <Edit3 className="h-5 w-5 text-teal-500" /> : <Plus className="h-5 w-5 text-teal-500" />}
                {editingId ? 'Editar Estándar' : 'Nuevo Estándar'}
              </h2>
              <Button variant="ghost" size="sm" onClick={resetForm}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-xs">Título *</Label>
                  <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Título del estándar" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Descripción</Label>
                  <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Descripción del estándar" rows={2} />
                </div>
                <div>
                  <Label className="text-xs">S-Step</Label>
                  <Select value={String(formSStep)} onValueChange={v => setFormSStep(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {S_STEPS.map(s => <SelectItem key={s.id} value={String(s.id)}>S{s.id} — {s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Categoría</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Tipo de Mejora</Label>
                  <Select value={formMejoraTipo || '_none'} onValueChange={v => setFormMejoraTipo(v === '_none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Ninguno</SelectItem>
                      {MEJORA_TIPOS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Estado</Label>
                  <Select value={formStatus} onValueChange={setFormStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Responsable</Label>
                  <Input value={formResponsable} onChange={e => setFormResponsable(e.target.value)} placeholder="Persona responsable" />
                </div>
                <div>
                  <Label className="text-xs">Contacto</Label>
                  <Input value={formContacto} onChange={e => setFormContacto(e.target.value)} placeholder="Teléfono o email" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Contenido</Label>
                  <Textarea value={formContent} onChange={e => setFormContent(e.target.value)} placeholder="Contenido del estándar, instrucciones, procedimiento..." rows={5} />
                </div>

                {/* Photos */}
                <div>
                  <Label className="text-xs">Foto ANTES</Label>
                  <div className="mt-1 border-2 border-dashed border-red-200 rounded-lg p-3 bg-red-50/30 text-center">
                    {formBeforePhotoUrl ? (
                      <div className="relative">
                        <img src={formBeforePhotoUrl} alt="Antes" className="w-full h-32 object-cover rounded" />
                        <Button size="sm" variant="outline" className="absolute top-1 right-1 h-6 w-6 p-0 bg-white" onClick={() => setFormBeforePhotoUrl(null)}>×</Button>
                      </div>
                    ) : (
                      <Button variant="ghost" className="text-red-400" onClick={() => beforeInputRef.current?.click()} disabled={isUploading === 'before'}>
                        {isUploading === 'before' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-6 w-6" />}
                        <span className="text-xs ml-1">Subir foto</span>
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Foto DESPUÉS</Label>
                  <div className="mt-1 border-2 border-dashed border-green-200 rounded-lg p-3 bg-green-50/30 text-center">
                    {formAfterPhotoUrl ? (
                      <div className="relative">
                        <img src={formAfterPhotoUrl} alt="Después" className="w-full h-32 object-cover rounded" />
                        <Button size="sm" variant="outline" className="absolute top-1 right-1 h-6 w-6 p-0 bg-white" onClick={() => setFormAfterPhotoUrl(null)}>×</Button>
                      </div>
                    ) : (
                      <Button variant="ghost" className="text-green-400" onClick={() => afterInputRef.current?.click()} disabled={isUploading === 'after'}>
                        {isUploading === 'after' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-6 w-6" />}
                        <span className="text-xs ml-1">Subir foto</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2 border-t">
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button onClick={handleSave} disabled={!formTitle.trim() || isSaving} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editingId ? 'Guardar Cambios' : 'Crear Estándar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
