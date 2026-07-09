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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Crown,
  Building2,
  Users,
  Plus,
  Edit3,
  Check,
  X,
  Loader2,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  UserPlus,
  Search,
  Mail,
} from 'lucide-react'

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
    adminUser?: {
      id: string
      name: string
      email: string
      active: boolean
    } | null
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

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  gestor: 'Gestor',
  admin: 'Administrador',
  gerente: 'Gerente',
  responsable: 'Responsable',
  empleado: 'Empleado',
  auditor: 'Auditor',
}

const ROLE_COLORS: Record<string, string> = {
  gestor: 'bg-violet-100 text-violet-700 border-violet-200',
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  gerente: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  responsable: 'bg-blue-100 text-blue-700 border-blue-200',
  empleado: 'bg-green-100 text-green-700 border-green-200',
  auditor: 'bg-orange-100 text-orange-700 border-orange-200',
}

type GestorTab = 'dashboard' | 'empresas' | 'admins'

// ─── Component ───────────────────────────────────────────────────────────────

export default function GestorPanel() {
  const { setCurrentView, fetchProjects, fetchCompanies, projects, setCurrentProject, currentProject } = use5SStore()
  const [activeTab, setActiveTab] = useState<GestorTab>('dashboard')

  // Platform stats
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  // Companies management
  const [showNewCompany, setShowNewCompany] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanyDesc, setNewCompanyDesc] = useState('')
  const [editingCompany, setEditingCompany] = useState<string | null>(null)
  const [editCompanyData, setEditCompanyData] = useState({ name: '', description: '', active: true })

  // Admin management
  const [assigningAdminTo, setAssigningAdminTo] = useState<string | null>(null)
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResults, setSearchResults] = useState<PlatformStats['users']>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newAdminData, setNewAdminData] = useState({ name: '', email: '', password: '' })
  const [isAssigning, setIsAssigning] = useState(false)

  // ─── Data loading ────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setIsLoadingStats(true)
    try {
      const res = await fetch('/api/platform-stats')
      const data = await res.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Error loading platform stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

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

  // ─── Admin assignment actions ───────────────────────────────────────────
  const handleSearchUser = async () => {
    if (!searchEmail.trim() || searchEmail.length < 3) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(searchEmail)}`)
      const data = await res.json()
      if (data.success) {
        setSearchResults(data.users || [])
      }
    } catch (error) {
      console.error('Error searching users:', error)
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    if (searchEmail.length >= 3) {
      const t = setTimeout(() => handleSearchUser(), 300)
      return () => clearTimeout(t)
    } else {
      setSearchResults([])
    }
  }, [searchEmail])

  const handleAssignExistingUser = async (userId: string) => {
    if (!assigningAdminTo) return
    setIsAssigning(true)
    try {
      // First, ensure the user has 'admin' role
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: 'admin' }),
      })

      // Then assign them to the company as admin
      const res = await fetch(`/api/companies/${assigningAdminTo}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: 'admin_empresa' }),
      })

      if (res.ok) {
        setAssigningAdminTo(null)
        setSearchEmail('')
        setSearchResults([])
        await loadStats()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al asignar administrador')
      }
    } catch (error) {
      console.error('Error assigning admin:', error)
    } finally {
      setIsAssigning(false)
    }
  }

  const handleCreateAndAssignAdmin = async () => {
    if (!assigningAdminTo) return
    if (!newAdminData.name.trim() || !newAdminData.email.trim() || newAdminData.password.length < 6) {
      alert('Completa todos los campos. La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setIsAssigning(true)
    try {
      // 1. Create user with role 'admin'
      const createRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAdminData.name,
          email: newAdminData.email,
          password: newAdminData.password,
          role: 'admin',
          active: true,
        }),
      })

      if (!createRes.ok) {
        const data = await createRes.json()
        alert(data.error || 'Error al crear usuario')
        setIsAssigning(false)
        return
      }

      const createData = await createRes.json()
      const newUserId = createData.user?.id

      if (!newUserId) {
        alert('Usuario creado pero no se pudo obtener el ID. Asigna el admin manualmente.')
        setIsAssigning(false)
        return
      }

      // 2. Assign user to company
      const assignRes = await fetch(`/api/companies/${assigningAdminTo}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: newUserId, role: 'admin_empresa' }),
      })

      if (assignRes.ok) {
        setAssigningAdminTo(null)
        setShowCreateUser(false)
        setNewAdminData({ name: '', email: '', password: '' })
        await loadStats()
      } else {
        const data = await assignRes.json()
        alert(data.error || 'Usuario creado pero error al asignar a la empresa')
      }
    } catch (error) {
      console.error('Error creating admin:', error)
    } finally {
      setIsAssigning(false)
    }
  }

  const handleRemoveAdmin = async (companyId: string, userId: string) => {
    if (!confirm('¿Quitar a este administrador de la empresa?')) return
    try {
      const res = await fetch(`/api/companies/${companyId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberUserId: userId }),
      })
      if (res.ok) {
        await loadStats()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al quitar administrador')
      }
    } catch (error) {
