'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
import { CheckSquare, CheckCircle, XCircle, Camera, ChevronDown, ChevronRight, Maximize2, Minimize2, AlertCircle, Upload, X, Image as ImageIcon } from 'lucide-react';
import { use5SStore } from '@/lib/store';
import {
  S_STEPS,
  SELF_EVAL_THRESHOLD,
} from '@/lib/5s-constants';
import type { AuditSection, AuditItemResult } from '@/lib/5s-constants';
import { useChecklistTemplate } from '@/lib/checklist-templates';

interface AutoevaluacionModalProps {
  open: boolean;
  onClose: () => void;
  sStep: number;
  miniStep: number;
}



export default function AutoevaluacionModal({ open, onClose, sStep, miniStep }: AutoevaluacionModalProps) {
  const { fetchProgress, currentUser, adminFreeNavigation, currentProject, currentZone, canPerform, canView, hasPermission } = use5SStore();
  const sStepData = S_STEPS.find(s => s.id === sStep);
  const canSkipSteps = hasPermission('skip_steps');
  const canPerformStep = canPerform(sStep, miniStep);
  const canViewStep = canView(sStep, miniStep);
  // Permission-driven: read-only if no execute perm OR if candado closed for skip_steps users
  const isReadOnly = !canPerformStep || (canSkipSteps && !adminFreeNavigation);
  const canPerformAutoeval = canPerformStep;

  const [isFullscreen, setIsFullscreen] = useState(true);
  const [results, setResults] = useState<Record<string, AuditItemResult>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [notaMinima, setNotaMinima] = useState(70);
  const [autoevalPhotos, setAutoevalPhotos] = useState<{ file: File; preview: string; uploading?: boolean; serverUrl?: string }[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Load template from API (uses board config if zone has one)
  const { sections, isLoading: isLoadingTemplate, notaMinima: templateNotaMinima } = useChecklistTemplate('autoevaluacion', sStep, open, currentZone?.boardConfigId);

  // Apply template notaMinima when loaded
  useEffect(() => {
    if (templateNotaMinima !== null) setNotaMinima(templateNotaMinima);
  }, [templateNotaMinima]);



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
      setAutoevalPhotos([]);
    }
  }, [open, sStep]);

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0) || 26;

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

  const passed = scoring.scorePercent >= notaMinima;
  const canSubmit = canPerformAutoeval && scoring.answeredCount > 0 && allNokCompleted;

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const preview = URL.createObjectURL(file);
      setAutoevalPhotos(prev => [...prev, { file, preview }]);
    }
    // Reset input
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const removeAutoevalPhoto = (index: number) => {
    setAutoevalPhotos(prev => {
      const photo = prev[index];
      if (photo.preview) URL.revokeObjectURL(photo.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

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
      // Only mark as completed if score meets notaMinima threshold
      // If not passed, still save results but step stays available for retry
      const res = await fetch(`/api/progress/step?sStep=${sStep}&miniStep=${miniStep}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: passed,
          score: scoring.scorePercent,
          notes: JSON.stringify({
            type: 'autoevaluacion',
            passed,
            notaMinima,
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

        // ─── Create EmployeeProgress record for individual step 4 (autoevaluación) ───
        // Step 4 is individual for S1/S2/S3/S5 (done by employees) and for S4 (done by responsable)
        // We need to track individual completion so the gating system unlocks step 5
        if (passed && currentUser?.id && currentProject?.id && currentZone?.id) {
          try {
            await fetch('/api/employee-progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sStep,
                miniStep: 4,
                completed: true,
                score: scoring.scorePercent,
                projectId: currentProject.id,
                zoneId: currentZone.id,
                userId: currentUser.id,
              }),
            });
            // Also refresh employee progress so step 5 unlocks immediately
            const { fetchEmployeeProgress } = use5SStore.getState();
            await fetchEmployeeProgress(currentProject.id, currentZone.id);
          } catch (empErr) {
            console.error('Error creating employee progress for autoeval:', empErr);
          }
        }

        // ─── Upload photos to library with traceability ───
        if (autoevalPhotos.length > 0) {
          setIsUploadingPhotos(true);
          for (let idx = 0; idx < autoevalPhotos.length; idx++) {
            const photo = autoevalPhotos[idx];
            try {
              // Step 1: Upload the file to get a server URL
              const formData = new FormData();
              formData.append('file', photo.file);
              formData.append('filename', `S${sStep}_autoeval_${currentZone?.name || 'zona'}_${idx + 1}_${Date.now()}.jpg`);

              const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
              });
              const uploadData = await uploadRes.json();

              if (uploadData.success && uploadData.url) {
                // Step 2: Save to photo library with full traceability
                await fetch('/api/photo-library', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sStep,
                    miniStep: 4,
                    title: `Autoeval S${sStep} - Foto ${idx + 1}`,
                    description: `${sStepData?.japaneseName || 'S' + sStep} - ${currentZone?.name || 'Zona'} - Paso 4 Autoevaluación - Subida por ${currentUser?.name || 'Usuario'}`,
                    photoUrl: uploadData.url,
                    photoType: 'hallazgo',
                    category: `paso4_s${sStep}`,
                    tags: JSON.stringify([`S${sStep}`, sStepData?.japaneseName || '', currentZone?.name || '', 'paso4', 'autoevaluacion', 'hallazgo']),
                    projectId: currentProject?.id,
                    zoneId: currentZone?.id || null,
                    uploadedBy: currentUser?.id || null,
                  }),
                });
              }
            } catch (photoErr) {
              console.error('Error uploading autoeval photo:', photoErr);
            }
          }
          setIsUploadingPhotos(false);
        }

        // ─── Create Action Items for NOK (disfunciones) ───
        const nokResults = Object.values(results).filter((r: any) => r.status === 'nok');
        for (const nok of nokResults) {
          if (!nok.hallazgo && !nok.mejora) continue; // Skip items without description
          try {
            await fetch('/api/actions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sStep,
                miniStep: 4,
                itemId: nok.itemId,
                itemDescription: `Disfunción detectada en autoevaluación: ${nok.itemId}`,
                hallazgo: nok.hallazgo || nok.itemId,
                mejora: nok.mejora || '',
                responsable: null,
                prioridad: 'media',
                estado: 'abierta',
                source: 'autoevaluacion',
                auditor: null,
                projectId: currentProject?.id,
                zoneId: currentZone?.id || null,
              }),
            });
          } catch (actionError) {
            console.error('Error creating action item from autoevaluación:', actionError);
          }
        }

        // ─── Notify responsables of NOK disfunciones ───
        if (nokResults.length > 0 && currentProject?.id && currentZone?.id) {
          try {
            const membersRes = await fetch(`/api/projects/${currentProject.id}/members`);
            const membersData = await membersRes.json();
            const allMembers = membersData?.members || [];

            const sStepData = S_STEPS.find(s => s.id === sStep);
            const disfuncionMessage = `Se han detectado ${nokResults.length} disfunción(es) en la autoevaluación de S${sStep} (${sStepData?.japaneseName || ''}) en la zona "${currentZone.name}". Revisa el Plan de Acción.`;

            // Notify zone responsable
            const responsableIds = new Set<string>();
            if (currentZone.responsableId) responsableIds.add(currentZone.responsableId);
            const responsables = allMembers.filter((m: any) => m.role === 'responsable');
            for (const resp of responsables) responsableIds.add(resp.userId);

            for (const respId of responsableIds) {
              await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: respId,
                  type: 'disfuncion',
                  title: `Disfunciones detectadas: S${sStep} — ${sStepData?.japaneseName || ''}`,
                  message: disfuncionMessage,
                  sStep,
                  zoneId: currentZone.id,
                  projectId: currentProject.id,
                }),
              });
            }
          } catch (notifError) {
            console.error('Error notifying responsables of disfunciones:', notifError);
          }
        }

        // Check if Steps 1-4 are now all completed for this S-step in the zone
        // If so, notify auditor(s) that they can perform Step 5
        if (currentProject?.id && currentZone?.id) {
          try {
            // Fetch all progress for this zone and S-step
            const progRes = await fetch(`/api/progress?projectId=${currentProject.id}`);
            const progData = await progRes.json();
            const allProgress = progData?.data || [];

            // Also fetch employee progress for individual steps (formación = step 1)
            const empProgRes = await fetch(`/api/employee-progress?projectId=${currentProject.id}&zoneId=${currentZone.id}`);
            const empProgData = await empProgRes.json();
            const allEmpProgress = empProgData?.data || [];

            // Check steps 1-4 completed (both zone-level progress AND employee progress)
            let allStepsCompleted = true;
            for (let ms = 1; ms <= 4; ms++) {
              const zoneStep = allProgress.find((p: any) =>
                p.sStep === sStep &&
                p.miniStep === ms &&
                (p.zoneId === currentZone.id || p.zoneId === null) &&
                p.completed
              );
              if (zoneStep) continue; // Zone-level completed

              // Also check employee progress for individual steps
              const empStep = allEmpProgress.some((ep: any) =>
                ep.sStep === sStep &&
                ep.miniStep === ms &&
                ep.zoneId === currentZone.id &&
                ep.completed
              );
              if (empStep) continue; // Some employee completed this step

              allStepsCompleted = false;
              break;
            }

            if (allStepsCompleted) {
              // Find auditor and responsable users for this project and notify them
              const membersRes = await fetch(`/api/projects/${currentProject.id}/members`);
              const membersData = await membersRes.json();
              const allMembers = membersData?.members || [];

              const sStepData = S_STEPS.find(s => s.id === sStep);
              const notifMessage = `Los pasos 1-4 de S${sStep} (${sStepData?.japaneseName || ''}) en la zona "${currentZone.name}" han sido completados. La auditoría (Paso 5) está lista para realizarse.`;

              // Notify auditors
              const auditors = allMembers.filter((m: any) => m.role === 'auditor');
              for (const auditor of auditors) {
                await fetch('/api/notifications', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: auditor.userId,
                    type: 'audit_ready',
                    title: `Auditoría lista: S${sStep} — ${sStepData?.japaneseName || ''}`,
                    message: notifMessage,
                    sStep,
                    zoneId: currentZone.id,
                    projectId: currentProject.id,
                  }),
                });
              }

              // Notify responsable of the zone (from zone.responsableId OR from project members)
              const responsableIds = new Set<string>();
              if (currentZone.responsableId) responsableIds.add(currentZone.responsableId);
              const responsables = allMembers.filter((m: any) => m.role === 'responsable');
              for (const resp of responsables) responsableIds.add(resp.userId);
              for (const respId of responsableIds) {
                await fetch('/api/notifications', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: respId,
                    type: 'audit_ready',
                    title: `Auditoría lista: S${sStep} — ${sStepData?.japaneseName || ''}`,
                    message: notifMessage,
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

        {canSkipSteps && !isCompleted && (
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

        {isReadOnly && !isCompleted && (
          <div className="flex items-center gap-2 p-2 mx-6 flex-shrink-0 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-xs text-blue-700 font-medium">Solo lectura: {canSkipSteps ? 'Activa el candado para poder realizar pasos.' : 'Puedes ver pero no modificar.'}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
        {isLoadingTemplate ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sections.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold mb-2">No hay checklist configurado</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              No se encontró una plantilla de autoevaluación para S{sStep}. 
              Crea una plantilla en <strong>Administración → Plantillas → Auditoría Interna</strong> 
              o pulsa el botón &quot;Crear plantillas por defecto&quot;.
            </p>
          </div>
        ) : isCompleted ? (
          <div className="text-center py-8">
            {passed ? (
              <>
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold mb-2 text-green-700">¡Autoevaluación Aprobada!</h3>
              </>
            ) : (
              <>
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold mb-2 text-red-700">Autoevaluación No Aprobada</h3>
              </>
            )}
            <p className="text-lg mb-1">Puntuación: <strong>{finalScore}%</strong></p>
            <p className="text-sm text-muted-foreground">
              {scoring.okCount} OK / {scoring.nokCount} NOK de {totalItems} puntos de verificación
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Mínimo requerido: {notaMinima}%
            </p>
            {!passed && (
              <p className="text-sm text-amber-600 mt-3">
                Debes obtener al menos {notaMinima}% para desbloquear el Paso 5 (Auditoría). 
                Corrige las disfunciones y vuelve a realizar la autoevaluación.
              </p>
            )}
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

            {/* Fotos de la autoevaluación */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium">Fotos de la autoevaluación</label>
                  </div>
                  <span className="text-xs text-muted-foreground">{autoevalPhotos.length} foto{autoevalPhotos.length !== 1 ? 's' : ''}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Añade fotos de hallazgos o disfunciones detectadas. Se guardarán en la biblioteca con trazabilidad.
                </p>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                <button
                  className="w-full border-2 border-dashed rounded-lg p-4 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs font-medium">Seleccionar fotos</span>
                </button>
                {autoevalPhotos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {autoevalPhotos.map((photo, idx) => (
                      <div key={idx} className="relative group">
                        <img src={photo.preview} alt={`Foto ${idx + 1}`} className="w-full h-20 object-cover rounded-lg border" />
                        <button
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeAutoevalPhoto(idx)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                style={canSubmit ? { backgroundColor: passed ? sStepData?.color : '#dc2626' } : undefined}
              >
                {isSubmitting ? 'Enviando...' : passed ? `Completar Autoevaluación (${scoring.scorePercent}% - Apto)` : `Enviar Autoevaluación (${scoring.scorePercent}% - No Apto, mín. ${notaMinima}%)`}
              </Button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
