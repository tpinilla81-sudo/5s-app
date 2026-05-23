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
  Plus,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { use5SStore } from '@/lib/store';
import {
  S_STEPS,
  AUDIT_CHECKLISTS,
  AUDIT_TOTAL_ITEMS,
  AUDIT_PASS_THRESHOLD,
} from '@/lib/5s-constants';
import type { AuditItemResult } from '@/lib/5s-constants';

interface AuditoriaModalProps {
  open: boolean;
  onClose: () => void;
  sStep: number;
  miniStep: number;
}

export default function AuditoriaModal({ open, onClose, sStep, miniStep }: AuditoriaModalProps) {
  const { fetchProgress, currentUser, adminFreeNavigation, currentProject } = use5SStore();
  const sStepData = S_STEPS.find(s => s.id === sStep);
  const sections = AUDIT_CHECKLISTS[sStep] || [];
  const isAdmin = currentUser?.role === 'admin' && adminFreeNavigation;

  const [auditorName, setAuditorName] = useState('');
  const [results, setResults] = useState<Record<string, AuditItemResult>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  // Mejoras realizadas
  const [haMejoras, setHaMejoras] = useState<boolean | null>(null);
  const [mejoras, setMejoras] = useState<Array<{ id: string; descripcion: string; responsable: string; fecha: string }>>([]);

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

  const totalItems = AUDIT_TOTAL_ITEMS[sStep] || 26;

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
    const scorePercent = Math.min(checklistScore + mejorasScore, 100);
    return { okCount, nokCount, answeredCount, checklistScore, mejorasScore, validMejorasCount, scorePercent };
  }, [results, totalItems, haMejoras, mejoras]);

  const canSubmit = auditorName.trim() !== '' && scoring.answeredCount > 0 && scoring.scorePercent >= AUDIT_PASS_THRESHOLD;

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
      // Save audit result
      const auditRes = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sStep,
          auditorName,
          result: scoring.scorePercent >= AUDIT_PASS_THRESHOLD ? 'apto' : 'no_apto',
          score: scoring.scorePercent,
          observations: observaciones || null,
          projectId: currentProject?.id,
        }),
      });

      const auditJson = await auditRes.json();
      if (auditJson.success) {
        // Also mark the mini-step as completed
        const progressRes = await fetch(`/api/progress/step?sStep=${sStep}&miniStep=${miniStep}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            completed: true,
            score: scoring.scorePercent,
            notes: JSON.stringify({
              type: 'auditoria_externa',
              auditor: auditorName,
              results: Object.values(results),
              observaciones,
              mejorasRealizadas: haMejoras,
              mejoras: haMejoras ? mejoras.filter(m => m.descripcion.trim()) : [],
            }),
            projectId: currentProject?.id,
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
        }),
      });
      // Mark progress as completed
      const res = await fetch(`/api/progress/step?sStep=${sStep}&miniStep=${miniStep}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true, score: 100, notes: 'Completado por administrador (skip)', projectId: currentProject?.id }),
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" style={{ color: sStepData?.color }} />
            <span>Auditoría Externa</span>
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
              Completar paso sin auditoría
            </Button>
          </div>
        )}

        {isCompleted ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">¡Auditoría Externa Completada!</h3>
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
            {haMejoras && mejoras.filter(m => m.descripcion.trim()).length > 0 && (
              <div className="mt-4 text-left max-w-md mx-auto">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-800">Mejoras realizadas ({mejoras.filter(m => m.descripcion.trim()).length})</span>
                </div>
                <div className="space-y-2">
                  {mejoras.filter(m => m.descripcion.trim()).map((mejora, idx) => (
                    <div key={mejora.id} className="bg-green-50 border border-green-200 rounded-lg p-2 text-sm">
                      <p className="font-medium text-green-900">{idx + 1}. {mejora.descripcion}</p>
                      {(mejora.responsable || mejora.fecha) && (
                        <p className="text-xs text-green-700 mt-1">
                          {mejora.responsable && <>Responsable: {mejora.responsable}</>}
                          {mejora.responsable && mejora.fecha && <> · </>}
                          {mejora.fecha && <>Fecha: {mejora.fecha}</>}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {finalScore >= AUDIT_PASS_THRESHOLD ? (
              <Badge className="mt-3 bg-green-500">Apto — Mini-paso completado</Badge>
            ) : (
              <Badge className="mt-3 bg-red-500">No Apto — Se requiere corrección</Badge>
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
                El auditor evalúa cada punto (máx. 90%). Cada mejora realizada suma +5% (máx. 2 mejoras = +10%). Para aprobar se necesita ≥{AUDIT_PASS_THRESHOLD}%.
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
                <Badge variant={scoring.scorePercent >= AUDIT_PASS_THRESHOLD ? 'default' : 'secondary'} className="text-base px-3 py-1">
                  {scoring.scorePercent}%
                </Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-blue-100 text-blue-800">Checklist: {scoring.checklistScore}% (máx. 90%)</Badge>
                <Badge className="bg-green-100 text-green-800">Mejoras: +{scoring.mejorasScore}% ({scoring.validMejorasCount} {scoring.validMejorasCount === 1 ? 'mejora' : 'mejoras'}, máx. +10%)</Badge>
                <Badge className="bg-green-100 text-green-800">OK: {scoring.okCount}</Badge>
                <Badge className="bg-red-100 text-red-800">NOK: {scoring.nokCount}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">Mínimo para aprobar: {AUDIT_PASS_THRESHOLD}%</p>
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

            {/* Submit button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                style={canSubmit ? { backgroundColor: sStepData?.color } : undefined}
              >
                {isSubmitting ? 'Enviando...' : `Registrar Auditoría Externa (${scoring.scorePercent}%)`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
