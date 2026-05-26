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
  Target, ChevronDown, ChevronUp, AlertTriangle, Copy, RotateCcw,
} from 'lucide-react'
import { S_STEPS, AUDIT_CHECKLISTS, EXAM_PASS_THRESHOLD, SELF_EVAL_THRESHOLD, AUDIT_PASS_THRESHOLD } from '@/lib/5s-constants'

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

type TemplateTab = 'formacion' | 'autoevaluacion' | 'auditoria'

const TEMPLATE_TABS: { key: TemplateTab; label: string; icon: React.ComponentType<{ className?: string }>; types: string[] }[] = [
  { key: 'formacion', label: 'Formaciones y Exámenes', icon: BookOpen, types: ['formacion', 'examen'] },
  { key: 'autoevaluacion', label: 'Auditoría Interna', icon: Target, types: ['autoevaluacion'] },
  { key: 'auditoria', label: 'Auditoría Externa', icon: ClipboardCheck, types: ['auditoria'] },
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
  // Convert AUDIT_CHECKLISTS to template format
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
    setFormNotaMinima(activeTab === 'formacion' ? EXAM_PASS_THRESHOLD : activeTab === 'autoevaluacion' ? SELF_EVAL_THRESHOLD : AUDIT_PASS_THRESHOLD)
    setFormActive(true)
    setEditingTemplate(null)
    setIsCreating(false)
  }

  const startCreate = (sStep: number, type: string) => {
    setIsCreating(true)
    setFormType(type)
    setFormSStep(sStep)
    setFormTitle(`S${sStep} - ${S_STEPS.find(s => s.id === sStep)?.japaneseName || ''}`)
    setFormDescription('')
    setFormNotaMinima(activeTab === 'formacion' ? EXAM_PASS_THRESHOLD : activeTab === 'autoevaluacion' ? SELF_EVAL_THRESHOLD : AUDIT_PASS_THRESHOLD)
    setFormActive(true)

    if (type === 'formacion') {
      setFormContent(JSON.stringify(getDefaultFormationContent(sStep), null, 2))
    } else if (type === 'examen') {
      setFormContent(JSON.stringify(getDefaultExamContent(sStep), null, 2))
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
    setFormNotaMinima(template.notaMinima ?? (activeTab === 'formacion' ? EXAM_PASS_THRESHOLD : activeTab === 'autoevaluacion' ? SELF_EVAL_THRESHOLD : AUDIT_PASS_THRESHOLD))
    setFormActive(template.active)
    setIsCreating(true)
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

  const templatesByS = (sStep: number) => templates.filter(t => t.sStep === sStep)

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
                              Nueva {type === 'formacion' ? 'Formación' : type === 'examen' ? 'Examen' : type === 'autoevaluacion' ? 'Autoevaluación' : 'Auditoría'}
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
                                    backgroundColor: tpl.type === 'formacion' ? '#DBEAFE' : tpl.type === 'examen' ? '#FEF3C7' : tpl.type === 'autoevaluacion' ? '#D1FAE5' : '#FED7AA',
                                    color: tpl.type === 'formacion' ? '#1D4ED8' : tpl.type === 'examen' ? '#92400E' : tpl.type === 'autoevaluacion' ? '#065F46' : '#9A3412',
                                  }}>
                                    {tpl.type === 'formacion' ? 'Formación' : tpl.type === 'examen' ? 'Examen' : tpl.type === 'autoevaluacion' ? 'Autoeval.' : 'Auditoría'}
                                  </Badge>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{tpl.title}</p>
                                    {tpl.description && <p className="text-xs text-muted-foreground truncate">{tpl.description}</p>}
                                  </div>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingTemplate ? <Edit3 className="h-5 w-5 text-blue-500" /> : <Plus className="h-5 w-5 text-green-500" />}
              {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
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
                    <SelectItem value="autoevaluacion">Autoevaluación</SelectItem>
                    <SelectItem value="auditoria">Auditoría</SelectItem>
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

            {/* Content editor */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-sm font-semibold">Contenido (JSON)</Label>
                <div className="flex gap-2">
                  {(formType === 'autoevaluacion' || formType === 'auditoria') && (
                    <Button variant="outline" size="sm" className="text-xs h-6"
                      onClick={() => setFormContent(JSON.stringify(getDefaultChecklistContent(formSStep), null, 2))}>
                      Cargar checklist por defecto
                    </Button>
                  )}
                  {formType === 'formacion' && (
                    <Button variant="outline" size="sm" className="text-xs h-6"
                      onClick={() => setFormContent(JSON.stringify(getDefaultFormationContent(formSStep), null, 2))}>
                      Cargar formación por defecto
                    </Button>
                  )}
                  {formType === 'examen' && (
                    <Button variant="outline" size="sm" className="text-xs h-6"
                      onClick={() => setFormContent(JSON.stringify(getDefaultExamContent(formSStep), null, 2))}>
                      Cargar examen por defecto
                    </Button>
                  )}
                </div>
              </div>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                className="w-full h-64 p-3 border rounded-lg font-mono text-xs bg-gray-50 focus:ring-2 focus:ring-green-300 focus:border-green-400"
                spellCheck={false}
              />
              {/* JSON preview */}
              {(() => {
                try {
                  const parsed = JSON.parse(formContent)
                  return (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs font-semibold text-green-700 mb-1">Vista previa:</p>
                      {parsed.sections && (
                        <div className="text-xs text-green-600">
                          {parsed.sections.length} sección(es)
                          {parsed.sections.map((s: any, i: number) => (
                            <div key={i} className="ml-2">• {s.title}: {s.items?.length || s.content ? '✓' : '⚠ vacía'}</div>
                          ))}
                        </div>
                      )}
                      {parsed.questions && (
                        <div className="text-xs text-green-600">
                          {parsed.questions.length} pregunta(s)
                          {parsed.questions.map((q: any, i: number) => (
                            <div key={i} className="ml-2">• P{i + 1}: {q.question?.slice(0, 50)}... ({q.options?.length || 0} opciones)</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                } catch { return (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-xs text-red-600">JSON inválido - revisa el formato</span>
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
