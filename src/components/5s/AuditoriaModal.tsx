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
import { Label } from '@/components/ui/label';
import {
  ShieldCheck,
  CheckCircle,
  Camera,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Plus,
  Trash2,
  TrendingUp,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { use5SStore } from '@/lib/store';
import {
  S_STEPS,
  AUDIT_CHECKLISTS,
  AUDIT_TOTAL_ITEMS,
  AUDIT_PASS_THRESHOLD,
} from '@/lib/5s-constants';
import { AUDIT_PASS_THRESHOLD as AUDIT_PASS_FALLBACK } from '@/lib/5s-constants';
import type { AuditSection, AuditItemResult } from '@/lib/5s-constants';

interface AuditoriaModalProps {
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

export default function AuditoriaModal({ open, onClose, sStep, miniStep }: AuditoriaModalProps) {
  const { fetchProgress, currentUser, adminFreeNavigation, currentProject, currentZone } = use5SStore();
  const sStepData = S_STEPS.find(s => s.id === sStep);
  const isAdmin = currentUser?.role === 'admin' && adminFreeNavigation;
  const isAuditor = currentUser?.role === 'auditor';
  const canAudit = isAdmin || isAuditor;

  const [sections, setSections] = useState<AuditSection[]>([]);
  const [auditorName, setAuditorName] = useState('');
  const [results, setResults] = useState<Record<string, AuditItemResult>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [notaMinima, setNotaMinima] = useState(75);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);

  // Mejoras realizadas
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [haMejoras, setHaMejoras] = useState<boolean | null>(null);
  const [mejoras, setMejoras] = useState<Array<{ id: string; descripcion: string; responsable: string; fecha: string }>>([]);

  // Load template from API
  useEffect(() => {
    if (open) {
      const loadTemplate = async () => {
        setIsLoadingTemplate(true)
        try {
          const res = await fetch(`/api/templates?type=auditoria&sStep=${sStep}`)
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
          console.error('Error loading auditoria template:', e)
          setSections(AUDIT_CHECKLISTS[sStep] || [])
        } finally {
          setIsLoadingTemplate(false)
        }
      }
      loadTemplate()
    }
  }, [open, sStep])

  // Fetch dynamic threshold
  useEffect(() => {
    if (open && currentProject?.id) {
      const fetchThreshold = async () => {
        try {
          const params = new URLSearchParams({ projectId: currentProject.id });
          if (currentZone?.id) params.set('zoneId', currentZone.id);
          const res = await fetch(`/api/audit-targets?${params}`);
          const json = await res.json();
          if (json.success && json.data) {
            const zoneTarget = json.data.find((t: any) => t.sStep === sStep && t.miniStep === 5 && t.zoneId === currentZone?.id);
            const projectTarget = json.data.find((t: any) => t.sStep === sStep && t.miniStep === 5 && t.zoneId === null);
            const target = zoneTarget || projectTarget;
            if (target?.notaMinima) setNotaMinima(target.notaMinima);
          }
        } catch (e) { console.error('Error fetching threshold:', e); }
      };
      fetchThreshold();
    }
  }, [open, sStep, currentProject?.id, currentZone?.id]);

  useEffect(() => {
    if (open && sections.length > 0) {
      const expanded: Record<string, boolean> = {};
      sections.forEach(s => { expanded[s.id] = true; });
      setExpandedSections(expanded);
      setResults({});
      setAuditorName('');
      setObservaciones('');
      setIsCompleted(false);
      setFinalScore(0);
      setHaMejoras(null);
      setMejoras([]);
    }
  }, [open, sStep]);

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0) || AUDIT_TOTAL_ITEMS[sStep] || 26;

  const scoring = useMemo(() => {
    const allResults = Object.values(results);
    const okCount = allResults.filter(r => r.status === 'ok').length;
    const nokCount = allResults.filter(r => r.status === 'nok').length;
    const answeredCount = okCount + nokCount;
    // Checklist maxes at 90%
    const checklistScore = totalItems > 0 ? Math.round((okCount / totalItems) * 90) : 0;
    // Each mejora with description adds 5%, max 2 mejoras = +10%
    const validMejorasCount = haMejoras ? mejoras.filter(m => m.descripcion.trim()).length : 0;
    const mejorasScore = Math.min(validMejorasCount, 2) * 5;
    const scorePercent = Math.min(checklistScore + mejorasScore, 100); // HARD CAP: never exceeds 100%
    return { okCount, nokCount, answeredCount, checklistScore, mejorasScore, validMejorasCount, scorePercent };
  }, [results, totalItems, haMejoras, mejoras]);

  const canSubmit = canAudit && auditorName.trim() !== '' && scoring.answeredCount > 0;

  // Check that all NOK items have hallazgo and mejora filled
  const nokItems = Object.values(results).filter(r => r.status === 'nok');
  const allNokCompleted = nokItems.length === 0 || nokItems.every(r => (r.hallazgo || '').trim() !== '' && (r.mejora || '').trim() !== '');
  const canSubmitFinal = canSubmit && allNokCompleted;

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
    setIsSubmitting(true);
    const isApto = scoring.scorePercent >= notaMinima;
    try {
      // Save audit result (always save, even if not apto)
      const auditRes = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sStep,
          auditorName,
          result: isApto ? 'apto' : 'no_apto',
          score: Math.min(scoring.scorePercent, 100),
          observations: observaciones || null,
          projectId: currentProject?.id,
          zoneId: currentZone?.id || null,
          checklistData: JSON.stringify(Object.values(results)),
          mejorasData: haMejoras ? JSON.stringify(mejoras.filter(m => m.descripcion.trim())) : null,
        }),
      });

      const auditJson = await auditRes.json();

      // Handle server-side role rejection
      if (auditRes.status === 403) {
        setIsSubmitting(false);
        alert(auditJson.error || 'No tienes permisos para realizar auditorías externas');
        return;
      }

      if (!auditJson.success) {
        setIsSubmitting(false);
        alert(auditJson.error || 'Error al guardar la auditoría');
        return;
      }
      if (auditJson.success) {
        // Create action items for each NOK to transmit disfunciones to the operator
        const nokResults = Object.values(results).filter(r => r.status === 'nok');
        for (const nok of nokResults) {
          await fetch('/api/actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sStep,
              miniStep: 5,
              itemId: nok.itemId,
              itemDescription: `Disfunción detectada en auditoría: ${nok.itemId}`,
              hallazgo: nok.hallazgo || nok.itemId,
              mejora: nok.mejora || '',
              responsable: null,
              prioridad: 'alta',
              estado: 'abierta',
              source: 'auditoria',
              auditor: auditorName,
              projectId: currentProject?.id,
              zoneId: currentZone?.id || null,
            }),
          });
        }

        // Mark the mini-step as completed (even if no_apto, the audit was done)
        const progressRes = await fetch(`/api/progress/step?sStep=${sStep}&miniStep=${miniStep}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            completed: isApto,
            score: Math.min(scoring.scorePercent, 100),
            notes: JSON.stringify({
              type: 'auditoria_externa',
              auditor: auditorName,
              result: isApto ? 'apto' : 'no_apto',
              results: Object.values(results),
              observaciones,
              mejorasRealizadas: haMejoras,
              mejoras: haMejoras ? mejoras.filter(m => m.descripcion.trim()) : [],
              disfuncionesCount: nokResults.length,
            }),
            projectId: currentProject?.id,
            zoneId: currentZone?.id || null,
          }),
        });

        const progressJson = await progressRes.json();
        if (progressJson.success) {
          setIsCompleted(true);
          setFinalScore(scoring.scorePercent);
          await fetchProgress();
        }
      }
    } catch (error) {
      console.error('Error submitting audit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminSkip = async () => {
    try {
      // Save audit result
      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sStep,
          auditorName: 'Admin (skip)',
          result: 'apto',
          score: 100,
          observations: 'Completado por administrador (skip)',
          projectId: currentProject?.id,
          zoneId: currentZone?.id || null,
        }),
      });
      // Mark progress as completed
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
            <ShieldCheck className="h-5 w-5" style={{ color: sStepData?.color }} />
            <span>Auditoría Externa</span>
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
              Completar paso sin auditoría
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
        {/* Permission check */}
        {!canAudit && !isCompleted && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-700 font-medium">Solo los auditores pueden realizar la auditoría externa. Tu rol: {currentUser?.role || 'sin rol'}</span>
          </div>
        )}

        {!canAudit && !isCompleted ? null : isCompleted ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              {finalScore >= notaMinima ? (
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />
              ) : (
                <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-3" />
              )}
              <h3 className="text-xl font-bold mb-2">
                {finalScore >= notaMinima ? 'Auditoría Externa Superada' : 'Auditoría No Superada'}
              </h3>
              <p className="text-lg mb-1">Puntuación Total: <strong>{finalScore}%</strong></p>
              <div className="flex justify-center gap-3 my-2">
                <Badge className="bg-blue-100 text-blue-800">Checklist: {scoring.checklistScore}%</Badge>
                <Badge className="bg-green-100 text-green-800">Mejoras: +{scoring.mejorasScore}%</Badge>
              </div>
              <p className="text-muted-foreground">
                {scoring.okCount} OK / {scoring.nokCount} NOK de {totalItems} puntos de verificación
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Auditor: <strong>{auditorName}</strong>
              </p>
            </div>

            {finalScore >= notaMinima ? (
              <div className="text-center">
                <Badge className="bg-green-500 text-lg px-4 py-1">Apto — Mini-paso completado</Badge>
                <p className="text-sm text-muted-foreground mt-2">La auditoría ha sido registrada y el paso se marca como completado.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-center">
                  <Badge className="bg-red-500 text-lg px-4 py-1">No Apto — Se requiere corrección</Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Mínimo requerido: {notaMinima}%. Debes corregir las disfunciones y realizar una nueva auditoría.
                  </p>
                </div>

                {/* Saved confirmation */}
                <Card className="border-green-200 bg-green-50/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-800">Auditoría guardada correctamente</span>
                    </div>
                    <p className="text-xs text-green-700">
                      El resultado de esta auditoría ({finalScore}%) ha sido registrado. Las disfunciones detectadas se han guardado como acciones de mejora en el Plan de Acción.
                    </p>
                  </CardContent>
                </Card>

                {scoring.nokCount > 0 && (
                  <Card className="border-red-200">
                    <CardContent className="p-3">
                      <p className="text-sm font-semibold text-red-800 mb-2">
                        {scoring.nokCount} disfunciones detectadas:
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {Object.values(results).filter(r => r.status === 'nok').map((nok) => (
                          <div key={nok.itemId} className="bg-red-50 border border-red-200 rounded p-2 text-xs">
                            <span className="font-medium text-red-700">{nok.itemId}</span>
                            {nok.hallazgo && <span className="text-red-600"> — {nok.hallazgo}</span>}
                            {nok.mejora && <span className="text-amber-600"> → Mejora: {nok.mejora}</span>}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Estas disfunciones están disponibles en el Plan de Acción para su seguimiento.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Info banner */}
            <div className="p-3 rounded-lg border-l-4" style={{ borderColor: sStepData?.color, backgroundColor: `${sStepData?.color}08` }}>
              <p className="text-sm font-medium" style={{ color: sStepData?.color }}>
                Auditoría Externa — {sStepData?.japaneseName}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                El auditor evalúa cada punto (máx. 90%). Cada mejora realizada suma +5% (máx. 2 mejoras = +10%). Para aprobar se necesita ≥{notaMinima}%.
                Los NOKs generan hallazgos y puntos de mejora como plan de acción.
              </p>
            </div>

            {/* Auditor name */}
            <Card>
              <CardContent className="p-4">
                <Label htmlFor="auditorName" className="text-sm font-medium">Nombre del Auditor Externo *</Label>
                <Input
                  id="auditorName"
                  placeholder="Ingrese el nombre del auditor externo"
                  value={auditorName}
                  onChange={e => setAuditorName(e.target.value)}
                  className="mt-1"
                />
              </CardContent>
            </Card>

            {/* Score indicator */}
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Puntuación Total</span>
                  <p className="text-xs text-muted-foreground">
                    {scoring.okCount} OK / {scoring.nokCount} NOK de {totalItems} puntos
                  </p>
                </div>
                <Badge variant={scoring.scorePercent >= notaMinima ? 'default' : 'secondary'} className="text-base px-3 py-1">
                  {scoring.scorePercent}%
                </Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-blue-100 text-blue-800">Checklist: {scoring.checklistScore}% (máx. 90%)</Badge>
                <Badge className="bg-green-100 text-green-800">Mejoras: +{scoring.mejorasScore}% ({scoring.validMejorasCount} {scoring.validMejorasCount === 1 ? 'mejora' : 'mejoras'}, máx. +10%)</Badge>
                <Badge className="bg-green-100 text-green-800">OK: {scoring.okCount}</Badge>
                <Badge className="bg-red-100 text-red-800">NOK: {scoring.nokCount}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">Mínimo para aprobar: {notaMinima}%</p>
            </div>

            {/* Checklist sections - same checklist as autoevaluación */}
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

            {/* Mejoras realizadas */}
            <Card className="border-green-200 bg-green-50/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <label className="text-sm font-semibold text-green-800">¿Se han realizado mejoras desde la última auditoría?</label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      haMejoras === true
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-green-700 border border-green-300 hover:bg-green-50'
                    }`}
                    onClick={() => { setHaMejoras(true); if (mejoras.length === 0) setMejoras([{ id: Date.now().toString(), descripcion: '', responsable: '', fecha: '' }]); }}
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      haMejoras === false
                        ? 'bg-gray-600 text-white'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => { setHaMejoras(false); setMejoras([]); }}
                  >
                    No
                  </button>
                </div>

                {haMejoras && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-green-700">
                        Mejoras realizadas ({mejoras.filter(m => m.descripcion.trim()).length})
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-green-300 text-green-700 hover:bg-green-50 h-7"
                        onClick={() => setMejoras([...mejoras, { id: Date.now().toString(), descripcion: '', responsable: '', fecha: '' }])}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Añadir mejora
                      </Button>
                    </div>
                    {mejoras.map((mejora, idx) => (
                      <div key={mejora.id} className="bg-white border border-green-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-green-700">Mejora {idx + 1}</span>
                          {mejoras.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                              onClick={() => setMejoras(mejoras.filter(m => m.id !== mejora.id))}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground">Descripción de la mejora *</label>
                          <Textarea
                            placeholder="Describa la mejora realizada..."
                            value={mejora.descripcion}
                            onChange={e => {
                              const updated = [...mejoras];
                              updated[idx] = { ...updated[idx], descripcion: e.target.value };
                              setMejoras(updated);
                            }}
                            className="text-sm mt-0.5"
                            rows={2}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-medium text-muted-foreground">Responsable</label>
                            <Input
                              placeholder="Nombre del responsable"
                              value={mejora.responsable}
                              onChange={e => {
                                const updated = [...mejoras];
                                updated[idx] = { ...updated[idx], responsable: e.target.value };
                                setMejoras(updated);
                              }}
                              className="text-sm h-8 mt-0.5"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-medium text-muted-foreground">Fecha</label>
                            <Input
                              type="date"
                              value={mejora.fecha}
                              onChange={e => {
                                const updated = [...mejoras];
                                updated[idx] = { ...updated[idx], fecha: e.target.value };
                                setMejoras(updated);
                              }}
                              className="text-sm h-8 mt-0.5"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Observaciones */}
            <Card>
              <CardContent className="p-4">
                <label className="text-sm font-medium">Observaciones del auditor</label>
                <Textarea
                  placeholder="Observaciones adicionales de la auditoría externa..."
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
                disabled={!canSubmitFinal || isSubmitting}
                style={canSubmitFinal ? { backgroundColor: sStepData?.color } : undefined}
              >
                {isSubmitting ? 'Enviando...' : `Registrar Auditoría Externa (${scoring.scorePercent}%)`}
              </Button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
