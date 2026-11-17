# ISW Hoogeland — Kavelveiling (test)

Nederlandse **test**-website voor de goede-doelen kavelveiling.
Data staat in **localStorage** (nepdata). Later vervangbaar door SharePoint-lijsten.
De bestaande collega-lijst *Veiling en beidingen* wordt **niet** aangeroepen.

## Wat zit erin

- **Stand** (`/`): hoogste bod per kavel, **zonder namen**; auto-ververs ~1 minuut
- **Bieden** (`/bieden`): bod alleen als ≥ hoogste + stap; foutmelding in gewone taal
- **Login (TEST)**: allowlist `hgj@isw.info` en `elt@isw.info` — knoppen “Inloggen als…” of PIN `1234`
- **Control Center** (`/admin`): alleen `hgj@isw.info` — kavels CRUD, stapgrootte, alle biedingen + e-mail, bod verwijderen

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

Zet de inhoud van `dist/` online via GitHub Pages (branch `gh-pages` of `/docs`, of Actions).
Repo-naam bij voorkeur: `kavel-veiling-test` (base-path staat zo in `vite.config.js`).

### Repo aanmaken en pushen (Jasper)

Op jouw laptop (met `gh` ingelogd als `hgj-isw`):

```bash
# map met deze code
cd kavel-veiling-test

gh repo create hgj-isw/kavel-veiling-test --public --source=. --remote=origin --push
# of --private als je de test niet publiek wilt

# daarna Pages: Settings → Pages → Deploy from branch → gh-pages
# of: npm run build:pages && npx gh-pages -d dist
```

Publieke URL wordt dan ongeveer:

`https://hgj-isw.github.io/kavel-veiling-test/`

## Testen (kort)

1. Open de site → stand met 5 kavels (nepdata).
2. **Inloggen als ELT** → Bieden → te laag bod → Nederlandse fout.
3. Geldig bod → stand toont nieuw hoogste bedrag (zonder naam).
4. Uitloggen → **Inloggen als Jasper (admin)** → Control Center: biedingen met e-mail, kavel bewerken, bod verwijderen.
5. ELT mag `/admin` niet gebruiken.

## SharePoint later

Blokkers voor echte koppeling:

1. School SharePoint-site/rechten + Graph/SharePoint API of Power Apps (nu test zonder API).
2. App-registratie / ICT-goedkeuring voor aanroepen vanaf GitHub Pages (CORS + auth).
3. Nieuwe lijsten naast collega-lijst (`Kavels_Stand`, `Biedingen_Geheim`) — bestaande lijst niet wissen.
4. Echte `@isw.info`-login (Microsoft) i.p.v. test-allowlist.

Vervang later de functies in `src/data/store.js` door SharePoint/Graph-calls met dezelfde namen.
