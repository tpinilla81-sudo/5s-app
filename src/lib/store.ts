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

// Permission map: { [role]: { [permissionId]: boolean } }
export interface PermissionMap {
  [role: string]: {
    [permission: string]: boolean
  }
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

  // Permissions State
  permissions: PermissionMap

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

  // Permission Actions
  fetchPermissions: () => Promise<void>
  hasPermission: (permission: string) => boolean  // Check if current user has a permission
  canPerform: (sStep: number, miniStep: number) => boolean  // Check a1 (execute) permission
  canView: (sStep: number, miniStep: number) => boolean  // Check a0 (view) permission

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

  // Permissions State
  permissions: {},

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
    const { currentUser, currentProject, userZones, permissions } = get()
    if (!currentProject) return []

    // Direct permission check (avoid circular get().hasPermission during store init)
    const checkPerm = (perm: string): boolean => {
      if (!currentUser) return false
      if (currentUser.role === 'admin') return true
      const rolePerms = permissions[currentUser.role]
      return rolePerms?.[perm] === true
    }

    // Users with manage_zones permission can see all project zones
    if (checkPerm('manage_zones')) {
      return currentProject.zones
    }

    // Users with view_board: show assigned zones or all if none assigned
    if (checkPerm('view_board')) {
      const userZoneIds = userZones.map(uz => uz.id)
      const assignedZones = currentProject.zones.filter(z => userZoneIds.includes(z.id))
      if (assignedZones.length === 0) {
        return currentProject.zones
      }
      return assignedZones
    }

    // Fallback: only assigned zones
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

  // ═══════════════════════════════════════════════════════
  // PERMISSION SYSTEM — Single source of truth
  // ═══════════════════════════════════════════════════════

  fetchPermissions: async () => {
    try {
      const res = await fetch('/api/permissions')
      const data = await res.json()
      if (data.permissions) {
        set({ permissions: data.permissions })
      }
    } catch (error) {
      console.error('Error fetching permissions:', error)
    }
  },

  hasPermission: (permission: string): boolean => {
    const { currentUser, permissions } = get()
    if (!currentUser) return false
    // Admin always has all permissions
    if (currentUser.role === 'admin') return true
    const rolePerms = permissions[currentUser.role]
    if (!rolePerms) return false
    return rolePerms[permission] === true
  },

  canPerform: (sStep: number, miniStep: number): boolean => {
    // Check a1 (execute/perform) permission for a specific sStep + miniStep
    return get().hasPermission(`s${sStep}_step${miniStep}_a1`)
  },

  canView: (sStep: number, miniStep: number): boolean => {
    // Check a0 (view) permission for a specific sStep + miniStep
    return get().hasPermission(`s${sStep}_step${miniStep}_a0`)
  },

  // ═══════════════════════════════════════════════════════
  // getMiniStepStatus — Permission-driven, no hardcoded roles
  // ═══════════════════════════════════════════════════════
  getMiniStepStatus: (sStep, miniStep) => {
    const { progress, currentUser, adminFreeNavigation, currentZone, employeeProgress } = get()
    if (!currentUser) return 'locked'

    const canViewStep = get().canView(sStep, miniStep)
    const canPerformStep = get().canPerform(sStep, miniStep)
    const isAdmin = currentUser.role === 'admin'
    const skipLocks = isAdmin && adminFreeNavigation

    // Helper: check if steps 1-4 are all completed for this S-step in the current zone
    const areSteps1to4Completed = (): boolean => {
      if (!currentZone) return false
      for (let ms = 1; ms <= 4; ms++) {
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

    // Check if already completed at zone level
    const isStepCompleted = (): boolean => {
      if (currentZone) {
        const zoneStep = progress.find(p =>
          p.sStep === sStep &&
          p.miniStep === miniStep &&
          (p.zoneId === currentZone.id || p.zoneId === null) &&
          p.completed
        )
        return !!zoneStep
      }
      return false
    }

    // ── If already completed, always show as completed ──
    if (isStepCompleted()) return 'completed'

    // ── No view permission = locked ──
    if (!canViewStep && !canPerformStep && !skipLocks) return 'locked'

    // ── Admin with lock open: skip all business logic ──
    if (skipLocks) return 'available'

    // ── Step 5 (Auditoría): requires steps 1-4 completed ──
    // This is a business rule, not a role rule — anyone with a1 for step 5 can audit
    // but only after steps 1-4 are done
    if (miniStep === 5) {
      if (canPerformStep) {
        // Has audit permission — check if steps 1-4 are done
        if (areSteps1to4Completed()) return 'available'
        return 'locked'
      }
      // Has view permission only — can view but needs 1-4 done
      if (canViewStep) {
        if (areSteps1to4Completed()) return 'available'
        return 'locked'
      }
      return 'locked'
    }

    // ── Has perform permission but is view-only for this step ──
    // (a1 = false, a0 = true) → can view but not execute (modals handle read-only)
    // (a1 = true) → can execute

    // ── Cross-S dependency: only for users who can PERFORM steps ──
    // Users who can only VIEW don't need to wait for the previous S
    if (canPerformStep && sStep > 1) {
      const prevSEarned = get().isQuesitoEarned(sStep - 1)
      if (!prevSEarned) {
        // Previous S not earned yet — if user can only view, show as available (read-only)
        // If user can perform, lock it (must follow sequence)
        return 'locked'
      }
    }

    // ── View-only users (a0=true, a1=false): always available for viewing ──
    if (canViewStep && !canPerformStep) {
      return 'available'
    }

    // ── Perform users (a1=true): apply sequential business logic ──
    if (canPerformStep) {
      // Step 1 (Formación): always available
      if (miniStep === 1) {
        if (INDIVIDUAL_MINI_STEPS.includes(miniStep) && currentZone && currentUser) {
          const myProgress = employeeProgress.find(ep =>
            ep.sStep === sStep &&
            ep.miniStep === miniStep &&
            ep.zoneId === currentZone.id &&
            ep.userId === currentUser.id
          )
          if (myProgress?.completed) return 'completed'
        }
        return 'available'
      }

      // Steps 2-4: check zone-level progression
      if (ZONE_MINI_STEPS.includes(miniStep) && currentZone) {
        const zoneStep = progress.find(p =>
          p.sStep === sStep &&
          p.miniStep === miniStep &&
          p.zoneId === currentZone.id
        )
        if (zoneStep?.completed) return 'completed'

        // Step 2 (Fotos): requires THIS user completed Step 1
        if (miniStep === 2) {
          const myStep1 = employeeProgress.find(ep =>
            ep.sStep === sStep &&
            ep.miniStep === 1 &&
            ep.zoneId === currentZone.id &&
            ep.userId === currentUser.id
          )
          if (!myStep1?.completed) return 'locked'
          return 'available'
        }

        // Step 3 (Inventario): requires Step 2 completed at zone level
        if (miniStep === 3) {
          const step2 = progress.find(p =>
            p.sStep === sStep &&
            p.miniStep === 2 &&
            (p.zoneId === currentZone.id || p.zoneId === null) &&
            p.completed
          )
          if (step2) return 'available'
          return 'locked'
        }

        // Step 4 (Autoevaluación): requires Step 3 completed at zone level
        if (miniStep === 4) {
          const step3 = progress.find(p =>
            p.sStep === sStep &&
            p.miniStep === 3 &&
            (p.zoneId === currentZone.id || p.zoneId === null) &&
            p.completed
          )
          if (step3) return 'available'
          return 'locked'
        }

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
        return 'available'
      }
    }

    // Fallback: old project-level behavior (no zone selected)
    const currentStep = progress.find(p =>
      p.sStep === sStep &&
      p.miniStep === miniStep &&
      (p.zoneId === null || p.zoneId === currentZone?.id)
    )
    if (currentStep?.completed) return 'completed'

    if (miniStep === 1) return 'available'
    if (skipLocks) return 'available'

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

      // Load permissions after login
      await get().fetchPermissions()

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

      // Load permissions after registration
      await get().fetchPermissions()

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
      permissions: {},
    })
  },

  checkSession: async () => {
    try {
      set({ isAuthLoading: true })
      const res = await fetch('/api/auth')
      const data = await res.json()

      if (data.user) {
        set({ currentUser: data.user })

        // Load permissions after session restore
        await get().fetchPermissions()

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
