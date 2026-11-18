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
| GET | `/api/admin/allowlist` | admin | Allowlist |

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

6. Deploy:

```bash
npm run deploy
```

Noteer de Worker-URL, bijv. `https://kavel-veiling-api.<account>.workers.dev`.

7. Frontend (repo-root) builden met die URL:

```bash
# in repo-root
VITE_API_URL=https://kavel-veiling-api.<account>.workers.dev npm run build:pages
```

Of zet in GitHub Actions / Pages-build-env: `VITE_API_URL=…`

8. CORS: `ALLOWED_ORIGINS` in `wrangler.toml` bevat al GitHub Pages + localhost.
   Voeg eventueel extra origins toe en herdeploy.

9. Allowlist aanpassen (SQL in dashboard of CLI):

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
