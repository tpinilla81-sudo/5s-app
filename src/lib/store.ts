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

export interface User {
  id: string
  email: string
  name: string
  role: string
  avatar: string | null
  active: boolean
}

export interface Zone {
  id: string
  name: string
  description: string | null
  color: string
  projectId: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  company: string
  startDate: string
  active: boolean
  zones: Zone[]
  memberCount?: number
}

interface FiveSState {
  // Progress & Board State
  progress: ProgressItem[]
  currentView: 'board' | 'detail' | 'admin'
  selectedSStep: number | null
  activeModal: 'formacion' | 'fotos' | 'inventario' | 'autoevaluacion' | 'auditoria' | null
  activeMiniStep: number | null
  isLoadingProgress: boolean
  adminFreeNavigation: boolean  // Admin mode: skip progressive unlocking

  // Auth & Project State
  currentUser: User | null
  currentProject: Project | null
  authView: 'login' | 'register' | 'setup' | 'board' | 'no_projects'
  projects: Project[]
  isAuthLoading: boolean       // Only for initial session check
  isLoginLoading: boolean      // For login/register button loading state
  authError: string | null     // Error message from auth operations

  // Progress & Board Actions
  fetchProgress: () => Promise<void>
  selectSStep: (s: number | null) => void
  setCurrentView: (view: 'board' | 'detail' | 'admin') => void
  openModal: (type: 'formacion' | 'fotos' | 'inventario' | 'autoevaluacion' | 'auditoria', miniStep: number) => void
  closeModal: () => void
  seedDatabase: () => Promise<void>
  setAdminFreeNavigation: (enabled: boolean) => void

  // Computed helpers
  getMiniStepStatus: (sStep: number, miniStep: number) => 'locked' | 'available' | 'completed'
  isQuesitoEarned: (sStep: number) => boolean
  getCompletedCount: () => { sSteps: number; miniSteps: number; total: number }

  // Auth & Project Actions
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string, role: string) => Promise<boolean>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
  fetchProjects: () => Promise<void>
  createProject: (data: { name: string; description?: string; company: string; zones: { name: string; description?: string; color?: string }[] }) => Promise<void>
  setCurrentProject: (project: Project | null) => void
  setAuthView: (view: 'login' | 'register' | 'setup' | 'board') => void
  clearAuthError: () => void
}

export const use5SStore = create<FiveSState>((set, get) => ({
  // Progress & Board State
  progress: [],
  currentView: 'board',
  selectedSStep: null,
  activeModal: null,
  activeMiniStep: null,
  isLoadingProgress: true,
  adminFreeNavigation: true,  // Default: admin can navigate freely

  // Auth & Project State
  currentUser: null,
  currentProject: null,
  authView: 'login',
  projects: [],
  isAuthLoading: true,
  isLoginLoading: false,
  authError: null,

  // Progress & Board Actions
  fetchProgress: async () => {
    try {
      const { currentProject } = get()
      const params = currentProject ? `?projectId=${currentProject.id}` : ''
      const res = await fetch(`/api/progress${params}`)
      const data = await res.json()
      // API returns { success: true, data: [...] }
      const progressData = data?.data ? data.data : (Array.isArray(data) ? data : [])
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

  setAdminFreeNavigation: (enabled: boolean) => set({ adminFreeNavigation: enabled }),

  seedDatabase: async () => {
    try {
      await fetch('/api/seed', { method: 'POST' })
      await get().fetchProgress()
    } catch (error) {
      console.error('Error seeding database:', error)
    }
  },

  getMiniStepStatus: (sStep, miniStep) => {
    const { progress, currentUser, adminFreeNavigation } = get()
    const isAdmin = currentUser?.role === 'admin'
    const skipLocks = isAdmin && adminFreeNavigation

    const currentStep = progress.find(p => p.sStep === sStep && p.miniStep === miniStep)
    if (currentStep?.completed) return 'completed'

    // Mini-step 1 is always available
    if (miniStep === 1) return 'available'

    // Admin with free navigation can access everything
    if (skipLocks) return 'available'

    // Normal progressive unlocking: previous step must be completed
    const prevStep = progress.find(p => p.sStep === sStep && p.miniStep === miniStep - 1)
    if (!prevStep?.completed) return 'locked'
    return 'available'
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

  // Auth & Project Actions
  login: async (email: string, password: string) => {
    try {
      set({ isLoginLoading: true, authError: null })
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        const errorMsg = data.error || 'Email o contraseña incorrectos'
        set({ isLoginLoading: false, authError: errorMsg })
        return false
      }

      set({ currentUser: data.user, isLoginLoading: false, authError: null })

      // Check for projects after login
      await get().fetchProjects()
      const { projects } = get()

      if (projects.length > 0) {
        set({ currentProject: projects[0], authView: 'board' })
      } else {
        // Only admin can create projects via setup wizard
        // Non-admin users see a waiting screen
        const { currentUser } = get()
        if (currentUser?.role === 'admin') {
          set({ authView: 'setup' })
        } else {
          set({ authView: 'no_projects' })
        }
      }

      return true
    } catch (error) {
      console.error('Login error:', error)
      set({ isLoginLoading: false, authError: 'Error de conexión. Inténtalo de nuevo.' })
      return false
    }
  },

  register: async (name: string, email: string, password: string, role: string) => {
    try {
      set({ isLoginLoading: true, authError: null })
      const res = await fetch('/api/auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      })
      const data = await res.json()

      if (!res.ok) {
        const errorMsg = data.error || 'Error al crear cuenta'
        set({ isLoginLoading: false, authError: errorMsg })
        return false
      }

      set({ currentUser: data.user, isLoginLoading: false, authError: null })

      // Check for projects after registration
      await get().fetchProjects()
      const { projects } = get()

      if (projects.length > 0) {
        set({ currentProject: projects[0], authView: 'board' })
      } else {
        // Self-registered users are always 'empleado' — they need admin to assign a project
        set({ authView: 'no_projects' })
      }

      return true
    } catch (error) {
      console.error('Registration error:', error)
      set({ isLoginLoading: false, authError: 'Error de conexión. Inténtalo de nuevo.' })
      return false
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' })
    } catch (error) {
      console.error('Logout error:', error)
    }
    set({
      currentUser: null,
      currentProject: null,
      authView: 'login',
      projects: [],
      isLoginLoading: false,
      authError: null,
    })
  },

  checkSession: async () => {
    try {
      set({ isAuthLoading: true })
      const res = await fetch('/api/auth')
      const data = await res.json()

      if (data.user) {
        set({ currentUser: data.user })
        await get().fetchProjects()
        const { projects } = get()

        if (projects.length > 0) {
          set({ currentProject: projects[0], authView: 'board' })
        } else {
          // Only admin can create projects via setup wizard
          const { currentUser } = get()
          if (currentUser?.role === 'admin') {
            set({ authView: 'setup' })
          } else {
            set({ authView: 'no_projects' })
          }
        }
      } else {
        set({ authView: 'login' })
      }
    } catch (error) {
      console.error('Session check error:', error)
      set({ authView: 'login' })
    } finally {
      set({ isAuthLoading: false })
    }
  },

  fetchProjects: async () => {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      set({ projects: data.projects || [] })
    } catch (error) {
      console.error('Fetch projects error:', error)
    }
  },

  createProject: async (data) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()

      if (res.ok && result.project) {
        // Add the current user as admin member of the project
        const { currentUser } = get()
        if (currentUser) {
          try {
            await fetch(`/api/projects/${result.project.id}/members`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: currentUser.email,
                name: currentUser.name,
                role: 'admin',
                zoneIds: result.project.zones?.map((z: any) => z.id) || [],
              }),
            })
          } catch (memberError) {
            console.error('Error adding admin as member:', memberError)
            // Don't block project creation if member add fails
          }
        }

        set({ currentProject: result.project, authView: 'board' })
        await get().fetchProjects()
      } else {
        console.error('Create project error:', result.error)
      }
    } catch (error) {
      console.error('Create project error:', error)
    }
  },

  setCurrentProject: (project) => {
    set({ currentProject: project })
    if (project) {
      set({ authView: 'board' })
    }
  },

  setAuthView: (view) => set({ authView: view as 'login' | 'register' | 'setup' | 'board' | 'no_projects', authError: null }),

  clearAuthError: () => set({ authError: null }),
}))
