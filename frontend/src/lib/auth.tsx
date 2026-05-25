import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authApi } from './api'

interface AuthUser {
  email:    string
  fullName: string
  role:     string
}

interface AuthCtx {
  user:     AuthUser | null
  token:    string | null
  isAuthed: boolean
  login:    (email: string, password: string) => Promise<void>
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>
  logout:   () => void
}

const Ctx = createContext<AuthCtx | null>(null)

const TOKEN_KEY = 'propintel_token'
const USER_KEY  = 'propintel_user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user,  setUser]  = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })

  // Listen for forced logout (401 from api.ts)
  useEffect(() => {
    const handler = () => {
      setToken(null)
      setUser(null)
    }
    window.addEventListener('propintel:logout', handler)
    return () => window.removeEventListener('propintel:logout', handler)
  }, [])

  const persist = useCallback((t: string, u: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, t)
    localStorage.setItem(USER_KEY, JSON.stringify(u))
    setToken(t)
    setUser(u)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    persist(res.token, { email: res.email, fullName: res.fullName, role: res.role })
  }, [persist])

  const register = useCallback(async (email: string, password: string, firstName: string, lastName: string) => {
    const res = await authApi.register(email, password, firstName, lastName)
    persist(res.token, { email: res.email, fullName: res.fullName, role: res.role })
  }, [persist])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  return (
    <Ctx.Provider value={{ user, token, isAuthed: !!token, login, register, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
