'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Download,
  Edit3,
  Check,
  X,
  Key,
  Eye,
  EyeOff,
  Search,
  Loader2,
  Copy,
  RotateCcw,
  Save,
  ChevronDown,
  ChevronRight,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  StickyNote,
  Shield,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────

interface ResourceUser {
  id: string
  email: string
  name: string
  role: string
  active: boolean
  plainPassword?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  province?: string | null
  postalCode?: string | null
  country?: string | null
  notes?: string | null
  department?: string | null
  position?: string | null
  employeeId?: string | null
  createdAt: string
  companies: Array<{ id: string; name: string; role: string }>
  projects: Array<{
    projectId: string
    projectName: string
    projectCompany: string
    role: string
    zones: Array<{ id: string; name: string; color: string }>
  }>
}

interface ResourceListProps {
  /** If true, show all companies (gestor mode). If false, only current user's company (admin mode) */
  showAllCompanies?: boolean
  /** Dark theme variant */
  dark?: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────

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

const DARK_ROLE_COLORS: Record<string, string> = {
  gestor: 'bg-violet-900/40 text-violet-300 border-violet-700/50',
  admin: 'bg-purple-900/40 text-purple-300 border-purple-700/50',
  gerente: 'bg-indigo-900/40 text-indigo-300 border-indigo-700/50',
  responsable: 'bg-blue-900/40 text-blue-300 border-blue-700/50',
  empleado: 'bg-green-900/40 text-green-300 border-green-700/50',
  auditor: 'bg-orange-900/40 text-orange-300 border-orange-700/50',
}

// ─── Component ────────────────────────────────────────────────────────────

export default function ResourceList({ showAllCompanies = false, dark = false }: ResourceListProps) {
  const [resources, setResources] = useState<ResourceUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<ResourceUser>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [resettingPassword, setResettingPassword] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showPasswordDialog, setShowPasswordDialog] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // ─── Load resources ────────────────────────────────────────────────────
  const loadResources = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      if (data.success) {
        setResources(data.users || [])
      }
    } catch (error) {
      console.error('Error loading resources:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadResources()
  }, [loadResources])

  // ─── Filter resources ──────────────────────────────────────────────────
  const filteredResources = resources.filter(r => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      r.name.toLowerCase().includes(term) ||
      r.email.toLowerCase().includes(term) ||
      (r.phone && r.phone.toLowerCase().includes(term)) ||
      (r.employeeId && r.employeeId.toLowerCase().includes(term)) ||
      (r.department && r.department.toLowerCase().includes(term)) ||
      (r.position && r.position.toLowerCase().includes(term)) ||
      r.companies.some(c => c.name.toLowerCase().includes(term)) ||
      r.projects.some(p => p.projectName.toLowerCase().includes(term))
    )
  })

  // ─── Save edited resource ──────────────────────────────────────────────
  const handleSave = async (userId: string) => {
    setSaving(true)
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, ...editData }),
      })
      const data = await res.json()
      if (data.success) {
        setEditingId(null)
        setEditData({})
        await loadResources()
      } else {
        alert(data.error || 'Error al guardar')
      }
    } catch (error) {
      console.error('Error saving resource:', error)
      alert('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // ─── Reset password ────────────────────────────────────────────────────
  const handleResetPassword = async (userId: string, password: string) => {
    if (!password || password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setResettingPassword(userId)
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, password }),
      })
      const data = await res.json()
      if (data.success) {
        setShowPasswordDialog(null)
        setNewPassword('')
        await loadResources()
      } else {
        alert(data.error || 'Error al restablecer contraseña')
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      alert('Error al restablecer contraseña')
    } finally {
      setResettingPassword(null)
    }
  }

  // ─── Copy to clipboard ─────────────────────────────────────────────────
  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Fallback
    }
  }

  // ─── Export to Excel ───────────────────────────────────────────────────
  const handleExport = () => {
    window.open('/api/resources/export', '_blank')
  }

  // ─── Toggle password visibility ────────────────────────────────────────
  const togglePassword = (id: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ─── Start editing ─────────────────────────────────────────────────────
  const startEditing = (resource: ResourceUser) => {
    setEditingId(resource.id)
    setEditData({
      name: resource.name,
      email: resource.email,
      phone: resource.phone || '',
      address: resource.address || '',
      city: resource.city || '',
      province: resource.province || '',
      postalCode: resource.postalCode || '',
      country: resource.country || '',
      notes: resource.notes || '',
      department: resource.department || '',
      position: resource.position || '',
      employeeId: resource.employeeId || '',
    })
  }

  // ─── Theme helpers ─────────────────────────────────────────────────────
  const tc = dark
    ? {
        bg: 'bg-slate-900/60',
        border: 'border-violet-700/30',
        headerBg: 'bg-slate-800/80',
        headerText: 'text-violet-300',
        rowBg: 'hover:bg-violet-900/10',
        cellText: 'text-slate-200',
        mutedText: 'text-slate-400',
        input: 'bg-slate-800 border-violet-600/50 text-white focus:border-violet-400',
        cardBg: 'bg-slate-800/50 border-violet-700/30',
      }
    : {
        bg: 'bg-white',
        border: 'border-gray-200',
        headerBg: 'bg-gray-50',
        headerText: 'text-gray-700',
        rowBg: 'hover:bg-gray-50',
        cellText: 'text-gray-900',
        mutedText: 'text-gray-500',
        input: 'bg-white border-gray-300 text-gray-900 focus:border-blue-500',
        cardBg: 'bg-white border-gray-200',
      }

  // ─── Generate random password ──────────────────────────────────────────
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let pwd = ''
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return pwd
  }

  // ─── Render ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className={`h-10 w-10 animate-spin ${dark ? 'text-violet-400' : 'text-blue-500'}`} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${tc.mutedText}`} />
          <Input
            placeholder="Buscar por nombre, email, empresa, teléfono..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`pl-10 ${tc.input}`}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className={`gap-1.5 ${dark ? 'border-violet-700/50 text-violet-300 hover:bg-violet-900/30' : ''}`}
          >
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadResources}
            className={`gap-1.5 ${dark ? 'border-violet-700/50 text-violet-300 hover:bg-violet-900/30' : ''}`}
          >
            <RotateCcw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className={`flex gap-4 text-sm ${tc.mutedText}`}>
        <span>{filteredResources.length} recurso{filteredResources.length !== 1 ? 's' : ''}</span>
        {searchTerm && <span>(filtrado de {resources.length} total)</span>}
      </div>

      {/* Table */}
      <div className={`rounded-lg border ${tc.border} overflow-hidden`}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className={tc.headerBg}>
                <TableHead className={`w-8 ${tc.headerText}`}></TableHead>
                <TableHead className={`${tc.headerText}`}>Nombre</TableHead>
                <TableHead className={`${tc.headerText}`}>Email</TableHead>
                <TableHead className={`${tc.headerText}`}>Contraseña</TableHead>
                <TableHead className={`${tc.headerText}`}>Rol</TableHead>
                <TableHead className={`${tc.headerText}`}>Teléfono</TableHead>
                {showAllCompanies && (
                  <TableHead className={`${tc.headerText}`}>Empresa</TableHead>
                )}
                <TableHead className={`${tc.headerText}`}>Proyecto / Zona</TableHead>
                <TableHead className={`${tc.headerText} w-[120px]`}>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showAllCompanies ? 9 : 8} className={`text-center py-10 ${tc.mutedText}`}>
                    No se encontraron recursos
                  </TableCell>
                </TableRow>
              ) : (
                filteredResources.map(resource => (
                  <>
                    {/* Main row */}
                    <TableRow
                      key={resource.id}
                      className={`${tc.rowBg} ${!resource.active ? 'opacity-50' : ''}`}
                    >
                      {/* Expand button */}
                      <TableCell className="p-2">
                        <button
                          onClick={() => setExpandedId(expandedId === resource.id ? null : resource.id)}
                          className={`p-1 rounded ${dark ? 'hover:bg-violet-800/30' : 'hover:bg-gray-100'}`}
                        >
                          {expandedId === resource.id
                            ? <ChevronDown className={`h-4 w-4 ${tc.mutedText}`} />
                            : <ChevronRight className={`h-4 w-4 ${tc.mutedText}`} />
                          }
                        </button>
                      </TableCell>

                      {/* Name */}
                      <TableCell className={`${tc.cellText} font-medium`}>
                        {editingId === resource.id ? (
                          <Input
                            value={editData.name || ''}
                            onChange={e => setEditData({ ...editData, name: e.target.value })}
                            className={`h-8 text-sm ${tc.input}`}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${dark ? 'bg-violet-800/50 text-violet-300' : 'bg-blue-100 text-blue-700'}`}>
                              {resource.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div>{resource.name}</div>
                              {resource.employeeId && (
                                <div className={`text-xs ${tc.mutedText}`}>ID: {resource.employeeId}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </TableCell>

                      {/* Email */}
                      <TableCell className={tc.cellText}>
                        {editingId === resource.id ? (
                          <Input
                            value={editData.email || ''}
                            onChange={e => setEditData({ ...editData, email: e.target.value })}
                            className={`h-8 text-sm ${tc.input}`}
                          />
                        ) : (
                          <span className="text-sm">{resource.email}</span>
                        )}
                      </TableCell>

                      {/* Password */}
                      <TableCell className={tc.cellText}>
                        <div className="flex items-center gap-1">
                          {resource.plainPassword ? (
                            <>
                              <span className="font-mono text-sm">
                                {visiblePasswords.has(resource.id)
                                  ? resource.plainPassword
                                  : '••••••••'}
                              </span>
                              <button
                                onClick={() => togglePassword(resource.id)}
                                className={`p-1 rounded ${dark ? 'hover:bg-violet-800/30' : 'hover:bg-gray-100'}`}
                              >
                                {visiblePasswords.has(resource.id)
                                  ? <EyeOff className="h-3.5 w-3.5" />
                                  : <Eye className="h-3.5 w-3.5" />
                                }
                              </button>
                              <button
                                onClick={() => handleCopy(resource.plainPassword!, resource.id + '_pwd')}
                                className={`p-1 rounded ${dark ? 'hover:bg-violet-800/30' : 'hover:bg-gray-100'}`}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className={`text-xs ${tc.mutedText}`}>No disponible</span>
                          )}
                          <button
                            onClick={() => {
                              setNewPassword(generatePassword())
                              setShowPasswordDialog(resource.id)
                            }}
                            className={`p-1 rounded ${dark ? 'hover:bg-violet-800/30 text-violet-400' : 'hover:bg-gray-100 text-blue-500'}`}
                            title="Restablecer contraseña"
                          >
                            <Key className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        <Badge className={`${dark ? DARK_ROLE_COLORS[resource.role] : ROLE_COLORS[resource.role]} text-xs`}>
                          {ROLE_LABELS[resource.role] || resource.role}
                        </Badge>
                      </TableCell>

                      {/* Phone */}
                      <TableCell className={tc.cellText}>
                        {editingId === resource.id ? (
                          <Input
                            value={editData.phone || ''}
                            onChange={e => setEditData({ ...editData, phone: e.target.value })}
                            className={`h-8 text-sm ${tc.input}`}
                            placeholder="Teléfono"
                          />
                        ) : (
                          <span className="text-sm">{resource.phone || '—'}</span>
                        )}
                      </TableCell>

                      {/* Company (gestor only) */}
                      {showAllCompanies && (
                        <TableCell className={tc.cellText}>
                          <div className="text-sm">
                            {resource.companies.length > 0
                              ? resource.companies.map(c => c.name).join(', ')
                              : '—'}
                          </div>
                        </TableCell>
                      )}

                      {/* Project / Zone */}
                      <TableCell className={tc.cellText}>
                        <div className="text-sm">
                          {resource.projects.length > 0 ? (
                            <div>
                              {resource.projects.map((p, i) => (
                                <div key={i}>
                                  <span className="font-medium">{p.projectName}</span>
                                  {p.zones.length > 0 && (
                                    <div className="flex gap-1 mt-0.5 flex-wrap">
                                      {p.zones.map(z => (
                                        <span
                                          key={z.id}
                                          className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full"
                                          style={{
                                            backgroundColor: z.color + '20',
                                            color: z.color,
                                            border: `1px solid ${z.color}40`,
                                          }}
                                        >
                                          {z.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className={tc.mutedText}>—</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {editingId === resource.id ? (
                            <>
                              <button
                                onClick={() => handleSave(resource.id)}
                                disabled={saving}
                                className={`p-1.5 rounded ${dark ? 'hover:bg-green-900/30 text-green-400' : 'hover:bg-green-100 text-green-600'}`}
                                title="Guardar"
                              >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              </button>
                              <button
                                onClick={() => { setEditingId(null); setEditData({}) }}
                                className={`p-1.5 rounded ${dark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-100 text-red-600'}`}
                                title="Cancelar"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(resource)}
                                className={`p-1.5 rounded ${dark ? 'hover:bg-violet-800/30 text-violet-400' : 'hover:bg-blue-100 text-blue-600'}`}
                                title="Editar"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded detail row */}
                    {expandedId === resource.id && (
                      <TableRow key={`${resource.id}-detail`}>
                        <TableCell colSpan={showAllCompanies ? 9 : 8} className="p-0">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className={`${dark ? 'bg-slate-800/30' : 'bg-gray-50'} p-4`}
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {/* ID & Position */}
                              <div className="space-y-3">
                                <div>
                                  <label className={`text-xs font-medium ${tc.mutedText} flex items-center gap-1`}>
                                    <Shield className="h-3 w-3" /> ID Empleado
                                  </label>
                                  {editingId === resource.id ? (
                                    <Input value={editData.employeeId || ''} onChange={e => setEditData({ ...editData, employeeId: e.target.value })} className={`h-8 text-sm mt-1 ${tc.input}`} />
                                  ) : (
                                    <p className={`text-sm ${tc.cellText}`}>{resource.employeeId || '—'}</p>
                                  )}
                                </div>
                                <div>
                                  <label className={`text-xs font-medium ${tc.mutedText} flex items-center gap-1`}>
                                    <Briefcase className="h-3 w-3" /> Departamento
                                  </label>
                                  {editingId === resource.id ? (
                                    <Input value={editData.department || ''} onChange={e => setEditData({ ...editData, department: e.target.value })} className={`h-8 text-sm mt-1 ${tc.input}`} />
                                  ) : (
                                    <p className={`text-sm ${tc.cellText}`}>{resource.department || '—'}</p>
                                  )}
                                </div>
                                <div>
                                  <label className={`text-xs font-medium ${tc.mutedText} flex items-center gap-1`}>
                                    <User className="h-3 w-3" /> Puesto / Cargo
                                  </label>
                                  {editingId === resource.id ? (
                                    <Input value={editData.position || ''} onChange={e => setEditData({ ...editData, position: e.target.value })} className={`h-8 text-sm mt-1 ${tc.input}`} />
                                  ) : (
                                    <p className={`text-sm ${tc.cellText}`}>{resource.position || '—'}</p>
                                  )}
                                </div>
                              </div>

                              {/* Contact & Address */}
                              <div className="space-y-3">
                                <div>
                                  <label className={`text-xs font-medium ${tc.mutedText} flex items-center gap-1`}>
                                    <Phone className="h-3 w-3" /> Teléfono
                                  </label>
                                  {editingId === resource.id ? (
                                    <Input value={editData.phone || ''} onChange={e => setEditData({ ...editData, phone: e.target.value })} className={`h-8 text-sm mt-1 ${tc.input}`} />
                                  ) : (
                                    <p className={`text-sm ${tc.cellText}`}>{resource.phone || '—'}</p>
                                  )}
                                </div>
                                <div>
                                  <label className={`text-xs font-medium ${tc.mutedText} flex items-center gap-1`}>
                                    <MapPin className="h-3 w-3" /> Dirección
                                  </label>
                                  {editingId === resource.id ? (
                                    <Input value={editData.address || ''} onChange={e => setEditData({ ...editData, address: e.target.value })} className={`h-8 text-sm mt-1 ${tc.input}`} />
                                  ) : (
                                    <p className={`text-sm ${tc.cellText}`}>{resource.address || '—'}</p>
                                  )}
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className={`text-xs font-medium ${tc.mutedText}`}>Ciudad</label>
                                    {editingId === resource.id ? (
                                      <Input value={editData.city || ''} onChange={e => setEditData({ ...editData, city: e.target.value })} className={`h-8 text-sm mt-1 ${tc.input}`} />
                                    ) : (
                                      <p className={`text-sm ${tc.cellText}`}>{resource.city || '—'}</p>
                                    )}
                                  </div>
                                  <div>
                                    <label className={`text-xs font-medium ${tc.mutedText}`}>Provincia</label>
                                    {editingId === resource.id ? (
                                      <Input value={editData.province || ''} onChange={e => setEditData({ ...editData, province: e.target.value })} className={`h-8 text-sm mt-1 ${tc.input}`} />
                                    ) : (
                                      <p className={`text-sm ${tc.cellText}`}>{resource.province || '—'}</p>
                                    )}
                                  </div>
                                  <div>
                                    <label className={`text-xs font-medium ${tc.mutedText}`}>C.P.</label>
                                    {editingId === resource.id ? (
                                      <Input value={editData.postalCode || ''} onChange={e => setEditData({ ...editData, postalCode: e.target.value })} className={`h-8 text-sm mt-1 ${tc.input}`} />
                                    ) : (
                                      <p className={`text-sm ${tc.cellText}`}>{resource.postalCode || '—'}</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Notes & Status */}
                              <div className="space-y-3">
                                <div>
                                  <label className={`text-xs font-medium ${tc.mutedText} flex items-center gap-1`}>
                                    <Building2 className="h-3 w-3" /> País
                                  </label>
                                  {editingId === resource.id ? (
                                    <Input value={editData.country || ''} onChange={e => setEditData({ ...editData, country: e.target.value })} className={`h-8 text-sm mt-1 ${tc.input}`} />
                                  ) : (
                                    <p className={`text-sm ${tc.cellText}`}>{resource.country || '—'}</p>
                                  )}
                                </div>
                                <div>
                                  <label className={`text-xs font-medium ${tc.mutedText} flex items-center gap-1`}>
                                    <StickyNote className="h-3 w-3" /> Notas
                                  </label>
                                  {editingId === resource.id ? (
                                    <Input value={editData.notes || ''} onChange={e => setEditData({ ...editData, notes: e.target.value })} className={`h-8 text-sm mt-1 ${tc.input}`} placeholder="Notas del administrador..." />
                                  ) : (
                                    <p className={`text-sm ${tc.cellText}`}>{resource.notes || '—'}</p>
                                  )}
                                </div>
                                <div>
                                  <label className={`text-xs font-medium ${tc.mutedText}`}>Estado</label>
                                  <Badge className={resource.active
                                    ? (dark ? 'bg-green-900/40 text-green-300 border-green-700/50' : 'bg-green-100 text-green-700')
                                    : (dark ? 'bg-red-900/40 text-red-300 border-red-700/50' : 'bg-red-100 text-red-700')
                                  }>
                                    {resource.active ? 'Activo' : 'Inactivo'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={!!showPasswordDialog} onOpenChange={() => setShowPasswordDialog(null)}>
        <DialogContent className={dark ? 'bg-slate-900 border-violet-700/50 text-white' : ''}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Restablecer Contraseña
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className={`text-sm font-medium ${tc.mutedText}`}>Nueva contraseña</label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className={tc.input}
                  type="text"
                  placeholder="Mínimo 6 caracteres"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewPassword(generatePassword())}
                  className={dark ? 'border-violet-700/50 text-violet-300' : ''}
                >
                  Auto
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPasswordDialog(null)} className={dark ? 'border-violet-700/50 text-violet-300' : ''}>
                Cancelar
              </Button>
              <Button
                onClick={() => handleResetPassword(showPasswordDialog!, newPassword)}
                disabled={resettingPassword === showPasswordDialog || newPassword.length < 6}
                className={dark ? 'bg-violet-600 hover:bg-violet-700 text-white' : ''}
              >
                {resettingPassword === showPasswordDialog ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
