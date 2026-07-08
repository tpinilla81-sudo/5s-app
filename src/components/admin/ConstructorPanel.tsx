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
  BookOpen,
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
  Globe,
  Zap,
  Save,
  Trash2,
  Key,
} from 'lucide-react'
import TemplateManager from './TemplateManager'
import Tablero5S from './Tablero5S'

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

interface PlatformConfigItem {
  id: string
  key: string
  value: string
  createdAt: string
  updatedAt: string
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
}

type ConstructorTab = 'dashboard' | 'empresas' | 'usuarios' | 'suscripciones' | 'configuracion' | 'plantillas' | 'tablero5s'

// ─── Component ───────────────────────────────────────────────────────────────

export default function ConstructorPanel() {
  const { setCurrentView, fetchProjects, fetchCompanies, projects, setCurrentProject, currentProject } = use5SStore()
  const [activeTab, setActiveTab] = useState<ConstructorTab>('dashboard')

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
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanyDesc, setNewCompanyDesc] = useState('')
  const [editingCompany, setEditingCompany] = useState<string | null>(null)
  const [editCompanyData, setEditCompanyData] = useState({ name: '', description: '', active: true })

  // Platform config
  const [configs, setConfigs] = useState<PlatformConfigItem[]>([])
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(false)
  const [newConfigKey, setNewConfigKey] = useState('')
  const [newConfigValue, setNewConfigValue] = useState('')
  const [editingConfigKey, setEditingConfigKey] = useState<string | null>(null)
  const [editConfigValue, setEditConfigValue] = useState('')

  // Password reset
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

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

  const loadConfigs = useCallback(async () => {
    setIsLoadingConfigs(true)
    try {
      const res = await fetch('/api/platform-config')
      const data = await res.json()
      if (data.success) {
        setConfigs(data.configs || [])
      }
    } catch (error) {
      console.error('Error loading platform config:', error)
    } finally {
      setIsLoadingConfigs(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    if (activeTab === 'usuarios') {
      loadUsers()
    } else if (activeTab === 'configuracion') {
      loadConfigs()
    }
  }, [activeTab, loadUsers, loadConfigs])

  // ─── Company actions ────────────────────────────────────────────────────
  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCompanyName, description: newCompanyDesc || undefined }),
      })
      if (res.ok) {
        setShowNewCompany(false)
        setNewCompanyName('')
        setNewCompanyDesc('')
        await loadStats()
        await fetchCompanies()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al crear empresa')
      }
    } catch (error) {
      console.error('Error creating company:', error)
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

  // ─── User actions ────────────────────────────────────────────────────────
  const handleUpdateUser = async (userId: string) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, ...editUserData }),
      })
      if (res.ok) {
        setEditingUser(null)
        await loadUsers()
        await loadStats()
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

  // ─── Config actions ─────────────────────────────────────────────────────
  const handleSaveConfig = async () => {
    if (!newConfigKey.trim() || !newConfigValue.trim()) return
    try {
      const res = await fetch('/api/platform-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newConfigKey, value: newConfigValue }),
      })
      if (res.ok) {
        setNewConfigKey('')
        setNewConfigValue('')
        await loadConfigs()
      }
    } catch (error) {
      console.error('Error saving config:', error)
    }
  }

  const handleUpdateConfig = async (key: string) => {
    try {
      const res = await fetch('/api/platform-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: editConfigValue }),
      })
      if (res.ok) {
        setEditingConfigKey(null)
        await loadConfigs()
      }
    } catch (error) {
      console.error('Error updating config:', error)
    }
  }

  const handleDeleteConfig = async (key: string) => {
    if (!confirm(`¿Eliminar la configuración "${key}"?`)) return
    try {
      const res = await fetch(`/api/platform-config?key=${encodeURIComponent(key)}`, { method: 'DELETE' })
      if (res.ok) {
        await loadConfigs()
      }
    } catch (error) {
      console.error('Error deleting config:', error)
    }
  }

  // ─── Filtered users ────────────────────────────────────────────────────
  const filteredUsers = users.filter(u => {
    if (filterCompany && !u.companies.some(c => c.id === filterCompany) && !u.projects.some(p => p.company === filterCompany)) return false
    if (filterRole && u.role !== filterRole) return false
    return true
  })

  // ─── Render ──────────────────────────────────────────────────────────────
  const tabs: { key: ConstructorTab; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Panel General', icon: <Activity className="h-4 w-4" /> },
    { key: 'empresas', label: 'Empresas', icon: <Building2 className="h-4 w-4" /> },
    { key: 'usuarios', label: 'Usuarios', icon: <Users className="h-4 w-4" /> },
    { key: 'suscripciones', label: 'Suscripciones', icon: <CreditCard className="h-4 w-4" /> },
    { key: 'configuracion', label: 'Configuración', icon: <Settings className="h-4 w-4" /> },
    { key: 'plantillas', label: 'Plantillas Globales', icon: <BookOpen className="h-4 w-4" /> },
    { key: 'tablero5s', label: 'Config. Tablero', icon: <Globe className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-violet-950/20 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-violet-800/30 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Crown className="h-5 w-5 text-yellow-300" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-violet-300 to-purple-200 bg-clip-text text-transparent">
                Panel de Gestión
              </h1>
              <p className="text-xs text-violet-400">Dueño de la Plataforma 5S</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-violet-600 to-purple-600 text-white border-0 px-3 py-1">
              <Crown className="h-3 w-3 mr-1" /> GESTOR (DUEÑO)
            </Badge>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-violet-800/20 bg-slate-950/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 flex gap-0 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-violet-400 text-violet-300 bg-violet-900/20'
                  : 'border-transparent text-violet-500 hover:text-violet-300 hover:border-violet-700/50'
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
          {/* ═══ DASHBOARD TAB ═══ */}
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {isLoadingStats ? (
                <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 text-violet-400 animate-spin" /></div>
              ) : stats ? (
                <>
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-violet-900/40 to-purple-900/20 border-violet-700/30 text-white">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Building2 className="h-5 w-5 text-violet-400" />
                          <Badge className="bg-violet-800/50 text-violet-300 border-0 text-[10px]">
                            {stats.totals.activeCompanies}/{stats.totals.companies} activas
                          </Badge>
                        </div>
                        <p className="text-2xl font-bold">{stats.totals.companies}</p>
                        <p className="text-xs text-violet-400">Empresas</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-blue-900/40 to-indigo-900/20 border-blue-700/30 text-white">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Users className="h-5 w-5 text-blue-400" />
                          <Badge className="bg-blue-800/50 text-blue-300 border-0 text-[10px]">
                            {stats.totals.activeUsers}/{stats.totals.users} activos
                          </Badge>
                        </div>
                        <p className="text-2xl font-bold">{stats.totals.users}</p>
                        <p className="text-xs text-blue-400">Usuarios</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-emerald-900/40 to-green-900/20 border-emerald-700/30 text-white">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <TrendingUp className="h-5 w-5 text-emerald-400" />
                          <Badge className="bg-emerald-800/50 text-emerald-300 border-0 text-[10px]">
                            {stats.totals.activeProjects}/{stats.totals.projects} activos
                          </Badge>
                        </div>
                        <p className="text-2xl font-bold">{stats.totals.projects}</p>
                        <p className="text-xs text-emerald-400">Proyectos</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-orange-900/40 to-amber-900/20 border-orange-700/30 text-white">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <AlertTriangle className="h-5 w-5 text-orange-400" />
                          <Badge className="bg-orange-800/50 text-orange-300 border-0 text-[10px]">
                            de {stats.totals.actions} total
                          </Badge>
                        </div>
                        <p className="text-2xl font-bold">{stats.totals.openActions}</p>
                        <p className="text-xs text-orange-400">Acciones Abiertas</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Role distribution + Platform health */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-slate-900/60 border-violet-700/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-violet-300 flex items-center gap-2">
                          <Users className="h-4 w-4" /> Distribución de Roles
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {Object.entries(stats.roleDistribution).map(([role, count]) => (
                            <div key={role} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge className={`${ROLE_COLORS[role] || 'bg-gray-100 text-gray-700 border-gray-200'} border text-xs`}>
                                  {ROLE_LABELS[role] || role}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                                    style={{ width: `${Math.min((count / stats.totals.users) * 100, 100)}%` }}
                                  />
                                </div>
                                <span className="text-sm font-semibold text-white w-8 text-right">{count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900/60 border-violet-700/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-violet-300 flex items-center gap-2">
                          <Zap className="h-4 w-4" /> Salud de Plataforma
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-violet-400">Empresas activas</span>
                            <span className="text-sm font-bold text-white">
                              {stats.totals.companies > 0 ? Math.round((stats.totals.activeCompanies / stats.totals.companies) * 100) : 0}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-violet-400">Usuarios activos</span>
                            <span className="text-sm font-bold text-white">
                              {stats.totals.users > 0 ? Math.round((stats.totals.activeUsers / stats.totals.users) * 100) : 0}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-violet-400">Proyectos activos</span>
                            <span className="text-sm font-bold text-white">
                              {stats.totals.projects > 0 ? Math.round((stats.totals.activeProjects / stats.totals.projects) * 100) : 0}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-violet-400">Plantillas disponibles</span>
                            <span className="text-sm font-bold text-white">{stats.totals.templates}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-violet-400">Auditorías realizadas</span>
                            <span className="text-sm font-bold text-white">{stats.totals.auditResults}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent users */}
                  <Card className="bg-slate-900/60 border-violet-700/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-violet-300 flex items-center gap-2">
                        <Activity className="h-4 w-4" /> Últimos Usuarios Registrados
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {stats.recentUsers.map(user => (
                          <div key={user.id} className="flex items-center justify-between py-1.5 border-b border-violet-800/20 last:border-0">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${user.active ? 'bg-violet-800/50 text-violet-300' : 'bg-gray-800/50 text-gray-500'}`}>
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-white">{user.name}</p>
                                <p className="text-[10px] text-violet-500">{user.email}</p>
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
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-12 text-violet-500">
                  <p>No se pudieron cargar las estadísticas</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ EMPRESAS TAB ═══ */}
          {activeTab === 'empresas' && (
            <motion.div key="empresas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-violet-400">Todas las empresas de la plataforma</p>
                <Button
                  onClick={() => setShowNewCompany(true)}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" /> Nueva Empresa
                </Button>
              </div>

              {/* New company form */}
              {showNewCompany && (
                <Card className="bg-violet-900/20 border-violet-700/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-violet-300 flex items-center gap-2">
                      <Plus className="h-4 w-4 text-violet-400" /> Crear Nueva Empresa
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-violet-400">Nombre *</Label>
                        <Input placeholder="Nombre de la empresa" value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} className="bg-slate-900/60 border-violet-700/30 text-white" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-violet-400">Descripción</Label>
                        <Input placeholder="Descripción (opcional)" value={newCompanyDesc} onChange={e => setNewCompanyDesc(e.target.value)} className="bg-slate-900/60 border-violet-700/30 text-white" />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => setShowNewCompany(false)} className="border-violet-700/50 text-violet-300">Cancelar</Button>
                      <Button size="sm" onClick={handleCreateCompany} disabled={!newCompanyName.trim()} className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">Crear</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {isLoadingStats ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 text-violet-400 animate-spin" /></div>
              ) : (
                <div className="grid gap-3">
                  {stats?.companies.map(company => (
                    <Card key={company.id} className={`bg-slate-900/60 ${company.active ? 'border-violet-700/20' : 'border-red-700/30 opacity-60'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${company.active ? 'bg-violet-800/40' : 'bg-red-900/30'}`}>
                              <Building2 className={`h-5 w-5 ${company.active ? 'text-violet-400' : 'text-red-400'}`} />
                            </div>
                            <div className="flex-1">
                              {editingCompany === company.id ? (
                                <div className="space-y-2" onClick={e => e.stopPropagation()}>
                                  <Input value={editCompanyData.name} onChange={e => setEditCompanyData(d => ({ ...d, name: e.target.value }))} className="bg-slate-800 border-violet-700/30 text-white text-sm" />
                                  <Input value={editCompanyData.description} onChange={e => setEditCompanyData(d => ({ ...d, description: e.target.value }))} className="bg-slate-800 border-violet-700/30 text-white text-sm" placeholder="Descripción" />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleUpdateCompany(company.id)} className="bg-violet-600 text-white h-7"><Check className="h-3 w-3 mr-1" />Guardar</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingCompany(null)} className="text-violet-400 h-7">Cancelar</Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="text-sm font-semibold text-white">{company.name}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[10px] text-violet-500">{company.description || 'Sin descripción'}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <p className="text-lg font-bold text-white">{company.projectCount}</p>
                              <p className="text-[10px] text-violet-500">Proyectos</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-white">{company.memberCount}</p>
                              <p className="text-[10px] text-violet-500">Miembros</p>
                            </div>
                            <Badge className={`${company.active ? 'bg-green-900/30 text-green-400 border-green-700/30' : 'bg-red-900/30 text-red-400 border-red-700/30'} border text-[10px]`}>
                              {company.active ? 'Activa' : 'Inactiva'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleCompanyActive(company.id, company.active)}
                              className={`h-7 w-7 p-0 ${company.active ? 'text-green-500 hover:bg-green-900/30' : 'text-red-500 hover:bg-red-900/30'}`}
                            >
                              {company.active ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setEditingCompany(company.id); setEditCompanyData({ name: company.name, description: company.description || '', active: company.active }) }}
                              className="h-7 w-7 p-0 text-violet-400 hover:bg-violet-900/30"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ USUARIOS TAB ═══ */}
          {activeTab === 'usuarios' && (
            <motion.div key="usuarios" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3 items-center">
                <p className="text-sm text-violet-400">Todos los usuarios de la plataforma</p>
                <div className="flex-1" />
                <Select value={filterCompany} onValueChange={setFilterCompany}>
                  <SelectTrigger className="w-48 bg-slate-900/60 border-violet-700/30 text-white text-xs h-8">
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
                  <SelectTrigger className="w-40 bg-slate-900/60 border-violet-700/30 text-white text-xs h-8">
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
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 text-violet-400 animate-spin" /></div>
              ) : (
                <Card className="bg-slate-900/60 border-violet-700/20 overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-violet-800/30 hover:bg-transparent">
                          <TableHead className="text-violet-400 text-xs">Usuario</TableHead>
                          <TableHead className="text-violet-400 text-xs">Email</TableHead>
                          <TableHead className="text-violet-400 text-xs">Rol</TableHead>
                          <TableHead className="text-violet-400 text-xs">Empresa</TableHead>
                          <TableHead className="text-violet-400 text-xs">Estado</TableHead>
                          <TableHead className="text-violet-400 text-xs">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map(user => (
                          <TableRow key={user.id} className="border-violet-800/20 hover:bg-violet-900/10">
                            <TableCell>
                              {editingUser === user.id ? (
                                <Input value={editUserData.name} onChange={e => setEditUserData(d => ({ ...d, name: e.target.value }))} className="bg-slate-800 border-violet-700/30 text-white text-xs h-7 w-36" />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${user.active ? 'bg-violet-800/50 text-violet-300' : 'bg-gray-800/50 text-gray-500'}`}>
                                    {user.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-xs text-white font-medium">{user.name}</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-violet-400">{user.email}</TableCell>
                            <TableCell>
                              {editingUser === user.id ? (
                                <Select value={editUserData.role} onValueChange={val => setEditUserData(d => ({ ...d, role: val }))}>
                                  <SelectTrigger className="bg-slate-800 border-violet-700/30 text-white text-xs h-7 w-36">
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
                            <TableCell className="text-xs text-violet-400">
                              {user.companies.length > 0
                                ? user.companies.map(c => c.name).join(', ')
                                : user.projects.length > 0
                                  ? [...new Set(user.projects.map(p => p.company))].join(', ')
                                  : '—'}
                            </TableCell>
                            <TableCell>
                              {user.active ? (
                                <Badge className="bg-green-900/30 text-green-400 border-green-700/30 border text-[10px]">Activo</Badge>
                              ) : (
                                <Badge className="bg-red-900/30 text-red-400 border-red-700/30 border text-[10px]">Inactivo</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {editingUser === user.id ? (
                                  <>
                                    <Button size="sm" onClick={() => handleUpdateUser(user.id)} className="bg-violet-600 text-white h-6 w-6 p-0"><Check className="h-3 w-3" /></Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingUser(null)} className="text-violet-400 h-6 w-6 p-0"><X className="h-3 w-3" /></Button>
                                  </>
                                ) : (
                                  <>
                                    <Button variant="ghost" size="sm" onClick={() => { setEditingUser(user.id); setEditUserData({ name: user.name, email: user.email, role: user.role, active: user.active }) }} className="h-6 w-6 p-0 text-violet-400 hover:bg-violet-900/30">
                                      <Edit3 className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleToggleActive(user.id, user.active)} className={`h-6 w-6 p-0 ${user.active ? 'text-red-400 hover:bg-red-900/30' : 'text-green-400 hover:bg-green-900/30'}`}>
                                      {user.active ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => { setResetPasswordUserId(user.id); setNewPassword('') }} className="h-6 w-6 p-0 text-violet-400 hover:bg-violet-900/30">
                                      <Key className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="p-3 border-t border-violet-800/20">
                    <p className="text-xs text-violet-500">{filteredUsers.length} de {users.length} usuarios</p>
                  </div>
                </Card>
              )}

              {/* Reset password dialog */}
              {resetPasswordUserId && (
                <Dialog open={!!resetPasswordUserId} onOpenChange={() => setResetPasswordUserId(null)}>
                  <DialogContent className="bg-slate-900 border-violet-700/30">
                    <DialogHeader>
                      <DialogTitle className="text-violet-300">Restablecer Contraseña</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-violet-400">Nueva contraseña (mín. 6 caracteres)</Label>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="bg-slate-800 border-violet-700/30 text-white pr-10"
                          />
                          <Button variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1 h-7 w-7 p-0 text-violet-400">
                            {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setResetPasswordUserId(null)} className="border-violet-700/50 text-violet-300">Cancelar</Button>
                        <Button size="sm" onClick={() => handleResetPassword(resetPasswordUserId)} disabled={newPassword.length < 6} className="bg-violet-600 text-white">Guardar</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </motion.div>
          )}

          {/* ═══ SUSCRIPCIONES TAB ═══ */}
          {activeTab === 'suscripciones' && (
            <motion.div key="suscripciones" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-violet-400" />
                <h2 className="text-lg font-bold text-white">Suscripciones y Facturación</h2>
                <Badge className="bg-yellow-900/30 text-yellow-400 border-yellow-700/30 border text-[10px]">PRÓXIMAMENTE</Badge>
              </div>
              <Card className="bg-slate-900/60 border-violet-700/20">
                <CardContent className="p-6">
                  <div className="grid gap-4">
                    {stats?.companies.map((company, idx) => {
                      // Placeholder subscription statuses
                      const statuses = ['activa', 'prueba', 'vencida'] as const
                      const subStatus = statuses[idx % 3]
                      const statusInfo = SUBSCRIPTION_STATUS[subStatus]
                      return (
                        <div key={company.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-violet-800/20">
                          <div className="flex items-center gap-3">
                            <Building2 className="h-5 w-5 text-violet-400" />
                            <div>
                              <p className="text-sm font-semibold text-white">{company.name}</p>
                              <p className="text-[10px] text-violet-500">{company.memberCount} miembros · {company.projectCount} proyectos</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={`${statusInfo.color} border text-xs`}>
                              {statusInfo.label}
                            </Badge>
                            <span className="text-[10px] text-violet-600">Plan Enterprise</span>
                          </div>
                        </div>
                      )
                    })}
                    {(!stats || stats.companies.length === 0) && (
                      <p className="text-sm text-violet-500 text-center py-8">No hay empresas registradas</p>
                    )}
                  </div>
                  <div className="mt-6 p-4 bg-violet-900/20 rounded-lg border border-violet-700/30">
                    <p className="text-xs text-violet-400">
                      💡 <strong>Placeholder:</strong> La gestión de suscripciones y facturación se integrará próximamente con Stripe u otro proveedor de pagos.
                      Las empresas podrán tener planes: Gratuito, Básico y Enterprise con diferentes límites de usuarios y proyectos.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ═══ CONFIGURACIÓN TAB ═══ */}
          {activeTab === 'configuracion' && (
            <motion.div key="configuracion" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-5 w-5 text-violet-400" />
                <h2 className="text-lg font-bold text-white">Configuración de Plataforma</h2>
              </div>

              {/* Add new config */}
              <Card className="bg-slate-900/60 border-violet-700/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-violet-300 flex items-center gap-2">
                    <Plus className="h-4 w-4 text-violet-400" /> Nueva Configuración
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-violet-400">Clave (key)</Label>
                      <Input placeholder="platform.name" value={newConfigKey} onChange={e => setNewConfigKey(e.target.value)} className="bg-slate-800 border-violet-700/30 text-white text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-violet-400">Valor</Label>
                      <Input placeholder="5S Audit Platform" value={newConfigValue} onChange={e => setNewConfigValue(e.target.value)} className="bg-slate-800 border-violet-700/30 text-white text-sm" />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleSaveConfig} disabled={!newConfigKey.trim() || !newConfigValue.trim()} className="bg-gradient-to-r from-violet-600 to-purple-600 text-white w-full">
                        <Save className="h-4 w-4 mr-1" /> Guardar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Existing configs */}
              {isLoadingConfigs ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 text-violet-400 animate-spin" /></div>
              ) : (
                <Card className="bg-slate-900/60 border-violet-700/20">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-violet-800/30 hover:bg-transparent">
                          <TableHead className="text-violet-400 text-xs">Clave</TableHead>
                          <TableHead className="text-violet-400 text-xs">Valor</TableHead>
                          <TableHead className="text-violet-400 text-xs">Actualizado</TableHead>
                          <TableHead className="text-violet-400 text-xs">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {configs.map(config => (
                          <TableRow key={config.id} className="border-violet-800/20 hover:bg-violet-900/10">
                            <TableCell className="text-xs font-mono text-violet-300">{config.key}</TableCell>
                            <TableCell>
                              {editingConfigKey === config.key ? (
                                <Input value={editConfigValue} onChange={e => setEditConfigValue(e.target.value)} className="bg-slate-800 border-violet-700/30 text-white text-xs h-7" />
                              ) : (
                                <span className="text-xs text-white">{config.value}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-[10px] text-violet-500">{new Date(config.updatedAt).toLocaleString('es-ES')}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {editingConfigKey === config.key ? (
                                  <>
                                    <Button size="sm" onClick={() => handleUpdateConfig(config.key)} className="bg-violet-600 text-white h-6 w-6 p-0"><Check className="h-3 w-3" /></Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingConfigKey(null)} className="text-violet-400 h-6 w-6 p-0"><X className="h-3 w-3" /></Button>
                                  </>
                                ) : (
                                  <>
                                    <Button variant="ghost" size="sm" onClick={() => { setEditingConfigKey(config.key); setEditConfigValue(config.value) }} className="h-6 w-6 p-0 text-violet-400 hover:bg-violet-900/30">
                                      <Edit3 className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteConfig(config.key)} className="h-6 w-6 p-0 text-red-400 hover:bg-red-900/30">
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {configs.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6 text-violet-500 text-xs">No hay configuraciones. Agrega la primera arriba.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {/* ═══ PLANTILLAS GLOBALES TAB ═══ */}
          {activeTab === 'plantillas' && (
            <motion.div key="plantillas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-violet-400" />
                <h2 className="text-lg font-bold text-white">Plantillas Globales</h2>
                <span className="text-xs text-violet-500">— Plantillas genéricas visibles para todas las empresas</span>
              </div>
              <div className="bg-slate-900/60 rounded-lg border border-violet-700/20 p-4">
                <TemplateManager />
              </div>
            </motion.div>
          )}

          {/* ═══ TABLERO 5S CONFIG TAB ═══ */}
          {activeTab === 'tablero5s' && (
            <motion.div key="tablero5s" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-2 mb-4">
                <Globe className="h-5 w-5 text-violet-400" />
                <h2 className="text-lg font-bold text-white">Configuración del Tablero 5S</h2>
                <span className="text-xs text-violet-500">— A nivel de plataforma</span>
              </div>
              <div className="bg-slate-900/60 rounded-lg border border-violet-700/20 p-4">
                <Tablero5S />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
