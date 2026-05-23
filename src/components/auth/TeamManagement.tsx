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
  Loader2,
  Plus,
  Trash2,
  X,
  Building2,
  MapPin,
  Users,
  UserPlus,
  Shield,
  Crown,
  UserCheck,
  HardHat,
  ClipboardCheck,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

const PRESET_COLORS = [
  '#8B5CF6', '#EAB308', '#3B82F6', '#F43F5E',
  '#F97316', '#22C55E', '#06B6D4', '#EC4899',
]

interface ZoneData {
  id: string
  name: string
  description: string | null
  color: string
  memberCount?: number
}

interface MemberData {
  id: string
  role: string
  user: {
    id: string
    email: string
    name: string
    role: string
    avatar: string | null
    active: boolean
  }
  zones: Array<{
    id: string
    name: string
    color: string
  }>
}

interface TeamManagementProps {
  open: boolean
  onClose: () => void
}

export default function TeamManagement({ open, onClose }: TeamManagementProps) {
  const { currentProject } = use5SStore()
  const [activeTab, setActiveTab] = useState<'info' | 'zones' | 'members' | 'permissions'>('info')

  // Zones state
  const [zones, setZones] = useState<ZoneData[]>([])
  const [newZoneName, setNewZoneName] = useState('')
  const [newZoneDesc, setNewZoneDesc] = useState('')
  const [newZoneColor, setNewZoneColor] = useState(PRESET_COLORS[0])
  const [isLoadingZones, setIsLoadingZones] = useState(false)

  // Members state
  const [members, setMembers] = useState<MemberData[]>([])
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('empleado')
  const [newMemberZones, setNewMemberZones] = useState<string[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)

  const fetchZones = useCallback(async () => {
    if (!currentProject) return
    setIsLoadingZones(true)
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/zones`)
      const data = await res.json()
      setZones(data.zones || [])
    } catch (error) {
      console.error('Fetch zones error:', error)
    } finally {
      setIsLoadingZones(false)
    }
  }, [currentProject])

  const fetchMembers = useCallback(async () => {
    if (!currentProject) return
    setIsLoadingMembers(true)
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/members`)
      const data = await res.json()
      setMembers(data.members || [])
    } catch (error) {
      console.error('Fetch members error:', error)
    } finally {
      setIsLoadingMembers(false)
    }
  }, [currentProject])

  useEffect(() => {
    if (open && currentProject) {
      fetchZones()
      fetchMembers()
    }
  }, [open, currentProject, fetchZones, fetchMembers])

  const handleAddZone = async () => {
    if (!currentProject || !newZoneName.trim()) return
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newZoneName,
          description: newZoneDesc || undefined,
          color: newZoneColor,
        }),
      })
      if (res.ok) {
        setNewZoneName('')
        setNewZoneDesc('')
        setNewZoneColor(PRESET_COLORS[zones.length % PRESET_COLORS.length])
        await fetchZones()
      }
    } catch (error) {
      console.error('Add zone error:', error)
    }
  }

  const handleDeleteZone = async (zoneId: string) => {
    if (!currentProject) return
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/zones`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneId }),
      })
      if (res.ok) {
        await fetchZones()
        await fetchMembers()
      }
    } catch (error) {
      console.error('Delete zone error:', error)
    }
  }

  const handleAddMember = async () => {
    if (!currentProject || !newMemberName.trim() || !newMemberEmail.trim()) return
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newMemberEmail,
          name: newMemberName,
          role: newMemberRole,
          zoneIds: newMemberZones.length > 0 ? newMemberZones : undefined,
        }),
      })
      if (res.ok) {
        setNewMemberName('')
        setNewMemberEmail('')
        setNewMemberRole('empleado')
        setNewMemberZones([])
        await fetchMembers()
        await fetchZones()
      }
    } catch (error) {
      console.error('Add member error:', error)
    }
  }

  const getRoleLabel = (role: string) => {
    const map: Record<string, string> = {
      admin: 'Administrador',
      gerente: 'Gerente',
      responsable: 'Responsable',
      empleado: 'Empleado',
      auditor: 'Auditor',
    }
    return map[role] || role
  }

  const getRoleBadgeColor = (role: string) => {
    const map: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700 border-purple-200',
      gerente: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      responsable: 'bg-blue-100 text-blue-700 border-blue-200',
      empleado: 'bg-green-100 text-green-700 border-green-200',
      auditor: 'bg-orange-100 text-orange-700 border-orange-200',
    }
    return map[role] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const tabs = [
    { key: 'info' as const, label: 'Información', icon: Building2 },
    { key: 'zones' as const, label: 'Zonas', icon: MapPin },
    { key: 'members' as const, label: 'Miembros', icon: Users },
    { key: 'permissions' as const, label: 'Permisos', icon: Shield },
  ]

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
              5S
            </div>
            Gestión del Proyecto
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            {/* Info Tab */}
            {activeTab === 'info' && currentProject && (
              <motion.div
                key="info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Proyecto</span>
                      <span className="font-semibold">{currentProject.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Empresa</span>
                      <span className="font-semibold">{currentProject.company}</span>
                    </div>
                    {currentProject.description && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Descripción</span>
                        <span className="font-semibold text-right max-w-[60%]">
                          {currentProject.description}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fecha de inicio</span>
                      <span className="font-semibold">
                        {new Date(currentProject.startDate).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Zonas</span>
                      <span className="font-semibold">{zones.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Miembros</span>
                      <span className="font-semibold">{members.length}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Zones Tab */}
            {activeTab === 'zones' && (
              <motion.div
                key="zones"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Add zone form */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Plus className="h-4 w-4 text-green-500" />
                      Agregar Zona
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nombre *</Label>
                        <Input
                          placeholder="Nombre de la zona"
                          value={newZoneName}
                          onChange={(e) => setNewZoneName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Descripción</Label>
                        <Input
                          placeholder="Descripción (opcional)"
                          value={newZoneDesc}
                          onChange={(e) => setNewZoneDesc(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Color</Label>
                      <div className="flex gap-2 flex-wrap">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewZoneColor(color)}
                            className={`w-7 h-7 rounded-full border-2 transition-all ${
                              newZoneColor === color
                                ? 'border-gray-800 scale-110 shadow-md'
                                : 'border-transparent hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={handleAddZone}
                      disabled={!newZoneName.trim()}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar Zona
                    </Button>
                  </CardContent>
                </Card>

                {/* Zones list */}
                {isLoadingZones ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 text-green-500 animate-spin" />
                  </div>
                ) : zones.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay zonas en el proyecto
                  </p>
                ) : (
                  <div className="space-y-2">
                    {zones.map((zone) => (
                      <div
                        key={zone.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: zone.color }}
                          />
                          <div>
                            <p className="text-sm font-medium">{zone.name}</p>
                            {zone.description && (
                              <p className="text-xs text-muted-foreground">
                                {zone.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteZone(zone.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <motion.div
                key="members"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Add member form */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-green-500" />
                      Agregar Miembro
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nombre *</Label>
                        <Input
                          placeholder="Nombre completo"
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Email *</Label>
                        <Input
                          type="email"
                          placeholder="email@ejemplo.com"
                          value={newMemberEmail}
                          onChange={(e) => setNewMemberEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Rol</Label>
                        <Select
                          value={newMemberRole}
                          onValueChange={setNewMemberRole}
                        >
                          <SelectTrigger className="w-full">
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
                      <div className="space-y-1">
                        <Label className="text-xs">Zonas</Label>
                        <div className="space-y-0.5 max-h-32 overflow-y-auto border rounded-md p-2">
                          {zones.map((zone) => (
                            <label key={zone.id} className="flex items-center gap-1.5 text-sm cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                              <Checkbox
                                checked={newMemberZones.includes(zone.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setNewMemberZones([...newMemberZones, zone.id])
                                  } else {
                                    setNewMemberZones(newMemberZones.filter(id => id !== zone.id))
                                  }
                                }}
                                className="h-4 w-4"
                              />
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: zone.color }}
                              />
                              <span>{zone.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={handleAddMember}
                      disabled={!newMemberName.trim() || !newMemberEmail.trim()}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                      size="sm"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Agregar Miembro
                    </Button>
                  </CardContent>
                </Card>

                {/* Members table */}
                {isLoadingMembers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 text-green-500 animate-spin" />
                  </div>
                ) : members.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay miembros en el proyecto
                  </p>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead>Zona</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium text-sm">
                              {member.user.name}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {member.user.email}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`${getRoleBadgeColor(member.role)} border`}
                              >
                                {getRoleLabel(member.role)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {member.zones.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {member.zones.map(z => (
                                    <span key={z.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-50 border text-[10px]">
                                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: z.color }} />
                                      {z.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </motion.div>
            )}
            {/* Permissions Tab */}
            {activeTab === 'permissions' && (
              <motion.div
                key="permissions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <p className="text-sm text-muted-foreground">
                  A continuación se muestra el resumen de permisos de cada rol. Para ver la ficha completa, usa el botón <strong>Permisos</strong> en la barra de navegación.
                </p>

                {/* Admin */}
                <Card className="border-purple-200 bg-purple-50/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <Crown className="h-4 w-4 text-purple-600" />
                      </div>
                      <h3 className="font-bold text-purple-700">Administrador</h3>
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200 border text-[10px]">
                        Acceso completo
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Control total: puede gestionar proyecto, equipo, zonas, plantillas, formación, inventario, fotos, autoevaluaciones y auditorías. Puede eliminar el proyecto y reiniciar datos.
                    </p>
                  </CardContent>
                </Card>

                {/* Responsable */}
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <UserCheck className="h-4 w-4 text-blue-600" />
                      </div>
                      <h3 className="font-bold text-blue-700">Responsable</h3>
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 border text-[10px]">
                        Gestión de equipo
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Gestiona equipo y zonas. Completa pasos, gestiona formación, inventario y aprueba auditorías. No puede eliminar el proyecto ni reiniciar datos.
                    </p>
                  </CardContent>
                </Card>

                {/* Empleado */}
                <Card className="border-green-200 bg-green-50/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <HardHat className="h-4 w-4 text-green-600" />
                      </div>
                      <h3 className="font-bold text-green-700">Empleado</h3>
                      <Badge className="bg-green-100 text-green-700 border-green-200 border text-[10px]">
                        Ejecución
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Participa en la implementación: formación, exámenes, subir fotos, editar inventario, autoevaluación. Solo lectura en auditorías. No gestiona equipo ni proyecto.
                    </p>
                  </CardContent>
                </Card>

                {/* Auditor */}
                <Card className="border-orange-200 bg-orange-50/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <ClipboardCheck className="h-4 w-4 text-orange-600" />
                      </div>
                      <h3 className="font-bold text-orange-700">Auditor</h3>
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200 border text-[10px]">
                        Auditoría externa
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Especializado en auditoría externa. Puede ver datos (solo lectura) y realizar/aprobar auditorías. Sin edición de datos, gestión de equipo ni proyecto.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}
