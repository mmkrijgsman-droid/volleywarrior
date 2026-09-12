/**
 * End-to-end test met de ECHTE app in een browser.
 *
 * Start de MCP-server over stdio én een headless Chrome met de app erin, en
 * stuurt daarna een complete wedstrijdreeks door de echte React-app heen.
 * Anders dan run-tests.mjs zit hier geen namaak-app tussen.
 *
 * Gebruik (productiebuild — aanbevolen):
 *   1. npm run build && npm run preview     (in de projectmap, poort 4173)
 *   2. node test/e2e-browser.mjs
 *
 * Werkt ook tegen de dev-server (VW_APP_URL=http://localhost:5173), maar daar
 * blijft een geseede spelerslijst niet staan: React StrictMode draait de
 * effecten in useMatchState dubbel, waardoor het opslag-effect de zojuist
 * geladen selectie overschrijft met de standaardselectie. De wisseltests
 * worden dan overgeslagen in plaats van te falen.
 *
 * Chrome wordt met een eigen tijdelijk profiel gestart, dus je eigen browser
 * blijft ongemoeid. Staat Chrome ergens anders: zet VW_CHROME.
 * Met VW_E2E_MANUAL=1 start de test geen browser en wacht hij tot je zelf
 * de app opent met ?mcpbridge=1.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchApp } from './chrome.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(here, '..', 'src', 'index.js');
const WAIT_FOR_APP_MS = Number(process.env.VW_E2E_WAIT || 90000);
const APP_URL = process.env.VW_APP_URL || 'http://localhost:4173';

// Achtste speler erbij, anders is er geen bank om mee te wisselen: de
// standaardselectie is precies zes veldspelers plus een libero.
const SEED = `
  localStorage.setItem('volleyballPlayers', JSON.stringify([
    { id: 1, name: 'Speler 1', number: 1, role: 'setter' },
    { id: 2, name: 'Speler 2', number: 2, role: 'outside' },
    { id: 3, name: 'Speler 3', number: 3, role: 'middle' },
    { id: 4, name: 'Speler 4', number: 4, role: 'opposite' },
    { id: 5, name: 'Speler 5', number: 5, role: 'outside' },
    { id: 6, name: 'Speler 6', number: 6, role: 'middle' },
    { id: 7, name: 'Libero',   number: 7, role: 'libero', isLibero: true },
    { id: 8, name: 'Reserve',  number: 8, role: 'outside' }
  ]));
  localStorage.setItem('vwMcpBridge', '1');
`;

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  \x1b[32mPASS\x1b[0m ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.log(`  \x1b[31mFAIL\x1b[0m ${name}\n       \x1b[31m${err.message}\x1b[0m`);
  }
}
function assert(c, m) { if (!c) throw new Error(m || 'assertie mislukt'); }
function skip(reason) { const e = new Error(reason); e.__skip = true; throw e; }
function assertEqual(a, b, m) {
  if (a !== b) throw new Error(`${m || 'ongelijk'}: verwacht ${JSON.stringify(b)}, kreeg ${JSON.stringify(a)}`);
}

const client = new Client({ name: 'vw-e2e', version: '1.0.0' });

async function call(name, args = {}) {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content || []).map(c => c.text).join('\n');
  if (res.isError) throw new Error(text);
  return JSON.parse(text);
}

async function main() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER],
    env: { ...process.env, VW_BRIDGE_PORT: process.env.VW_BRIDGE_PORT || '7823' },
    stderr: 'pipe',
  });
  await client.connect(transport);

  console.log('\n\x1b[1mEnd-to-end met de echte app\x1b[0m');

  let browser = null;
  if (process.env.VW_E2E_MANUAL !== '1') {
    try {
      console.log(`  headless Chrome starten op ${APP_URL} ...`);
      browser = await launchApp({ url: APP_URL, seed: SEED });
    } catch (err) {
      console.log(`  \x1b[33mChrome starten mislukt (${err.message})\x1b[0m`);
      console.log(`  open dan zelf ${APP_URL}/?mcpbridge=1`);
    }
  } else {
    console.log(`  handmatige modus — open ${APP_URL}/?mcpbridge=1`);
  }

  console.log('  wachten tot de app zich meldt op de brug...');

  const deadline = Date.now() + WAIT_FOR_APP_MS;
  let status = null;
  while (Date.now() < deadline) {
    status = await call('vw_live_status');
    if (status.connected) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  if (!status?.connected) {
    console.log('\n\x1b[31mGeen app verbonden binnen de wachttijd.\x1b[0m');
    console.log('  Open de app en zet de brug aan:');
    console.log("    localStorage.setItem('vwMcpBridge','1'); location.reload();");
    await client.close();
    if (browser) await browser.close();
    process.exitCode = 1;
    return;
  }
  console.log(`  app verbonden: ${status.client?.userAgent?.slice(0, 60) || 'onbekend'}\n`);

  let start;

  await test('vw_live_state leest de echte React-state', async () => {
    const { state } = await call('vw_live_state');
    start = state;
    assertEqual(typeof state.homeScore, 'number', 'homeScore ontbreekt');
    assertEqual(typeof state.servingTeam, 'string', 'servingTeam ontbreekt');
    assert(Array.isArray(state.fieldPlayers), 'fieldPlayers ontbreekt');
    assert(state.homeLineup && state.homeLineup['1'] != null, 'opstelling ontbreekt');
  });

  await test('serverend team zetten komt aan in de app', async () => {
    await call('vw_live_set_serving', { team: 'home' });
    const { state } = await call('vw_live_state');
    assertEqual(state.servingTeam, 'home', 'servingTeam');
  });

  await test('punt scoren loopt door de echte popup-keten heen', async () => {
    const before = (await call('vw_live_state')).state.homeScore;
    const r = await call('vw_live_score_point', { team: 'home', type: 'attack', x: 45, y: 25, playerId: 2 });
    assertEqual(r.scored, 'home', 'scorend team');
    assertEqual(r.homeScore, before + 1, 'stand niet opgehoogd');
    const { state } = await call('vw_live_state');
    assertEqual(state.homeScore, before + 1, 'stand in de app');
    assertEqual(state.lastPoint.type, 'attack', 'punttype in de geschiedenis');
    assertEqual(state.lastPoint.playerId, 2, 'speler in de geschiedenis');
  });

  await test('ace slaat de spelerkeuze over en telt gewoon mee', async () => {
    const before = (await call('vw_live_state')).state.homeScore;
    const r = await call('vw_live_score_point', { team: 'home', type: 'direct' });
    assertEqual(r.homeScore, before + 1, 'stand');
    const { state } = await call('vw_live_state');
    assertEqual(state.lastPoint.type, 'direct', 'punttype');
  });

  await test('blok geeft het punt aan de tegenpartij', async () => {
    const before = (await call('vw_live_state')).state.awayScore;
    const r = await call('vw_live_score_point', { team: 'home', type: 'block', playerId: 3 });
    assertEqual(r.scored, 'away', 'scorend team');
    assertEqual(r.awayScore, before + 1, 'stand tegenstander');
  });

  await test('sideout draait de service om, zoals de volleybalregels vereisen', async () => {
    await call('vw_live_set_serving', { team: 'away' });
    await call('vw_live_score_point', { team: 'home', type: 'sideout', playerId: 4 });
    const { state } = await call('vw_live_state');
    assertEqual(state.servingTeam, 'home', 'na een sideout hoort de service om te draaien');
  });

  await test('rotatie schuift mee na de sideout', async () => {
    const { state } = await call('vw_live_state');
    assert(state.homeLineup['1'] != null, 'opstelling weg na rotatie');
    // Positie 1 hoort na rotatie de oude positie 2 te zijn.
    assert(JSON.stringify(state.homeLineup) !== JSON.stringify(start.homeLineup),
      'opstelling is niet geroteerd');
  });

  await test('undo draait het laatste punt terug in de echte app', async () => {
    const before = (await call('vw_live_state')).state;
    const r = await call('vw_live_undo');
    const after = (await call('vw_live_state')).state;
    assertEqual(r.undone, true, 'undo niet bevestigd');
    assertEqual(after.scoreHistory.length, before.scoreHistory.length - 1, 'geschiedenis niet ingekort');
  });

  await test('timeout wordt geregistreerd met de stand erbij', async () => {
    const r = await call('vw_live_timeout', { team: 'home' });
    assertEqual(r.taken, 1, 'aantal timeouts');
    const { state } = await call('vw_live_state');
    assertEqual(state.homeTimeouts.length, 1, 'timeout in de app');
    assert(/^\d+-\d+$/.test(state.homeTimeouts[0]), `timeout zonder stand: ${state.homeTimeouts[0]}`);
  });

  await test('tweede timeout mag, derde wordt geweigerd door de app', async () => {
    await call('vw_live_timeout', { team: 'home' });
    let refused = false;
    try {
      await call('vw_live_timeout', { team: 'home' });
    } catch (err) {
      refused = /Max 2 timeouts|geweigerd/.test(err.message);
      if (!refused) throw err;
    }
    assert(refused, 'derde timeout had geweigerd moeten worden');
  });

  await test('onbekend speler-id wordt geweigerd en laat de opstelling met rust', async () => {
    const before = (await call('vw_live_state')).state;
    let msg = '';
    try {
      await call('vw_live_substitute', { courtPlayerId: before.homeLineup['1'], benchPlayerId: 999 });
    } catch (err) { msg = err.message; }
    assert(/niet op de bank/.test(msg), `verwachtte een melding over de bank, kreeg: ${msg}`);
    const after = (await call('vw_live_state')).state;
    assertEqual(JSON.stringify(after.homeLineup), JSON.stringify(before.homeLineup), 'opstelling is toch gewijzigd');
    assertEqual(after.substitutions.length, before.substitutions.length, 'er is toch een wissel vastgelegd');
  });

  await test('wissel met een speler die al op het veld staat wordt geweigerd', async () => {
    const { state } = await call('vw_live_state');
    let msg = '';
    try {
      await call('vw_live_substitute', { courtPlayerId: state.homeLineup['1'], benchPlayerId: state.homeLineup['2'] });
    } catch (err) { msg = err.message; }
    assert(msg.length > 0, 'had geweigerd moeten worden');
  });

  await test('echte wissel wordt doorgevoerd in de opstelling', async () => {
    const { state } = await call('vw_live_state');
    if (!state.benchPlayers?.length) {
      skip('geen bankspelers — draai tegen de productiebuild (npm run preview), zie kop van dit bestand');
    }
    const bench = state.benchPlayers[0].id;
    const court = state.homeLineup['1'];
    const r = await call('vw_live_substitute', { courtPlayerId: court, benchPlayerId: bench });
    assertEqual(r.out, court, 'speler eruit');
    assertEqual(r.in, bench, 'speler erin');
    const after = (await call('vw_live_state')).state;
    assert(after.substitutions.length > state.substitutions.length, 'wissel niet vastgelegd');
    assertEqual(after.homeLineup['1'], bench, 'bankspeler staat niet op positie 1');
    assert(after.benchPlayers.some(p => p.id === court), 'gewisselde speler staat niet op de bank');
  });

  await test('terugwissel-regel uit de app geldt ook via de brug', async () => {
    const { state } = await call('vw_live_state');
    // De zojuist gewisselde speler mag alleen terugkomen voor zijn vervanger.
    if (!state.substitutions.length) skip('geen eerdere wissel om op voort te bouwen');
    const justOut = state.substitutions.at(-1).playerOut;
    const wrongPartner = state.homeLineup['3'];
    let msg = '';
    try {
      await call('vw_live_substitute', { courtPlayerId: wrongPartner, benchPlayerId: justOut });
    } catch (err) { msg = err.message; }
    assert(/terugkomen|gewisselde|Mag alleen/.test(msg),
      `verwachtte de terugwissel-melding uit de app, kreeg: ${msg}`);
  });

  await test('vw_sync_from_app haalt de echte spelerslijst op', async () => {
    const r = await call('vw_sync_from_app');
    assertEqual(r.synced, true, 'sync niet bevestigd');
    assert(r.players > 0, 'geen spelers opgehaald');
    const players = await call('vw_list_players');
    assert(players.some(p => p.role === 'setter'), 'geen spelverdeler in de opgehaalde lijst');
  });

  await test('een hele set volspelen blijft consistent', async () => {
    await call('vw_live_new_set', { keepLineup: true });
    let s = (await call('vw_live_state')).state;
    assertEqual(s.homeScore, 0, 'nieuwe set start niet op 0');

    await call('vw_live_set_serving', { team: 'home' });
    for (let i = 0; i < 25; i++) {
      await call('vw_live_score_point', { team: 'home', type: i % 3 === 0 ? 'direct' : 'attack', playerId: 2 });
    }
    s = (await call('vw_live_state')).state;
    assertEqual(s.homeScore, 25, 'stand na 25 punten');
    assertEqual(s.setEnded, true, 'set had afgelopen moeten zijn bij 25-0');
    assertEqual(s.sets.home, 1, 'setstand niet bijgewerkt');
  });

  await test('punt na het einde van de set wordt geweigerd', async () => {
    let msg = '';
    try {
      await call('vw_live_score_point', { team: 'home', type: 'attack', playerId: 2 });
    } catch (err) { msg = err.message; }
    assert(/afgelopen/.test(msg), `verwachtte een melding over de afgelopen set, kreeg: ${msg}`);
  });

  await client.close();
  if (browser) await browser.close();

  const pass = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok);
  console.log(`\n${'-'.repeat(60)}`);
  console.log(`\x1b[32m${pass} geslaagd\x1b[0m, \x1b[31m${fail.length} mislukt\x1b[0m  (${results.length} totaal)`);
  if (fail.length) {
    for (const f of fail) console.log(`  - ${f.name}: ${f.error}`);
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('E2E crashte:', err);
  process.exitCode = 1;
});
