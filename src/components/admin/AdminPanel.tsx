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
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Building2,
  Users,
  Key,
  Mail,
  Lock,
  User,
  Shield,
  MapPin,
  UserPlus,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckSquare,
  ShieldCheck,
  Save,
  BookOpen,
  LayoutGrid,
  Sparkles,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { S_STEPS } from '@/lib/5s-constants'
import TemplateManager from './TemplateManager'
import Tablero5S from './Tablero5S'
import MejoraContinuaAdmin from './MejoraContinuaAdmin'


// ─── Types ───────────────────────────────────────────────────────────────────

interface UserData {
  id: string
  email: string
  name: string
  role: string
  active: boolean
  createdAt: string
  projects: Array<{
    projectId: string
    projectName: string
    projectCompany: string
    role: string
    zones: Array<{ id: string; name: string; color: string }>
  }>
}

interface ProjectData {
  id: string
  name: string
  description: string | null
  company: string
  startDate: string
  active: boolean
  zones: Array<{ id: string; name: string; description: string | null; color: string }>
  memberCount: number
}

interface ZoneData {
  id: string
  name: string
  description: string | null
  color: string
  boardConfigId: string | null
  boardConfig?: { id: string; name: string } | null
}

interface MemberData {
  id: string
  role: string
  user: { id: string; email: string; name: string; role: string; active: boolean }
  zones: Array<{ id: string; name: string; color: string }>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const PRESET_COLORS = ['#8B5CF6', '#EAB308', '#3B82F6', '#F43F5E', '#F97316', '#22C55E', '#06B6D4', '#EC4899']

// ─── Component ───────────────────────────────────────────────────────────────

interface AdminPanelProps {
  embedded?: boolean;
}

export default function AdminPanel({ embedded }: AdminPanelProps = {}) {
  const { setCurrentView, fetchProjects, fetchCompanies, projects, setCurrentProject, currentProject } = use5SStore()
  const [activeTab, setActiveTab] = useState<'companies' | 'users' | 'projects' | 'plantillas' | 'tablero5s' | 'mejora'>('companies')

  // ─── Projects state ──────────────────────────────────────────────────────
  const [allProjects, setAllProjects] = useState<ProjectData[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [editingProject, setEditingProject] = useState<string | null>(null)
  const [editProjectData, setEditProjectData] = useState({ name: '', description: '', company: '' })

  // New project form
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectCompany, setNewProjectCompany] = useState('')
  const [isNewCompanyCustom, setIsNewCompanyCustom] = useState(false)
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [newProjectZones, setNewProjectZones] = useState<Array<{ name: string; color: string }>>([
    { name: '', color: PRESET_COLORS[0] },
  ])

  // Project detail (zones + members)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [projectZones, setProjectZones] = useState<ZoneData[]>([])
  const [projectMembers, setProjectMembers] = useState<MemberData[]>([])
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [newZoneName, setNewZoneName] = useState('')
  const [newZoneColor, setNewZoneColor] = useState(PRESET_COLORS[0])
  const [boardConfigs, setBoardConfigs] = useState<Array<{ id: string; name: string; isDefault: boolean }>>([])
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('empleado')
  const [newMemberZones, setNewMemberZones] = useState<string[]>([])
  const [newMemberPassword, setNewMemberPassword] = useState('')
  const [addMemberMode, setAddMemberMode] = useState<'existing' | 'new'>('existing')
  const [selectedExistingUserId, setSelectedExistingUserId] = useState('')

  // ─── Users state ─────────────────────────────────────────────────────────
  const [users, setUsers] = useState<UserData[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [editUserData, setEditUserData] = useState({ name: '', email: '', role: '', active: true })
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // New user form
  const [showNewUser, setShowNewUser] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('empleado')

  // ─── Companies state ────────────────────────────────────────────────────
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; description: string | null; active: boolean; projectCount: number; memberCount: number }>>([])
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false)
  const [showNewCompany, setShowNewCompany] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanyDesc, setNewCompanyDesc] = useState('')
  const [editingCompany, setEditingCompany] = useState<string | null>(null)
  const [editCompanyData, setEditCompanyData] = useState({ name: '', description: '' })
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null)
  const [companyMembers, setCompanyMembers] = useState<Array<{ id: string; userId: string; companyId: string; role: string; user: { id: string; name: string; email: string; role: string; active: boolean } }>>([])
  const [addGerenteUserId, setAddGerenteUserId] = useState('')
  const [isLoadingCompanyDetail, setIsLoadingCompanyDetail] = useState(false)

  // ─── 5S Steps state ────────────────────────────────────────────────────
  const [progress5S, setProgress5S] = useState<Array<{ id: string; sStep: number; miniStep: number; completed: boolean; score: number | null; notes: string | null; zoneId: string | null; zoneName?: string }>>([])
  const [isLoading5S, setIsLoading5S] = useState(false)
  const [editingScore, setEditingScore] = useState<string | null>(null) // progress record id
  const [editScoreValue, setEditScoreValue] = useState('')
  const [editNotesValue, setEditNotesValue] = useState('')
  const [selected5SProjectId, setSelected5SProjectId] = useState<string | null>(null)
  const [selected5SZoneId, setSelected5SZoneId] = useState<string | null>(null)

  // ─── Data loading ────────────────────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    setIsLoadingProjects(true)
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setAllProjects(data.projects || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setIsLoadingProjects(false)
    }
  }, [])

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true)
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setIsLoadingUsers(false)
    }
  }, [])

  const loadCompanies = useCallback(async () => {
    setIsLoadingCompanies(true)
    try {
      const res = await fetch('/api/companies')
      const data = await res.json()
      if (data.success) {
        setCompanies(data.companies || [])
      }
    } catch (error) {
      console.error('Error loading companies:', error)
    } finally {
      setIsLoadingCompanies(false)
    }
  }, [])

  const loadCompanyDetail = useCallback(async (companyId: string) => {
    setIsLoadingCompanyDetail(true)
    try {
      const res = await fetch(`/api/companies/${companyId}`)
      const data = await res.json()
      if (data.success) {
        setCompanyMembers(data.company?.members || [])
      }
    } catch (error) {
      console.error('Error loading company detail:', error)
    } finally {
      setIsLoadingCompanyDetail(false)
    }
  }, [])

  const loadProjectDetail = useCallback(async (projectId: string) => {
    setIsLoadingDetail(true)
    try {
      const [zonesRes, membersRes, configsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/zones`),
        fetch(`/api/projects/${projectId}/members`),
        fetch('/api/board-configs'),
      ])
      const zonesData = await zonesRes.json()
      const membersData = await membersRes.json()
      const configsData = await configsRes.json()
      setProjectZones(zonesData.zones || [])
      setProjectMembers(membersData.members || [])
      if (configsData.success) {
        setBoardConfigs((configsData.data || []).map((c: any) => ({ id: c.id, name: c.name, isDefault: c.isDefault })))
      }
    } catch (error) {
      console.error('Error loading project detail:', error)
    } finally {
      setIsLoadingDetail(false)
    }
  }, [])

  const load5SProgress = useCallback(async () => {
    setIsLoading5S(true)
    try {
      const params = new URLSearchParams()
      if (selected5SProjectId) params.set('projectId', selected5SProjectId)
      const res = await fetch(`/api/progress?${params.toString()}`)
      const data = await res.json()
      const progressData = data?.data ? data.data : (Array.isArray(data) ? data : [])
      // Enrich with zone names
      if (selected5SProjectId) {
        const zonesRes = await fetch(`/api/projects/${selected5SProjectId}/zones`)
        const zonesData = await zonesRes.json()
        const zones = zonesData.zones || []
        const enriched = progressData.map((p: any) => ({
          ...p,
          zoneName: zones.find((z: any) => z.id === p.zoneId)?.name || (p.zoneId ? 'Zona sin nombre' : 'Sin zona'),
        }))
        setProgress5S(enriched)
      } else {
        setProgress5S(progressData)
      }
    } catch (error) {
      console.error('Error loading 5S progress:', error)
    } finally {
      setIsLoading5S(false)
    }
  }, [selected5SProjectId])

  useEffect(() => {
    loadProjects()
    loadUsers()
    loadCompanies()
  }, [loadProjects, loadUsers, loadCompanies])

  useEffect(() => {
    if (activeTab === '5s-steps') {
      load5SProgress()
    }
  }, [activeTab, load5SProgress])

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectDetail(selectedProjectId)
    }
  }, [selectedProjectId, loadProjectDetail])

  useEffect(() => {
    if (expandedCompanyId) {
      loadCompanyDetail(expandedCompanyId)
    }
  }, [expandedCompanyId, loadCompanyDetail])

  // ─── Project actions ─────────────────────────────────────────────────────
  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !newProjectCompany.trim()) return
    const validZones = newProjectZones.filter(z => z.name.trim())
    if (validZones.length === 0) return

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDesc || undefined,
          company: newProjectCompany,
          companyId: companies.find(c => c.name === newProjectCompany)?.id || undefined,
          zones: validZones.map(z => ({ name: z.name, color: z.color })),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        // Auto-add current user as admin
        const { currentUser } = use5SStore.getState()
        if (currentUser) {
          await fetch(`/api/projects/${data.project.id}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email, name: currentUser.name, role: 'admin', zoneIds: data.project.zones?.map((z: any) => z.id) || [] }),
          })
        }
        setShowNewProject(false)
        setNewProjectName('')
        setNewProjectCompany('')
        setIsNewCompanyCustom(false)
        setNewProjectDesc('')
        setNewProjectZones([{ name: '', color: PRESET_COLORS[0] }])
        await loadProjects()
        await fetchProjects()
      }
    } catch (error) {
      console.error('Error creating project:', error)
    }
  }

  const handleUpdateProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editProjectData),
      })
      if (res.ok) {
        setEditingProject(null)
        await loadProjects()
        await fetchProjects()
      }
    } catch (error) {
      console.error('Error updating project:', error)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('¿Estás seguro de eliminar este proyecto? Se eliminarán todos los datos asociados (inventarios, progresos, auditorías, etc.).')) return
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      if (res.ok) {
        if (currentProject?.id === projectId) {
          const remaining = allProjects.filter(p => p.id !== projectId)
          setCurrentProject(remaining.length > 0 ? remaining[0] : null)
        }
        await loadProjects()
        await fetchProjects()
      }
    } catch (error) {
      console.error('Error deleting project:', error)
    }
  }

  const handleSelectProject = (projectId: string) => {
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null)
    } else {
      setSelectedProjectId(projectId)
    }
  }

  const handleAddZone = async () => {
    if (!selectedProjectId || !newZoneName.trim()) return
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newZoneName, color: newZoneColor }),
      })
      if (res.ok) {
        setNewZoneName('')
        setNewZoneColor(PRESET_COLORS[(projectZones.length) % PRESET_COLORS.length])
        await loadProjectDetail(selectedProjectId)
        await loadProjects()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al agregar zona')
      }
    } catch (error) {
      console.error('Error adding zone:', error)
      alert('Error de conexión al agregar zona')
    }
  }

  const handleDeleteZone = async (zoneId: string, zoneName: string) => {
    if (!selectedProjectId) return
    if (!confirm(`¿Estás seguro de eliminar la zona "${zoneName}"? Los miembros asignados a esta zona perderán la asignación.`)) return
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/zones`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneId }),
      })
      if (res.ok) {
        await loadProjectDetail(selectedProjectId)
        await loadProjects()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al eliminar zona')
      }
    } catch (error) {
      console.error('Error deleting zone:', error)
    }
  }

  const handleZoneBoardConfig = async (zoneId: string, boardConfigId: string) => {
    if (!selectedProjectId) return
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/zones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneId, boardConfigId }),
      })
      if (res.ok) {
        // Update local state
        setProjectZones(prev => prev.map(z => {
          if (z.id === zoneId) {
            const config = boardConfigs.find(c => c.id === boardConfigId)
            return { ...z, boardConfigId: boardConfigId || null, boardConfig: config ? { id: config.id, name: config.name } : null }
          }
          return z
        }))
      }
    } catch (error) {
      console.error('Error updating zone board config:', error)
    }
  }

  const handleAddMember = async () => {
    if (!selectedProjectId) return
    try {
      if (addMemberMode === 'existing') {
        // Add existing user to project
        const selectedUser = users.find(u => u.id === selectedExistingUserId)
        if (!selectedUser) return

        const body: any = {
          email: selectedUser.email,
          name: selectedUser.name,
          role: newMemberRole,
          zoneIds: newMemberZones.length > 0 ? newMemberZones : undefined,
        }
        const res = await fetch(`/api/projects/${selectedProjectId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          setSelectedExistingUserId('')
          setNewMemberRole('empleado')
          setNewMemberZones([])
          await loadProjectDetail(selectedProjectId)
        }
      } else {
        // Create new user and add to project
        if (!newMemberName.trim() || !newMemberEmail.trim()) return
        const body: any = {
          email: newMemberEmail,
          name: newMemberName,
          role: newMemberRole,
          zoneIds: newMemberZones.length > 0 ? newMemberZones : undefined,
        }
        if (newMemberPassword && newMemberPassword.length >= 6) {
          body.password = newMemberPassword
        }
        const res = await fetch(`/api/projects/${selectedProjectId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          setNewMemberName('')
          setNewMemberEmail('')
          setNewMemberRole('empleado')
          setNewMemberZones([])
          setNewMemberPassword('')
          await loadProjectDetail(selectedProjectId)
        }
      }
    } catch (error) {
      console.error('Error adding member:', error)
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!selectedProjectId) return
    if (!confirm(`¿Estás seguro de eliminar a "${memberName}" de este proyecto?`)) return
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })
      if (res.ok) {
        await loadProjectDetail(selectedProjectId)
        await loadProjects()
        await loadUsers()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al eliminar miembro')
      }
    } catch (error) {
      console.error('Error removing member:', error)
    }
  }

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
        await loadCompanies()
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
        await loadCompanies()
        await fetchCompanies()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al actualizar empresa')
      }
    } catch (error) {
      console.error('Error updating company:', error)
    }
  }

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta empresa?')) return
    try {
      const res = await fetch(`/api/companies/${companyId}`, { method: 'DELETE' })
      if (res.ok) {
        await loadCompanies()
        await fetchCompanies()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al eliminar empresa')
      }
    } catch (error) {
      console.error('Error deleting company:', error)
    }
  }

  const handleAddGerente = async () => {
    if (!expandedCompanyId || !addGerenteUserId) return
    try {
      const res = await fetch(`/api/companies/${expandedCompanyId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: addGerenteUserId, role: 'gerente' }),
      })
      if (res.ok) {
        setAddGerenteUserId('')
        await loadCompanyDetail(expandedCompanyId)
        await loadCompanies()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al asignar gerente')
      }
    } catch (error) {
      console.error('Error adding gerente:', error)
    }
  }

  const handleRemoveCompanyMember = async (userId: string, userName: string) => {
    if (!expandedCompanyId) return
    if (!confirm(`¿Estás seguro de eliminar a "${userName}" de esta empresa?`)) return
    try {
      const res = await fetch(`/api/companies/${expandedCompanyId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberUserId: userId }),
      })
      if (res.ok) {
        await loadCompanyDetail(expandedCompanyId)
        await loadCompanies()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al eliminar miembro')
      }
    } catch (error) {
      console.error('Error removing company member:', error)
    }
  }

  // ─── User actions ────────────────────────────────────────────────────────
  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) return
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
        }),
      })
      if (res.ok) {
        setShowNewUser(false)
        setNewUserName('')
        setNewUserEmail('')
        setNewUserPassword('')
        setNewUserRole('empleado')
        await loadUsers()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al crear usuario')
      }
    } catch (error) {
      console.error('Error creating user:', error)
    }
  }

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
      } else {
        const data = await res.json()
        alert(data.error || 'Error al actualizar usuario')
      }
    } catch (error) {
      console.error('Error updating user:', error)
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

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, active: !currentActive }),
      })
      if (res.ok) {
        await loadUsers()
      }
    } catch (error) {
      console.error('Error toggling user active:', error)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return
    try {
      const res = await fetch(`/api/users?id=${userId}`, { method: 'DELETE' })
      if (res.ok) {
        await loadUsers()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al eliminar usuario')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col h-full bg-gradient-to-b from-gray-50 to-white`}>
      {/* Header - only shown in standalone mode */}
      {!embedded && (
        <header className="border-b bg-white/80 backdrop-blur-sm shrink-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => {
                if (!currentProject && allProjects.length > 0) {
                  setCurrentProject(allProjects[0])
                }
                setCurrentView('board')
              }} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Volver al Tablero
              </Button>
              <div className="w-px h-6 bg-gray-200" />
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                A
              </div>
              <h1 className="text-lg font-bold text-gray-900">Panel de Administración</h1>
            </div>
          </div>
        </header>
      )}

      {/* Tabs — Order: Empresas / Usuarios / Proyectos / Plantillas */}
      <div className="border-b bg-white shrink-0">
        <div className={`flex gap-1 ${embedded ? '' : 'max-w-5xl mx-auto px-4'}`}>
          <button
            onClick={() => { setActiveTab('companies'); setSelectedProjectId(null) }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'companies'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Empresas
          </button>
          <button
            onClick={() => { setActiveTab('users'); setSelectedProjectId(null) }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4" />
            Usuarios
          </button>
          <button
            onClick={() => { setActiveTab('projects'); setSelectedProjectId(null) }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'projects'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Proyectos
          </button>

          <button
            onClick={() => { setActiveTab('plantillas'); setSelectedProjectId(null) }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'plantillas'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Plantillas
          </button>

          <button
            onClick={() => { setActiveTab('tablero5s'); setSelectedProjectId(null) }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'tablero5s'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Configuración de Tableros
          </button>

          <button
            onClick={() => { setActiveTab('mejora'); setSelectedProjectId(null) }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'mejora'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Mejora Continua
          </button>
        </div>
      </div>

      {/* Content */}
      <main className={`flex-1 min-h-0 overflow-auto w-full px-4 py-6 ${activeTab === 'tablero5s' || activeTab === 'mejora' ? 'max-w-7xl mx-auto' : embedded ? '' : 'max-w-5xl mx-auto'}`}>
        <AnimatePresence mode="wait">
          {/* ═══ PROJECTS TAB ═══ */}
          {activeTab === 'projects' && (
            <motion.div key="projects" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* New project button */}
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Gestiona los proyectos de implementación 5S
                </p>
                <Button
                  onClick={() => setShowNewProject(true)}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" /> Nuevo Proyecto
                </Button>
              </div>

              {/* New project form */}
              {showNewProject && (
                <Card className="border-purple-200 bg-purple-50/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Plus className="h-4 w-4 text-purple-500" />
                      Crear Nuevo Proyecto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nombre del Proyecto *</Label>
                        <Input placeholder="Nombre" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Empresa *</Label>
                        {companies.length > 0 && !isNewCompanyCustom ? (
                          <div className="space-y-1">
                            <Select
                              value={newProjectCompany ? (companies.find(c => c.name === newProjectCompany)?.id || '') : undefined}
                              onValueChange={val => {
                                if (val === '__custom__') {
                                  setNewProjectCompany('')
                                  setIsNewCompanyCustom(true)
                                } else {
                                  const comp = companies.find(c => c.id === val)
                                  if (comp) setNewProjectCompany(comp.name)
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar empresa" />
                              </SelectTrigger>
                              <SelectContent>
                                {companies.map(c => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                                <SelectItem value="__custom__">+ Otra empresa...</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Input placeholder="Nombre de la nueva empresa" value={newProjectCompany} onChange={e => setNewProjectCompany(e.target.value)} />
                            {companies.length > 0 && (
                              <Button variant="ghost" size="sm" onClick={() => { setIsNewCompanyCustom(false); setNewProjectCompany('') }} className="h-6 text-xs text-purple-600 p-0">
                                ← Seleccionar empresa existente
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Descripción</Label>
                      <Input placeholder="Descripción del proyecto (opcional)" value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Zonas *</Label>
                        <Button variant="ghost" size="sm" onClick={() => setNewProjectZones([...newProjectZones, { name: '', color: PRESET_COLORS[newProjectZones.length % PRESET_COLORS.length] }])} className="h-6 text-xs text-purple-600">
                          <Plus className="h-3 w-3 mr-1" /> Agregar zona
                        </Button>
                      </div>
                      {newProjectZones.map((zone, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <button
                            type="button"
                            className="w-6 h-6 rounded-full border-2 flex-shrink-0"
                            style={{ backgroundColor: zone.color, borderColor: zone.color }}
                            onClick={() => {
                              const next = PRESET_COLORS[(PRESET_COLORS.indexOf(zone.color) + 1) % PRESET_COLORS.length]
                              const updated = [...newProjectZones]
                              updated[idx] = { ...updated[idx], color: next }
                              setNewProjectZones(updated)
                            }}
                          />
                          <Input
                            placeholder="Nombre de la zona"
                            value={zone.name}
                            onChange={e => {
                              const updated = [...newProjectZones]
                              updated[idx] = { ...updated[idx], name: e.target.value }
                              setNewProjectZones(updated)
                            }}
                            className="flex-1"
                          />
                          {newProjectZones.length > 1 && (
                            <Button variant="ghost" size="sm" onClick={() => setNewProjectZones(newProjectZones.filter((_, i) => i !== idx))} className="h-8 w-8 p-0 text-red-400 hover:text-red-600">
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => setShowNewProject(false)}>Cancelar</Button>
                      <Button
                        size="sm"
                        onClick={handleCreateProject}
                        disabled={!newProjectName.trim() || !newProjectCompany.trim() || newProjectZones.filter(z => z.name.trim()).length === 0}
                        className="bg-gradient-to-r from-purple-500 to-purple-600 text-white"
                      >
                        Crear Proyecto
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Projects list */}
              {isLoadingProjects ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 text-purple-500 animate-spin" /></div>
              ) : allProjects.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay proyectos creados</p>
                  <p className="text-xs mt-1">Crea un proyecto para comenzar la implementación 5S</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allProjects.map(project => (
                    <Card key={project.id} className={`transition-all ${selectedProjectId === project.id ? 'border-purple-300 shadow-md' : 'hover:border-gray-300'}`}>
                      <CardContent className="p-4">
                        {/* Project header row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => handleSelectProject(project.id)}>
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-purple-500" />
                            </div>
                            <div className="flex-1">
                              {editingProject === project.id ? (
                                <div className="space-y-2" onClick={e => e.stopPropagation()}>
                                  <div className="grid grid-cols-2 gap-2">
                                    <Input value={editProjectData.name} onChange={e => setEditProjectData(d => ({ ...d, name: e.target.value }))} className="text-sm" />
                                    <Input value={editProjectData.company} onChange={e => setEditProjectData(d => ({ ...d, company: e.target.value }))} className="text-sm" />
                                  </div>
                                  <Input value={editProjectData.description} onChange={e => setEditProjectData(d => ({ ...d, description: e.target.value }))} className="text-sm" placeholder="Descripción" />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleUpdateProject(project.id)} className="bg-purple-600 text-white h-7"><Check className="h-3 w-3 mr-1" />Guardar</Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditingProject(null)} className="h-7">Cancelar</Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <h3 className="font-semibold text-sm">{project.name}</h3>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{project.company}</span>
                                    <span>·</span>
                                    <span>{project.zones.length} zonas</span>
                                    <span>·</span>
                                    <span>{project.memberCount} miembros</span>
                                    {!project.active && <Badge className="bg-red-100 text-red-700 border border-red-200 ml-1">Inactivo</Badge>}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          {editingProject !== project.id && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700"
                                onClick={() => {
                                  setEditingProject(project.id)
                                  setEditProjectData({ name: project.name, description: project.description || '', company: project.company })
                                }}
                                title="Editar proyecto"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600"
                                onClick={() => handleDeleteProject(project.id)}
                                title="Eliminar proyecto"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Expanded project detail */}
                        <AnimatePresence>
                          {selectedProjectId === project.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-4 pt-4 border-t space-y-4">
                                {isLoadingDetail ? (
                                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 text-purple-500 animate-spin" /></div>
                                ) : (
                                  <>
                                    {/* Zones */}
                                    <div>
                                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                                        <MapPin className="h-3 w-3" /> Zonas
                                      </h4>
                                      <div className="flex flex-wrap gap-2 mb-2">
                                        {projectZones.map(zone => (
                                          <div key={zone.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-white text-xs">
                                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: zone.color }} />
                                            <span className="font-medium">{zone.name}</span>
                                            {/* Board config selector */}
                                            <select
                                              value={zone.boardConfigId || ''}
                                              onChange={e => handleZoneBoardConfig(zone.id, e.target.value)}
                                              className="h-6 text-[10px] border rounded px-1 bg-gray-50 ml-1"
                                            >
                                              <option value="">— Sin tablero —</option>
                                              {boardConfigs.map(bc => (
                                                <option key={bc.id} value={bc.id}>
                                                  {bc.name}{bc.isDefault ? ' ★' : ''}
                                                </option>
                                              ))}
                                            </select>
                                            {zone.boardConfig && (
                                              <Badge className="text-[9px] px-1 py-0 bg-indigo-100 text-indigo-700 border-0">
                                                {zone.boardConfig.name}
                                              </Badge>
                                            )}
                                            <button onClick={() => handleDeleteZone(zone.id, zone.name)} className="text-red-400 hover:text-red-600 ml-1" title="Eliminar zona"><Trash2 className="h-3 w-3" /></button>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="flex gap-1">
                                          {PRESET_COLORS.map(c => (
                                            <button key={c} type="button" className={`w-5 h-5 rounded-full border-2 ${newZoneColor === c ? 'border-gray-800' : 'border-transparent'}`} style={{ backgroundColor: c }} onClick={() => setNewZoneColor(c)} />
                                          ))}
                                        </div>
                                        <Input placeholder="Nueva zona" value={newZoneName} onChange={e => setNewZoneName(e.target.value)} className="h-8 text-xs max-w-[200px]" />
                                        <Button size="sm" onClick={handleAddZone} disabled={!newZoneName.trim()} className="h-8 text-xs bg-purple-600 text-white">
                                          <Plus className="h-3 w-3 mr-1" /> Agregar
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Members */}
                                    <div>
                                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                                        <Users className="h-3 w-3" /> Miembros del Proyecto
                                      </h4>

                                      {/* Add member form */}
                                      <Card className="mb-3 border-gray-200">
                                        <CardContent className="p-3">
                                          {/* Mode toggle */}
                                          <div className="flex gap-2 mb-3">
                                            <button
                                              type="button"
                                              onClick={() => setAddMemberMode('existing')}
                                              className={`flex-1 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                                                addMemberMode === 'existing'
                                                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                                  : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                              }`}
                                            >
                                              <UserPlus className="h-3 w-3 inline mr-1" />
                                              Usuario Existente
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setAddMemberMode('new')}
                                              className={`flex-1 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                                                addMemberMode === 'new'
                                                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                                  : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                              }`}
                                            >
                                              <Plus className="h-3 w-3 inline mr-1" />
                                              Nuevo Usuario
                                            </button>
                                          </div>

                                          {addMemberMode === 'existing' ? (
                                            /* Existing user selection */
                                            <div className="space-y-2">
                                              <Select value={selectedExistingUserId} onValueChange={setSelectedExistingUserId}>
                                                <SelectTrigger className="h-8 text-xs">
                                                  <SelectValue placeholder="Seleccionar usuario existente..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {users
                                                    .filter(u => !projectMembers.some(m => m.user.id === u.id))
                                                    .map(u => (
                                                      <SelectItem key={u.id} value={u.id}>
                                                        <div className="flex items-center gap-2">
                                                          <span>{u.name}</span>
                                                          <span className="text-muted-foreground">({u.email})</span>
                                                          <Badge className={`${ROLE_COLORS[u.role] || ''} border text-[9px] py-0`}>
                                                            {ROLE_LABELS[u.role] || u.role}
                                                          </Badge>
                                                          {u.projects.length === 0 && (
                                                            <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-[9px] py-0">
                                                              Sin proyecto
                                                            </Badge>
                                                          )}
                                                        </div>
                                                      </SelectItem>
                                                    ))}
                                                </SelectContent>
                                              </Select>
                                              <div className="grid grid-cols-2 gap-2">
                                                <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                                                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="admin">Administrador</SelectItem>
                                                    <SelectItem value="gerente">Gerente</SelectItem>
                                                    <SelectItem value="responsable">Responsable</SelectItem>
                                                    <SelectItem value="empleado">Empleado</SelectItem>
                                                    <SelectItem value="auditor">Auditor</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                                <div className="space-y-1">
                                                  <p className="text-[10px] text-muted-foreground font-medium">Zonas asignadas</p>
                                                  <div className="space-y-0.5 max-h-32 overflow-y-auto">
                                                    {projectZones.map(z => (
                                                      <label key={z.id} className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                                                        <Checkbox
                                                          checked={newMemberZones.includes(z.id)}
                                                          onCheckedChange={(checked) => {
                                                            if (checked) {
                                                              setNewMemberZones([...newMemberZones, z.id])
                                                            } else {
                                                              setNewMemberZones(newMemberZones.filter(id => id !== z.id))
                                                            }
                                                          }}
                                                          className="h-3.5 w-3.5"
                                                        />
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
                                                        <span>{z.name}</span>
                                                      </label>
                                                    ))}
                                                  </div>
                                                </div>
                                              </div>
                                              <Button size="sm" onClick={handleAddMember} disabled={!selectedExistingUserId} className="w-full h-8 text-xs bg-purple-600 text-white">
                                                <UserPlus className="h-3 w-3 mr-1" /> Asignar al Proyecto
                                              </Button>
                                            </div>
                                          ) : (
                                            /* New user form */
                                            <>
                                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <Input placeholder="Nombre" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} className="h-8 text-xs" />
                                                <Input placeholder="Email" type="email" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} className="h-8 text-xs" />
                                                <Input placeholder="Contraseña (mín. 6 chars)" type="password" value={newMemberPassword} onChange={e => setNewMemberPassword(e.target.value)} className="h-8 text-xs" />
                                              </div>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                                <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                                                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="admin">Administrador</SelectItem>
                                                    <SelectItem value="gerente">Gerente</SelectItem>
                                                    <SelectItem value="responsable">Responsable</SelectItem>
                                                    <SelectItem value="empleado">Empleado</SelectItem>
                                                    <SelectItem value="auditor">Auditor</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                                <div className="space-y-1">
                                                  <p className="text-[10px] text-muted-foreground font-medium">Zonas asignadas</p>
                                                  <div className="space-y-0.5 max-h-32 overflow-y-auto">
                                                    {projectZones.map(z => (
                                                      <label key={z.id} className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                                                        <Checkbox
                                                          checked={newMemberZones.includes(z.id)}
                                                          onCheckedChange={(checked) => {
                                                            if (checked) {
                                                              setNewMemberZones([...newMemberZones, z.id])
                                                            } else {
                                                              setNewMemberZones(newMemberZones.filter(id => id !== z.id))
                                                            }
                                                          }}
                                                          className="h-3.5 w-3.5"
                                                        />
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
                                                        <span>{z.name}</span>
                                                      </label>
                                                    ))}
                                                  </div>
                                                </div>
                                              </div>
                                              <Button size="sm" onClick={handleAddMember} disabled={!newMemberName.trim() || !newMemberEmail.trim()} className="w-full h-8 text-xs bg-purple-600 text-white mt-2">
                                                <Plus className="h-3 w-3 mr-1" /> Crear y Añadir
                                              </Button>
                                            </>
                                          )}
                                        </CardContent>
                                      </Card>

                                      {/* Members table */}
                                      {projectMembers.length === 0 ? (
                                        <p className="text-xs text-muted-foreground text-center py-4">No hay miembros en este proyecto</p>
                                      ) : (
                                        <div className="rounded-lg border overflow-hidden">
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead className="text-xs">Nombre</TableHead>
                                                <TableHead className="text-xs">Email</TableHead>
                                                <TableHead className="text-xs">Rol</TableHead>
                                                <TableHead className="text-xs">Zona</TableHead>
                                                <TableHead className="text-xs text-center">Acciones</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {projectMembers.map(member => (
                                                <TableRow key={member.id}>
                                                  <TableCell className="text-xs font-medium">{member.user.name}</TableCell>
                                                  <TableCell className="text-xs text-muted-foreground">{member.user.email}</TableCell>
                                                  <TableCell>
                                                    <Badge className={`${ROLE_COLORS[member.role] || ''} border text-[10px]`}>
                                                      {ROLE_LABELS[member.role] || member.role}
                                                    </Badge>
                                                  </TableCell>
                                                  <TableCell className="text-xs">
                                                    {member.zones.length > 0 ? (
                                                      <div className="flex flex-wrap gap-1">
                                                        {member.zones.map(z => (
                                                          <span key={z.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-50 border text-[10px]">
                                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: z.color }} />
                                                            {z.name}
                                                          </span>
                                                        ))}
                                                      </div>
                                                    ) : <span className="text-muted-foreground">-</span>}
                                                  </TableCell>
                                                  <TableCell className="text-center">
                                                    <Button variant="outline" size="sm" className="h-7 text-[10px] text-red-500 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 gap-1" onClick={() => handleRemoveMember(member.id, member.user.name)} title="Eliminar miembro del proyecto">
                                                      <Trash2 className="h-3 w-3" />
                                                      Eliminar
                                                    </Button>
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* ═══ USERS TAB ═══ */}
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* New user button */}
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Gestiona los usuarios del sistema y sus accesos
                </p>
                <Button
                  onClick={() => setShowNewUser(true)}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                  size="sm"
                >
                  <UserPlus className="h-4 w-4 mr-1" /> Nuevo Usuario
                </Button>
              </div>

              {/* New user form */}
              {showNewUser && (
                <Card className="border-purple-200 bg-purple-50/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-purple-500" />
                      Crear Nuevo Usuario
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nombre completo *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input placeholder="Juan Pérez" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="pl-9 h-9" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Email *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input placeholder="email@ejemplo.com" type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="pl-9 h-9" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Contraseña *</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input placeholder="Mínimo 6 caracteres" type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} className="pl-9 h-9" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Rol</Label>
                        <Select value={newUserRole} onValueChange={setNewUserRole}>
                          <SelectTrigger className="h-9">
                            <Shield className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="gerente">Gerente</SelectItem>
                            <SelectItem value="responsable">Responsable</SelectItem>
                            <SelectItem value="empleado">Empleado</SelectItem>
                            <SelectItem value="auditor">Auditor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => setShowNewUser(false)}>Cancelar</Button>
                      <Button size="sm" onClick={handleCreateUser} disabled={!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim() || newUserPassword.length < 6} className="bg-purple-600 text-white">
                        Crear Usuario
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Users table */}
              {isLoadingUsers ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 text-purple-500 animate-spin" /></div>
              ) : users.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay usuarios en el sistema</p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Nombre</TableHead>
                        <TableHead className="text-xs">Email</TableHead>
                        <TableHead className="text-xs">Rol</TableHead>
                        <TableHead className="text-xs">Estado</TableHead>
                        <TableHead className="text-xs">Proyectos</TableHead>
                        <TableHead className="text-xs">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map(user => (
                        <TableRow key={user.id} className={!user.active ? 'opacity-50' : ''}>
                          <TableCell className="text-xs font-medium">
                            {editingUser === user.id ? (
                              <Input value={editUserData.name} onChange={e => setEditUserData(d => ({ ...d, name: e.target.value }))} className="h-7 text-xs" />
                            ) : (
                              user.name
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {editingUser === user.id ? (
                              <Input value={editUserData.email} onChange={e => setEditUserData(d => ({ ...d, email: e.target.value }))} className="h-7 text-xs" />
                            ) : (
                              user.email
                            )}
                          </TableCell>
                          <TableCell>
                            {editingUser === user.id ? (
                              <Select value={editUserData.role} onValueChange={v => setEditUserData(d => ({ ...d, role: v }))}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Administrador</SelectItem>
                                  <SelectItem value="gerente">Gerente</SelectItem>
                                  <SelectItem value="responsable">Responsable</SelectItem>
                                  <SelectItem value="empleado">Empleado</SelectItem>
                                  <SelectItem value="auditor">Auditor</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge className={`${ROLE_COLORS[user.role] || ''} border text-[10px]`}>
                                {ROLE_LABELS[user.role] || user.role}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingUser === user.id ? (
                              <Select value={editUserData.active ? 'true' : 'false'} onValueChange={v => setEditUserData(d => ({ ...d, active: v === 'true' }))}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true">Activo</SelectItem>
                                  <SelectItem value="false">Inactivo</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge className={user.active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'} variant="outline">
                                {user.active ? 'Activo' : 'Inactivo'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {user.projects.length === 0 ? (
                              <span className="text-muted-foreground">Ninguno</span>
                            ) : (
                              <div className="space-y-0.5">
                                {user.projects.map((p, i) => (
                                  <div key={i} className="flex items-center gap-1 flex-wrap">
                                    <span>{p.projectName}</span>
                                    <Badge className={`${ROLE_COLORS[p.role] || ''} border text-[9px] px-1 py-0`}>
                                      {ROLE_LABELS[p.role]}
                                    </Badge>
                                    {p.zones.length > 0 && (
                                      <span className="text-[9px] text-muted-foreground">
                                        ({p.zones.map(z => z.name).join(', ')})
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {editingUser === user.id ? (
                                <>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-500" onClick={() => handleUpdateUser(user.id)}><Check className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingUser(null)}><X className="h-3.5 w-3.5" /></Button>
                                </>
                              ) : (
                                <>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-500" onClick={() => { setEditingUser(user.id); setEditUserData({ name: user.name, email: user.email, role: user.role, active: user.active }) }} title="Editar">
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-amber-500" onClick={() => { setResetPasswordUserId(user.id); setNewPassword('') }} title="Cambiar contraseña">
                                    <Key className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleToggleActive(user.id, user.active)} title={user.active ? 'Desactivar' : 'Activar'}>
                                    {user.active ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-green-500" />}
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => handleDeleteUser(user.id)} title="Eliminar">
                                    <Trash2 className="h-3.5 w-3.5" />
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
              )}
            </motion.div>
          )}

          {/* ═══ COMPANIES TAB ═══ */}
          {activeTab === 'companies' && (
            <motion.div key="companies" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Gestiona las empresas y asigna gerentes
                </p>
                <Button
                  onClick={() => setShowNewCompany(true)}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" /> Nueva Empresa
                </Button>
              </div>

              {/* New company form */}
              {showNewCompany && (
                <Card className="border-purple-200 bg-purple-50/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Plus className="h-4 w-4 text-purple-500" />
                      Crear Nueva Empresa
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nombre de la Empresa *</Label>
                        <Input placeholder="Nombre" value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Descripción</Label>
                        <Input placeholder="Descripción (opcional)" value={newCompanyDesc} onChange={e => setNewCompanyDesc(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => setShowNewCompany(false)}>Cancelar</Button>
                      <Button size="sm" onClick={handleCreateCompany} disabled={!newCompanyName.trim()} className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        Crear Empresa
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Companies list */}
              {isLoadingCompanies ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 text-purple-500 animate-spin" /></div>
              ) : companies.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay empresas creadas</p>
                  <p className="text-xs mt-1">Crea una empresa para organizar los proyectos por organización</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {companies.map(company => (
                    <Card key={company.id} className={`transition-all ${expandedCompanyId === company.id ? 'border-purple-300 shadow-md' : 'hover:border-gray-300'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => setExpandedCompanyId(expandedCompanyId === company.id ? null : company.id)}>
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-teal-600" />
                            </div>
                            <div className="flex-1">
                              {editingCompany === company.id ? (
                                <div className="space-y-2" onClick={e => e.stopPropagation()}>
                                  <div className="grid grid-cols-2 gap-2">
                                    <Input value={editCompanyData.name} onChange={e => setEditCompanyData(d => ({ ...d, name: e.target.value }))} className="text-sm" />
                                    <Input value={editCompanyData.description} onChange={e => setEditCompanyData(d => ({ ...d, description: e.target.value }))} className="text-sm" placeholder="Descripción" />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleUpdateCompany(company.id)} className="bg-purple-600 text-white h-7"><Check className="h-3 w-3 mr-1" />Guardar</Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditingCompany(null)} className="h-7">Cancelar</Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <h3 className="font-semibold text-sm">{company.name}</h3>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{company.projectCount} proyectos</span>
                                    <span>·</span>
                                    <span>{company.memberCount} gerentes</span>
                                    {!company.active && <Badge className="bg-red-100 text-red-700 border border-red-200 ml-1">Inactiva</Badge>}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          {editingCompany !== company.id && (
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700" onClick={() => { setEditingCompany(company.id); setEditCompanyData({ name: company.name, description: company.description || '' }) }} title="Editar empresa"><Edit3 className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600" onClick={() => handleDeleteCompany(company.id)} title="Eliminar empresa"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          )}
                        </div>

                        {/* Expanded company detail: gerentes */}
                        <AnimatePresence>
                          {expandedCompanyId === company.id && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                              <div className="mt-4 pt-4 border-t space-y-4">
                                {isLoadingCompanyDetail ? (
                                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 text-purple-500 animate-spin" /></div>
                                ) : (
                                  <>
                                    <div>
                                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                                        <Shield className="h-3 w-3" /> Gerentes asignados
                                      </h4>
                                      {companyMembers.length > 0 ? (
                                        <div className="space-y-1.5 mb-3">
                                          {companyMembers.map((m) => (
                                            <div key={m.id} className="flex items-center justify-between p-2 rounded-lg border bg-white text-xs">
                                              <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs">{m.user.name.charAt(0)}</div>
                                                <div>
                                                  <p className="font-medium">{m.user.name}</p>
                                                  <p className="text-muted-foreground">{m.user.email}</p>
                                                </div>
                                                <Badge className={`${ROLE_COLORS[m.role] || ROLE_COLORS.gerente} border text-[9px] py-0`}>
                                                  {ROLE_LABELS[m.role] || m.role}
                                                </Badge>
                                              </div>
                                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => handleRemoveCompanyMember(m.userId, m.user.name)}>
                                                <X className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-muted-foreground mb-3">No hay gerentes asignados a esta empresa</p>
                                      )}

                                      {/* Add gerente */}
                                      <div className="flex items-center gap-2">
                                        <Select value={addGerenteUserId || undefined} onValueChange={setAddGerenteUserId}>
                                          <SelectTrigger className="h-8 text-xs flex-1">
                                            <SelectValue placeholder="Seleccionar usuario para asignar..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {users
                                              .filter(u => u.active && !companyMembers.some(m => m.userId === u.id))
                                              .map(u => (
                                                <SelectItem key={u.id} value={u.id}>
                                                  <div className="flex items-center gap-2">
                                                    <span>{u.name}</span>
                                                    <span className="text-muted-foreground">({u.email})</span>
                                                    <Badge className={`${ROLE_COLORS[u.role] || ''} border text-[9px] py-0`}>
                                                      {ROLE_LABELS[u.role] || u.role}
                                                    </Badge>
                                                  </div>
                                                </SelectItem>
                                              ))}
                                          </SelectContent>
                                        </Select>
                                        <Button size="sm" onClick={handleAddGerente} disabled={!addGerenteUserId} className="h-8 text-xs bg-purple-600 text-white">
                                          <UserPlus className="h-3 w-3 mr-1" /> Asignar
                                        </Button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ 5S Y PASOS TAB ═══ */}
          {/* 5S y Pasos tab removed - scores now shown on the board above steps 4/5 dots */}
          {false && (
            <motion.div key="5s-steps" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Gestiona las puntuaciones de Autoevaluación (Paso 4) y Auditoría (Paso 5) de cada S
                  </p>
                </div>
              </div>

              {/* Project & Zone selectors */}
              <div className="flex gap-3 items-end">
                <div className="space-y-1 flex-1">
                  <Label className="text-xs">Proyecto</Label>
                  <Select
                    value={selected5SProjectId || ''}
                    onValueChange={val => {
                      setSelected5SProjectId(val || null)
                      setSelected5SZoneId(null)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proyecto" />
                    </SelectTrigger>
                    <SelectContent>
                      {allProjects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 flex-1">
                  <Label className="text-xs">Zona (opcional)</Label>
                  <Select
                    value={selected5SZoneId || '__all__'}
                    onValueChange={val => setSelected5SZoneId(val === '__all__' ? null : val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las zonas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas las zonas</SelectItem>
                      {allProjects.find(p => p.id === selected5SProjectId)?.zones.map(z => (
                        <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!selected5SProjectId ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Selecciona un proyecto para ver las puntuaciones</p>
                </div>
              ) : isLoading5S ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 text-purple-500 animate-spin" /></div>
              ) : (
                <div className="space-y-4">
                  {/* S Steps table */}
                  {['S1 Seiri', 'S2 Seiton', 'S3 Seiso', 'S4 Seiketsu', 'S5 Shitsuke'].map((sLabel, sIdx) => {
                    const sStep = sIdx + 1
                    const sColors = ['#8B5CF6', '#EAB308', '#3B82F6', '#F43F5E', '#F97316']
                    const color = sColors[sIdx]

                    // Filter progress for this S and selected zone
                    const sProgress = progress5S.filter(p =>
                      p.sStep === sStep &&
                      (!selected5SZoneId || p.zoneId === selected5SZoneId)
                    )

                    const step4Records = sProgress.filter(p => p.miniStep === 4)
                    const step5Records = sProgress.filter(p => p.miniStep === 5)

                    return (
                      <Card key={sStep} className="overflow-hidden">
                        <div
                          className="flex items-center gap-3 px-4 py-3"
                          style={{ backgroundColor: `${color}10`, borderLeft: `4px solid ${color}` }}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: color }}
                          >
                            S{sStep}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm" style={{ color }}>{sLabel}</h3>
                            <p className="text-xs text-muted-foreground">
                              {step4Records.length} autoevaluación(es) · {step5Records.length} auditoría(s)
                            </p>
                          </div>
                        </div>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Zona</TableHead>
                                <TableHead className="text-xs">Paso</TableHead>
                                <TableHead className="text-xs">Estado</TableHead>
                                <TableHead className="text-xs">Puntuación</TableHead>
                                <TableHead className="text-xs">Notas</TableHead>
                                <TableHead className="text-xs w-20">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {/* Step 4 rows */}
                              {step4Records.length === 0 && step5Records.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-4">
                                    Sin registros para esta S
                                  </TableCell>
                                </TableRow>
                              )}
                              {step4Records.map(record => (
                                <TableRow key={record.id}>
                                  <TableCell className="text-xs">{record.zoneName || 'Sin zona'}</TableCell>
                                  <TableCell className="text-xs">
                                    <div className="flex items-center gap-1">
                                      <CheckSquare className="h-3 w-3" style={{ color }} />
                                      <span>4 - Autoevaluación</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={record.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                      {record.completed ? 'Completado' : 'Pendiente'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {editingScore === record.id ? (
                                      <div className="flex items-center gap-1">
                                        <Input
                                          type="number"
                                          min={0}
                                          max={100}
                                          value={editScoreValue}
                                          onChange={e => setEditScoreValue(e.target.value)}
                                          className="w-16 h-7 text-xs"
                                        />
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 p-0 text-green-600"
                                          onClick={async () => {
                                            const newScore = parseInt(editScoreValue)
                                            if (isNaN(newScore) || newScore < 0 || newScore > 100) return
                                            try {
                                              const res = await fetch(`/api/progress/step?sStep=${sStep}&miniStep=4`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                  score: newScore,
                                                  completed: newScore >= 70,
                                                  notes: editNotesValue,
                                                  projectId: selected5SProjectId,
                                                  zoneId: record.zoneId,
                                                }),
                                              })
                                              if (res.ok) {
                                                setEditingScore(null)
                                                await load5SProgress()
                                              }
                                            } catch (error) {
                                              console.error('Error updating score:', error)
                                            }
                                          }}
                                        >
                                          <Save className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 p-0 text-red-400"
                                          onClick={() => setEditingScore(null)}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <span className="font-bold text-sm">
                                        {record.score !== null ? `${record.score}%` : '—'}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {editingScore === record.id ? (
                                      <Input
                                        value={editNotesValue}
                                        onChange={e => setEditNotesValue(e.target.value)}
                                        placeholder="Notas..."
                                        className="h-7 text-xs w-32"
                                      />
                                    ) : (
                                      <span title={record.notes || ''}>
                                        {record.notes ? (record.notes.length > 30 ? record.notes.slice(0, 30) + '…' : record.notes) : '—'}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => {
                                        setEditingScore(record.id)
                                        setEditScoreValue(record.score !== null ? String(record.score) : '')
                                        setEditNotesValue(record.notes || '')
                                      }}
                                    >
                                      <Edit3 className="h-3 w-3 text-blue-500" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {/* Step 5 rows */}
                              {step5Records.map(record => (
                                <TableRow key={record.id}>
                                  <TableCell className="text-xs">{record.zoneName || 'Sin zona'}</TableCell>
                                  <TableCell className="text-xs">
                                    <div className="flex items-center gap-1">
                                      <ShieldCheck className="h-3 w-3" style={{ color }} />
                                      <span>5 - Auditoría</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={record.completed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                      {record.completed ? 'Apto' : 'No Apto'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {editingScore === record.id ? (
                                      <div className="flex items-center gap-1">
                                        <Input
                                          type="number"
                                          min={0}
                                          max={100}
                                          value={editScoreValue}
                                          onChange={e => setEditScoreValue(e.target.value)}
                                          className="w-16 h-7 text-xs"
                                        />
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 p-0 text-green-600"
                                          onClick={async () => {
                                            const newScore = parseInt(editScoreValue)
                                            if (isNaN(newScore) || newScore < 0 || newScore > 100) return
                                            try {
                                              const res = await fetch(`/api/progress/step?sStep=${sStep}&miniStep=5`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                  score: newScore,
                                                  completed: newScore >= 75,
                                                  notes: editNotesValue,
                                                  projectId: selected5SProjectId,
                                                  zoneId: record.zoneId,
                                                }),
                                              })
                                              if (res.ok) {
                                                setEditingScore(null)
                                                await load5SProgress()
                                              }
                                            } catch (error) {
                                              console.error('Error updating score:', error)
                                            }
                                          }}
                                        >
                                          <Save className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 p-0 text-red-400"
                                          onClick={() => setEditingScore(null)}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <span className="font-bold text-sm">
                                        {record.score !== null ? `${record.score}%` : '—'}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {editingScore === record.id ? (
                                      <Input
                                        value={editNotesValue}
                                        onChange={e => setEditNotesValue(e.target.value)}
                                        placeholder="Notas..."
                                        className="h-7 text-xs w-32"
                                      />
                                    ) : (
                                      <span title={record.notes || ''}>
                                        {record.notes ? (record.notes.length > 30 ? record.notes.slice(0, 30) + '…' : record.notes) : '—'}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => {
                                        setEditingScore(record.id)
                                        setEditScoreValue(record.score !== null ? String(record.score) : '')
                                        setEditNotesValue(record.notes || '')
                                      }}
                                    >
                                      <Edit3 className="h-3 w-3 text-blue-500" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}
          {/* ═══ PLANTILLAS TAB ═══ */}
          {activeTab === 'plantillas' && (
            <motion.div key="plantillas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <TemplateManager />
            </motion.div>
          )}

          {/* ═══ CONFIGURACIÓN DE TABLEROS TAB ═══ */}
          {activeTab === 'tablero5s' && (
            <motion.div key="tablero5s" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Tablero5S />
            </motion.div>
          )}

          {/* ═══ MEJORA CONTINUA TAB ═══ */}
          {activeTab === 'mejora' && (
            <motion.div key="mejora" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <MejoraContinuaAdmin />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordUserId !== null} onOpenChange={(open) => { if (!open) { setResetPasswordUserId(null); setNewPassword('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-500" />
              Cambiar Contraseña
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
                <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setResetPasswordUserId(null); setNewPassword('') }}>Cancelar</Button>
              <Button size="sm" onClick={() => resetPasswordUserId && handleResetPassword(resetPasswordUserId)} disabled={!newPassword || newPassword.length < 6} className="bg-purple-600 text-white">
                Guardar Contraseña
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t bg-white mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">
            Panel de Administración — Metodología 5S
          </p>
        </div>
      </footer>
    </div>
  )
}
