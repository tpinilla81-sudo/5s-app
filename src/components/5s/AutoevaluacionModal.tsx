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
import { CheckSquare, CheckCircle, Star } from 'lucide-react';
import { use5SStore } from '@/lib/store';
import { S_STEPS, SELF_EVAL_THRESHOLD } from '@/lib/5s-constants';

interface AutoevaluacionItem {
  description: string;
  maxScore: number;
}

interface AutoevaluacionModalProps {
  open: boolean;
  onClose: () => void;
  sStep: number;
  miniStep: number;
}

export default function AutoevaluacionModal({ open, onClose, sStep, miniStep }: AutoevaluacionModalProps) {
  const { fetchProgress } = use5SStore();
  const sStepData = S_STEPS.find(s => s.id === sStep);

  const [checklistItems, setChecklistItems] = useState<AutoevaluacionItem[]>([]);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    if (open) {
      loadTemplate();
      setScores({});
      setIsCompleted(false);
      setFinalScore(0);
    }
  }, [open, sStep]);

  const loadTemplate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/templates?type=autoevaluacion&sStep=${sStep}`);
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        const content = JSON.parse(json.data[0].content);
        setChecklistItems(content.items || []);
      }
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScoreChange = (index: number, score: number) => {
    setScores(prev => ({ ...prev, [index]: score }));
  };

  const totalMaxScore = checklistItems.reduce((sum, item) => sum + item.maxScore, 0);
  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  const scorePercent = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
  const allScored = Object.keys(scores).length === checklistItems.length;
  const canSubmit = allScored && scorePercent >= SELF_EVAL_THRESHOLD;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/progress/${sStep}/${miniStep}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: true,
          score: scorePercent,
          notes: `Autoevaluación: ${totalScore}/${totalMaxScore} puntos`,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsCompleted(true);
        setFinalScore(scorePercent);
        await fetchProgress();
      }
    } catch (error) {
      console.error('Error submitting self-evaluation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" style={{ color: sStepData?.color }} />
            <span>Autoevaluación</span>
            <Badge variant="outline" style={{ borderColor: sStepData?.color, color: sStepData?.color }}>
              {sStepData?.name}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {isCompleted ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">¡Autoevaluación Completada!</h3>
            <p className="text-lg mb-1">
              Puntuación: <strong>{finalScore}%</strong>
            </p>
            <p className="text-muted-foreground">
              {totalScore} de {totalMaxScore} puntos
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Score indicator */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <span className="text-sm font-medium">Puntuación Total</span>
                <p className="text-xs text-muted-foreground">
                  {totalScore}/{totalMaxScore} puntos
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={scorePercent >= SELF_EVAL_THRESHOLD ? 'default' : 'secondary'}>
                  {scorePercent}% (mín. {SELF_EVAL_THRESHOLD}%)
                </Badge>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-8 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {checklistItems.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium mb-3">{index + 1}. {item.description}</p>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: item.maxScore }, (_, score) => score + 1).map(scoreVal => (
                          <button
                            key={scoreVal}
                            className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all text-sm ${
                              (scores[index] || 0) >= scoreVal
                                ? 'border-green-400 bg-green-50 text-green-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-400'
                            }`}
                            onClick={() => handleScoreChange(index, scoreVal)}
                          >
                            <Star
                              className={`h-4 w-4 ${
                                (scores[index] || 0) >= scoreVal
                                  ? 'fill-green-500 text-green-500'
                                  : 'text-gray-300'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {(scores[index] || 0)}/{item.maxScore}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Submit button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                style={canSubmit ? { backgroundColor: sStepData?.color } : undefined}
              >
                {isSubmitting ? 'Enviando...' : `Completar Autoevaluación (${scorePercent}%)`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
