'use client'

import { useState, useEffect } from 'react'
import { use5SStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  MapPin, Users, TrendingUp, CheckCircle2, Clock, AlertTriangle,
  ChevronDown, ChevronUp, ShieldCheck, BarChart3, Eye,
  ClipboardList, Camera, BookOpen, Award, FileCheck,
} from 'lucide-react'
import { S_STEPS } from '@/lib/5s-constants'

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════
interface ZoneInfo {
  id: string
  name: string
  description: string | null
  color: string
  projectId: string
  projectName: string
  responsableId: string | null
  responsableName: string | null
}

interface MemberInfo {
  userId: string
  userName: string
  userEmail: string
  role: string
  zoneName: string | null
}

interface StepProgress {
  sStep: number
  miniStep: number
  status: string
  completedAt: string | null
  completedByName: string | null
}

interface ZoneProgress {
  zoneId: string
  zoneName: string
  steps: StepProgress[]
  overallPercent: number
}

const S_COLORS: Record<number, string> = {
  1: '#8B5CF6', 2: '#EAB308', 3: '#3B82F6', 4: '#F43F5E', 5: '#22C55E'
}

const S_BG: Record<number, string> = {
  1: 'bg-violet-50 border-violet-200',
  2: 'bg-yellow-50 border-yellow-200',
  3: 'bg-blue-50 border-blue-200',
  4: 'bg-rose-50 border-rose-200',
  5: 'bg-green-50 border-green-200'
}

const MINI_STEP_LABELS: Record<number, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  1: { label: 'Formación', icon: BookOpen },
  2: { label: 'Fotos', icon: Camera },
  3: { label: 'Inventario', icon: ClipboardList },
  4: { label: 'Autoevaluación', icon: ShieldCheck },
  5: { label: 'Auditoría', icon: FileCheck },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  locked: { label: 'Bloqueado', color: 'bg-gray-100 text-gray-500', icon: Clock },
  available: { label: 'Disponible', color: 'bg-blue-100 text-blue-700', icon: Eye },
  in_progress: { label: 'En Progreso', color: 'bg-amber-100 text-amber-700', icon: Clock },
  completed: { label: 'Completado', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
}

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
export default function ResponsablePanel() {
  const { currentUser, currentProject, zones, setCurrentView, setActiveTab, openModal, selectSStep } = use5SStore()
  const [selectedZone, setSelectedZone] = useState<string>('all')
  const [expandedZone, setExpandedZone] = useState<string | null>(null)
  const [zoneProgressMap, setZoneProgressMap] = useState<Record<string, ZoneProgress>>({})
  const [zoneMembers, setZoneMembers] = useState<Record<string, MemberInfo[]>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [currentUser, currentProject])

  const loadData = async () => {
    if (!currentUser || !currentProject) return
    setIsLoading(true)
    try {
      // Load progress for all zones
      const progressRes = await fetch(`/api/progress?projectId=${currentProject.id}`)
      const progressData = await progressRes.json()

      // Load project members
      const membersRes = await fetch(`/api/projects/${currentProject.id}/members`)
      const membersData = await membersRes.json()

      // Build zone progress map
      const progressMap: Record<string, ZoneProgress> = {}
      for (const zone of zones) {
        const zoneProgress = (progressData.progress || []).filter(
          (p: any) => p.zoneId === zone.id
        )
        const steps: StepProgress[] = []
        for (const s of S_STEPS) {
          for (let m = 1; m <= 5; m++) {
            const found = zoneProgress.find(
              (p: any) => p.sStep === s.id && p.miniStep === m
            )
            steps.push({
              sStep: s.id,
              miniStep: m,
              status: found?.status || 'locked',
              completedAt: found?.completedAt || null,
              completedByName: found?.completedByName || null,
            })
          }
        }
        const completed = steps.filter(s => s.status === 'completed').length
        progressMap[zone.id] = {
          zoneId: zone.id,
          zoneName: zone.name,
          steps,
          overallPercent: Math.round((completed / 25) * 100),
        }
      }
      setZoneProgressMap(progressMap)

      // Build zone members map
      const membersMap: Record<string, MemberInfo[]> = {}
      const members = membersData.members || membersData.data || []
      for (const zone of zones) {
        const zoneMembersList = members.filter(
          (m: any) => m.zoneId === zone.id || m.role === 'responsable' || m.role === 'gerente'
        ).map((m: any) => ({
          userId: m.userId || m.id,
          userName: m.userName || m.name || 'Sin nombre',
          userEmail: m.userEmail || m.email || '',
          role: m.role,
          zoneName: zone.name,
        }))
        membersMap[zone.id] = zoneMembersList
      }
      setZoneMembers(membersMap)
    } catch (e) {
      console.error('Error loading responsable data:', e)
    } finally {
      setIsLoading(false)
    }
  }

  // Get zones assigned to this responsable
  const myZones = zones.filter(z =>
    z.responsableId === currentUser?.id ||
    selectedZone === 'all'
  )

  // Stats
  const totalZones = myZones.length
  const totalProgress = myZones.reduce((sum, z) => sum + (zoneProgressMap[z.id]?.overallPercent || 0), 0)
  const avgProgress = totalZones > 0 ? Math.round(totalProgress / totalZones) : 0
  const completedZones = myZones.filter(z => (zoneProgressMap[z.id]?.overallPercent || 0) === 100).length
  const zonesInProgress = myZones.filter(z => {
    const p = zoneProgressMap[z.id]?.overallPercent || 0
    return p > 0 && p < 100
  }).length

  // Open a step in the board
  const goToStep = (sStep: number, miniStep: number) => {
    selectSStep(sStep)
    const modalType = miniStep === 3 ? (sStep === 5 ? 'actionplan' : 'inventario') :
      miniStep === 1 ? 'formacion' :
      miniStep === 2 ? 'fotos' :
      miniStep === 4 ? 'autoevaluacion' : 'auditoria'
    openModal(modalType, sStep, miniStep)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Cargando panel de responsable...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900">Panel de Responsable</h2>
          <p className="text-sm text-muted-foreground">
            Gestiona tus zonas asignadas, supervisa el progreso y coordina tu equipo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Zona:</span>
          <Select value={selectedZone} onValueChange={setSelectedZone}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas mis zonas</SelectItem>
              {myZones.map(z => (
                <SelectItem key={z.id} value={z.id}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
                    {z.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-blue-600 font-medium">Mis Zonas</p>
              <p className="text-xl font-bold text-blue-800">{totalZones}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-green-600 font-medium">Progreso Medio</p>
              <p className="text-xl font-bold text-green-800">{avgProgress}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-emerald-600 font-medium">Completadas</p>
              <p className="text-xl font-bold text-emerald-800">{completedZones}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-amber-600 font-medium">En Progreso</p>
              <p className="text-xl font-bold text-amber-800">{zonesInProgress}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zone List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Zonas Asignadas
        </h3>

        {myZones.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <MapPin className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No tienes zonas asignadas.</p>
              <p className="text-xs text-muted-foreground mt-1">Contacta con tu administrador para que te asigne una zona.</p>
            </CardContent>
          </Card>
        )}

        {myZones.map(zone => {
          const zp = zoneProgressMap[zone.id]
          const isExpanded = expandedZone === zone.id
          const members = zoneMembers[zone.id] || []
          const isMyZone = zone.responsableId === currentUser?.id

          return (
            <Card key={zone.id} className="overflow-hidden border-l-4" style={{ borderLeftColor: zone.color }}>
              {/* Zone Header */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => setExpandedZone(isExpanded ? null : zone.id)}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: zone.color }}>
                  {zone.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{zone.name}</span>
                    {isMyZone && (
                      <Badge className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0">Mi zona</Badge>
                    )}
                  </div>
                  {zone.description && (
                    <p className="text-xs text-muted-foreground truncate">{zone.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: (zp?.overallPercent || 0) >= 100 ? '#16a34a' : (zp?.overallPercent || 0) > 0 ? '#d97706' : '#9ca3af' }}>
                      {zp?.overallPercent || 0}%
                    </p>
                    <Progress value={zp?.overallPercent || 0} className="w-20 h-1.5" />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {members.length}
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t bg-gray-50/30">
                  {/* S-Step Progress Grid */}
                  <div className="p-4">
                    <h4 className="text-xs font-bold text-gray-600 mb-3 uppercase">Progreso 5S</h4>
                    <div className="space-y-3">
                      {S_STEPS.map(s => {
                        const sSteps = zp?.steps.filter(st => st.sStep === s.id) || []
                        const completedS = sSteps.filter(st => st.status === 'completed').length
                        const sPercent = Math.round((completedS / 5) * 100)

                        return (
                          <div key={s.id} className="rounded-lg border bg-white p-3" style={{ borderLeftWidth: 3, borderLeftColor: S_COLORS[s.id] }}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold" style={{ color: S_COLORS[s.id] }}>S{s.id}</span>
                                <span className="text-xs font-medium text-gray-700">{s.japaneseName}</span>
                                <span className="text-[10px] text-gray-400">({s.spanishName})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Progress value={sPercent} className="w-16 h-1.5" />
                                <span className="text-xs font-semibold" style={{ color: S_COLORS[s.id] }}>{sPercent}%</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                              {[1, 2, 3, 4, 5].map(miniStep => {
                                const step = sSteps.find(st => st.miniStep === miniStep)
                                const status = step?.status || 'locked'
                                const config = STATUS_CONFIG[status]
                                const Icon = config.icon
                                const miniConfig = MINI_STEP_LABELS[miniStep]
                                const MiniIcon = miniConfig.icon

                                return (
                                  <button
                                    key={miniStep}
                                    onClick={() => status !== 'locked' ? goToStep(s.id, miniStep) : null}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-center ${
                                      status === 'completed'
                                        ? 'border-green-200 bg-green-50 hover:bg-green-100'
                                        : status === 'in_progress'
                                        ? 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                                        : status === 'available'
                                        ? 'border-blue-200 bg-blue-50 hover:bg-blue-100 cursor-pointer'
                                        : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                    }`}
                                    title={status === 'locked' ? 'Bloqueado - completa los pasos anteriores' : `${miniConfig.label} - ${config.label}`}
                                  >
                                    <MiniIcon className={`h-3.5 w-3.5 ${status === 'completed' ? 'text-green-600' : status === 'in_progress' ? 'text-amber-600' : status === 'available' ? 'text-blue-600' : 'text-gray-400'}`} />
                                    <span className="text-[9px] font-medium leading-tight">{miniConfig.label}</span>
                                    <Badge className={`text-[8px] px-1 py-0 ${config.color}`}>
                                      {config.label}
                                    </Badge>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Team Members */}
                  <div className="p-4 border-t">
                    <h4 className="text-xs font-bold text-gray-600 mb-3 uppercase flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      Equipo de la Zona
                    </h4>
                    {members.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No hay miembros asignados a esta zona.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {members.map(m => (
                          <div key={m.userId} className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                              {m.userName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-800">{m.userName}</p>
                              <p className="text-[9px] text-gray-400">{m.role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="p-4 border-t bg-white">
                    <h4 className="text-xs font-bold text-gray-600 mb-2 uppercase">Acciones Rápidas</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="text-xs h-7 gap-1"
                        onClick={() => { setCurrentView('board'); selectSStep(1) }}>
                        <MapPin className="h-3 w-3" /> Ir al Tablero
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-7 gap-1"
                        onClick={() => { setActiveTab('gerente') }}>
                        <BarChart3 className="h-3 w-3" /> Ver Gerencia
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Quick S-Step Overview (all zones) */}
      {myZones.length > 1 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Resumen por S
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {S_STEPS.map(s => {
              // Calculate average progress for this S across all my zones
              let totalSProgress = 0
              let zoneCount = 0
              for (const zone of myZones) {
                const zp = zoneProgressMap[zone.id]
                if (zp) {
                  const sSteps = zp.steps.filter(st => st.sStep === s.id)
                  const completedS = sSteps.filter(st => st.status === 'completed').length
                  totalSProgress += Math.round((completedS / 5) * 100)
                  zoneCount++
                }
              }
              const avgSProgress = zoneCount > 0 ? Math.round(totalSProgress / zoneCount) : 0

              return (
                <Card key={s.id} className={`${S_BG[s.id]} border`}>
                  <CardContent className="p-3 text-center">
                    <div className="w-8 h-8 rounded-lg mx-auto flex items-center justify-center text-white text-sm font-bold mb-1" style={{ backgroundColor: S_COLORS[s.id] }}>
                      S{s.id}
                    </div>
                    <p className="text-xs font-bold" style={{ color: S_COLORS[s.id] }}>{s.japaneseName}</p>
                    <p className="text-[10px] text-gray-500 mb-2">{s.spanishName}</p>
                    <Progress value={avgSProgress} className="h-1.5 mb-1" />
                    <p className="text-sm font-bold" style={{ color: S_COLORS[s.id] }}>{avgSProgress}%</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
