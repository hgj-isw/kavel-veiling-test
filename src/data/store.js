/**
 * Lokale opslag-laag (localStorage) — leerling-site.
 * Later te vervangen door SharePoint/Graph-calls met dezelfde functienamen.
 * Roept NOOIT de bestaande collega-lijst "Veiling en beidingen" aan.
 *
 * Testfase: deze key is bewust NIET gedeeld met de admin-site
 * (`isw-kavel-veiling-admin-v1`). Twee losse stores tot SharePoint.
 */

import { SEED_BIEDINGEN, SEED_KAVELS } from './seed.js'

const STORAGE_KEY = 'isw-kavel-veiling-v1'
const SESSION_KEY = 'isw-kavel-session-v1'

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function readDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeDb(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  window.dispatchEvent(new CustomEvent('kavel-db-changed'))
}

export function ensureSeeded() {
  const existing = readDb()
  if (existing?.kavels?.length) return existing
  const db = {
    kavels: structuredClone(SEED_KAVELS),
    biedingen: structuredClone(SEED_BIEDINGEN),
  }
  writeDb(db)
  return db
}

export function getDb() {
  return ensureSeeded()
}

export function resetToSeed() {
  const db = {
    kavels: structuredClone(SEED_KAVELS),
    biedingen: structuredClone(SEED_BIEDINGEN),
  }
  writeDb(db)
  return db
}

export function listKavels() {
  return getDb().kavels.slice().sort((a, b) => a.titel.localeCompare(b.titel, 'nl'))
}

export function getKavel(id) {
  return getDb().kavels.find((k) => k.id === id) ?? null
}

export function upsertKavel(input) {
  const db = getDb()
  const titel = String(input.titel ?? '').trim()
  if (!titel) throw new Error('Vul een kavelnaam in.')

  const stapGrootte = Number(input.stapGrootte)
  const startBedrag = Number(input.startBedrag)
  if (!Number.isFinite(stapGrootte) || stapGrootte < 1) {
    throw new Error('De stapgrootte moet minstens €1 zijn.')
  }
  if (!Number.isFinite(startBedrag) || startBedrag < 0) {
    throw new Error('Het startbedrag mag niet negatief zijn.')
  }

  const record = {
    id: input.id || uid('k'),
    titel,
    omschrijving: String(input.omschrijving ?? '').trim(),
    startBedrag,
    stapGrootte,
    actief: input.actief !== false,
  }

  const idx = db.kavels.findIndex((k) => k.id === record.id)
  if (idx >= 0) db.kavels[idx] = record
  else db.kavels.push(record)
  writeDb(db)
  return record
}

export function deleteKavel(id) {
  const db = getDb()
  db.kavels = db.kavels.filter((k) => k.id !== id)
  db.biedingen = db.biedingen.filter((b) => b.kavelId !== id)
  writeDb(db)
}

export function listBiedingen({ kavelId } = {}) {
  let list = getDb().biedingen.slice()
  if (kavelId) list = list.filter((b) => b.kavelId === kavelId)
  return list.sort((a, b) => b.bedrag - a.bedrag || b.tijdstip.localeCompare(a.tijdstip))
}

export function hoogsteBodVoorKavel(kavelId) {
  const kavel = getKavel(kavelId)
  if (!kavel) return 0
  const bids = listBiedingen({ kavelId })
  if (!bids.length) return kavel.startBedrag
  return Math.max(kavel.startBedrag, ...bids.map((b) => b.bedrag))
}

export function minVolgendBod(kavelId) {
  const kavel = getKavel(kavelId)
  if (!kavel) return null
  const hoogste = hoogsteBodVoorKavel(kavelId)
  const heeftEchteBieding = listBiedingen({ kavelId }).some((b) => b.bedrag >= kavel.startBedrag)
  // Eerste bod mag gelijk zijn aan startbedrag; daarna hoogste + stap
  if (!heeftEchteBieding && hoogste === kavel.startBedrag) {
    // Als er nog geen bieding is: startbedrag is toegestaan als minimum
    // Maar als startbedrag al "hoogste" is zonder bids, min = startBedrag
    const bids = listBiedingen({ kavelId })
    if (bids.length === 0) return kavel.startBedrag
  }
  return hoogste + kavel.stapGrootte
}

export function placeBid({ kavelId, bedrag, email }) {
  const kavel = getKavel(kavelId)
  if (!kavel || !kavel.actief) {
    throw new Error('Deze kavel is niet beschikbaar om op te bieden.')
  }

  const amount = Number(bedrag)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Vul een geldig bedrag in euro’s in.')
  }

  const hoogste = hoogsteBodVoorKavel(kavelId)
  const bids = listBiedingen({ kavelId })
  const minimum =
    bids.length === 0 ? kavel.startBedrag : hoogste + kavel.stapGrootte

  if (amount < minimum) {
    if (bids.length === 0) {
      throw new Error(
        `Je bod is te laag. Het startbedrag is €${kavel.startBedrag.toFixed(2).replace('.', ',')}.`,
      )
    }
    throw new Error(
      `Je bod is te laag. Het hoogste bod is nu €${hoogste.toFixed(2).replace('.', ',')}. Je moet minstens €${kavel.stapGrootte.toFixed(2).replace('.', ',')} meer bieden (dus €${minimum.toFixed(2).replace('.', ',')} of hoger).`,
    )
  }

  const bid = {
    id: uid('b'),
    kavelId,
    bedrag: amount,
    email,
    tijdstip: new Date().toISOString(),
  }
  const db = getDb()
  db.biedingen.push(bid)
  writeDb(db)
  return bid
}

export function deleteBid(id) {
  const db = getDb()
  db.biedingen = db.biedingen.filter((b) => b.id !== id)
  writeDb(db)
}

/** Publieke stand: hoogste bod per kavel, zonder namen/e-mails. */
export function getPubliekeStand() {
  return listKavels()
    .filter((k) => k.actief)
    .map((k) => ({
      id: k.id,
      titel: k.titel,
      omschrijving: k.omschrijving,
      stapGrootte: k.stapGrootte,
      hoogsteBod: hoogsteBodVoorKavel(k.id),
      aantalBiedingen: listBiedingen({ kavelId: k.id }).length,
    }))
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setSession(user) {
  if (!user) sessionStorage.removeItem(SESSION_KEY)
  else sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function euro(n) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(n)
}
