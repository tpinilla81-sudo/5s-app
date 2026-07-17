'use client'

import { useState, useEffect, useCallback } from 'react'
import { use5SStore } from '@/lib/store'

export interface PermissionMap {
  [role: string]: {
    [permission: string]: boolean
  }
}

export function usePermissions() {
  const { currentUser } = use5SStore()
  const [permissions, setPermissions] = useState<PermissionMap>({})
  const [isLoading, setIsLoading] = useState(true)

  const fetchPermissions = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/permissions')
      const data = await res.json()
      if (data.permissions) {
        setPermissions(data.permissions)
      }
    } catch (error) {
      console.error('Fetch permissions error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!currentUser) return false
      // Permission-driven: check rolePermissionConfig from DB (NO admin bypass)
      const rolePerms = permissions[currentUser.role]
      if (!rolePerms) return false
      return rolePerms[permission] === true
    },
    [currentUser, permissions]
  )

  const canEditPermissions = useCallback((): boolean => {
    if (!currentUser) return false
    // Both gestor and admin can edit permissions (gestor can edit all roles including admin)
    return currentUser.role === 'admin' || currentUser.role === 'gestor'
  }, [currentUser])

  return {
    permissions,
    isLoading,
    hasPermission,
    canEditPermissions,
    fetchPermissions,
  }
}
