'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { use5SStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  Shield, Users, Settings, Eye, Pencil, Trash2, CheckCircle2, XCircle,
  Lock, Unlock, Crown, UserCheck, HardHat, ClipboardCheck, BookOpen,
  Camera, ListChecks, FileCheck, Building2, BarChart3, UserPlus,
  UserMinus, KeyRound, RotateCcw, Save, Loader2, AlertTriangle,
  ArrowLeft, X, GraduationCap, MapPin, Target, Bell, CreditCard,
} from 'lucide-react'

interface RolePermissionsProps {
  open: boolean
  onClose: () => void
}

// ═══════════════════════════════════════════════════════
// S-STEP DEFINITIONS
// ═══════════════════════════════════════════════════════
const S_STEPS_DEF = [
  { id: 1, name: 'Clasificar', japanese: 'Seiri', color: '#EF4444' },
  { id: 2, name: 'Ordenar', japanese: 'Seiton', color: '#F97316' },
  { id: 3, name: 'Limpiar', japanese: 'Seiso', color: '#EAB308' },
  { id: 4, name: 'Estandarizar', japanese: 'Seiketsu', color: '#22C55E' },
  { id: 5, name: 'Mantener', japanese: 'Shitsuke', color: '#3B82F6' },
]

// Mini-step definitions for each S
const MINI_STEPS_DEF = [
  { id: 1, name: 'Formación', icon: GraduationCap, actions: ['Ver formación', 'Completar formación'] },
  { id: 2, name: 'Evidencias', icon: Camera, actions: ['Ver fotos', 'Subir fotos'] },
  { id: 3, name: 'Inventario', icon: ListChecks, actions: ['Ver inventario', 'Editar inventario'] },
  { id: 4, name: 'Autoevaluación', icon: Target, actions: ['Ver autoevaluación', 'Realizar autoevaluación'] },
  { id: 5, name: 'Auditoría', icon: ClipboardCheck, actions: ['Ver auditoría', 'Realizar auditoría'] },
]

// Build all per-S permissions dynamically
const PERM_ID_MAP: { id: string; name: string; desc: string; miniStep: number; actionIdx: number }[] = []
S_STEPS_DEF.forEach(s => {
  MINI_STEPS_DEF.forEach(ms => {
    ms.actions.forEach((actionName, aIdx) => {
      const id = `s${s.id}_step${ms.id}_a${aIdx}`
      PERM_ID_MAP.push({
        id,
        name: actionName,
        desc: `${actionName} - ${s.japanese} (${ms.name})`,
        miniStep: ms.id,
        actionIdx: aIdx,
      })
    })
  })
})

// ═══════════════════════════════════════════════════════
// TIER 1: PLATFORM PERMISSIONS (gestor level)
// ═══════════════════════════════════════════════════════
const PLATFORM_PERMS = [
  { id: 'platform_create_company', name: 'Crear empresas', desc: 'Crear nuevas empresas en la plataforma', icon: Building2, locked: true },
  { id: 'platform_edit_company', name: 'Editar empresas', desc: 'Modificar datos de empresas', icon: Pencil },
  { id: 'platform_delete_company', name: 'Eliminar empresas', desc: 'Eliminar empresas de la plataforma', icon: Trash2 },
  { id: 'platform_view_companies', name: 'Ver empresas', desc: 'Ver todas las empresas de la plataforma', icon: Eye, locked: true },
  { id: 'platform_activate_company', name: 'Activar/desactivar empresas', desc: 'Cambiar estado activo de empresas', icon: CheckCircle2 },
  { id: 'platform_assign_admin', name: 'Asignar admin', desc: 'Asignar administrador a una empresa', icon: UserPlus, locked: true },
  { id: 'platform_remove_admin', name: 'Quitar admin', desc: 'Quitar administrador de una empresa', icon: UserMinus },
  { id: 'platform_reset_admin_pwd', name: 'Resetear contraseña admin', desc: 'Restablecer contraseña de administradores', icon: KeyRound },
  { id: 'platform_view_all_users', name: 'Ver todos los usuarios', desc: 'Ver todos los usuarios de la plataforma', icon: Users, locked: true },
  { id: 'platform_edit_users', name: 'Editar usuarios', desc: 'Editar datos de usuarios de la plataforma', icon: Pencil },
  { id: 'platform_manage_contracts', name: 'Gestionar contratos', desc: 'Crear y gestionar contratos con empresas', icon: FileCheck, locked: true },
  { id: 'platform_view_contracts', name: 'Ver contratos', desc: 'Consultar contratos de empresas', icon: Eye, locked: true },
  { id: 'platform_manage_subscriptions', name: 'Gestionar suscripciones', desc: 'Administrar suscripciones y planes', icon: CreditCard, locked: true },
  { id: 'platform_set_company_limits', name: 'Definir límites', desc: 'Establecer límites por empresa (usuarios, proyectos, etc.)', icon: Lock },
  { id: 'platform_config', name: 'Configurar plataforma', desc: 'Configurar ajustes globales de la plataforma', icon: Settings, locked: true },
  { id: 'platform_manage_templates', name: 'Gestionar plantillas globales', desc: 'Crear, editar y eliminar plantillas de la plataforma', icon: BookOpen },
  { id: 'platform_view_stats', name: 'Ver estadísticas', desc: 'Ver estadísticas globales de la plataforma', icon: BarChart3, locked: true },
  { id: 'platform_send_notifications', name: 'Enviar notificaciones globales', desc: 'Enviar avisos a todos los usuarios', icon: Bell },
]

// ═══════════════════════════════════════════════════════
// TIER 2: PROJECT PERMISSIONS (admin de empresa level)
// ═══════════════════════════════════════════════════════
const PROJECT_PERMS = [
  { id: 'view_board', name: 'Ver tablero 5S', desc: 'Acceso al tablero principal', icon: Eye, locked: true },
  { id: 'view_progress', name: 'Ver progreso general', desc: 'Consultar dashboard de progreso', icon: BarChart3 },
  { id: 'view_project', name: 'Ver proyecto', desc: 'Consultar datos del proyecto', icon: Building2, locked: true },
  { id: 'edit_project', name: 'Editar proyecto', desc: 'Modificar datos generales del proyecto', icon: Pencil },
  { id: 'manage_zones', name: 'Gestionar zonas', desc: 'Crear, editar y eliminar zonas de trabajo', icon: MapPin },
  { id: 'view_team', name: 'Ver equipo', desc: 'Consultar la lista de miembros y sus roles', icon: Users, locked: true },
  { id: 'add_members', name: 'Añadir miembros', desc: 'Invitar nuevos miembros al proyecto', icon: UserPlus },
  { id: 'remove_members', name: 'Eliminar miembros', desc: 'Eliminar miembros del equipo', icon: UserMinus },
  { id: 'change_roles', name: 'Cambiar roles', desc: 'Modificar el rol asignado a los miembros', icon: KeyRound },
  { id: 'manage_training', name: 'Gestionar formación', desc: 'Crear, editar y eliminar contenidos formativos', icon: BookOpen },
  { id: 'delete_photos', name: 'Eliminar fotos', desc: 'Eliminar evidencias fotográficas de cualquier miembro', icon: Trash2 },
  { id: 'delete_inventory', name: 'Eliminar inventario', desc: 'Eliminar elementos del inventario', icon: Trash2 },
  { id: 'approve_audit', name: 'Aprobar auditorías', desc: 'Dar por válida o rechazar una auditoría', icon: FileCheck },
  { id: 'delete_project', name: 'Eliminar proyecto', desc: 'Eliminar el proyecto completo', icon: Trash2 },
  { id: 'reset_data', name: 'Reiniciar datos', desc: 'Reiniciar progreso y datos del proyecto', icon: Lock },
  { id: 'manage_templates', name: 'Gestionar plantillas', desc: 'Crear, editar y eliminar plantillas', icon: Pencil },
  { id: 'notify_audit', name: 'Solicitar auditoría', desc: 'Puede activar el aviso de auditoría en el paso 5', icon: Bell },
  { id: 'accept_audit_meeting', name: 'Aceptar reunión auditoría', desc: 'Puede aceptar la reunión de auditoría para apagar el aviso', icon: CheckCircle2 },
  { id: 'skip_steps', name: 'Saltar pasos', desc: 'Puede navegar libremente sin seguir el orden progresivo', icon: Unlock },
]

// All permission IDs
const ALL_PERM_IDS = [...PLATFORM_PERMS.map(p => p.id), ...PERM_ID_MAP.map(p => p.id), ...PROJECT_PERMS.map(p => p.id)]

// Locked permissions per role (always ON, cannot be toggled off)
// For admin: ALL permissions are locked when the current user is NOT gestor
// (only gestor can change admin permissions)
const LOCKED_PERMISSIONS: Record<string, string[]> = {
  gestor: PLATFORM_PERMS.map(p => p.id), // Gestor platform permissions are always locked ON
  admin: ['view_board', 'view_project', 'view_team'], // Core view perms always locked ON
}

// Default permissions per role
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  gestor: PLATFORM_PERMS.map(p => p.id), // Gestor: only platform permissions (manages platform, not projects)
  // ADMIN DE EMPRESA: manages company/projects/users, does NOT execute 5S steps
  // Can VIEW everything (a0) but cannot EXECUTE any 5S step (a1)
  // Only gestor can change admin permissions
  admin: [
    ...PROJECT_PERMS.map(p => p.id), // All project general permissions
    ...PERM_ID_MAP.filter(p => p.actionIdx === 0).map(p => p.id), // All "view" actions (a0) only
  ],
  gerente: [
    'view_board', 'view_progress', 'view_project', 'view_team',
    'accept_audit_meeting',
    // S-steps: can view all, but cannot execute most actions
    ...PERM_ID_MAP.filter(p => p.actionIdx === 0).map(p => p.id), // All "view" actions
    's2_step3_a1', 's3_step3_a1', // edit inventory for S2, S3
  ],
  responsable: [
    'view_board', 'view_progress', 'view_project', 'view_team',
    'edit_project', 'manage_zones', 'add_members', 'remove_members', 'change_roles',
    'manage_training', 'delete_photos', 'delete_inventory', 'approve_audit',
    'accept_audit_meeting',
    // S-steps: can view and execute most
    ...PERM_ID_MAP.filter(p => p.miniStep !== 5 || p.actionIdx === 0).map(p => p.id), // All except conduct audit
  ],
  empleado: [
    'view_board', 'view_progress', 'view_project', 'view_team',
    'notify_audit',
    // S-steps: can view all, can execute steps 1-4 but NOT step 5
    ...PERM_ID_MAP.filter(p => p.miniStep < 5).map(p => p.id),
    // Can view audits but not conduct
    ...PERM_ID_MAP.filter(p => p.miniStep === 5 && p.actionIdx === 0).map(p => p.id),
  ],
  auditor: [
    'view_board', 'view_progress', 'view_project', 'view_team',
    'accept_audit_meeting',
    // S-steps: can view all, can conduct audits but not do steps 1-4
    ...PERM_ID_MAP.filter(p => p.actionIdx === 0).map(p => p.id), // All "view" actions
    ...PERM_ID_MAP.filter(p => p.miniStep === 5 && p.actionIdx === 1).map(p => p.id), // Conduct audits
    'approve_audit',
  ],
}

// Role definitions
const ROLES = [
  { id: 'gestor', name: 'Gestor (Dueño)', desc: 'Dueño de la app', color: '#DC2626', icon: Crown },
  { id: 'admin', name: 'Admin de Empresa', desc: 'Administrador de empresa', color: '#8B5CF6', icon: Shield },
  { id: 'gerente', name: 'Gerente', desc: 'Supervisión global', color: '#6366F1', icon: Building2 },
  { id: 'responsable', name: 'Responsable', desc: 'Gestión de equipo y zonas', color: '#3B82F6', icon: UserCheck },
  { id: 'empleado', name: 'Empleado', desc: 'Ejecuta pasos 5S', color: '#22C55E', icon: HardHat },
  { id: 'auditor', name: 'Auditor', desc: 'Auditoría externa', color: '#F97316', icon: ClipboardCheck },
]

type PermMap = Record<string, Record<string, boolean>>

// ═══════════════════════════════════════════════════════
// NORMALIZE HELPER
// ═══════════════════════════════════════════════════════
const normalize = (obj: PermMap): string => {
  const sorted: PermMap = {}
  Object.keys(obj).sort().forEach(role => {
    sorted[role] = {}
    Object.keys(obj[role]).sort().forEach(perm => {
      sorted[role][perm] = obj[role][perm]
    })
  })
  return JSON.stringify(sorted)
}

export default function RolePermissions({ open, onClose }: RolePermissionsProps) {
  const { currentUser } = use5SStore()
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view')
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [expandedS, setExpandedS] = useState<number | null>(null)
  const [permissions, setPermissions] = useState<PermMap>({})
  const [editedPermissions, setEditedPermissions] = useState<PermMap>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const isGestor = currentUser?.role === 'gestor'
  const isAdmin = currentUser?.role === 'admin'
  const [permissionTab, setPermissionTab] = useState<'plataforma' | 'proyecto'>('proyecto')

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
      setSelectedRole(null)
      setExpandedS(null)
      setPermissionTab(isGestor ? 'plataforma' : 'proyecto')
    }
  }, [open, fetchPermissions, isGestor])

  const isLocked = (roleId: string, permId: string) => {
    const locked = LOCKED_PERMISSIONS[roleId] || []
    // Admin cannot modify their own role's permissions at all
    if (isAdmin && roleId === 'admin') return true
    return locked.includes(permId)
  }

  const getPermValue = (roleId: string, permId: string): boolean => {
    const source = viewMode === 'edit' ? editedPermissions : permissions
    return source[roleId]?.[permId] ?? false
  }

  const canEdit = isGestor || isAdmin

  const togglePermission = (roleId: string, permId: string) => {
    if (!canEdit || viewMode !== 'edit') return
    if (isLocked(roleId, permId)) return
    const newPerms = JSON.parse(JSON.stringify(editedPermissions))
    if (!newPerms[roleId]) newPerms[roleId] = {}
    newPerms[roleId][permId] = !newPerms[roleId][permId]
    setEditedPermissions(newPerms)
    setHasChanges(normalize(newPerms) !== normalize(permissions))
  }

  const toggleAllInGroup = (roleId: string, permIds: string[], value: boolean) => {
    if (!canEdit || viewMode !== 'edit') return
    const newPerms = JSON.parse(JSON.stringify(editedPermissions))
    if (!newPerms[roleId]) newPerms[roleId] = {}
    for (const pid of permIds) {
      if (!isLocked(roleId, pid)) newPerms[roleId][pid] = value
    }
    setEditedPermissions(newPerms)
    setHasChanges(normalize(newPerms) !== normalize(permissions))
  }

  const toggleAllForRole = (roleId: string, value: boolean) => {
    if (!canEdit || viewMode !== 'edit') return
    const newPerms = JSON.parse(JSON.stringify(editedPermissions))
    if (!newPerms[roleId]) newPerms[roleId] = {}
    for (const pid of ALL_PERM_IDS) {
      if (!isLocked(roleId, pid)) newPerms[roleId][pid] = value
    }
    setEditedPermissions(newPerms)
    setHasChanges(normalize(newPerms) !== normalize(permissions))
  }

  const toggleAllForStep = (sId: number, value: boolean) => {
    if (!canEdit || viewMode !== 'edit') return
    const stepPermIds = PERM_ID_MAP.filter(p => p.id.startsWith(`s${sId}_`)).map(p => p.id)
    const newPerms = JSON.parse(JSON.stringify(editedPermissions))
    for (const roleId of ROLES.map(r => r.id)) {
      if (!newPerms[roleId]) newPerms[roleId] = {}
      for (const pid of stepPermIds) {
        if (!isLocked(roleId, pid)) newPerms[roleId][pid] = value
      }
    }
    setEditedPermissions(newPerms)
    setHasChanges(normalize(newPerms) !== normalize(permissions))
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
      } else if (data.error) {
        alert('Error al guardar: ' + data.error)
      }
    } catch (error) {
      console.error('Save permissions error:', error)
      alert('Error de conexión al guardar permisos.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('¿Restaurar todos los permisos a los valores por defecto?')) return
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

  const countPermsForRole = (roleId: string): number => {
    const source = viewMode === 'edit' ? editedPermissions : permissions
    const rolePerms = source[roleId] || {}
    return Object.values(rolePerms).filter(Boolean).length
  }

  const countPermsForRoleInS = (roleId: string, sId: number): number => {
    const source = viewMode === 'edit' ? editedPermissions : permissions
    const rolePerms = source[roleId] || {}
    return PERM_ID_MAP.filter(p => p.id.startsWith(`s${sId}_`) && rolePerms[p.id]).length
  }

  if (!open) return null

  // ═══════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════

  // When in 'proyecto' tab, hide gestor from role lists
  const visibleRoles = permissionTab === 'proyecto' ? ROLES.filter(r => r.id !== 'gestor') : ROLES

  const renderSStepCard = (sDef: typeof S_STEPS_DEF[0]) => {
    const sPerms = PERM_ID_MAP.filter(p => p.id.startsWith(`s${sDef.id}_`))
    const isExpanded = expandedS === sDef.id

    return (
      <div key={sDef.id} className="rounded-2xl border-2 overflow-hidden shadow-sm"
        style={{ borderColor: sDef.color + '40' }}>
        {/* S-Step Header */}
        <div
          className="flex items-center justify-between px-5 py-4 cursor-pointer hover:opacity-90 transition-opacity"
          style={{ backgroundColor: sDef.color + '10' }}
          onClick={() => setExpandedS(isExpanded ? null : sDef.id)}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md"
              style={{ backgroundColor: sDef.color }}>
              S{sDef.id}
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: sDef.color }}>{sDef.japanese}</h3>
              <p className="text-sm text-muted-foreground">{sDef.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Quick role summary */}
            {visibleRoles.map(role => {
              const count = countPermsForRoleInS(role.id, sDef.id)
              const total = sPerms.length
              return (
                <div key={role.id} className="text-center" title={`${role.name}: ${count}/${total}`}>
                  <div className="text-[10px] font-semibold" style={{ color: role.color }}>{role.name.slice(0, 3).toUpperCase()}</div>
                  <div className="text-xs font-bold" style={{ color: role.color }}>{count}/{total}</div>
                </div>
              )
            })}
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: sDef.color }}>
                <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-5 space-y-5">
                {/* Edit mode: bulk actions per S */}
                {viewMode === 'edit' && canEdit && (
                  <div className="flex gap-2 mb-2">
                    <Button variant="outline" size="sm"
                      className="text-xs border-green-300 text-green-600 hover:bg-green-50"
                      onClick={() => toggleAllForStep(sDef.id, true)}>
                      Activar todo S{sDef.id} para todos
                    </Button>
                    <Button variant="outline" size="sm"
                      className="text-xs border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => toggleAllForStep(sDef.id, false)}>
                      Desactivar todo S{sDef.id}
                    </Button>
                  </div>
                )}

                {/* Mini-steps grid */}
                {MINI_STEPS_DEF.map(msDef => {
                  const msPerms = sPerms.filter(p => p.miniStep === msDef.id)
                  if (msPerms.length === 0) return null
                  const MsIcon = msDef.icon
                  return (
                    <div key={msDef.id} className="rounded-xl border bg-white/50 overflow-hidden">
                      {/* Mini-step header */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ backgroundColor: sDef.color + '08' }}>
                        <MsIcon className="h-5 w-5" style={{ color: sDef.color }} />
                        <span className="text-sm font-bold" style={{ color: sDef.color }}>
                          Paso {msDef.id}: {msDef.name}
                        </span>
                      </div>

                      {/* Permission matrix for this mini-step */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr>
                              <th className="text-left p-3 text-xs font-semibold text-muted-foreground min-w-[200px]">Acción</th>
                              {visibleRoles.map(role => {
                                const RoleIcon = role.icon
                                return (
                                  <th key={role.id} className="p-3 text-center min-w-[110px]">
                                    <div className="flex flex-col items-center gap-1">
                                      <RoleIcon className="h-4 w-4" style={{ color: role.color }} />
                                      <span className="text-[10px] font-bold" style={{ color: role.color }}>{role.name}</span>
                                    </div>
                                  </th>
                                )
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {msPerms.map(perm => (
                              <tr key={perm.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="p-3 border-t text-sm font-medium">{perm.name}</td>
                                {visibleRoles.map(role => {
                                  const allowed = getPermValue(role.id, perm.id)
                                  const locked = isLocked(role.id, perm.id)
                                  return (
                                    <td key={role.id} className="p-3 border-t text-center">
                                      {viewMode === 'edit' && canEdit ? (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className="flex justify-center">
                                                <Switch
                                                  checked={allowed}
                                                  disabled={locked}
                                                  onCheckedChange={() => togglePermission(role.id, perm.id)}
                                                  className={locked ? 'opacity-50' : ''}
                                                />
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="text-xs">
                                              {locked ? 'Bloqueado' : allowed ? 'Clic para desactivar' : 'Clic para activar'}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      ) : allowed ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                                      ) : (
                                        <XCircle className="h-5 w-5 text-red-300 mx-auto" />
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const renderGeneralPerms = () => {
    return (
      <div className="rounded-2xl border-2 border-gray-200 overflow-hidden shadow-sm">
        <div className="flex items-center gap-4 px-5 py-4 bg-gray-50 border-b">
          <div className="w-12 h-12 rounded-xl bg-gray-600 flex items-center justify-center shadow-md">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-700">Gestión General</h3>
            <p className="text-sm text-muted-foreground">Permisos de administración, proyecto y equipo</p>
          </div>
        </div>
        <div className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground min-w-[220px]">Permiso</th>
                  {visibleRoles.map(role => {
                    const RoleIcon = role.icon
                    return (
                      <th key={role.id} className="p-3 text-center min-w-[120px]">
                        <div className="flex flex-col items-center gap-1">
                          <RoleIcon className="h-5 w-5" style={{ color: role.color }} />
                          <span className="text-xs font-bold" style={{ color: role.color }}>{role.name}</span>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
              {PROJECT_PERMS.map(perm => {
                  const PermIcon = perm.icon
                  return (
                    <tr key={perm.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3 border-t">
                        <div className="flex items-center gap-3">
                          <PermIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{perm.name}</p>
                            <p className="text-xs text-muted-foreground">{perm.desc}</p>
                          </div>
                        </div>
                      </td>
                      {visibleRoles.map(role => {
                        const allowed = getPermValue(role.id, perm.id)
                        const locked = isLocked(role.id, perm.id)
                        return (
                          <td key={role.id} className="p-3 border-t text-center">
                            {viewMode === 'edit' && canEdit ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex justify-center">
                                      <Switch
                                        checked={allowed}
                                        disabled={locked}
                                        onCheckedChange={() => togglePermission(role.id, perm.id)}
                                        className={locked ? 'opacity-50' : ''}
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">
                                    {locked ? 'Bloqueado' : allowed ? 'Clic para desactivar' : 'Clic para activar'}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : allowed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-300 mx-auto" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-50 via-white to-green-50/30 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onClose} className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" /> Volver
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Matriz de Permisos por 5S</h1>
                <p className="text-sm text-muted-foreground">
                  {canEdit ? 'Permisos individuales por cada S y paso. Activa o desactiva según rol.' : 'Consulta los permisos asignados a cada rol.'}
                  {isAdmin && ' · Tus permisos solo los puede cambiar el Gestor.'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <Button variant={viewMode === 'view' ? 'default' : 'outline'} size="sm"
                onClick={() => { setViewMode('view'); setEditedPermissions(permissions) }}
                className={viewMode === 'view' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' : ''}>
                <Eye className="h-4 w-4 mr-1.5" /> Consultar
              </Button>
              {canEdit && (
                <Button variant={viewMode === 'edit' ? 'default' : 'outline'} size="sm"
                  onClick={() => { setViewMode('edit'); setEditedPermissions(permissions) }}
                  className={viewMode === 'edit' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' : ''}>
                  <Pencil className="h-4 w-4 mr-1.5" /> Editar
                </Button>
              )}
            </div>
            {canEdit && viewMode === 'edit' && (
              <div className="flex gap-2 border-l pl-3">
                {isGestor && (
                  <Button variant="outline" size="sm" onClick={handleReset} disabled={isSaving}
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50">
                    <RotateCcw className="h-4 w-4 mr-1.5" /> Defaults
                  </Button>
                )}
                <Button size="sm" onClick={handleSave} disabled={!hasChanges || isSaving}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                  {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                  Guardar
                </Button>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 p-0 text-muted-foreground">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {hasChanges && viewMode === 'edit' && (
          <div className="px-6 pb-3">
            <div className="px-4 py-2.5 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-sm text-yellow-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Hay cambios sin guardar. Pulsa &quot;Guardar&quot; para aplicar.
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="h-10 w-10 text-green-500 animate-spin" />
            <p className="text-base text-muted-foreground">Cargando permisos...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── Permission Tier Tabs ── */}
            <div className="flex border-b">
              {isGestor && (
                <button
                  className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                    permissionTab === 'plataforma'
                      ? 'border-red-500 text-red-700 bg-red-50/50'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                  }`}
                  onClick={() => setPermissionTab('plataforma')}
                >
                  <Crown className="h-3.5 w-3.5" />
                  Plataforma (Gestor)
                </button>
              )}
              <button
                className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  permissionTab === 'proyecto'
                    ? 'border-purple-500 text-purple-700 bg-purple-50/50'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                }`}
                onClick={() => setPermissionTab('proyecto')}
              >
                <Shield className="h-3.5 w-3.5" />
                Proyecto (Admin de Empresa)
              </button>
            </div>

            {/* ── TIER 1: Platform Permissions ── */}
            {permissionTab === 'plataforma' && isGestor && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 flex items-start gap-2">
                  <Crown className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Permisos de Plataforma — Gestor (Dueño)</p>
                    <p className="text-xs mt-1 text-red-600">El Gestor controla la plataforma: crea empresas, asigna admins, gestiona contratos y suscripciones. Estos permisos no se pueden modificar.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {PLATFORM_PERMS.map(perm => {
                    const PermIcon = perm.icon
                    return (
                      <div key={perm.id} className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm">
                        <div className="flex items-center gap-2.5">
                          <PermIcon className="h-4 w-4 text-red-500 shrink-0" />
                          <div>
                            <p className="text-xs font-medium">{perm.name}</p>
                            <p className="text-[10px] text-muted-foreground">{perm.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Lock className="h-3 w-3 text-red-400" />
                          <span className="text-[10px] text-red-500 font-semibold">Siempre ON</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── TIER 2: Project Permissions ── */}
            {permissionTab === 'proyecto' && (
              <>
                {/* Info banner */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-800 flex items-start gap-2">
                  <Shield className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Permisos de Proyecto — Admin de Empresa</p>
                    <p className="text-xs mt-1 text-purple-600">Cada empresa configura los permisos de sus propios proyectos. El Admin de Empresa decide qué puede hacer cada rol dentro de su proyecto. Los permisos del Admin solo los puede cambiar el Gestor.</p>
                  </div>
                </div>

                {/* Role summary bar — only project roles */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {ROLES.filter(r => r.id !== 'gestor').map(role => {
                    const RoleIcon = role.icon
                    const total = countPermsForRole(role.id)
                    const projectPermCount = [...PERM_ID_MAP.map(p => p.id), ...PROJECT_PERMS.map(p => p.id)].length
                    const pct = Math.round((total / projectPermCount) * 100)
                    return (
                      <div key={role.id} className="rounded-xl border-2 p-4 transition-all"
                        style={{ borderColor: role.color + '40', backgroundColor: role.color + '08' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <RoleIcon className="h-5 w-5" style={{ color: role.color }} />
                          <span className="font-bold text-sm" style={{ color: role.color }}>{role.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 h-2.5 rounded-full bg-white/80 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: role.color }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: role.color }}>{pct}%</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">{total} permisos</div>
                        {viewMode === 'edit' && canEdit && (
                          <div className="flex gap-1.5 mt-2">
                            <Button variant="outline" size="sm" className="h-6 text-[10px] flex-1 border-green-300 text-green-600 hover:bg-green-50"
                              onClick={() => toggleAllForRole(role.id, true)}>Todo ON</Button>
                            <Button variant="outline" size="sm" className="h-6 text-[10px] flex-1 border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => toggleAllForRole(role.id, false)}>Todo OFF</Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* S-Step cards */}
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-500" />
                    Permisos por 5S
                    <span className="text-sm font-normal text-muted-foreground">(pulsa en cada S para desplegar)</span>
                  </h2>
                  {S_STEPS_DEF.map(sDef => renderSStepCard(sDef))}
                </div>

                {/* General (project) permissions */}
                <div className="mt-8">
                  {renderGeneralPerms()}
                </div>

                {/* Totals footer — project roles only */}
                <div className="rounded-xl bg-gray-50 border p-5">
                  <h3 className="text-sm font-bold text-gray-600 mb-3">Resumen de Permisos de Proyecto</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {ROLES.filter(r => r.id !== 'gestor').map(role => {
                      const total = countPermsForRole(role.id)
                      const projectPermCount = [...PERM_ID_MAP.map(p => p.id), ...PROJECT_PERMS.map(p => p.id)].length
                      const pct = Math.round((total / projectPermCount) * 100)
                      return (
                        <div key={role.id} className="text-center">
                          <div className="text-2xl font-black" style={{ color: role.color }}>{pct}%</div>
                          <div className="text-xs text-muted-foreground">{total}/{projectPermCount}</div>
                          <div className="text-xs font-bold mt-1" style={{ color: role.color }}>{role.name}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
