/**
 * Cloudflare Worker — ISW Hoogeland kavelveiling API
 *
 * Publiek:
 *   GET  /api/health
 *   GET  /api/stand          → kavels + hoogste bod, ZONDER namen
 *
 * Auth:
 *   POST /api/auth/login     { email, code } → { token, email, admin }
 *   POST /api/auth/logout    Authorization: Bearer …
 *   GET  /api/me
 *
 * Bieden (ingelogd):
 *   POST /api/bids           { kavelId, bedrag }
 *
 * Admin (Bearer + allowlist is_admin):
 *   GET    /api/admin/biedingen
 *   DELETE /api/admin/biedingen/:id   → hard-delete één onzinbod (admin only; geen bulk)
 *   GET    /api/admin/allowlist
 *   GET    /api/admin/export?format=json|csv  → download kavels+biedingen
 *   POST   /api/admin/backup                 → on-demand snapshot naar R2
 *   GET    /api/admin/backups                → lijst R2-backups
 *
 * Cron (elk uur): scheduled → R2 backups/ (zie backup.js)
 */

import {
  handleAdminBackup,
  handleAdminBackupsList,
  handleAdminExport,
  handleScheduled,
} from './backup.js'

const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 uur

export default {
  async fetch(request, env) {
    try {
      if (request.method === 'OPTIONS') {
        return cors(env, request, new Response(null, { status: 204 }))
      }

      // HEAD moet hetzelfde pad als GET volgen (anders 404 → “API werkt niet” in checks).
      const method = request.method === 'HEAD' ? 'GET' : request.method
      const url = new URL(request.url)
      const path = url.pathname.replace(/\/+$/, '') || '/'

      if (method === 'GET' && (path === '/' || path === '/api' || path === '/api/health')) {
        return json(
          env,
          request,
          {
            ok: true,
            service: 'kavel-veiling-api',
            privacy: 'stand heeft geen biedersnamen',
          },
          200,
          request.method === 'HEAD',
        )
      }

      if (method === 'GET' && path === '/api/stand') {
        return json(env, request, await getStand(env.DB), 200, request.method === 'HEAD')
      }

      if (method === 'POST' && path === '/api/auth/login') {
        return handleLogin(request, env)
      }

      if (method === 'POST' && path === '/api/auth/logout') {
        return handleLogout(request, env)
      }

      if (method === 'GET' && path === '/api/me') {
        const session = await requireSession(request, env)
        if (session instanceof Response) return session
        return json(
          env,
          request,
          {
            email: session.email,
            admin: session.admin,
          },
          200,
          request.method === 'HEAD',
        )
      }

      if (method === 'POST' && path === '/api/bids') {
        return handlePlaceBid(request, env)
      }

      if (method === 'GET' && path === '/api/admin/biedingen') {
        return handleAdminBiedingen(request, env)
      }

      const deleteBidMatch = /^\/api\/admin\/biedingen\/([^/]+)$/.exec(path)
      if (method === 'DELETE' && deleteBidMatch) {
        return handleAdminDeleteBid(request, env, decodeURIComponent(deleteBidMatch[1]))
      }

      if (method === 'GET' && path === '/api/admin/allowlist') {
        return handleAdminAllowlist(request, env)
      }

      if (method === 'GET' && path === '/api/admin/export') {
        return handleAdminExport(request, env, { requireAdmin, json, cors })
      }

      if (method === 'POST' && path === '/api/admin/backup') {
        return handleAdminBackup(request, env, { requireAdmin, json })
      }

      if (method === 'GET' && path === '/api/admin/backups') {
        return handleAdminBackupsList(request, env, { requireAdmin, json })
      }

      return json(env, request, { error: 'Niet gevonden.' }, 404)
    } catch (err) {
      console.error(err)
      return json(env, request, { error: 'Interne fout op de server.' }, 500)
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduled(event, env))
  },
}

async function handleLogin(request, env) {
  const body = await readJson(request)
  if (!body) return json(env, request, { error: 'Ongeldige JSON.' }, 400)

  const email = normalizeEmail(body.email)
  const code = String(body.code ?? '').trim()

  if (!email || !email.endsWith('@isw.info')) {
    return json(
      env,
      request,
      { error: 'Gebruik je school-e-mailadres (@isw.info).' },
      400,
    )
  }

  if (!env.ACCESS_CODE) {
    return json(
      env,
      request,
      {
        error:
          'Server mist ACCESS_CODE. Jasper moet `wrangler secret put ACCESS_CODE` zetten.',
      },
      503,
    )
  }

  if (code !== String(env.ACCESS_CODE)) {
    return json(env, request, { error: 'Onjuiste toegangscode.' }, 401)
  }

  const row = await env.DB.prepare(
    'SELECT email, is_admin, active FROM allowlist WHERE lower(email) = ?',
  )
    .bind(email)
    .first()

  if (!row || !row.active) {
    return json(
      env,
      request,
      {
        error:
          'Dit e-mailadres staat niet op de allowlist. Vraag de organisatie om toegang.',
      },
      403,
    )
  }

  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  await env.DB.prepare(
    'INSERT INTO sessions (token, email, expires_at) VALUES (?, ?, ?)',
  )
    .bind(token, email, expiresAt)
    .run()

  return json(env, request, {
    token,
    email,
    admin: Boolean(row.is_admin),
    expiresAt,
  })
}

async function handleLogout(request, env) {
  const token = bearerToken(request)
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
  }
  return json(env, request, { ok: true })
}

async function handlePlaceBid(request, env) {
  const session = await requireSession(request, env)
  if (session instanceof Response) return session

  const body = await readJson(request)
  if (!body) return json(env, request, { error: 'Ongeldige JSON.' }, 400)

  const kavelId = String(body.kavelId ?? '').trim()
  const amount = Number(body.bedrag)

  const kavel = await env.DB.prepare(
    'SELECT id, titel, start_bedrag, stap_grootte, actief FROM kavels WHERE id = ?',
  )
    .bind(kavelId)
    .first()

  if (!kavel || !kavel.actief) {
    return json(
      env,
      request,
      { error: 'Deze kavel is niet beschikbaar om op te bieden.' },
      400,
    )
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return json(env, request, { error: 'Vul een geldig bedrag in euro’s in.' }, 400)
  }

  // Vriendelijke pre-check (niet atomisch) voor duidelijke foutteksten.
  const stats = await hoogsteEnAantal(env.DB, kavelId, kavel.start_bedrag)
  const minimum =
    stats.aantalBiedingen === 0
      ? kavel.start_bedrag
      : stats.hoogsteBod + kavel.stap_grootte

  if (amount < minimum) {
    return teLaagBodResponse(env, request, kavel, stats, minimum)
  }

  const id = `b_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
  const tijdstip = new Date().toISOString()

  // Atomische insert: voorkomt concurrente gelijke biedingen (check-then-insert race).
  // Minimum = startbedrag als er nog geen biedingen zijn, anders MAX(bedrag)+stap.
  const inserted = await env.DB.prepare(
    `INSERT INTO biedingen (id, kavel_id, bedrag, email, tijdstip)
     SELECT ?, ?, ?, ?, ?
     WHERE ? >= (
       CASE
         WHEN (SELECT COUNT(*) FROM biedingen WHERE kavel_id = ?) = 0
           THEN (SELECT start_bedrag FROM kavels WHERE id = ?)
         ELSE (
           SELECT COALESCE(MAX(bedrag), 0) + (SELECT stap_grootte FROM kavels WHERE id = ?)
           FROM biedingen WHERE kavel_id = ?
         )
       END
     )`,
  )
    .bind(
      id,
      kavelId,
      amount,
      session.email,
      tijdstip,
      amount,
      kavelId,
      kavelId,
      kavelId,
      kavelId,
    )
    .run()

  if (!inserted.meta?.changes) {
    // Race verloren of stand intussen gestegen — herbereken foutmelding.
    const opnieuw = await hoogsteEnAantal(env.DB, kavelId, kavel.start_bedrag)
    const minNu =
      opnieuw.aantalBiedingen === 0
        ? kavel.start_bedrag
        : opnieuw.hoogsteBod + kavel.stap_grootte
    return teLaagBodResponse(env, request, kavel, opnieuw, minNu)
  }

  return json(env, request, {
    id,
    kavelId,
    bedrag: amount,
    tijdstip,
    // Geen e-mail terug in publieke response-shape; caller kent eigen sessie.
  })
}

function teLaagBodResponse(env, request, kavel, stats, minimum) {
  if (stats.aantalBiedingen === 0) {
    return json(
      env,
      request,
      {
        error: `Je bod is te laag. Het startbedrag is €${formatEuro(kavel.start_bedrag)}.`,
      },
      400,
    )
  }
  return json(
    env,
    request,
    {
      error: `Je bod is te laag. Het hoogste bod is nu €${formatEuro(stats.hoogsteBod)}. Je moet minstens €${formatEuro(kavel.stap_grootte)} meer bieden (dus €${formatEuro(minimum)} of hoger).`,
    },
    400,
  )
}

async function handleAdminBiedingen(request, env) {
  const session = await requireAdmin(request, env)
  if (session instanceof Response) return session

  const { results } = await env.DB.prepare(
    `SELECT b.id, b.kavel_id AS kavelId, k.titel AS kavelTitel,
            b.bedrag, b.email, b.tijdstip
     FROM biedingen b
     LEFT JOIN kavels k ON k.id = b.kavel_id
     ORDER BY b.tijdstip DESC`,
  ).all()

  return json(env, request, { biedingen: results ?? [] })
}

/** Hard-delete één bod. `/api/stand` herberekent daarna hoogste/totaal live uit D1. */
async function handleAdminDeleteBid(request, env, bidId) {
  const session = await requireAdmin(request, env)
  if (session instanceof Response) return session

  const id = String(bidId || '').trim()
  if (!id) {
    return json(env, request, { error: 'Bod-id ontbreekt.' }, 400)
  }

  const existing = await env.DB.prepare(
    'SELECT id, kavel_id AS kavelId, bedrag, email FROM biedingen WHERE id = ?',
  )
    .bind(id)
    .first()

  if (!existing) {
    return json(env, request, { error: 'Bod niet gevonden.' }, 404)
  }

  const result = await env.DB.prepare('DELETE FROM biedingen WHERE id = ?')
    .bind(id)
    .run()

  if (!result.meta?.changes) {
    return json(env, request, { error: 'Bod niet gevonden.' }, 404)
  }

  return json(env, request, {
    ok: true,
    id: existing.id,
    kavelId: existing.kavelId,
  })
}

async function handleAdminAllowlist(request, env) {
  const session = await requireAdmin(request, env)
  if (session instanceof Response) return session

  const { results } = await env.DB.prepare(
    'SELECT email, is_admin AS admin, active FROM allowlist ORDER BY email',
  ).all()

  return json(env, request, { allowlist: results ?? [] })
}

async function getStand(db) {
  const { results: kavels } = await db
    .prepare(
      `SELECT id, titel, omschrijving, start_bedrag AS startBedrag,
              stap_grootte AS stapGrootte, actief
       FROM kavels
       WHERE actief = 1
       ORDER BY sort_order ASC, titel COLLATE NOCASE ASC`,
    )
    .all()

  const stand = []
  let totaalOpgehaald = 0

  for (const k of kavels ?? []) {
    const stats = await hoogsteEnAantal(db, k.id, k.startBedrag)
    stand.push({
      id: k.id,
      titel: k.titel,
      omschrijving: k.omschrijving,
      stapGrootte: k.stapGrootte,
      startBedrag: k.startBedrag,
      // Zonder biedingen: toon startbedrag als richtprijs, telt NIET mee in totaal.
      hoogsteBod: stats.hoogsteBod,
      aantalBiedingen: stats.aantalBiedingen,
      minimumVolgendBod:
        stats.aantalBiedingen === 0
          ? k.startBedrag
          : stats.hoogsteBod + k.stapGrootte,
      // GEEN email / naam
    })
    // Totaal opgehaald = alleen echte biedingen (niet kale startbedragen).
    if (stats.aantalBiedingen > 0) {
      totaalOpgehaald += stats.hoogsteBod
    }
  }

  return { kavels: stand, totaalOpgehaald }
}

async function hoogsteEnAantal(db, kavelId, startBedrag) {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS aantal, COALESCE(MAX(bedrag), 0) AS maxBedrag
       FROM biedingen WHERE kavel_id = ?`,
    )
    .bind(kavelId)
    .first()

  const aantalBiedingen = Number(row?.aantal ?? 0)
  const maxBedrag = Number(row?.maxBedrag ?? 0)
  const hoogsteBod =
    aantalBiedingen === 0 ? Number(startBedrag) : Math.max(Number(startBedrag), maxBedrag)

  return { hoogsteBod, aantalBiedingen }
}

async function requireSession(request, env) {
  const token = bearerToken(request)
  if (!token) {
    return json(env, request, { error: 'Niet ingelogd.' }, 401)
  }

  const row = await env.DB.prepare(
    `SELECT s.token, s.email, s.expires_at, a.is_admin, a.active
     FROM sessions s
     JOIN allowlist a ON lower(a.email) = lower(s.email)
     WHERE s.token = ?`,
  )
    .bind(token)
    .first()

  if (!row || !row.active) {
    return json(env, request, { error: 'Sessie ongeldig. Log opnieuw in.' }, 401)
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
    return json(env, request, { error: 'Sessie verlopen. Log opnieuw in.' }, 401)
  }

  return {
    token,
    email: normalizeEmail(row.email),
    admin: Boolean(row.is_admin),
  }
}

async function requireAdmin(request, env) {
  const session = await requireSession(request, env)
  if (session instanceof Response) return session
  if (!session.admin) {
    return json(env, request, { error: 'Geen admin-rechten.' }, 403)
  }
  return session
}

function bearerToken(request) {
  const h = request.headers.get('Authorization') || ''
  const m = /^Bearer\s+(.+)$/i.exec(h)
  return m ? m[1].trim() : null
}

async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
}

function formatEuro(n) {
  return Number(n).toFixed(2).replace('.', ',')
}

function allowedOrigin(env, request) {
  const origin = request.headers.get('Origin')
  if (!origin) return '*'
  const list = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (list.includes(origin) || list.includes('*')) return origin
  // GitHub Pages preview / lokale poorten: zelfde host toestaan als in list-prefix
  if (origin.startsWith('http://127.0.0.1:') || origin.startsWith('http://localhost:')) {
    return origin
  }
  // Onbekende origin: geen allow-header (zie cors()). Niet list[0] echoën.
  return null
}

function cors(env, request, response) {
  const headers = new Headers(response.headers)
  const origin = allowedOrigin(env, request)
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization',
    )
    headers.set('Access-Control-Max-Age', '86400')
  }
  headers.set('Vary', 'Origin')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function json(env, request, data, status = 200, headOnly = false) {
  const body = headOnly ? null : JSON.stringify(data)
  return cors(
    env,
    request,
    new Response(body, {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }),
  )
}
