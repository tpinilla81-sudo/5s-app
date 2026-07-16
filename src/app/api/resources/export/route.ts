import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-helpers'
import * as XLSX from 'xlsx'

// GET /api/resources/export - Export all resources as Excel file
// Gestor sees all resources; admin sees only their company's resources
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }

    if (user.role !== 'gestor' && user.role !== 'admin' && user.role !== 'gerente') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 })
    }

    const isGestor = user.role === 'gestor'

    // Build where clause
    let where: any = {}

    // Non-gestor: only see users from their companies
    if (!isGestor) {
      const companyMemberships = await db.companyMember.findMany({
        where: { userId: user.id },
        select: { companyId: true },
      })
      const companyIds = companyMemberships.map(cm => cm.companyId)

      where = {
        companyMemberships: {
          some: {
            companyId: { in: companyIds.length > 0 ? companyIds : ['__none__'] },
          },
        },
      }
    }

    const users = await db.user.findMany({
      where,
      include: {
        memberships: {
          include: {
            project: {
              select: { id: true, name: true, company: true }
            },
            zones: {
              include: {
                zone: {
                  select: { id: true, name: true, color: true }
                }
              },
            }
          }
        },
        companyMemberships: {
          include: {
            company: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { name: 'asc' },
    })

    // Build Excel data rows
    const rows = users.map(u => ({
      'ID Empleado': u.employeeId || '',
      'Nombre': u.name,
      'Email': u.email,
      'Contraseña': u.plainPassword || '',
      'Rol': u.role,
      'Teléfono': u.phone || '',
      'Dirección': u.address || '',
      'Ciudad': u.city || '',
      'Provincia': u.province || '',
      'Código Postal': u.postalCode || '',
      'País': u.country || '',
      'Departamento': u.department || '',
      'Puesto': u.position || '',
      'Empresa(s)': u.companyMemberships.map(cm => cm.company.name).join(', '),
      'Proyecto(s)': u.memberships.map(m => m.project.name).join(', '),
      'Zona(s)': u.memberships.flatMap(m => m.zones.map(mz => mz.zone.name)).join(', '),
      'Notas': u.notes || '',
      'Activo': u.active ? 'Sí' : 'No',
      'Fecha Creación': u.createdAt.toLocaleDateString('es-ES'),
    }))

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // ID Empleado
      { wch: 25 }, // Nombre
      { wch: 30 }, // Email
      { wch: 15 }, // Contraseña
      { wch: 15 }, // Rol
      { wch: 15 }, // Teléfono
      { wch: 30 }, // Dirección
      { wch: 15 }, // Ciudad
      { wch: 15 }, // Provincia
      { wch: 12 }, // Código Postal
      { wch: 10 }, // País
      { wch: 20 }, // Departamento
      { wch: 20 }, // Puesto
      { wch: 30 }, // Empresa(s)
      { wch: 30 }, // Proyecto(s)
      { wch: 30 }, // Zona(s)
      { wch: 30 }, // Notas
      { wch: 8 },  // Activo
      { wch: 14 }, // Fecha Creación
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Recursos')

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Return as downloadable file
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="recursos_5s_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Error exporting resources:', error)
    return NextResponse.json({ success: false, error: 'Error al exportar recursos' }, { status: 500 })
  }
}
