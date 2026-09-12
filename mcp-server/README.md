# VolleyWarrior MCP-server

MCP-server voor de VolleyWarrior-app. Geeft Claude Code toegang tot de draaiende
app, de opgeslagen wedstrijddata, de Nevobo-competitiegegevens en de build.

Gebouwd op `@modelcontextprotocol/sdk` 1.30.0, `zod` 4.5.2 en `ws` 8.21.3.

## Installeren

```bash
cd mcp-server
npm install
```

Registreren bij Claude Code (vanuit de projectmap):

```bash
claude mcp add volleywarrior -- node "mcp-server/src/index.js"
```

Of handmatig in `.mcp.json` in de projectroot:

```json
{
  "mcpServers": {
    "volleywarrior": {
      "command": "node",
      "args": ["mcp-server/src/index.js"]
    }
  }
}
```

Controleren met `/mcp` in Claude Code.

## De live-brug aanzetten

De MCP-server opent een WebSocket-server op poort **7823**. De app verbindt
daarmee als client. In de app staat de brug standaard **uit**; aanzetten kan op
twee manieren:

| Manier | Hoe |
|---|---|
| URL | `http://localhost:5173/?mcpbridge=1` |
| localStorage | `localStorage.setItem('vwMcpBridge','1'); location.reload();` |

Vanaf een tablet die naar je laptop verbindt:

```js
localStorage.setItem('vwMcpBridgeUrl', 'ws://192.168.1.20:7823');
```
of `?mcpbridgeurl=ws://192.168.1.20:7823` in de URL.

Uitzetten: `localStorage.removeItem('vwMcpBridge')` en herladen (of de
URL-parameter weglaten).

Controleren of het werkt: vraag Claude om `vw_live_status`.

## Tools

### Live (app moet draaien en verbonden zijn)

| Tool | Doet |
|---|---|
| `vw_live_status` | Status van de brug: luistert hij, is de app verbonden, wanneer kwam de laatste state binnen |
| `vw_live_state` | Actuele stand, sets, opstelling, service, timeouts, rotatie, bank |
| `vw_live_score_point` | Punt registreren (`team`, `type`, `x`, `y`, `playerId`) |
| `vw_live_undo` | Laatste punt terugdraaien |
| `vw_live_timeout` | Timeout nemen |
| `vw_live_substitute` | Wissel doorvoeren (app past zijn eigen wisselregels toe) |
| `vw_live_set_serving` | Serverend team zetten |
| `vw_live_new_set` | Nieuwe set starten |
| `vw_sync_from_app` | Spelers en wedstrijden uit de app naar de lokale datastore halen |

`vw_live_score_point` volgt de conventie van de app: `team` is de veldhelft
waarop je tikt, en dat is bij elk punttype behalve `block` meteen het scorende
team. Bij `block` scoort de tegenpartij.

### Wedstrijddata en analyse

| Tool | Doet |
|---|---|
| `vw_store_info` | Waar staat de datastore, hoeveel zit erin |
| `vw_import_data` | localStorage-export importeren (`merge` optioneel) |
| `vw_list_players` | Spelerslijst |
| `vw_list_matches` | Wedstrijden, nieuwste eerst, filterbaar op tegenstander |
| `vw_match_detail` | Setstanden, punttypes met percentages, wissels |
| `vw_analyze_match` | Pro-analyse: rotaties, receptie, aanvalsefficiëntie, servicezones, reeksen |
| `vw_player_report` | Rapport per speler over alle wedstrijden heen |

De analyse is een 1-op-1 port van `src/helpers/proAnalysis.js`, zodat de cijfers
gelijk zijn aan de Stats-tab en de PDF-export. **Pas beide bestanden samen aan.**

### Nevobo

| Tool | Doet |
|---|---|
| `vw_nevobo_search_clubs` | Vereniging zoeken op naam, plaats of code |
| `vw_nevobo_teams` | Teams van een vereniging |
| `vw_nevobo_matches` | Wedstrijdschema van een team (`upcomingOnly` optioneel) |

### Build

| Tool | Doet |
|---|---|
| `vw_app_info` | Versie, app-id, git-branch, aanwezige APK's |
| `vw_build_web` | `npm run build` |
| `vw_cap_sync` | `npx cap sync` |
| `vw_build_apk` | Volledige APK-build; draait alleen met `confirm: true` |

## Instellingen

| Variabele | Standaard | Doet |
|---|---|---|
| `VW_BRIDGE_PORT` | `7823` | Poort van de live-brug |
| `VW_BRIDGE_TIMEOUT` | `8000` | Time-out (ms) op een verzoek aan de app |
| `VW_DATA_FILE` | `mcp-server/data/store.json` | Waar de datastore staat |
| `VW_NEVOBO_API` | `https://api.nevobo.nl` | Nevobo-basis-URL |
| `VW_NEVOBO_TIMEOUT` | `15000` | Time-out (ms) op Nevobo-verzoeken |

## Testen

99 tests in drie suites.

```bash
npm test           # 61 — MCP-server over stdio, brug, analyse, Nevobo, build
npm run test:steps # 21 — stappenmachine van de app-brug
npm run test:all   # bovenstaande twee achter elkaar
```

End-to-end met de echte app in een headless Chrome (17 tests). Draait tegen de
**productiebuild**; de test start Chrome zelf met een eigen tijdelijk profiel,
dus je eigen browser blijft ongemoeid.

```bash
npm run build && npm run preview   # in de projectmap, poort 4173
npm run test:e2e                   # in mcp-server/
```

| Variabele | Doet |
|---|---|
| `VW_SKIP_BUILD=1` | Slaat de echte Vite-build in suite 1 over |
| `VW_APP_URL` | Andere app-URL voor de E2E (standaard `http://localhost:4173`) |
| `VW_CHROME` | Pad naar chrome.exe als hij niet op de standaardplek staat |
| `VW_E2E_MANUAL=1` | Start geen browser; open zelf de app met `?mcpbridge=1` |

De Nevobo-tests worden overgeslagen als er geen internet is.

> De E2E draait tegen de productiebuild en niet tegen `npm run dev`, omdat een
> vooraf gezette spelerslijst in dev niet blijft staan: React StrictMode voert
> de effecten in `useMatchState` dubbel uit, waardoor het opslag-effect de
> zojuist geladen selectie overschrijft met de standaardselectie. Tegen de
> dev-server slaat de E2E de wisseltests over in plaats van te falen.

## Hoe de brug werkt

De MCP-server is de WebSocket-server, de app is de client. Dat scheelt een
poort openen op de tablet en werkt ook over het netwerk.

```
app  -> server   {type:'hello',    role:'app', appVersion, userAgent}
server -> app    {type:'request',  id, method, params}
app  -> server   {type:'response', id, ok, result | error}
app  -> server   {type:'event',    event:'state', state}
```

Veel acties in `useMatchState` lopen via een tussenliggende popup-state
(punt → punttype → speler, timeout → bevestigen, bankspeler kiezen → wisselen).
Die tweede stap kan pas ná een nieuwe render, want de eerste leest state die op
dat moment nog niet is bijgewerkt. `src/helpers/mcpBridge.js` lost dat op met
een stappenmachine die één stap per render zet.
