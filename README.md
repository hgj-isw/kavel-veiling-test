# ISW Hoogeland — Kavelveiling (leerling-site, test)

Nederlandse **test**-website voor de goede-doelen kavelveiling (leerlingen).
Data staat in **localStorage** (nepdata). Later vervangbaar door SharePoint-lijsten.
De bestaande collega-lijst *Veiling en beidingen* wordt **niet** aangeroepen.

**Control Center (admin)** staat in een **aparte** repo/site:
[`hgj-isw/kavel-veiling-admin`](https://github.com/hgj-isw/kavel-veiling-admin) →
https://hgj-isw.github.io/kavel-veiling-admin/

## Wat zit erin

- **Stand** (`/`): hoogste bod per kavel, **zonder namen**; auto-ververs ~1 minuut
- **Bieden** (`/bieden`): bod alleen als ≥ hoogste + stap; foutmelding in gewone taal
- **Login (TEST)**: allowlist `hgj@isw.info` en `elt@isw.info` — knoppen “Inloggen als…” of PIN `1234`
- Geen admin-menu of `/admin`-route op deze site

## Opslag (testfase)

- localStorage-key leerling-site: `isw-kavel-veiling-v1`
- Admin-site gebruikt een **andere** key (`isw-kavel-veiling-admin-v1`)
- In de testfase zijn dit **twee losse stores** (zelfde browser-origin, bewust gescheiden).
  Echte gedeelde data komt later via SharePoint.

## Lokaal starten

```bash
npm install
npm run dev
```

Open de URL die Vite toont (meestal http://127.0.0.1:5173/kavel-veiling-test/).

## Bouwen voor GitHub Pages

```bash
npm run build:pages
```

Deploy `dist/` naar branch `gh-pages` (pad `/`).

Live: https://hgj-isw.github.io/kavel-veiling-test/

## Testen (kort)

1. Open de site → stand met 5 kavels (nepdata).
2. **Inloggen als ELT** → Bieden → te laag bod → Nederlandse fout.
3. Geldig bod → stand toont nieuw hoogste bedrag (zonder naam).
4. Geen “Control Center” in het menu; `/admin` bestaat niet op deze site.
5. Beheer: open de aparte admin-site (alleen `hgj@isw.info`).

## SharePoint later

Blokkers voor echte koppeling:

1. School SharePoint-site/rechten + Graph/SharePoint API of Power Apps (nu test zonder API).
2. App-registratie / ICT-goedkeuring voor aanroepen vanaf GitHub Pages (CORS + auth).
3. Nieuwe lijsten naast collega-lijst (`Kavels_Stand`, `Biedingen_Geheim`) — bestaande lijst niet wissen.
4. Echte `@isw.info`-login (Microsoft) i.p.v. test-allowlist.

Vervang later de functies in `src/data/store.js` door SharePoint/Graph-calls met dezelfde namen.
