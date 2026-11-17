import { createContext, useContext, useMemo, useState } from 'react'
import { getSession, setSession } from '../data/store.js'
import { isAdmin, isAllowedEmail, TEST_PIN } from './authConfig.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getSession())

  const value = useMemo(() => {
    function loginAs(email) {
      const normalized = String(email || '').trim().toLowerCase()
      if (!isAllowedEmail(normalized)) {
        throw new Error(
          'Dit e-mailadres staat niet op de test-lijst. Alleen hgj@isw.info en elt@isw.info mogen nu inloggen.',
        )
      }
      const next = { email: normalized, admin: isAdmin(normalized) }
      setSession(next)
      setUser(next)
      return next
    }

    function loginWithPin(email, pin) {
      if (String(pin) !== TEST_PIN) {
        throw new Error('Verkeerde test-PIN. Gebruik 1234 (alleen voor deze test).')
      }
      return loginAs(email)
    }

    function logout() {
      setSession(null)
      setUser(null)
    }

    return {
      user,
      isLoggedIn: Boolean(user),
      isAdmin: Boolean(user?.admin),
      loginAs,
      loginWithPin,
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
