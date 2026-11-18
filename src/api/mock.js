/**
 * Lokale mock met dezelfde API-vorm als de Cloudflare Worker.
 * Actief wanneer VITE_API_URL leeg is — geen Cloudflare-login nodig voor UI-dev.
 */

import { SEED_BIEDINGEN, SEED_KAVELS, SEED_VERSION } from '../data/seed.js'

const DB_KEY = 'isw-kavel-veiling-cf-mock-v1'
const SESS_KEY = 'isw-kavel-session-v1'
/** Alleen mock — echte code komt uit Worker-secret ACCESS_CODE. */
const MOCK_ACCESS_CODE = 'isw-veiling'

const ALLOWLIST = [
  { email: 'hgj@isw.info', admin: true, active: true },
  { email: 'elt@isw.info', admin: false, active: true },
]

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function readDb() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
  window.dispatchEvent(new CustomEvent('kavel-db-changed'))
}

function ensureDb() {
  const existing = readDb()
  if (existing?.kavels?.length && existing.seedVersion === SEED_VERSION) {
    return existing
  }
  const db = {
    seedVersion: SEED_VERSION,
    kavels: structuredClone(SEED_KAVELS),
    biedingen: structuredClone(SEED_BIEDINGEN),
    sessions: {},
  }
  writeDb(db)
  return db
}

function hoogsteEnAantal(db, kavelId, startBedrag) {
  const bids = db.biedingen.filter((b) => b.kavelId === kavelId)
  const aantalBiedingen = bids.length
  const maxBedrag = bids.reduce((m, b) => Math.max(m, b.bedrag), 0)
  const hoogsteBod =
    aantalBiedingen === 0 ? startBedrag : Math.max(startBedrag, maxBedrag)
  return { hoogsteBod, aantalBiedingen }
}

function buildStand(db) {
  const kavels = db.kavels
    .filter((k) => k.actief)
    .slice()
    .sort((a, b) => a.titel.localeCompare(b.titel, 'nl'))
    .map((k) => {
      const stats = hoogsteEnAantal(db, k.id, k.startBedrag)
      return {
        id: k.id,
        titel: k.titel,
        omschrijving: k.omschrijving,
        stapGrootte: k.stapGrootte,
        startBedrag: k.startBedrag,
        hoogsteBod: stats.hoogsteBod,
        aantalBiedingen: stats.aantalBiedingen,
        minimumVolgendBod:
          stats.aantalBiedingen === 0
            ? k.startBedrag
            : stats.hoogsteBod + k.stapGrootte,
      }
    })
  const totaalOpgehaald = kavels.reduce((s, k) => s + k.hoogsteBod, 0)
  return { kavels, totaalOpgehaald }
}

function getStoredSession() {
  try {
    const raw = sessionStorage.getItem(SESS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setStoredSession(user) {
  if (!user) sessionStorage.removeItem(SESS_KEY)
  else sessionStorage.setItem(SESS_KEY, JSON.stringify(user))
}

function fail(message, status = 400) {
  const err = new Error(message)
  err.status = status
  throw err
}

export const mockMeta = {
  mode: 'mock',
  accessCodeHint: MOCK_ACCESS_CODE,
}

export async function mockRequest(method, path, { body, token } = {}) {
  await new Promise((r) => setTimeout(r, 40))
  const db = ensureDb()

  if (method === 'GET' && path === '/api/health') {
    return { ok: true, service: 'kavel-veiling-api-mock' }
  }

  if (method === 'GET' && path === '/api/stand') {
    return buildStand(db)
  }

  if (method === 'POST' && path === '/api/auth/login') {
    const email = String(body?.email || '')
      .trim()
      .toLowerCase()
    const code = String(body?.code || '').trim()
    if (!email.endsWith('@isw.info')) {
      fail('Gebruik je school-e-mailadres (@isw.info).')
    }
    if (code !== MOCK_ACCESS_CODE) {
      fail('Onjuiste toegangscode.', 401)
    }
    const allowed = ALLOWLIST.find((a) => a.email === email && a.active)
    if (!allowed) {
      fail(
        'Dit e-mailadres staat niet op de allowlist. Vraag de organisatie om toegang.',
        403,
      )
    }
    const sessionToken = uid('tok')
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
    db.sessions[sessionToken] = { email, expiresAt }
    writeDb(db)
    const user = { token: sessionToken, email, admin: allowed.admin, expiresAt }
    setStoredSession(user)
    return user
  }

  if (method === 'POST' && path === '/api/auth/logout') {
    if (token && db.sessions[token]) {
      delete db.sessions[token]
      writeDb(db)
    }
    setStoredSession(null)
    return { ok: true }
  }

  if (method === 'GET' && path === '/api/me') {
    const session = resolveSession(db, token)
    return { email: session.email, admin: session.admin }
  }

  if (method === 'POST' && path === '/api/bids') {
    const session = resolveSession(db, token)
    const kavelId = String(body?.kavelId || '').trim()
    const amount = Number(body?.bedrag)
    const kavel = db.kavels.find((k) => k.id === kavelId)
    if (!kavel || !kavel.actief) {
      fail('Deze kavel is niet beschikbaar om op te bieden.')
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      fail('Vul een geldig bedrag in euro’s in.')
    }
    const stats = hoogsteEnAantal(db, kavelId, kavel.startBedrag)
    const minimum =
      stats.aantalBiedingen === 0
        ? kavel.startBedrag
        : stats.hoogsteBod + kavel.stapGrootte
    if (amount < minimum) {
      if (stats.aantalBiedingen === 0) {
        fail(
          `Je bod is te laag. Het startbedrag is €${kavel.startBedrag.toFixed(2).replace('.', ',')}.`,
        )
      }
      fail(
        `Je bod is te laag. Het hoogste bod is nu €${stats.hoogsteBod.toFixed(2).replace('.', ',')}. Je moet minstens €${kavel.stapGrootte.toFixed(2).replace('.', ',')} meer bieden (dus €${minimum.toFixed(2).replace('.', ',')} of hoger).`,
      )
    }
    const bid = {
      id: uid('b'),
      kavelId,
      bedrag: amount,
      email: session.email,
      tijdstip: new Date().toISOString(),
    }
    db.biedingen.push(bid)
    writeDb(db)
    return {
      id: bid.id,
      kavelId: bid.kavelId,
      bedrag: bid.bedrag,
      tijdstip: bid.tijdstip,
    }
  }

  fail('Niet gevonden.', 404)
}

function resolveSession(db, token) {
  if (!token || !db.sessions[token]) fail('Niet ingelogd.', 401)
  const s = db.sessions[token]
  if (new Date(s.expiresAt).getTime() < Date.now()) {
    delete db.sessions[token]
    writeDb(db)
    fail('Sessie verlopen. Log opnieuw in.', 401)
  }
  const allowed = ALLOWLIST.find((a) => a.email === s.email && a.active)
  if (!allowed) fail('Sessie ongeldig. Log opnieuw in.', 401)
  return { email: s.email, admin: allowed.admin }
}

export function getMockSession() {
  return getStoredSession()
}

export function clearMockSession() {
  setStoredSession(null)
}
