/**
 * Testsuite voor de VolleyWarrior MCP-server.
 *
 * Start de server als echt kindproces over stdio en praat ermee als MCP-client,
 * dus precies zoals Claude Code dat doet. De live-brug wordt getest met een
 * nagebootste app: een gewone WebSocket-client die de commando's beantwoordt.
 *
 * Netwerktests (Nevobo) worden overgeslagen als er geen internet is.
 * Draaien: npm test        (of: node test/run-tests.mjs)
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import WebSocket from 'ws';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(here, '..', 'src', 'index.js');
const BRIDGE_PORT = Number(process.env.VW_TEST_PORT || 7899);

// ---------------------------------------------------------------------------
// Mini test-runner
// ---------------------------------------------------------------------------
const results = [];
let currentGroup = '';

function group(name) {
  currentGroup = name;
  console.log(`\n\x1b[1m${name}\x1b[0m`);
}

async function test(name, fn) {
  const started = Date.now();
  try {
    await fn();
    const ms = Date.now() - started;
    results.push({ group: currentGroup, name, status: 'pass', ms });
    console.log(`  \x1b[32mPASS\x1b[0m ${name} \x1b[90m(${ms}ms)\x1b[0m`);
  } catch (err) {
    if (err && err.__skip) {
      results.push({ group: currentGroup, name, status: 'skip', reason: err.message });
      console.log(`  \x1b[33mSKIP\x1b[0m ${name} \x1b[90m— ${err.message}\x1b[0m`);
      return;
    }
    results.push({ group: currentGroup, name, status: 'fail', error: err.message });
    console.log(`  \x1b[31mFAIL\x1b[0m ${name}`);
    console.log(`       \x1b[31m${err.message}\x1b[0m`);
  }
}

function skip(reason) {
  const e = new Error(reason);
  e.__skip = true;
  throw e;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertie mislukt');
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'ongelijk'}: verwacht ${JSON.stringify(expected)}, kreeg ${JSON.stringify(actual)}`);
  }
}

function assertDeep(actual, expected, msg) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${msg || 'ongelijk'}:\n  verwacht ${b}\n  kreeg    ${a}`);
}

// ---------------------------------------------------------------------------
// Testfixture: een wedstrijd met volledige Pro-data, met de hand doorgerekend
// ---------------------------------------------------------------------------
const PLAYERS = [
  { id: 1, name: 'Anouk', number: 1, role: 'setter' },
  { id: 2, name: 'Bram', number: 2, role: 'outside' },
  { id: 3, name: 'Cara', number: 3, role: 'middle' },
  { id: 4, name: 'Daan', number: 4, role: 'opposite' },
  { id: 7, name: 'Libero', number: 7, role: 'libero', isLibero: true },
];

// 8 punten. Conventie uit de app (zie proAnalysis.js): `team` is de helft waarop
// getikt is en dat is bij elk punttype behalve 'block' meteen het SCORENDE team.
// Bij 'error' scoort dus de partij die het punt krijgt, en wijst playerId naar de
// speler die de fout maakte (aan de andere kant). srvTeam = wie die rally serveerde.
const HEATMAP = [
  { team: 'home', type: 'direct', x: 50, y: 10, playerId: 1, srvTeam: 'home', rotation: 1, serveZone: 1 },
  { team: 'home', type: 'attack', x: 40, y: 20, playerId: 2, srvTeam: 'home', rotation: 1, serveZone: 1 },
  { team: 'home', type: 'attack', x: 60, y: 30, playerId: 2, srvTeam: 'away', rotation: 2, receptionQuality: 'A', receptionPlayerId: 7 },
  { team: 'away', type: 'attack', x: 30, y: 80, playerId: 5, srvTeam: 'away', rotation: 2 },
  { team: 'home', type: 'block', x: 50, y: 95, playerId: 3, srvTeam: 'home', rotation: 2 },
  // Bram (2) slaat de bal uit: away krijgt het punt, dus team = 'away'.
  { team: 'away', type: 'error', x: 20, y: 40, playerId: 2, srvTeam: 'away', rotation: 3, errorSubtype: 'attack', receptionQuality: 'C', receptionPlayerId: 7 },
  { team: 'home', type: 'sideout', x: 55, y: 25, playerId: 4, srvTeam: 'away', rotation: 3, receptionQuality: 'B', receptionPlayerId: 2 },
  { team: 'home', type: 'direct', x: 50, y: 15, playerId: 1, srvTeam: 'home', rotation: 3, serveZone: 5 },
];

const SCORE_HISTORY = [
  { score: '1-0', team: 'home', type: 'direct', playerId: 1 },
  { score: '2-0', team: 'home', type: 'attack', playerId: 2 },
  { score: '3-0', team: 'home', type: 'attack', playerId: 2 },
  { score: '3-1', team: 'away', type: 'attack', playerId: 5 },
  { score: '3-2', team: 'away', type: 'block', playerId: 3 },
  { score: '3-3', team: 'away', type: 'error', playerId: 2 },
  { score: '4-3', team: 'home', type: 'sideout', playerId: 4 },
  { score: '5-3', team: 'home', type: 'direct', playerId: 1 },
];

const PRO_MATCH = {
  id: 1000,
  opponent: 'Testers HS1',
  date: '2026-08-01',
  finalScore: { home: 3, away: 1 },
  winner: 'home',
  formationSystem: '5-1',
  savedHeatmaps: [
    { setNumber: 1, data: HEATMAP, finalScore: '25-20', winner: 'home', scoreHistory: SCORE_HISTORY, substitutions: [] },
  ],
  substitutions: [{ out: 3, in: 4, set: 1 }],
  pointStats: {
    home: { direct: 2, sideout: 1, block: 0, attack: 2, error: 0 },
    away: { direct: 0, sideout: 0, block: 1, attack: 1, error: 1 },
  },
  playerStats: {
    1: { direct: 2, sideout: 0, block: 0, attack: 0, error: 0, servicefault: 0 },
    2: { direct: 0, sideout: 0, block: 0, attack: 2, error: 1, servicefault: 0 },
  },
  scoreHistory: SCORE_HISTORY,
};

// Tweede wedstrijd zonder Pro-velden, om backward compatibility te testen.
const PLAIN_MATCH = {
  id: 900,
  opponent: 'Oude Garde',
  date: '2026-07-01',
  finalScore: { home: 1, away: 3 },
  winner: 'away',
  savedHeatmaps: [
    {
      setNumber: 1,
      data: [
        { team: 'home', type: 'attack', x: 50, y: 20, playerId: 2, srvTeam: 'home' },
        { team: 'away', type: 'attack', x: 50, y: 80, playerId: 5, srvTeam: 'home' },
      ],
      finalScore: '20-25',
      winner: 'away',
      scoreHistory: [
        { score: '1-0', team: 'home', type: 'attack', playerId: 2 },
        { score: '1-1', team: 'away', type: 'attack', playerId: 5 },
      ],
    },
  ],
  pointStats: {
    home: { direct: 0, sideout: 0, block: 0, attack: 1, error: 0 },
    away: { direct: 0, sideout: 0, block: 0, attack: 1, error: 0 },
  },
  playerStats: {},
  scoreHistory: [],
};

// ---------------------------------------------------------------------------
// Nagebootste app: WebSocket-client die de brugcommando's beantwoordt
// ---------------------------------------------------------------------------
class FakeApp {
  constructor(port) {
    this.port = port;
    this.ws = null;
    this.calls = [];
    this.state = {
      homeScore: 12, awayScore: 9,
      sets: { home: 1, away: 0 },
      servingTeam: 'home',
      rotation: 3,
      proMode: true,
      homeLineup: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, libero: 7 },
      awayLineup: { 1: 101, 2: 102, 3: 103, 4: 104, 5: 105, 6: 106 },
      homeTimeouts: [], awayTimeouts: [],
      setEnded: false, matchEnded: false,
      opponentName: 'Testers HS1',
    };
    this.failNext = null;
    this.hangNext = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${this.port}`);
      this.ws = ws;
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'hello', role: 'app', appVersion: '15.0.0', userAgent: 'FakeApp/1.0' }));
        ws.send(JSON.stringify({ type: 'event', event: 'state', state: this.state }));
        resolve();
      });
      ws.on('error', reject);
      ws.on('message', (raw) => this._onMessage(JSON.parse(raw.toString())));
    });
  }

  _onMessage(msg) {
    if (msg.type !== 'request') return;
    this.calls.push({ method: msg.method, params: msg.params });

    if (this.hangNext) { this.hangNext = false; return; } // bewust niet antwoorden

    if (this.failNext) {
      const error = this.failNext;
      this.failNext = null;
      this.ws.send(JSON.stringify({ type: 'response', id: msg.id, ok: false, error }));
      return;
    }

    let result;
    switch (msg.method) {
      case 'getState': result = this.state; break;
      case 'getPlayers': result = PLAYERS; break;
      case 'getMatches': result = [PRO_MATCH, PLAIN_MATCH]; break;
      case 'getTeamName': result = 'VCV'; break;
      case 'scorePoint': {
        const { team, type } = msg.params;
        const scoring = type === 'block' ? (team === 'home' ? 'away' : 'home') : team;
        if (scoring === 'home') this.state.homeScore++; else this.state.awayScore++;
        result = { scored: scoring, homeScore: this.state.homeScore, awayScore: this.state.awayScore };
        break;
      }
      case 'undo':
        this.state.homeScore = Math.max(0, this.state.homeScore - 1);
        result = { undone: true, homeScore: this.state.homeScore, awayScore: this.state.awayScore };
        break;
      case 'timeout': {
        const key = msg.params.team === 'home' ? 'homeTimeouts' : 'awayTimeouts';
        this.state[key].push({ score: `${this.state.homeScore}-${this.state.awayScore}` });
        result = { team: msg.params.team, taken: this.state[key].length };
        break;
      }
      case 'substitute':
        result = { out: msg.params.courtPlayerId, in: msg.params.benchPlayerId, ok: true };
        break;
      case 'setServing':
        this.state.servingTeam = msg.params.team;
        result = { servingTeam: this.state.servingTeam };
        break;
      case 'startNewSet':
        this.state.homeScore = 0; this.state.awayScore = 0;
        result = { newSet: true, keepLineup: msg.params.keepLineup };
        break;
      default:
        this.ws.send(JSON.stringify({ type: 'response', id: msg.id, ok: false, error: `onbekende methode ${msg.method}` }));
        return;
    }
    this.ws.send(JSON.stringify({ type: 'response', id: msg.id, ok: true, result }));
  }

  close() {
    return new Promise((resolve) => {
      if (!this.ws) return resolve();
      this.ws.once('close', resolve);
      this.ws.close();
      setTimeout(resolve, 500);
    });
  }
}

// ---------------------------------------------------------------------------
// Client-helpers
// ---------------------------------------------------------------------------
async function call(client, name, args = {}) {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content || []).map(c => c.text).join('\n');
  return { isError: !!res.isError, text, json: () => JSON.parse(text) };
}

async function expectError(client, name, args, matcher) {
  const res = await call(client, name, args);
  assert(res.isError, `${name} had een fout moeten geven, maar gaf: ${res.text.slice(0, 200)}`);
  if (matcher) assert(matcher.test(res.text), `foutmelding matcht niet met ${matcher}: ${res.text}`);
  return res;
}

// ---------------------------------------------------------------------------
// Hoofdprogramma
// ---------------------------------------------------------------------------
const EXPECTED_TOOLS = [
  'vw_live_status', 'vw_live_state', 'vw_live_score_point', 'vw_live_undo',
  'vw_live_timeout', 'vw_live_substitute', 'vw_live_set_serving', 'vw_live_new_set',
  'vw_sync_from_app',
  'vw_store_info', 'vw_import_data', 'vw_list_players', 'vw_list_matches',
  'vw_match_detail', 'vw_analyze_match', 'vw_player_report',
  'vw_nevobo_search_clubs', 'vw_nevobo_teams', 'vw_nevobo_matches',
  'vw_app_info', 'vw_build_web', 'vw_cap_sync', 'vw_build_apk',
];

async function main() {
  const tmp = await mkdtemp(path.join(tmpdir(), 'vw-mcp-test-'));
  const dataFile = path.join(tmp, 'store.json');

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER],
    env: {
      ...process.env,
      VW_DATA_FILE: dataFile,
      VW_BRIDGE_PORT: String(BRIDGE_PORT),
      VW_BRIDGE_TIMEOUT: '3000',
    },
    stderr: 'pipe',
  });

  const client = new Client({ name: 'vw-test', version: '1.0.0' });
  await client.connect(transport);

  const fakeApp = new FakeApp(BRIDGE_PORT);

  try {
    // -----------------------------------------------------------------------
    group('1. Serverstart en toolregistratie');

    let tools = [];
    await test('server start en meldt zijn tools', async () => {
      const res = await client.listTools();
      tools = res.tools;
      assert(tools.length > 0, 'geen tools teruggekregen');
    });

    await test(`alle ${EXPECTED_TOOLS.length} verwachte tools zijn geregistreerd`, async () => {
      const names = tools.map(t => t.name).sort();
      const missing = EXPECTED_TOOLS.filter(n => !names.includes(n));
      const extra = names.filter(n => !EXPECTED_TOOLS.includes(n));
      assert(missing.length === 0, `ontbreken: ${missing.join(', ')}`);
      assert(extra.length === 0, `onverwacht: ${extra.join(', ')}`);
    });

    await test('elke tool heeft een omschrijving en een geldig inputSchema', async () => {
      for (const t of tools) {
        assert(t.description && t.description.length > 20, `${t.name}: omschrijving ontbreekt of is te kort`);
        assert(t.inputSchema && t.inputSchema.type === 'object', `${t.name}: inputSchema is geen object-schema`);
      }
    });

    await test('schemas bevatten de juiste enums en verplichte velden', async () => {
      const score = tools.find(t => t.name === 'vw_live_score_point');
      assertDeep(score.inputSchema.properties.team.enum, ['home', 'away'], 'team-enum');
      assertDeep(
        score.inputSchema.properties.type.enum,
        ['direct', 'sideout', 'block', 'attack', 'error'],
        'punttype-enum'
      );
      assert(score.inputSchema.required.includes('team'), 'team hoort verplicht te zijn');
      assert(!score.inputSchema.required.includes('playerId'), 'playerId hoort optioneel te zijn');
    });

    // -----------------------------------------------------------------------
    group('2. Live-brug zonder app');

    await test('vw_live_status werkt en meldt dat er niets verbonden is', async () => {
      const r = await call(client, 'vw_live_status');
      assert(!r.isError, r.text);
      const s = r.json();
      assertEqual(s.listening, true, 'brug luistert niet');
      assertEqual(s.port, BRIDGE_PORT, 'poort');
      assertEqual(s.connected, false, 'zou niet verbonden moeten zijn');
    });

    await test('live-tool zonder app geeft een bruikbare foutmelding', async () => {
      await expectError(client, 'vw_live_state', {}, /Geen app verbonden/);
    });

    await test('vw_live_state met cached=true zonder state geeft nette fout', async () => {
      await expectError(client, 'vw_live_state', { cached: true }, /Nog geen state/);
    });

    // -----------------------------------------------------------------------
    group('3. Live-brug met verbonden app');

    await test('app kan verbinden met de brug', async () => {
      await fakeApp.connect();
      await new Promise(r => setTimeout(r, 300));
      const s = (await call(client, 'vw_live_status')).json();
      assertEqual(s.connected, true, 'app niet als verbonden gezien');
      assertEqual(s.client.appVersion, '15.0.0', 'hello-gegevens niet bewaard');
      assertEqual(s.hasState, true, 'gepushte state niet ontvangen');
    });

    await test('vw_live_state haalt de live stand op', async () => {
      const s = (await call(client, 'vw_live_state')).json();
      assertEqual(s.cached, false, 'had live opgehaald moeten worden');
      assertEqual(s.state.homeScore, 12, 'homeScore');
      assertEqual(s.state.rotation, 3, 'rotatie');
      assertEqual(s.state.sets.home, 1, 'sets');
    });

    await test('vw_live_state met cached=true gebruikt de gepushte state', async () => {
      const s = (await call(client, 'vw_live_state'), await call(client, 'vw_live_state', { cached: true })).json();
      assertEqual(s.cached, true, 'had cached moeten zijn');
      assert(s.receivedAt, 'receivedAt ontbreekt');
    });

    await test('vw_live_score_point telt een punt voor het scorende team', async () => {
      const before = (await call(client, 'vw_live_state')).json().state.homeScore;
      const r = (await call(client, 'vw_live_score_point', { team: 'home', type: 'attack', x: 40, y: 30, playerId: 2 })).json();
      assertEqual(r.scored, 'home', 'scorend team');
      assertEqual(r.homeScore, before + 1, 'stand niet opgehoogd');
    });

    await test('blok keert het scorende team om, net als in de app', async () => {
      const before = (await call(client, 'vw_live_state')).json().state.awayScore;
      const r = (await call(client, 'vw_live_score_point', { team: 'home', type: 'block' })).json();
      assertEqual(r.scored, 'away', 'bij een blok op de thuishelft hoort de tegenstander te scoren');
      assertEqual(r.awayScore, before + 1, 'stand tegenstander niet opgehoogd');
    });

    await test('x en y krijgen hun standaardwaarde als je ze weglaat', async () => {
      fakeApp.calls.length = 0;
      await call(client, 'vw_live_score_point', { team: 'home', type: 'attack' });
      const last = fakeApp.calls.at(-1);
      assertEqual(last.params.x, 50, 'x-default');
      assertEqual(last.params.y, 50, 'y-default');
    });

    await test('vw_live_undo draait het laatste punt terug', async () => {
      const before = (await call(client, 'vw_live_state')).json().state.homeScore;
      const r = (await call(client, 'vw_live_undo')).json();
      assertEqual(r.undone, true, 'undo niet bevestigd');
      assertEqual(r.homeScore, before - 1, 'stand niet verlaagd');
    });

    await test('vw_live_timeout registreert een timeout', async () => {
      const r = (await call(client, 'vw_live_timeout', { team: 'away' })).json();
      assertEqual(r.team, 'away', 'team');
      assertEqual(r.taken, 1, 'aantal timeouts');
    });

    await test('vw_live_substitute geeft de wissel door', async () => {
      const r = (await call(client, 'vw_live_substitute', { courtPlayerId: 3, benchPlayerId: 4 })).json();
      assertEqual(r.out, 3, 'speler eruit');
      assertEqual(r.in, 4, 'speler erin');
    });

    await test('vw_live_set_serving zet de servicebeurt', async () => {
      const r = (await call(client, 'vw_live_set_serving', { team: 'away' })).json();
      assertEqual(r.servingTeam, 'away', 'servingTeam');
    });

    await test('vw_live_new_set start een set en geeft keepLineup door', async () => {
      const r = (await call(client, 'vw_live_new_set', { keepLineup: false })).json();
      assertEqual(r.newSet, true, 'nieuwe set');
      assertEqual(r.keepLineup, false, 'keepLineup');
    });

    await test('ongeldige enum-waarde wordt door het schema geweigerd', async () => {
      await expectError(client, 'vw_live_score_point', { team: 'gasten', type: 'attack' });
    });

    await test('ontbrekend verplicht veld wordt geweigerd', async () => {
      await expectError(client, 'vw_live_timeout', {});
    });

    await test('fout uit de app komt als foutmelding terug', async () => {
      fakeApp.failNext = 'Wissel geweigerd: speler staat al op het veld';
      await expectError(client, 'vw_live_substitute', { courtPlayerId: 1, benchPlayerId: 2 }, /staat al op het veld/);
    });

    await test('app die niet antwoordt levert een time-out op, geen vastloper', async () => {
      fakeApp.hangNext = true;
      const started = Date.now();
      await expectError(client, 'vw_live_undo', {}, /Time-out/);
      assert(Date.now() - started < 8000, 'time-out duurde te lang');
    });

    await test('brug werkt nog na een time-out', async () => {
      const s = (await call(client, 'vw_live_state')).json();
      assertEqual(s.state.sets.home, 1, 'brug niet meer bruikbaar na time-out');
    });

    // -----------------------------------------------------------------------
    group('4. Data synchroniseren en importeren');

    await test('vw_sync_from_app haalt spelers en wedstrijden op', async () => {
      const r = (await call(client, 'vw_sync_from_app')).json();
      assertEqual(r.synced, true, 'sync niet bevestigd');
      assertEqual(r.players, 5, 'aantal spelers');
      assertEqual(r.matches, 2, 'aantal wedstrijden');
      assertEqual(r.teamName, 'VCV', 'teamnaam');
    });

    await test('de datastore staat echt op schijf', async () => {
      const raw = JSON.parse(await readFile(dataFile, 'utf8'));
      assertEqual(raw.players.length, 5, 'spelers in bestand');
      assertEqual(raw.matches.length, 2, 'wedstrijden in bestand');
      assert(raw.updatedAt, 'updatedAt ontbreekt');
    });

    await test('vw_store_info rapporteert de juiste aantallen', async () => {
      const r = (await call(client, 'vw_store_info')).json();
      assertEqual(r.players, 5, 'spelers');
      assertEqual(r.matches, 2, 'wedstrijden');
      assertEqual(r.file, dataFile, 'pad naar datastore');
    });

    await test('vw_import_data accepteert het localStorage-formaat', async () => {
      const payload = JSON.stringify({
        volleyballPlayers: JSON.stringify(PLAYERS.slice(0, 2)),
        volleyballMatches: JSON.stringify([PRO_MATCH]),
      });
      const r = (await call(client, 'vw_import_data', { json: payload })).json();
      assertEqual(r.players, 2, 'spelers na overschrijven');
      assertEqual(r.matches, 1, 'wedstrijden na overschrijven');
    });

    await test('vw_import_data met merge=true voegt samen op id', async () => {
      const payload = JSON.stringify({ players: PLAYERS, matches: [PLAIN_MATCH] });
      const r = (await call(client, 'vw_import_data', { json: payload, merge: true })).json();
      assertEqual(r.players, 5, 'spelers samengevoegd');
      assertEqual(r.matches, 2, 'wedstrijden samengevoegd');
    });

    await test('vw_import_data weigert onzin-JSON met een nette fout', async () => {
      await expectError(client, 'vw_import_data', { json: '{dit is geen json' });
    });

    await test('vw_import_data weigert een verkeerd datatype', async () => {
      await expectError(client, 'vw_import_data', { json: '{"players": 42}' }, /geen array/);
    });

    // -----------------------------------------------------------------------
    group('5. Wedstrijden en analyse');

    await test('vw_list_players geeft de spelerslijst', async () => {
      const list = (await call(client, 'vw_list_players')).json();
      assertEqual(list.length, 5, 'aantal spelers');
      assertEqual(list.find(p => p.id === 7).isLibero, true, 'libero-vlag');
    });

    await test('vw_list_matches sorteert nieuwste eerst', async () => {
      const r = (await call(client, 'vw_list_matches')).json();
      assertEqual(r.count, 2, 'aantal wedstrijden');
      assertEqual(r.matches[0].id, 1000, 'nieuwste wedstrijd staat niet vooraan');
      assertEqual(r.matches[0].hasProData, true, 'Pro-data niet herkend');
      assertEqual(r.matches[1].hasProData, false, 'gewone wedstrijd ten onrechte als Pro gemarkeerd');
    });

    await test('vw_list_matches filtert op tegenstander', async () => {
      const r = (await call(client, 'vw_list_matches', { opponent: 'garde' })).json();
      assertEqual(r.count, 1, 'filter werkt niet');
      assertEqual(r.matches[0].opponent, 'Oude Garde', 'verkeerde wedstrijd');
    });

    await test('vw_match_detail vindt een wedstrijd op naam', async () => {
      const r = (await call(client, 'vw_match_detail', { match: 'Testers' })).json();
      assertEqual(r.id, 1000, 'verkeerde wedstrijd');
      assertEqual(r.setsPlayed, 1, 'aantal sets');
      assertEqual(r.substitutions.length, 1, 'wissels');
    });

    await test('vw_match_detail zonder argument pakt de laatste wedstrijd', async () => {
      const r = (await call(client, 'vw_match_detail')).json();
      assert([1000, 900].includes(r.id), 'geen wedstrijd teruggekregen');
    });

    await test('punttype-percentages kloppen', async () => {
      const r = (await call(client, 'vw_match_detail', { match: '1000' })).json();
      // home: direct 2, sideout 1, block 0, attack 2, error 0 = 5 punten
      assertEqual(r.pointTypes.home.total, 5, 'totaal thuis');
      assertEqual(r.pointTypes.home.pct.direct, 40, 'directe punten in procenten');
      assertEqual(r.pointTypes.home.pct.attack, 40, 'aanvalspunten in procenten');
      assertEqual(r.pointTypes.away.total, 3, 'totaal uit');
    });

    await test('rotatie-analyse rekent sideouts en breaks correct door', async () => {
      const r = (await call(client, 'vw_analyze_match', { match: '1000' })).json();
      const rot = r.rotations;
      // Rotatie 1: 2 punten thuis, beide met eigen service -> 2 breaks.
      assertDeep(rot['1'], { pointsFor: 2, pointsAgainst: 0, sideouts: 0, sideoutChances: 0, breaks: 2, breakChances: 2 }, 'rotatie 1');
      // Rotatie 2: punt 3 = sideout thuis; punt 4 = away scoort op eigen service;
      // punt 5 = blok op thuishelft -> away scoort, thuis serveerde -> breakChance.
      assertDeep(rot['2'], { pointsFor: 1, pointsAgainst: 2, sideouts: 1, sideoutChances: 2, breaks: 0, breakChances: 1 }, 'rotatie 2');
      // Rotatie 3: error (away scoort, thuis ontving) + sideout thuis + ace op eigen service.
      assertDeep(rot['3'], { pointsFor: 2, pointsAgainst: 1, sideouts: 1, sideoutChances: 2, breaks: 1, breakChances: 1 }, 'rotatie 3');
    });

    await test('receptie-analyse telt totaal en per speler', async () => {
      const r = (await call(client, 'vw_analyze_match', { match: '1000' })).json();
      assertDeep(r.reception.overall, { A: 1, B: 1, C: 1, total: 3 }, 'receptie totaal');
      assertEqual(r.reception.byPlayer['7'].total, 2, 'libero ontving 2 ballen');
      assertEqual(r.reception.byPlayer['7'].A, 1, 'libero A-recepties');
      assertEqual(r.reception.byPlayer['7'].name, 'Libero', 'naam bij receptie');
      assertEqual(r.reception.byPlayer['2'].B, 1, 'Bram B-receptie');
    });

    await test('aanvalsefficientie telt kills en aanvalsfouten', async () => {
      const r = (await call(client, 'vw_analyze_match', { match: '1000' })).json();
      const bram = r.attackEfficiency['2'];
      assertEqual(bram.kills, 2, 'kills');
      assertEqual(bram.attackErrors, 1, 'aanvalsfouten');
      assertEqual(bram.totalAttempts, 3, 'pogingen');
      assertEqual(bram.killPct, 67, 'kill-percentage (2/3 afgerond)');
    });

    await test('servicezones tellen aces per zone', async () => {
      const r = (await call(client, 'vw_analyze_match', { match: '1000' })).json();
      assertEqual(r.serveZones['1'].total, 2, 'services vanuit zone 1');
      assertEqual(r.serveZones['1'].aces, 1, 'aces vanuit zone 1');
      assertEqual(r.serveZones['1'].acePct, 50, 'ace-percentage zone 1');
      assertEqual(r.serveZones['5'].aces, 1, 'ace vanuit zone 5');
      assertEqual(r.serveZones['4'].total, 0, 'zone 4 hoort leeg te zijn');
    });

    await test('scoringsreeksen worden gevonden vanaf de ingestelde lengte', async () => {
      const r = (await call(client, 'vw_analyze_match', { match: '1000' })).json();
      // 3x home, 3x away, 2x home
      assertEqual(r.scoringRuns.length, 2, 'aantal reeksen van 3+');
      assertEqual(r.scoringRuns[0].team, 'home', 'eerste reeks');
      assertEqual(r.scoringRuns[0].length, 3, 'lengte eerste reeks');
      assertEqual(r.scoringRuns[1].team, 'away', 'tweede reeks');
    });

    await test('minRunLength=2 vindt ook de reeks van twee', async () => {
      const r = (await call(client, 'vw_analyze_match', { match: '1000', minRunLength: 2 })).json();
      assertEqual(r.scoringRuns.length, 3, 'aantal reeksen van 2+');
      assertEqual(r.scoringRuns[2].length, 2, 'laatste reeks');
    });

    await test('analyse vanuit het uitteam keert de cijfers om', async () => {
      const r = (await call(client, 'vw_analyze_match', { match: '1000', team: 'away' })).json();
      assertEqual(r.rotations['1'].pointsAgainst, 2, 'vanuit away zijn dit tegenpunten');
      assertEqual(r.rotations['1'].pointsFor, 0, 'away scoorde niet in rotatie 1');
    });

    await test('wedstrijd zonder Pro-data levert lege Pro-secties met uitleg', async () => {
      const r = (await call(client, 'vw_analyze_match', { match: 'Oude Garde' })).json();
      assertEqual(r.hasProData, false, 'ten onrechte als Pro gemarkeerd');
      assert(r.note && r.note.includes('Pro-modus'), 'uitleg ontbreekt');
      assertEqual(r.reception.overall.total, 0, 'receptie hoort leeg te zijn');
      assertEqual(r.rotations['1'].pointsFor, 0, 'rotaties horen leeg te zijn');
    });

    await test('onbekende wedstrijd geeft een nette fout', async () => {
      await expectError(client, 'vw_analyze_match', { match: 'Bestaat Niet' }, /Geen wedstrijd gevonden/);
    });

    await test('vw_player_report telt over alle wedstrijden heen', async () => {
      const r = (await call(client, 'vw_player_report')).json();
      assertEqual(r.matchesAnalyzed, 2, 'aantal wedstrijden');
      const bram = r.players.find(p => p.id === 2);
      assertEqual(bram.name, 'Bram', 'naam');
      assertEqual(bram.attack.kills, 3, 'kills over beide wedstrijden (2 + 1)');
      assertEqual(bram.points.attack, 2, 'aanvalspunten uit playerStats');
    });

    await test('vw_player_report kan op een enkele speler filteren', async () => {
      const r = (await call(client, 'vw_player_report', { playerId: 1 })).json();
      assertEqual(r.players.length, 1, 'filter werkt niet');
      assertEqual(r.players[0].name, 'Anouk', 'verkeerde speler');
      assertEqual(r.players[0].points.direct, 2, 'aces');
    });

    // -----------------------------------------------------------------------
    group('6. Nevobo (netwerk)');

    let online = true;
    await test('Nevobo-API is bereikbaar', async () => {
      try {
        const res = await fetch('https://api.nevobo.nl/relatiebeheer/verenigingen?page=1', {
          signal: AbortSignal.timeout(10000),
        });
        assert(res.ok, `Nevobo gaf ${res.status}`);
      } catch (err) {
        online = false;
        skip(`geen verbinding met api.nevobo.nl (${err.message})`);
      }
    });

    await test('vw_nevobo_search_clubs vindt een vereniging', async () => {
      if (!online) skip('offline');
      const r = await call(client, 'vw_nevobo_search_clubs', { query: 'volley', limit: 5 });
      assert(!r.isError, r.text);
      const data = r.json();
      assert(data.count > 0, 'geen verenigingen gevonden');
      assert(data.clubs[0].code, 'vereniging zonder code');
      assert(data.clubs[0].naam, 'vereniging zonder naam');
    });

    await test('zoekterm zonder treffers geeft een nette fout', async () => {
      if (!online) skip('offline');
      await expectError(client, 'vw_nevobo_search_clubs', { query: 'zzzqqqxxx' }, /Geen vereniging gevonden/);
    });

    await test('te korte zoekterm wordt door het schema geweigerd', async () => {
      await expectError(client, 'vw_nevobo_search_clubs', { query: 'a' });
    });

    await test('vw_nevobo_teams haalt teams op voor een vereniging', async () => {
      if (!online) skip('offline');
      const r = await call(client, 'vw_nevobo_teams', { clubCode: 'CKL9Y5O' });
      if (r.isError) skip(`vereniging CKL9Y5O gaf: ${r.text.slice(0, 120)}`);
      const data = r.json();
      assert(data.count > 0, 'geen teams');
      assert(data.teams[0].teamId, 'team zonder teamId');
    });

    await test('vw_nevobo_matches haalt een wedstrijdschema op', async () => {
      if (!online) skip('offline');
      const teamsRes = await call(client, 'vw_nevobo_teams', { clubCode: 'CKL9Y5O' });
      if (teamsRes.isError) skip('teams niet beschikbaar');
      const teamId = teamsRes.json().teams[0].teamId;
      const r = await call(client, 'vw_nevobo_matches', { teamCode: teamId });
      assert(!r.isError, r.text);
      const data = r.json();
      assert(Array.isArray(data.matches), 'matches is geen array');
      if (data.matches.length > 0) {
        assert('datum' in data.matches[0], 'wedstrijd zonder datum');
        assert('homeTeam' in data.matches[0], 'wedstrijd zonder thuisteam');
      }
    });

    await test('onbekende verenigingscode geeft een nette fout', async () => {
      if (!online) skip('offline');
      await expectError(client, 'vw_nevobo_teams', { clubCode: 'XXXNIETBESTAAND' });
    });

    // -----------------------------------------------------------------------
    group('7. Build- en devtools');

    await test('vw_app_info leest versie, git-status en APKs', async () => {
      const r = await call(client, 'vw_app_info');
      assert(!r.isError, r.text);
      const info = r.json();
      assertEqual(info.name, 'volleywarrior', 'projectnaam');
      assert(/^\d+\.\d+\.\d+$/.test(info.version), `versie ziet er raar uit: ${info.version}`);
      assertEqual(info.appId, 'nl.volleywarrior.app', 'Capacitor app-id');
      assert(info.git.branch, 'git-branch ontbreekt');
      assert(Array.isArray(info.apks), 'apks is geen array');
    });

    await test('vw_build_apk zonder confirm bouwt niets en toont het stappenplan', async () => {
      const r = (await call(client, 'vw_build_apk')).json();
      assertEqual(r.dryRun, true, 'had een dry-run moeten zijn');
      assertEqual(r.steps.length, 4, 'aantal stappen');
      assert(r.output.includes('app-debug.apk'), 'uitvoerpad ontbreekt');
    });

    await test('vw_build_web draait de echte Vite-build', async () => {
      if (process.env.VW_SKIP_BUILD) skip('VW_SKIP_BUILD gezet');
      const r = await call(client, 'vw_build_web');
      assert(!r.isError, `build mislukt: ${r.text.slice(0, 500)}`);
      const data = r.json();
      assertEqual(data.exitCode, 0, 'exitcode');
      assert(/built in|dist\//.test(data.stdout), `buildoutput ziet er onverwacht uit: ${data.stdout.slice(0, 200)}`);
    });

    // -----------------------------------------------------------------------
    group('8. Robuustheid');

    await test('onbekende tool geeft een nette fout, geen crash', async () => {
      // De SDK verwerpt hier niet: hij levert een isError-resultaat met de
      // JSON-RPC-melding erin. Beide vormen zijn goed, als de server maar leeft.
      let res;
      try {
        res = await client.callTool({ name: 'vw_bestaat_niet', arguments: {} });
      } catch (err) {
        assert(/not found|-32602/.test(err.message), `onverwachte fout: ${err.message}`);
        return;
      }
      assert(res.isError, 'onbekende tool had een fout moeten opleveren');
      const text = (res.content || []).map(c => c.text).join('');
      assert(/not found/.test(text), `onverwachte foutmelding: ${text}`);
    });

    await test('server leeft nog na alle foutgevallen', async () => {
      const res = await client.listTools();
      assertEqual(res.tools.length, EXPECTED_TOOLS.length, 'toolregistratie is beschadigd');
    });

    await test('app-verbinding verbreken wordt correct opgemerkt', async () => {
      await fakeApp.close();
      await new Promise(r => setTimeout(r, 400));
      const s = (await call(client, 'vw_live_status')).json();
      assertEqual(s.connected, false, 'brug denkt nog steeds dat de app verbonden is');
      assertEqual(s.listening, true, 'brug is gestopt met luisteren');
    });

    await test('herverbinden werkt na een verbroken verbinding', async () => {
      const app2 = new FakeApp(BRIDGE_PORT);
      await app2.connect();
      await new Promise(r => setTimeout(r, 300));
      const s = (await call(client, 'vw_live_state')).json();
      assertEqual(s.state.homeScore, 12, 'nieuwe app-verbinding werkt niet');
      await app2.close();
    });

  } finally {
    await fakeApp.close().catch(() => {});
    await client.close().catch(() => {});
    await rm(tmp, { recursive: true, force: true }).catch(() => {});
  }

  // -------------------------------------------------------------------------
  const pass = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail');
  const skipped = results.filter(r => r.status === 'skip').length;

  console.log(`\n${'-'.repeat(60)}`);
  console.log(`\x1b[32m${pass} geslaagd\x1b[0m, \x1b[31m${failed.length} mislukt\x1b[0m, \x1b[33m${skipped} overgeslagen\x1b[0m  (${results.length} totaal)`);

  if (failed.length > 0) {
    console.log('\nMislukt:');
    for (const f of failed) console.log(`  - [${f.group}] ${f.name}\n      ${f.error}`);
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('\nTestrunner crashte:', err);
  process.exitCode = 1;
});
