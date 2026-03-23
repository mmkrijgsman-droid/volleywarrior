# VolleyWarrior Backend Plan — Express + SQLite

## Context

VolleyWarrior is een client-side volleyball tracking app (React + Vite + Capacitor). Alle data staat nu in localStorage. We willen data delen tussen devices en de app online draaien, plus Nevobo wedstrijden automatisch ophalen. Daarom bouwen we een Express.js + SQLite backend.

**Keuzes**: Monorepo (`server/` folder), geen auth (nu), Nevobo team: VCV HS 4 (code CKL9Y5O).

---

## Fase 1: Project setup + Express server

**Doel**: Draaiende Express server met health check.

**Bestanden aanmaken**:
- `server/package.json` — deps: express, better-sqlite3, cors
- `server/index.js` — Express app, CORS, health endpoint `/api/health`
- `server/middleware/errorHandler.js` — centralized error handler

**Scripts**: `npm start` (node index.js), `npm run dev` (node --watch index.js)

**Verificatie**: `curl http://localhost:3001/api/health` → `{"status":"ok"}`

---

## Fase 2: Database schema + initialisatie

**Doel**: SQLite database met tabellen voor players en matches.

**Bestanden aanmaken**:
- `server/db/database.js` — initDB(), getDB() met better-sqlite3, WAL mode
- `server/db/schema.sql` — DDL voor `players` en `matches` tabellen

**Schema**:
- `players`: id (AUTOINCREMENT), name, number, role (CHECK constraint: setter/outside/middle/opposite/libero), is_libero, created_at, updated_at
- `matches`: id (INTEGER, frontend's Date.now()), opponent, date, final_score_home, final_score_away, winner, saved_heatmaps (JSON), substitutions (JSON), point_stats (JSON), score_history (JSON), created_at

**Verificatie**: Server start → log "Database initialized", `volleywarrior.db` bestaat in `server/db/`

---

## Fase 3: Players CRUD API

**Doel**: REST endpoints voor spelerbeheer.

**Bestand aanmaken**: `server/routes/players.js`

| Endpoint | Functie |
|----------|---------|
| `GET /api/players` | Lijst alle spelers |
| `GET /api/players/:id` | Eén speler |
| `POST /api/players` | Speler aanmaken |
| `PUT /api/players/:id` | Speler updaten (incl. libero-logica) |
| `DELETE /api/players/:id` | Speler verwijderen |

**Details**:
- `formatPlayer()` converteert snake_case DB → camelCase frontend (is_libero → isLibero)
- Libero-logica: isLibero=true zet role op 'libero', isLibero=false zet role terug naar 'outside'
- Activeren in `server/index.js`: `app.use('/api/players', require('./routes/players'))`

**Verificatie**: curl POST/GET/PUT/DELETE testen

---

## Fase 4: Matches CRUD API

**Doel**: REST endpoints voor wedstrijdbeheer met geneste JSON data.

**Bestand aanmaken**: `server/routes/matches.js`

| Endpoint | Functie |
|----------|---------|
| `GET /api/matches` | Lijst alle wedstrijden (nieuwste eerst) |
| `GET /api/matches/:id` | Eén wedstrijd |
| `POST /api/matches` | Wedstrijd opslaan (accepteert frontend Date.now() ID) |
| `PUT /api/matches/:id` | Wedstrijd updaten |
| `DELETE /api/matches/:id` | Wedstrijd verwijderen |

**Details**:
- `formatMatch()` converteert DB rij → frontend formaat
- JSON.parse voor nested velden (savedHeatmaps, substitutions, pointStats, scoreHistory)
- finalScore wordt gesplit in final_score_home/final_score_away kolommen

**Match data structuur** (wat de API accepteert):
```json
{
  "id": 1709472000000,
  "opponent": "Shot HS 4",
  "date": "2026-02-15",
  "finalScore": { "home": 3, "away": 1 },
  "winner": "home",
  "savedHeatmaps": [{ "setNumber": 1, "data": [{"team":"home","x":45,"y":30,"type":"attack"}], "finalScore": "25-20", "winner": "home" }],
  "substitutions": [{ "playerOut": 3, "playerIn": 8 }],
  "pointStats": { "home": {"direct":4,"sideout":12,"block":3,"attack":6,"error":0}, "away": {"direct":2,"sideout":10,"block":1,"attack":5,"error":7} },
  "scoreHistory": [{ "score": "1-0", "team": "home", "type": "direct" }]
}
```

**Verificatie**: curl met volledige match data

---

## Fase 5: Nevobo RSS integratie

**Doel**: VCV HS 4 wedstrijdresultaten en programma ophalen van Nevobo API.

**Extra dependency**: `rss-parser`

**Bestand aanmaken**: `server/routes/nevobo.js`

| Endpoint | Bron RSS Feed |
|----------|---------------|
| `GET /api/nevobo/results` | `https://api.nevobo.nl/export/team/CKL9Y5O/heren/4/resultaten.rss` |
| `GET /api/nevobo/schedule` | `https://api.nevobo.nl/export/team/CKL9Y5O/heren/4/programma.rss` |

**Features**:
- RSS XML parsing met rss-parser (custom field: `nevobo:status`)
- 5-minuten in-memory cache
- `parseResult()`: extraheer teams, set score, setstanden, datum uit RSS title
  - Title formaat: `"VCV HS 4 - Shot HS 4, Uitslag: 4-0, Setstanden: 25-11, 25-17, 25-17, 25-12"`
- `parseScheduleItem()`: extraheer teams, datum, locatie uit RSS title
  - Title formaat: `"11 mrt 21:30: VIVES HS 7 - VCV HS 4"`

**Response formaat results**:
```json
{
  "homeTeam": "VCV HS 4",
  "awayTeam": "Shot HS 4",
  "setsHome": 4,
  "setsAway": 0,
  "setScores": [{"home": 25, "away": 11}, {"home": 25, "away": 17}],
  "date": "2026-02-15T...",
  "status": "gespeeld",
  "link": "https://..."
}
```

**Verificatie**: curl beide endpoints, check parsed JSON, check caching

---

## Fase 6: Seed data + migratie-endpoint + E2E test

**Doel**: Development data, migratiemogelijkheid vanuit localStorage, volledige API test.

**Bestanden aanmaken**:
- `server/db/seed.js` — vult DB met 7 default spelers (zelfde als useMatchState.js defaults):
  - Speler 1 (setter), Speler 2 (outside), Speler 3 (middle), Speler 4 (opposite), Speler 5 (outside), Speler 6 (middle), Libero (libero)
- `server/test.sh` — bash script dat alle endpoints test met curl

**Toevoegen aan `server/index.js`**:
- `POST /api/migrate` — bulk import van players + matches array (INSERT OR REPLACE)
- Accepteert: `{ players: [...], matches: [...] }` in exact hetzelfde formaat als localStorage
- Retourneert: `{ playersImported: N, matchesImported: N, errors: [] }`

**Scripts**: `npm run seed` in server/package.json

**Verificatie**: `npm run seed` + `bash test.sh` → alle tests PASS

---

## Fase 7: Frontend integratie voorbereiding

**Doel**: Proxy configuratie en API service layer klaarzetten. Nog GEEN React componenten aanpassen.

**Bestanden wijzigen/aanmaken**:
- `vite.config.js` — proxy `/api` → `http://localhost:3001` toevoegen
- `src/services/api.js` — fetch wrapper:
  ```js
  export const playersAPI = { list, get, create, update, delete }
  export const matchesAPI = { list, get, create, update, delete }
  export const nevoboAPI  = { results, schedule }
  export const migrateAPI = { import }
  ```
- Root `package.json` — `dev:server` en `dev:all` scripts toevoegen

**Mapping guide** (voor latere integratie in `useMatchState.js`):

| Huidig (localStorage) | Locatie | Toekomstig (API) |
|---|---|---|
| `localStorage.getItem('volleyballPlayers')` | regel 65 | `playersAPI.list()` |
| `localStorage.setItem('volleyballPlayers', ...)` | regel 74 | Individuele CRUD calls |
| `localStorage.getItem('volleyballMatches')` | regel 80 | `matchesAPI.list()` |
| `saveMatch()` → localStorage | regel 255 | `matchesAPI.create(data)` |

**Verificatie**: `curl http://localhost:5173/api/health` via Vite proxy → response van Express

---

## Bestanden overzicht na alle fases

```
server/
  package.json                (Fase 1)
  index.js                    (Fase 1, uitgebreid in 3-6)
  middleware/errorHandler.js  (Fase 1)
  db/database.js              (Fase 2)
  db/schema.sql               (Fase 2)
  db/seed.js                  (Fase 6)
  db/volleywarrior.db         (auto-generated)
  routes/players.js           (Fase 3)
  routes/matches.js           (Fase 4)
  routes/nevobo.js            (Fase 5)
  test.sh                     (Fase 6)
vite.config.js                (Fase 7 — proxy toevoegen)
src/services/api.js           (Fase 7 — API wrapper)
```

## Volledige API referentie

| Method | Endpoint | Beschrijving | Status |
|--------|----------|-------------|--------|
| GET | `/api/health` | Health check | `200` |
| GET | `/api/players` | Lijst alle spelers | `200` |
| GET | `/api/players/:id` | Eén speler | `200/404` |
| POST | `/api/players` | Speler aanmaken | `201` |
| PUT | `/api/players/:id` | Speler updaten | `200/404` |
| DELETE | `/api/players/:id` | Speler verwijderen | `204/404` |
| GET | `/api/matches` | Lijst alle wedstrijden | `200` |
| GET | `/api/matches/:id` | Eén wedstrijd | `200/404` |
| POST | `/api/matches` | Wedstrijd opslaan | `201` |
| PUT | `/api/matches/:id` | Wedstrijd updaten | `200/404` |
| DELETE | `/api/matches/:id` | Wedstrijd verwijderen | `204/404` |
| GET | `/api/nevobo/results` | VCV HS 4 resultaten | `200` |
| GET | `/api/nevobo/schedule` | VCV HS 4 programma | `200` |
| POST | `/api/migrate` | Bulk import localStorage data | `200` |

## Kritieke bestanden (bestaand, niet aanpassen tot na fase 7)

- `src/hooks/useMatchState.js` — data-contract: saveMatch (regel 255), loadMatch (regel 274)
- `src/helpers/constants.js` — role definities die matchen met DB CHECK constraint
- `src/tabs/MatchesTab.jsx` — consumer van match data, definieert verwachte props
