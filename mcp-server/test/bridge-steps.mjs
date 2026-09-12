/**
 * Test voor de stappenmachine in src/helpers/mcpBridge.js.
 *
 * De brug moet omgaan met het feit dat React-state pas bij de volgende render
 * zichtbaar is: `confirmPointType` leest `showPointTypePopup`, dat `scorePoint`
 * een render eerder heeft gezet. Deze test bootst dat na met een namaak-app die
 * setState-aanroepen pas bij commit() zichtbaar maakt, en die verder de logica
 * van useMatchState volgt (punttype-popup, spelerkeuze, timeoutlimiet,
 * wisselregels, Pro-paneel).
 *
 * Draaien: node test/bridge-steps.mjs
 */
import { COMMANDS, READERS, snapshot } from '../../src/helpers/mcpBridge.js';

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`  \x1b[32mPASS\x1b[0m ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.log(`  \x1b[31mFAIL\x1b[0m ${name}\n       \x1b[31m${err.message}\x1b[0m`);
  }
}
function assert(c, m) { if (!c) throw new Error(m || 'assertie mislukt'); }
function assertEqual(a, b, m) {
  if (a !== b) throw new Error(`${m || 'ongelijk'}: verwacht ${JSON.stringify(b)}, kreeg ${JSON.stringify(a)}`);
}
function assertThrows(fn, re, m) {
  let threw = null;
  try { fn(); } catch (e) { threw = e; }
  assert(threw, m || 'had een fout moeten geven');
  if (re) assert(re.test(threw.message), `foutmelding matcht ${re} niet: ${threw.message}`);
  return threw;
}

/**
 * Namaak-app met React-semantiek: setters schrijven naar `next`, commit() maakt
 * ze zichtbaar. De acties volgen useMatchState.js.
 */
class FakeApp {
  constructor(overrides = {}) {
    this.cur = {
      homeScore: 0, awayScore: 0,
      sets: { home: 0, away: 0 },
      servingTeam: 'home',
      setEnded: false, matchEnded: false,
      homeTimeouts: [], awayTimeouts: [],
      substitutions: [],
      scoreHistory: [],
      homeLineup: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, libero: 7 },
      awayLineup: { 1: 101, 2: 102, 3: 103, 4: 104, 5: 105, 6: 106 },
      players: [
        { id: 1, name: 'Anouk', number: 1, role: 'setter' },
        { id: 2, name: 'Bram', number: 2, role: 'outside' },
        { id: 8, name: 'Eva', number: 8, role: 'outside' },
      ],
      savedMatches: [],
      teamName: 'VCV', opponentName: 'Testers', matchDate: '2026-08-30',
      activeTab: 'lineup', formationSystem: '5-1',
      pointStats: { home: {}, away: {} },
      proMode: false, trackPlayerStats: true,
      showPointTypePopup: null, showPlayerSelectPopup: null,
      showTimeoutPopup: null, showProPanel: null,
      selectedBenchPlayer: null, alertMessage: null,
      fieldPlayers: [1, 2, 3, 4, 5, 6],
      benchPlayers: [{ id: 8, name: 'Eva', number: 8, role: 'outside' }],
      ...overrides,
    };
    this.next = {};
    this.renders = 0;
  }

  set(patch) { Object.assign(this.next, patch); }
  commit() { Object.assign(this.cur, this.next); this.next = {}; this.renders++; }

  // -- acties, spiegel van useMatchState -----------------------------------
  _processPoint(playerId) {
    const src = this.cur.showPlayerSelectPopup || this.next.__point;
    const { type, scoringTeam } = src;
    const home = scoringTeam === 'home' ? this.cur.homeScore + 1 : this.cur.homeScore;
    const away = scoringTeam === 'away' ? this.cur.awayScore + 1 : this.cur.awayScore;
    this.set({
      homeScore: home, awayScore: away,
      scoreHistory: [...this.cur.scoreHistory, { score: `${home}-${away}`, team: scoringTeam, type, playerId }],
      showPlayerSelectPopup: null,
    });
    const isSideout = scoringTeam !== this.cur.servingTeam;
    if (this.cur.proMode && (isSideout || type === 'error')) {
      this.set({ showProPanel: { pointType: type, scoringTeam, isSideout, isError: type === 'error' } });
    }
  }

  view() {
    const s = this.cur;
    // Zelfde afleiding als useMatchState.js, zodat de bank meebeweegt met wissels.
    const fieldPlayers = Object.values(s.homeLineup).slice(0, 6);
    const benchPlayers = s.players.filter(p => !fieldPlayers.includes(p.id) && p.id !== s.homeLineup.libero);
    return {
      ...s,
      fieldPlayers,
      benchPlayers,
      getRotation: () => 1,

      scorePoint: (team, x, y) => {
        if (s.setEnded || s.matchEnded) return;
        this.set({ showPointTypePopup: { team, x, y } });
      },

      confirmPointType: (type) => {
        const { team: clickedTeam, x, y } = s.showPointTypePopup;
        const scoringTeam = type === 'block' ? (clickedTeam === 'home' ? 'away' : 'home') : clickedTeam;
        this.set({ showPointTypePopup: null });
        if (type === 'direct') {
          this.next.__point = { type, scoringTeam };
          this._processPoint(1);
          delete this.next.__point;
          return;
        }
        if (s.trackPlayerStats) {
          this.set({ showPlayerSelectPopup: { team: clickedTeam, type, x, y, scoringTeam } });
        } else {
          this.next.__point = { type, scoringTeam };
          this._processPoint(null);
          delete this.next.__point;
        }
      },

      confirmPlayerSelect: (pid) => this._processPoint(pid),

      undoLastPoint: () => {
        if (s.scoreHistory.length === 0) return;
        const last = s.scoreHistory[s.scoreHistory.length - 1];
        this.set({
          scoreHistory: s.scoreHistory.slice(0, -1),
          homeScore: last.team === 'home' ? s.homeScore - 1 : s.homeScore,
          awayScore: last.team === 'away' ? s.awayScore - 1 : s.awayScore,
          showProPanel: null,
        });
      },

      takeTimeout: (team) => {
        if (s.setEnded || s.matchEnded) return;
        const used = team === 'home' ? s.homeTimeouts : s.awayTimeouts;
        if (used.length >= 2) { this.set({ alertMessage: '⚠️ Max 2 timeouts per set' }); return; }
        this.set({ showTimeoutPopup: team });
      },

      confirmTimeout: () => {
        const team = s.showTimeoutPopup;
        const score = `${s.homeScore}-${s.awayScore}`;
        if (team === 'home') this.set({ homeTimeouts: [...s.homeTimeouts, score] });
        else this.set({ awayTimeouts: [...s.awayTimeouts, score] });
        this.set({ showTimeoutPopup: null });
      },

      setSelectedBenchPlayer: (id) => this.set({ selectedBenchPlayer: id }),

      makeSubstitution: (courtPlayerId) => {
        if (!s.selectedBenchPlayer) return;
        const field = [1, 2, 3, 4, 5, 6].map(p => s.homeLineup[p]);
        if (field.includes(s.selectedBenchPlayer)) {
          this.set({ alertMessage: 'Deze speler staat al op het veld', selectedBenchPlayer: null });
          return;
        }
        const prevOut = s.substitutions.find(x => x.playerOut === s.selectedBenchPlayer);
        if (prevOut && prevOut.playerIn !== courtPlayerId) {
          this.set({ alertMessage: 'Mag alleen terugkomen voor iemand anders', selectedBenchPlayer: null });
          return;
        }
        const pos = Object.entries(s.homeLineup).find(([, v]) => v === courtPlayerId)?.[0];
        this.set({
          homeLineup: pos ? { ...s.homeLineup, [pos]: s.selectedBenchPlayer } : s.homeLineup,
          substitutions: [...s.substitutions, { playerOut: courtPlayerId, playerIn: s.selectedBenchPlayer }],
          selectedBenchPlayer: null,
        });
      },

      setServingTeam: (team) => this.set({ servingTeam: team }),

      startNewSet: (keepLineup) => this.set({
        homeScore: 0, awayScore: 0, scoreHistory: [], setEnded: false,
        homeTimeouts: [], awayTimeouts: [], substitutions: [], __keepLineup: keepLineup,
      }),

      skipProPanel: () => this.set({ showProPanel: null }),
    };
  }
}

/** Draait een commando zoals de hook dat doet: één stap per render. */
function runCommand(app, method, params = {}, maxRenders = 40) {
  const cmd = COMMANDS[method];
  if (!cmd) throw new Error(`onbekend commando ${method}`);
  const ctx = { params };
  let i = 0;
  for (let r = 0; r < maxRenders; r++) {
    const outcome = cmd.steps[i](app.view(), ctx);
    if (outcome !== 'retry') i++;
    app.commit();
    if (i >= cmd.steps.length) {
      return cmd.result ? cmd.result(app.view(), ctx) : { ok: true };
    }
  }
  throw new Error(`commando '${method}' werd niet klaar binnen ${maxRenders} renders`);
}

// ---------------------------------------------------------------------------
console.log('\n\x1b[1mStappenmachine van de app-brug\x1b[0m');

test('punt scoren doorloopt popup, spelerkeuze en telt de stand op', () => {
  const app = new FakeApp();
  const r = runCommand(app, 'scorePoint', { team: 'home', type: 'attack', x: 40, y: 30, playerId: 2 });
  assertEqual(r.scored, 'home', 'scorend team');
  assertEqual(r.homeScore, 1, 'stand');
  assertEqual(app.cur.showPointTypePopup, null, 'punttype-popup bleef openstaan');
  assertEqual(app.cur.showPlayerSelectPopup, null, 'spelerkeuze bleef openstaan');
  assertEqual(app.cur.scoreHistory.at(-1).playerId, 2, 'speler niet vastgelegd');
});

test('ace slaat de spelerkeuze over', () => {
  const app = new FakeApp();
  const r = runCommand(app, 'scorePoint', { team: 'home', type: 'direct' });
  assertEqual(r.homeScore, 1, 'stand');
  assertEqual(app.cur.scoreHistory.at(-1).type, 'direct', 'punttype');
});

test('blok geeft het punt aan de tegenpartij', () => {
  const app = new FakeApp();
  const r = runCommand(app, 'scorePoint', { team: 'home', type: 'block', playerId: 2 });
  assertEqual(r.scored, 'away', 'bij een blok op de thuishelft scoort de tegenstander');
  assertEqual(r.awayScore, 1, 'stand tegenstander');
});

test('zonder spelerstatistiek gaat het punt in één keer door', () => {
  const app = new FakeApp({ trackPlayerStats: false });
  const r = runCommand(app, 'scorePoint', { team: 'home', type: 'attack' });
  assertEqual(r.homeScore, 1, 'stand');
  assertEqual(app.cur.scoreHistory.at(-1).playerId, null, 'geen speler verwacht');
});

test('Pro-paneel wordt gesloten zodat de app niet blijft hangen', () => {
  const app = new FakeApp({ proMode: true, servingTeam: 'away' }); // sideout -> paneel opent
  runCommand(app, 'scorePoint', { team: 'home', type: 'sideout', playerId: 2 });
  assertEqual(app.cur.showProPanel, null, 'Pro-paneel bleef openstaan');
});

test('punt na afgelopen set wordt geweigerd in plaats van vast te lopen', () => {
  const app = new FakeApp({ setEnded: true });
  assertThrows(() => runCommand(app, 'scorePoint', { team: 'home', type: 'attack' }), /afgelopen/);
});

test('undo draait het laatste punt terug', () => {
  const app = new FakeApp();
  runCommand(app, 'scorePoint', { team: 'home', type: 'attack', playerId: 2 });
  runCommand(app, 'scorePoint', { team: 'home', type: 'attack', playerId: 2 });
  assertEqual(app.cur.homeScore, 2, 'stand voor undo');
  const r = runCommand(app, 'undo');
  assertEqual(r.homeScore, 1, 'stand na undo');
  assertEqual(app.cur.scoreHistory.length, 1, 'geschiedenis');
});

test('undo zonder punten geeft een nette fout', () => {
  const app = new FakeApp();
  assertThrows(() => runCommand(app, 'undo'), /geen punt/);
});

test('timeout doorloopt de bevestigingspopup', () => {
  const app = new FakeApp();
  const r = runCommand(app, 'timeout', { team: 'home' });
  assertEqual(r.taken, 1, 'aantal timeouts');
  assertEqual(app.cur.showTimeoutPopup, null, 'popup bleef openstaan');
});

test('derde timeout wordt geweigerd met de melding uit de app', () => {
  const app = new FakeApp();
  runCommand(app, 'timeout', { team: 'home' });
  runCommand(app, 'timeout', { team: 'home' });
  assertThrows(() => runCommand(app, 'timeout', { team: 'home' }), /Max 2 timeouts/);
});

test('timeout na afgelopen wedstrijd wordt geweigerd', () => {
  const app = new FakeApp({ matchEnded: true });
  assertThrows(() => runCommand(app, 'timeout', { team: 'home' }), /geweigerd|Max/);
});

test('wissel selecteert de bankspeler en voert de wissel uit', () => {
  const app = new FakeApp();
  const r = runCommand(app, 'substitute', { courtPlayerId: 2, benchPlayerId: 8 });
  assertEqual(r.substitutions, 1, 'aantal wissels');
  assertEqual(app.cur.homeLineup[2], 8, 'speler staat niet op de juiste positie');
  assertEqual(app.cur.selectedBenchPlayer, null, 'bankselectie niet opgeruimd');
});

test('wissel met een speler die al op het veld staat wordt geweigerd', () => {
  const app = new FakeApp();
  assertThrows(() => runCommand(app, 'substitute', { courtPlayerId: 2, benchPlayerId: 3 }),
    /niet op de bank|al op het veld/);
});

test('wissel met een onbekend speler-id wordt geweigerd door de brug', () => {
  // De app zelf controleert dit niet, omdat je daar altijd uit de bank kiest.
  const app = new FakeApp();
  assertThrows(() => runCommand(app, 'substitute', { courtPlayerId: 2, benchPlayerId: 999 }),
    /niet op de bank/);
  assertEqual(app.cur.substitutions.length, 0, 'er mag geen wissel zijn vastgelegd');
  assertEqual(app.cur.homeLineup[2], 2, 'de opstelling mag niet aangepast zijn');
});

test('wissel met een speler die niet op het veld staat wordt geweigerd', () => {
  const app = new FakeApp();
  assertThrows(() => runCommand(app, 'substitute', { courtPlayerId: 42, benchPlayerId: 8 }),
    /niet op het veld/);
});

test('terugwissel-regel wordt gerespecteerd', () => {
  const app = new FakeApp();
  runCommand(app, 'substitute', { courtPlayerId: 2, benchPlayerId: 8 });
  // Speler 2 mag alleen terug voor 8; terugkomen voor 3 hoort te falen.
  assertThrows(() => runCommand(app, 'substitute', { courtPlayerId: 3, benchPlayerId: 2 }), /terugkomen/);
});

test('serverend team zetten werkt', () => {
  const app = new FakeApp();
  const r = runCommand(app, 'setServing', { team: 'away' });
  assertEqual(r.servingTeam, 'away', 'servingTeam');
});

test('nieuwe set zet de stand op nul', () => {
  const app = new FakeApp();
  runCommand(app, 'scorePoint', { team: 'home', type: 'attack', playerId: 2 });
  const r = runCommand(app, 'startNewSet', { keepLineup: true });
  assertEqual(r.homeScore, 0, 'stand thuis');
  assertEqual(r.awayScore, 0, 'stand uit');
  assertEqual(app.cur.__keepLineup, true, 'keepLineup niet doorgegeven');
});

test('lezers geven een schone momentopname zonder functies', () => {
  const app = new FakeApp();
  const s = READERS.getState(app.view());
  assertEqual(typeof s.scorePoint, 'undefined', 'functies horen niet in de snapshot');
  assertEqual(s.homeScore, 0, 'stand');
  assertEqual(s.teamName, 'VCV', 'teamnaam');
  assertEqual(JSON.stringify(s).length > 100, true, 'snapshot lijkt leeg');
  assertEqual(READERS.getPlayers(app.view()).length, 3, 'spelers');
  assertEqual(READERS.getTeamName(app.view()), 'VCV', 'teamnaam via reader');
});

test('rotatie zit alleen in de snapshot als Pro-modus aanstaat', () => {
  assertEqual(snapshot(new FakeApp().view()).rotation, null, 'zonder Pro hoort rotatie leeg');
  assertEqual(snapshot(new FakeApp({ proMode: true }).view()).rotation, 1, 'met Pro hoort rotatie gevuld');
});

test('meerdere punten achter elkaar blijven kloppen', () => {
  const app = new FakeApp();
  for (let i = 0; i < 5; i++) runCommand(app, 'scorePoint', { team: 'home', type: 'attack', playerId: 2 });
  for (let i = 0; i < 3; i++) runCommand(app, 'scorePoint', { team: 'away', type: 'attack', playerId: 101 });
  assertEqual(app.cur.homeScore, 5, 'stand thuis');
  assertEqual(app.cur.awayScore, 3, 'stand uit');
  assertEqual(app.cur.scoreHistory.length, 8, 'geschiedenis');
});

// ---------------------------------------------------------------------------
const pass = results.filter(r => r.ok).length;
const fail = results.filter(r => !r.ok);
console.log(`\n${'-'.repeat(60)}`);
console.log(`\x1b[32m${pass} geslaagd\x1b[0m, \x1b[31m${fail.length} mislukt\x1b[0m  (${results.length} totaal)`);
if (fail.length) {
  for (const f of fail) console.log(`  - ${f.name}: ${f.error}`);
  process.exitCode = 1;
}
