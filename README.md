# ISW Hoogeland — Kavelveiling (leerling-site)

Nederlandse website voor de goede-doelen kavelveiling (leerlingen).
Data via **Cloudflare Workers + D1** (niet localStorage / niet Graph).
Zonder `VITE_API_URL` valt de UI terug op een lokale **mock** met dezelfde API-vorm.

**Control Center (admin)** staat in een aparte repo (nog op localStorage — follow-up Cloudflare):
[`hgj-isw/kavel-veiling-admin`](https://github.com/hgj-isw/kavel-veiling-admin)

## Wat zit erin

- **Stand** (`/`): hoogste bod per kavel, totaal opgehaald, **zonder namen**; projectie-paginering (8/pagina, ~15s)
- **Bieden**: klik op een kaveltegel → popup (bedrag + bevestigen); geen apart bied-tabblad
- **Login**: school-e-mail (`@isw.info`) + toegangscode, gevalideerd tegen Worker-allowlist + `ACCESS_CODE`

## Cloudflare API

Zie [`workers/README.md`](./workers/README.md) voor deploy, D1, secrets en endpoints.

```bash
cd workers
npm install
npx wrangler login          # Jasper — agent heeft geen CF-login
# … D1 create, migrate, seed, secret put ACCESS_CODE, deploy
```

Live API (na deploy): `https://kavel-veiling-api.hgj-isw.workers.dev`

Frontend tegen live API:

```bash
VITE_API_URL=https://kavel-veiling-api.hgj-isw.workers.dev npm run build:pages
```

Toegangscode: tijdelijke testcode staat als Worker-secret; Jasper wijzigt met:
`cd workers && npx wrangler secret put ACCESS_CODE`

## Lokaal starten (mock)

```bash
npm install
npm run dev
```

Open de URL van Vite. Mock-toegangscode: `isw-veiling` (alleen lokaal; productie = Cloudflare-secret).

## Bouwen voor GitHub Pages

```bash
npm run build:pages
# of met API:
# VITE_API_URL=https://…workers.dev npm run build:pages
```

Deploy `dist/` naar branch `gh-pages` (pad `/`).

Live: https://hgj-isw.github.io/kavel-veiling-test/

## Privacy

Stand en bied-responses tonen geen biedersnamen/e-mails. E-mails staan alleen in D1 (admin-API later).

## Follow-up

- Jasper: Cloudflare-account, deploy Worker, `ACCESS_CODE`, allowlist, `VITE_API_URL` op Pages-build
- Admin-repo (`kavel-veiling-admin`) ook op dezelfde Cloudflare-API zetten
- Optioneel later: echte Microsoft-login i.p.v. e-mail + toegangscode
