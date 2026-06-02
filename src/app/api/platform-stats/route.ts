import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/platform-stats - Platform-wide statistics for Constructor
export async function GET() {
  try {
    // Total counts
    const [
      totalCompanies,
      activeCompanies,
      totalUsers,
      activeUsers,
      totalProjects,
      activeProjects,
      totalTemplates,
      totalAuditResults,
      totalActions,
      openActions,
    ] = await Promise.all([
      db.company.count(),
      db.company.count({ where: { active: true } }),
      db.user.count(),
      db.user.count({ where: { active: true } }),
      db.project.count(),
      db.project.count({ where: { active: true } }),
      db.template.count({ where: { active: true } }),
      db.auditResult.count(),
      db.actionItem.count(),
      db.actionItem.count({ where: { estado: 'abierta' } }),
    ])

    // Users by role
    const usersByRole = await db.user.groupBy({
      by: ['role'],
      _count: { id: true },
    })

    const roleDistribution: Record<string, number> = {}
    for (const entry of usersByRole) {
      roleDistribution[entry.role] = entry._count.id
    }

    // Companies with details
    const companies = await db.company.findMany({
      include: {
        _count: { select: { projects: true, members: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const companiesWithDetails = companies.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      active: c.active,
      createdAt: c.createdAt,
      projectCount: c._count.projects,
      memberCount: c._count.members,
    }))

    // Recent users (last 10)
    const recentUsers = await db.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    })

    // Projects per company
    const projectsWithCompany = await db.project.findMany({
      include: {
        companyRel: { select: { id: true, name: true } },
        _count: { select: { members: true, zones: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const projectsWithDetails = projectsWithCompany.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      company: p.company,
      companyId: p.companyId,
      companyName: p.companyRel?.name || null,
      active: p.active,
      startDate: p.startDate,
      createdAt: p.createdAt,
      memberCount: p._count.members,
      zoneCount: p._count.zones,
    }))

    // All users with company info
    const allUsers = await db.user.findMany({
      include: {
        memberships: {
          include: {
            project: {
              select: { id: true, name: true, company: true, companyId: true }
            }
          }
        },
        companyMemberships: {
          include: {
            company: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    const usersWithCompany = allUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active,
      createdAt: u.createdAt,
      companies: u.companyMemberships.map(cm => ({
        id: cm.company.id,
        name: cm.company.name,
        role: cm.role,
      })),
      projects: u.memberships.map(m => ({
        id: m.project.id,
        name: m.project.name,
        company: m.project.company,
        role: m.role,
      })),
    }))

    return NextResponse.json({
      success: true,
      data: {
        totals: {
          companies: totalCompanies,
          activeCompanies,
          users: totalUsers,
          activeUsers,
          projects: totalProjects,
          activeProjects,
          templates: totalTemplates,
          auditResults: totalAuditResults,
          actions: totalActions,
          openActions,
        },
        roleDistribution,
        companies: companiesWithDetails,
        recentUsers,
        projects: projectsWithDetails,
        users: usersWithCompany,
      },
    })
  } catch (error) {
    console.error('Error fetching platform stats:', error)
    return NextResponse.json({ success: false, error: 'Error fetching platform stats' }, { status: 500 })
  }
}
