'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { use5SStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus, Trash2, Edit3, Save, Loader2, BookOpen, FileCheck, ClipboardCheck,
  ChevronDown, ChevronUp, AlertTriangle, Copy, RotateCcw,
  Eye, Code, GripVertical, Download, Upload, ClipboardList, Award,
  Maximize2, Minimize2,
} from 'lucide-react'
import { S_STEPS, AUDIT_CHECKLISTS, EXAM_PASS_THRESHOLD, SELF_EVAL_THRESHOLD, AUDIT_PASS_THRESHOLD, INVENTORY_CONFIGS } from '@/lib/5s-constants'

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════
interface TemplateData {
  id: string
  type: string
  sStep: number
  title: string
  description: string | null
  content: string
  notaMinima: number | null
  active: boolean
  createdAt: string
  updatedAt: string
}

type TemplateTab = 'formacion' | 'inventarios' | 'estandares' | 'auditorias'

const TEMPLATE_TABS: { key: TemplateTab; label: string; icon: React.ComponentType<{ className?: string }>; types: string[] }[] = [
  { key: 'formacion', label: 'Formaciones y Exámenes', icon: BookOpen, types: ['formacion', 'examen'] },
  { key: 'inventarios', label: 'Inventarios', icon: ClipboardList, types: ['inventario'] },
  { key: 'estandares', label: 'Estándares', icon: Award, types: ['estandar'] },
  { key: 'auditorias', label: 'Auditorías', icon: ClipboardCheck, types: ['autoevaluacion', 'auditoria'] },
]

const S_COLORS: Record<number, string> = { 1: '#8B5CF6', 2: '#EAB308', 3: '#3B82F6', 4: '#F43F5E', 5: '#22C55E' }

// ═══════════════════════════════════════════════════════
// DEFAULT CONTENT GENERATORS
// ═══════════════════════════════════════════════════════
function getDefaultFormationContent(sStep: number) {
  const s = S_STEPS.find(s => s.id === sStep)
  return {
    sections: [
      { title: `¿Qué es ${s?.japaneseName || 'S' + sStep}?`, content: `Explicación detallada de ${s?.spanishName || 'la S' + sStep} (${s?.japaneseName || 'S' + sStep}). Describe los objetivos, metodología y beneficios de esta S en el lugar de trabajo.` },
      { title: 'Objetivos', content: 'Lista de objetivos específicos que se persiguen con la implementación de esta S en el entorno laboral.' },
      { title: 'Metodología', content: 'Pasos a seguir para implementar correctamente esta S en el lugar de trabajo.' },
      { title: 'Beneficios esperados', content: 'Descripción de los beneficios que se obtienen al aplicar correctamente esta S.' },
    ]
  }
}

function getDefaultExamContent(sStep: number) {
  const s = S_STEPS.find(s => s.id === sStep)
  return {
    questions: [
      { question: `¿Cuál es el objetivo principal de ${s?.japaneseName || 'S' + sStep}?`, options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'], correctIndex: 0 },
      { question: `¿Qué significa ${s?.spanishName || 'la S' + sStep}?`, options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'], correctIndex: 1 },
      { question: '¿Cuál es el primer paso para implementar esta S?', options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'], correctIndex: 2 },
      { question: '¿Qué beneficio aporta esta S al lugar de trabajo?', options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'], correctIndex: 0 },
      { question: '¿Cómo se mantiene el resultado de esta S?', options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'], correctIndex: 1 },
    ]
  }
}

function getDefaultChecklistContent(sStep: number) {
  const checklist = AUDIT_CHECKLISTS[sStep]
  if (!checklist) return { sections: [] }
  return {
    sections: checklist.map(section => ({
      id: section.id,
      title: section.title,
      items: section.items.map(item => ({
        id: item.id,
        description: item.description,
        hasOther: item.hasOther || false,
      }))
    }))
  }
}

function getDefaultInventoryContent(sStep: number) {
  const cfg = INVENTORY_CONFIGS[sStep]
  if (!cfg) return { categories: [], extraFields: [] }
  return {
    categories: cfg.categories.map(c => ({ value: c.value, label: c.label, color: c.color })),
    extraFields: cfg.extraFields.map(f => ({
      key: f.key, label: f.label, type: f.type,
      ...(f.options ? { options: f.options } : {}),
    })),
  }
}

function getDefaultStandardContent() {
  return {
    fields: [
      { key: 'beforePhotoUrl', label: 'Foto Antes', type: 'photo', required: true },
      { key: 'afterPhotoUrl', label: 'Foto Después', type: 'photo', required: true },
      { key: 'responsable', label: 'Quién lo ha hecho', type: 'text', required: true },
      { key: 'contacto', label: 'Contacto', type: 'text', required: true },
      { key: 'mejoraTipo', label: 'Tipo de Mejora', type: 'select', options: ['Seguridad', 'Calidad', 'Proceso', 'Logística'], required: true },
    ],
  }
}

// ═══════════════════════════════════════════════════════
// VISUAL EDITOR: ChecklistEditor (autoevaluacion / auditoria)
// ═══════════════════════════════════════════════════════
interface ChecklistSection {
  id: string
  title: string
  items: { id: string; description: string; hasOther: boolean }[]
}

function ChecklistEditor({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  let parsed: { sections: ChecklistSection[] }
  try {
    parsed = JSON.parse(content)
  } catch {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
        El JSON no es válido. Corrígelo en modo JSON o carga el contenido por defecto.
      </div>
    )
  }

  const sections = parsed.sections || []
  const sPrefix = String(content.match(/"id"\s*:\s*"(\d+)\./)?.[1] || '1')

  const update = (newSections: ChecklistSection[]) => {
    onChange(JSON.stringify({ ...parsed, sections: newSections }, null, 2))
  }

  const addSection = () => {
    const newId = `${sPrefix}.${sections.length + 1}`
    update([...sections, { id: newId, title: 'Nueva Sección', items: [] }])
  }

  const removeSection = (idx: number) => {
    update(sections.filter((_, i) => i !== idx))
  }

  const updateSection = (idx: number, field: 'id' | 'title', value: string) => {
    const updated = [...sections]
    updated[idx] = { ...updated[idx], [field]: value }
    update(updated)
  }

  const moveSection = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= sections.length) return
    const updated = [...sections]
    ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
    update(updated)
  }

  const addItem = (sectionIdx: number) => {
    const sec = sections[sectionIdx]
    const newItemId = `${sec.id}.${sec.items.length + 1}`
    const updated = [...sections]
    updated[sectionIdx] = {
      ...updated[sectionIdx],
      items: [...updated[sectionIdx].items, { id: newItemId, description: '', hasOther: false }]
    }
    update(updated)
  }

  const removeItem = (sectionIdx: number, itemIdx: number) => {
    const updated = [...sections]
    updated[sectionIdx] = {
      ...updated[sectionIdx],
      items: updated[sectionIdx].items.filter((_, i) => i !== itemIdx)
    }
    update(updated)
  }

  const updateItem = (sectionIdx: number, itemIdx: number, field: string, value: string | boolean) => {
    const updated = [...sections]
    updated[sectionIdx] = {
      ...updated[sectionIdx],
      items: updated[sectionIdx].items.map((item, i) =>
        i === itemIdx ? { ...item, [field]: value } : item
      )
    }
    update(updated)
  }

  const moveItem = (sectionIdx: number, itemIdx: number, dir: -1 | 1) => {
    const items = sections[sectionIdx].items
    const target = itemIdx + dir
    if (target < 0 || target >= items.length) return
    const updated = [...sections]
    const newItems = [...updated[sectionIdx].items]
    ;[newItems[itemIdx], newItems[target]] = [newItems[target], newItems[itemIdx]]
    updated[sectionIdx] = { ...updated[sectionIdx], items: newItems }
    update(updated)
  }

  return (
    <div className="space-y-4">
      {sections.map((section, sIdx) => (
        <div key={sIdx} className="border-2 rounded-lg overflow-hidden bg-white shadow-sm">
          {/* Section header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveSection(sIdx, -1)} className="text-gray-400 hover:text-gray-600 leading-none" title="Subir sección">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button onClick={() => moveSection(sIdx, 1)} className="text-gray-400 hover:text-gray-600 leading-none" title="Bajar sección">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <Input
              value={section.id}
              onChange={(e) => updateSection(sIdx, 'id', e.target.value)}
              className="w-20 h-9 text-sm font-mono"
              placeholder="ID"
            />
            <Input
              value={section.title}
              onChange={(e) => updateSection(sIdx, 'title', e.target.value)}
              className="flex-1 h-9 text-base font-semibold"
              placeholder="Título de sección"
            />
            <Button variant="ghost" size="sm" onClick={() => addItem(sIdx)}
              className="h-9 w-9 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" title="Añadir item">
              <Plus className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => removeSection(sIdx)}
              className="h-9 w-9 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" title="Eliminar sección">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Items */}
          <div className="p-3 space-y-2">
            {section.items.length === 0 && (
              <p className="text-sm text-muted-foreground italic px-2 py-2">Sin items. Pulsa + para añadir.</p>
            )}
            {section.items.map((item, iIdx) => (
              <div key={iIdx} className="flex items-center gap-3 group">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveItem(sIdx, iIdx, -1)} className="text-gray-300 hover:text-gray-500 leading-none" title="Subir">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => moveItem(sIdx, iIdx, 1)} className="text-gray-300 hover:text-gray-500 leading-none" title="Bajar">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Input
                  value={item.id}
                  onChange={(e) => updateItem(sIdx, iIdx, 'id', e.target.value)}
                  className="w-20 h-8 text-xs font-mono"
                  placeholder="ID"
                />
                <Input
                  value={item.description}
                  onChange={(e) => updateItem(sIdx, iIdx, 'description', e.target.value)}
                  className="flex-1 h-8 text-sm"
                  placeholder="Descripción del item"
                />
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={item.hasOther}
                    onChange={(e) => updateItem(sIdx, iIdx, 'hasOther', e.target.checked)}
                    className="rounded border-gray-300 h-4 w-4"
                  />
                  Otros
                </label>
                <Button variant="ghost" size="sm"
                  onClick={() => removeItem(sIdx, iIdx)}
                  className="h-8 w-8 p-0 text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addSection}
        className="w-full border-dashed border-2 text-green-600 hover:bg-green-50 hover:border-green-400 gap-1 h-10">
        <Plus className="h-5 w-5" />
        Añadir sección
      </Button>

      <div className="text-sm text-muted-foreground text-center">
        {sections.length} sección(es) · {sections.reduce((s, sec) => s + sec.items.length, 0)} item(s) en total
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// VISUAL EDITOR: ExamEditor (examen)
// ═══════════════════════════════════════════════════════
function ExamEditor({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  let parsed: { questions: { question: string; options: string[]; correctIndex: number }[] }
  try {
    parsed = JSON.parse(content)
  } catch {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
        El JSON no es válido. Corrígelo en modo JSON o carga el contenido por defecto.
      </div>
    )
  }

  const questions = parsed.questions || []

  const update = (newQuestions: typeof questions) => {
    onChange(JSON.stringify({ ...parsed, questions: newQuestions }, null, 2))
  }

  const addQuestion = () => {
    update([...questions, { question: '', options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'], correctIndex: 0 }])
  }

  const removeQuestion = (idx: number) => {
    update(questions.filter((_, i) => i !== idx))
  }

  const updateQuestion = (idx: number, field: string, value: any) => {
    const updated = [...questions]
    updated[idx] = { ...updated[idx], [field]: value }
    update(updated)
  }

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    const updated = [...questions]
    updated[qIdx] = { ...updated[qIdx], options: updated[qIdx].options.map((o, i) => i === oIdx ? value : o) }
    update(updated)
  }

  const addOption = (qIdx: number) => {
    const updated = [...questions]
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const newIdx = updated[qIdx].options.length
    updated[qIdx] = { ...updated[qIdx], options: [...updated[qIdx].options, `Opción ${letters[newIdx] || newIdx + 1}`] }
    update(updated)
  }

  const removeOption = (qIdx: number, oIdx: number) => {
    const updated = [...questions]
    const newOptions = updated[qIdx].options.filter((_, i) => i !== oIdx)
    let newCorrect = updated[qIdx].correctIndex
    if (newCorrect >= newOptions.length) newCorrect = 0
    else if (newCorrect > oIdx) newCorrect--
    updated[qIdx] = { ...updated[qIdx], options: newOptions, correctIndex: newCorrect }
    update(updated)
  }

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= questions.length) return
    const updated = [...questions]
    ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
    update(updated)
  }

  return (
    <div className="space-y-4">
      {questions.map((q, qIdx) => (
        <div key={qIdx} className="border-2 rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border-b border-amber-200">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveQuestion(qIdx, -1)} className="text-gray-400 hover:text-gray-600 leading-none">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button onClick={() => moveQuestion(qIdx, 1)} className="text-gray-400 hover:text-gray-600 leading-none">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <Badge className="bg-amber-200 text-amber-800 shrink-0 text-sm px-2 py-0.5">P{qIdx + 1}</Badge>
            <Input
              value={q.question}
              onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
              className="flex-1 h-9 text-base"
              placeholder="Pregunta"
            />
            <Button variant="ghost" size="sm" onClick={() => removeQuestion(qIdx)}
              className="h-9 w-9 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" title="Eliminar pregunta">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-4 space-y-2">
            {q.options.map((opt, oIdx) => (
              <div key={oIdx} className="flex items-center gap-3 group">
                <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                  <input
                    type="radio"
                    name={`correct-${qIdx}`}
                    checked={q.correctIndex === oIdx}
                    onChange={() => updateQuestion(qIdx, 'correctIndex', oIdx)}
                    className="h-4 w-4 text-green-600"
                  />
                  <span className="text-xs text-muted-foreground w-5 font-semibold">{String.fromCharCode(65 + oIdx)}</span>
                </label>
                <Input
                  value={opt}
                  onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                  className={`flex-1 h-8 text-sm ${q.correctIndex === oIdx ? 'border-green-400 bg-green-50' : ''}`}
                />
                <Button variant="ghost" size="sm"
                  onClick={() => removeOption(qIdx, oIdx)}
                  className="h-8 w-8 p-0 text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  title="Eliminar opción">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => addOption(qIdx)}
              className="h-8 text-sm text-blue-500 hover:text-blue-600 gap-1 px-3">
              <Plus className="h-4 w-4" /> Añadir opción
            </Button>
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addQuestion}
        className="w-full border-dashed border-2 text-amber-600 hover:bg-amber-50 hover:border-amber-400 gap-1 h-10">
        <Plus className="h-5 w-5" />
        Añadir pregunta
      </Button>

      <div className="text-sm text-muted-foreground text-center">
        {questions.length} pregunta(s)
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// VISUAL EDITOR: FormationEditor (formacion)
// ═══════════════════════════════════════════════════════
function FormationEditor({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  let parsed: { sections: { title: string; content: string }[] }
  try {
    parsed = JSON.parse(content)
  } catch {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
        El JSON no es válido. Corrígelo en modo JSON o carga el contenido por defecto.
      </div>
    )
  }

  const sections = parsed.sections || []

  const update = (newSections: typeof sections) => {
    onChange(JSON.stringify({ ...parsed, sections: newSections }, null, 2))
  }

  const addSection = () => {
    update([...sections, { title: '', content: '' }])
  }

  const removeSection = (idx: number) => {
    update(sections.filter((_, i) => i !== idx))
  }

  const updateSection = (idx: number, field: 'title' | 'content', value: string) => {
    const updated = [...sections]
    updated[idx] = { ...updated[idx], [field]: value }
    update(updated)
  }

  const moveSection = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= sections.length) return
    const updated = [...sections]
    ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
    update(updated)
  }

  return (
    <div className="space-y-4">
      {sections.map((sec, idx) => (
        <div key={idx} className="border-2 rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border-b border-blue-200">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveSection(idx, -1)} className="text-gray-400 hover:text-gray-600 leading-none">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button onClick={() => moveSection(idx, 1)} className="text-gray-400 hover:text-gray-600 leading-none">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <Badge className="bg-blue-200 text-blue-800 shrink-0 text-sm px-2 py-0.5">Sección {idx + 1}</Badge>
            <Input
              value={sec.title}
              onChange={(e) => updateSection(idx, 'title', e.target.value)}
              className="flex-1 h-9 text-base font-semibold"
              placeholder="Título de la sección"
            />
            <Button variant="ghost" size="sm" onClick={() => removeSection(idx)}
              className="h-9 w-9 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" title="Eliminar sección">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4">
            <textarea
              value={sec.content}
              onChange={(e) => updateSection(idx, 'content', e.target.value)}
              className="w-full h-28 p-3 border rounded-lg text-sm resize-y focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
              placeholder="Contenido de la sección..."
            />
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addSection}
        className="w-full border-dashed border-2 text-blue-600 hover:bg-blue-50 hover:border-blue-400 gap-1 h-10">
        <Plus className="h-5 w-5" />
        Añadir sección
      </Button>

      <div className="text-sm text-muted-foreground text-center">
        {sections.length} sección(es) de formación
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// VISUAL EDITOR: InventoryConfigEditor (inventario)
// ═══════════════════════════════════════════════════════
interface InvCategory { value: string; label: string; color: string }
interface InvField { key: string; label: string; type: 'select' | 'text' | 'number'; options?: string[] }

function InventoryConfigEditor({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  let parsed: { categories: InvCategory[]; extraFields: InvField[] }
  try {
    parsed = JSON.parse(content)
  } catch {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
        El JSON no es válido. Corrígelo en modo JSON o carga el contenido por defecto.
      </div>
    )
  }

  const categories = parsed.categories || []
  const extraFields = parsed.extraFields || []

  const update = (newData: Partial<typeof parsed>) => {
    onChange(JSON.stringify({ ...parsed, ...newData }, null, 2))
  }

  const addCategory = () => {
    update({ categories: [...categories, { value: '', label: '', color: 'bg-gray-100 text-gray-800' }] })
  }

  const removeCategory = (idx: number) => {
    update({ categories: categories.filter((_, i) => i !== idx) })
  }

  const updateCategory = (idx: number, field: keyof InvCategory, value: string) => {
    const updated = [...categories]
    updated[idx] = { ...updated[idx], [field]: value }
    update({ categories: updated })
  }

  const moveCategory = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= categories.length) return
    const updated = [...categories]
    ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
    update({ categories: updated })
  }

  const addField = () => {
    update({ extraFields: [...extraFields, { key: '', label: '', type: 'text' }] })
  }

  const removeField = (idx: number) => {
    update({ extraFields: extraFields.filter((_, i) => i !== idx) })
  }

  const updateField = (idx: number, field: string, value: string | boolean) => {
    const updated = [...extraFields]
    updated[idx] = { ...updated[idx], [field]: value }
    // Remove options if type is not select
    if (field === 'type' && value !== 'select') {
      const { options, ...rest } = updated[idx]
      updated[idx] = rest as InvField
    }
    update({ extraFields: updated })
  }

  const moveField = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= extraFields.length) return
    const updated = [...extraFields]
    ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
    update({ extraFields: updated })
  }

  const addOption = (fIdx: number) => {
    const updated = [...extraFields]
    const opts = [...(updated[fIdx].options || []), '']
    updated[fIdx] = { ...updated[fIdx], options: opts }
    update({ extraFields: updated })
  }

  const removeOption = (fIdx: number, oIdx: number) => {
    const updated = [...extraFields]
    const opts = (updated[fIdx].options || []).filter((_, i) => i !== oIdx)
    updated[fIdx] = { ...updated[fIdx], options: opts }
    update({ extraFields: updated })
  }

  const updateOption = (fIdx: number, oIdx: number, value: string) => {
    const updated = [...extraFields]
    const opts = [...(updated[fIdx].options || [])]
    opts[oIdx] = value
    updated[fIdx] = { ...updated[fIdx], options: opts }
    update({ extraFields: updated })
  }

  const COLOR_PRESETS = [
    'bg-green-100 text-green-800', 'bg-blue-100 text-blue-800', 'bg-yellow-100 text-yellow-800',
    'bg-red-100 text-red-800', 'bg-purple-100 text-purple-800', 'bg-orange-100 text-orange-800',
    'bg-gray-100 text-gray-800', 'bg-cyan-100 text-cyan-800', 'bg-amber-100 text-amber-800',
    'bg-teal-100 text-teal-800', 'bg-pink-100 text-pink-800',
  ]

  return (
    <div className="space-y-6">
      {/* CATEGORIES */}
      <div>
        <h4 className="text-sm font-bold text-orange-700 mb-2 flex items-center gap-2">
          <Badge className="bg-orange-100 text-orange-800">Categorías</Badge>
          {categories.length} categoría(s)
        </h4>
        <div className="space-y-2">
          {categories.map((cat, idx) => (
            <div key={idx} className="flex items-center gap-2 group border rounded-lg p-2 bg-white">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveCategory(idx, -1)} className="text-gray-300 hover:text-gray-500 leading-none">
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => moveCategory(idx, 1)} className="text-gray-300 hover:text-gray-500 leading-none">
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <Input value={cat.value} onChange={e => updateCategory(idx, 'value', e.target.value)}
                className="w-32 h-8 text-xs" placeholder="Valor (ej: muy_frecuente)" />
              <Input value={cat.label} onChange={e => updateCategory(idx, 'label', e.target.value)}
                className="flex-1 h-8 text-xs" placeholder="Etiqueta (ej: Muy frecuente)" />
              <select value={cat.color} onChange={e => updateCategory(idx, 'color', e.target.value)}
                className="h-8 text-xs border rounded px-1 max-w-[180px]">
                {COLOR_PRESETS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <Badge className={cat.color}>{cat.label || 'Preview'}</Badge>
              <Button variant="ghost" size="sm" onClick={() => removeCategory(idx)}
                className="h-8 w-8 p-0 text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addCategory} size="sm"
            className="w-full border-dashed border-2 text-orange-600 hover:bg-orange-50 hover:border-orange-400 gap-1">
            <Plus className="h-4 w-4" /> Añadir categoría
          </Button>
        </div>
      </div>

      {/* EXTRA FIELDS */}
      <div>
        <h4 className="text-sm font-bold text-teal-700 mb-2 flex items-center gap-2">
          <Badge className="bg-teal-100 text-teal-800">Campos extra</Badge>
          {extraFields.length} campo(s)
        </h4>
        <div className="space-y-2">
          {extraFields.map((field, fIdx) => (
            <div key={fIdx} className="border-2 rounded-lg overflow-hidden bg-white shadow-sm">
              <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border-b border-teal-200">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveField(fIdx, -1)} className="text-gray-300 hover:text-gray-500 leading-none">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => moveField(fIdx, 1)} className="text-gray-300 hover:text-gray-500 leading-none">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Badge className="bg-teal-200 text-teal-800 shrink-0 text-[10px] px-1.5 py-0.5">Campo {fIdx + 1}</Badge>
                <Input value={field.key} onChange={e => updateField(fIdx, 'key', e.target.value)}
                  className="w-36 h-7 text-xs font-mono" placeholder="key (ej: ubicacion)" />
                <Input value={field.label} onChange={e => updateField(fIdx, 'label', e.target.value)}
                  className="flex-1 h-7 text-xs" placeholder="Etiqueta (ej: Ubicación asignada)" />
                <select value={field.type} onChange={e => updateField(fIdx, 'type', e.target.value)}
                  className="h-7 text-xs border rounded px-2">
                  <option value="text">Texto</option>
                  <option value="number">Número</option>
                  <option value="select">Selección</option>
                </select>
                <Button variant="ghost" size="sm" onClick={() => removeField(fIdx)}
                  className="h-7 w-7 p-0 text-red-400 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {field.type === 'select' && (
                <div className="px-3 py-2 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Opciones:</Label>
                  {(field.options || []).map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-1">
                      <Input value={opt} onChange={e => updateOption(fIdx, oIdx, e.target.value)}
                        className="flex-1 h-7 text-xs" placeholder={`Opción ${oIdx + 1}`} />
                      <Button variant="ghost" size="sm" onClick={() => removeOption(fIdx, oIdx)}
                        className="h-7 w-7 p-0 text-red-300 hover:text-red-500">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => addOption(fIdx)}
                    className="h-7 text-xs text-teal-600 hover:text-teal-700 gap-1 px-2">
                    <Plus className="h-3 w-3" /> Añadir opción
                  </Button>
                </div>
              )}
            </div>
          ))}
          <Button variant="outline" onClick={addField} size="sm"
            className="w-full border-dashed border-2 text-teal-600 hover:bg-teal-50 hover:border-teal-400 gap-1">
            <Plus className="h-4 w-4" /> Añadir campo extra
          </Button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// VISUAL EDITOR: StandardTemplateEditor (estandar)
// ═══════════════════════════════════════════════════════
interface StdField { key: string; label: string; type: 'photo' | 'text' | 'number' | 'select'; options?: string[]; required?: boolean }

function StandardTemplateEditor({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  let parsed: { fields: StdField[] }
  try {
    parsed = JSON.parse(content)
  } catch {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
        El JSON no es válido. Corrígelo en modo JSON o carga el contenido por defecto.
      </div>
    )
  }

  const fields = parsed.fields || []

  const update = (newFields: StdField[]) => {
    onChange(JSON.stringify({ ...parsed, fields: newFields }, null, 2))
  }

  const addField = () => {
    update([...fields, { key: '', label: '', type: 'text', required: false }])
  }

  const removeField = (idx: number) => {
    update(fields.filter((_, i) => i !== idx))
  }

  const updateField = (idx: number, field: string, value: string | boolean) => {
    const updated = [...fields]
    updated[idx] = { ...updated[idx], [field]: value }
    // Remove options if type is not select
    if (field === 'type' && value !== 'select') {
      const { options, ...rest } = updated[idx]
      updated[idx] = rest as StdField
    }
    update(updated)
  }

  const moveField = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= fields.length) return
    const updated = [...fields]
    ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
    update(updated)
  }

  const addOption = (fIdx: number) => {
    const updated = [...fields]
    const opts = [...(updated[fIdx].options || []), '']
    updated[fIdx] = { ...updated[fIdx], options: opts }
    update(updated)
  }

  const removeOption = (fIdx: number, oIdx: number) => {
    const updated = [...fields]
    const opts = (updated[fIdx].options || []).filter((_, i) => i !== oIdx)
    updated[fIdx] = { ...updated[fIdx], options: opts }
    update(updated)
  }

  const updateOption = (fIdx: number, oIdx: number, value: string) => {
    const updated = [...fields]
    const opts = [...(updated[fIdx].options || [])]
    opts[oIdx] = value
    updated[fIdx] = { ...updated[fIdx], options: opts }
    update(updated)
  }

  const TYPE_LABELS: Record<string, string> = { photo: 'Foto', text: 'Texto', number: 'Número', select: 'Selección' }

  return (
    <div className="space-y-3">
      {fields.map((field, fIdx) => (
        <div key={fIdx} className="border-2 rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border-b border-violet-200">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveField(fIdx, -1)} className="text-gray-300 hover:text-gray-500 leading-none">
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => moveField(fIdx, 1)} className="text-gray-300 hover:text-gray-500 leading-none">
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <Badge className="bg-violet-200 text-violet-800 shrink-0 text-[10px] px-1.5 py-0.5">Campo {fIdx + 1}</Badge>
            <Input value={field.key} onChange={e => updateField(fIdx, 'key', e.target.value)}
              className="w-36 h-7 text-xs font-mono" placeholder="key (ej: beforePhotoUrl)" />
            <Input value={field.label} onChange={e => updateField(fIdx, 'label', e.target.value)}
              className="flex-1 h-7 text-xs" placeholder="Etiqueta (ej: Foto Antes)" />
            <select value={field.type} onChange={e => updateField(fIdx, 'type', e.target.value)}
              className="h-7 text-xs border rounded px-2">
              <option value="text">Texto</option>
              <option value="number">Número</option>
              <option value="select">Selección</option>
              <option value="photo">Foto</option>
            </select>
            <label className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap cursor-pointer">
              <input type="checkbox" checked={field.required || false}
                onChange={e => updateField(fIdx, 'required', e.target.checked)}
                className="rounded border-gray-300 h-3.5 w-3.5" />
              Oblig.
            </label>
            <Button variant="ghost" size="sm" onClick={() => removeField(fIdx)}
              className="h-7 w-7 p-0 text-red-400 hover:text-red-500">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          {field.type === 'select' && (
            <div className="px-3 py-2 space-y-1">
              <Label className="text-[10px] text-muted-foreground">Opciones:</Label>
              {(field.options || []).map((opt, oIdx) => (
                <div key={oIdx} className="flex items-center gap-1">
                  <Input value={opt} onChange={e => updateOption(fIdx, oIdx, e.target.value)}
                    className="flex-1 h-7 text-xs" placeholder={`Opción ${oIdx + 1}`} />
                  <Button variant="ghost" size="sm" onClick={() => removeOption(fIdx, oIdx)}
                    className="h-7 w-7 p-0 text-red-300 hover:text-red-500">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => addOption(fIdx)}
                className="h-7 text-xs text-violet-600 hover:text-violet-700 gap-1 px-2">
                <Plus className="h-3 w-3" /> Añadir opción
              </Button>
            </div>
          )}
        </div>
      ))}

      <Button variant="outline" onClick={addField} size="sm"
        className="w-full border-dashed border-2 text-violet-600 hover:bg-violet-50 hover:border-violet-400 gap-1">
        <Plus className="h-4 w-4" /> Añadir campo
      </Button>

      <div className="text-sm text-muted-foreground text-center">
        {fields.length} campo(s) · {fields.filter(f => f.required).length} obligatorio(s)
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
export default function TemplateManager() {
  const { currentProject } = use5SStore()
  const [activeTab, setActiveTab] = useState<TemplateTab>('formacion')
  const [templates, setTemplates] = useState<TemplateData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TemplateData | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [expandedS, setExpandedS] = useState<number | null>(null)
  const [editorMode, setEditorMode] = useState<'visual' | 'json'>('visual')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Form state
  const [formType, setFormType] = useState<string>('formacion')
  const [formSStep, setFormSStep] = useState<number>(1)
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formNotaMinima, setFormNotaMinima] = useState<number>(70)
  const [formActive, setFormActive] = useState(true)

  const tabConfig = TEMPLATE_TABS.find(t => t.key === activeTab)!

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true)
    try {
      const types = tabConfig.types
      const allTemplates: TemplateData[] = []
      for (const type of types) {
        const res = await fetch(`/api/templates?type=${type}&includeInactive=true`)
        const data = await res.json()
        if (data.success && data.data) allTemplates.push(...data.data)
      }
      setTemplates(allTemplates)
    } catch (e) { console.error('Error fetching templates:', e) }
    finally { setIsLoading(false) }
  }, [tabConfig.types])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const resetForm = () => {
    setFormType(tabConfig.types[0])
    setFormSStep(1)
    setFormTitle('')
    setFormDescription('')
    setFormContent('')
    setFormNotaMinima(activeTab === 'formacion' ? EXAM_PASS_THRESHOLD : AUDIT_PASS_THRESHOLD)
    setFormActive(true)
    setEditingTemplate(null)
    setIsCreating(false)
    setEditorMode('visual')
    setIsFullscreen(false)
  }

  const startCreate = (sStep: number, type: string) => {
    setIsCreating(true)
    setFormType(type)
    setFormSStep(sStep)
    setFormTitle(`S${sStep} - ${S_STEPS.find(s => s.id === sStep)?.japaneseName || ''}`)
    setFormDescription('')
    setFormNotaMinima(type === 'formacion' || type === 'examen' ? EXAM_PASS_THRESHOLD : type === 'autoevaluacion' ? SELF_EVAL_THRESHOLD : type === 'inventario' || type === 'estandar' ? 0 : AUDIT_PASS_THRESHOLD)
    setFormActive(true)
    setEditorMode('visual')

    if (type === 'formacion') {
      setFormContent(JSON.stringify(getDefaultFormationContent(sStep), null, 2))
    } else if (type === 'examen') {
      setFormContent(JSON.stringify(getDefaultExamContent(sStep), null, 2))
    } else if (type === 'inventario') {
      setFormContent(JSON.stringify(getDefaultInventoryContent(sStep), null, 2))
    } else if (type === 'estandar') {
      setFormContent(JSON.stringify(getDefaultStandardContent(), null, 2))
    } else {
      setFormContent(JSON.stringify(getDefaultChecklistContent(sStep), null, 2))
    }
  }

  const startEdit = (template: TemplateData) => {
    setEditingTemplate(template)
    setFormType(template.type)
    setFormSStep(template.sStep)
    setFormTitle(template.title)
    setFormDescription(template.description || '')
    setFormContent(typeof template.content === 'string' ? template.content : JSON.stringify(template.content, null, 2))
    setFormNotaMinima(template.notaMinima ?? (template.type === 'autoevaluacion' ? SELF_EVAL_THRESHOLD : template.type === 'auditoria' ? AUDIT_PASS_THRESHOLD : EXAM_PASS_THRESHOLD))
    setFormActive(template.active)
    setIsCreating(true)
    setEditorMode('visual')
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Validate JSON
      try { JSON.parse(formContent) } catch { alert('El contenido JSON no es válido. Revísalo.'); setIsSaving(false); return }

      const payload = {
        type: formType,
        sStep: formSStep,
        title: formTitle,
        description: formDescription || null,
        content: formContent,
        notaMinima: formNotaMinima,
        active: formActive,
      }

      if (editingTemplate) {
        const res = await fetch('/api/templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingTemplate.id, ...payload }),
        })
        const data = await res.json()
        if (!data.success) { alert('Error: ' + data.error); return }
      } else {
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!data.success) { alert('Error: ' + data.error); return }
      }

      resetForm()
      fetchTemplates()
    } catch (e) { console.error('Error saving:', e); alert('Error al guardar') }
    finally { setIsSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta plantilla?')) return
    try {
      await fetch(`/api/templates?id=${id}`, { method: 'DELETE' })
      fetchTemplates()
    } catch (e) { console.error(e) }
  }

  const handleSeedDefaults = async () => {
    if (!confirm('¿Crear plantillas por defecto para todas las S que no tengan?')) return
    setIsSaving(true)
    try {
      for (const s of S_STEPS) {
        for (const type of tabConfig.types) {
          const existing = templates.find(t => t.sStep === s.id && t.type === type && t.active)
          if (!existing) {
            let content = '{}'
            let title = ''
            let nota = EXAM_PASS_THRESHOLD
            if (type === 'formacion') {
              content = JSON.stringify(getDefaultFormationContent(s.id))
              title = `Formación S${s.id} - ${s.japaneseName}`
            } else if (type === 'examen') {
              content = JSON.stringify(getDefaultExamContent(s.id))
              title = `Examen S${s.id} - ${s.japaneseName}`
              nota = EXAM_PASS_THRESHOLD
            } else if (type === 'autoevaluacion') {
              content = JSON.stringify(getDefaultChecklistContent(s.id))
              title = `Autoevaluación S${s.id} - ${s.japaneseName}`
              nota = SELF_EVAL_THRESHOLD
            } else if (type === 'auditoria') {
              content = JSON.stringify(getDefaultChecklistContent(s.id))
              title = `Auditoría S${s.id} - ${s.japaneseName}`
              nota = AUDIT_PASS_THRESHOLD
            }
            await fetch('/api/templates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type, sStep: s.id, title, content, notaMinima: nota }),
            })
          }
        }
      }
      fetchTemplates()
    } catch (e) { console.error(e) }
    finally { setIsSaving(false) }
  }

  const handleDownload = (template: TemplateData) => {
    try {
      const data = typeof template.content === 'string' ? JSON.parse(template.content) : template.content
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${template.type}_S${template.sStep}_${template.title.replace(/[^a-zA-Z0-9]/g, '_')}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Error al descargar la plantilla')
    }
  }

  const handleUploadJson = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string)
          setFormContent(JSON.stringify(data, null, 2))
        } catch {
          alert('El archivo JSON no es válido')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const templatesByS = (sStep: number) => templates.filter(t => t.sStep === sStep)

  // Count summary for a template
  const getTemplateSummary = (template: TemplateData) => {
    try {
      const data = typeof template.content === 'string' ? JSON.parse(template.content) : template.content
      if (data.questions) return `${data.questions.length} pregunta(s)`
      if (data.fields) return `${data.fields.length} campo(s)`
      if (data.categories || data.extraFields) return `${(data.categories || []).length} cat. / ${(data.extraFields || []).length} campos`
      if (data.sections) {
        const totalItems = data.sections.reduce((s: number, sec: any) => s + (sec.items?.length || 0), 0)
        return totalItems > 0 ? `${data.sections.length} sec. / ${totalItems} items` : `${data.sections.length} sección(es)`
      }
      return ''
    } catch { return '' }
  }

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* Tab selector */}
      <div className="flex gap-2 border-b pb-2">
        {TEMPLATE_TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setExpandedS(null) }}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-green-50 text-green-700 border-b-2 border-green-500'
                  : 'text-muted-foreground hover:text-foreground hover:bg-gray-50'
              }`}>
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Header actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          {(() => { const Icon = tabConfig.icon; return <Icon className="h-5 w-5 text-green-600" /> })()}
          Plantillas de {tabConfig.label}
        </h2>
        <Button variant="outline" size="sm" onClick={handleSeedDefaults} disabled={isSaving}
          className="gap-1 text-xs border-green-300 text-green-600 hover:bg-green-50">
          <RotateCcw className="h-3.5 w-3.5" />
          Crear plantillas por defecto
        </Button>
      </div>

      {/* S-Step cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {S_STEPS.map(s => {
            const sTemplates = templatesByS(s.id)
            const isExpanded = expandedS === s.id
            return (
              <div key={s.id} className="rounded-xl border-2 overflow-hidden"
                style={{ borderColor: S_COLORS[s.id] + '40' }}>
                {/* S Header */}
                <div className="flex items-center justify-between px-4 py-3 cursor-pointer"
                  style={{ backgroundColor: S_COLORS[s.id] + '10' }}
                  onClick={() => setExpandedS(isExpanded ? null : s.id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-sm"
                      style={{ backgroundColor: S_COLORS[s.id] }}>
                      S{s.id}
                    </div>
                    <div>
                      <span className="font-bold" style={{ color: S_COLORS[s.id] }}>{s.japaneseName}</span>
                      <span className="text-sm text-muted-foreground ml-2">({s.spanishName})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" style={{ color: S_COLORS[s.id], borderColor: S_COLORS[s.id] + '40' }}>
                      {sTemplates.length} plantilla{sTemplates.length !== 1 ? 's' : ''}
                    </Badge>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {/* Expanded */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden">
                      <div className="p-4 space-y-3">
                        {/* Create buttons */}
                        <div className="flex gap-2 mb-3">
                          {tabConfig.types.map(type => (
                            <Button key={type} variant="outline" size="sm"
                              className="gap-1 text-xs"
                              onClick={() => startCreate(s.id, type)}>
                              <Plus className="h-3.5 w-3.5" />
                              Nueva {type === 'formacion' ? 'Formación' : type === 'examen' ? 'Examen' : type === 'autoevaluacion' ? 'Autoevaluación' : type === 'auditoria' ? 'Auditoría Externa' : type === 'inventario' ? 'Config. Inventario' : 'Formato Estándar'}
                            </Button>
                          ))}
                        </div>

                        {/* Template list */}
                        {sTemplates.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground text-sm">
                            No hay plantillas para S{s.id}. Crea una nueva o pulsa &quot;Crear plantillas por defecto&quot;.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {sTemplates.map(tpl => (
                              <div key={tpl.id}
                                className={`flex items-center justify-between p-3 rounded-lg border ${tpl.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300 opacity-60'}`}>
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <Badge className="shrink-0" style={{
                                    backgroundColor: tpl.type === 'formacion' ? '#DBEAFE' : tpl.type === 'examen' ? '#FEF3C7' : tpl.type === 'autoevaluacion' ? '#D1FAE5' : tpl.type === 'auditoria' ? '#FED7AA' : tpl.type === 'inventario' ? '#FFEDD5' : '#EDE9FE',
                                    color: tpl.type === 'formacion' ? '#1D4ED8' : tpl.type === 'examen' ? '#92400E' : tpl.type === 'autoevaluacion' ? '#065F46' : tpl.type === 'auditoria' ? '#9A3412' : tpl.type === 'inventario' ? '#9A3412' : '#6D28D9',
                                  }}>
                                    {tpl.type === 'formacion' ? 'Formación' : tpl.type === 'examen' ? 'Examen' : tpl.type === 'autoevaluacion' ? 'Aut. Int.' : tpl.type === 'auditoria' ? 'Aud. Ext.' : tpl.type === 'inventario' ? 'Inventario' : 'Estándar'}
                                  </Badge>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{tpl.title}</p>
                                    {tpl.description && <p className="text-xs text-muted-foreground truncate">{tpl.description}</p>}
                                  </div>
                                  {getTemplateSummary(tpl) && (
                                    <Badge variant="outline" className="shrink-0 text-[10px]">
                                      {getTemplateSummary(tpl)}
                                    </Badge>
                                  )}
                                  {tpl.notaMinima != null && (
                                    <Badge variant="outline" className="shrink-0 text-xs">
                                      Nota mín: {tpl.notaMinima}%
                                    </Badge>
                                  )}
                                  {!tpl.active && (
                                    <Badge variant="outline" className="shrink-0 text-xs text-red-500 border-red-200">Inactiva</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  <Button variant="ghost" size="sm" onClick={() => handleDownload(tpl)}
                                    className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700" title="Descargar JSON">
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => startEdit(tpl)}
                                    className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700">
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDelete(tpl.id)}
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* EDIT / CREATE DIALOG */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Dialog open={isCreating} onOpenChange={(open) => { if (!open) resetForm() }}>
        <DialogContent className={`${isFullscreen ? 'max-w-full max-h-full w-screen h-screen rounded-none' : 'max-w-[95vw] max-h-[95vh]'} overflow-auto transition-all duration-200`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingTemplate ? <Edit3 className="h-5 w-5 text-blue-500" /> : <Plus className="h-5 w-5 text-green-500" />}
              {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="ml-auto p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Row 1: Type + S-Step */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold">Tipo</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formacion">Formación</SelectItem>
                    <SelectItem value="examen">Examen</SelectItem>
                    <SelectItem value="autoevaluacion">Auditoría Interna</SelectItem>
                    <SelectItem value="auditoria">Auditoría Externa</SelectItem>
                    <SelectItem value="inventario">Inventario</SelectItem>
                    <SelectItem value="estandar">Estándar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold">S-Step</Label>
                <Select value={String(formSStep)} onValueChange={(v) => setFormSStep(Number(v))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {S_STEPS.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        S{s.id} - {s.japaneseName} ({s.spanishName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Title + Nota Mínima */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label className="text-sm font-semibold">Título</Label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                  className="mt-1" placeholder="Título de la plantilla" />
              </div>
              <div>
                <Label className="text-sm font-semibold">Nota mínima (pasa/no pasa)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input type="number" value={formNotaMinima} onChange={(e) => setFormNotaMinima(Number(e.target.value))}
                    min={0} max={100} className="w-24" />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="text-sm font-semibold">Descripción</Label>
              <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                className="mt-1" placeholder="Descripción opcional" />
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)}
                className="rounded border-gray-300" />
              <Label className="text-sm">Plantilla activa</Label>
            </div>

            {/* ═══════════ Content Editor ═══════════ */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-sm font-semibold">Contenido</Label>
                <div className="flex items-center gap-2">
                  {/* Default data buttons */}
                  {(formType === 'autoevaluacion' || formType === 'auditoria') && (
                    <Button variant="outline" size="sm" className="text-xs h-6"
                      onClick={() => setFormContent(JSON.stringify(getDefaultChecklistContent(formSStep), null, 2))}>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Cargar checklist por defecto
                    </Button>
                  )}
                  {formType === 'formacion' && (
                    <Button variant="outline" size="sm" className="text-xs h-6"
                      onClick={() => setFormContent(JSON.stringify(getDefaultFormationContent(formSStep), null, 2))}>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Cargar formación por defecto
                    </Button>
                  )}
                  {formType === 'examen' && (
                    <Button variant="outline" size="sm" className="text-xs h-6"
                      onClick={() => setFormContent(JSON.stringify(getDefaultExamContent(formSStep), null, 2))}>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Cargar examen por defecto
                    </Button>
                  )}
                  {formType === 'inventario' && (
                    <Button variant="outline" size="sm" className="text-xs h-6"
                      onClick={() => setFormContent(JSON.stringify(getDefaultInventoryContent(formSStep), null, 2))}>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Cargar inventario por defecto
                    </Button>
                  )}
                  {formType === 'estandar' && (
                    <Button variant="outline" size="sm" className="text-xs h-6"
                      onClick={() => setFormContent(JSON.stringify(getDefaultStandardContent(), null, 2))}>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Cargar estándar por defecto
                    </Button>
                  )}

                  {/* Upload JSON */}
                  <Button variant="outline" size="sm" className="text-xs h-6" onClick={handleUploadJson}>
                    <Upload className="h-3 w-3 mr-1" />
                    Subir JSON
                  </Button>

                  {/* Visual / JSON toggle */}
                  <div className="flex rounded-md border overflow-hidden">
                    <button
                      onClick={() => setEditorMode('visual')}
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors ${
                        editorMode === 'visual' ? 'bg-green-100 text-green-700' : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}>
                      <Eye className="h-3 w-3" />
                      Visual
                    </button>
                    <button
                      onClick={() => setEditorMode('json')}
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors ${
                        editorMode === 'json' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}>
                      <Code className="h-3 w-3" />
                      JSON
                    </button>
                  </div>
                </div>
              </div>

              {/* Editor content */}
              {editorMode === 'visual' ? (
                <div className={`border rounded-lg p-3 min-h-[400px] overflow-y-auto bg-gray-50 ${isFullscreen ? 'max-h-[calc(100vh-320px)]' : 'max-h-[65vh]'}`}>
                  {(formType === 'autoevaluacion' || formType === 'auditoria') && (
                    <ChecklistEditor content={formContent} onChange={setFormContent} />
                  )}
                  {formType === 'examen' && (
                    <ExamEditor content={formContent} onChange={setFormContent} />
                  )}
                  {formType === 'formacion' && (
                    <FormationEditor content={formContent} onChange={setFormContent} />
                  )}
                  {formType === 'inventario' && (
                    <InventoryConfigEditor content={formContent} onChange={setFormContent} />
                  )}
                  {formType === 'estandar' && (
                    <StandardTemplateEditor content={formContent} onChange={setFormContent} />
                  )}
                </div>
              ) : (
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className={`w-full p-3 border rounded-lg font-mono text-sm bg-gray-50 focus:ring-2 focus:ring-green-300 focus:border-green-400 ${isFullscreen ? 'h-[calc(100vh-320px)]' : 'h-[65vh]'}`}
                  spellCheck={false}
                />
              )}

              {/* JSON validation preview */}
              {(() => {
                try {
                  JSON.parse(formContent)
                  return (
                    <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                      JSON válido
                    </div>
                  )
                } catch { return (
                  <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                    JSON inválido - revisa el formato
                  </div>
                )}
              })()}
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isSaving || !formTitle || !formContent}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white gap-1">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingTemplate ? 'Guardar Cambios' : 'Crear Plantilla'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
