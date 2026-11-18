# Cloudflare Worker — Kavelveiling API

Backend voor de leerling-site: **D1** (kavels, biedingen, allowlist, sessions).
De publieke stand toont **geen** biedersnamen/e-mails.

## Endpoints

| Methode | Pad | Auth | Doel |
|---------|-----|------|------|
| GET | `/api/health` | nee | Healthcheck |
| GET | `/api/stand` | nee | Kavels + hoogste bod + totaal (zonder namen) |
| POST | `/api/auth/login` | nee | `{ email, code }` → token |
| POST | `/api/auth/logout` | Bearer | Sessie wissen |
| GET | `/api/me` | Bearer | Huidige gebruiker |
| POST | `/api/bids` | Bearer | `{ kavelId, bedrag }` |
| GET | `/api/admin/biedingen` | admin | Alle biedingen **met** e-mail |
| DELETE | `/api/admin/biedingen/:id` | admin | Één onzinbod hard-deleten (geen bulk); stand herberekent live |
| GET | `/api/admin/allowlist` | admin | Allowlist |
| GET | `/api/admin/export?format=json\|csv` | admin | Download kavels + biedingen (JSON of CSV) |
| POST | `/api/admin/backup` | admin | On-demand snapshot naar R2 |
| GET | `/api/admin/backups` | admin | Lijst R2-backup objecten |

**Backup:** cron elk uur schrijft JSON naar R2 bucket `kavel-veiling-backups` (`BACKUP_BUCKET`). Plan: project-doc `docs/biedingen-backup.md`.

## Wat Jasper moet zetten (eenmalig)

1. **Cloudflare-account** + Workers/D1 ingeschakeld  
   https://dash.cloudflare.com/

2. In deze map:

```bash
cd workers
npm install
npx wrangler login
```

3. D1-database aanmaken en IDs in `wrangler.toml` zetten:

```bash
npx wrangler d1 create kavel-veiling
# Plak database_id (en eventueel account_id) in wrangler.toml
```

4. Schema + seed (remote):

```bash
npm run db:migrate:remote
npm run db:seed:remote
```

5. **Secret** (nooit in git):

```bash
npx wrangler secret put ACCESS_CODE
# Voer een sterke school-toegangscode in (leerlingen + allowlist-e-mail gebruiken die)
```

6. **R2-bucket** voor biedingen-backup (eenmalig):

```bash
npx wrangler r2 bucket create kavel-veiling-backups
```

Dashboard-alternatief: R2 → Create bucket → naam `kavel-veiling-backups`. Binding staat al in `wrangler.toml`.

7. Deploy:

```bash
npm run deploy
```

Live Worker-URL: `https://kavel-veiling-api.hgj-isw.workers.dev`  
Cron `0 * * * *` exporteert kavels+biedingen naar R2; admin kan ook `POST /api/admin/backup` of `GET /api/admin/export`.

8. Frontend (repo-root) builden met die URL:

```bash
# in repo-root
VITE_API_URL=https://kavel-veiling-api.hgj-isw.workers.dev npm run build:pages
```

Of zet in GitHub Actions / Pages-build-env: `VITE_API_URL=…`

9. CORS: `ALLOWED_ORIGINS` in `wrangler.toml` bevat al GitHub Pages + localhost.
   Voeg eventueel extra origins toe en herdeploy.

10. Allowlist aanpassen (SQL in dashboard of CLI):

```sql
INSERT INTO allowlist (email, is_admin, active) VALUES ('leerling@isw.info', 0, 1);
```

## Lokaal (zonder deploy)

```bash
cp .dev.vars.example .dev.vars
# ACCESS_CODE invullen in .dev.vars
npm run db:migrate:local
npm run db:seed:local
npm run dev
```

Frontend:

```bash
# repo-root
VITE_API_URL=http://127.0.0.1:8787 npm run dev
```

Zonder `VITE_API_URL` gebruikt de UI een **ingebouwde mock** met dezelfde API-vorm (handig zonder Cloudflare-login).

## Privacy

- `/api/stand` en bid-responses bevatten **geen** e-mail/naam van bieders.
- E-mails staan alleen in D1 `biedingen` en admin-endpoints.

## Admin-site follow-up

`kavel-veiling-admin` staat **nog niet** op deze API. Volgende stap: admin-repo
naar dezelfde Worker laten wijzen (CRUD kavels, biedingen wissen, allowlist).

## Secrets

| Secret | Via | Doel |
|--------|-----|------|
| `ACCESS_CODE` | `wrangler secret put` | Login-code naast allowlist-e-mail |
| `ADMIN_TOKEN` | optioneel later | Extra admin-bescherming |

Geen tokens/codes in commits, Issues of README-voorbeelden met echte waarden.
