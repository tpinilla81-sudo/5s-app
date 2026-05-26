'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { use5SStore } from '@/lib/store';
import { S_STEPS } from '@/lib/5s-constants';

interface FormacionModalProps {
  open: boolean;
  onClose: () => void;
  sStep: number;
  miniStep: number;
}

interface FormationSection {
  title: string;
  content: string;
}

interface ExamQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export default function FormacionModal({ open, onClose, sStep, miniStep }: FormacionModalProps) {
  const { fetchProgress, currentUser, adminFreeNavigation, currentProject, currentZone } = use5SStore();
  const sStepData = S_STEPS.find(s => s.id === sStep);
  const isAdmin = currentUser?.role === 'admin' && adminFreeNavigation;

  const [formationContent, setFormationContent] = useState<FormationSection[]>([]);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('formacion');

  // Exam state
  const [examStarted, setExamStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [examResult, setExamResult] = useState<{
    score: number;
    correctCount: number;
    totalQuestions: number;
    passed: boolean;
    results: { questionIdx: number; answerIdx: number; correct: boolean }[];
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadTemplate();
      setActiveTab('formacion');
      setExamStarted(false);
      setAnswers({});
      setExamResult(null);
    }
  }, [open, sStep]);

  const loadTemplate = async () => {
    setIsLoading(true);
    try {
      // Load formation content
      const formRes = await fetch(`/api/templates?type=formacion&sStep=${sStep}`);
      const formJson = await formRes.json();
      if (formJson.success && formJson.data.length > 0) {
        const content = JSON.parse(formJson.data[0].content);
        setFormationContent(content.sections || []);
      }

      // Load exam questions
      const examRes = await fetch(`/api/templates?type=examen&sStep=${sStep}`);
      const examJson = await examRes.json();
      if (examJson.success && examJson.data.length > 0) {
        const content = JSON.parse(examJson.data[0].content);
        setExamQuestions(content.questions || []);
      }
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (questionIdx: number, answerIdx: number) => {
    setAnswers(prev => ({ ...prev, [questionIdx]: answerIdx }));
  };

  const handleSubmitExam = async () => {
    if (Object.keys(answers).length < examQuestions.length) return;

    setIsSubmitting(true);
    try {
      const answersArray = Object.entries(answers).map(([qIdx, aIdx]) => ({
        questionIdx: parseInt(qIdx),
        answerIdx: aIdx,
      }));

      const res = await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sStep, answers: answersArray, projectId: currentProject?.id, zoneId: currentZone?.id || null, userId: currentUser?.id }),
      });

      const json = await res.json();
      if (json.success) {
        setExamResult(json.data);
        if (json.data.passed) {
          await fetchProgress();
        }
      }
    } catch (error) {
      console.error('Error submitting exam:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const allAnswered = Object.keys(answers).length === examQuestions.length;

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
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" style={{ color: sStepData?.color }} />
            <span>Formación + Examen</span>
            <Badge variant="outline" style={{ borderColor: sStepData?.color, color: sStepData?.color }}>
              {sStepData?.name}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
        {isAdmin && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-xs text-amber-700 font-medium">Modo Admin:</span>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={handleAdminSkip}
            >
              Completar paso sin examen
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="formacion">Formación</TabsTrigger>
            <TabsTrigger value="examen" disabled={examResult?.passed}>
              Examen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="formacion" className="mt-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-20 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : formationContent.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay contenido de formación disponible.
              </p>
            ) : (
              <div className="space-y-4">
                {formationContent.map((section, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2" style={{ color: sStepData?.color }}>
                        {section.title}
                      </h3>
                      <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                        {section.content}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <div className="flex justify-end">
                  <Button onClick={() => setActiveTab('examen')} style={{ backgroundColor: sStepData?.color }}>
                    Ir al Examen
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="examen" className="mt-4">
            {examResult ? (
              <div className="space-y-4">
                <Card className={`${examResult.passed ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                  <CardContent className="p-6 text-center">
                    {examResult.passed ? (
                      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />
                    ) : (
                      <XCircle className="h-16 w-16 text-red-500 mx-auto mb-3" />
                    )}
                    <h3 className="text-xl font-bold mb-2">
                      {examResult.passed ? 'Aprobado!' : 'No Aprobado'}
                    </h3>
                    <p className="text-lg mb-1">
                      Puntuación: <strong>{examResult.score}%</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {examResult.correctCount} de {examResult.totalQuestions} respuestas correctas
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mínimo requerido: 80%
                    </p>
                  </CardContent>
                </Card>

                {/* Show results for each question */}
                <div className="space-y-2">
                  {examResult.results.map((result, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 p-2 rounded ${
                        result.correct ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      {result.correct ? (
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                      )}
                      <span className="text-sm">
                        Pregunta {i + 1}: {result.correct ? 'Correcta' : 'Incorrecta'}
                      </span>
                    </div>
                  ))}
                </div>

                {!examResult.passed && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setExamStarted(false);
                        setAnswers({});
                        setExamResult(null);
                      }}
                    >
                      Reintentar Examen
                    </Button>
                  </div>
                )}
              </div>
            ) : !examStarted ? (
              <div className="text-center py-8 space-y-4">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">Examen de Conocimientos</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {examQuestions.length} preguntas de opción múltiple
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Debe obtener al menos 80% para aprobar
                  </p>
                </div>
                <Button
                  onClick={() => setExamStarted(true)}
                  style={{ backgroundColor: sStepData?.color }}
                >
                  Comenzar Examen
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {examQuestions.map((q, qIdx) => (
                  <Card key={qIdx}>
                    <CardContent className="p-4">
                      <p className="font-medium mb-3">
                        {qIdx + 1}. {q.question}
                      </p>
                      <div className="space-y-2">
                        {q.options.map((option, oIdx) => (
                          <button
                            key={oIdx}
                            className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${
                              answers[qIdx] === oIdx
                                ? 'border-primary bg-primary/5 font-medium'
                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                            }`}
                            onClick={() => handleAnswerSelect(qIdx, oIdx)}
                          >
                            <span className="font-medium mr-2">
                              {String.fromCharCode(65 + oIdx)})
                            </span>
                            {option}
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {Object.keys(answers).length}/{examQuestions.length} respuestas
                  </span>
                  <Button
                    onClick={handleSubmitExam}
                    disabled={!allAnswered || isSubmitting}
                    style={{ backgroundColor: sStepData?.color }}
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar Examen'}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
