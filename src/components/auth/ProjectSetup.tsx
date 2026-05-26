'use client'

import { useState } from 'react'
import { use5SStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  Loader2,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Check,
  Building2,
  MapPin,
  Users,
  ClipboardCheck,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

const PRESET_COLORS = [
  '#8B5CF6', '#EAB308', '#3B82F6', '#F43F5E',
  '#F97316', '#22C55E', '#06B6D4', '#EC4899',
]

interface ZoneInput {
  name: string
  description: string
  color: string
}

interface MemberInput {
  name: string
  email: string
  role: string
  zoneIds: string[]
}

export default function ProjectSetup() {
  const { createProject, currentUser } = use5SStore()
  const [step, setStep] = useState(1)
  const [isCreating, setIsCreating] = useState(false)

  // Step 1: Project Info
  const [projectName, setProjectName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [description, setDescription] = useState('')

  // Step 2: Zones
  const [zones, setZones] = useState<ZoneInput[]>([
    { name: '', description: '', color: PRESET_COLORS[0] },
  ])

  // Step 3: Team Members
  const [members, setMembers] = useState<MemberInput[]>([])
  const [newMember, setNewMember] = useState<MemberInput>({
    name: '',
    email: '',
    role: 'empleado',
    zoneIds: [],
  })

  const canGoNext = () => {
    switch (step) {
      case 1:
        return projectName.trim() !== '' && companyName.trim() !== ''
      case 2:
        return zones.length > 0 && zones.every((z) => z.name.trim() !== '')
      case 3:
        return true // Members are optional (admin is auto-added)
      case 4:
        return true
      default:
        return false
    }
  }

  const handleAddZone = () => {
    const nextColor = PRESET_COLORS[zones.length % PRESET_COLORS.length]
    setZones([...zones, { name: '', description: '', color: nextColor }])
  }

  const handleRemoveZone = (index: number) => {
    if (zones.length > 1) {
      setZones(zones.filter((_, i) => i !== index))
    }
  }

  const handleZoneChange = (index: number, field: keyof ZoneInput, value: string) => {
    const updated = [...zones]
    updated[index] = { ...updated[index], [field]: value }
    setZones(updated)
  }

  const handleAddMember = () => {
    if (newMember.name.trim() && newMember.email.trim()) {
      setMembers([...members, { ...newMember }])
      setNewMember({ name: '', email: '', role: 'empleado', zoneIds: [] })
    }
  }

  const handleRemoveMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index))
  }

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      await createProject({
        name: projectName,
        description: description || undefined,
        company: companyName,
        zones: zones.map((z) => ({
          name: z.name,
          description: z.description || undefined,
          color: z.color,
        })),
      })

      // Add additional members (admin is auto-added in createProject)
      const { currentProject } = use5SStore.getState()
      if (currentProject) {
        for (const member of members) {
          // Map temporary zoneIds (e.g., "zone-0") to real zone IDs from created project
          const realZoneIds: string[] = []
          for (const zId of member.zoneIds) {
            if (zId && zId.startsWith('zone-')) {
              const zoneIndex = parseInt(zId.replace('zone-', ''), 10)
              const realZoneId = currentProject.zones[zoneIndex]?.id
              if (realZoneId) realZoneIds.push(realZoneId)
            }
          }

          await fetch(`/api/projects/${currentProject.id}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: member.email,
              name: member.name,
              role: member.role,
              zoneIds: realZoneIds.length > 0 ? realZoneIds : undefined,
            }),
          })
        }
      }
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setIsCreating(false)
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

  const stepIcons = [Building2, MapPin, Users, ClipboardCheck]
  const stepLabels = ['Proyecto', 'Zonas', 'Equipo', 'Confirmar']

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
            5S
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Configurar Proyecto</h1>
            <p className="text-xs text-muted-foreground">Crea tu primer proyecto 5S</p>
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="max-w-3xl mx-auto w-full px-4 pt-6">
        <div className="flex items-center justify-between mb-8">
          {stepLabels.map((label, i) => {
            const Icon = stepIcons[i]
            const stepNum = i + 1
            const isActive = step === stepNum
            const isCompleted = step > stepNum
            return (
              <div key={i} className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                      isCompleted
                        ? 'bg-green-500 text-white shadow-md shadow-green-200'
                        : isActive
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md shadow-green-200'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  {i < 3 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
                <span
                  className={`text-xs mt-2 font-medium ${
                    isActive ? 'text-green-600' : isCompleted ? 'text-green-500' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 pb-8">
          {/* Step 1: Project Info */}
          {step === 1 && (
            <div>
              <Card className="border-0 shadow-lg shadow-green-100/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-green-500" />
                    Información del Proyecto
                  </CardTitle>
                  <CardDescription>
                    Ingresa los datos básicos de tu proyecto 5S
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Nombre del Proyecto *</Label>
                    <Input
                      id="project-name"
                      placeholder="Ej: Implementación 5S - Planta Principal"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Empresa *</Label>
                    <Input
                      id="company-name"
                      placeholder="Ej: Manufacturas ABC S.A."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción (opcional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe brevemente el objetivo del proyecto..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Zones */}
          {step === 2 && (
            <div>
              <Card className="border-0 shadow-lg shadow-green-100/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-green-500" />
                    Zonas de Trabajo
                  </CardTitle>
                  <CardDescription>
                    Define las zonas donde se implementará la metodología 5S
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {zones.map((zone, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border bg-white space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: zone.color }}
                          />
                          <span className="text-sm font-medium">Zona {index + 1}</span>
                        </div>
                        {zones.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveZone(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nombre *</Label>
                          <Input
                            placeholder="Ej: Línea de ensamblaje"
                            value={zone.name}
                            onChange={(e) => handleZoneChange(index, 'name', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Descripción</Label>
                          <Input
                            placeholder="Ej: Área principal de producción"
                            value={zone.description}
                            onChange={(e) => handleZoneChange(index, 'description', e.target.value)}
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
                              onClick={() => handleZoneChange(index, 'color', color)}
                              className={`w-7 h-7 rounded-full border-2 transition-all ${
                                zone.color === color
                                  ? 'border-gray-800 scale-110 shadow-md'
                                  : 'border-transparent hover:scale-105'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    onClick={handleAddZone}
                    className="w-full border-dashed border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Zona
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Team Members */}
          {step === 3 && (
            <div>
              <Card className="border-0 shadow-lg shadow-green-100/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-500" />
                    Equipo de Trabajo
                  </CardTitle>
                  <CardDescription>
                    Agrega miembros al proyecto. Tú eres el administrador por defecto.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current user (admin) info */}
                  {currentUser && (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
                          {currentUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-900">
                            {currentUser.name} (Tú)
                          </p>
                          <p className="text-xs text-green-600">{currentUser.email}</p>
                        </div>
                        <Badge className={`${getRoleBadgeColor('admin')} border`}>
                          Administrador
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Add member form */}
                  <div className="p-4 rounded-lg border bg-white space-y-3">
                    <p className="text-sm font-medium">Agregar miembro</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nombre</Label>
                        <Input
                          placeholder="Nombre del miembro"
                          value={newMember.name}
                          onChange={(e) =>
                            setNewMember({ ...newMember, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Email</Label>
                        <Input
                          type="email"
                          placeholder="email@ejemplo.com"
                          value={newMember.email}
                          onChange={(e) =>
                            setNewMember({ ...newMember, email: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Rol</Label>
                        <Select
                          value={newMember.role}
                          onValueChange={(value) =>
                            setNewMember({ ...newMember, role: value })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gerente">Gerente</SelectItem>
                            <SelectItem value="responsable">Responsable</SelectItem>
                            <SelectItem value="empleado">Empleado</SelectItem>
                            <SelectItem value="auditor">Auditor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Zonas asignadas</Label>
                        <div className="space-y-0.5 max-h-32 overflow-y-auto border rounded-md p-2">
                          {zones
                            .filter((z) => z.name.trim())
                            .map((zone, i) => (
                              <label key={i} className="flex items-center gap-1.5 text-sm cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                                <Checkbox
                                  checked={newMember.zoneIds.includes(`zone-${i}`)}
                                  onCheckedChange={(checked) => {
                                    const zId = `zone-${i}`
                                    if (checked) {
                                      setNewMember({ ...newMember, zoneIds: [...newMember.zoneIds, zId] })
                                    } else {
                                      setNewMember({ ...newMember, zoneIds: newMember.zoneIds.filter(id => id !== zId) })
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
                      variant="outline"
                      onClick={handleAddMember}
                      disabled={!newMember.name.trim() || !newMember.email.trim()}
                      className="w-full border-green-300 text-green-600 hover:bg-green-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Miembro
                    </Button>
                  </div>

                  {/* Members table */}
                  {members.length > 0 && (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>Zona</TableHead>
                            <TableHead className="w-10" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {members.map((member, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium text-sm">
                                {member.name}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {member.email}
                              </TableCell>
                              <TableCell>
                                <Badge className={`${getRoleBadgeColor(member.role)} border`}>
                                  {getRoleLabel(member.role)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {member.zoneIds.length > 0
                                  ? member.zoneIds.map(zId => {
                                      const idx = parseInt(zId.replace('zone-', ''), 10)
                                      return zones[idx]?.name
                                    }).filter(Boolean).join(', ')
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveMember(index)}
                                  className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {members.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Puedes agregar miembros más tarde desde la gestión del proyecto
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div>
              <Card className="border-0 shadow-lg shadow-green-100/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-green-500" />
                    Confirmar Proyecto
                  </CardTitle>
                  <CardDescription>
                    Revisa la información antes de crear el proyecto
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Project summary */}
                  <div className="p-4 rounded-lg bg-gray-50 border">
                    <h3 className="font-semibold text-sm mb-3 text-gray-700 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Información del Proyecto
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nombre:</span>
                        <span className="font-medium">{projectName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Empresa:</span>
                        <span className="font-medium">{companyName}</span>
                      </div>
                      {description && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Descripción:</span>
                          <span className="font-medium text-right max-w-[60%]">{description}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Zones summary */}
                  <div className="p-4 rounded-lg bg-gray-50 border">
                    <h3 className="font-semibold text-sm mb-3 text-gray-700 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Zonas ({zones.filter((z) => z.name.trim()).length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {zones
                        .filter((z) => z.name.trim())
                        .map((zone, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white text-sm"
                          >
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: zone.color }}
                            />
                            <span>{zone.name}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Team summary */}
                  <div className="p-4 rounded-lg bg-gray-50 border">
                    <h3 className="font-semibold text-sm mb-3 text-gray-700 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Equipo ({members.length + 1} miembros)
                    </h3>
                    <div className="space-y-2">
                      {currentUser && (
                        <div className="flex items-center justify-between text-sm">
                          <span>
                            {currentUser.name} <span className="text-muted-foreground">(Tú)</span>
                          </span>
                          <Badge className={`${getRoleBadgeColor('admin')} border`}>
                            Administrador
                          </Badge>
                        </div>
                      )}
                      {members.map((member, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span>{member.name}</span>
                          <Badge className={`${getRoleBadgeColor(member.role)} border`}>
                            {getRoleLabel(member.role)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleCreate}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg h-12 text-base"
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Creando Proyecto...
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5 mr-2" />
                        Crear Proyecto
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        
        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 1 || isCreating}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          {step < 4 && (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canGoNext()}
              className="gap-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}
