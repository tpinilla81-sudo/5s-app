'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { CheckSquare, CheckCircle, Camera, ChevronDown, ChevronRight, Maximize2, Minimize2, AlertCircle } from 'lucide-react';
import { use5SStore } from '@/lib/store';
import {
  S_STEPS,
  AUDIT_CHECKLISTS,
  AUDIT_TOTAL_ITEMS,
  SELF_EVAL_THRESHOLD,
} from '@/lib/5s-constants';
import { SELF_EVAL_THRESHOLD as SELF_EVAL_FALLBACK } from '@/lib/5s-constants';
import type { AuditSection, AuditItemResult } from '@/lib/5s-constants';

interface AutoevaluacionModalProps {
  open: boolean;
  onClose: () => void;
  sStep: number;
  miniStep: number;
}

// Convert template content to AuditSection format
function templateToAuditSections(content: any): AuditSection[] {
  if (!content || !content.sections) return []
  return content.sections.map((section: any, sIdx: number) => ({
    id: section.id || `sec-${sIdx}`,
    title: section.title || `Sección ${sIdx + 1}`,
    items: (section.items || []).map((item: any, iIdx: number) => ({
      id: item.id || `item-${sIdx}-${iIdx}`,
      description: item.description || '',
      hasOther: item.hasOther || false,
    })),
  }))
}

export default function AutoevaluacionModal({ open, onClose, sStep, miniStep }: AutoevaluacionModalProps) {
  const { fetchProgress, currentUser, adminFreeNavigation, currentProject, currentZone } = use5SStore();
  const sStepData = S_STEPS.find(s => s.id === sStep);
  const isAdmin = currentUser?.role === 'admin' && adminFreeNavigation;
  const isResponsable = currentUser?.role === 'responsable';
  const isAuditor = currentUser?.role === 'auditor';
  const isEmpleado = currentUser?.role === 'empleado';
  const isAdminLocked = currentUser?.role === 'admin' && !adminFreeNavigation;
  const isReadOnly = isResponsable || isAuditor || isAdminLocked;
  const canPerformAutoeval = isAdmin || (isEmpleado && sStep !== 4);

  const [isFullscreen, setIsFullscreen] = useState(true);
  const [sections, setSections] = useState<AuditSection[]>([]);
  const [results, setResults] = useState<Record<string, AuditItemResult>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [notaMinima, setNotaMinima] = useState(70);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);

  // Load template from API
  useEffect(() => {
    if (open) {
      const loadTemplate = async () => {
        setIsLoadingTemplate(true)
        try {
          const res = await fetch(`/api/templates?type=autoevaluacion&sStep=${sStep}`)
          const json = await res.json()
          if (json.success && json.data && json.data.length > 0) {
            const tpl = json.data[0]
            const parsed = typeof tpl.content === 'string' ? JSON.parse(tpl.content) : tpl.content
            const templateSections = templateToAuditSections(parsed)
            if (templateSections.length > 0) {
              setSections(templateSections)
            } else {
              setSections(AUDIT_CHECKLISTS[sStep] || [])
            }
            if (tpl.notaMinima != null) setNotaMinima(tpl.notaMinima)
          } else {
            setSections(AUDIT_CHECKLISTS[sStep] || [])
          }
        } catch (e) {
          console.error('Error loading autoeval template:', e)
          setSections(AUDIT_CHECKLISTS[sStep] || [])
        } finally {
          setIsLoadingTemplate(false)
        }
      }
      loadTemplate()
    }
  }, [open, sStep])

  // Fetch dynamic threshold (overrides template if present)
  useEffect(() => {
    if (open && currentProject?.id) {
      const fetchThreshold = async () => {
        try {
          const params = new URLSearchParams({ projectId: currentProject.id });
          if (currentZone?.id) params.set('zoneId', currentZone.id);
          const res = await fetch(`/api/audit-targets?${params}`);
          const json = await res.json();
          if (json.success && json.data) {
            const zoneTarget = json.data.find((t: any) => t.sStep === sStep && t.miniStep === 4 && t.zoneId === currentZone?.id);
            const projectTarget = json.data.find((t: any) => t.sStep === sStep && t.miniStep === 4 && t.zoneId === null);
            const target = zoneTarget || projectTarget;
            if (target?.notaMinima) setNotaMinima(target.notaMinima);
          }
        } catch (e) { console.error('Error fetching threshold:', e); }
      };
      fetchThreshold();
    }
  }, [open, sStep, currentProject?.id, currentZone?.id]);

  // Initialize expanded sections
  useEffect(() => {
    if (open && sections.length > 0) {
      const expanded: Record<string, boolean> = {};
      sections.forEach(s => { expanded[s.id] = true; });
      setExpandedSections(expanded);
      setResults({});
      setObservaciones('');
      setIsCompleted(false);
      setFinalScore(0);
    }
  }, [open, sStep]);

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0) || AUDIT_TOTAL_ITEMS[sStep] || 26;

  const scoring = useMemo(() => {
    const allResults = Object.values(results);
    const okCount = allResults.filter(r => r.status === 'ok').length;
    const nokCount = allResults.filter(r => r.status === 'nok').length;
    const answeredCount = okCount + nokCount;
    const scorePercent = totalItems > 0 ? Math.min(Math.round((okCount / totalItems) * 100), 100) : 0;
    return { okCount, nokCount, answeredCount, scorePercent };
  }, [results, totalItems]);

  // Check that all NOK items have hallazgo and mejora filled
  const nokItems = Object.values(results).filter(r => r.status === 'nok');
  const allNokCompleted = nokItems.length === 0 || nokItems.every(r => (r.hallazgo || '').trim() !== '' && (r.mejora || '').trim() !== '');

  const canSubmit = canPerformAutoeval && scoring.answeredCount > 0 && scoring.scorePercent >= notaMinima && allNokCompleted;

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const setItemStatus = (itemId: string, status: 'ok' | 'nok' | 'na') => {
    setResults(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], itemId, status },
    }));
  };

  const setItemField = (itemId: string, field: 'hallazgo' | 'mejora' | 'otherText', value: string) => {
    setResults(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], itemId, [field]: value },
    }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (!canPerformAutoeval) return; // Only responsable/admin for S4, or any employee for S1/S2/S3/S5
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/progress/step?sStep=${sStep}&miniStep=${miniStep}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: true,
          score: scoring.scorePercent,
          notes: JSON.stringify({
            type: 'autoevaluacion',
            results: Object.values(results),
            observaciones,
          }),
          projectId: currentProject?.id,
          zoneId: currentZone?.id || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsCompleted(true);
        setFinalScore(scoring.scorePercent);
        await fetchProgress();

        // Check if Steps 1-4 are now all completed for this S-step in the zone
        // If so, notify auditor(s) that they can perform Step 5
        if (currentProject?.id && currentZone?.id) {
          try {
            // Fetch all progress for this zone and S-step
            const progRes = await fetch(`/api/progress?projectId=${currentProject.id}`);
            const progData = await progRes.json();
            const allProgress = progData?.data || [];

            // Check steps 1-4 completed
            let allStepsCompleted = true;
            for (let ms = 1; ms <= 4; ms++) {
              const step = allProgress.find((p: any) =>
                p.sStep === sStep &&
                p.miniStep === ms &&
                (p.zoneId === currentZone.id || p.zoneId === null) &&
                p.completed
              );
              if (!step) {
                allStepsCompleted = false;
                break;
              }
            }

            if (allStepsCompleted) {
              // Find auditor users for this project and notify them
              const membersRes = await fetch(`/api/projects/${currentProject.id}/members`);
              const membersData = await membersRes.json();
              const auditors = (membersData?.members || []).filter((m: any) => m.role === 'auditor');

              const sStepData = S_STEPS.find(s => s.id === sStep);
              for (const auditor of auditors) {
                await fetch('/api/notifications', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: auditor.userId,
                    type: 'audit_ready',
                    title: `Auditoría lista: S${sStep} — ${sStepData?.japaneseName || ''}`,
                    message: `Los pasos 1-4 de S${sStep} (${sStepData?.japaneseName || ''}) en la zona "${currentZone.name}" han sido completados. Ya puedes realizar la auditoría (Paso 5).`,
                    sStep,
                    zoneId: currentZone.id,
                    projectId: currentProject.id,
                  }),
                });
              }
            }
          } catch (notifError) {
            console.error('Error sending notification to auditor:', notifError);
          }
        }
      }
    } catch (error) {
      console.error('Error submitting self-evaluation:', error);
    } finally {
      setIsSubmitting(false);
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

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent size={isFullscreen ? "fullscreen" : "xl"} className="flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" style={{ color: sStepData?.color }} />
            <span>Autoevaluación Interna</span>
            <Badge variant="outline" style={{ borderColor: sStepData?.color, color: sStepData?.color }}>
              {sStepData?.japaneseName} — {sStepData?.spanishName}
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

        {isAdmin && !isCompleted && (
          <div className="flex items-center gap-2 p-2 mx-6 flex-shrink-0 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-xs text-amber-700 font-medium">Modo Admin:</span>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={handleAdminSkip}
            >
              Completar paso sin autoevaluación
            </Button>
          </div>
        )}

        {!canPerformAutoeval && !isCompleted && (
          <div className="flex items-center gap-2 p-2 mx-6 flex-shrink-0 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-xs text-blue-700 font-medium">Solo lectura: {currentUser?.role === 'admin' ? 'Activa el candado para poder realizar pasos.' : currentUser?.role === 'auditor' ? 'El auditor puede ver la autoevaluación pero no realizarla.' : 'El responsable puede ver el progreso pero no realizar pasos.'}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
        {isCompleted ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">¡Autoevaluación Completada!</h3>
            <p className="text-lg mb-1">Puntuación: <strong>{finalScore}%</strong></p>
            <p className="text-muted-foreground">
              {scoring.okCount} OK / {scoring.nokCount} NOK de {totalItems} puntos de verificación
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Info banner */}
            <div className="p-3 rounded-lg border-l-4" style={{ borderColor: sStepData?.color, backgroundColor: `${sStepData?.color}08` }}>
              <p className="text-sm font-medium" style={{ color: sStepData?.color }}>
                Autoevaluación Interna — {sStepData?.japaneseName}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Evalúa cada punto de verificación. Marca OK si cumple, NOK si hay desviación. 
                Los NOKs generan hallazgos y puntos de mejora como plan de acción.
              </p>
            </div>

            {/* Score indicator */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <span className="text-sm font-medium">Puntuación</span>
                <p className="text-xs text-muted-foreground">
                  {scoring.okCount} OK / {scoring.nokCount} NOK de {totalItems} puntos
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800">OK: {scoring.okCount}</Badge>
                <Badge className="bg-red-100 text-red-800">NOK: {scoring.nokCount}</Badge>
                <Badge variant={scoring.scorePercent >= notaMinima ? 'default' : 'secondary'}>
                  {scoring.scorePercent}% (mín. {notaMinima}%)
                </Badge>
              </div>
            </div>

            {/* Checklist sections */}
            <div className="space-y-3">
              {sections.map(section => (
                <Card key={section.id} className="overflow-hidden">
                  {/* Section header */}
                  <button
                    className="w-full p-3 flex items-center gap-2 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => toggleSection(section.id)}
                  >
                    {expandedSections[section.id] ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Badge variant="outline" className="text-xs font-mono">{section.id}</Badge>
                    <span className="font-semibold text-sm">{section.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {section.items.length} puntos
                    </span>
                  </button>

                  {/* Section items */}
                  {expandedSections[section.id] && (
                    <CardContent className="px-4 pb-4 pt-0 space-y-3">
                      {section.items.map(item => {
                        const result = results[item.id];
                        const isNok = result?.status === 'nok';

                        return (
                          <div key={item.id} className="border rounded-lg p-3 space-y-2">
                            {/* Item header: description + status buttons */}
                            <div className="flex items-start gap-3">
                              <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
                                {item.id}
                              </span>
                              <p className="text-sm flex-1">{item.description}</p>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                    result?.status === 'ok'
                                      ? 'bg-green-500 text-white'
                                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                                  }`}
                                  onClick={() => setItemStatus(item.id, 'ok')}
                                >
                                  OK
                                </button>
                                <button
                                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                    result?.status === 'nok'
                                      ? 'bg-red-500 text-white'
                                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                                  }`}
                                  onClick={() => setItemStatus(item.id, 'nok')}
                                >
                                  NOK
                                </button>
                                <button
                                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                    result?.status === 'na'
                                      ? 'bg-gray-500 text-white'
                                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                  }`}
                                  onClick={() => setItemStatus(item.id, 'na')}
                                >
                                  N/A
                                </button>
                              </div>
                            </div>

                            {/* "Otros" text field */}
                            {item.hasOther && (
                              <Input
                                placeholder="Especificar..."
                                value={result?.otherText || ''}
                                onChange={e => setItemField(item.id, 'otherText', e.target.value)}
                                className="text-sm"
                              />
                            )}

                            {/* NOK details: hallazgo + mejora — OBLIGATORIOS */}
                            {isNok && (
                              <div className="space-y-2 pl-6 border-l-2 border-red-200">
                                <div>
                                  <label className="text-xs font-medium text-red-700">Referencia del hallazgo (desviación) *</label>
                                  <Textarea
                                    placeholder="Obligatorio: describa la desviación encontrada..."
                                    value={result?.hallazgo || ''}
                                    onChange={e => setItemField(item.id, 'hallazgo', e.target.value)}
                                    className={`text-sm mt-1 ${!(result?.hallazgo || '').trim() ? 'border-red-400 focus:border-red-500' : ''}`}
                                    rows={2}
                                  />
                                  {!(result?.hallazgo || '').trim() && (
                                    <p className="text-[10px] text-red-500 mt-0.5">Campo obligatorio</p>
                                  )}
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-amber-700">Punto a Mejorar (sugerencia) *</label>
                                  <Textarea
                                    placeholder="Obligatorio: sugiera una mejora..."
                                    value={result?.mejora || ''}
                                    onChange={e => setItemField(item.id, 'mejora', e.target.value)}
                                    className={`text-sm mt-1 ${!(result?.mejora || '').trim() ? 'border-amber-400 focus:border-amber-500' : ''}`}
                                    rows={2}
                                  />
                                  {!(result?.mejora || '').trim() && (
                                    <p className="text-[10px] text-amber-500 mt-0.5">Campo obligatorio</p>
                                  )}
                                </div>
                                <div>
                                  <Button variant="outline" size="sm" className="text-xs">
                                    <Camera className="h-3 w-3 mr-1" /> Añadir foto (biblioteca paso 2)
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            {/* Observaciones */}
            <Card>
              <CardContent className="p-4">
                <label className="text-sm font-medium">Observaciones generales</label>
                <Textarea
                  placeholder="Observaciones adicionales de la autoevaluación..."
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* NOK incomplete warning */}
            {nokItems.length > 0 && !allNokCompleted && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <p className="text-xs text-red-700">
                  Debes completar los campos <strong>"Referencia del hallazgo"</strong> y <strong>"Punto a Mejorar"</strong> en todos los items NOK ({nokItems.filter(r => !(r.hallazgo || '').trim() || !(r.mejora || '').trim()).length} pendientes)
                </p>
              </div>
            )}

            {/* Submit button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                style={canSubmit ? { backgroundColor: sStepData?.color } : undefined}
              >
                {isSubmitting ? 'Enviando...' : `Completar Autoevaluación (${scoring.scorePercent}%)`}
              </Button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
