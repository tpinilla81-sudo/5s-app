'use client'

import { useState, useEffect } from 'react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  LogOut,
  ChevronDown,
  Bell,
  BellRing,
  FileText,
  CreditCard,
  User,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

const PRESET_COLORS = [
  '#8B5CF6', '#EAB308', '#3B82F6', '#F43F5E',
  '#F97316', '#22C55E', '#06B6D4', '#EC4899',
]

const SECTORS = [
  'Manufactura', 'Automoción', 'Alimentación', 'Farmacéutica', 'Construcción',
  'Energía', 'Telecomunicaciones', 'Transporte', 'Logística', 'Sanidad',
  'Educación', 'Servicios', 'Comercio', 'Hostelería', 'Agricultura',
  'Minería', 'Químico', 'Textil', 'Otros',
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

interface CompanyData {
  id: string
  name: string
  description?: string | null
  nif?: string | null
  sector?: string | null
  address?: string | null
  city?: string | null
  province?: string | null
  postalCode?: string | null
  country?: string | null
  phone?: string | null
  website?: string | null
  billingEmail?: string | null
  billingName?: string | null
  billingNif?: string | null
  billingAddress?: string | null
  billingCity?: string | null
  billingPostalCode?: string | null
  iban?: string | null
  contactName?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
}

export default function ProjectSetup() {
  const { createProject, currentUser, logout } = use5SStore()
  const [step, setStep] = useState(1)
  const [isCreating, setIsCreating] = useState(false)
  const [myCompany, setMyCompany] = useState<CompanyData | null>(null)
  const [isLoadingCompany, setIsLoadingCompany] = useState(true)
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifs, setNotifs] = useState<any[]>([])
  const [isSavingCompany, setIsSavingCompany] = useState(false)

  // Step 1: Project Info
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')

  // Step 2: Company data (pre-filled from gestor, editable by admin)
  const [companyName, setCompanyName] = useState('')
  const [companyNif, setCompanyNif] = useState('')
  const [companySector, setCompanySector] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companyCity, setCompanyCity] = useState('')
  const [companyProvince, setCompanyProvince] = useState('')
  const [companyPostalCode, setCompanyPostalCode] = useState('')
  const [companyCountry, setCompanyCountry] = useState('España')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  // Billing
  const [billingName, setBillingName] = useState('')
  const [billingNif, setBillingNif] = useState('')
  const [billingEmail, setBillingEmail] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [billingCity, setBillingCity] = useState('')
  const [billingPostalCode, setBillingPostalCode] = useState('')
  const [iban, setIban] = useState('')
  // Contact
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  // Step 3: Zones
  const [zones, setZones] = useState<ZoneInput[]>([
    { name: '', description: '', color: PRESET_COLORS[0] },
  ])

  // Step 4: Team Members
  const [members, setMembers] = useState<MemberInput[]>([])
  const [newMember, setNewMember] = useState<MemberInput>({
    name: '',
    email: '',
    role: 'empleado',
    zoneIds: [],
  })

  // Fetch the admin's company data on mount
  useEffect(() => {
    const fetchMyCompany = async () => {
      setIsLoadingCompany(true)
      try {
        const res = await fetch('/api/my-company')
        const data = await res.json()
        if (data.success && data.company) {
          const c = data.company
          setMyCompany(c)
          // Pre-fill ALL company data
          setCompanyName(c.name || '')
          setCompanyNif(c.nif || '')
          setCompanySector(c.sector || '')
          setCompanyAddress(c.address || '')
          setCompanyCity(c.city || '')
          setCompanyProvince(c.province || '')
          setCompanyPostalCode(c.postalCode || '')
          setCompanyCountry(c.country || 'España')
          setCompanyPhone(c.phone || '')
          setCompanyWebsite(c.website || '')
          // Billing
          setBillingName(c.billingName || '')
          setBillingNif(c.billingNif || '')
          setBillingEmail(c.billingEmail || '')
          setBillingAddress(c.billingAddress || '')
          setBillingCity(c.billingCity || '')
          setBillingPostalCode(c.billingPostalCode || '')
          setIban(c.iban || '')
          // Contact
          setContactName(c.contactName || '')
          setContactEmail(c.contactEmail || '')
          setContactPhone(c.contactPhone || '')
        }
      } catch (err) {
        console.error('Error fetching my company:', err)
      } finally {
        setIsLoadingCompany(false)
      }
    }
    fetchMyCompany()
  }, [])

  // Fetch notifications
  useEffect(() => {
    if (currentUser?.id) {
      const fetchNotifs = async () => {
        try {
          const res = await fetch(`/api/notifications?userId=${currentUser.id}&unread=true`)
          const data = await res.json()
          if (data.success) {
            setUnreadNotifs(data.data?.length || 0)
          }
        } catch (e) { console.error('Error fetching notifications:', e) }
      }
      fetchNotifs()
      const interval = setInterval(fetchNotifs, 30000)
      return () => clearInterval(interval)
    }
  }, [currentUser?.id])

  // Save company data to DB
  const saveCompanyData = async () => {
    setIsSavingCompany(true)
    try {
      await fetch('/api/my-company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nif: companyNif,
          sector: companySector,
          address: companyAddress,
          city: companyCity,
          province: companyProvince,
          postalCode: companyPostalCode,
          country: companyCountry,
          phone: companyPhone,
          website: companyWebsite,
          billingName,
          billingNif,
          billingEmail,
          billingAddress,
          billingCity,
          billingPostalCode,
          iban,
          contactName,
          contactEmail,
          contactPhone,
        }),
      })
    } catch (err) {
      console.error('Error saving company data:', err)
    } finally {
      setIsSavingCompany(false)
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  const canGoNext = () => {
    switch (step) {
      case 1:
        return projectName.trim() !== ''
      case 2:
        return companyName.trim() !== ''
      case 3:
        return zones.length > 0 && zones.every((z) => z.name.trim() !== '')
      case 4:
        return true
      case 5:
        return true
      default:
        return false
    }
  }

  const handleNext = async () => {
    // When moving from Step 2 (Company), save company data
    if (step === 2) {
      await saveCompanyData()
    }
    setStep(step + 1)
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
        description: projectDescription || undefined,
        company: companyName,
        companyId: myCompany?.id || undefined,
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

  // 5 steps: Proyecto → Empresa → Zonas → Equipo → Confirmar
  const stepIcons = [Building2, CreditCard, MapPin, Users, ClipboardCheck]
  const stepLabels = ['Proyecto', 'Empresa', 'Zonas', 'Equipo', 'Confirmar']
  const totalSteps = 5

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* ── Top Navigation Bar ── */}
      <header className="border-b bg-white/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8">
              <img src="/5s-logo.png" alt="5S" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-black text-gray-900 leading-tight tracking-wide">5S</h1>
              <span className="text-[10px] font-semibold text-green-600">Configurar Proyecto</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Notifications */}
            <Button variant={unreadNotifs > 0 ? 'default' : 'outline'} size="sm"
              className={`relative gap-1 text-[10px] h-7 ${unreadNotifs > 0 ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' : 'border-orange-300 text-orange-600 hover:bg-orange-50'}`}
              onClick={async () => {
                if (currentUser?.id) {
                  try {
                    const res = await fetch(`/api/notifications?userId=${currentUser.id}&unread=true`)
                    const data = await res.json()
                    if (data.success) setNotifs(data.data || [])
                  } catch (e) { console.error(e) }
                }
                setShowNotifs(!showNotifs)
              }}>
              {unreadNotifs > 0 ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3 w-3" />}
              <span className="hidden sm:inline">{unreadNotifs > 0 ? `${unreadNotifs} avisos` : 'Avisos'}</span>
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center animate-pulse">{unreadNotifs > 9 ? '9+' : unreadNotifs}</span>
              )}
            </Button>
            {/* Manual */}
            <Button variant="ghost" size="sm" onClick={async () => {
              try {
                const res = await fetch('/api/manual')
                if (!res.ok) throw new Error('Download failed')
                const blob = await res.blob()
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url; link.download = 'Manual_Usuario_5S.pdf'
                document.body.appendChild(link); link.click()
                document.body.removeChild(link)
                window.URL.revokeObjectURL(url)
              } catch { window.open('/Manual_Usuario_5S.pdf', '_blank') }
            }} className="text-purple-600 hover:text-purple-700 h-7 px-1.5">
              <FileText className="h-3.5 w-3.5" />
              <span className="text-[10px] hidden sm:inline">Manual</span>
            </Button>
            {/* User menu */}
            {currentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 h-7 px-2">
                    <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-[9px] font-bold">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[10px] font-medium max-w-[60px] truncate hidden sm:inline">{currentUser.name}</span>
                    <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-medium">{currentUser.name}</p>
                    <p className="text-[10px] text-muted-foreground">{currentUser.email}</p>
                    <Badge className={`${getRoleBadgeColor('admin')} border mt-1 text-[10px]`}>
                      Administrador
                    </Badge>
                    {myCompany && (
                      <p className="text-[10px] text-muted-foreground mt-1">{myCompany.name}</p>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer text-xs">
                    <LogOut className="h-3 w-3 mr-1" /> Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Notification dropdown */}
      {showNotifs && (
        <div className="fixed top-12 right-16 z-50 w-80 bg-white border rounded-lg shadow-xl max-h-96 overflow-y-auto">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="text-sm font-semibold">Notificaciones</span>
            {notifs.length > 0 && (
              <button className="text-[10px] text-blue-600 hover:underline" onClick={async () => {
                if (currentUser?.id) {
                  await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true, userId: currentUser.id }) })
                  setUnreadNotifs(0)
                  setNotifs(notifs.map(n => ({ ...n, read: true })))
                }
              }}>Marcar todo como leído</button>
            )}
          </div>
          {notifs.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No hay notificaciones</div>
          ) : (
            <div className="divide-y">
              {notifs.map((n: any) => (
                <div key={n.id} className={`p-3 text-xs ${!n.read ? 'bg-blue-50' : ''}`}>
                  <p className="font-medium">{n.title || n.type}</p>
                  <p className="text-muted-foreground mt-0.5">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
                  {i < totalSteps - 1 && (
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

          {/* ── Step 1: Project Info ── */}
          {step === 1 && (
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
                {/* Company info banner */}
                {isLoadingCompany ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                    <Loader2 className="h-4 w-4 text-green-500 animate-spin" />
                    <span className="text-sm text-green-700">Cargando datos de tu empresa...</span>
                  </div>
                ) : myCompany ? (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-800">Tu empresa: {myCompany.name}</span>
                    </div>
                    {myCompany.nif && <p className="text-xs text-green-600 ml-6">NIF: {myCompany.nif}</p>}
                    {myCompany.sector && <p className="text-xs text-green-600 ml-6">Sector: {myCompany.sector}</p>}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="project-name">Nombre del Proyecto *</Label>
                  <Input
                    id="project-name"
                    placeholder="Ej: Implementación 5S - Planta Principal"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">El nombre identifica este proyecto dentro de tu empresa</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-desc">Descripción (opcional)</Label>
                  <Textarea
                    id="project-desc"
                    placeholder="Describe brevemente el objetivo del proyecto..."
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Step 2: Company Data ── */}
          {step === 2 && (
            <div className="space-y-4">
              <Card className="border-0 shadow-lg shadow-green-100/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-green-500" />
                    Datos de la Empresa
                  </CardTitle>
                  <CardDescription>
                    Completa los datos de tu empresa. El nombre ya viene rellenado por el gestor.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Nombre de la Empresa *</Label>
                      <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} readOnly={!!myCompany} className={myCompany ? 'bg-gray-50 cursor-not-allowed' : ''} />
                      {myCompany && <p className="text-[10px] text-muted-foreground">Asignada por el gestor</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">NIF / CIF</Label>
                      <Input placeholder="Ej: B12345678" value={companyNif} onChange={(e) => setCompanyNif(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Sector</Label>
                      <Select value={companySector} onValueChange={setCompanySector}>
                        <SelectTrigger><SelectValue placeholder="Selecciona sector" /></SelectTrigger>
                        <SelectContent>
                          {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Dirección</Label>
                      <Input placeholder="Calle, número, piso..." value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ciudad</Label>
                      <Input placeholder="Ej: Madrid" value={companyCity} onChange={(e) => setCompanyCity(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Provincia</Label>
                      <Input placeholder="Ej: Madrid" value={companyProvince} onChange={(e) => setCompanyProvince(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Código Postal</Label>
                      <Input placeholder="Ej: 28001" value={companyPostalCode} onChange={(e) => setCompanyPostalCode(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">País</Label>
                      <Input value={companyCountry} onChange={(e) => setCompanyCountry(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Teléfono</Label>
                      <Input placeholder="Ej: +34 91 123 4567" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Sitio Web</Label>
                      <Input placeholder="Ej: www.empresa.com" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg shadow-blue-100/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-500" />
                    Datos de Facturación
                  </CardTitle>
                  <CardDescription>
                    Datos necesarios para la suscripción y facturación
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Razón Social (Facturación)</Label>
                      <Input placeholder="Nombre legal de la empresa" value={billingName} onChange={(e) => setBillingName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">NIF de Facturación</Label>
                      <Input placeholder="NIF para facturación" value={billingNif} onChange={(e) => setBillingNif(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email de Facturación</Label>
                      <Input type="email" placeholder="facturacion@empresa.com" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">IBAN (Domiciliación)</Label>
                      <Input placeholder="ES12 3456 7890 1234 5678 9012" value={iban} onChange={(e) => setIban(e.target.value)} />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Dirección de Facturación</Label>
                      <Input placeholder="Dirección de facturación" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ciudad (Facturación)</Label>
                      <Input placeholder="Ciudad" value={billingCity} onChange={(e) => setBillingCity(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Código Postal (Facturación)</Label>
                      <Input placeholder="CP" value={billingPostalCode} onChange={(e) => setBillingPostalCode(e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg shadow-purple-100/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-purple-500" />
                    Persona de Contacto
                  </CardTitle>
                  <CardDescription>
                    Datos de la persona de contacto principal de la empresa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nombre</Label>
                      <Input placeholder="Nombre completo" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input type="email" placeholder="contacto@empresa.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Teléfono</Label>
                      <Input placeholder="+34 600 123 456" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Step 3: Zones ── */}
          {step === 3 && (
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
                  <div key={index} className="p-4 rounded-lg border bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: zone.color }} />
                        <span className="text-sm font-medium">Zona {index + 1}</span>
                      </div>
                      {zones.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveZone(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nombre *</Label>
                        <Input placeholder="Ej: Línea de ensamblaje" value={zone.name} onChange={(e) => handleZoneChange(index, 'name', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Descripción</Label>
                        <Input placeholder="Ej: Área principal de producción" value={zone.description} onChange={(e) => handleZoneChange(index, 'description', e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Color</Label>
                      <div className="flex gap-2 flex-wrap">
                        {PRESET_COLORS.map((color) => (
                          <button key={color} type="button" onClick={() => handleZoneChange(index, 'color', color)}
                            className={`w-7 h-7 rounded-full border-2 transition-all ${zone.color === color ? 'border-gray-800 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                            style={{ backgroundColor: color }} />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={handleAddZone}
                  className="w-full border-dashed border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700">
                  <Plus className="h-4 w-4 mr-2" /> Agregar Zona
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Step 4: Team Members ── */}
          {step === 4 && (
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
                {currentUser && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900">{currentUser.name} (Tú)</p>
                        <p className="text-xs text-green-600">{currentUser.email}</p>
                      </div>
                      <Badge className={`${getRoleBadgeColor('admin')} border`}>Administrador</Badge>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-lg border bg-white space-y-3">
                  <p className="text-sm font-medium">Agregar miembro</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nombre</Label>
                      <Input placeholder="Nombre del miembro" value={newMember.name}
                        onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input type="email" placeholder="email@ejemplo.com" value={newMember.email}
                        onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Rol</Label>
                      <Select value={newMember.role} onValueChange={(value) => setNewMember({ ...newMember, role: value })}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
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
                        {zones.filter((z) => z.name.trim()).map((zone, i) => (
                          <label key={i} className="flex items-center gap-1.5 text-sm cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                            <Checkbox checked={newMember.zoneIds.includes(`zone-${i}`)}
                              onCheckedChange={(checked) => {
                                const zId = `zone-${i}`
                                if (checked) {
                                  setNewMember({ ...newMember, zoneIds: [...newMember.zoneIds, zId] })
                                } else {
                                  setNewMember({ ...newMember, zoneIds: newMember.zoneIds.filter(id => id !== zId) })
                                }
                              }} className="h-4 w-4" />
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: zone.color }} />
                            <span>{zone.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleAddMember}
                    disabled={!newMember.name.trim() || !newMember.email.trim()}
                    className="w-full border-green-300 text-green-600 hover:bg-green-50">
                    <Plus className="h-4 w-4 mr-2" /> Agregar Miembro
                  </Button>
                </div>

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
                            <TableCell className="font-medium text-sm">{member.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{member.email}</TableCell>
                            <TableCell><Badge className={`${getRoleBadgeColor(member.role)} border`}>{getRoleLabel(member.role)}</Badge></TableCell>
                            <TableCell className="text-sm">
                              {member.zoneIds.length > 0
                                ? member.zoneIds.map(zId => { const idx = parseInt(zId.replace('zone-', ''), 10); return zones[idx]?.name }).filter(Boolean).join(', ')
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(index)}
                                className="text-red-500 hover:text-red-700 h-8 w-8 p-0">
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
          )}

          {/* ── Step 5: Confirmation ── */}
          {step === 5 && (
            <Card className="border-0 shadow-lg shadow-green-100/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-green-500" />
                  Confirmar Proyecto
                </CardTitle>
                <CardDescription>Revisa la información antes de crear el proyecto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Project */}
                <div className="p-4 rounded-lg bg-gray-50 border">
                  <h3 className="font-semibold text-sm mb-3 text-gray-700 flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Proyecto
                  </h3>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Nombre:</span><span className="font-medium">{projectName}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Empresa:</span><span className="font-medium">{companyName}</span></div>
                    {companyNif && <div className="flex justify-between"><span className="text-muted-foreground">NIF:</span><span className="font-medium">{companyNif}</span></div>}
                    {projectDescription && <div className="flex justify-between"><span className="text-muted-foreground">Descripción:</span><span className="font-medium text-right max-w-[60%]">{projectDescription}</span></div>}
                  </div>
                </div>

                {/* Billing summary */}
                {(billingName || billingEmail || iban) && (
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <h3 className="font-semibold text-sm mb-3 text-blue-700 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Facturación
                    </h3>
                    <div className="space-y-1.5 text-sm">
                      {billingName && <div className="flex justify-between"><span className="text-blue-600">Razón Social:</span><span className="font-medium">{billingName}</span></div>}
                      {billingNif && <div className="flex justify-between"><span className="text-blue-600">NIF:</span><span className="font-medium">{billingNif}</span></div>}
                      {billingEmail && <div className="flex justify-between"><span className="text-blue-600">Email:</span><span className="font-medium">{billingEmail}</span></div>}
                      {iban && <div className="flex justify-between"><span className="text-blue-600">IBAN:</span><span className="font-medium">{iban}</span></div>}
                    </div>
                  </div>
                )}

                {/* Zones */}
                <div className="p-4 rounded-lg bg-gray-50 border">
                  <h3 className="font-semibold text-sm mb-3 text-gray-700 flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Zonas ({zones.filter((z) => z.name.trim()).length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {zones.filter((z) => z.name.trim()).map((zone, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }} />
                        <span>{zone.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team */}
                <div className="p-4 rounded-lg bg-gray-50 border">
                  <h3 className="font-semibold text-sm mb-3 text-gray-700 flex items-center gap-2">
                    <Users className="h-4 w-4" /> Equipo ({members.length + 1} miembros)
                  </h3>
                  <div className="space-y-2">
                    {currentUser && (
                      <div className="flex items-center justify-between text-sm">
                        <span>{currentUser.name} <span className="text-muted-foreground">(Tú)</span></span>
                        <Badge className={`${getRoleBadgeColor('admin')} border`}>Administrador</Badge>
                      </div>
                    )}
                    {members.map((member, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span>{member.name}</span>
                        <Badge className={`${getRoleBadgeColor(member.role)} border`}>{getRoleLabel(member.role)}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={handleCreate}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg h-12 text-base"
                  disabled={isCreating}>
                  {isCreating ? (
                    <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Creando Proyecto...</>
                  ) : (
                    <><Check className="h-5 w-5 mr-2" /> Crear Proyecto</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isCreating} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
          ) : (
            <Button variant="ghost" onClick={handleLogout} className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50">
              <LogOut className="h-4 w-4" /> Salir
            </Button>
          )}

          {step < totalSteps && (
            <Button onClick={handleNext} disabled={!canGoNext() || isSavingCompany}
              className="gap-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
              {isSavingCompany ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
              ) : (
                <>Siguiente <ChevronRight className="h-4 w-4" /></>
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}
