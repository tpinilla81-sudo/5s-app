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
import {
  ShieldCheck,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { use5SStore } from '@/lib/store';
import {
  S_STEPS,
  QUARTERLY_AUDIT_CHECKLIST,
  QUARTERLY_AUDIT_TOTAL_ITEMS,
  AUDIT_PASS_THRESHOLD,
} from '@/lib/5s-constants';
import type { AuditItemResult } from '@/lib/5s-constants';

interface QuarterlyAuditModalProps {
  open: boolean;
  onClose: () => void;
}

export default function QuarterlyAuditModal({ open, onClose }: QuarterlyAuditModalProps) {
  const { fetchProgress, currentUser, adminFreeNavigation, currentProject } = use5SStore();
  const sections = QUARTERLY_AUDIT_CHECKLIST;

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
      sections.forEach(s => { expanded[s.id] = false; }); // Start collapsed since there are many
      setExpandedSections(expanded);
      setResults({});
      setAuditorName('');
      setObservaciones('');
      setIsCompleted(false);
      setFinalScore(0);
      setHaMejoras(null);
      setMejoras([]);
    }
  }, [open]);

  const totalItems = QUARTERLY_AUDIT_TOTAL_ITEMS;

  const scoring = useMemo(() => {
    const allResults = Object.values(results);
    const okCount = allResults.filter(r => r.status === 'ok').length;
    const nokCount = allResults.filter(r => r.status === 'nok').length;
    const answeredCount = okCount + nokCount;
    const checklistScore = totalItems > 0 ? Math.round((okCount / totalItems) * 90) : 0;
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

  // Find which S a section belongs to based on section id prefix
  const getSStepForSection = (sectionId: string): number => {
    const prefix = sectionId.split('.')[0];
    return parseInt(prefix, 10) || 1;
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      // Build checklist data for saving (and for NOK → action items)
      const checklistObj: Record<string, any> = {};
      sections.forEach(s => {
        s.items.forEach(item => {
          const r = results[item.id];
          if (r) {
            checklistObj[item.id] = { ...r, description: item.description };
          }
        });
      });

      // Save audit result with sStep=0 (combined quarterly)
      const auditRes = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sStep: 0, // 0 = quarterly combined audit
          auditorName,
          result: scoring.scorePercent >= AUDIT_PASS_THRESHOLD ? 'apto' : 'no_apto',
          score: scoring.scorePercent,
          observations: observaciones || null,
          auditType: 'quarterly',
          checklistData: JSON.stringify(checklistObj),
          mejorasData: haMejoras ? JSON.stringify(mejoras.filter(m => m.descripcion.trim())) : null,
          projectId: currentProject?.id,
        }),
      });

      const auditJson = await auditRes.json();
      if (auditJson.success) {
        setIsCompleted(true);
        setFinalScore(scoring.scorePercent);
        await fetchProgress();
      }
    } catch (error) {
      console.error('Error submitting quarterly audit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group sections by S step for display
  const sectionsByS = useMemo(() => {
    const groups: Record<number, typeof sections> = {};
    sections.forEach(section => {
      const sStep = getSStepForSection(section.id);
      if (!groups[sStep]) groups[sStep] = [];
      groups[sStep].push(section);
    });
    return groups;
  }, [sections]);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-orange-500" />
            <span>Auditoría Trimestral 5S</span>
            <Badge className="bg-orange-100 text-orange-700 border border-orange-200">
              Completa
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {isCompleted ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">¡Auditoría Trimestral Completada!</h3>
            <p className="text-lg mb-1">Puntuación Total: <strong>{finalScore}%</strong></p>
            <div className="flex justify-center gap-3 my-2">
              <Badge className="bg-blue-100 text-blue-800">Checklist: {scoring.checklistScore}%</Badge>
              <Badge className="bg-green-100 text-green-800">Mejoras: +{scoring.mejorasScore}%</Badge>
            </div>
            <p className="text-muted-foreground">
              {scoring.okCount} OK / {scoring.nokCount} NOK de {totalItems} puntos
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
              <Badge className="mt-3 bg-green-500">Apto</Badge>
            ) : (
              <Badge className="mt-3 bg-red-500">No Apto — Se requiere corrección</Badge>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Info banner */}
            <div className="p-3 rounded-lg border-l-4 border-orange-500 bg-orange-50">
              <p className="text-sm font-medium text-orange-700">
                Auditoría Trimestral 5S — Completa
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Se evalúan las 5S de forma conjunta. Checklist máx. 90%, cada mejora +5% (máx. 2). Mínimo para aprobar: {AUDIT_PASS_THRESHOLD}%.
              </p>
            </div>

            {/* Auditor name */}
            <Card>
              <CardContent className="p-4">
                <label className="text-sm font-medium">Nombre del Auditor *</label>
                <Input
                  placeholder="Ingrese el nombre del auditor"
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
                <Badge className="bg-green-100 text-green-800">Mejoras: +{scoring.mejorasScore}% ({scoring.validMejorasCount} {scoring.validMejorasCount === 1 ? 'mejora' : 'mejoras'})</Badge>
                <Badge className="bg-green-100 text-green-800">OK: {scoring.okCount}</Badge>
                <Badge className="bg-red-100 text-red-800">NOK: {scoring.nokCount}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">Mínimo para aprobar: {AUDIT_PASS_THRESHOLD}%</p>
            </div>

            {/* Checklist sections grouped by S */}
            <div className="space-y-4">
              {S_STEPS.map(sStep => {
                const sSections = sectionsByS[sStep.id];
                if (!sSections || sSections.length === 0) return null;
                const sResults = sSections.flatMap(s => s.items.map(item => results[item.id])).filter(Boolean);
                const sOk = sResults.filter(r => r.status === 'ok').length;
                const sNok = sResults.filter(r => r.status === 'nok').length;

                return (
                  <div key={sStep.id}>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sStep.color }} />
                      <span className="text-sm font-bold" style={{ color: sStep.color }}>
                        S{sStep.id} — {sStep.name} ({sStep.japaneseName})
                      </span>
                      <Badge className="bg-green-100 text-green-800 text-[10px]">OK: {sOk}</Badge>
                      <Badge className="bg-red-100 text-red-800 text-[10px]">NOK: {sNok}</Badge>
                    </div>
                    <div className="space-y-2">
                      {sSections.map(section => (
                        <Card key={section.id} className="overflow-hidden">
                          <button
                            className="w-full p-2.5 flex items-center gap-2 hover:bg-muted/50 transition-colors text-left"
                            onClick={() => toggleSection(section.id)}
                          >
                            {expandedSections[section.id] ? (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <Badge variant="outline" className="text-[10px] font-mono">{section.id}</Badge>
                            <span className="font-semibold text-xs">{section.title}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground">
                              {section.items.length} pts
                            </span>
                          </button>
                          {expandedSections[section.id] && (
                            <CardContent className="px-3 pb-3 pt-0 space-y-2">
                              {section.items.map(item => {
                                const result = results[item.id];
                                const isNok = result?.status === 'nok';
                                return (
                                  <div key={item.id} className="border rounded-lg p-2.5 space-y-1.5">
                                    <div className="flex items-start gap-2">
                                      <span className="text-[10px] font-mono text-muted-foreground shrink-0 mt-0.5">{item.id}</span>
                                      <p className="text-xs flex-1">{item.description}</p>
                                      <div className="flex gap-1 shrink-0">
                                        <button
                                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${result?.status === 'ok' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                                          onClick={() => setItemStatus(item.id, 'ok')}
                                        >OK</button>
                                        <button
                                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${result?.status === 'nok' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                                          onClick={() => setItemStatus(item.id, 'nok')}
                                        >NOK</button>
                                        <button
                                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${result?.status === 'na' ? 'bg-gray-500 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                          onClick={() => setItemStatus(item.id, 'na')}
                                        >N/A</button>
                                      </div>
                                    </div>
                                    {item.hasOther && (
                                      <Input placeholder="Especificar..." value={result?.otherText || ''} onChange={e => setItemField(item.id, 'otherText', e.target.value)} className="text-xs h-7" />
                                    )}
                                    {isNok && (
                                      <div className="space-y-1.5 pl-4 border-l-2 border-red-200">
                                        <div>
                                          <label className="text-[10px] font-medium text-red-700">Hallazgo (desviación)</label>
                                          <Textarea placeholder="Desviación encontrada..." value={result?.hallazgo || ''} onChange={e => setItemField(item.id, 'hallazgo', e.target.value)} className="text-xs mt-0.5" rows={2} />
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-medium text-amber-700">Punto a Mejorar</label>
                                          <Textarea placeholder="Sugerencia de mejora..." value={result?.mejora || ''} onChange={e => setItemField(item.id, 'mejora', e.target.value)} className="text-xs mt-0.5" rows={2} />
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
                  </div>
                );
              })}
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
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${haMejoras === true ? 'bg-green-600 text-white' : 'bg-white text-green-700 border border-green-300 hover:bg-green-50'}`}
                    onClick={() => { setHaMejoras(true); if (mejoras.length === 0) setMejoras([{ id: Date.now().toString(), descripcion: '', responsable: '', fecha: '' }]); }}
                  >Sí</button>
                  <button
                    type="button"
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${haMejoras === false ? 'bg-gray-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'}`}
                    onClick={() => { setHaMejoras(false); setMejoras([]); }}
                  >No</button>
                </div>
                {haMejoras && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-green-700">Mejoras ({mejoras.filter(m => m.descripcion.trim()).length})</p>
                      <Button variant="outline" size="sm" className="text-xs border-green-300 text-green-700 hover:bg-green-50 h-7" onClick={() => setMejoras([...mejoras, { id: Date.now().toString(), descripcion: '', responsable: '', fecha: '' }])}>
                        <Plus className="h-3 w-3 mr-1" /> Añadir mejora
                      </Button>
                    </div>
                    {mejoras.map((mejora, idx) => (
                      <div key={mejora.id} className="bg-white border border-green-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-green-700">Mejora {idx + 1}</span>
                          {mejoras.length > 1 && (
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => setMejoras(mejoras.filter(m => m.id !== mejora.id))}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground">Descripción *</label>
                          <Textarea placeholder="Describa la mejora..." value={mejora.descripcion} onChange={e => { const u = [...mejoras]; u[idx] = { ...u[idx], descripcion: e.target.value }; setMejoras(u); }} className="text-sm mt-0.5" rows={2} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-medium text-muted-foreground">Responsable</label>
                            <Input placeholder="Nombre" value={mejora.responsable} onChange={e => { const u = [...mejoras]; u[idx] = { ...u[idx], responsable: e.target.value }; setMejoras(u); }} className="text-sm h-8 mt-0.5" />
                          </div>
                          <div>
                            <label className="text-[10px] font-medium text-muted-foreground">Fecha</label>
                            <Input type="date" value={mejora.fecha} onChange={e => { const u = [...mejoras]; u[idx] = { ...u[idx], fecha: e.target.value }; setMejoras(u); }} className="text-sm h-8 mt-0.5" />
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
                <label className="text-sm font-medium">Observaciones</label>
                <Textarea placeholder="Observaciones adicionales..." value={observaciones} onChange={e => setObservaciones(e.target.value)} className="mt-1" rows={3} />
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting} className="bg-orange-500 hover:bg-orange-600 text-white">
                {isSubmitting ? 'Enviando...' : `Registrar Auditoría Trimestral (${scoring.scorePercent}%)`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
