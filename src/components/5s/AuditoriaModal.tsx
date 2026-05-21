'use client';

import { useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShieldCheck, CheckCircle, AlertCircle } from 'lucide-react';
import { use5SStore } from '@/lib/store';
import { S_STEPS, AUDIT_PASS_THRESHOLD } from '@/lib/5s-constants';

interface AuditoriaModalProps {
  open: boolean;
  onClose: () => void;
  sStep: number;
  miniStep: number;
}

export default function AuditoriaModal({ open, onClose, sStep, miniStep }: AuditoriaModalProps) {
  const { fetchProgress } = use5SStore();
  const sStepData = S_STEPS.find(s => s.id === sStep);

  const [auditorName, setAuditorName] = useState('');
  const [score, setScore] = useState('');
  const [result, setResult] = useState<'apto' | 'no_apto' | ''>('');
  const [observations, setObservations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const scoreNum = parseFloat(score) || 0;
  const canSubmit = auditorName.trim() !== '' && result !== '';

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sStep,
          auditorName,
          result,
          score: scoreNum || null,
          observations: observations || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsCompleted(true);
        await fetchProgress();
      }
    } catch (error) {
      console.error('Error submitting audit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAuditorName('');
    setScore('');
    setResult('');
    setObservations('');
    setIsCompleted(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" style={{ color: sStepData?.color }} />
            <span>Auditoría Externa</span>
            <Badge variant="outline" style={{ borderColor: sStepData?.color, color: sStepData?.color }}>
              {sStepData?.name}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {isCompleted ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">¡Auditoría Registrada!</h3>
            <p className="text-muted-foreground mb-2">
              Resultado: <strong>{result === 'apto' ? 'Apto' : 'No Apto'}</strong>
            </p>
            {scoreNum > 0 && (
              <p className="text-muted-foreground">
                Puntuación: <strong>{scoreNum}%</strong>
              </p>
            )}
            {result === 'apto' && scoreNum >= AUDIT_PASS_THRESHOLD && (
              <Badge className="mt-3 bg-green-500">Mini-paso completado</Badge>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Info card */}
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    La auditoría externa debe ser realizada por un evaluador independiente.
                    Para aprobar, la puntuación debe ser ≥{AUDIT_PASS_THRESHOLD}% y el resultado &quot;Apto&quot;.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="auditorName">Nombre del Auditor *</Label>
                <Input
                  id="auditorName"
                  placeholder="Ingrese el nombre del auditor"
                  value={auditorName}
                  onChange={e => setAuditorName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="score">Puntuación (%)</Label>
                <Input
                  id="score"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Ej: 85"
                  value={score}
                  onChange={e => setScore(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Mínimo requerido: {AUDIT_PASS_THRESHOLD}%
                </p>
              </div>

              <div>
                <Label>Resultado *</Label>
                <Select
                  value={result}
                  onValueChange={val => setResult(val as 'apto' | 'no_apto')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el resultado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apto">✅ Apto</SelectItem>
                    <SelectItem value="no_apto">❌ No Apto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="observations">Observaciones</Label>
                <Textarea
                  id="observations"
                  placeholder="Ingrese las observaciones de la auditoría..."
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            {/* Submit button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                style={canSubmit ? { backgroundColor: sStepData?.color } : undefined}
              >
                {isSubmitting ? 'Enviando...' : 'Registrar Auditoría'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
