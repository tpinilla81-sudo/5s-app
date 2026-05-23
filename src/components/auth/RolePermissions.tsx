'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { use5SStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Switch,
} from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Shield,
  Users,
  Settings,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  ChevronDown,
  Crown,
  UserCheck,
  HardHat,
  ClipboardCheck,
  BookOpen,
  Camera,
  ListChecks,
  FileCheck,
  Building2,
  BarChart3,
  UserPlus,
  UserMinus,
  KeyRound,
  RotateCcw,
  Save,
  Loader2,
  AlertTriangle,
} from 'lucide-react'

interface RolePermissionsProps {
  open: boolean
  onClose: () => void
}

interface Permission {
  id: string
  name: string
  description: string
  category: string
  icon: React.ComponentType<{ className?: string }>
  locked?: boolean // Some permissions can't be disabled for certain roles
}

interface RoleDefinition {
  id: string
  name: string
  description: string
  color: string
  bgColor: string
  borderColor: string
  textColor: string
  icon: React.ComponentType<{ className?: string }>
}

// Permissions that are always locked ON for specific roles (cannot be toggled off)
const LOCKED_PERMISSIONS: Record<string, string[]> = {
  admin: ['view_board', 'view_project', 'view_team'], // Admin always has these
}

const PERMISSIONS: Permission[] = [
  { id: 'view_board', name: 'Ver tablero 5S', description: 'Acceso al tablero principal con las 5S y sus mini-pasos', category: 'Tablero y Progreso', icon: Eye, locked: true },
  { id: 'view_progress', name: 'Ver progreso general', description: 'Consultar el dashboard de progreso y estadísticas globales', category: 'Tablero y Progreso', icon: BarChart3 },
  { id: 'complete_steps', name: 'Completar mini-pasos', description: 'Marcar mini-pasos como completados tras cumplir los criterios', category: 'Tablero y Progreso', icon: CheckCircle2 },

  { id: 'view_training', name: 'Ver formación', description: 'Acceder al contenido formativo de cada S', category: 'Formación y Exámenes', icon: BookOpen },
  { id: 'take_exam', name: 'Realizar exámenes', description: 'Completar los exámenes de evaluación de conocimiento', category: 'Formación y Exámenes', icon: FileCheck },
  { id: 'manage_training', name: 'Gestionar formación', description: 'Crear, editar y eliminar contenidos formativos y plantillas', category: 'Formación y Exámenes', icon: Pencil },

  { id: 'view_photos', name: 'Ver fotos', description: 'Consultar las evidencias fotográficas subidas', category: 'Evidencias Fotográficas', icon: Camera },
  { id: 'upload_photos', name: 'Subir fotos', description: 'Subir evidencias fotográficas del antes y después', category: 'Evidencias Fotográficas', icon: Camera },
  { id: 'delete_photos', name: 'Eliminar fotos', description: 'Eliminar evidencias fotográficas de cualquier miembro', category: 'Evidencias Fotográficas', icon: Trash2 },

  { id: 'view_inventory', name: 'Ver inventario', description: 'Consultar el inventario de elementos clasificados', category: 'Inventario', icon: ListChecks },
  { id: 'edit_inventory', name: 'Editar inventario', description: 'Añadir, modificar y clasificar elementos del inventario', category: 'Inventario', icon: Pencil },
  { id: 'delete_inventory', name: 'Eliminar items', description: 'Eliminar elementos del inventario de forma definitiva', category: 'Inventario', icon: Trash2 },

  { id: 'view_selfeval', name: 'Ver autoevaluaciones', description: 'Consultar las autoevaluaciones y sus puntuaciones', category: 'Autoevaluación', icon: Eye },
  { id: 'do_selfeval', name: 'Realizar autoevaluación', description: 'Completar las checklist de autoevaluación', category: 'Autoevaluación', icon: CheckCircle2 },

  { id: 'view_audits', name: 'Ver auditorías', description: 'Consultar resultados y puntuaciones de auditorías', category: 'Auditoría Externa', icon: Eye },
  { id: 'conduct_audit', name: 'Realizar auditorías', description: 'Llevar a cabo auditorías externas y evaluar cada S', category: 'Auditoría Externa', icon: ClipboardCheck },
  { id: 'approve_audit', name: 'Aprobar/rechazar auditorías', description: 'Dar por válida o rechazar una auditoría', category: 'Auditoría Externa', icon: FileCheck },

  { id: 'view_project', name: 'Ver proyecto', description: 'Consultar datos del proyecto', category: 'Gestión de Proyecto', icon: Building2 },
  { id: 'edit_project', name: 'Editar proyecto', description: 'Modificar datos generales del proyecto', category: 'Gestión de Proyecto', icon: Pencil },
  { id: 'manage_zones', name: 'Gestionar zonas', description: 'Crear, editar y eliminar zonas de trabajo', category: 'Gestión de Proyecto', icon: Settings },

  { id: 'view_team', name: 'Ver equipo', description: 'Consultar la lista de miembros y sus roles', category: 'Gestión de Equipo', icon: Users },
  { id: 'add_members', name: 'Añadir miembros', description: 'Invitar nuevos miembros al proyecto', category: 'Gestión de Equipo', icon: UserPlus },
  { id: 'remove_members', name: 'Eliminar miembros', description: 'Eliminar miembros del equipo del proyecto', category: 'Gestión de Equipo', icon: UserMinus },
  { id: 'change_roles', name: 'Cambiar roles', description: 'Modificar el rol asignado a los miembros', category: 'Gestión de Equipo', icon: KeyRound },

  { id: 'delete_project', name: 'Eliminar proyecto', description: 'Eliminar el proyecto completo con todos sus datos', category: 'Administración', icon: Trash2 },
  { id: 'reset_data', name: 'Reiniciar datos', description: 'Reiniciar progreso, plantillas y datos del proyecto', category: 'Administración', icon: Lock },
  { id: 'manage_templates', name: 'Gestionar plantillas', description: 'Crear, editar y eliminar plantillas de formación, exámenes, etc.', category: 'Administración', icon: Pencil },
]

const ROLES: RoleDefinition[] = [
  { id: 'admin', name: 'Administrador', description: 'Control total sobre el proyecto y el equipo.', color: '#8B5CF6', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-700', icon: Crown },
  { id: 'gerente', name: 'Gerente', description: 'Supervisión global: ve progreso, inventario y auditorías de todo el proyecto.', color: '#6366F1', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', textColor: 'text-indigo-700', icon: Building2 },
  { id: 'responsable', name: 'Responsable', description: 'Gestiona el equipo y las zonas del proyecto.', color: '#3B82F6', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700', icon: UserCheck },
  { id: 'empleado', name: 'Empleado', description: 'Participa activamente en la implementación 5S.', color: '#22C55E', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-700', icon: HardHat },
  { id: 'auditor', name: 'Auditor', description: 'Rol especializado en auditoría externa.', color: '#F97316', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-700', icon: ClipboardCheck },
]

const CATEGORIES_ORDER = [
  'Tablero y Progreso',
  'Formación y Exámenes',
  'Evidencias Fotográficas',
  'Inventario',
  'Autoevaluación',
  'Auditoría Externa',
  'Gestión de Proyecto',
  'Gestión de Equipo',
  'Administración',
]

type PermMap = Record<string, Record<string, boolean>>

export default function RolePermissions({ open, onClose }: RolePermissionsProps) {
  const { currentUser } = use5SStore()
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view')
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<PermMap>({})
  const [editedPermissions, setEditedPermissions] = useState<PermMap>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const isAdmin = currentUser?.role === 'admin'

  const fetchPermissions = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/permissions')
      const data = await res.json()
      if (data.permissions) {
        setPermissions(data.permissions)
        setEditedPermissions(data.permissions)
      }
    } catch (error) {
      console.error('Fetch permissions error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchPermissions()
      setHasChanges(false)
      setViewMode('view')
    }
  }, [open, fetchPermissions])

  const groupedPermissions = CATEGORIES_ORDER.map((category) => ({
    category,
    permissions: PERMISSIONS.filter((p) => p.category === category),
  })).filter((group) => group.permissions.length > 0)

  const isLocked = (roleId: string, permId: string) => {
    const locked = LOCKED_PERMISSIONS[roleId] || []
    return locked.includes(permId)
  }

  const getPermValue = (roleId: string, permId: string): boolean => {
    const source = viewMode === 'edit' ? editedPermissions : permissions
    return source[roleId]?.[permId] ?? false
  }

  const togglePermission = (roleId: string, permId: string) => {
    if (!isAdmin || viewMode !== 'edit') return
    if (isLocked(roleId, permId)) return

    const newPerms = { ...editedPermissions }
    if (!newPerms[roleId]) newPerms[roleId] = {}
    newPerms[roleId][permId] = !newPerms[roleId][permId]
    setEditedPermissions(newPerms)

    // Check if there are changes vs original
    const changed = JSON.stringify(newPerms) !== JSON.stringify(permissions)
    setHasChanges(changed)
  }

  const toggleAllForRole = (roleId: string, category: string, value: boolean) => {
    if (!isAdmin || viewMode !== 'edit') return

    const newPerms = { ...editedPermissions }
    if (!newPerms[roleId]) newPerms[roleId] = {}

    const categoryPerms = PERMISSIONS.filter((p) => p.category === category)
    for (const perm of categoryPerms) {
      if (!isLocked(roleId, perm.id)) {
        newPerms[roleId][perm.id] = value
      }
    }

    setEditedPermissions(newPerms)
    const changed = JSON.stringify(newPerms) !== JSON.stringify(permissions)
    setHasChanges(changed)
  }

  const toggleAllForRoleAll = (roleId: string, value: boolean) => {
    if (!isAdmin || viewMode !== 'edit') return

    const newPerms = { ...editedPermissions }
    if (!newPerms[roleId]) newPerms[roleId] = {}

    for (const perm of PERMISSIONS) {
      if (!isLocked(roleId, perm.id)) {
        newPerms[roleId][perm.id] = value
      }
    }

    setEditedPermissions(newPerms)
    const changed = JSON.stringify(newPerms) !== JSON.stringify(permissions)
    setHasChanges(changed)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: editedPermissions }),
      })
      const data = await res.json()
      if (data.permissions) {
        setPermissions(data.permissions)
        setEditedPermissions(data.permissions)
        setHasChanges(false)
      }
    } catch (error) {
      console.error('Save permissions error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/permissions', { method: 'POST' })
      const data = await res.json()
      if (data.permissions) {
        setPermissions(data.permissions)
        setEditedPermissions(data.permissions)
        setHasChanges(false)
      }
    } catch (error) {
      console.error('Reset permissions error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const getRoleById = (id: string) => ROLES.find((r) => r.id === id)!

  const countPermsForRole = (roleId: string): number => {
    const source = viewMode === 'edit' ? editedPermissions : permissions
    const rolePerms = source[roleId] || {}
    return Object.values(rolePerms).filter(Boolean).length
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Matriz de Permisos
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? 'Activa o desactiva los permisos para cada rol. Los cambios se guardan en la base de datos.'
              : 'Consulta los permisos asignados a cada rol. Solo un administrador puede modificarlos.'}
          </p>
        </DialogHeader>

        {/* Edit mode toggle + actions */}
        <div className="flex items-center justify-between px-6 flex-wrap gap-2">
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'view' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setViewMode('view'); setSelectedRole(null); setEditedPermissions(permissions) }}
              className={viewMode === 'view' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' : ''}
            >
              <Eye className="h-4 w-4 mr-1" />
              Consultar
            </Button>
            {isAdmin && (
              <Button
                variant={viewMode === 'edit' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setViewMode('edit'); setEditedPermissions(permissions); setSelectedRole(null) }}
                className={viewMode === 'edit' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' : ''}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar Permisos
              </Button>
            )}
          </div>

          {isAdmin && viewMode === 'edit' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isSaving}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Restaurar Defaults
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Guardar Cambios
              </Button>
            </div>
          )}
        </div>

        {hasChanges && viewMode === 'edit' && (
          <div className="mx-6 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-sm text-yellow-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Hay cambios sin guardar. Pulsa &quot;Guardar Cambios&quot; para aplicar.
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
              <p className="text-sm text-muted-foreground">Cargando permisos...</p>
            </div>
          ) : viewMode === 'view' ? (
            /* VIEW MODE - Consulta con vista por rol */
            <AnimatePresence mode="wait">
              {!selectedRole ? (
                <motion.div key="role-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p className="text-sm text-muted-foreground mb-4">Selecciona un rol para ver sus permisos detallados</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {ROLES.map((role) => {
                      const Icon = role.icon
                      const totalPerms = countPermsForRole(role.id)
                      const maxPerms = PERMISSIONS.length
                      const percentage = Math.round((totalPerms / maxPerms) * 100)
                      return (
                        <motion.button
                          key={role.id}
                          onClick={() => setSelectedRole(role.id)}
                          className={`text-left p-5 rounded-xl border-2 ${role.borderColor} ${role.bgColor} hover:shadow-lg transition-all duration-200`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: role.color + '20' }}>
                              <Icon className="h-6 w-6" style={{ color: role.color }} />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-base" style={{ color: role.color }}>{role.name}</h3>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{role.description}</p>
                              <div className="flex items-center gap-2 mt-3">
                                <div className="flex-1 h-2 rounded-full bg-white/80 overflow-hidden">
                                  <motion.div className="h-full rounded-full" style={{ backgroundColor: role.color }} initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
                                </div>
                                <span className="text-xs font-semibold" style={{ color: role.color }}>{totalPerms}/{maxPerms}</span>
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>

                  {/* Quick comparison matrix */}
                  <Card className="mt-6">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-green-500" />
                        Comparación Rápida
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr>
                              <th className="text-left p-2 border-b font-semibold min-w-[180px]">Permiso</th>
                              {ROLES.map((role) => {
                                const Icon = role.icon
                                return (
                                  <th key={role.id} className="p-2 border-b text-center min-w-[100px]">
                                    <div className="flex flex-col items-center gap-1">
                                      <Icon className="h-4 w-4" style={{ color: role.color }} />
                                      <span className="text-[10px] font-semibold" style={{ color: role.color }}>{role.name}</span>
                                    </div>
                                  </th>
                                )
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {groupedPermissions.map(({ category, permissions: perms }) => (
                              <>
                                <tr key={`cat-${category}`}>
                                  <td colSpan={ROLES.length + 1} className="p-1.5 bg-gray-50 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">{category}</td>
                                </tr>
                                {perms.map((perm) => {
                                  const PermIcon = perm.icon
                                  return (
                                    <tr key={perm.id} className="hover:bg-gray-50/50">
                                      <td className="p-1.5 border-b">
                                        <div className="flex items-center gap-1.5">
                                          <PermIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                                          <span className="text-xs">{perm.name}</span>
                                        </div>
                                      </td>
                                      {ROLES.map((role) => {
                                        const allowed = getPermValue(role.id, perm.id)
                                        return (
                                          <td key={role.id} className="p-1.5 border-b text-center">
                                            {allowed ? (
                                              <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                                            ) : (
                                              <XCircle className="h-4 w-4 text-red-300 mx-auto" />
                                            )}
                                          </td>
                                        )
                                      })}
                                    </tr>
                                  )
                                })}
                              </>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-50">
                              <td className="p-2 font-semibold text-xs">Total</td>
                              {ROLES.map((role) => (
                                <td key={role.id} className="p-2 text-center">
                                  <Badge className="border" style={{ backgroundColor: role.color + '15', color: role.color, borderColor: role.color + '30' }}>
                                    {countPermsForRole(role.id)}/{PERMISSIONS.length}
                                  </Badge>
                                </td>
                              ))}
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                /* Selected role detail */
                <motion.div key="role-detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedRole(null)} className="text-muted-foreground mb-4">
                    ← Volver a roles
                  </Button>
                  {(() => {
                    const role = getRoleById(selectedRole)
                    const Icon = role.icon
                    const totalPerms = countPermsForRole(role.id)
                    const percentage = Math.round((totalPerms / PERMISSIONS.length) * 100)
                    return (
                      <div className="space-y-4">
                        <div className={`p-5 rounded-xl border-2 ${role.borderColor} ${role.bgColor}`}>
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: role.color + '20' }}>
                              <Icon className="h-7 w-7" style={{ color: role.color }} />
                            </div>
                            <div className="flex-1">
                              <h2 className="text-xl font-bold" style={{ color: role.color }}>{role.name}</h2>
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex-1 max-w-xs h-2.5 rounded-full bg-white/80 overflow-hidden">
                                  <motion.div className="h-full rounded-full" style={{ backgroundColor: role.color }} initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.8 }} />
                                </div>
                                <Badge className="border" style={{ backgroundColor: role.color + '15', color: role.color, borderColor: role.color + '30' }}>
                                  {totalPerms} de {PERMISSIONS.length} ({percentage}%)
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Accordion type="multiple" defaultValue={CATEGORIES_ORDER} className="space-y-2">
                          {groupedPermissions.map(({ category, permissions: perms }) => {
                            const allowedInCat = perms.filter((p) => getPermValue(role.id, p.id)).length
                            const allAllowed = allowedInCat === perms.length
                            const noneAllowed = allowedInCat === 0
                            return (
                              <AccordionItem key={category} value={category} className="border rounded-lg px-4">
                                <AccordionTrigger className="hover:no-underline py-3">
                                  <div className="flex items-center gap-3 flex-1">
                                    <span className="font-semibold text-sm">{category}</span>
                                    <Badge variant="outline" className={allAllowed ? 'bg-green-50 text-green-700 border-green-200' : noneAllowed ? 'bg-red-50 text-red-600 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}>
                                      {allowedInCat}/{perms.length}
                                    </Badge>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="pb-4">
                                  <div className="space-y-1">
                                    {perms.map((perm) => {
                                      const allowed = getPermValue(role.id, perm.id)
                                      const PermIcon = perm.icon
                                      return (
                                        <div key={perm.id} className={`flex items-start gap-3 p-2.5 rounded-lg ${allowed ? 'bg-green-50/50' : 'bg-red-50/30'}`}>
                                          {allowed ? <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" /> : <XCircle className="h-4 w-4 text-red-400 mt-0.5" />}
                                          <div className="flex-1">
                                            <div className="flex items-center gap-1.5">
                                              <PermIcon className={`h-3.5 w-3.5 ${allowed ? 'text-green-600' : 'text-red-400'}`} />
                                              <span className={`text-sm font-medium ${allowed ? 'text-green-700' : 'text-red-500'}`}>{perm.name}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">{perm.description}</p>
                                          </div>
                                          <Badge className={`${allowed ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-600 border-red-200'} border text-[10px]`}>
                                            {allowed ? <><Unlock className="h-3 w-3 mr-0.5" /> Permitido</> : <><Lock className="h-3 w-3 mr-0.5" /> Bloqueado</>}
                                          </Badge>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            )
                          })}
                        </Accordion>
                      </div>
                    )
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            /* EDIT MODE - Interactive matrix with switches */
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {/* Role quick actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {ROLES.map((role) => {
                  const Icon = role.icon
                  const totalPerms = countPermsForRole(role.id)
                  return (
                    <div key={role.id} className={`p-3 rounded-lg border ${role.borderColor} ${role.bgColor}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-4 w-4" style={{ color: role.color }} />
                        <span className="text-xs font-bold" style={{ color: role.color }}>{role.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{totalPerms}/{PERMISSIONS.length}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] flex-1 border-green-300 text-green-600 hover:bg-green-50"
                          onClick={() => toggleAllForRoleAll(role.id, true)}
                        >
                          Activar todo
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] flex-1 border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => toggleAllForRoleAll(role.id, false)}
                        >
                          Desactivar
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Editable Matrix */}
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-3 border-b font-semibold min-w-[220px] sticky left-0 bg-gray-50 z-10">
                        Permiso
                      </th>
                      {ROLES.map((role) => {
                        const Icon = role.icon
                        return (
                          <th key={role.id} className="p-3 border-b text-center min-w-[130px]">
                            <div className="flex flex-col items-center gap-1">
                              <Icon className="h-5 w-5" style={{ color: role.color }} />
                              <span className="text-xs font-semibold" style={{ color: role.color }}>{role.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 text-[9px] text-muted-foreground hover:text-foreground"
                                onClick={() => toggleAllForRoleAll(role.id, true)}
                              >
                                Todo ON
                              </Button>
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {groupedPermissions.map(({ category, permissions: perms }) => (
                      <>
                        <tr key={`cat-${category}`}>
                          <td
                            colSpan={ROLES.length + 1}
                            className="p-2 bg-green-50/70 font-semibold text-xs text-green-700 uppercase tracking-wide border-b"
                          >
                            <div className="flex items-center justify-between">
                              <span>{category}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 text-[9px] text-green-600 hover:bg-green-100"
                                onClick={() => {
                                  ROLES.forEach((role) => toggleAllForRole(role.id, category, true))
                                }}
                              >
                                Activar todo en fila
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {perms.map((perm) => {
                          const PermIcon = perm.icon
                          return (
                            <tr key={perm.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="p-2.5 border-b sticky left-0 bg-white z-10">
                                <div className="flex items-center gap-2">
                                  <PermIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <div>
                                    <p className="text-xs font-medium">{perm.name}</p>
                                    <p className="text-[10px] text-muted-foreground leading-tight">{perm.description}</p>
                                  </div>
                                </div>
                              </td>
                              {ROLES.map((role) => {
                                const allowed = getPermValue(role.id, perm.id)
                                const locked = isLocked(role.id, perm.id)
                                return (
                                  <td key={role.id} className="p-2.5 border-b text-center">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex justify-center">
                                            <Switch
                                              checked={allowed}
                                              disabled={locked}
                                              onCheckedChange={() => togglePermission(role.id, perm.id)}
                                              className={locked ? 'opacity-60' : ''}
                                            />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs">
                                          {locked
                                            ? 'Este permiso está bloqueado y no se puede desactivar'
                                            : allowed
                                            ? 'Clic para desactivar'
                                            : 'Clic para activar'}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    {locked && (
                                      <Lock className="h-3 w-3 text-amber-500 mx-auto mt-1" />
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td className="p-3 font-semibold text-xs sticky left-0 bg-gray-50">Total activos</td>
                      {ROLES.map((role) => (
                        <td key={role.id} className="p-3 text-center">
                          <Badge className="border" style={{ backgroundColor: role.color + '15', color: role.color, borderColor: role.color + '30' }}>
                            {countPermsForRole(role.id)}/{PERMISSIONS.length}
                          </Badge>
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
