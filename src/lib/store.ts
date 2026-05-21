import { create } from 'zustand'

export interface MiniStepProgress {
  sStep: number
  miniStep: number
  completed: boolean
  score: number | null
  notes: string | null
}

export interface AppState {
  progress: MiniStepProgress[]
  selectedS: number | null
  activeModal: { sStep: number; miniStep: number } | null
  
  // Actions
  setProgress: (progress: MiniStepProgress[]) => void
  selectS: (s: number | null) => void
  openModal: (sStep: number, miniStep: number) => void
  closeModal: () => void
  completeMiniStep: (sStep: number, miniStep: number, score?: number, notes?: string) => void
  isMiniStepUnlocked: (sStep: number, miniStep: number) => boolean
  isQuesitoEarned: (sStep: number) => boolean
  getTotalQuesitos: () => number
}

export const S_DATA = [
  { id: 1, name: 'REVISAR', subtitle: 'Clasificar', color: '#8B5CF6', bgColor: '#EDE9FE', icon: '🔍' },
  { id: 2, name: 'ORDENAR', subtitle: 'Organizar', color: '#EAB308', bgColor: '#FEF9C3', icon: '📋' },
  { id: 3, name: 'LIMPIAR', subtitle: 'Limpiar', color: '#3B82F6', bgColor: '#DBEAFE', icon: '🧹' },
  { id: 4, name: 'ESTANDARIZAR', subtitle: 'Estandarizar', color: '#F43F5E', bgColor: '#FFE4E6', icon: '📐' },
  { id: 5, name: 'MANTENER', subtitle: 'Disciplina', color: '#F97316', bgColor: '#FFEDD5', icon: '💪' },
] as const

export const MINI_STEP_DATA = [
  { id: 1, name: 'Formación + Examen', icon: '📚', description: 'Completa la formación y aprueba el examen (mínimo 80%)' },
  { id: 2, name: 'Evidencia Fotográfica', icon: '📸', description: 'Sube fotos del antes y después como evidencia' },
  { id: 3, name: 'Inventario', icon: '📦', description: 'Clasifica los elementos encontrados (útil/innecesario/dudoso)' },
  { id: 4, name: 'Autoevaluación', icon: '✅', description: 'Realiza la autoevaluación con la checklist proporcionada' },
  { id: 5, name: 'Auditoría Externa', icon: '🏛️', description: 'Validación por parte de un auditor externo' },
] as const

export const useAppStore = create<AppState>((set, get) => ({
  progress: [],
  selectedS: null,
  activeModal: null,

  setProgress: (progress) => set({ progress }),
  
  selectS: (s) => set({ selectedS: s }),
  
  openModal: (sStep, miniStep) => set({ activeModal: { sStep, miniStep } }),
  
  closeModal: () => set({ activeModal: null }),
  
  completeMiniStep: (sStep, miniStep, score, notes) =>
    set((state) => {
      const existing = state.progress.find(
        (p) => p.sStep === sStep && p.miniStep === miniStep
      )
      if (existing) {
        return {
          progress: state.progress.map((p) =>
            p.sStep === sStep && p.miniStep === miniStep
              ? { ...p, completed: true, score: score ?? p.score, notes: notes ?? p.notes }
              : p
          ),
        }
      }
      return {
        progress: [
          ...state.progress,
          { sStep, miniStep, completed: true, score: score ?? null, notes: notes ?? null },
        ],
      }
    }),

  isMiniStepUnlocked: (sStep, miniStep) => {
    const { progress } = get()
    if (miniStep === 1) return true
    const prevStep = progress.find(
      (p) => p.sStep === sStep && p.miniStep === miniStep - 1
    )
    return prevStep?.completed ?? false
  },

  isQuesitoEarned: (sStep) => {
    const { progress } = get()
    const sProgress = progress.filter((p) => p.sStep === sStep)
    return sProgress.length === 5 && sProgress.every((p) => p.completed)
  },

  getTotalQuesitos: () => {
    let count = 0
    for (let i = 1; i <= 5; i++) {
      if (get().isQuesitoEarned(i)) count++
    }
    return count
  },
}))
