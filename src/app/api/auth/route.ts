import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { getAuthUser, SESSION_COOKIE, getSessionExpiry } from '@/lib/auth-helpers'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function hashPasswordSync(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

// GET /api/auth - Get current session user
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)

    if (!user) {
      const response = NextResponse.json({ user: null }, { status: 200 })
      response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 })
      return response
    }

    return NextResponse.json({ user }, { status: 200 })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ user: null }, { status: 200 })
  }
}

// POST /api/auth - Login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    const hashedPassword = hashPasswordSync(password)

    if (user.password !== hashedPassword) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    if (!user.active) {
      return NextResponse.json(
        { error: 'Cuenta desactivada. Contacte al administrador.' },
        { status: 403 }
      )
    }

    // Create a secure session token
    const token = randomBytes(32).toString('hex')
    const expiresAt = getSessionExpiry()

    await db.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    })

    // Clean up old expired sessions for this user
    await db.session.deleteMany({
      where: {
        userId: user.id,
        expiresAt: { lt: new Date() },
      },
    }).catch(() => {})

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          active: user.active,
        },
      },
      { status: 200 }
    )

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/auth - Register
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, role } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nombre, email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Self-registration is always 'empleado' role — admin creates users with specific roles
    const userRole = 'empleado'

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con este email' },
        { status: 409 }
      )
    }

    const hashedPassword = hashPasswordSync(password)

    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: userRole,
      },
    })

    // Create a secure session token for auto-login
    const token = randomBytes(32).toString('hex')
    const expiresAt = getSessionExpiry()

    await db.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    })

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          active: user.active,
        },
      },
      { status: 201 }
    )

    // Auto-login after registration
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    return response
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/auth - Logout
export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE)?.value

    // Delete the session from database
    if (sessionToken) {
      await db.session.deleteMany({
        where: { token: sessionToken },
      }).catch(() => {})
    }
  } catch (error) {
    console.error('Logout cleanup error:', error)
  }

  const response = NextResponse.json(
    { message: 'Sesión cerrada' },
    { status: 200 }
  )

  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  })

  return response
}
