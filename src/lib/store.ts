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
  boardConfigId: string | null
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

// Mini-step types: ZONE steps (2,3,5) are collaborative per zone; INDIVIDUAL steps (1,4) are per employee
// Step 1 (Formación+Examen) is individual — each employee must pass the exam
// Step 4 (Autoevaluación) is individual — each employee/responsable does their own self-assessment
//   For S1/S2/S3/S5: done by empleados; for S4: done by responsable
// Step 5 (Auditoría) is zone-level — done by auditor for the zone as a whole
const ZONE_MINI_STEPS = [2, 3, 5]
const INDIVIDUAL_MINI_STEPS = [1, 4]

// User's assigned zones (filtered by MemberZone for empleados)
export interface UserZoneAssignment {
  id: string
  name: string
  description: string | null
  color: string
  projectId: string
  responsableId: string | null
  boardConfigId: string | null
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
  activeTab: 'board' | 'gerente' | 'admin' | 'maintenance' | 'gestion' | 'actionplan'
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
  setActiveTab: (tab: 'board' | 'gerente' | 'admin' | 'maintenance' | 'gestion' | 'actionplan') => void
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
  activeTab: 'board' as 'board' | 'gerente' | 'admin' | 'maintenance' | 'gestion' | 'actionplan',
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
      const { currentProject, currentZone } = get()
      const params = currentProject ? `?projectId=${currentProject.id}` : ''
      const res = await fetch(`/api/progress${params}`)
      const data = await res.json()
      // API returns { success: true, data: [...] }
      const progressData = data?.data ? data.data : (Array.isArray(data) ? data : [])
      set({ progress: progressData, isLoadingProgress: false })

      // Also refresh employee progress to keep isQuesitoEarned accurate
      if (currentProject) {
        try {
          const epParams = `?projectId=${currentProject.id}` + (currentZone ? `&zoneId=${currentZone.id}` : '')
          const epRes = await fetch(`/api/employee-progress${epParams}`)
          const epData = await epRes.json()
          const epResult = epData?.data ? epData.data : (Array.isArray(epData) ? epData : [])
          set({ employeeProgress: epResult })
        } catch (epError) {
          console.error('Error fetching employee progress during refresh:', epError)
        }
      }
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

      // Auto-select zone if user has zones but none selected yet
      const { currentUser, currentZone, currentProject } = get()
      if (zones.length >= 1 && !currentZone) {
        const z = zones[0]
        // Find matching zone in current project
        const projectZone = currentProject?.zones.find(pz => pz.id === z.id) || {
          id: z.id, name: z.name, description: z.description, color: z.color, projectId: z.projectId, responsableId: z.responsableId, boardConfigId: z.boardConfigId || null
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
    // Permission-driven: check rolePermissionConfig from DB (NO admin bypass)
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
  // getMiniStepStatus — Permission-Driven with Business Rules
  // Permissions are the source of truth for WHO can do WHAT.
  // Business rules define WHEN things are accessible:
  //   - INTER-S progression: S2 requires S1 completed, S3 requires S2, etc.
  //   - INTRA-S progression: step N requires step N-1 completed
  //   - Step 5 (audit): requires steps 1-4 ALL completed within the same S
  //   - a1 (perform) → can enter and act (if previous step done)
  //   - a0 (view) only → can see the step exists, but CANNOT enter it
  //   - No permission → locked (not even visible)
  //   - IMPORTANT: Previous step completion is checked at ZONE level,
  //     so an auditor can access step 5 if employees completed 1-4
  //   - For step 1 (individual): also checks EmployeeProgress for the
  //     current user, so the employee's own completion unlocks step 2
  // ═══════════════════════════════════════════════════════
  getMiniStepStatus: (sStep, miniStep) => {
    const { progress, employeeProgress, currentUser, adminFreeNavigation, currentZone } = get()
    if (!currentUser) return 'locked'

    const canViewStep = get().canView(sStep, miniStep)
    const canPerformStep = get().canPerform(sStep, miniStep)
    // Permission-driven: skip_steps from DB replaces hardcoded isAdmin check
    const canSkipSteps = get().hasPermission('skip_steps')
    const skipLocks = canSkipSteps && adminFreeNavigation

    // Check if a specific mini-step of a specific S is completed at zone level
    const isStepCompletedAt = (s: number, ms: number): boolean => {
      if (currentZone) {
        const zoneStep = progress.find(p =>
          p.sStep === s &&
          p.miniStep === ms &&
          (p.zoneId === currentZone.id || p.zoneId === null) &&
          p.completed
        )
        return !!zoneStep
      }
      const anyStep = progress.find(p =>
        p.sStep === s &&
        p.miniStep === ms &&
        p.completed
      )
      return !!anyStep
    }

    // Check if a specific S-step (all 5 mini-steps) is fully completed (quesito earned)
    // Also checks employeeProgress for individual steps, consistent with areSteps1to4Completed
    const isSCompleted = (s: number): boolean => {
      for (let ms = 1; ms <= 5; ms++) {
        // Check zone-level progress first
        if (isStepCompletedAt(s, ms)) continue
        // Also check employeeProgress for this step (e.g., individual formación step 1)
        const anyEmpCompleted = currentZone
          ? employeeProgress.some(ep =>
              ep.sStep === s &&
              ep.miniStep === ms &&
              ep.zoneId === currentZone.id &&
              ep.completed
            )
          : employeeProgress.some(ep =>
              ep.sStep === s &&
              ep.miniStep === ms &&
              ep.completed
            )
        if (!anyEmpCompleted) return false
      }
      return true
    }

    // Check if the CURRENT USER has completed step 1 individually (EmployeeProgress)
    // This is crucial for unlocking step 2 for an employee who passed the exam
    // even if not ALL employees in the zone have completed it yet
    const hasUserCompletedStep1 = (): boolean => {
      if (!currentZone) return false
      const userStep = employeeProgress.find(ep =>
        ep.sStep === sStep &&
        ep.miniStep === 1 &&
        ep.zoneId === currentZone.id &&
        ep.userId === currentUser.id &&
        ep.completed
      )
      return !!userStep
    }

    // Check if already completed at zone level (or project level if no zone)
    const isStepCompleted = (): boolean => isStepCompletedAt(sStep, miniStep)

    // Check if the CURRENT USER has completed this individual step (EmployeeProgress)
    // For step 1 (formación) and step 4 (autoevaluación), completion is tracked per employee
    const hasUserCompletedIndividualStep = (): boolean => {
      if (!currentZone) return false
      if (miniStep !== 1 && miniStep !== 4) return false // Only individual steps
      const userStep = employeeProgress.find(ep =>
        ep.sStep === sStep &&
        ep.miniStep === miniStep &&
        ep.zoneId === currentZone.id &&
        ep.userId === currentUser.id &&
        ep.completed
      )
      return !!userStep
    }

    // Combined: step is "done" if either zone-level completed OR user completed individually
    const isStepDoneForUser = (): boolean => isStepCompleted() || hasUserCompletedIndividualStep()

    // Check if step is completed by ANYONE (zone or any employee)
    // This is crucial: ALL users must see completed steps in green,
    // even if they don't have permission to enter them (e.g., auditors viewing steps 1-4)
    const isStepCompletedByAnyone = (): boolean => {
      if (isStepCompleted()) return true
      if (!currentZone) {
        return employeeProgress.some(ep =>
          ep.sStep === sStep &&
          ep.miniStep === miniStep &&
          ep.completed
        )
      }
      return employeeProgress.some(ep =>
        ep.sStep === sStep &&
        ep.miniStep === miniStep &&
        ep.zoneId === currentZone.id &&
        ep.completed
      )
    }

    // Helper: check if steps 1-4 are all completed for this S-step
    // Uses BOTH zone-level progress AND any employee progress,
    // so auditors can access step 5 when employees have completed 1-4
    const areSteps1to4Completed = (): boolean => {
      for (let ms = 1; ms <= 4; ms++) {
        const zoneCompleted = isStepCompletedAt(sStep, ms)
        if (zoneCompleted) continue
        // Check if ANY employee has completed this step individually
        const anyEmpCompleted = currentZone
          ? employeeProgress.some(ep =>
              ep.sStep === sStep &&
              ep.miniStep === ms &&
              ep.zoneId === currentZone.id &&
              ep.completed
            )
          : employeeProgress.some(ep =>
              ep.sStep === sStep &&
              ep.miniStep === ms &&
              ep.completed
            )
        if (!anyEmpCompleted) return false
      }
      return true
    }

    // ═══ INTER-S PROGRESSION CHECK ═══
    // S1 is always available. S2 requires S1 completed. S3 requires S2. Etc.
    // This enforces the 5S methodology sequence: Clasificar → Ordenar → Limpiar → Estandarizar → Mantener
    const isPreviousSCompleted = (): boolean => {
      if (sStep === 1) return true // S1 has no prerequisite
      return isSCompleted(sStep - 1)
    }

    // ═══ INTRA-S PROGRESSION CHECK ═══
    // Step 1: always available (if you have permission AND previous S is done)
    // Steps 2-4: need the immediately previous step completed
    // Step 5: needs ALL steps 1-4 completed
    // IMPORTANT: Completion checks include BOTH zone-level AND any employee progress,
    // so auditors/responsables can see steps as available when employees completed them
    const isPreviousStepCompleted = (): boolean => {
      if (miniStep === 1) return true
      if (miniStep === 5) return areSteps1to4Completed()
      // Steps 2, 3, 4: need previous step completed at zone level
      if (isStepCompletedAt(sStep, miniStep - 1)) return true
      // For step 2: current user completed step 1 individually (exam passed)
      if (miniStep === 2 && hasUserCompletedStep1()) return true
      // Also check: ANY employee completed previous step (for auditors/responsables)
      const anyEmpCompletedPrev = currentZone
        ? employeeProgress.some(ep =>
            ep.sStep === sStep &&
            ep.miniStep === miniStep - 1 &&
            ep.zoneId === currentZone.id &&
            ep.completed
          )
        : employeeProgress.some(ep =>
            ep.sStep === sStep &&
            ep.miniStep === miniStep - 1 &&
            ep.completed
          )
      if (anyEmpCompletedPrev) return true
      return false
    }

    // ── If already completed (zone-level OR user's individual), VERIFY COHERENCY ──
    if (isStepDoneForUser()) {
      const isChainCoherent = (): boolean => {
        // First check inter-S: previous S must be completed
        if (!isPreviousSCompleted()) return false
        // Then check intra-S chain — reuse same logic as isPreviousStepCompleted
        if (miniStep === 1) return true // Step 1 is always coherent if previous S is done
        if (miniStep === 5) return areSteps1to4Completed()
        if (isStepCompletedAt(sStep, miniStep - 1)) return true
        if (miniStep === 2 && hasUserCompletedStep1()) return true
        // Also check any employee completed previous step
        const anyEmpPrev = currentZone
          ? employeeProgress.some(ep =>
              ep.sStep === sStep &&
              ep.miniStep === miniStep - 1 &&
              ep.zoneId === currentZone.id &&
              ep.completed
            )
          : employeeProgress.some(ep =>
              ep.sStep === sStep &&
              ep.miniStep === miniStep - 1 &&
              ep.completed
            )
        if (anyEmpPrev) return true
        return false
      }

      if (isChainCoherent()) {
        if (canPerformStep || canSkipSteps) return 'completed'
        if (canViewStep) return 'completed_viewonly'
        return 'locked'
      }
      // Chain is incoherent: treat as NOT completed — fall through
    }

    // ── Step completed by ANYONE (zone or employee) → show as green for ALL users ──
    // Even users without permission must see completed steps in green
    if (isStepCompletedByAnyone()) {
      if (canPerformStep || canSkipSteps) return 'completed'
      // Everyone else sees it as completed_viewonly (green, read-only)
      return 'completed_viewonly'
    }

    // ── Admin with lock open: skip all checks ──
    if (skipLocks) return 'available'

    // ── No permission at all = locked ──
    if (!canViewStep && !canPerformStep) return 'locked'

    // ── Has perform permission (a1) → check progression ──
    if (canPerformStep) {
      // INTER-S: can't start this S until previous S is completed
      if (!isPreviousSCompleted()) return 'locked'
      // INTRA-S: can't enter step until previous step is completed
      if (!isPreviousStepCompleted()) return 'locked'
      return 'available'
    }

    // ── Has view permission only (a0) → can see but CANNOT enter ──
    if (canViewStep) return 'locked'

    return 'locked'
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
    const { progress, employeeProgress, currentZone } = get()
    const zoneId = currentZone?.id || null

    // Check ALL 5 mini-steps are completed — each one individually
    // For zone-level steps (2,3,5): check progress table
    // For individual steps (1,4): also check employeeProgress as fallback
    for (let miniStep = 1; miniStep <= 5; miniStep++) {
      // Check zone-level progress first
      const zoneStep = progress.find(p =>
        p.sStep === sStep &&
        p.miniStep === miniStep &&
        (p.zoneId === zoneId || p.zoneId === null) &&
        p.completed
      )
      if (zoneStep) continue

      // Also check employeeProgress for this step (e.g., individual formación step 1)
      // This ensures the quesito is earned even when not all employees have completed step 1,
      // but the auditor was able to pass step 5 (audit) because areSteps1to4Completed returned true
      const anyEmpCompleted = currentZone
        ? employeeProgress.some(ep =>
            ep.sStep === sStep &&
            ep.miniStep === miniStep &&
            ep.zoneId === currentZone.id &&
            ep.completed
          )
        : employeeProgress.some(ep =>
            ep.sStep === sStep &&
            ep.miniStep === miniStep &&
            ep.completed
          )
      if (anyEmpCompleted) continue

      return false
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

      if (!data.user) {
        set({ isLoginLoading: false, authError: 'Error inesperado al iniciar sesión' })
        return false
      }

      set({ currentUser: data.user, isLoginLoading: false, authError: null })

      // Load permissions after login
      try {
        await get().fetchPermissions()
      } catch (e) {
        console.error('Error loading permissions after login:', e)
      }

      // Gestor (dueño de la app) goes directly to management panel
      if (data.user.role === 'gestor') {
        set({ authView: 'board', activeTab: 'gestion' })
        try {
          await get().fetchCompanies()
        } catch (e) {
          console.error('Error fetching companies after login:', e)
        }
        return true
      }

      // Check for projects after login
      try {
        await get().fetchProjects()
      } catch (e) {
        console.error('Error fetching projects after login:', e)
      }
      const { projects } = get()

      if (projects.length > 0) {
        set({ currentProject: projects[0], authView: 'board' })
        // Fetch user's assigned zones after login
        try {
          await get().fetchUserZones()
        } catch (e) {
          console.error('Error fetching user zones after login:', e)
        }
      } else {
        // Only admin can create projects via setup wizard
        // Non-admin users see a waiting screen
        if (data.user.role === 'admin') {
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

        // Gestor (dueño de la app) goes directly to management panel
        if (data.user.role === 'gestor') {
          set({ authView: 'board', activeTab: 'gestion' })
          await get().fetchCompanies()
          set({ isAuthLoading: false })
          return
        }

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
