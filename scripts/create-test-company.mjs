/**
 * Clean up test company "Industrial Demo S.L." - then recreate
 */
const BASE = 'https://5s-app-one.vercel.app'
const COOKIE_NAME = '5s_session'

class ApiClient {
  constructor() { this.cookies = '' }
  async api(path, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' }
    if (this.cookies) headers['Cookie'] = this.cookies
    const opts = { method, headers }
    if (body) opts.body = JSON.stringify(body)
    const res = await fetch(`${BASE}${path}`, opts)
    const setCookies = res.headers.getSetCookie?.() || []
    for (const sc of setCookies) {
      const match = sc.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
      if (match) this.cookies = `${COOKIE_NAME}=${match[1]}`
    }
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('json')) return { status: res.status, data: await res.json() }
    return { status: res.status, data: { error: `Non-JSON (${res.status})` } }
  }
  async login(email, password) {
    const { data } = await this.api('/api/auth', 'POST', { email, password })
    return !!data.user
  }
}

async function main() {
  const client = new ApiClient()
  const bugs = []
  
  console.log('🚀 Setting up test company...\n')
  
  // Login as gestor
  console.log('1️⃣  Login as gestor...')
  await client.login('gestor@cincos.com', 'gestor123')
  console.log('   ✅ OK\n')

  // Get existing companies to find test company
  console.log('2️⃣  Checking for existing test company...')
  const { data: companiesData } = await client.api('/api/companies')
  const COMPANY_NAME = 'Demo Test 5S'
  
  const existingCompany = companiesData.companies?.find(c => c.name === COMPANY_NAME)
  if (existingCompany) {
    console.log(`   Found existing company: ${existingCompany.id} — deleting...`)
    // Delete all members first
    if (existingCompany.adminUser) {
      await client.api(`/api/companies/${existingCompany.id}/members`, 'DELETE', { memberUserId: existingCompany.adminUser.id })
    }
    // Delete the company
    await client.api(`/api/companies/${existingCompany.id}`, 'DELETE')
    console.log('   ✅ Deleted')
    await new Promise(r => setTimeout(r, 2000)) // wait for DB
  }
  console.log()

  // Get existing test users and delete them
  console.log('3️⃣  Cleaning up test users...')
  const { data: usersData } = await client.api('/api/users')
  const testEmails = ['admin@demo.com', 'gerente@demo.com', 'resp.almacen@demo.com', 
    'resp.produccion@demo.com', 'resp.oficinas@demo.com', 
    'emp1@demo.com', 'emp2@demo.com', 'emp3@demo.com', 
    'emp4@demo.com', 'emp5@demo.com', 'emp6@demo.com', 'auditor@demo.com']
  
  for (const u of usersData.users || []) {
    if (testEmails.includes(u.email)) {
      await client.api(`/api/users?id=${u.id}`, 'DELETE')
      console.log(`   🗑️  Deleted ${u.email}`)
    }
  }
  console.log()

  // Create company
  console.log('4️⃣  Creating company...')
  const { data: companyData } = await client.api('/api/companies', 'POST', {
    name: COMPANY_NAME,
    description: 'Empresa de prueba para testear la app 5S. SE PUEDE BORRAR.',
    nif: 'B12345678',
    sector: 'Industria',
    address: 'Polígono Industrial Norte, Nave 14',
    city: 'Madrid',
    province: 'Madrid',
    postalCode: '28100',
    phone: '916554321',
  })
  if (!companyData.success) { console.error('❌', companyData.error); return }
  const companyId = companyData.company?.id
  console.log(`   ✅ Company: ${companyId}\n`)

  // Create users
  console.log('5️⃣  Creating users...')
  const users = [
    { name: 'Carlos Admin', email: 'admin@demo.com', password: 'admin123', role: 'admin', phone: '600111111', position: 'Director de Operaciones', department: 'Dirección' },
    { name: 'María Gerente', email: 'gerente@demo.com', password: 'gerente123', role: 'gerente', phone: '600222222', position: 'Gerente', department: 'Gerencia' },
    { name: 'Pedro Resp. Almacén', email: 'resp.almacen@demo.com', password: 'resp123', role: 'responsable', phone: '600333311', position: 'Jefe de Almacén', department: 'Almacén' },
    { name: 'Ana Resp. Producción', email: 'resp.produccion@demo.com', password: 'resp123', role: 'responsable', phone: '600333322', position: 'Jefa de Producción', department: 'Producción' },
    { name: 'Luis Resp. Oficinas', email: 'resp.oficinas@demo.com', password: 'resp123', role: 'responsable', phone: '600333333', position: 'Responsable Oficinas', department: 'Administración' },
    { name: 'Javier Empleado', email: 'emp1@demo.com', password: 'emp123', role: 'empleado', phone: '600444411', position: 'Operario', department: 'Almacén' },
    { name: 'Sara Empleada', email: 'emp2@demo.com', password: 'emp123', role: 'empleado', phone: '600444422', position: 'Operaria', department: 'Almacén' },
    { name: 'Diego Empleado', email: 'emp3@demo.com', password: 'emp123', role: 'empleado', phone: '600444433', position: 'Operario', department: 'Producción' },
    { name: 'Laura Empleada', email: 'emp4@demo.com', password: 'emp123', role: 'empleado', phone: '600444444', position: 'Operaria', department: 'Producción' },
    { name: 'Miguel Empleado', email: 'emp5@demo.com', password: 'emp123', role: 'empleado', phone: '600444455', position: 'Administrativo', department: 'Administración' },
    { name: 'Elena Empleada', email: 'emp6@demo.com', password: 'emp123', role: 'empleado', phone: '600444466', position: 'Administrativa', department: 'Administración' },
    { name: 'Rosa Auditora', email: 'auditor@demo.com', password: 'audit123', role: 'auditor', phone: '600555555', position: 'Auditora Externa', department: 'Calidad' },
  ]
  const createdUsers = {}
  for (const u of users) {
    const { data } = await client.api('/api/users', 'POST', u)
    if (data.success) { createdUsers[u.email] = data.user.id; console.log(`   ✅ ${u.name} (${u.role})`) }
    else console.log(`   ⚠️  ${u.email}: ${data.error}`)
  }
  console.log()

  // Assign to company
  console.log('6️⃣  Assigning admin & gerente to company...')
  if (createdUsers['admin@demo.com']) {
    const { data } = await client.api(`/api/companies/${companyId}/members`, 'POST', { userId: createdUsers['admin@demo.com'], role: 'admin_empresa' })
    console.log(`   ✅ Admin: ${data.success ? 'OK' : data.error}`)
  }
  if (createdUsers['gerente@demo.com']) {
    const { data } = await client.api(`/api/companies/${companyId}/members`, 'POST', { userId: createdUsers['gerente@demo.com'], role: 'gerente' })
    console.log(`   ✅ Gerente: ${data.success ? 'OK' : data.error}`)
  }
  console.log()

  // Create project with zones
  console.log('7️⃣  Creating project with 3 zones...')
  const { data: projData } = await client.api('/api/projects', 'POST', {
    name: 'Implementación 5S - Demo Test',
    description: 'Proyecto de implementación 5S completo',
    company: COMPANY_NAME,
    companyId,
    zones: [
      { name: 'Almacén', color: '#3B82F6', description: 'Zona del almacén principal' },
      { name: 'Producción', color: '#EF4444', description: 'Línea de producción' },
      { name: 'Oficinas', color: '#10B981', description: 'Área administrativa' },
    ],
  })
  if (!projData.success && !projData.project) { console.error('❌', JSON.stringify(projData).substring(0, 300)); return }
  const projectId = projData.project?.id
  const createdZones = {}
  for (const z of projData.project?.zones || []) { createdZones[z.name] = z.id }
  console.log(`   ✅ Project: ${projectId} (${Object.keys(createdZones).length} zones)\n`)

  // Add members
  console.log('8️⃣  Adding members to project...')
  const assignments = [
    { email: 'admin@demo.com', role: 'admin', zoneNames: ['Almacén', 'Producción', 'Oficinas'] },
    { email: 'gerente@demo.com', role: 'gerente', zoneNames: ['Almacén', 'Producción', 'Oficinas'] },
    { email: 'resp.almacen@demo.com', role: 'responsable', zoneNames: ['Almacén'] },
    { email: 'resp.produccion@demo.com', role: 'responsable', zoneNames: ['Producción'] },
    { email: 'resp.oficinas@demo.com', role: 'responsable', zoneNames: ['Oficinas'] },
    { email: 'emp1@demo.com', role: 'empleado', zoneNames: ['Almacén'] },
    { email: 'emp2@demo.com', role: 'empleado', zoneNames: ['Almacén'] },
    { email: 'emp3@demo.com', role: 'empleado', zoneNames: ['Producción'] },
    { email: 'emp4@demo.com', role: 'empleado', zoneNames: ['Producción'] },
    { email: 'emp5@demo.com', role: 'empleado', zoneNames: ['Oficinas'] },
    { email: 'emp6@demo.com', role: 'empleado', zoneNames: ['Oficinas'] },
    { email: 'auditor@demo.com', role: 'auditor', zoneNames: ['Almacén', 'Producción', 'Oficinas'] },
  ]
  for (const m of assignments) {
    const userId = createdUsers[m.email]
    if (!userId) continue
    const zoneIds = m.zoneNames.map(z => createdZones[z]).filter(Boolean)
    const { data } = await client.api(`/api/projects/${projectId}/members`, 'POST', { userId, role: m.role, zoneIds })
    console.log(`   ${data.success ? '✅' : '❌'} ${m.email} → ${m.role} (${m.zoneNames.join(', ')}) ${!data.success ? data.error : ''}`)
  }
  console.log()

  // Assign responsables to zones
  console.log('9️⃣  Assigning responsables to zones...')
  const zoneResps = { 'Almacén': 'resp.almacen@demo.com', 'Producción': 'resp.produccion@demo.com', 'Oficinas': 'resp.oficinas@demo.com' }
  for (const [zName, rEmail] of Object.entries(zoneResps)) {
    const zoneId = createdZones[zName]
    const respId = createdUsers[rEmail]
    if (zoneId && respId) {
      const { data } = await client.api(`/api/projects/${projectId}/zones`, 'PATCH', { zoneId, responsableId: respId })
      console.log(`   ${data.success ? '✅' : '❌'} ${zName} → ${rEmail}`)
    }
  }
  console.log()

  // Test logins
  console.log('🔟 Testing logins & API access per role...\n')
  const testUsers = [
    { email: 'admin@demo.com', password: 'admin123', role: 'Admin' },
    { email: 'gerente@demo.com', password: 'gerente123', role: 'Gerente' },
    { email: 'resp.almacen@demo.com', password: 'resp123', role: 'Responsable' },
    { email: 'emp1@demo.com', password: 'emp123', role: 'Empleado' },
    { email: 'auditor@demo.com', password: 'audit123', role: 'Auditor' },
  ]

  for (const tu of testUsers) {
    const tc = new ApiClient()
    const loginOk = await tc.login(tu.email, tu.password)
    console.log(`   🔑 ${tu.role}: Login ${loginOk ? '✅' : '❌'}`)
    if (!loginOk) { bugs.push(`LOGIN: ${tu.email}`); continue }

    const { data: me } = await tc.api('/api/auth')
    if (!me.user) { bugs.push(`AUTH/ME: ${tu.email}`); console.log(`      ❌ /auth/me`); continue }
    console.log(`      ✅ /auth/me → ${me.user.name} (${me.user.role})`)

    const { data: projs } = await tc.api('/api/projects')
    console.log(`      ✅ Projects: ${projs.projects?.length || 0}`)

    const { data: usrs } = await tc.api('/api/users')
    console.log(`      ✅ Users visible: ${usrs.users?.length || 0}`)

    // Excel export (only admin/gestor)
    if (['admin', 'gestor'].includes(me.user.role)) {
      const res = await fetch(`${BASE}/api/resources/export`, { headers: { 'Cookie': tc.cookies } })
      console.log(`      ✅ Excel export: ${res.ok ? 'OK' : res.status}`)
      if (!res.ok) bugs.push(`EXPORT ${res.status}: ${tu.email}`)
    }
  }
  console.log()

  // Admin-specific tests
  console.log('1️⃣1️⃣  Testing admin actions...')
  const adminClient = new ApiClient()
  await adminClient.login('admin@demo.com', 'admin123')

  // Edit user
  if (createdUsers['emp1@demo.com']) {
    const { data } = await adminClient.api('/api/users', 'PUT', { id: createdUsers['emp1@demo.com'], phone: '600999999', address: 'C/ Test 42', notes: 'Notas prueba' })
    console.log(`   Edit user: ${data.success ? '✅' : '❌ ' + data.error}`)
    if (!data.success) bugs.push(`EDIT USER: ${data.error}`)
  }

  // Password reset
  if (createdUsers['emp2@demo.com']) {
    const { data } = await adminClient.api('/api/users', 'PUT', { id: createdUsers['emp2@demo.com'], password: 'newpass456' })
    console.log(`   Reset password: ${data.success ? '✅' : '❌ ' + data.error}`)
    if (data.success) {
      const vc = new ApiClient()
      const ok = await vc.login('emp2@demo.com', 'newpass456')
      console.log(`   Verify new pwd: ${ok ? '✅' : '❌'}`)
      if (!ok) bugs.push(`PWD RESET: new password doesn't work`)
    }
  }

  // Verify zones & responsables
  const { data: zonesData } = await adminClient.api(`/api/projects/${projectId}/zones`)
  if (zonesData?.success) {
    for (const z of zonesData.zones || []) {
      const respName = z.responsable?.name || '❌ NONE'
      console.log(`   📍 ${z.name}: resp=${respName}, boardConfig=${z.boardConfig?.name || 'NONE'}`)
      if (!z.responsable) bugs.push(`ZONE "${z.name}": no responsable`)
      if (!z.boardConfig) bugs.push(`ZONE "${z.name}": no board config`)
    }
  }

  // Verify members
  const { data: membersData } = await adminClient.api(`/api/projects/${projectId}/members`)
  if (membersData?.success) {
    for (const m of membersData.members || []) {
      const zoneNames = m.zones?.map(z => z.name).join(', ') || '❌ SIN ZONAS'
      console.log(`   👤 ${m.user?.name} (${m.role}) → ${zoneNames}`)
      if (!m.zones?.length) bugs.push(`MEMBER ${m.user?.name}: 0 zones`)
    }
  }
  console.log()

  // Test employee view
  console.log('1️⃣2️⃣  Testing employee 5S access...')
  const empClient = new ApiClient()
  await empClient.login('emp1@demo.com', 'emp123')
  
  if (projectId) {
    const { data: prog } = await empClient.api(`/api/progress?projectId=${projectId}`)
    console.log(`   Progress API: ${prog.success !== undefined ? '✅' : '⚠️'}`)
  }

  const { data: inv } = await adminClient.api(`/api/inventory?projectId=${projectId}`)
  console.log(`   Inventory API: ${inv?.success ? '✅' : '⚠️'}`)
  console.log()

  // ─── Summary ─────────────
  console.log('='.repeat(60))
  console.log('📋 RESUMEN')
  console.log('='.repeat(60))
  console.log(`Empresa: ${COMPANY_NAME} (${companyId})`)
  console.log(`Proyecto: (${projectId})`)
  console.log(`Zonas: ${Object.keys(createdZones).length}`)
  console.log(`Usuarios: ${Object.keys(createdUsers).length}`)
  console.log()
  console.log('🔑 CREDENCIALES:')
  console.log('─'.repeat(60))
  console.log('Admin:      admin@demo.com / admin123')
  console.log('Gerente:    gerente@demo.com / gerente123')
  console.log('Resp. Alm:  resp.almacen@demo.com / resp123')
  console.log('Resp. Prod: resp.produccion@demo.com / resp123')
  console.log('Resp. Ofi:  resp.oficinas@demo.com / resp123')
  console.log('Empleado 1: emp1@demo.com / emp123')
  console.log('Empleado 2: emp2@demo.com / newpass456 (cambiada!)')
  console.log('Empleado 3-6: emp3@demo.com ... emp6@demo.com / emp123')
  console.log('Auditor:    auditor@demo.com / audit123')
  console.log()

  if (bugs.length > 0) {
    console.log('🐛 BUGS ENCONTRADOS:')
    console.log('─'.repeat(60))
    bugs.forEach((b, i) => console.log(`   ${i + 1}. ${b}`))
  } else {
    console.log('✅ No se encontraron bugs!')
  }
}

main().catch(console.error)
