import { createContext, useContext, useMemo, useState } from 'react'
import {
  getLocalSession,
  login as apiLogin,
  logout as apiLogout,
} from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const s = getLocalSession()
    if (!s?.email) return null
    return { email: s.email, admin: Boolean(s.admin), token: s.token }
  })

  const value = useMemo(() => {
    async function login(email, code) {
      const data = await apiLogin({ email, code })
      const next = {
        email: data.email,
        admin: Boolean(data.admin),
        token: data.token,
      }
      setUser(next)
      return next
    }

    async function logout() {
      await apiLogout()
      setUser(null)
    }

    return {
      user,
      isLoggedIn: Boolean(user),
      isAdmin: Boolean(user?.admin),
      login,
      logout,
    }
  }, [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth buiten AuthProvider')
  return ctx
}
