'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { use5SStore } from '@/lib/store'
import { S_STEPS } from '@/lib/5s-constants'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Building2, MapPin, TrendingUp, Camera, ClipboardList,
  CheckSquare, ShieldCheck, Zap, AlertTriangle, Euro,
  BarChart3, ArrowRight, Package, Clock, Users, User
} from 'lucide-react'

interface ZoneWithResponsable {
  id: string
  name: string
  color: string
  responsable: {
    id: string
    name: string
    email: string
  } | null
  memberCount?: number
}

interface GerenteStats {
  totalProjects: number
  totalZones: number
  globalProgress: { completed: number; total: number; percent: number }
  actionsByStatus: { abierta: number; en_proceso: number; resuelta: number; cerrada: number }
  overdueActions: number
  inventory: {
    total: number
    innecesario: number
    dudoso: number
    util: number
    dineroParado: number
  }
  photos: number
  autoevaluaciones: number
  auditorias: number
  perProject: Array<{
    id: string
    name: string
    company: string
    completedSteps: number
    totalSteps: number
    percent: number
    zones: ZoneWithResponsable[]
    inventory: number
    actions: number
    autoevaluaciones: number
    auditorias: number
    innecesarios: number
    dineroParado: number
  }>
  perS: Record<number, {
    completed: number
    total: number
    percent: number
    actions: number
    inventory: number
    photos: number
    avgScore: number
  }>
}

interface Props {
  onNavigateActions?: () => void
  onNavigateInventory?: () => void
}

export default function GerenteDashboard({ onNavigateActions, onNavigateInventory }: Props) {
  const { currentProject } = use5SStore()
  const [stats, setStats] = useState<GerenteStats | null>(null)
  const [loading, setLoading] = useState(true)

  const company = currentProject?.company || ''

  useEffect(() => {
    if (company) loadStats()
  }, [company])

  const loadStats = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/gerente/stats?company=${encodeURIComponent(company)}`)
      const json = await res.json()
      if (json.success) {
        setStats(json.data)
      }
    } catch (error) {
      console.error('Error loading gerente stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!stats) return null

  const totalActions = Object.values(stats.actionsByStatus).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-green-600" />
            Panel de Gerencia
          </h2>
          <p className="text-sm text-muted-foreground">
            Visión global de {company} — {stats.totalProjects} proyecto{stats.totalProjects !== 1 ? 's' : ''}, {stats.totalZones} zona{stats.totalZones !== 1 ? 's' : ''}
          </p>
        </div>
        <Badge className="bg-green-100 text-green-700 border-green-200 text-sm px-3 py-1">
          Gerente
        </Badge>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="border-green-100 bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-1" />
              <p className="text-3xl font-black text-green-700">{stats.globalProgress.percent}%</p>
              <p className="text-xs text-muted-foreground">Progreso Global</p>
              <Progress value={stats.globalProgress.percent} className="h-2 mt-2" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-orange-100 bg-gradient-to-br from-orange-50 to-white">
            <CardContent className="p-4 text-center">
              <Zap className="h-6 w-6 text-orange-500 mx-auto mb-1" />
              <p className="text-3xl font-black text-orange-700">{totalActions}</p>
              <p className="text-xs text-muted-foreground">Acciones Totales</p>
              {stats.overdueActions > 0 && (
                <div className="flex items-center justify-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-red-600 font-medium">{stats.overdueActions} retrasada{stats.overdueActions !== 1 ? 's' : ''}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-red-100 bg-gradient-to-br from-red-50 to-white">
            <CardContent className="p-4 text-center">
              <Euro className="h-6 w-6 text-red-500 mx-auto mb-1" />
              <p className="text-2xl font-black text-red-700">
                {stats.inventory.dineroParado.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
              </p>
              <p className="text-xs text-muted-foreground">Dinero Parado</p>
              <p className="text-[10px] text-red-500">{stats.inventory.innecesario} innec. + {stats.inventory.dudoso} dudosos</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-4 text-center">
              <Building2 className="h-6 w-6 text-blue-500 mx-auto mb-1" />
              <p className="text-3xl font-black text-blue-700">{stats.totalProjects}</p>
              <p className="text-xs text-muted-foreground">Proyectos</p>
              <p className="text-[10px] text-blue-500">{stats.totalZones} zona{stats.totalZones !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Data counters row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-blue-50">
          <CardContent className="p-3 text-center">
            <Camera className="h-4 w-4 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-blue-700">{stats.photos}</p>
            <p className="text-xs text-muted-foreground">Fotos</p>
          </CardContent>
        </Card>
        <Card className="border-amber-50">
          <CardContent className="p-3 text-center">
            <ClipboardList className="h-4 w-4 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-amber-700">{stats.inventory.total}</p>
            <p className="text-xs text-muted-foreground">Inventario</p>
          </CardContent>
        </Card>
        <Card className="border-green-50">
          <CardContent className="p-3 text-center">
            <CheckSquare className="h-4 w-4 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-700">{stats.autoevaluaciones}</p>
            <p className="text-xs text-muted-foreground">Autoevaluaciones</p>
          </CardContent>
        </Card>
        <Card className="border-purple-50">
          <CardContent className="p-3 text-center">
            <ShieldCheck className="h-4 w-4 text-purple-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-purple-700">{stats.auditorias}</p>
            <p className="text-xs text-muted-foreground">Auditorías</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions by status - clickable */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-orange-100 cursor-pointer hover:shadow-md transition-shadow" onClick={onNavigateActions}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500" />
                Acciones de Mejora — Listado Común
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="grid grid-cols-5 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-red-600">{stats.actionsByStatus.abierta}</p>
                <p className="text-xs text-muted-foreground">Abiertas</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-600">{stats.actionsByStatus.en_proceso}</p>
                <p className="text-xs text-muted-foreground">En Proceso</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">{stats.actionsByStatus.resuelta}</p>
                <p className="text-xs text-muted-foreground">Resueltas</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-600">{stats.actionsByStatus.cerrada}</p>
                <p className="text-xs text-muted-foreground">Cerradas</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-800">{stats.overdueActions}</p>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" /> Retrasadas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Inventory summary - clickable */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="border-amber-100 cursor-pointer hover:shadow-md transition-shadow" onClick={onNavigateInventory}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-500" />
                Inventario Común de Empresa
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-red-600">{stats.inventory.innecesario}</p>
                <p className="text-xs text-muted-foreground">Innecesarios</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-600">{stats.inventory.dudoso}</p>
                <p className="text-xs text-muted-foreground">Dudosos</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">{stats.inventory.util}</p>
                <p className="text-xs text-muted-foreground">Necesarios</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-800">{stats.inventory.dineroParado.toLocaleString('es-ES')} €</p>
                <p className="text-xs text-muted-foreground">Dinero Parado</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Per-S progress across company */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-green-500" />
            Progreso por S — Global Empresa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {S_STEPS.map((s, i) => {
              const sData = stats.perS[s.id]
              if (!sData) return null
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                >
                  <Card className={`h-full ${sData.percent === 100 ? 'border-green-300' : ''}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-xs font-semibold truncate">{s.name}</span>
                      </div>

                      <div className="text-center mb-2">
                        <p className="text-2xl font-black" style={{ color: sData.avgScore > 0 ? s.color : '#9ca3af' }}>
                          {sData.avgScore > 0 ? `${sData.avgScore}%` : `${sData.percent}%`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{s.japaneseName}</p>
                      </div>

                      <Progress value={sData.avgScore || sData.percent} className="h-2 mb-1" />
                      <p className="text-xs text-muted-foreground text-center mb-2">
                        {sData.completed}/{sData.total} pasos
                      </p>

                      <div className="grid grid-cols-2 gap-1 text-center border-t pt-2">
                        <div>
                          <p className="text-xs font-bold" style={{ color: s.color }}>{sData.photos}</p>
                          <p className="text-[10px] text-muted-foreground">Fotos</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold" style={{ color: s.color }}>{sData.inventory}</p>
                          <p className="text-[10px] text-muted-foreground">Items</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold" style={{ color: s.color }}>{sData.actions}</p>
                          <p className="text-[10px] text-muted-foreground">Acciones</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold" style={{ color: s.color }}>{sData.percent}%</p>
                          <p className="text-[10px] text-muted-foreground">Progreso</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Per-project breakdown with zones and responsables */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-500" />
            Desglose por Proyecto y Zona
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.perProject.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="border rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-500" />
                      {project.name}
                    </h4>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-green-700">{project.percent}%</p>
                    <p className="text-xs text-muted-foreground">{project.completedSteps}/{project.totalSteps} pasos</p>
                  </div>
                </div>
                <Progress value={project.percent} className="h-2 mb-3" />

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center mb-4">
                  <div className="bg-amber-50 rounded p-2">
                    <ClipboardList className="h-3 w-3 text-amber-500 mx-auto mb-0.5" />
                    <p className="text-sm font-bold text-amber-700">{project.inventory}</p>
                    <p className="text-[10px] text-muted-foreground">Inventario</p>
                  </div>
                  <div className="bg-orange-50 rounded p-2">
                    <Zap className="h-3 w-3 text-orange-500 mx-auto mb-0.5" />
                    <p className="text-sm font-bold text-orange-700">{project.actions}</p>
                    <p className="text-[10px] text-muted-foreground">Acciones</p>
                  </div>
                  <div className="bg-green-50 rounded p-2">
                    <CheckSquare className="h-3 w-3 text-green-500 mx-auto mb-0.5" />
                    <p className="text-sm font-bold text-green-700">{project.autoevaluaciones}</p>
                    <p className="text-[10px] text-muted-foreground">Autoeval.</p>
                  </div>
                  <div className="bg-purple-50 rounded p-2">
                    <ShieldCheck className="h-3 w-3 text-purple-500 mx-auto mb-0.5" />
                    <p className="text-sm font-bold text-purple-700">{project.auditorias}</p>
                    <p className="text-[10px] text-muted-foreground">Auditorías</p>
                  </div>
                  <div className="bg-red-50 rounded p-2">
                    <Euro className="h-3 w-3 text-red-500 mx-auto mb-0.5" />
                    <p className="text-sm font-bold text-red-700">{project.dineroParado} €</p>
                    <p className="text-[10px] text-muted-foreground">Parado</p>
                  </div>
                </div>

                {/* Zones with responsables */}
                {project.zones.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> Zonas del Proyecto
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {project.zones.map(zone => (
                        <div
                          key={zone.id}
                          className="flex items-center gap-3 p-2.5 rounded-lg border"
                          style={{ borderColor: zone.color + '40', backgroundColor: zone.color + '08' }}
                        >
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: zone.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: zone.color }}>
                              {zone.name}
                            </p>
                            {zone.responsable ? (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {zone.responsable.name}
                                {zone.memberCount && zone.memberCount > 1 && (
                                  <span className="text-muted-foreground">· {zone.memberCount} miembros</span>
                                )}
                              </p>
                            ) : (
                              <p className="text-xs text-amber-600 flex items-center gap-1">
                                <Users className="h-3 w-3" /> Sin responsable asignado
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
