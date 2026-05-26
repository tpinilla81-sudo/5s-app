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
import { CheckSquare, CheckCircle, Camera, ChevronDown, ChevronRight } from 'lucide-react';
import { use5SStore } from '@/lib/store';
import {
  S_STEPS,
  AUDIT_CHECKLISTS,
  AUDIT_TOTAL_ITEMS,
  SELF_EVAL_THRESHOLD,
} from '@/lib/5s-constants';
import type { AuditSection, AuditItemResult } from '@/lib/5s-constants';

interface AutoevaluacionModalProps {
  open: boolean;
  onClose: () => void;
  sStep: number;
  miniStep: number;
}

export default function AutoevaluacionModal({ open, onClose, sStep, miniStep }: AutoevaluacionModalProps) {
  const { fetchProgress, currentUser, adminFreeNavigation, currentProject, currentZone } = use5SStore();
  const sStepData = S_STEPS.find(s => s.id === sStep);
  const sections = AUDIT_CHECKLISTS[sStep] || [];
  const isAdmin = currentUser?.role === 'admin' && adminFreeNavigation;

  const [results, setResults] = useState<Record<string, AuditItemResult>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

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

  const totalItems = AUDIT_TOTAL_ITEMS[sStep] || 26;

  const scoring = useMemo(() => {
    const allResults = Object.values(results);
    const okCount = allResults.filter(r => r.status === 'ok').length;
    const nokCount = allResults.filter(r => r.status === 'nok').length;
    const answeredCount = okCount + nokCount;
    const scorePercent = totalItems > 0 ? Math.round((okCount / totalItems) * 100) : 0;
    return { okCount, nokCount, answeredCount, scorePercent };
  }, [results, totalItems]);

  const canSubmit = scoring.answeredCount > 0 && scoring.scorePercent >= SELF_EVAL_THRESHOLD;

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

        // Also create EmployeeProgress record for individual step
        if (currentZone?.id && currentUser?.id) {
          try {
            await fetch('/api/employee-progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sStep,
                miniStep,
                completed: true,
                score: scoring.scorePercent,
                projectId: currentProject?.id,
                zoneId: currentZone.id,
                userId: currentUser.id,
              }),
            });
          } catch (epError) {
            console.error('Error creating employee progress:', epError);
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
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" style={{ color: sStepData?.color }} />
            <span>Autoevaluación Interna</span>
            <Badge variant="outline" style={{ borderColor: sStepData?.color, color: sStepData?.color }}>
              {sStepData?.japaneseName} — {sStepData?.spanishName}
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
              Completar paso sin autoevaluación
            </Button>
          </div>
        )}

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
                <Badge variant={scoring.scorePercent >= SELF_EVAL_THRESHOLD ? 'default' : 'secondary'}>
                  {scoring.scorePercent}% (mín. {SELF_EVAL_THRESHOLD}%)
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

                            {/* NOK details: hallazgo + mejora */}
                            {isNok && (
                              <div className="space-y-2 pl-6 border-l-2 border-red-200">
                                <div>
                                  <label className="text-xs font-medium text-red-700">Referencia del hallazgo (desviación)</label>
                                  <Textarea
                                    placeholder="Describa la desviación encontrada..."
                                    value={result?.hallazgo || ''}
                                    onChange={e => setItemField(item.id, 'hallazgo', e.target.value)}
                                    className="text-sm mt-1"
                                    rows={2}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-amber-700">Punto a Mejorar (sugerencia)</label>
                                  <Textarea
                                    placeholder="Sugerencia de mejora..."
                                    value={result?.mejora || ''}
                                    onChange={e => setItemField(item.id, 'mejora', e.target.value)}
                                    className="text-sm mt-1"
                                    rows={2}
                                  />
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
      </DialogContent>
    </Dialog>
  );
}
