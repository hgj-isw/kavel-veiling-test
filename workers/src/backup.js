/**
 * Periodieke + on-demand backup van kavels + biedingen naar R2.
 * Admin-export (JSON/CSV) voor download zonder SharePoint.
 */

const BACKUP_PREFIX = 'backups/'
const LATEST_KEY = 'backups/latest.json'

/**
 * @param {D1Database} db
 */
export async function buildBackupPayload(db) {
  const { results: kavels } = await db
    .prepare(
      `SELECT id, titel, omschrijving, start_bedrag AS startBedrag,
              stap_grootte AS stapGrootte, actief, sort_order AS sortOrder
       FROM kavels
       ORDER BY sort_order ASC, titel COLLATE NOCASE ASC`,
    )
    .all()

  const { results: biedingen } = await db
    .prepare(
      `SELECT b.id, b.kavel_id AS kavelId, k.titel AS kavelTitel,
              b.bedrag, b.email, b.tijdstip
       FROM biedingen b
       LEFT JOIN kavels k ON k.id = b.kavel_id
       ORDER BY b.tijdstip ASC`,
    )
    .all()

  const exportedAt = new Date().toISOString()
  return {
    exportedAt,
    service: 'kavel-veiling-api',
    counts: {
      kavels: (kavels ?? []).length,
      biedingen: (biedingen ?? []).length,
    },
    kavels: kavels ?? [],
    biedingen: biedingen ?? [],
  }
}

/**
 * Schrijf snapshot naar R2 (hourly key + latest). No-op fout als binding ontbreekt.
 * @param {{ DB: D1Database, BACKUP_BUCKET?: R2Bucket }} env
 */
export async function writeBackupToR2(env) {
  if (!env.BACKUP_BUCKET) {
    return {
      ok: false,
      error:
        'R2-binding BACKUP_BUCKET ontbreekt. Maak bucket kavel-veiling-backups en herdeploy.',
    }
  }

  const payload = await buildBackupPayload(env.DB)
  const body = JSON.stringify(payload, null, 2)
  const stamp = payload.exportedAt.replace(/[:.]/g, '-').replace(/Z$/, 'Z')
  const hourlyKey = `${BACKUP_PREFIX}hourly/${stamp}.json`

  await env.BACKUP_BUCKET.put(hourlyKey, body, {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: {
      exportedAt: payload.exportedAt,
      biedingen: String(payload.counts.biedingen),
      kavels: String(payload.counts.kavels),
    },
  })

  await env.BACKUP_BUCKET.put(LATEST_KEY, body, {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: {
      exportedAt: payload.exportedAt,
      biedingen: String(payload.counts.biedingen),
      kavels: String(payload.counts.kavels),
    },
  })

  return {
    ok: true,
    exportedAt: payload.exportedAt,
    keys: { hourly: hourlyKey, latest: LATEST_KEY },
    counts: payload.counts,
  }
}

/**
 * Cron entrypoint — scheduled(event, env, ctx)
 */
export async function handleScheduled(_event, env) {
  const result = await writeBackupToR2(env)
  if (!result.ok) {
    console.error('backup cron failed:', result.error)
    return result
  }
  console.log(
    `backup ok ${result.exportedAt} biedingen=${result.counts.biedingen} → ${result.keys.hourly}`,
  )
  return result
}

export function biedingenToCsv(biedingen) {
  const header = ['id', 'kavelId', 'kavelTitel', 'bedrag', 'email', 'tijdstip']
  const escape = (v) => {
    const s = v == null ? '' : String(v)
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [header.join(',')]
  for (const row of biedingen ?? []) {
    lines.push(
      [
        row.id,
        row.kavelId,
        row.kavelTitel,
        row.bedrag,
        row.email,
        row.tijdstip,
      ]
        .map(escape)
        .join(','),
    )
  }
  return lines.join('\n') + '\n'
}

/**
 * GET /api/admin/export?format=json|csv
 * @param {(env, request, data, status?, headOnly?) => Response} json
 * @param {(env, request, response) => Response} cors
 */
export async function handleAdminExport(request, env, { requireAdmin, json, cors }) {
  const session = await requireAdmin(request, env)
  if (session instanceof Response) return session

  const url = new URL(request.url)
  const format = String(url.searchParams.get('format') || 'json').toLowerCase()
  const payload = await buildBackupPayload(env.DB)
  const headOnly = request.method === 'HEAD'

  if (format === 'csv') {
    const csv = biedingenToCsv(payload.biedingen)
    const stamp = payload.exportedAt.slice(0, 19).replace(/[:T]/g, '-')
    return cors(
      env,
      request,
      new Response(headOnly ? null : csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="biedingen-${stamp}.csv"`,
          'Cache-Control': 'no-store',
        },
      }),
    )
  }

  return json(env, request, payload, 200, headOnly)
}

/**
 * POST /api/admin/backup — on-demand R2 snapshot
 */
export async function handleAdminBackup(request, env, { requireAdmin, json }) {
  const session = await requireAdmin(request, env)
  if (session instanceof Response) return session

  const result = await writeBackupToR2(env)
  if (!result.ok) {
    return json(env, request, { error: result.error }, 503)
  }
  return json(env, request, result)
}

/**
 * GET /api/admin/backups — list R2 objects under backups/
 */
export async function handleAdminBackupsList(request, env, { requireAdmin, json }) {
  const session = await requireAdmin(request, env)
  if (session instanceof Response) return session

  if (!env.BACKUP_BUCKET) {
    return json(
      env,
      request,
      {
        error:
          'R2-binding BACKUP_BUCKET ontbreekt. Maak bucket kavel-veiling-backups en herdeploy.',
        backups: [],
      },
      503,
    )
  }

  const listed = await env.BACKUP_BUCKET.list({ prefix: BACKUP_PREFIX, limit: 100 })
  const backups = (listed.objects ?? []).map((o) => ({
    key: o.key,
    size: o.size,
    uploaded: o.uploaded,
  }))

  return json(env, request, {
    backups,
    truncated: Boolean(listed.truncated),
  }, 200, request.method === 'HEAD')
}
