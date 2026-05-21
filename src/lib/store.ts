import { create } from 'zustand'

export interface ProgressItem {
  id: string
  sStep: number
  miniStep: number
  completed: boolean
  score: number | null
  notes: string | null
  photoUrls: string | null
  passedAt: string | null
}

interface FiveSState {
  // State
  progress: ProgressItem[]
  currentView: 'board' | 'detail'
  selectedSStep: number | null
  activeModal: 'formacion' | 'fotos' | 'inventario' | 'autoevaluacion' | 'auditoria' | null
  activeMiniStep: number | null
  isLoadingProgress: boolean

  // Actions
  fetchProgress: () => Promise<void>
  selectSStep: (s: number | null) => void
  setCurrentView: (view: 'board' | 'detail') => void
  openModal: (type: 'formacion' | 'fotos' | 'inventario' | 'autoevaluacion' | 'auditoria', miniStep: number) => void
  closeModal: () => void
  seedDatabase: () => Promise<void>

  // Computed helpers
  getMiniStepStatus: (sStep: number, miniStep: number) => 'locked' | 'available' | 'completed'
  isQuesitoEarned: (sStep: number) => boolean
  getCompletedCount: () => { sSteps: number; miniSteps: number; total: number }
}

export const use5SStore = create<FiveSState>((set, get) => ({
  progress: [],
  currentView: 'board',
  selectedSStep: null,
  activeModal: null,
  activeMiniStep: null,
  isLoadingProgress: true,

  fetchProgress: async () => {
    try {
      const res = await fetch('/api/progress')
      const data = await res.json()
      // API returns array directly
      const progressData = Array.isArray(data) ? data : []
      set({ progress: progressData, isLoadingProgress: false })
    } catch (error) {
      console.error('Error fetching progress:', error)
      set({ isLoadingProgress: false })
    }
  },

  selectSStep: (s) => {
    if (s === null) {
      set({ selectedSStep: null, currentView: 'board' })
    } else {
      set({ selectedSStep: s, currentView: 'detail' })
    }
  },

  setCurrentView: (view) => set({ currentView: view }),

  openModal: (type, miniStep) => set({ activeModal: type, activeMiniStep: miniStep }),

  closeModal: () => set({ activeModal: null, activeMiniStep: null }),

  seedDatabase: async () => {
    try {
      await fetch('/api/seed', { method: 'POST' })
      await get().fetchProgress()
    } catch (error) {
      console.error('Error seeding database:', error)
    }
  },

  getMiniStepStatus: (sStep, miniStep) => {
    const { progress } = get()
    if (miniStep === 1) {
      const step = progress.find(p => p.sStep === sStep && p.miniStep === miniStep)
      return step?.completed ? 'completed' : 'available'
    }
    // Check if previous step is completed
    const prevStep = progress.find(p => p.sStep === sStep && p.miniStep === miniStep - 1)
    if (!prevStep?.completed) return 'locked'
    const currentStep = progress.find(p => p.sStep === sStep && p.miniStep === miniStep)
    return currentStep?.completed ? 'completed' : 'available'
  },

  isQuesitoEarned: (sStep) => {
    const { progress } = get()
    const sProgress = progress.filter(p => p.sStep === sStep && p.completed)
    return sProgress.length === 5
  },

  getCompletedCount: () => {
    const { progress } = get()
    const completedMiniSteps = progress.filter(p => p.completed).length
    let completedSSteps = 0
    for (let i = 1; i <= 5; i++) {
      if (get().isQuesitoEarned(i)) completedSSteps++
    }
    return { sSteps: completedSSteps, miniSteps: completedMiniSteps, total: 25 }
  },
}))
