'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Loader2,
  Plus,
  Trash2,
  Edit2,
  UserPlus,
  Shield,
  Crown,
  UserCheck,
  HardHat,
  ClipboardCheck,
  Building2,
  Key,
  UserX,
  UserCog,
  Search,
  Eye,
  EyeOff,
  Wrench,
} from 'lucide-react'

interface UserMembership {
  projectId: string
  role: string
  zoneId: string | null
  project: { id: string; name: string; company: string }
  zone: { id: string; name: string; color: string } | null
}

interface UserData {
  id: string
  email: string
  name: string
  role: string
  avatar: string | null
  active: boolean
  createdAt: string
  memberships: UserMembership[]
}

interface UserManagementProps {
  open: boolean
  onClose: () => void
}

const ROLE_OPTIONS = [
  { value: 'constructor', label: 'Constructor', icon: Wrench, color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'admin', label: 'Administrador', icon: Crown, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'responsable', label: 'Responsable', icon: UserCheck, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'gerente', label: 'Gerente', icon: Building2, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'empleado', label: 'Empleado', icon: HardHat, color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'auditor', label: 'Auditor', icon: ClipboardCheck, color: 'bg-orange-100 text-orange-700 border-orange-200' },
]

export default function UserManagement({ open, onClose }: UserManagementProps) {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')

  // Create user form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('empleado')
  const [creating, setCreating] = useState(false)

  // Edit user dialog
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Error/Success
  const [error, setError] = useState('')

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchUsers()
      setError('')
      setShowCreateForm(false)
      setEditingUser(null)
    }
  }, [open, fetchUsers])

  const handleCreateUser = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setError('Todos los campos son obligatorios')
      return
    }
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    try {
      setCreating(true)
      setError('')
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          password: newPassword,
          role: newRole,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al crear usuario')
        return
      }

      // Reset form
      setNewName('')
      setNewEmail('')
      setNewPassword('')
      setNewRole('empleado')
      setShowCreateForm(false)
      await fetchUsers()
    } catch (error) {
      console.error('Error creating user:', error)
      setError('Error de conexión')
    } finally {
      setCreating(false)
    }
  }

  const handleEditUser = (user: UserData) => {
    setEditingUser(user)
    setEditName(user.name)
    setEditEmail(user.email)
    setEditRole(user.role)
    setEditPassword('')
    setEditActive(user.active)
    setError('')
    setShowPassword(false)
  }

  const handleSaveUser = async () => {
    if (!editingUser) return

    try {
      setSaving(true)
      setError('')
      const updateData: any = {
        id: editingUser.id,
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        active: editActive,
      }
      if (editPassword && editPassword.length >= 6) {
        updateData.password = editPassword
      }

      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al actualizar usuario')
        return
      }

      setEditingUser(null)
      await fetchUsers()
    } catch (error) {
      console.error('Error updating user:', error)
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este usuario? Esta acción no se puede deshacer.')) return

    try {
      const res = await fetch(`/api/users?id=${userId}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchUsers()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al eliminar usuario')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const handleToggleActive = async (user: UserData) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, active: !user.active }),
      })
      if (res.ok) {
        await fetchUsers()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al cambiar estado')
      }
    } catch (error) {
      console.error('Error toggling user active:', error)
    }
  }

  const getRoleInfo = (role: string) => {
    return ROLE_OPTIONS.find(r => r.value === role) || ROLE_OPTIONS[3]
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchText.toLowerCase()) ||
    u.email.toLowerCase().includes(searchText.toLowerCase()) ||
    u.role.toLowerCase().includes(searchText.toLowerCase())
  )

  const stats = {
    total: users.length,
    active: users.filter(u => u.active).length,
    inactive: users.filter(u => !u.active).length,
    byRole: ROLE_OPTIONS.map(r => ({
      ...r,
      count: users.filter(u => u.role === r.value).length,
    })),
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white">
              <UserCog className="h-4 w-4" />
            </div>
            Gestión de Usuarios
            <Badge variant="outline" className="ml-2 text-xs">
              {stats.total} usuarios
            </Badge>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Crea y gestiona usuarios, contraseñas y roles. Solo el administrador puede realizar estas acciones.
          </p>
        </DialogHeader>

        {/* Error message */}
        {error && (
          <div className="mx-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Stats row */}
        <div className="px-6 py-2 flex items-center gap-3 flex-wrap">
          {stats.byRole.filter(r => r.count > 0).map(role => {
            const Icon = role.icon
            return (
              <Badge key={role.value} className={`${role.color} border text-xs gap-1`}>
                <Icon className="h-3 w-3" />
                {role.label}: {role.count}
              </Badge>
            )
          })}
          {stats.inactive > 0 && (
            <Badge className="bg-gray-100 text-gray-600 border border-gray-200 text-xs gap-1">
              <UserX className="h-3 w-3" />
              Inactivos: {stats.inactive}
            </Badge>
          )}
        </div>

        {/* Search + Create row */}
        <div className="px-6 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email o rol..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="text-sm h-8 pl-8"
            />
          </div>
          <Button
            size="sm"
            onClick={() => { setShowCreateForm(!showCreateForm); setError('') }}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            Nuevo Usuario
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* Create user form */}
          <AnimatePresence>
            {showCreateForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="mb-4 border-purple-200 bg-purple-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-purple-500" />
                      Crear Nuevo Usuario
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nombre completo *</Label>
                        <Input
                          placeholder="Juan Pérez"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Email *</Label>
                        <Input
                          type="email"
                          placeholder="juan@empresa.com"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Contraseña *</Label>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Mínimo 6 caracteres"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Rol</Label>
                        <Select value={newRole} onValueChange={setNewRole}>
                          <SelectTrigger className="w-full">
                            <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Seleccionar rol" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map(role => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setShowCreateForm(false); setError('') }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleCreateUser}
                        disabled={creating || !newName.trim() || !newEmail.trim() || !newPassword.trim()}
                        className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                      >
                        {creating ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando...</>
                        ) : (
                          <><UserPlus className="h-4 w-4 mr-2" /> Crear Usuario</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Users table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCog className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                {searchText ? 'No se encontraron usuarios con ese criterio' : 'No hay usuarios registrados'}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Proyectos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-24 text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const roleInfo = getRoleInfo(user.role)
                    const RoleIcon = roleInfo.icon
                    return (
                      <TableRow key={user.id} className={!user.active ? 'opacity-50' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-sm">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${roleInfo.color} border text-xs gap-1`}>
                            <RoleIcon className="h-3 w-3" />
                            {roleInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {user.memberships.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.memberships.map((m, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {m.project.name}
                                  {m.zone ? ` · ${m.zone.name}` : ''}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">Sin proyecto</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleToggleActive(user)}
                            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
                              user.active
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                            }`}
                          >
                            {user.active ? (
                              <><UserCheck className="h-3 w-3" /> Activo</>
                            ) : (
                              <><UserX className="h-3 w-3" /> Inactivo</>
                            )}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              onClick={() => handleEditUser(user)}
                              title="Editar usuario"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteUser(user.id)}
                              title="Eliminar usuario"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Edit User Dialog */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-purple-500" />
                Editar Usuario
              </DialogTitle>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold">
                      {editingUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{editingUser.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Creado: {new Date(editingUser.createdAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Nombre</Label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Email</Label>
                    <Input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Rol</Label>
                    <Select value={editRole} onValueChange={setEditRole}>
                      <SelectTrigger className="mt-1">
                        <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map(role => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm flex items-center gap-1">
                      <Key className="h-3.5 w-3.5" />
                      Nueva Contraseña
                    </Label>
                    <Input
                      type="password"
                      placeholder="Dejar vacío para no cambiar"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Mínimo 6 caracteres. Dejar vacío para mantener la contraseña actual.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Estado:</Label>
                    <button
                      onClick={() => setEditActive(!editActive)}
                      className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        editActive
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                      }`}
                    >
                      {editActive ? (
                        <><UserCheck className="h-3 w-3" /> Activo</>
                      ) : (
                        <><UserX className="h-3 w-3" /> Inactivo</>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditingUser(null); setError('') }}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveUser}
                disabled={saving || !editName.trim() || !editEmail.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Edit2 className="h-4 w-4 mr-2" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
