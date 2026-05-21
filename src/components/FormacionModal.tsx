'use client'

import { useState, useEffect } from 'react'
import { useAppStore, S_DATA } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { BookOpen, FileQuestion, Award, ChevronRight } from 'lucide-react'

interface Props {
  sStep: number
}

interface TrainingItem {
  title: string
  content: string
}

interface ExamQuestion {
  question: string
  options: string[]
  correctAnswer: number
}

export default function FormacionModal({ sStep }: Props) {
  const { completeMiniStep, closeModal } = useAppStore()
  const sData = S_DATA[sStep - 1]
  const [trainingContent, setTrainingContent] = useState<TrainingItem[]>([])
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([])
  const [examMode, setExamMode] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [examResult, setExamResult] = useState<{ score: number; passed: boolean; correct: number; total: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTemplates()
  }, [sStep])

  const loadTemplates = async () => {
    try {
      const [formRes, examRes] = await Promise.all([
        fetch(`/api/templates?type=formacion&sStep=${sStep}`),
        fetch(`/api/templates?type=examen&sStep=${sStep}`),
      ])
      const formData = await formRes.json()
      const examData = await examRes.json()

      if (formData.length > 0) {
        setTrainingContent(JSON.parse(formData[0].content))
      }
      if (examData.length > 0) {
        setExamQuestions(JSON.parse(examData[0].content))
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerSelect = (questionIdx: number, answerIdx: number) => {
    setAnswers((prev) => ({ ...prev, [questionIdx]: answerIdx }))
  }

  const submitExam = async () => {
    const answerArray = Object.entries(answers).map(([qIdx, aIdx]) => ({
      questionIdx: parseInt(qIdx),
      answerIdx: aIdx,
    }))

    try {
      const res = await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sStep, answers: answerArray }),
      })
      const data = await res.json()

      setExamResult({
        score: data.score,
        passed: data.passed,
        correct: data.correct,
        total: data.total,
      })

      if (data.passed) {
        completeMiniStep(sStep, 1, data.score)
      }
    } catch (error) {
      console.error('Error submitting exam:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: sData.color }} />
      </div>
    )
  }

  if (examResult) {
    return (
      <div className="text-center py-8">
        <div
          className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4"
          style={{ backgroundColor: examResult.passed ? '#22c55e' : '#ef4444' }}
        >
          <Award className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold mb-2">
          {examResult.passed ? '¡Aprobado!' : 'No aprobado'}
        </h3>
        <p className="text-gray-500 mb-2">
          {examResult.correct} de {examResult.total} respuestas correctas
        </p>
        <p className="text-4xl font-black mb-4" style={{ color: examResult.passed ? '#22c55e' : '#ef4444' }}>
          {examResult.score}%
        </p>
        <p className="text-sm text-gray-400 mb-6">
          Nota mínima para aprobar: 80%
        </p>
        {examResult.passed ? (
          <Button onClick={closeModal} className="bg-green-600 hover:bg-green-700">
            Continuar
          </Button>
        ) : (
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => { setExamMode(false); setExamResult(null); setAnswers({}); setCurrentQuestion(0); }}>
              Repasar formación
            </Button>
            <Button onClick={() => { setExamResult(null); setAnswers({}); setCurrentQuestion(0); }} style={{ backgroundColor: sData.color }}>
              Reintentar examen
            </Button>
          </div>
        )}
      </div>
    )
  }

  if (examMode) {
    const question = examQuestions[currentQuestion]
    return (
      <div>
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {examQuestions.map((_, i) => (
            <div
              key={i}
              className="h-2 flex-1 rounded-full"
              style={{
                backgroundColor: i < currentQuestion ? sData.color : i === currentQuestion ? sData.color + '60' : '#e5e7eb',
              }}
            />
          ))}
        </div>

        <p className="text-sm text-gray-400 mb-2">Pregunta {currentQuestion + 1} de {examQuestions.length}</p>
        <h3 className="text-lg font-semibold mb-6">{question?.question}</h3>

        <div className="space-y-3">
          {question?.options.map((option, i) => (
            <button
              key={i}
              onClick={() => handleAnswerSelect(currentQuestion, i)}
              className="w-full text-left p-4 rounded-xl border-2 transition-all"
              style={{
                borderColor: answers[currentQuestion] === i ? sData.color : '#e5e7eb',
                backgroundColor: answers[currentQuestion] === i ? sData.color + '10' : 'white',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    backgroundColor: answers[currentQuestion] === i ? sData.color : '#f3f4f6',
                    color: answers[currentQuestion] === i ? 'white' : '#6b7280',
                  }}
                >
                  {String.fromCharCode(65 + i)}
                </div>
                <span className="font-medium">{option}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
          >
            Anterior
          </Button>
          {currentQuestion < examQuestions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              disabled={answers[currentQuestion] === undefined}
              style={{ backgroundColor: sData.color }}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              onClick={submitExam}
              disabled={Object.keys(answers).length < examQuestions.length}
              className="bg-green-600 hover:bg-green-700"
            >
              Enviar examen
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Training mode
  return (
    <div>
      <Tabs defaultValue="formacion">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="formacion" className="flex-1">
            <BookOpen className="w-4 h-4 mr-2" />
            Formación
          </TabsTrigger>
          <TabsTrigger value="examen" className="flex-1">
            <FileQuestion className="w-4 h-4 mr-2" />
            Examen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formacion">
          <div className="space-y-4">
            {trainingContent.map((item, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge style={{ backgroundColor: sData.color }}>{i + 1}</Badge>
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Button onClick={() => setExamMode(true)} style={{ backgroundColor: sData.color }}>
              Comenzar examen
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="examen">
          <div className="text-center py-8">
            <FileQuestion className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Examen de {sData.name}</h3>
            <p className="text-gray-500 text-sm mb-1">{examQuestions.length} preguntas</p>
            <p className="text-gray-400 text-xs mb-6">Nota mínima: 80% para aprobar</p>
            <Button onClick={() => setExamMode(true)} style={{ backgroundColor: sData.color }}>
              Comenzar examen
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
