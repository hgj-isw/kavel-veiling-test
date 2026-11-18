/**
 * API-client voor Cloudflare Worker (of lokale mock als VITE_API_URL ontbreekt).
 */

import {
  clearMockSession,
  getMockSession,
  mockMeta,
  mockRequest,
} from './mock.js'

const API_BASE = String(import.meta.env.VITE_API_URL || '')
  .trim()
  .replace(/\/+$/, '')

export const usingMockApi = !API_BASE
export const apiBaseUrl = API_BASE || null

const TOKEN_KEY = 'isw-kavel-api-token-v1'

export function getStoredToken() {
  if (usingMockApi) {
    return getMockSession()?.token || null
  }
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setStoredToken(token) {
  if (usingMockApi) return
  try {
    if (!token) sessionStorage.removeItem(TOKEN_KEY)
    else sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* ignore */
  }
}

export function getApiModeInfo() {
  if (usingMockApi) {
    return {
      mode: 'mock',
      hint: `Lokale mock-API. Toegangscode voor demo: ${mockMeta.accessCodeHint}`,
    }
  }
  return { mode: 'remote', hint: null }
}

async function api(method, path, { body, auth = false } = {}) {
  const token = getStoredToken()

  if (usingMockApi) {
    return mockRequest(method, path, {
      body,
      token: auth || token ? token : null,
    })
  }

  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth || token) {
    if (!token) {
      const err = new Error('Niet ingelogd.')
      err.status = 401
      throw err
    }
    headers.Authorization = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (networkErr) {
    const err = new Error(
      `Geen verbinding met de veiling-API (${API_BASE}). Controleer netwerk/firewall of hard-vernieuw de pagina (Ctrl/Cmd+Shift+R).`,
    )
    err.status = 0
    err.cause = networkErr
    throw err
  }

  let data = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
  }

  if (!res.ok) {
    const err = new Error(data?.error || `API-fout ${res.status} op ${path}`)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}

export async function fetchStand() {
  return api('GET', '/api/stand')
}

export async function login({ email, code }) {
  const data = await api('POST', '/api/auth/login', {
    body: { email, code },
  })
  if (!usingMockApi) setStoredToken(data.token)
  // mock zet session zelf; remote: ook e-mail lokaal bewaren voor UI
  if (!usingMockApi) {
    sessionStorage.setItem(
      'isw-kavel-session-v1',
      JSON.stringify({
        token: data.token,
        email: data.email,
        admin: data.admin,
        expiresAt: data.expiresAt,
      }),
    )
  }
  return data
}

export async function logout() {
  try {
    await api('POST', '/api/auth/logout', { auth: true })
  } catch {
    /* sessie al weg */
  }
  setStoredToken(null)
  clearMockSession()
  try {
    sessionStorage.removeItem('isw-kavel-session-v1')
  } catch {
    /* ignore */
  }
}

export function getLocalSession() {
  if (usingMockApi) return getMockSession()
  try {
    const raw = sessionStorage.getItem('isw-kavel-session-v1')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function placeBid({ kavelId, bedrag }) {
  return api('POST', '/api/bids', {
    body: { kavelId, bedrag },
    auth: true,
  })
}

export function euro(n) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(n)
}
