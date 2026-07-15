'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { use5SStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table'
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from '@/components/ui/dialog'
import {
 Crown,
 Building2,
 Users,
 CreditCard,
 Settings,

 Plus,
 Edit3,
 Check,
 X,
 Loader2,
 Shield,
 Activity,
 TrendingUp,
 AlertTriangle,
 CheckCircle2,
 XCircle,
 Eye,
 EyeOff,
 BarChart3,

 Zap,
 Save,
 Trash2,
 Key,
 BookOpen,
} from 'lucide-react'
import TemplateManager from './TemplateManager'
// Tablero5S removed — the board is defined and is what it is

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlatformStats {
 totals: {
  companies: number
  activeCompanies: number
  users: number
  activeUsers: number
  projects: number
  activeProjects: number
  templates: number
  auditResults: number
  actions: number
  openActions: number
 }
 roleDistribution: Record<string, number>
 companies: Array<{
  id: string
  name: string
  description: string | null
  active: boolean
  createdAt: string
  projectCount: number
  memberCount: number
 }>
 recentUsers: Array<{
  id: string
  name: string
  email: string
  role: string
  active: boolean
  createdAt: string
 }>
 projects: Array<{
  id: string
  name: string
  description: string | null
  company: string
  companyId: string | null
  companyName: string | null
  active: boolean
  startDate: string
  createdAt: string
  memberCount: number
  zoneCount: number
 }>
 users: Array<{
  id: string
  name: string
  email: string
  role: string
  active: boolean
  createdAt: string
  companies: Array<{ id: string; name: string; role: string }>
  projects: Array<{ id: string; name: string; company: string; role: string }>
 }>
}

interface Subscription {
 id: string
 companyId: string
 plan: string
 status: string
 maxUsers: number
 maxProjects: number
 price: number
 startDate: string
 endDate: string | null
 trialEndsAt: string | null
 notes: string | null
 createdAt: string
 updatedAt: string
 company?: { id: string; name: string; active: boolean }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
 gestor: 'Gestor (Dueño)',
 admin: 'Admin de Empresa',
 gerente: 'Gerente',
 responsable: 'Responsable',
 empleado: 'Empleado',
 auditor: 'Auditor',
}

const ROLE_COLORS: Record<string, string> = {
 gestor: 'bg-red-100 text-red-700 border-red-200',
 admin: 'bg-purple-100 text-purple-700 border-purple-200',
 gerente: 'bg-indigo-100 text-indigo-700 border-indigo-200',
 responsable: 'bg-blue-100 text-blue-700 border-blue-200',
 empleado: 'bg-green-100 text-green-700 border-green-200',
 auditor: 'bg-orange-100 text-orange-700 border-orange-200',
}

const SUBSCRIPTION_STATUS: Record<string, { label: string; color: string }> = {
 activa: { label: 'Activa', color: 'bg-green-100 text-green-700 border-green-200' },
 prueba: { label: 'Prueba', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
 vencida: { label: 'Vencida', color: 'bg-red-100 text-red-700 border-red-200' },
 cancelada: { label: 'Cancelada', color: 'bg-gray-100 text-gray-700 border-gray-200' },
}

const PLAN_LABELS: Record<string, string> = {
 gratuito: 'Gratuito',
 basico: 'Básico',
 profesional: 'Profesional',
 enterprise: 'Enterprise',
}

const PLAN_COLORS: Record<string, string> = {
 gratuito: 'bg-gray-100 text-gray-700 border-gray-200',
 basico: 'bg-blue-100 text-blue-700 border-blue-200',
 profesional: 'bg-violet-100 text-violet-700 border-violet-200',
 enterprise: 'bg-amber-100 text-amber-700 border-amber-200',
}

const PLAN_DEFAULTS: Record<string, { maxUsers: number; maxProjects: number; price: number }> = {
 gratuito: { maxUsers: 5, maxProjects: 1, price: 0 },
 basico: { maxUsers: 15, maxProjects: 3, price: 49 },
 profesional: { maxUsers: 50, maxProjects: 10, price: 149 },
 enterprise: { maxUsers: -1, maxProjects: -1, price: 299 },
}

type ConstructorTab = 'empresas' | 'configuracion' | 'administracion'

type ConfigSubTab = 'plantillas' | 'roles'

// Permission display definitions for the matrix
const PROJECT_PERMISSION_LABELS: Record<string, string> = {
 view_board: 'Ver Tablero',
 view_progress: 'Ver Progreso',
 view_project: 'Ver Proyecto',
 edit_project: 'Editar Proyecto',
 manage_zones: 'Gestionar Zonas',
 view_team: 'Ver Equipo',
 add_members: 'Agregar Miembros',
 remove_members: 'Eliminar Miembros',
 change_roles: 'Cambiar Roles',
 manage_training: 'Gestionar Formación',
 delete_photos: 'Eliminar Fotos',
 delete_inventory: 'Eliminar Inventario',
 approve_audit: 'Aprobar Auditoría',
 delete_project: 'Eliminar Proyecto',
 reset_data: 'Reiniciar Datos',
 manage_templates: 'Gestionar Plantillas',
 skip_steps: 'Saltar Pasos',
 notify_audit: 'Notificar Auditoría',
 accept_audit_meeting: 'Aceptar Reunión',
}

const PLATFORM_PERMISSION_LABELS: Record<string, string> = {
 platform_create_company: 'Crear Empresas',
 platform_edit_company: 'Editar Empresas',
 platform_delete_company: 'Eliminar Empresas',
 platform_view_companies: 'Ver Empresas',
 platform_activate_company: 'Activar/Desactivar',
 platform_assign_admin: 'Asignar Admin',
 platform_remove_admin: 'Quitar Admin',
 platform_reset_admin_pwd: 'Resetear Contraseña',
 platform_view_all_users: 'Ver Todos los Usuarios',
 platform_edit_users: 'Editar Usuarios',
 platform_manage_contracts: 'Gestionar Contratos',
 platform_view_contracts: 'Ver Contratos',
 platform_manage_subscriptions: 'Gestionar Suscripciones',
 platform_set_company_limits: 'Definir Límites',
 platform_config: 'Configurar Plataforma',
 platform_manage_templates: 'Gestionar Plantillas',
 platform_view_stats: 'Ver Estadísticas',
 platform_send_notifications: 'Enviar Notificaciones',
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ConstructorPanel() {
 const { setCurrentView, fetchProjects, fetchCompanies, projects, setCurrentProject, currentProject, currentUser } = use5SStore()
 const [activeTab, setActiveTab] = useState<ConstructorTab>('empresas')
 const [configSubTab, setConfigSubTab] = useState<ConfigSubTab>('plantillas')

 // Platform stats
 const [stats, setStats] = useState<PlatformStats | null>(null)
 const [isLoadingStats, setIsLoadingStats] = useState(false)

 // Users management
 const [users, setUsers] = useState<PlatformStats['users']>([])
 const [isLoadingUsers, setIsLoadingUsers] = useState(false)
 const [editingUser, setEditingUser] = useState<string | null>(null)
 const [editUserData, setEditUserData] = useState({ name: '', email: '', role: '', active: true })
 const [filterCompany, setFilterCompany] = useState<string>('')
 const [filterRole, setFilterRole] = useState<string>('')

 // Companies management
 const [showNewCompany, setShowNewCompany] = useState(false)
 const [editingCompany, setEditingCompany] = useState<string | null>(null)
 const [editCompanyData, setEditCompanyData] = useState({ name: '', description: '', active: true })
 const [isCreatingCompany, setIsCreatingCompany] = useState(false)

 // New company form
 const [newCompanyName, setNewCompanyName] = useState('')
 const [newCompanyDesc, setNewCompanyDesc] = useState('')
 const [adminMode, setAdminMode] = useState<'create' | 'assign'>('create')
 const [newAdminName, setNewAdminName] = useState('')
 const [newAdminEmail, setNewAdminEmail] = useState('')
 const [newAdminPassword, setNewAdminPassword] = useState('')
 const [assignUserId, setAssignUserId] = useState('')
 const [assignUserSearch, setAssignUserSearch] = useState('')
 const [assignUserResults, setAssignUserResults] = useState<Array<{ id: string; name: string; email: string; role: string }>>([])
 const [newSubPlan, setNewSubPlan] = useState('gratuito')
 const [newSubStatus, setNewSubStatus] = useState('activa')
 const [newSubMaxUsers, setNewSubMaxUsers] = useState(5)
 const [newSubMaxProjects, setNewSubMaxProjects] = useState(1)
 const [newSubPrice, setNewSubPrice] = useState(0)
 const [newSubEndDate, setNewSubEndDate] = useState('')
 const [newSubTrialEndsAt, setNewSubTrialEndsAt] = useState('')
 const [newSubNotes, setNewSubNotes] = useState('')

 // Subscriptions
 const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
 const [isLoadingSubs, setIsLoadingSubs] = useState(false)
 const [editingSub, setEditingSub] = useState<Subscription | null>(null)
 const [editSubData, setEditSubData] = useState<any>({})

 // Company admins map: companyId → admin user info
 const [companyAdmins, setCompanyAdmins] = useState<Record<string, { name: string; email: string }>>({})

 // Delete company confirmation
 const [deletingCompany, setDeletingCompany] = useState<{ id: string; name: string; projectCount: number } | null>(null)

 // Gestor profile edit
 const [showGestorProfile, setShowGestorProfile] = useState(false)
 const [gestorProfileData, setGestorProfileData] = useState({ name: '', email: '', currentPassword: '', newPassword: '', confirmNewPassword: '' })
 const [isSavingProfile, setIsSavingProfile] = useState(false)
 const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

 // Password reset
 const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null)
 const [newPassword, setNewPassword] = useState('')
 const [showPassword, setShowPassword] = useState(false)

 // Delete user confirmation
 const [deletingUser, setDeletingUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null)

 // Permissions
 const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({})
 const [isLoadingPermissions, setIsLoadingPermissions] = useState(false)
 const [savingPermissions, setSavingPermissions] = useState(false)

 // ─── Data loading ────────────────────────────────────────────────────────
 const loadStats = useCallback(async () => {
  setIsLoadingStats(true)
  try {
   const res = await fetch('/api/platform-stats')
   const data = await res.json()
   if (data.success) {
    setStats(data.data)
    setUsers(data.data.users || [])
   }
  } catch (error) {
   console.error('Error loading platform stats:', error)
  } finally {
   setIsLoadingStats(false)
  }
 }, [])

 const loadUsers = useCallback(async () => {
  setIsLoadingUsers(true)
  try {
   const res = await fetch('/api/users')
   const data = await res.json()
   if (data.success) {
    setUsers(data.users || [])
   }
  } catch (error) {
   console.error('Error loading users:', error)
  } finally {
   setIsLoadingUsers(false)
  }
 }, [])

 const loadSubscriptions = useCallback(async () => {
  setIsLoadingSubs(true)
  try {
   const res = await fetch('/api/subscriptions')
   const data = await res.json()
   if (data.success) {
    setSubscriptions(data.subscriptions || [])
   }
  } catch (error) {
   console.error('Error loading subscriptions:', error)
  } finally {
   setIsLoadingSubs(false)
  }
 }, [])

 const loadPermissions = useCallback(async () => {
  setIsLoadingPermissions(true)
  try {
   const res = await fetch('/api/permissions')
   const data = await res.json()
   if (data.permissions) {
    setPermissions(data.permissions)
   }
  } catch (error) {
   console.error('Error loading permissions:', error)
  } finally {
   setIsLoadingPermissions(false)
  }
 }, [])

 const loadCompanyAdmins = useCallback(async () => {
  if (!stats?.companies) return
  try {
   const adminMap: Record<string, { name: string; email: string }> = {}
   for (const company of stats.companies) {
    const res = await fetch(`/api/companies/${company.id}/members`)
    const data = await res.json()
    if (data.success && data.members) {
     const adminMember = data.members.find((m: any) => m.role === 'admin_empresa')
     if (adminMember?.user) {
      adminMap[company.id] = { name: adminMember.user.name, email: adminMember.user.email }
     }
    }
   }
   setCompanyAdmins(adminMap)
  } catch (error) {
   console.error('Error loading company admins:', error)
  }
 }, [stats?.companies])

 useEffect(() => {
  loadStats()
  loadPermissions() // Pre-load permissions so they're always available
 }, [loadStats, loadPermissions])

 useEffect(() => {
  if (activeTab === 'administracion') {
   loadUsers()
   loadSubscriptions()
  }
 }, [activeTab, loadUsers, loadSubscriptions])

 useEffect(() => {
  if (stats?.companies && stats.companies.length > 0 && activeTab === 'empresas') {
   loadCompanyAdmins()
  }
 }, [stats?.companies, activeTab, loadCompanyAdmins])

 // ─── Company actions ────────────────────────────────────────────────────
 const resetNewCompanyForm = () => {
  setNewCompanyName('')
  setNewCompanyDesc('')
  setAdminMode('create')
  setNewAdminName('')
  setNewAdminEmail('')
  setNewAdminPassword('')
  setAssignUserId('')
  setAssignUserSearch('')
  setAssignUserResults([])
  setNewSubPlan('gratuito')
  setNewSubStatus('activa')
  const defaults = PLAN_DEFAULTS['gratuito']
  setNewSubMaxUsers(defaults.maxUsers)
  setNewSubMaxProjects(defaults.maxProjects)
  setNewSubPrice(defaults.price)
  setNewSubEndDate('')
  setNewSubTrialEndsAt('')
  setNewSubNotes('')
 }

 const handleCreateCompanyFull = async () => {
  if (!newCompanyName.trim()) return
  setIsCreatingCompany(true)
  try {
   // Step 1: Create company
   const companyRes = await fetch('/api/companies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newCompanyName, description: newCompanyDesc || undefined }),
   })
   const companyData = await companyRes.json()
   if (!companyRes.ok) {
    alert(companyData.error || 'Error al crear empresa')
    return
   }
   const companyId = companyData.company?.id || companyData.id

   // Step 2: Create or assign admin
   let adminUserId: string | null = null
   if (adminMode === 'create') {
    if (!newAdminName.trim() || !newAdminEmail.trim() || !newAdminPassword.trim()) {
     alert('Complete los datos del administrador')
     return
    }
    // Create user with role 'admin' via /api/users
    const userRes = await fetch('/api/users', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
      name: newAdminName,
      email: newAdminEmail,
      password: newAdminPassword,
      role: 'admin',
      active: true,
     }),
    })
    const userData = await userRes.json()
    if (!userRes.ok) {
     alert(userData.error || 'Error al crear usuario admin')
     return
    }
    adminUserId = userData.user?.id
   } else {
    // Assign existing user
    if (!assignUserId) {
     alert('Seleccione un usuario para asignar como administrador')
     return
    }
    adminUserId = assignUserId
    // Update user role to 'admin' if not already
    const existingUser = users.find(u => u.id === assignUserId)
    if (existingUser && existingUser.role !== 'admin') {
     await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: assignUserId, role: 'admin' }),
     })
    }
   }

   // Step 3: Add admin to company as admin_empresa
   if (adminUserId) {
    await fetch(`/api/companies/${companyId}/members`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ userId: adminUserId, role: 'admin_empresa' }),
    })
   }

   // Step 4: Create subscription
   await fetch('/api/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
     companyId,
     plan: newSubPlan,
     status: newSubStatus,
     maxUsers: newSubMaxUsers,
     maxProjects: newSubMaxProjects,
     price: newSubPrice,
     endDate: newSubEndDate || undefined,
     trialEndsAt: newSubTrialEndsAt || undefined,
     notes: newSubNotes || undefined,
    }),
   })

   // Step 5: Send welcome email to admin + notification to gestor
   if (adminMode === 'create' && adminUserId) {
    try {
     await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
       type: 'admin_welcome',
       adminName: newAdminName,
       adminEmail: newAdminEmail,
       adminPassword: newAdminPassword,
       companyName: newCompanyName,
       gestorEmail: currentUser?.email || undefined,
      }),
     })
    } catch (emailErr) {
     console.error('Error sending welcome email (non-blocking):', emailErr)
    }
   }

   setShowNewCompany(false)
   resetNewCompanyForm()
   await loadStats()
   await fetchCompanies()
  } catch (error) {
   console.error('Error creating company with admin:', error)
   alert('Error al crear la empresa. Revise la consola para detalles.')
  } finally {
   setIsCreatingCompany(false)
  }
 }

 const handleUpdateCompany = async (companyId: string) => {
  try {
   const res = await fetch(`/api/companies/${companyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(editCompanyData),
   })
   if (res.ok) {
    setEditingCompany(null)
    await loadStats()
    await fetchCompanies()
   } else {
    const data = await res.json()
    alert(data.error || 'Error al actualizar empresa')
   }
  } catch (error) {
   console.error('Error updating company:', error)
  }
 }

 const handleToggleCompanyActive = async (companyId: string, currentActive: boolean) => {
  try {
   const res = await fetch(`/api/companies/${companyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: !currentActive }),
   })
   if (res.ok) {
    await loadStats()
    await fetchCompanies()
   }
  } catch (error) {
   console.error('Error toggling company active:', error)
  }
 }

 const handleDeleteCompany = async (companyId: string) => {
  try {
   const res = await fetch(`/api/companies/${companyId}`, {
    method: 'DELETE',
   })
   const data = await res.json()
   if (res.ok) {
    setDeletingCompany(null)
    await loadStats()
    await fetchCompanies()
    await loadCompanyAdmins()
    alert(data.message || 'Empresa eliminada')
   } else {
    alert(data.error || 'Error al eliminar empresa')
   }
  } catch (error) {
   console.error('Error deleting company:', error)
   alert('Error al eliminar la empresa')
  }
 }

 // ─── Gestor profile actions ─────────────────────────────────────────────
const handleSaveGestorProfile = async () => {
  if (!currentUser) return
  setIsSavingProfile(true)
  setProfileMessage(null)

  try {
    // Validate email
    if (!gestorProfileData.email.trim()) {
      setProfileMessage({ type: 'error', text: 'El email no puede estar vacío' })
      setIsSavingProfile(false)
      return
    }

    // Validate name
    if (!gestorProfileData.name.trim()) {
      setProfileMessage({ type: 'error', text: 'El nombre no puede estar vacío' })
      setIsSavingProfile(false)
      return
    }

    // If changing password, validate
    if (gestorProfileData.newPassword) {
      if (gestorProfileData.newPassword.length < 6) {
        setProfileMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres' })
        setIsSavingProfile(false)
        return
      }
      if (gestorProfileData.newPassword !== gestorProfileData.confirmNewPassword) {
        setProfileMessage({ type: 'error', text: 'Las contraseñas no coinciden' })
        setIsSavingProfile(false)
        return
      }
      // Verify current password
      if (!gestorProfileData.currentPassword) {
        setProfileMessage({ type: 'error', text: 'Debes introducir tu contraseña actual para cambiarla' })
        setIsSavingProfile(false)
        return
      }
      // Verify current password by trying to login
      // Use gestorProfileData.email (what's in the form) which should match the DB
      // currentUser.email might be stale if the user changed their email in a previous save
      const verifyRes = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: gestorProfileData.email.trim().toLowerCase(), password: gestorProfileData.currentPassword }),
      })
      const verifyData = await verifyRes.json()
      // API /api/auth returns { user: {...} } on success, { error: '...' } on failure
      if (!verifyData.user) {
        setProfileMessage({ type: 'error', text: 'La contraseña actual es incorrecta' })
        setIsSavingProfile(false)
        return
      }
    }

    // Update user
    const updatePayload: Record<string, unknown> = {
      id: currentUser.id,
      name: gestorProfileData.name.trim(),
      email: gestorProfileData.email.trim().toLowerCase(),
    }
    if (gestorProfileData.newPassword) {
      updatePayload.password = gestorProfileData.newPassword
    }

    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    })
    const data = await res.json()

    if (data.success) {
      // Update local store properly using setState to trigger re-render
      use5SStore.setState(state => {
        if (state.currentUser) {
          state.currentUser.name = gestorProfileData.name.trim()
          state.currentUser.email = gestorProfileData.email.trim().toLowerCase()
        }
        return state
      })
      setProfileMessage({ type: 'success', text: 'Perfil actualizado correctamente' })
      setTimeout(() => {
        setShowGestorProfile(false)
        setProfileMessage(null)
      }, 2000)
    } else {
      setProfileMessage({ type: 'error', text: data.error || 'Error al actualizar el perfil' })
    }
  } catch (error) {
    console.error('Error updating gestor profile:', error)
    setProfileMessage({ type: 'error', text: 'Error de conexión al guardar' })
  } finally {
    setIsSavingProfile(false)
  }
 }

 // ─── Subscription actions ─────────────────────────────────────────────
 const handleUpdateSubscription = async () => {
  if (!editingSub) return
  try {
   const res = await fetch(`/api/subscriptions/${editingSub.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(editSubData),
   })
   if (res.ok) {
    setEditingSub(null)
    setEditSubData({})
    await loadSubscriptions()
   } else {
    const data = await res.json()
    alert(data.error || 'Error al actualizar suscripción')
   }
  } catch (error) {
   console.error('Error updating subscription:', error)
  }
 }

 // ─── User actions ────────────────────────────────────────────────────────
 const handleUpdateUser = async (userId: string) => {
  try {
   // Validate email if changing
   if (editUserData.email && !editUserData.email.trim()) {
    alert('El email no puede estar vacío')
    return
   }
   const res = await fetch('/api/users', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: userId, ...editUserData }),
   })
   if (res.ok) {
    setEditingUser(null)
    await loadUsers()
    await loadStats()
    // If the updated user is the current gestor, update the store too
    if (currentUser && userId === currentUser.id) {
     const store = use5SStore.getState()
     if (store.currentUser) {
      if (editUserData.name) store.currentUser.name = editUserData.name
      if (editUserData.email) store.currentUser.email = editUserData.email.trim().toLowerCase()
     }
    }
   } else {
    const data = await res.json()
    alert(data.error || 'Error al actualizar usuario')
   }
  } catch (error) {
   console.error('Error updating user:', error)
  }
 }

 const handleToggleActive = async (userId: string, currentActive: boolean) => {
  try {
   const res = await fetch('/api/users', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: userId, active: !currentActive }),
   })
   if (res.ok) {
    await loadUsers()
    await loadStats()
   }
  } catch (error) {
   console.error('Error toggling user active:', error)
  }
 }

 const handleResetPassword = async (userId: string) => {
  if (!newPassword || newPassword.length < 6) {
   alert('La contraseña debe tener al menos 6 caracteres')
   return
  }
  try {
   const res = await fetch('/api/users', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: userId, password: newPassword }),
   })
   if (res.ok) {
    setResetPasswordUserId(null)
    setNewPassword('')
    alert('Contraseña actualizada correctamente')
   }
  } catch (error) {
   console.error('Error resetting password:', error)
  }
 }

 const handleDeleteUser = async (userId: string) => {
  try {
   const res = await fetch(`/api/users?id=${userId}`, { method: 'DELETE' })
   const data = await res.json()
   if (res.ok) {
    setDeletingUser(null)
    await loadUsers()
    await loadStats()
   } else {
    alert(data.error || 'Error al eliminar usuario')
   }
  } catch (error) {
   console.error('Error deleting user:', error)
   alert('Error al eliminar usuario')
  }
 }

 // ─── Assign user search ──────────────────────────────────────────────
 const handleSearchUsers = async (query: string) => {
  setAssignUserSearch(query)
  if (query.length < 3) {
   setAssignUserResults([])
   return
  }
  try {
   const res = await fetch(`/api/users?search=${encodeURIComponent(query)}`)
   const data = await res.json()
   if (data.success) {
    setAssignUserResults(data.users.map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role })))
   }
  } catch (error) {
   console.error('Error searching users:', error)
  }
 }

 // ─── Permissions actions ─────────────────────────────────────────────
 const handleTogglePermission = (role: string, permission: string) => {
  setPermissions(prev => ({
   ...prev,
   [role]: {
    ...(prev[role] || {}),
    [permission]: !(prev[role]?.[permission]),
   },
  }))
 }

 const handleSavePermissions = async () => {
  setSavingPermissions(true)
  try {
   const res = await fetch('/api/permissions', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissions }),
   })
   if (res.ok) {
    alert('Permisos guardados correctamente')
   } else {
    const data = await res.json()
    alert(data.error || 'Error al guardar permisos')
   }
  } catch (error) {
   console.error('Error saving permissions:', error)
  } finally {
   setSavingPermissions(false)
  }
 }

 const handleResetPermissions = async () => {
  if (!confirm('¿Restaurar permisos a los valores por defecto? Se perderán todas las personalizaciones.')) return
  try {
   const res = await fetch('/api/permissions', { method: 'POST' })
   if (res.ok) {
    const data = await res.json()
    setPermissions(data.permissions)
    alert('Permisos restaurados')
   }
  } catch (error) {
   console.error('Error resetting permissions:', error)
  }
 }

 // ─── Filtered users ────────────────────────────────────────────────────
 const filteredUsers = users.filter(u => {
  if (filterCompany && filterCompany !== '__all__' && !u.companies.some(c => c.id === filterCompany) && !u.projects.some(p => p.company === filterCompany)) return false
  if (filterRole && filterRole !== '__all__' && u.role !== filterRole) return false
  return true
 })

 // Helper: get subscription for a company
 const getSubForCompany = (companyId: string): Subscription | undefined => {
  return subscriptions.find(s => s.companyId === companyId)
 }

 // ─── Render ──────────────────────────────────────────────────────────────
 const tabs: { key: ConstructorTab; label: string; icon: React.ReactNode }[] = [
  { key: 'empresas', label: 'Empresas', icon: <Building2 className="h-4 w-4" /> },
  { key: 'configuracion', label: 'Configuración', icon: <Settings className="h-4 w-4" /> },
  { key: 'administracion', label: 'Administración', icon: <Shield className="h-4 w-4" /> },
 ]

 const configSubTabs: { key: ConfigSubTab; label: string; icon: React.ReactNode }[] = [
  { key: 'plantillas', label: 'Plantillas', icon: <BookOpen className="h-4 w-4" /> },
  { key: 'roles', label: 'Roles y Permisos', icon: <Shield className="h-4 w-4" /> },
  { key: 'general', label: 'Config. General', icon: <Settings className="h-4 w-4" /> },
 ]

 return (
  <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-800">
   {/* Header */}
   <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-10">
    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
     <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
       <Crown className="h-5 w-5 text-yellow-300" />
      </div>
      <div>
       <h1 className="text-lg font-bold text-violet-700">
        Panel de Gestión
       </h1>
       <p className="text-xs text-slate-500">Dueño de la Plataforma 5S</p>
      </div>
     </div>
     <div className="flex items-center gap-3">
      {currentUser && (
       <button
        onClick={() => {
         setGestorProfileData({ name: currentUser.name, email: currentUser.email, currentPassword: '', newPassword: '', confirmNewPassword: '' })
         setProfileMessage(null)
         setShowGestorProfile(true)
        }}
        className="text-right hover:bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 transition-colors cursor-pointer group"
        title="Cambiar correo / contraseña"
       >
        <p className="text-xs font-medium text-slate-700 group-hover:text-amber-700">{currentUser.name}</p>
        <p className="text-[10px] text-slate-500 group-hover:text-amber-600 flex items-center gap-1">
         {currentUser.email}
         <Key className="h-2.5 w-2.5" />
        </p>
       </button>
      )}
      <Badge className="bg-gradient-to-r from-violet-600 to-purple-600 text-white border-0 px-3 py-1">
       <Crown className="h-3 w-3 mr-1" /> GESTOR
      </Badge>
     </div>
    </div>
   </header>

   {/* Tabs */}
   <div className="bg-white/80 backdrop-blur-md border-b">
    <div className="max-w-7xl mx-auto px-4 flex gap-0 overflow-x-auto">
     {tabs.map(tab => (
      <button
       key={tab.key}
       onClick={() => setActiveTab(tab.key)}
       className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
        activeTab === tab.key
         ? 'border-violet-500 text-violet-700 bg-violet-50'
         : 'border-transparent text-slate-500 hover:text-violet-600 hover:border-violet-300'
       }`}
      >
       {tab.icon}
       {tab.label}
      </button>
     ))}
    </div>
   </div>

   {/* Content */}
   <main className="max-w-7xl mx-auto px-4 py-6">
    <AnimatePresence mode="wait">

     {/* ═══ EMPRESAS TAB ═══ */}
     {activeTab === 'empresas' && (
      <motion.div key="empresas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
       <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">Gestiona empresas, administradores y suscripciones</p>
        <Button
         onClick={() => { resetNewCompanyForm(); setShowNewCompany(true) }}
         className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
         size="sm"
        >
         <Plus className="h-4 w-4 mr-1" /> Nueva Empresa
        </Button>
       </div>

       {isLoadingStats ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 text-violet-500 animate-spin" /></div>
       ) : (
        <div className="grid gap-4">
         {stats?.companies.map(company => {
          const admin = companyAdmins[company.id]
          const sub = getSubForCompany(company.id)
          return (
           <Card key={company.id} className={`bg-white shadow-sm hover:shadow-md transition-shadow ${company.active ? 'border-violet-100' : 'border-red-200 opacity-60'}`}>
            <CardContent className="p-4">
             <div className="space-y-3">
              {/* Row 1: Company info + edit */}
              {editingCompany === company.id ? (
               <div className="space-y-2" onClick={e => e.stopPropagation()}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                 <Input value={editCompanyData.name} onChange={e => setEditCompanyData(d => ({ ...d, name: e.target.value }))} className="bg-white border-slate-300 text-slate-800 text-sm" />
                 <Input value={editCompanyData.description} onChange={e => setEditCompanyData(d => ({ ...d, description: e.target.value }))} className="bg-white border-slate-300 text-slate-800 text-sm" placeholder="Descripción" />
                </div>
                <div className="flex gap-2">
                 <Button size="sm" onClick={() => handleUpdateCompany(company.id)} className="bg-violet-600 text-white h-7"><Check className="h-3 w-3 mr-1" />Guardar</Button>
                 <Button size="sm" variant="ghost" onClick={() => setEditingCompany(null)} className="text-violet-500 h-7">Cancelar</Button>
                </div>
               </div>
              ) : (
               <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                 <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${company.active ? 'bg-violet-100' : 'bg-red-100'}`}>
                  <Building2 className={`h-5 w-5 ${company.active ? 'text-violet-500' : 'text-red-500'}`} />
                 </div>
                 <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{company.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{company.description || 'Sin descripción'}</p>
                 </div>
                 <Badge className={`${company.active ? 'bg-green-100 text-green-600 border-green-200' : 'bg-red-100 text-red-600 border-red-200'} border text-[10px] shrink-0`}>
                  {company.active ? 'Activa' : 'Inactiva'}
                 </Badge>
                </div>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                 <Button variant="ghost" size="sm" onClick={() => { setEditingCompany(company.id); setEditCompanyData({ name: company.name, description: company.description || '', active: company.active }) }} className="h-7 w-7 p-0 text-violet-500 hover:bg-violet-50">
                  <Edit3 className="h-4 w-4" />
                 </Button>
                 <Button variant="ghost" size="sm" onClick={() => handleToggleCompanyActive(company.id, company.active)} className={`h-7 w-7 p-0 ${company.active ? 'text-red-500 hover:bg-red-100' : 'text-green-500 hover:bg-green-50'}`}>
                  {company.active ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                 </Button>
                 <Button variant="ghost" size="sm" onClick={() => setDeletingCompany({ id: company.id, name: company.name, projectCount: company.projectCount })} className="h-7 w-7 p-0 text-red-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                 </Button>
                </div>
               </div>
              )}

              {/* Row 2: Admin + Subscription */}
              {editingCompany !== company.id && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-0 md:pl-13">
                {/* Admin info */}
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5">
                 <Users className="h-4 w-4 text-slate-500 shrink-0" />
                 <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Administrador</p>
                  {admin ? (
                   <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{admin.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{admin.email}</p>
                   </div>
                  ) : (
                   <Badge className="bg-orange-100 text-orange-600 border-orange-200 border text-[10px]">Sin administrador</Badge>
                  )}
                 </div>
                </div>

                {/* Subscription info */}
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5">
                 <CreditCard className="h-4 w-4 text-slate-500 shrink-0" />
                 <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Suscripción</p>
                  {sub ? (
                   <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className={`${PLAN_COLORS[sub.plan] || PLAN_COLORS.gratuito} border text-[10px]`}>
                     {PLAN_LABELS[sub.plan] || sub.plan}
                    </Badge>
                    <Badge className={`${SUBSCRIPTION_STATUS[sub.status]?.color || SUBSCRIPTION_STATUS.activa.color} border text-[10px]`}>
                     {SUBSCRIPTION_STATUS[sub.status]?.label || sub.status}
                    </Badge>
                    <span className="text-[10px] text-slate-500">
                     {sub.maxUsers === -1 ? '∞' : sub.maxUsers} users · {sub.maxProjects === -1 ? '∞' : sub.maxProjects} proj
                    </span>
                    {sub.price > 0 && <span className="text-[10px] text-emerald-600 font-medium">${sub.price}/mo</span>}
                    {sub.endDate && <span className="text-[10px] text-slate-500">hasta {new Date(sub.endDate).toLocaleDateString('es-ES')}</span>}
                   </div>
                  ) : (
                   <Badge className="bg-gray-100 text-gray-500 border-gray-200 border text-[10px]">Sin suscripción</Badge>
                  )}
                 </div>
                 {sub && (
                  <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => { setEditingSub(sub); setEditSubData({ plan: sub.plan, status: sub.status, maxUsers: sub.maxUsers, maxProjects: sub.maxProjects, price: sub.price, endDate: sub.endDate ? sub.endDate.split('T')[0] : '', trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.split('T')[0] : '', notes: sub.notes || '' }) }}
                   className="h-7 w-7 p-0 text-violet-500 hover:bg-violet-50 shrink-0"
                  >
                   <Edit3 className="h-3 w-3" />
                  </Button>
                 )}
                </div>
               </div>
              )}

              {/* Stats row */}
              {editingCompany !== company.id && (
               <div className="flex items-center gap-4 pl-0 md:pl-13">
                <div className="text-center">
                 <p className="text-sm font-bold text-slate-900">{company.projectCount}</p>
                 <p className="text-[10px] text-slate-500">Proyectos</p>
                </div>
                <div className="text-center">
                 <p className="text-sm font-bold text-slate-900">{company.memberCount}</p>
                 <p className="text-[10px] text-slate-500">Miembros</p>
                </div>
               </div>
              )}
             </div>
            </CardContent>
           </Card>
          )
         })}
         {(!stats || stats.companies.length === 0) && (
          <div className="text-center py-12 text-slate-400">
           <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
           <p>No hay empresas registradas</p>
          </div>
         )}
        </div>
       )}
      </motion.div>
     )}

     {/* ═══ CONFIGURACIÓN TAB ═══ */}
     {activeTab === 'configuracion' && (
      <motion.div key="configuracion" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
       <div className="flex items-center gap-2 mb-2">
        <Settings className="h-5 w-5 text-violet-500" />
        <h2 className="text-lg font-bold text-slate-800">Configuración de Plataforma</h2>
       </div>

       {/* Sub-tabs */}
       <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
        {configSubTabs.map(st => (
         <button
          key={st.key}
          onClick={() => setConfigSubTab(st.key)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all ${
           configSubTab === st.key
            ? 'bg-white text-violet-700 shadow-sm'
            : 'text-slate-500 hover:text-violet-600 hover:bg-white/50'
          }`}
         >
          {st.icon}
          {st.label}
         </button>
        ))}
       </div>

       {/* Sub-tab content */}
       <AnimatePresence mode="wait">
        {/* Plantillas */}
        {configSubTab === 'plantillas' && (
         <motion.div key="plantillas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="flex items-center gap-2 mb-3">
           <BookOpen className="h-4 w-4 text-violet-500" />
           <span className="text-sm text-violet-700">Plantillas genéricas 5S — el administrador de cada empresa las puede adaptar</span>
          </div>
          <div className="bg-white border border-violet-100 shadow-sm rounded-lg p-4">
           <TemplateManager />
          </div>
         </motion.div>
        )}

        {/* Roles y Permisos */}
        {configSubTab === 'roles' && (
         <motion.div key="roles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-violet-500" />
            <span className="text-sm text-violet-700">Matriz de permisos por rol</span>
           </div>
           <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleResetPermissions} className="border-violet-300 text-violet-700 text-xs h-7">
             Restaurar Defecto
            </Button>
            <Button size="sm" onClick={handleSavePermissions} disabled={savingPermissions} className="bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs h-7">
             {savingPermissions ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
             Guardar
            </Button>
           </div>
          </div>

          {isLoadingPermissions ? (
           <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 text-violet-500 animate-spin" /></div>
          ) : (
           <div className="space-y-6">
            {/* Platform permissions */}
            <Card className="bg-white border-violet-100 shadow-sm hover:shadow-md transition-shadow">
             <CardHeader className="pb-2">
              <CardTitle className="text-xs text-violet-700 flex items-center gap-2">
               <Crown className="h-3 w-3" /> Permisos de Plataforma (Nivel Gestor)
              </CardTitle>
             </CardHeader>
             <CardContent className="p-0">
              <div className="overflow-x-auto">
               <Table>
                <TableHeader>
                 <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="text-slate-600 text-xs min-w-[180px]">Permiso</TableHead>
                  {['gestor', 'admin', 'gerente', 'responsable', 'empleado', 'auditor'].map(role => (
                   <TableHead key={role} className="text-slate-600 text-[10px] text-center min-w-[70px]">
                    {ROLE_LABELS[role]?.split(' ')[0] || role}
                   </TableHead>
                  ))}
                 </TableRow>
                </TableHeader>
                <TableBody>
                 {Object.entries(PLATFORM_PERMISSION_LABELS).map(([perm, label]) => (
                  <TableRow key={perm} className="border-slate-100 hover:bg-violet-50">
                   <TableCell className="text-xs text-violet-700">{label}</TableCell>
                   {['gestor', 'admin', 'gerente', 'responsable', 'empleado', 'auditor'].map(role => (
                    <TableCell key={`${role}-${perm}`} className="text-center">
                     <button
                      onClick={() => handleTogglePermission(role, perm)}
                      className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                       permissions[role]?.[perm]
                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                     >
                      {permissions[role]?.[perm] ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                     </button>
                    </TableCell>
                   ))}
                  </TableRow>
                 ))}
                </TableBody>
               </Table>
              </div>
             </CardContent>
            </Card>

            {/* Project permissions */}
            <Card className="bg-white border-violet-100 shadow-sm hover:shadow-md transition-shadow">
             <CardHeader className="pb-2">
              <CardTitle className="text-xs text-violet-700 flex items-center gap-2">
               <Building2 className="h-3 w-3" /> Permisos de Proyecto (Nivel Empresa)
              </CardTitle>
             </CardHeader>
             <CardContent className="p-0">
              <div className="overflow-x-auto">
               <Table>
                <TableHeader>
                 <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="text-slate-600 text-xs min-w-[180px]">Permiso</TableHead>
                  {['gestor', 'admin', 'gerente', 'responsable', 'empleado', 'auditor'].map(role => (
                   <TableHead key={role} className="text-slate-600 text-[10px] text-center min-w-[70px]">
                    {ROLE_LABELS[role]?.split(' ')[0] || role}
                   </TableHead>
                  ))}
                 </TableRow>
                </TableHeader>
                <TableBody>
                 {Object.entries(PROJECT_PERMISSION_LABELS).map(([perm, label]) => (
                  <TableRow key={perm} className="border-slate-100 hover:bg-violet-50">
                   <TableCell className="text-xs text-violet-700">{label}</TableCell>
                   {['gestor', 'admin', 'gerente', 'responsable', 'empleado', 'auditor'].map(role => (
                    <TableCell key={`${role}-${perm}`} className="text-center">
                     <button
                      onClick={() => handleTogglePermission(role, perm)}
                      className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                       permissions[role]?.[perm]
                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                     >
                      {permissions[role]?.[perm] ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                     </button>
                    </TableCell>
                   ))}
                  </TableRow>
                 ))}
                </TableBody>
               </Table>
              </div>
             </CardContent>
            </Card>
           </div>
          )}
         </motion.div>
        )}

        {/* Configuración General */}
       </AnimatePresence>
      </motion.div>
     )}

     {/* ═══ ADMINISTRACIÓN TAB ═══ */}
     {activeTab === 'administracion' && (
      <motion.div key="administracion" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
       <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-violet-500" />
        <h2 className="text-lg font-bold text-slate-800">Administración General</h2>
       </div>

       {/* KPI Cards */}
       {isLoadingStats ? (
        <div className="flex justify-center py-12"><Loader2 className="h-10 w-10 text-violet-500 animate-spin" /></div>
       ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <Card className="bg-white border-violet-200 shadow-sm text-slate-800">
          <CardContent className="p-4">
           <div className="flex items-center justify-between mb-2">
            <Building2 className="h-5 w-5 text-violet-500" />
            <Badge className="bg-violet-100 text-violet-600 border-0 text-[10px]">
             {stats.totals.activeCompanies}/{stats.totals.companies} activas
            </Badge>
           </div>
           <p className="text-2xl font-bold text-slate-900">{stats.totals.companies}</p>
           <p className="text-xs text-slate-500">Empresas</p>
          </CardContent>
         </Card>
         <Card className="bg-white border-blue-200 shadow-sm text-slate-800">
          <CardContent className="p-4">
           <div className="flex items-center justify-between mb-2">
            <Users className="h-5 w-5 text-blue-500" />
            <Badge className="bg-blue-100 text-blue-600 border-0 text-[10px]">
             {stats.totals.activeUsers}/{stats.totals.users} activos
            </Badge>
           </div>
           <p className="text-2xl font-bold text-slate-900">{stats.totals.users}</p>
           <p className="text-xs text-slate-500">Usuarios</p>
          </CardContent>
         </Card>
         <Card className="bg-white border-emerald-200 shadow-sm text-slate-800">
          <CardContent className="p-4">
           <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <Badge className="bg-emerald-100 text-emerald-600 border-0 text-[10px]">
             {stats.totals.activeProjects}/{stats.totals.projects} activos
            </Badge>
           </div>
           <p className="text-2xl font-bold text-slate-900">{stats.totals.projects}</p>
           <p className="text-xs text-slate-500">Proyectos</p>
          </CardContent>
         </Card>
         <Card className="bg-white border-orange-200 shadow-sm text-slate-800">
          <CardContent className="p-4">
           <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <Badge className="bg-orange-100 text-orange-600 border-0 text-[10px]">
             de {stats.totals.actions} total
            </Badge>
           </div>
           <p className="text-2xl font-bold text-slate-900">{stats.totals.openActions}</p>
           <p className="text-xs text-slate-500">Acciones Abiertas</p>
          </CardContent>
         </Card>
        </div>
       ) : null}

       {/* Suscripciones Overview */}
       <Card className="bg-white border-violet-100 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
         <CardTitle className="text-sm text-violet-700 flex items-center gap-2">
          <CreditCard className="h-4 w-4" /> Suscripciones
         </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
         {isLoadingSubs ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 text-violet-500 animate-spin" /></div>
         ) : (
          <div className="overflow-x-auto">
           <Table>
            <TableHeader>
             <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="text-slate-600 text-xs">Empresa</TableHead>
              <TableHead className="text-slate-600 text-xs">Plan</TableHead>
              <TableHead className="text-slate-600 text-xs">Estado</TableHead>
              <TableHead className="text-slate-600 text-xs">Límites</TableHead>
              <TableHead className="text-slate-600 text-xs">Precio</TableHead>
              <TableHead className="text-slate-600 text-xs">Fin</TableHead>
              <TableHead className="text-slate-600 text-xs">Acciones</TableHead>
             </TableRow>
            </TableHeader>
            <TableBody>
             {subscriptions.map(sub => (
              <TableRow key={sub.id} className="border-slate-100 hover:bg-violet-50">
               <TableCell className="text-xs text-slate-800 font-medium">
                {sub.company?.name || '—'}
                {!sub.company?.active && <Badge className="ml-1 bg-red-100 text-red-600 border-red-200 border text-[8px]">Inactiva</Badge>}
               </TableCell>
               <TableCell>
                <Badge className={`${PLAN_COLORS[sub.plan] || PLAN_COLORS.gratuito} border text-[10px]`}>
                 {PLAN_LABELS[sub.plan] || sub.plan}
                </Badge>
               </TableCell>
               <TableCell>
                <Badge className={`${SUBSCRIPTION_STATUS[sub.status]?.color || SUBSCRIPTION_STATUS.activa.color} border text-[10px]`}>
                 {SUBSCRIPTION_STATUS[sub.status]?.label || sub.status}
                </Badge>
               </TableCell>
               <TableCell className="text-[10px] text-slate-500">
                {sub.maxUsers === -1 ? '∞' : sub.maxUsers}U / {sub.maxProjects === -1 ? '∞' : sub.maxProjects}P
               </TableCell>
               <TableCell className="text-xs text-emerald-600 font-medium">
                {sub.price > 0 ? `$${sub.price}/mo` : 'Gratis'}
               </TableCell>
               <TableCell className="text-[10px] text-slate-500">
                {sub.endDate ? new Date(sub.endDate).toLocaleDateString('es-ES') : '—'}
               </TableCell>
               <TableCell>
                <Button variant="ghost" size="sm" onClick={() => { setEditingSub(sub); setEditSubData({ plan: sub.plan, status: sub.status, maxUsers: sub.maxUsers, maxProjects: sub.maxProjects, price: sub.price, endDate: sub.endDate ? sub.endDate.split('T')[0] : '', trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.split('T')[0] : '', notes: sub.notes || '' }) }} className="h-6 w-6 p-0 text-violet-500 hover:bg-violet-50">
                 <Edit3 className="h-3 w-3" />
                </Button>
               </TableCell>
              </TableRow>
             ))}
             {subscriptions.length === 0 && (
              <TableRow>
               <TableCell colSpan={7} className="text-center py-6 text-slate-400 text-xs">No hay suscripciones registradas</TableCell>
              </TableRow>
             )}
            </TableBody>
           </Table>
          </div>
         )}
        </CardContent>
       </Card>

       {/* Usuarios */}
       <Card className="bg-white border-violet-100 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
         <CardTitle className="text-sm text-violet-700 flex items-center gap-2">
          <Users className="h-4 w-4" /> Usuarios
         </CardTitle>
        </CardHeader>
        <CardContent>
         {/* Filters */}
         <div className="flex flex-wrap gap-3 mb-4">
          <Select value={filterCompany} onValueChange={setFilterCompany}>
           <SelectTrigger className="w-48 bg-white border-slate-300 shadow-sm text-slate-800 text-xs h-8">
            <SelectValue placeholder="Filtrar por empresa" />
           </SelectTrigger>
           <SelectContent>
            <SelectItem value="__all__">Todas las empresas</SelectItem>
            {stats?.companies.map(c => (
             <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
           </SelectContent>
          </Select>
          <Select value={filterRole} onValueChange={setFilterRole}>
           <SelectTrigger className="w-40 bg-white border-slate-300 shadow-sm text-slate-800 text-xs h-8">
            <SelectValue placeholder="Filtrar por rol" />
           </SelectTrigger>
           <SelectContent>
            <SelectItem value="__all__">Todos los roles</SelectItem>
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
             <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
           </SelectContent>
          </Select>
         </div>

         {isLoadingUsers ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 text-violet-500 animate-spin" /></div>
         ) : (
          <div className="overflow-x-auto">
           <Table>
            <TableHeader>
             <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="text-slate-600 text-xs">Usuario</TableHead>
              <TableHead className="text-slate-600 text-xs">Email</TableHead>
              <TableHead className="text-slate-600 text-xs">Rol</TableHead>
              <TableHead className="text-slate-600 text-xs">Empresa</TableHead>
              <TableHead className="text-slate-600 text-xs">Estado</TableHead>
              <TableHead className="text-slate-600 text-xs">Acciones</TableHead>
             </TableRow>
            </TableHeader>
            <TableBody>
             {filteredUsers.map(user => (
              <TableRow key={user.id} className={`border-slate-100 ${user.role === 'gestor' ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-violet-50'}`}>
               <TableCell>
                {editingUser === user.id ? (
                 <Input value={editUserData.name} onChange={e => setEditUserData(d => ({ ...d, name: e.target.value }))} className="bg-white border-slate-300 text-slate-800 text-xs h-7 w-36" />
                ) : (
                 <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${user.role === 'gestor' ? 'bg-red-100 text-red-700' : user.active ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                   {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-slate-800 font-medium">{user.name}</span>
                 </div>
                )}
               </TableCell>
               <TableCell>
                {editingUser === user.id ? (
                 <Input type="email" value={editUserData.email} onChange={e => setEditUserData(d => ({ ...d, email: e.target.value }))} className="bg-white border-slate-300 text-slate-800 text-xs h-7 w-48" />
                ) : (
                 <span className="text-xs text-slate-500">{user.email}</span>
                )}
               </TableCell>
               <TableCell>
                {editingUser === user.id ? (
                 <Select value={editUserData.role} onValueChange={val => setEditUserData(d => ({ ...d, role: val }))} disabled={user.role === 'gestor'}>
                  <SelectTrigger className="bg-white border-slate-300 text-slate-800 text-xs h-7 w-36">
                   <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                   {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                   ))}
                  </SelectContent>
                 </Select>
                ) : (
                 <Badge className={`${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-700 border-gray-200'} border text-[10px]`}>
                  {ROLE_LABELS[user.role] || user.role}
                 </Badge>
                )}
               </TableCell>
               <TableCell className="text-xs text-slate-500">
                {user.companies.length > 0
                 ? user.companies.map(c => c.name).join(', ')
                 : user.projects.length > 0
                  ? [...new Set(user.projects.map(p => p.company))].join(', ')
                  : '—'}
               </TableCell>
               <TableCell>
                {user.active ? (
                 <Badge className="bg-green-100 text-green-600 border-green-200 border text-[10px]">Activo</Badge>
                ) : (
                 <Badge className="bg-red-100 text-red-600 border-red-200 border text-[10px]">Inactivo</Badge>
                )}
               </TableCell>
               <TableCell>
                <div className="flex items-center gap-1">
                 {editingUser === user.id ? (
                  <>
                   <Button size="sm" onClick={() => handleUpdateUser(user.id)} className="bg-violet-600 text-white h-6 w-6 p-0"><Check className="h-3 w-3" /></Button>
                   <Button size="sm" variant="ghost" onClick={() => setEditingUser(null)} className="text-violet-500 h-6 w-6 p-0"><X className="h-3 w-3" /></Button>
                  </>
                 ) : (
                  <>
                   <Button variant="ghost" size="sm" onClick={() => { setEditingUser(user.id); setEditUserData({ name: user.name, email: user.email, role: user.role, active: user.active }) }} className="h-6 w-6 p-0 text-violet-500 hover:bg-violet-50" title="Editar usuario">
                    <Edit3 className="h-3 w-3" />
                   </Button>
                   <Button variant="ghost" size="sm" onClick={() => handleToggleActive(user.id, user.active)} className={`h-6 w-6 p-0 ${user.active ? 'text-red-500 hover:bg-red-100' : 'text-green-500 hover:bg-green-50'}`} title={user.active ? 'Desactivar' : 'Activar'}>
                    {user.active ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                   </Button>
                   <Button variant="ghost" size="sm" onClick={() => { setResetPasswordUserId(user.id); setNewPassword('') }} className="h-6 w-6 p-0 text-violet-500 hover:bg-violet-50" title="Cambiar contraseña">
                    <Key className="h-3 w-3" />
                   </Button>
                   {user.role !== 'gestor' && (
                    <Button variant="ghost" size="sm" onClick={() => setDeletingUser({ id: user.id, name: user.name, email: user.email, role: user.role })} className="h-6 w-6 p-0 text-red-500 hover:bg-red-100" title="Eliminar usuario">
                     <Trash2 className="h-3 w-3" />
                    </Button>
                   )}
                  </>
                 )}
                </div>
               </TableCell>
              </TableRow>
             ))}
            </TableBody>
           </Table>
          </div>
         )}
         <div className="mt-3">
          <p className="text-xs text-slate-500">{filteredUsers.length} de {users.length} usuarios</p>
         </div>
        </CardContent>
       </Card>

       {/* Actividad Reciente */}
       <Card className="bg-white border-violet-100 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
         <CardTitle className="text-sm text-violet-700 flex items-center gap-2">
          <Activity className="h-4 w-4" /> Actividad Reciente
         </CardTitle>
        </CardHeader>
        <CardContent>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recent users */}
          <div>
           <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Últimos Usuarios</p>
           <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {stats?.recentUsers.map(user => (
             <div key={user.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2">
               <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${user.active ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                {user.name.charAt(0).toUpperCase()}
               </div>
               <div>
                <p className="text-xs font-medium text-slate-800">{user.name}</p>
                <p className="text-[10px] text-slate-500">{user.email}</p>
               </div>
              </div>
              <div className="flex items-center gap-2">
               <Badge className={`${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-700 border-gray-200'} border text-[10px]`}>
                {ROLE_LABELS[user.role] || user.role}
               </Badge>
               {user.active ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
               ) : (
                <XCircle className="h-3.5 w-3.5 text-red-500" />
               )}
              </div>
             </div>
            ))}
            {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
             <p className="text-xs text-slate-400 text-center py-4">Sin actividad reciente</p>
            )}
           </div>
          </div>

          {/* Recent projects */}
          <div>
           <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Proyectos</p>
           <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {stats?.projects.slice(0, 10).map(project => (
             <div key={project.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
               <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${project.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                <TrendingUp className="h-3.5 w-3.5" />
               </div>
               <div className="min-w-0">
                <p className="text-xs font-medium text-slate-800 truncate">{project.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{project.companyName || project.company}</p>
               </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
               <span className="text-[10px] text-slate-500">{project.memberCount} members</span>
               {project.active ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
               ) : (
                <XCircle className="h-3.5 w-3.5 text-red-500" />
               )}
              </div>
             </div>
            ))}
            {(!stats?.projects || stats.projects.length === 0) && (
             <p className="text-xs text-slate-400 text-center py-4">Sin proyectos</p>
            )}
           </div>
          </div>
         </div>
        </CardContent>
       </Card>
      </motion.div>
     )}
    </AnimatePresence>
   </main>

   {/* ═══ DIALOGS ═══ */}

   {/* New Company Dialog */}
   <Dialog open={showNewCompany} onOpenChange={(open) => { if (!open) { setShowNewCompany(false); resetNewCompanyForm() } }}>
    <DialogContent className="bg-white border-slate-200 max-w-2xl max-h-[90vh] overflow-y-auto">
     <DialogHeader>
      <DialogTitle className="text-violet-700 flex items-center gap-2">
       <Building2 className="h-5 w-5" /> Nueva Empresa
      </DialogTitle>
     </DialogHeader>
     <div className="space-y-6 py-2">
      {/* Company Info */}
      <div className="space-y-3">
       <h3 className="text-xs font-semibold text-violet-700 uppercase tracking-wider flex items-center gap-2">
        <Building2 className="h-3 w-3" /> Datos de la Empresa
       </h3>
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
         <Label className="text-xs text-slate-600">Nombre *</Label>
         <Input placeholder="Nombre de la empresa" value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} className="bg-white border-slate-300 text-slate-800" />
        </div>
        <div className="space-y-1">
         <Label className="text-xs text-slate-600">Descripción</Label>
         <Input placeholder="Descripción (opcional)" value={newCompanyDesc} onChange={e => setNewCompanyDesc(e.target.value)} className="bg-white border-slate-300 text-slate-800" />
        </div>
       </div>
      </div>

      {/* Admin Section */}
      <div className="space-y-3">
       <h3 className="text-xs font-semibold text-violet-700 uppercase tracking-wider flex items-center gap-2">
        <Users className="h-3 w-3" /> Administrador
       </h3>
       <div className="flex gap-2">
        <button
         onClick={() => setAdminMode('create')}
         className={`flex-1 px-3 py-2 text-xs rounded-md border transition-all ${adminMode === 'create' ? 'bg-violet-50 border-violet-300 text-violet-700' : 'bg-slate-100 border-slate-200 text-violet-500 hover:text-violet-700'}`}
        >
         Crear Nuevo
        </button>
        <button
         onClick={() => setAdminMode('assign')}
         className={`flex-1 px-3 py-2 text-xs rounded-md border transition-all ${adminMode === 'assign' ? 'bg-violet-50 border-violet-300 text-violet-700' : 'bg-slate-100 border-slate-200 text-violet-500 hover:text-violet-700'}`}
        >
         Asignar Existente
        </button>
       </div>

       {adminMode === 'create' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
         <div className="space-y-1">
          <Label className="text-xs text-slate-600">Nombre *</Label>
          <Input placeholder="Nombre del admin" value={newAdminName} onChange={e => setNewAdminName(e.target.value)} className="bg-white border-slate-300 text-slate-800" />
         </div>
         <div className="space-y-1">
          <Label className="text-xs text-slate-600">Email *</Label>
          <Input placeholder="admin@empresa.com" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} className="bg-white border-slate-300 text-slate-800" />
         </div>
         <div className="space-y-1">
          <Label className="text-xs text-slate-600">Contraseña *</Label>
          <Input type="password" placeholder="Mín. 6 caracteres" value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)} className="bg-white border-slate-300 text-slate-800" />
         </div>
        </div>
       ) : (
        <div className="space-y-2">
         <div className="space-y-1">
          <Label className="text-xs text-slate-600">Buscar usuario (mín. 3 caracteres)</Label>
          <Input placeholder="Buscar por nombre o email..." value={assignUserSearch} onChange={e => handleSearchUsers(e.target.value)} className="bg-white border-slate-300 text-slate-800" />
         </div>
         {assignUserResults.length > 0 && (
          <div className="max-h-32 overflow-y-auto rounded-md border border-slate-200 bg-white/60">
           {assignUserResults.map(u => (
            <button
             key={u.id}
             onClick={() => { setAssignUserId(u.id); setAssignUserSearch(`${u.name} (${u.email})`); setAssignUserResults([]) }}
             className={`w-full text-left px-3 py-2 text-xs hover:bg-violet-50 transition-colors ${assignUserId === u.id ? 'bg-violet-100 text-violet-800' : 'text-violet-500'}`}
            >
             <span className="font-medium text-slate-800">{u.name}</span>
             <span className="ml-2 text-violet-500">{u.email}</span>
             <Badge className={`ml-2 ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-700 border-gray-200'} border text-[8px]`}>
              {ROLE_LABELS[u.role] || u.role}
             </Badge>
            </button>
           ))}
          </div>
         )}
         {assignUserId && (
          <div className="flex items-center gap-2 bg-violet-50 rounded-md px-3 py-2">
           <CheckCircle2 className="h-4 w-4 text-green-500" />
           <span className="text-xs text-violet-700">Usuario seleccionado</span>
           <Button variant="ghost" size="sm" onClick={() => { setAssignUserId(''); setAssignUserSearch('') }} className="h-5 w-5 p-0 text-violet-500 ml-auto">
            <X className="h-3 w-3" />
           </Button>
          </div>
         )}
        </div>
       )}
      </div>

      {/* Subscription Section */}
      <div className="space-y-3">
       <h3 className="text-xs font-semibold text-violet-700 uppercase tracking-wider flex items-center gap-2">
        <CreditCard className="h-3 w-3" /> Suscripción
       </h3>
       <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
         <Label className="text-xs text-slate-600">Plan</Label>
         <Select value={newSubPlan} onValueChange={(val) => {
          setNewSubPlan(val)
          const defaults = PLAN_DEFAULTS[val]
          if (defaults) {
           setNewSubMaxUsers(defaults.maxUsers)
           setNewSubMaxProjects(defaults.maxProjects)
           setNewSubPrice(defaults.price)
          }
         }}>
          <SelectTrigger className="bg-white border-slate-300 text-slate-800 text-xs h-9">
           <SelectValue />
          </SelectTrigger>
          <SelectContent>
           {Object.entries(PLAN_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
           ))}
          </SelectContent>
         </Select>
        </div>
        <div className="space-y-1">
         <Label className="text-xs text-slate-600">Estado</Label>
         <Select value={newSubStatus} onValueChange={setNewSubStatus}>
          <SelectTrigger className="bg-white border-slate-300 text-slate-800 text-xs h-9">
           <SelectValue />
          </SelectTrigger>
          <SelectContent>
           {Object.entries(SUBSCRIPTION_STATUS).map(([key, info]) => (
            <SelectItem key={key} value={key}>{info.label}</SelectItem>
           ))}
          </SelectContent>
         </Select>
        </div>
        <div className="space-y-1">
         <Label className="text-xs text-slate-600">Precio (USD/mes)</Label>
         <Input type="number" value={newSubPrice} onChange={e => setNewSubPrice(Number(e.target.value))} className="bg-white border-slate-300 text-slate-800 text-xs h-9" />
        </div>
        <div className="space-y-1">
         <Label className="text-xs text-slate-600">Max Usuarios {-1 === newSubMaxUsers ? '(∞)' : ''}</Label>
         <Input type="number" value={newSubMaxUsers} onChange={e => setNewSubMaxUsers(Number(e.target.value))} className="bg-white border-slate-300 text-slate-800 text-xs h-9" />
        </div>
        <div className="space-y-1">
         <Label className="text-xs text-slate-600">Max Proyectos {-1 === newSubMaxProjects ? '(∞)' : ''}</Label>
         <Input type="number" value={newSubMaxProjects} onChange={e => setNewSubMaxProjects(Number(e.target.value))} className="bg-white border-slate-300 text-slate-800 text-xs h-9" />
        </div>
        <div className="space-y-1">
         <Label className="text-xs text-slate-600">Fecha Fin</Label>
         <Input type="date" value={newSubEndDate} onChange={e => setNewSubEndDate(e.target.value)} className="bg-white border-slate-300 text-slate-800 text-xs h-9" />
        </div>
        <div className="space-y-1">
         <Label className="text-xs text-slate-600">Fin de Prueba</Label>
         <Input type="date" value={newSubTrialEndsAt} onChange={e => setNewSubTrialEndsAt(e.target.value)} className="bg-white border-slate-300 text-slate-800 text-xs h-9" />
        </div>
        <div className="space-y-1 sm:col-span-2">
         <Label className="text-xs text-slate-600">Notas</Label>
         <Input placeholder="Notas opcionales..." value={newSubNotes} onChange={e => setNewSubNotes(e.target.value)} className="bg-white border-slate-300 text-slate-800 text-xs h-9" />
        </div>
       </div>
      </div>

      {/* Submit */}
      <div className="flex gap-2 justify-end border-t border-slate-200 pt-4">
       <Button variant="outline" onClick={() => { setShowNewCompany(false); resetNewCompanyForm() }} className="border-violet-300 text-violet-700">
        Cancelar
       </Button>
       <Button
        onClick={handleCreateCompanyFull}
        disabled={!newCompanyName.trim() || isCreatingCompany}
        className="bg-gradient-to-r from-violet-600 to-purple-600 text-white"
       >
        {isCreatingCompany ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
        Crear Empresa
       </Button>
      </div>
     </div>
    </DialogContent>
   </Dialog>

   {/* Subscription Edit Dialog */}
   <Dialog open={!!editingSub} onOpenChange={(open) => { if (!open) { setEditingSub(null); setEditSubData({}) } }}>
    <DialogContent className="bg-white border-slate-200 max-w-lg">
     <DialogHeader>
      <DialogTitle className="text-violet-700 flex items-center gap-2">
       <CreditCard className="h-5 w-5" /> Editar Suscripción
      </DialogTitle>
     </DialogHeader>
     {editingSub && (
      <div className="space-y-4 py-2">
       <div className="bg-slate-50 rounded-lg p-3">
        <p className="text-xs text-slate-500">Empresa</p>
        <p className="text-sm font-medium text-slate-800">{editingSub.company?.name || '—'}</p>
       </div>
       <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
         <Label className="text-xs text-slate-600">Plan</Label>
         <Select value={editSubData.plan} onValueChange={(val) => {
          setEditSubData((d: any) => ({ ...d, plan: val }))
          const defaults = PLAN_DEFAULTS[val]
          if (defaults) {
           setEditSubData((d: any) => ({ ...d, maxUsers: defaults.maxUsers, maxProjects: defaults.maxProjects, price: defaults.price }))
          }
         }}>
          <SelectTrigger className="bg-white border-slate-300 text-slate-800 text-xs h-9">
           <SelectValue />
          </SelectTrigger>
          <SelectContent>
           {Object.entries(PLAN_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
           ))}
          </SelectContent>
         </Select>
        </div>
        <div className="space-y-1">
         <Label className="text-xs text-slate-600">Estado</Label>
         <Select value={editSubData.status} onValueChange={(val) => setEditSubData((d: any) => ({ ...d, status: val }))}>
          <SelectTrigger className="bg-white border-slate-300 text-slate-800 text-xs h-9">
           <SelectValue />
          </SelectTrigger>
          <SelectContent>
           {Object.entries(SUBSCRIPTION_STATUS).map(([key, info]) => (
            <SelectItem key={key} value={key}>{info.label}</SelectItem>
           ))}
          </SelectContent>
         </Select>
        </div>
        <div className="space-y-1">
         <Label className="text-xs text-slate-600">Max Usuarios</Label>
         <Input type="number" value={editSubData.maxUsers} onChange={e => setEditSubData((d: any) => ({ ...d, maxUsers: Number(e.target.value) }))} className="bg-white border-slate-300 text-slate-800 text-xs h-9" />
        </div>
        <div className="space-y-1">
         <Label className="text-xs text-slate-600">Max Proyectos</Label>
         <Input type="number" value={editSubData.maxProjects} onChange={e => setEditSubData((d: any) => ({ ...d, maxProjects: Number(e.target.value) }))} className="bg-white border-slate-300 text-slate-800 text-xs h-9" />
        </div>
        <div className="space-y-1">
         <Label className="text-xs text-slate-600">Precio (USD/mes)</Label>
         <Input type="number" value={editSubData.price} onChange={e => setEditSubData((d: any) => ({ ...d, price: Number(e.target.value) }))} className="bg-white border-slate-300 text-slate-800 text-xs h-9" />
        </div>
        <div className="space-y-1">
         <Label className="text-xs text-slate-600">Fecha Fin</Label>
         <Input type="date" value={editSubData.endDate} onChange={e => setEditSubData((d: any) => ({ ...d, endDate: e.target.value }))} className="bg-white border-slate-300 text-slate-800 text-xs h-9" />
        </div>
        <div className="space-y-1">
         <Label className="text-xs text-slate-600">Fin de Prueba</Label>
         <Input type="date" value={editSubData.trialEndsAt} onChange={e => setEditSubData((d: any) => ({ ...d, trialEndsAt: e.target.value }))} className="bg-white border-slate-300 text-slate-800 text-xs h-9" />
        </div>
        <div className="space-y-1 col-span-2">
         <Label className="text-xs text-slate-600">Notas</Label>
         <Input placeholder="Notas opcionales..." value={editSubData.notes} onChange={e => setEditSubData((d: any) => ({ ...d, notes: e.target.value }))} className="bg-white border-slate-300 text-slate-800 text-xs h-9" />
        </div>
       </div>
       <div className="flex gap-2 justify-end border-t border-slate-200 pt-3">
        <Button variant="outline" onClick={() => { setEditingSub(null); setEditSubData({}) }} className="border-violet-300 text-violet-700">Cancelar</Button>
        <Button onClick={handleUpdateSubscription} className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
         <Save className="h-4 w-4 mr-1" /> Guardar
        </Button>
       </div>
      </div>
     )}
    </DialogContent>
   </Dialog>

   {/* Reset password dialog */}
   {resetPasswordUserId && (
    <Dialog open={!!resetPasswordUserId} onOpenChange={() => setResetPasswordUserId(null)}>
     <DialogContent className="bg-white border-slate-200">
      <DialogHeader>
       <DialogTitle className="text-violet-700">Restablecer Contraseña</DialogTitle>
      </DialogHeader>
      <div className="space-y-3 py-2">
       <div className="space-y-1">
        <Label className="text-xs text-slate-600">Nueva contraseña (mín. 6 caracteres)</Label>
        <div className="relative">
         <Input
          type={showPassword ? 'text' : 'password'}
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          className="bg-white border-slate-300 text-slate-800 pr-10"
         />
         <Button variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1 h-7 w-7 p-0 text-violet-500">
          {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
         </Button>
        </div>
       </div>
       <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={() => setResetPasswordUserId(null)} className="border-violet-300 text-violet-700">Cancelar</Button>
        <Button size="sm" onClick={() => handleResetPassword(resetPasswordUserId!)} disabled={newPassword.length < 6} className="bg-violet-600 text-white">Guardar</Button>
       </div>
      </div>
     </DialogContent>
    </Dialog>
   )}

   {/* Delete company confirmation dialog */}
   {deletingCompany && (
    <Dialog open={!!deletingCompany} onOpenChange={() => setDeletingCompany(null)}>
     <DialogContent className="bg-white border-slate-200">
      <DialogHeader>
       <DialogTitle className="text-red-700 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        Eliminar Empresa
       </DialogTitle>
      </DialogHeader>
      <div className="space-y-3 py-2">
       <p className="text-sm text-slate-700">
        ¿Estás seguro de que quieres eliminar <strong>"{deletingCompany.name}"</strong>?
       </p>
       {deletingCompany.projectCount > 0 ? (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
         <p className="text-xs text-orange-700 font-medium flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          Esta empresa tiene {deletingCompany.projectCount} proyecto(s) asociado(s)
         </p>
         <p className="text-[11px] text-orange-600 mt-1">
          La empresa será <strong>desactivada</strong> en lugar de eliminada permanentemente, ya que tiene proyectos asociados.
         </p>
        </div>
       ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
         <p className="text-xs text-red-700 font-medium flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          Esta acción es irreversible
         </p>
         <p className="text-[11px] text-red-600 mt-1">
          La empresa será eliminada permanentemente de la base de datos.
         </p>
        </div>
       )}
       <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={() => setDeletingCompany(null)} className="border-slate-300 text-slate-700">Cancelar</Button>
        <Button size="sm" onClick={() => handleDeleteCompany(deletingCompany!.id)} className="bg-red-600 hover:bg-red-700 text-white">
         <Trash2 className="h-3 w-3 mr-1" />
         {deletingCompany.projectCount > 0 ? 'Desactivar' : 'Eliminar'}
        </Button>
       </div>
      </div>
     </DialogContent>
    </Dialog>
   )}

   {/* Gestor Profile Dialog */}
   {showGestorProfile && currentUser && (
    <Dialog open={showGestorProfile} onOpenChange={(open) => { if (!open) setShowGestorProfile(false) }}>
     <DialogContent className="bg-white border-slate-200 max-w-md">
      <DialogHeader>
       <DialogTitle className="text-violet-700 flex items-center gap-2">
        <Key className="h-5 w-5" />
        Mi Perfil — Gestor
       </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
       {/* Current credentials info */}
       <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
         <AlertTriangle className="h-3.5 w-3.5" />
         Cambia aquí tu correo y contraseña
        </p>
        <div className="mt-1.5 space-y-1">
         <p className="text-xs text-slate-600"><strong>Nombre actual:</strong> {currentUser.name}</p>
         <p className="text-xs text-slate-600"><strong>Email actual:</strong> {currentUser.email}</p>
         <p className="text-xs text-slate-600"><strong>Rol:</strong> Gestor (Dueño de la plataforma)</p>
        </div>
       </div>

       {/* Edit form */}
       <div className="space-y-3">
        <div className="space-y-1">
         <Label className="text-xs text-slate-600">Nombre</Label>
         <Input
          value={gestorProfileData.name}
          onChange={e => setGestorProfileData(d => ({ ...d, name: e.target.value }))}
          className="bg-white border-slate-300 text-slate-800 text-sm"
         />
        </div>
        <div className="space-y-1">
         <Label className="text-xs text-slate-600 font-semibold">Email</Label>
         <Input
          type="email"
          value={gestorProfileData.email}
          onChange={e => setGestorProfileData(d => ({ ...d, email: e.target.value }))}
          className="bg-white border-amber-300 text-slate-800 text-sm focus:border-amber-500 focus:ring-amber-500"
         />
        </div>

        {/* Password change section */}
        <div className="border-t border-slate-200 pt-3">
         <p className="text-xs font-medium text-slate-700 mb-2">Cambiar contraseña (opcional)</p>
         <div className="space-y-2">
          <div className="space-y-1">
           <Label className="text-[10px] text-slate-500">Contraseña actual</Label>
           <div className="relative">
            <Input
             type={showPassword ? 'text' : 'password'}
             value={gestorProfileData.currentPassword}
             onChange={e => setGestorProfileData(d => ({ ...d, currentPassword: e.target.value }))}
             className="bg-white border-slate-300 text-slate-800 text-sm pr-10"
             placeholder="Introduce tu contraseña actual"
            />
            <Button variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1 h-7 w-7 p-0 text-slate-400">
             {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
           </div>
          </div>
          <div className="space-y-1">
           <Label className="text-[10px] text-slate-500">Nueva contraseña</Label>
           <Input
            type="password"
            value={gestorProfileData.newPassword}
            onChange={e => setGestorProfileData(d => ({ ...d, newPassword: e.target.value }))}
            className="bg-white border-amber-300 text-slate-800 text-sm focus:border-amber-500 focus:ring-amber-500"
            placeholder="Mínimo 6 caracteres"
           />
          </div>
          <div className="space-y-1">
           <Label className="text-[10px] text-slate-500">Confirmar nueva contraseña</Label>
           <Input
            type="password"
            value={gestorProfileData.confirmNewPassword}
            onChange={e => setGestorProfileData(d => ({ ...d, confirmNewPassword: e.target.value }))}
            className="bg-white border-amber-300 text-slate-800 text-sm focus:border-amber-500 focus:ring-amber-500"
            placeholder="Repite la nueva contraseña"
           />
          </div>
         </div>
        </div>
       </div>

       {/* Feedback message */}
       {profileMessage && (
        <div className={`rounded-lg p-2.5 text-xs font-medium ${profileMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
         {profileMessage.text}
        </div>
       )}

       <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={() => setShowGestorProfile(false)} className="border-slate-300 text-slate-700">Cancelar</Button>
        <Button size="sm" onClick={handleSaveGestorProfile} disabled={isSavingProfile} className="bg-violet-600 hover:bg-violet-700 text-white">
         {isSavingProfile ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
         Guardar Cambios
        </Button>
       </div>
      </div>
     </DialogContent>
    </Dialog>
   )}

   {/* Delete User Confirmation Dialog */}
   {deletingUser && (
    <Dialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
     <DialogContent className="bg-white border-slate-200 max-w-md">
      <DialogHeader>
       <DialogTitle className="text-red-700 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        Eliminar Usuario
       </DialogTitle>
      </DialogHeader>
      <div className="space-y-3 py-2">
       <p className="text-sm text-slate-700">
        ¿Estás seguro de que quieres eliminar al usuario <strong>"{deletingUser.name}"</strong>?
       </p>
       <div className="bg-slate-50 rounded-lg p-3 space-y-1">
        <p className="text-xs text-slate-600"><strong>Nombre:</strong> {deletingUser.name}</p>
        <p className="text-xs text-slate-600"><strong>Email:</strong> {deletingUser.email}</p>
        <p className="text-xs text-slate-600"><strong>Rol:</strong> {ROLE_LABELS[deletingUser.role] || deletingUser.role}</p>
       </div>
       <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <p className="text-xs text-red-700 font-medium flex items-center gap-1">
         <AlertTriangle className="h-3.5 w-3.5" />
         Esta acción es irreversible
        </p>
        <p className="text-[11px] text-red-600 mt-1">
         El usuario será eliminado permanentemente de la base de datos junto con todos sus datos asociados (progreso, sesiones, membresías).
        </p>
       </div>
       <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={() => setDeletingUser(null)} className="border-slate-300 text-slate-700">Cancelar</Button>
        <Button size="sm" onClick={() => handleDeleteUser(deletingUser!.id)} className="bg-red-600 hover:bg-red-700 text-white">
         <Trash2 className="h-3 w-3 mr-1" />
         Eliminar
        </Button>
       </div>
      </div>
     </DialogContent>
    </Dialog>
   )}
  </div>
 )
}
