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
  zoneId: string | null
}

export interface EmployeeProgressItem {
  id: string
  sStep: number
  miniStep: number
  completed: boolean
  score: number | null
  notes: string | null
  passedAt: string | null
  projectId: string
  zoneId: string
  userId: string
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
  responsableId: string | null
}

export interface Company {
  id: string
  name: string
  description: string | null
  active: boolean
  projectCount?: number
  memberCount?: number
}

export interface Project {
  id: string
  name: string
  description: string | null
  company: string
  companyId: string | null
  companyName?: string
  startDate: string
  active: boolean
  zones: Zone[]
  memberCount?: number
}

// Mini-step types: ZONE steps (2,3,4,5) are collaborative per zone; INDIVIDUAL step (1) is per employee
// Step 4 (Autoevaluación) is done by EMPLOYEES for S1/S2/S3/S5, and by RESPONSABLE for S4
const ZONE_MINI_STEPS = [2, 3, 4, 5]
const INDIVIDUAL_MINI_STEPS = [1]

// User's assigned zones (filtered by MemberZone for empleados)
export interface UserZoneAssignment {
  id: string
  name: string
  description: string | null
  color: string
  projectId: string
  responsableId: string | null
}

interface FiveSState {
  // Progress & Board State
  progress: ProgressItem[]
  employeeProgress: EmployeeProgressItem[]
  currentView: 'board' | 'detail' | 'admin' | 'maintenance' | 'gerente'
  activeTab: 'board' | 'gerente' | 'admin' | 'maintenance'
  selectedSStep: number | null
  activeModal: 'formacion' | 'fotos' | 'inventario' | 'actionplan' | 'autoevaluacion' | 'auditoria' | 'globalActionPlan' | 'globalInventory' | 'auditResults' | 'standardsLibrary' | 'photoLibrary' | null
  activeMiniStep: number | null
  isLoadingProgress: boolean
  adminFreeNavigation: boolean  // Admin mode: skip progressive unlocking

  // Zone State
  currentZone: Zone | null
  userZones: UserZoneAssignment[]  // Zones assigned to the current user

  // Auth & Project State
  currentUser: User | null
  currentProject: Project | null
  authView: 'login' | 'register' | 'setup' | 'board' | 'no_projects'
  projects: Project[]
  companies: Company[]
  isAuthLoading: boolean       // Only for initial session check
  isLoginLoading: boolean      // For login/register button loading state
  authError: string | null     // Error message from auth operations

  // Progress & Board Actions
  fetchProgress: () => Promise<void>
  fetchEmployeeProgress: (projectId: string, zoneId?: string) => Promise<void>
  selectSStep: (s: number | null) => void
  setCurrentView: (view: 'board' | 'detail' | 'admin' | 'maintenance' | 'gerente') => void
  setActiveTab: (tab: 'board' | 'gerente' | 'admin' | 'maintenance') => void
  openModal: (type: 'formacion' | 'fotos' | 'inventario' | 'actionplan' | 'autoevaluacion' | 'auditoria' | 'globalActionPlan' | 'globalInventory' | 'auditResults' | 'standardsLibrary' | 'photoLibrary', miniStep: number) => void
  closeModal: () => void
  seedDatabase: () => Promise<void>
  setAdminFreeNavigation: (enabled: boolean) => void
  setCurrentZone: (zone: Zone | null) => void
  fetchUserZones: () => Promise<void>
  getAvailableZones: () => Zone[]  // Zones the user can see/work in

  // Computed helpers
  getMiniStepStatus: (sStep: number, miniStep: number) => 'locked' | 'available' | 'completed'
  isZoneMiniStepComplete: (sStep: number, miniStep: number, zoneId: string) => boolean
  isQuesitoEarned: (sStep: number) => boolean
  is5SCompleted: () => boolean
  getCompletedCount: () => { sSteps: number; miniSteps: number; total: number }

  // Auth & Project Actions
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string, role: string) => Promise<boolean>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
  fetchProjects: () => Promise<void>
  fetchCompanies: () => Promise<void>
  createProject: (data: { name: string; description?: string; company: string; companyId?: string; zones: { name: string; description?: string; color?: string }[] }) => Promise<void>
  setCurrentProject: (project: Project | null) => void
  setAuthView: (view: 'login' | 'register' | 'setup' | 'board') => void
  clearAuthError: () => void
}

export const use5SStore = create<FiveSState>((set, get) => ({
  // Progress & Board State
  progress: [],
  employeeProgress: [],
  currentView: 'board',
  activeTab: 'board',
  selectedSStep: null,
  activeModal: null,
  activeMiniStep: null,
  isLoadingProgress: true,
  adminFreeNavigation: true,  // Default: admin can navigate freely
  currentZone: null,
  userZones: [],

  // Auth & Project State
  currentUser: null,
  currentProject: null,
  authView: 'login',
  projects: [],
  companies: [],
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

  fetchEmployeeProgress: async (projectId: string, zoneId?: string) => {
    try {
      let params = `?projectId=${projectId}`
      if (zoneId) params += `&zoneId=${zoneId}`
      const res = await fetch(`/api/employee-progress${params}`)
      const data = await res.json()
      const epData = data?.data ? data.data : (Array.isArray(data) ? data : [])
      set({ employeeProgress: epData })
    } catch (error) {
      console.error('Error fetching employee progress:', error)
    }
  },

  selectSStep: (s) => {
    if (s === null) {
      set({ selectedSStep: null })
    } else {
      set({ selectedSStep: s })
    }
  },

  setCurrentView: (view) => set({ currentView: view }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  openModal: (type, miniStep) => set({ activeModal: type, activeMiniStep: miniStep }),

  closeModal: () => set({ activeModal: null, activeMiniStep: null }),

  setAdminFreeNavigation: (enabled: boolean) => set({ adminFreeNavigation: enabled }),

  setCurrentZone: (zone: Zone | null) => {
    set({ currentZone: zone })
    // Also fetch employee progress when zone changes
    const { currentProject } = get()
    if (currentProject && zone) {
      get().fetchEmployeeProgress(currentProject.id, zone.id)
    }
  },

  fetchUserZones: async () => {
    try {
      const res = await fetch('/api/auth/zones')
      const data = await res.json()
      const zones: UserZoneAssignment[] = data.zones || []
      set({ userZones: zones })

      // Auto-select zone if user has exactly one assigned zone
      const { currentUser, currentZone, currentProject } = get()
      if (zones.length === 1 && !currentZone) {
        const z = zones[0]
        // Find matching zone in current project
        const projectZone = currentProject?.zones.find(pz => pz.id === z.id) || {
          id: z.id, name: z.name, description: z.description, color: z.color, projectId: z.projectId, responsableId: z.responsableId
        }
        set({ currentZone: projectZone as Zone })
        if (currentProject) {
          get().fetchEmployeeProgress(currentProject.id, z.id)
        }
      }

      return zones
    } catch (error) {
      console.error('Error fetching user zones:', error)
      return []
    }
  },

  getAvailableZones: () => {
    const { currentUser, currentProject, userZones } = get()
    if (!currentProject) return []

    // Admin and responsable can see all project zones
    if (currentUser?.role === 'admin' || currentUser?.role === 'responsable') {
      return currentProject.zones
    }

    // Other roles: only zones from userZones that belong to this project
    const userZoneIds = userZones.map(uz => uz.id)
    return currentProject.zones.filter(z => userZoneIds.includes(z.id))
  },

  seedDatabase: async () => {
    try {
      await fetch('/api/seed', { method: 'POST' })
      await get().fetchProgress()
    } catch (error) {
      console.error('Error seeding database:', error)
    }
  },

  getMiniStepStatus: (sStep, miniStep) => {
    const { progress, currentUser, adminFreeNavigation, currentZone, employeeProgress } = get()
    const isAdmin = currentUser?.role === 'admin'
    const isResponsable = currentUser?.role === 'responsable'
    const isAuditor = currentUser?.role === 'auditor'
    const isEmpleado = currentUser?.role === 'empleado'
    const isGerente = currentUser?.role === 'gerente'
    const skipLocks = isAdmin && adminFreeNavigation

    // Helper: check if steps 1-4 are all completed for this S-step in the current zone
    const areSteps1to4Completed = (): boolean => {
      if (!currentZone) return false
      for (let ms = 1; ms <= 4; ms++) {
        // All steps (including step 1) check the zone-level Progress record
        // Step 1 is only marked completed at zone level when ALL employees have passed
        const zoneStep = progress.find(p =>
          p.sStep === sStep &&
          p.miniStep === ms &&
          (p.zoneId === currentZone.id || p.zoneId === null) &&
          p.completed
        )
        if (!zoneStep) return false
      }
      return true
    }

    // ── Role-based step access rules ──
    // ADMIN (lock closed): View-only, same as responsable — all steps visible but no execution
    // ADMIN (lock open / adminFreeNavigation): Can access everything
    // GERENTE: Read-only, all steps visible
    // RESPONSABLE: Read-only, can only VIEW progress (no step execution)
    // AUDITOR: ONLY Step 5, and ONLY when steps 1-4 are completed by employees
    // EMPLEADO: Steps 1-4 (progressive within same S), Step 5 locked. Cross-S dependency: S(n) requires S(n-1) quesito.

    // ── ADMIN with lock closed: View-only (same as responsable) ──
    if (isAdmin && !adminFreeNavigation) {
      // Admin without free navigation is view-only — all steps visible but cannot execute
      if (currentZone) {
        const zoneStep = progress.find(p =>
          p.sStep === sStep &&
          p.miniStep === miniStep &&
          (p.zoneId === currentZone.id || p.zoneId === null)
        )
        if (zoneStep?.completed) return 'completed'
      }
      // Admin (lock closed) sees all steps as available (for viewing only)
      return 'available'
    }

    // ── RESPONSABLE: View-only — all steps visible but cannot execute ──
    if (isResponsable && !isAdmin) {
      // Responsable can VIEW all steps (show as 'available' for reading)
      // But the modals should be read-only for them (handled in each modal component)
      if (currentZone) {
        const zoneStep = progress.find(p =>
          p.sStep === sStep &&
          p.miniStep === miniStep &&
          (p.zoneId === currentZone.id || p.zoneId === null)
        )
        if (zoneStep?.completed) return 'completed'
      }
      // Responsable sees all steps as available (for viewing only)
      return 'available'
    }

    // ── AUDITOR: Can VIEW steps 1-4 (read-only), only DO step 5 ──
    if (isAuditor && !isAdmin) {
      // Cross-S dependency for auditor: can only access S if previous S's quesito is earned
      if (sStep > 1) {
        const prevSEarned = get().isQuesitoEarned(sStep - 1)
        if (!prevSEarned) return 'locked'
      }

      if (miniStep !== 5) {
        // Auditor can VIEW steps 1-4 (read-only) but cannot execute
        if (currentZone) {
          const zoneStep = progress.find(p =>
            p.sStep === sStep &&
            p.miniStep === miniStep &&
            (p.zoneId === currentZone.id || p.zoneId === null)
          )
          if (zoneStep?.completed) return 'completed'
        }
        return 'available' // Visible but read-only (modals enforce no-edit)
      }
      // Step 5: only available when steps 1-4 are completed in the zone
      if (currentZone) {
        const zoneStep5 = progress.find(p =>
          p.sStep === sStep &&
          p.miniStep === 5 &&
          p.zoneId === currentZone.id
        )
        if (zoneStep5?.completed) return 'completed'
        if (areSteps1to4Completed()) return 'available'
        return 'locked'
      }
      // No zone selected - fallback
      return 'locked'
    }

    // ── GERENTE: Read-only, all visible ──
    if (isGerente) {
      if (currentZone) {
        const zoneStep = progress.find(p =>
          p.sStep === sStep &&
          p.miniStep === miniStep &&
          (p.zoneId === currentZone.id || p.zoneId === null)
        )
        if (zoneStep?.completed) return 'completed'
      }
      return 'available'
    }

    // ── Cross-S dependency: S(n) requires S(n-1) quesito earned ──
    // Only S1 Step 1 is available at the start. Each subsequent S unlocks when the previous S's quesito is earned.
    if (sStep > 1 && !skipLocks) {
      const prevSEarned = get().isQuesitoEarned(sStep - 1)
      if (!prevSEarned) return 'locked'
    }

    // ── Step 5 for non-auditor/non-admin: always locked ──
    if (miniStep === 5) {
      if (currentZone) {
        const zoneStep5 = progress.find(p =>
          p.sStep === sStep &&
          p.miniStep === 5 &&
          p.zoneId === currentZone.id
        )
        if (zoneStep5?.completed) return 'completed'
      }
      // Only admin (skip mode) can access step 5
      if (skipLocks) return 'available'
      // All other roles: locked (auditor's job)
      return 'locked'
    }

    // Zone-level steps (2, 3, 4): Check zone's Progress record
    if (ZONE_MINI_STEPS.includes(miniStep) && currentZone) {
      const zoneStep = progress.find(p =>
        p.sStep === sStep &&
        p.miniStep === miniStep &&
        p.zoneId === currentZone.id
      )
      if (zoneStep?.completed) return 'completed'

      // Step 4 (Autoevaluación): available to employees after Step 3 completed at zone level
      if (miniStep === 4) {
        const step3 = progress.find(p =>
          p.sStep === sStep &&
          p.miniStep === 3 &&
          (p.zoneId === currentZone.id || p.zoneId === null) &&
          p.completed
        )
        if (step3) return 'available'
        // Employee needs Step 3 completed first
        return 'locked'
      }

      if (miniStep === 2 && !skipLocks) {
        // Step 2 (Fotos) for EMPLEADO: requires that THIS EMPLOYEE has completed Step 1 (Formación+Examen)
        const myStep1 = employeeProgress.find(ep =>
          ep.sStep === sStep &&
          ep.miniStep === 1 &&
          ep.zoneId === currentZone.id &&
          ep.userId === currentUser?.id
        )
        if (!myStep1?.completed) return 'locked'
        return 'available'
      }

      if (miniStep === 3 && !skipLocks) {
        // Step 3 (Inventario) for EMPLEADO: requires that Step 2 is completed at zone level (any employee)
        const step2 = progress.find(p =>
          p.sStep === sStep &&
          p.miniStep === 2 &&
          (p.zoneId === currentZone.id || p.zoneId === null) &&
          p.completed
        )
        if (step2) return 'available'
        return 'locked'
      }

      if (miniStep === 1) return 'available'
      if (skipLocks) return 'available'

      // Check previous step for zone-level progression (empleado flow)
      const prevStep = progress.find(p =>
        p.sStep === sStep &&
        p.miniStep === miniStep - 1 &&
        (p.zoneId === currentZone.id || p.zoneId === null)
      )
      if (!prevStep?.completed) return 'locked'
      return 'available'
    }

    // Individual step (1 only): Check if current user's EmployeeProgress is completed
    if (INDIVIDUAL_MINI_STEPS.includes(miniStep) && currentZone && currentUser) {
      const myProgress = employeeProgress.find(ep =>
        ep.sStep === sStep &&
        ep.miniStep === miniStep &&
        ep.zoneId === currentZone.id &&
        ep.userId === currentUser.id
      )
      if (myProgress?.completed) return 'completed'

      // Step 1 is always available (no prerequisite)
      return 'available'
    }

    // Fallback: old project-level behavior (no zone selected)
    const currentStep = progress.find(p =>
      p.sStep === sStep &&
      p.miniStep === miniStep &&
      (p.zoneId === null || p.zoneId === currentZone?.id)
    )
    if (currentStep?.completed) return 'completed'

    // Mini-step 1 is always available
    if (miniStep === 1) return 'available'

    // Admin with free navigation can access everything
    if (skipLocks) return 'available'

    // Normal progressive unlocking: previous step must be completed
    const prevStep = progress.find(p =>
      p.sStep === sStep &&
      p.miniStep === miniStep - 1 &&
      (p.zoneId === null || p.zoneId === currentZone?.id)
    )
    if (!prevStep?.completed) return 'locked'
    return 'available'
  },

  isZoneMiniStepComplete: (sStep, miniStep, zoneId) => {
    const { progress, employeeProgress, currentProject } = get()
    if (!currentProject) return false

    if (ZONE_MINI_STEPS.includes(miniStep)) {
      // Zone step: check if the zone's Progress record is completed
      const zoneStep = progress.find(p =>
        p.sStep === sStep &&
        p.miniStep === miniStep &&
        p.zoneId === zoneId
      )
      return zoneStep?.completed ?? false
    }

    if (INDIVIDUAL_MINI_STEPS.includes(miniStep)) {
      // Individual step (1 only): ALL employees in the zone must have completed
      // The zone-level Progress record for step 1 is only marked completed when ALL employees pass
      const zoneStep = progress.find(p =>
        p.sStep === sStep &&
        p.miniStep === miniStep &&
        (p.zoneId === zoneId || p.zoneId === null) &&
        p.completed
      )
      return !!zoneStep
    }

    return false
  },

  isQuesitoEarned: (sStep) => {
    const { progress, currentZone } = get()
    const zoneId = currentZone?.id || null

    // Check ALL 5 mini-steps are completed — each one individually
    // The zone-level Progress records are the source of truth:
    // - Step 1: completed only when ALL employees in zone have passed
    // - Steps 2-4: completed when zone-level Progress record is marked completed
    // - Step 5: completed when auditor has passed
    for (let miniStep = 1; miniStep <= 5; miniStep++) {
      const zoneStep = progress.find(p =>
        p.sStep === sStep &&
        p.miniStep === miniStep &&
        (p.zoneId === zoneId || p.zoneId === null) &&
        p.completed
      )
      if (!zoneStep) return false
    }
    return true
  },

  is5SCompleted: () => {
    for (let i = 1; i <= 5; i++) {
      if (!get().isQuesitoEarned(i)) return false
    }
    return true
  },

  getCompletedCount: () => {
    const { progress, currentZone } = get()

    if (currentZone) {
      const completedMiniSteps = progress.filter(p =>
        (p.zoneId === currentZone.id || p.zoneId === null) &&
        p.completed
      ).length
      let completedSSteps = 0
      for (let i = 1; i <= 5; i++) {
        if (get().isQuesitoEarned(i)) completedSSteps++
      }
      return { sSteps: completedSSteps, miniSteps: completedMiniSteps, total: 25 }
    }

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
        // Fetch user's assigned zones after login
        await get().fetchUserZones()
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
      currentZone: null,
      userZones: [],
      authView: 'login',
      projects: [],
      companies: [],
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
          // Fetch user's assigned zones after session restore
          await get().fetchUserZones()
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

  fetchCompanies: async () => {
    try {
      const res = await fetch('/api/companies')
      const data = await res.json()
      if (data.success) {
        set({ companies: data.companies || [] })
      }
    } catch (error) {
      console.error('Fetch companies error:', error)
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
