import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { db } from '@/lib/db'

const SESSION_COOKIE = '5s_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function hashPasswordSync(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

// GET /api/auth - Get current session user
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get(SESSION_COOKIE)?.value

    if (!sessionId) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    const user = await db.user.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        active: true,
      },
    })

    if (!user || !user.active) {
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

    response.cookies.set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
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
    response.cookies.set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
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
export async function DELETE() {
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
