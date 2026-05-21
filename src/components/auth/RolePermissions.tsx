'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  allowedPermissions: string[]
}

const PERMISSIONS: Permission[] = [
  // Tablero y Progreso
  {
    id: 'view_board',
    name: 'Ver tablero 5S',
    description: 'Acceso al tablero principal con las 5S y sus mini-pasos',
    category: 'Tablero y Progreso',
    icon: Eye,
  },
  {
    id: 'view_progress',
    name: 'Ver progreso general',
    description: 'Consultar el dashboard de progreso y estadísticas globales del proyecto',
    category: 'Tablero y Progreso',
    icon: BarChart3,
  },
  {
    id: 'complete_steps',
    name: 'Completar mini-pasos',
    description: 'Marcar mini-pasos como completados tras cumplir los criterios de aprobación',
    category: 'Tablero y Progreso',
    icon: CheckCircle2,
  },

  // Formación
  {
    id: 'view_training',
    name: 'Ver formación',
    description: 'Acceder al contenido formativo de cada S (teoría, explicaciones, documentos)',
    category: 'Formación y Exámenes',
    icon: BookOpen,
  },
  {
    id: 'take_exam',
    name: 'Realizar exámenes',
    description: 'Completar los exámenes de evaluación de conocimiento tras la formación',
    category: 'Formación y Exámenes',
    icon: FileCheck,
  },
  {
    id: 'manage_training',
    name: 'Gestionar formación',
    description: 'Crear, editar y eliminar contenidos formativos y plantillas de exámenes',
    category: 'Formación y Exámenes',
    icon: Pencil,
  },

  // Evidencias Fotográficas
  {
    id: 'view_photos',
    name: 'Ver fotos',
    description: 'Consultar las evidencias fotográficas subidas (antes y después)',
    category: 'Evidencias Fotográficas',
    icon: Camera,
  },
  {
    id: 'upload_photos',
    name: 'Subir fotos',
    description: 'Subir evidencias fotográficas del antes y después de cada S',
    category: 'Evidencias Fotográficas',
    icon: Camera,
  },
  {
    id: 'delete_photos',
    name: 'Eliminar fotos',
    description: 'Eliminar evidencias fotográficas subidas por cualquier miembro del equipo',
    category: 'Evidencias Fotográficas',
    icon: Trash2,
  },

  // Inventario
  {
    id: 'view_inventory',
    name: 'Ver inventario',
    description: 'Consultar el inventario de elementos clasificados (útil, innecesario, dudoso)',
    category: 'Inventario',
    icon: ListChecks,
  },
  {
    id: 'edit_inventory',
    name: 'Editar inventario',
    description: 'Añadir, modificar y clasificar elementos del inventario',
    category: 'Inventario',
    icon: Pencil,
  },
  {
    id: 'delete_inventory',
    name: 'Eliminar items del inventario',
    description: 'Eliminar elementos del inventario de forma definitiva',
    category: 'Inventario',
    icon: Trash2,
  },

  // Autoevaluación
  {
    id: 'view_selfeval',
    name: 'Ver autoevaluaciones',
    description: 'Consultar las autoevaluaciones realizadas y sus puntuaciones',
    category: 'Autoevaluación',
    icon: Eye,
  },
  {
    id: 'do_selfeval',
    name: 'Realizar autoevaluación',
    description: 'Completar las checklist de autoevaluación correspondientes a cada S',
    category: 'Autoevaluación',
    icon: CheckCircle2,
  },

  // Auditoría
  {
    id: 'view_audits',
    name: 'Ver auditorías',
    description: 'Consultar los resultados y puntuaciones de las auditorías externas',
    category: 'Auditoría Externa',
    icon: Eye,
  },
  {
    id: 'conduct_audit',
    name: 'Realizar auditorías',
    description: 'Llevar a cabo auditorías externas y evaluar el cumplimiento de cada S',
    category: 'Auditoría Externa',
    icon: ClipboardCheck,
  },
  {
    id: 'approve_audit',
    name: 'Aprobar/rechazar auditorías',
    description: 'Dar por válida o rechazar una auditoría, y modificar puntuaciones finales',
    category: 'Auditoría Externa',
    icon: FileCheck,
  },

  // Gestión de Proyecto
  {
    id: 'view_project',
    name: 'Ver información del proyecto',
    description: 'Consultar datos del proyecto: nombre, empresa, descripción, fecha de inicio',
    category: 'Gestión de Proyecto',
    icon: Building2,
  },
  {
    id: 'edit_project',
    name: 'Editar proyecto',
    description: 'Modificar los datos generales del proyecto (nombre, empresa, descripción)',
    category: 'Gestión de Proyecto',
    icon: Pencil,
  },
  {
    id: 'manage_zones',
    name: 'Gestionar zonas',
    description: 'Crear, editar y eliminar zonas de trabajo dentro del proyecto',
    category: 'Gestión de Proyecto',
    icon: Settings,
  },

  // Gestión de Equipo
  {
    id: 'view_team',
    name: 'Ver equipo',
    description: 'Consultar la lista de miembros del equipo, sus roles y zonas asignadas',
    category: 'Gestión de Equipo',
    icon: Users,
  },
  {
    id: 'add_members',
    name: 'Añadir miembros',
    description: 'Invitar nuevos miembros al proyecto y asignarles rol y zona',
    category: 'Gestión de Equipo',
    icon: UserPlus,
  },
  {
    id: 'remove_members',
    name: 'Eliminar miembros',
    description: 'Eliminar miembros del equipo del proyecto',
    category: 'Gestión de Equipo',
    icon: UserMinus,
  },
  {
    id: 'change_roles',
    name: 'Cambiar roles',
    description: 'Modificar el rol asignado a los miembros del equipo',
    category: 'Gestión de Equipo',
    icon: KeyRound,
  },

  // Administración
  {
    id: 'delete_project',
    name: 'Eliminar proyecto',
    description: 'Eliminar el proyecto completo incluyendo todos los datos, zonas y miembros asociados',
    category: 'Administración',
    icon: Trash2,
  },
  {
    id: 'reset_data',
    name: 'Reiniciar datos',
    description: 'Reiniciar todo el progreso, plantillas y datos del proyecto a su estado inicial',
    category: 'Administración',
    icon: Lock,
  },
  {
    id: 'manage_templates',
    name: 'Gestionar plantillas',
    description: 'Crear, editar y eliminar plantillas de formación, exámenes, inventario, autoevaluación y auditoría',
    category: 'Administración',
    icon: Pencil,
  },
]

const ROLES: RoleDefinition[] = [
  {
    id: 'admin',
    name: 'Administrador',
    description: 'Control total sobre el proyecto y el equipo. Puede realizar cualquier acción, gestionar miembros, zonas, plantillas y configuración. Es el rol con mayor responsabilidad y acceso completo.',
    color: '#8B5CF6',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    icon: Crown,
    allowedPermissions: [
      'view_board', 'view_progress', 'complete_steps',
      'view_training', 'take_exam', 'manage_training',
      'view_photos', 'upload_photos', 'delete_photos',
      'view_inventory', 'edit_inventory', 'delete_inventory',
      'view_selfeval', 'do_selfeval',
      'view_audits', 'conduct_audit', 'approve_audit',
      'view_project', 'edit_project', 'manage_zones',
      'view_team', 'add_members', 'remove_members', 'change_roles',
      'delete_project', 'reset_data', 'manage_templates',
    ],
  },
  {
    id: 'responsable',
    name: 'Responsable',
    description: 'Gestiona el equipo y las zonas del proyecto. Puede completar mini-pasos, gestionar formación, inventario y aprobar auditorías. No puede eliminar el proyecto ni reiniciar datos globales.',
    color: '#3B82F6',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    icon: UserCheck,
    allowedPermissions: [
      'view_board', 'view_progress', 'complete_steps',
      'view_training', 'take_exam', 'manage_training',
      'view_photos', 'upload_photos', 'delete_photos',
      'view_inventory', 'edit_inventory', 'delete_inventory',
      'view_selfeval', 'do_selfeval',
      'view_audits', 'conduct_audit', 'approve_audit',
      'view_project', 'edit_project', 'manage_zones',
      'view_team', 'add_members', 'remove_members', 'change_roles',
    ],
  },
  {
    id: 'empleado',
    name: 'Empleado',
    description: 'Participa activamente en la implementación 5S. Puede ver la formación, realizar exámenes, subir fotos, editar inventario, completar autoevaluaciones y ver auditorías. No puede gestionar equipo ni configuración del proyecto.',
    color: '#22C55E',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    icon: HardHat,
    allowedPermissions: [
      'view_board', 'view_progress', 'complete_steps',
      'view_training', 'take_exam',
      'view_photos', 'upload_photos',
      'view_inventory', 'edit_inventory',
      'view_selfeval', 'do_selfeval',
      'view_audits',
      'view_project',
      'view_team',
    ],
  },
  {
    id: 'auditor',
    name: 'Auditor',
    description: 'Rol especializado exclusivamente en la auditoría externa. Puede ver el tablero, progreso, formación, fotos, inventario y autoevaluaciones (solo lectura), y realizar y aprobar auditorías. No puede editar datos del proyecto ni gestionar equipo.',
    color: '#F97316',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    icon: ClipboardCheck,
    allowedPermissions: [
      'view_board', 'view_progress',
      'view_training',
      'view_photos',
      'view_inventory',
      'view_selfeval',
      'view_audits', 'conduct_audit', 'approve_audit',
      'view_project',
      'view_team',
    ],
  },
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

export default function RolePermissions({ open, onClose }: RolePermissionsProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'roles' | 'matrix'>('roles')

  const groupedPermissions = CATEGORIES_ORDER.map((category) => ({
    category,
    permissions: PERMISSIONS.filter((p) => p.category === category),
  })).filter((group) => group.permissions.length > 0)

  const getRoleById = (id: string) => ROLES.find((r) => r.id === id)!

  const hasPermission = (roleId: string, permissionId: string) => {
    const role = getRoleById(roleId)
    return role.allowedPermissions.includes(permissionId)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Permisos por Rol
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Consulta qué puede hacer cada miembro del equipo según su rol asignado
          </p>
        </DialogHeader>

        {/* View mode toggle */}
        <div className="flex gap-2 px-6">
          <Button
            variant={viewMode === 'roles' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setViewMode('roles'); setSelectedRole(null) }}
            className={viewMode === 'roles' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' : ''}
          >
            <Users className="h-4 w-4 mr-1" />
            Por Rol
          </Button>
          <Button
            variant={viewMode === 'matrix' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('matrix')}
            className={viewMode === 'matrix' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' : ''}
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Matriz Comparativa
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            {viewMode === 'roles' ? (
              <motion.div
                key="roles-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {!selectedRole ? (
                  /* Role Selection Cards */
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Selecciona un rol para ver sus permisos detallados
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {ROLES.map((role) => {
                        const Icon = role.icon
                        const totalPerms = role.allowedPermissions.length
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
                              <div
                                className="w-12 h-12 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: role.color + '20' }}
                              >
                                <Icon className="h-6 w-6" style={{ color: role.color }} />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-bold text-base" style={{ color: role.color }}>
                                  {role.name}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {role.description}
                                </p>
                                <div className="flex items-center gap-2 mt-3">
                                  <div className="flex-1 h-2 rounded-full bg-white/80 overflow-hidden">
                                    <motion.div
                                      className="h-full rounded-full"
                                      style={{ backgroundColor: role.color }}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percentage}%` }}
                                      transition={{ duration: 0.8, ease: 'easeOut' }}
                                    />
                                  </div>
                                  <span className="text-xs font-semibold" style={{ color: role.color }}>
                                    {totalPerms}/{maxPerms}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>

                    {/* Quick summary */}
                    <Card className="mt-6">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <KeyRound className="h-4 w-4 text-green-500" />
                          Resumen Rápido de Accesos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100">
                            <Crown className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="font-semibold text-purple-700">Administrador</p>
                              <p className="text-xs text-muted-foreground">Acceso completo: gestión de proyecto, equipo, zonas, plantillas y datos. Puede hacer cualquier acción.</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                            <UserCheck className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="font-semibold text-blue-700">Responsable</p>
                              <p className="text-xs text-muted-foreground">Gestión de equipo y zonas. Completa pasos, gestiona formación y aprueba auditorías. No puede eliminar el proyecto.</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                            <HardHat className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="font-semibold text-green-700">Empleado</p>
                              <p className="text-xs text-muted-foreground">Participa en la implementación: formación, exámenes, fotos, inventario y autoevaluación. Solo lectura en auditorías.</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 border border-orange-100">
                            <ClipboardCheck className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="font-semibold text-orange-700">Auditor</p>
                              <p className="text-xs text-muted-foreground">Especializado en auditoría externa. Puede ver datos (solo lectura) y realizar/aprobar auditorías. Sin edición.</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  /* Selected Role Detail */
                  <div className="space-y-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedRole(null)}
                      className="text-muted-foreground"
                    >
                      ← Volver a roles
                    </Button>

                    {(() => {
                      const role = getRoleById(selectedRole)
                      const Icon = role.icon
                      const totalPerms = role.allowedPermissions.length
                      const maxPerms = PERMISSIONS.length
                      const percentage = Math.round((totalPerms / maxPerms) * 100)

                      return (
                        <div className="space-y-4">
                          {/* Role Header */}
                          <div className={`p-5 rounded-xl border-2 ${role.borderColor} ${role.bgColor}`}>
                            <div className="flex items-center gap-4">
                              <div
                                className="w-14 h-14 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: role.color + '20' }}
                              >
                                <Icon className="h-7 w-7" style={{ color: role.color }} />
                              </div>
                              <div className="flex-1">
                                <h2 className="text-xl font-bold" style={{ color: role.color }}>
                                  {role.name}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {role.description}
                                </p>
                                <div className="flex items-center gap-3 mt-2">
                                  <div className="flex-1 max-w-xs h-2.5 rounded-full bg-white/80 overflow-hidden">
                                    <motion.div
                                      className="h-full rounded-full"
                                      style={{ backgroundColor: role.color }}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percentage}%` }}
                                      transition={{ duration: 0.8, ease: 'easeOut' }}
                                    />
                                  </div>
                                  <Badge
                                    className="border"
                                    style={{
                                      backgroundColor: role.color + '15',
                                      color: role.color,
                                      borderColor: role.color + '30',
                                    }}
                                  >
                                    {totalPerms} de {maxPerms} permisos ({percentage}%)
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Permissions by Category */}
                          <Accordion type="multiple" defaultValue={CATEGORIES_ORDER} className="space-y-2">
                            {groupedPermissions.map(({ category, permissions }) => {
                              const allowedInCategory = permissions.filter((p) =>
                                role.allowedPermissions.includes(p.id)
                              ).length
                              const allAllowed = allowedInCategory === permissions.length
                              const noneAllowed = allowedInCategory === 0

                              return (
                                <AccordionItem
                                  key={category}
                                  value={category}
                                  className="border rounded-lg px-4"
                                >
                                  <AccordionTrigger className="hover:no-underline py-3">
                                    <div className="flex items-center gap-3 flex-1">
                                      <span className="font-semibold text-sm">{category}</span>
                                      <Badge
                                        variant="outline"
                                        className={
                                          allAllowed
                                            ? 'bg-green-50 text-green-700 border-green-200'
                                            : noneAllowed
                                            ? 'bg-red-50 text-red-600 border-red-200'
                                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                        }
                                      >
                                        {allowedInCategory}/{permissions.length}
                                      </Badge>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="pb-4">
                                    <div className="space-y-2">
                                      {permissions.map((perm) => {
                                        const allowed = role.allowedPermissions.includes(perm.id)
                                        const PermIcon = perm.icon
                                        return (
                                          <motion.div
                                            key={perm.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className={`flex items-start gap-3 p-3 rounded-lg ${
                                              allowed
                                                ? 'bg-green-50/60 border border-green-100'
                                                : 'bg-red-50/40 border border-red-100'
                                            }`}
                                          >
                                            <div className="mt-0.5">
                                              {allowed ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                              ) : (
                                                <XCircle className="h-5 w-5 text-red-400" />
                                              )}
                                            </div>
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2">
                                                <PermIcon className={`h-4 w-4 ${allowed ? 'text-green-600' : 'text-red-400'}`} />
                                                <span className={`text-sm font-medium ${allowed ? 'text-green-700' : 'text-red-500'}`}>
                                                  {perm.name}
                                                </span>
                                              </div>
                                              <p className="text-xs text-muted-foreground mt-0.5">
                                                {perm.description}
                                              </p>
                                            </div>
                                            <div className="shrink-0">
                                              {allowed ? (
                                                <Badge className="bg-green-100 text-green-700 border-green-200 border text-[10px]">
                                                  <Unlock className="h-3 w-3 mr-0.5" />
                                                  Permitido
                                                </Badge>
                                              ) : (
                                                <Badge className="bg-red-100 text-red-600 border-red-200 border text-[10px]">
                                                  <Lock className="h-3 w-3 mr-0.5" />
                                                  Bloqueado
                                                </Badge>
                                              )}
                                            </div>
                                          </motion.div>
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
                  </div>
                )}
              </motion.div>
            ) : (
              /* Matrix View */
              <motion.div
                key="matrix-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left p-2 border-b font-semibold sticky left-0 bg-white min-w-[200px]">
                          Permiso
                        </th>
                        {ROLES.map((role) => {
                          const Icon = role.icon
                          return (
                            <th key={role.id} className="p-2 border-b text-center min-w-[110px]">
                              <div className="flex flex-col items-center gap-1">
                                <Icon className="h-4 w-4" style={{ color: role.color }} />
                                <span
                                  className="text-xs font-semibold"
                                  style={{ color: role.color }}
                                >
                                  {role.name}
                                </span>
                              </div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {groupedPermissions.map(({ category, permissions }) => (
                        <>
                          <tr key={`cat-${category}`}>
                            <td
                              colSpan={ROLES.length + 1}
                              className="p-2 bg-gray-50 font-semibold text-xs text-muted-foreground uppercase tracking-wide"
                            >
                              {category}
                            </td>
                          </tr>
                          {permissions.map((perm) => {
                            const PermIcon = perm.icon
                            return (
                              <tr key={perm.id} className="hover:bg-gray-50/50">
                                <td className="p-2 border-b flex items-center gap-2 sticky left-0 bg-white">
                                  <PermIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-xs">{perm.name}</span>
                                </td>
                                {ROLES.map((role) => {
                                  const allowed = hasPermission(role.id, perm.id)
                                  return (
                                    <td key={role.id} className="p-2 border-b text-center">
                                      {allowed ? (
                                        <CheckCircle2
                                          className="h-5 w-5 text-green-500 mx-auto"
                                        />
                                      ) : (
                                        <XCircle
                                          className="h-5 w-5 text-red-300 mx-auto"
                                        />
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
                        <td className="p-2 font-semibold text-xs sticky left-0 bg-gray-50">
                          Total permisos
                        </td>
                        {ROLES.map((role) => (
                          <td key={role.id} className="p-2 text-center">
                            <Badge
                              className="border"
                              style={{
                                backgroundColor: role.color + '15',
                                color: role.color,
                                borderColor: role.color + '30',
                              }}
                            >
                              {role.allowedPermissions.length}/{PERMISSIONS.length}
                            </Badge>
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}
