/**
 * Live-brug tussen de app en de VolleyWarrior MCP-server.
 *
 * Staat standaard UIT. Aanzetten in de browserconsole van de app:
 *   localStorage.setItem('vwMcpBridge', '1'); location.reload();
 * Uitzetten:
 *   localStorage.removeItem('vwMcpBridge'); location.reload();
 *
 * Andere server (bijvoorbeeld een tablet die naar je laptop verbindt):
 *   localStorage.setItem('vwMcpBridgeUrl', 'ws://192.168.1.20:7823');
 *
 * Waarom een stappenmachine: veel acties in useMatchState verlopen in twee
 * stappen via een tussenliggende popup-state (punt -> punttype -> speler,
 * timeout -> bevestigen, bankspeler kiezen -> wisselen). Die tweede stap kan
 * pas na een nieuwe render, want de eerste leest zijn gegevens uit state die
 * op dat moment nog niet bijgewerkt is. Elke stap draait daarom in een eigen
 * render; `tick` forceert die render ook als een stap zelf niets wijzigt.
 */
import { useEffect, useRef, useState } from 'react';

const DEFAULT_URL = 'ws://localhost:7823';
const RECONNECT_MS = 3000;
const COMMAND_TIMEOUT_MS = 5000;

function query(name) {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}

function bridgeEnabled() {
  // ?mcpbridge=1 in de URL werkt ook, handig om zonder console te testen.
  if (query('mcpbridge') === '1') return true;
  try {
    return localStorage.getItem('vwMcpBridge') === '1';
  } catch {
    return false; // localStorage geblokkeerd (privémodus)
  }
}

function bridgeUrl() {
  const fromQuery = query('mcpbridgeurl');
  if (fromQuery) return fromQuery;
  try {
    return localStorage.getItem('vwMcpBridgeUrl') || DEFAULT_URL;
  } catch {
    return DEFAULT_URL;
  }
}

/** Snapshot van de wedstrijdstand; alleen data, geen functies. */
export function snapshot(s) {
  return {
    homeScore: s.homeScore,
    awayScore: s.awayScore,
    sets: s.sets,
    servingTeam: s.servingTeam,
    setEnded: s.setEnded,
    matchEnded: s.matchEnded,
    setWinner: s.setWinner,
    matchWinner: s.matchWinner,
    homeLineup: s.homeLineup,
    awayLineup: s.awayLineup,
    homeTimeouts: s.homeTimeouts,
    awayTimeouts: s.awayTimeouts,
    substitutions: s.substitutions,
    formationSystem: s.formationSystem,
    proMode: s.proMode,
    rotation: s.proMode ? s.getRotation() : null,
    teamName: s.teamName,
    opponentName: s.opponentName,
    matchDate: s.matchDate,
    activeTab: s.activeTab,
    pointStats: s.pointStats,
    scoreHistory: s.scoreHistory,
    fieldPlayers: s.fieldPlayers,
    benchPlayers: (s.benchPlayers || []).map(p => ({ id: p.id, name: p.name, number: p.number, role: p.role })),
    lastPoint: s.scoreHistory?.length ? s.scoreHistory[s.scoreHistory.length - 1] : null,
  };
}

/**
 * Commando's die meerdere renders nodig hebben.
 * Een stap geeft 'retry' terug om het in de volgende render nog eens te proberen;
 * alles anders betekent: klaar, door naar de volgende stap.
 */
export const COMMANDS = {
  scorePoint: {
    steps: [
      (s, ctx) => {
        if (s.setEnded || s.matchEnded) {
          throw new Error('Set of wedstrijd is afgelopen; punt niet geregistreerd.');
        }
        ctx.before = { home: s.homeScore, away: s.awayScore };
        s.scorePoint(ctx.params.team, ctx.params.x ?? 50, ctx.params.y ?? 50);
      },
      (s, ctx) => {
        if (!s.showPointTypePopup) return 'retry';
        s.confirmPointType(ctx.params.type);
      },
      (s, ctx) => {
        // Voor 'direct' en bij uitgezette spelerstatistiek komt deze popup niet.
        if (s.showPlayerSelectPopup) {
          s.confirmPlayerSelect(ctx.params.playerId ?? null);
          return;
        }
        if (s.homeScore === ctx.before.home && s.awayScore === ctx.before.away) return 'retry';
      },
      (s) => {
        // Punt is verwerkt; het Pro-paneel zou hier blijven hangen omdat er geen
        // mens is die het invult.
        if (s.showProPanel) s.skipProPanel();
      },
    ],
    result: (s, ctx) => {
      const scored = s.homeScore > ctx.before.home ? 'home'
        : s.awayScore > ctx.before.away ? 'away' : null;
      if (!scored) throw new Error('Punt is niet verwerkt door de app.');
      return { scored, homeScore: s.homeScore, awayScore: s.awayScore, setEnded: s.setEnded, matchEnded: s.matchEnded };
    },
  },

  undo: {
    steps: [
      (s, ctx) => {
        if (!s.scoreHistory?.length) throw new Error('Er is geen punt om terug te draaien.');
        ctx.before = { home: s.homeScore, away: s.awayScore, len: s.scoreHistory.length };
        s.undoLastPoint();
      },
      (s, ctx) => {
        if (s.scoreHistory.length >= ctx.before.len) return 'retry';
      },
    ],
    result: (s) => ({ undone: true, homeScore: s.homeScore, awayScore: s.awayScore }),
  },

  timeout: {
    steps: [
      (s, ctx) => {
        ctx.before = (s[ctx.params.team === 'home' ? 'homeTimeouts' : 'awayTimeouts'] || []).length;
        ctx.alertBefore = s.alertMessage;
        s.takeTimeout(ctx.params.team);
      },
      (s, ctx) => {
        // takeTimeout weigert stil bij 2 timeouts of een afgelopen set: dan
        // verschijnt er geen popup maar wel een melding.
        if (!s.showTimeoutPopup) {
          if (s.alertMessage && s.alertMessage !== ctx.alertBefore) throw new Error(s.alertMessage);
          throw new Error('Timeout geweigerd door de app (set afgelopen of maximum bereikt).');
        }
        s.confirmTimeout();
      },
      (s, ctx) => {
        const now = (s[ctx.params.team === 'home' ? 'homeTimeouts' : 'awayTimeouts'] || []).length;
        if (now <= ctx.before) return 'retry';
      },
    ],
    result: (s, ctx) => ({
      team: ctx.params.team,
      taken: (s[ctx.params.team === 'home' ? 'homeTimeouts' : 'awayTimeouts'] || []).length,
    }),
  },

  substitute: {
    steps: [
      // In de app kies je een bankspeler uit een lijst, dus makeSubstitution
      // gaat ervan uit dat het id bestaat. Via de brug is dat niet gegeven:
      // een onbekend id zou anders zonder klagen in de opstelling belanden.
      (s, ctx) => {
        const bench = (s.benchPlayers || []).map(p => p.id);
        if (!bench.includes(ctx.params.benchPlayerId)) {
          throw new Error(
            `Speler ${ctx.params.benchPlayerId} staat niet op de bank. ` +
            `Beschikbaar: ${bench.length ? bench.join(', ') : 'niemand'}.`
          );
        }
        const field = Object.values(s.homeLineup || {}).slice(0, 6);
        if (!field.includes(ctx.params.courtPlayerId)) {
          throw new Error(`Speler ${ctx.params.courtPlayerId} staat niet op het veld.`);
        }
      },
      (s, ctx) => {
        ctx.before = s.substitutions.length;
        ctx.alertBefore = s.alertMessage;
        s.setSelectedBenchPlayer(ctx.params.benchPlayerId);
      },
      (s, ctx) => {
        if (s.selectedBenchPlayer !== ctx.params.benchPlayerId) return 'retry';
        s.makeSubstitution(ctx.params.courtPlayerId);
      },
      (s, ctx) => {
        if (s.substitutions.length > ctx.before) return; // gelukt
        // makeSubstitution weigert via showAlert en zet de wisselmodus uit.
        if (s.alertMessage && s.alertMessage !== ctx.alertBefore) throw new Error(s.alertMessage);
        if (s.selectedBenchPlayer == null) throw new Error('Wissel geweigerd door de app.');
        return 'retry';
      },
    ],
    result: (s, ctx) => ({
      out: ctx.params.courtPlayerId,
      in: ctx.params.benchPlayerId,
      substitutions: s.substitutions.length,
      homeLineup: s.homeLineup,
    }),
  },

  setServing: {
    steps: [
      (s, ctx) => s.setServingTeam(ctx.params.team),
      (s, ctx) => { if (s.servingTeam !== ctx.params.team) return 'retry'; },
    ],
    result: (s) => ({ servingTeam: s.servingTeam }),
  },

  startNewSet: {
    steps: [
      (s, ctx) => { ctx.before = s.sets; s.startNewSet(ctx.params.keepLineup !== false); },
      (s) => { if (s.homeScore !== 0 || s.awayScore !== 0) return 'retry'; },
    ],
    result: (s) => ({ newSet: true, sets: s.sets, homeScore: s.homeScore, awayScore: s.awayScore }),
  },
};

/** Commando's die meteen antwoord kunnen geven. */
export const READERS = {
  getState: (s) => snapshot(s),
  getPlayers: (s) => s.players,
  getMatches: (s) => s.savedMatches,
  getTeamName: (s) => s.teamName,
};

export default function useMcpBridge(state) {
  const stateRef = useRef(state);
  stateRef.current = state;

  const wsRef = useRef(null);
  const pendingRef = useRef(null);
  const queueRef = useRef([]);
  const [, setTick] = useState(0);

  // --- verbinding ---------------------------------------------------------
  useEffect(() => {
    if (!bridgeEnabled()) return;

    let closed = false;
    let reconnectTimer = null;
    let current = null; // de socket van deze effect-uitvoering

    const connect = () => {
      if (closed) return;
      let ws;
      try {
        ws = new WebSocket(bridgeUrl());
      } catch {
        reconnectTimer = setTimeout(connect, RECONNECT_MS);
        return;
      }
      current = ws;
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'hello',
          role: 'app',
          appVersion: '18.0.0',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'onbekend',
        }));
        ws.send(JSON.stringify({ type: 'event', event: 'state', state: snapshot(stateRef.current) }));
        console.info('[VW] MCP-brug verbonden met', bridgeUrl());
      };

      ws.onmessage = (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }
        if (msg.type !== 'request') return;
        queueRef.current.push(msg);
        setTick(t => t + 1);
      };

      ws.onclose = () => {
        // Alleen opruimen als dit nog de actuele socket is. In StrictMode wordt
        // dit effect twee keer gemount; de onclose van de weggegooide eerste
        // socket komt pas binnen als de tweede al staat, en zou die anders wissen.
        if (wsRef.current === ws) wsRef.current = null;
        if (!closed) reconnectTimer = setTimeout(connect, RECONNECT_MS);
      };

      ws.onerror = () => { try { ws.close(); } catch { /* al dicht */ } };
    };

    connect();

    return () => {
      closed = true;
      clearTimeout(reconnectTimer);
      if (current) { try { current.close(); } catch { /* al dicht */ } }
      if (wsRef.current === current) wsRef.current = null;
    };
  }, []);

  // --- commando's uitvoeren, één stap per render --------------------------
  useEffect(() => {
    if (!bridgeEnabled()) return;

    const send = (obj) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
    };

    const finish = (id, ok, payload) => {
      send(ok ? { type: 'response', id, ok: true, result: payload }
              : { type: 'response', id, ok: false, error: payload });
      pendingRef.current = null;
      setTick(t => t + 1); // eventuele volgende opdracht meteen oppakken
    };

    // Loopt er iets? Dan één stap zetten.
    const p = pendingRef.current;
    if (p) {
      if (Date.now() - p.started > COMMAND_TIMEOUT_MS) {
        finish(p.id, false, `App reageerde niet binnen ${COMMAND_TIMEOUT_MS}ms op '${p.method}'.`);
        return;
      }
      try {
        const outcome = p.steps[p.i](stateRef.current, p.ctx);
        if (outcome !== 'retry') p.i++;
        if (p.i >= p.steps.length) {
          finish(p.id, true, p.result ? p.result(stateRef.current, p.ctx) : { ok: true });
        } else {
          setTick(t => t + 1); // volgende stap in een volgende render
        }
      } catch (err) {
        finish(p.id, false, err.message || String(err));
      }
      return;
    }

    // Niets bezig: volgende opdracht uit de wachtrij pakken.
    const msg = queueRef.current.shift();
    if (!msg) return;

    const s = stateRef.current;

    if (READERS[msg.method]) {
      try {
        send({ type: 'response', id: msg.id, ok: true, result: READERS[msg.method](s) });
      } catch (err) {
        send({ type: 'response', id: msg.id, ok: false, error: err.message || String(err) });
      }
      setTick(t => t + 1);
      return;
    }

    const cmd = COMMANDS[msg.method];
    if (!cmd) {
      send({ type: 'response', id: msg.id, ok: false, error: `Onbekende methode: ${msg.method}` });
      setTick(t => t + 1);
      return;
    }

    pendingRef.current = {
      id: msg.id,
      method: msg.method,
      steps: cmd.steps,
      result: cmd.result,
      ctx: { params: msg.params || {} },
      i: 0,
      started: Date.now(),
    };
    setTick(t => t + 1);
  });

  // --- state pushen zodat vw_live_state ook 'cached' kan werken -----------
  useEffect(() => {
    if (!bridgeEnabled()) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (pendingRef.current) return; // niet pushen midden in een opdracht
    ws.send(JSON.stringify({ type: 'event', event: 'state', state: snapshot(stateRef.current) }));
  }, [state.homeScore, state.awayScore, state.sets, state.servingTeam, state.setEnded, state.matchEnded]);
}
