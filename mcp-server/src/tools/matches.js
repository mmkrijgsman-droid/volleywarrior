/** Tools voor opgeslagen wedstrijddata en statistiek-analyse. */
import { z } from 'zod';
import { ok, handler } from './_util.js';
import { loadStore, saveStore, normalizeImport, findMatch, DATA_FILE } from '../lib/store.js';
import {
  analyzeRotations, analyzeReception, analyzeAttackEfficiency, analyzeServeZones,
  findScoringRuns, flattenHeatmaps, flattenScoreHistory, summarizeMatch, pointTypeBreakdown,
} from '../lib/analysis.js';

const MATCH_REF = z.string().optional().describe(
  'Wedstrijd-id of (deel van) de tegenstandersnaam. Leeg = meest recente wedstrijd.'
);

async function requireMatch(ref) {
  const store = await loadStore();
  if (store.matches.length === 0) {
    throw new Error(
      'Geen wedstrijden in de datastore. Gebruik vw_sync_from_app (app moet draaien) of vw_import_data.'
    );
  }
  const match = findMatch(store.matches, ref);
  if (!match) throw new Error(`Geen wedstrijd gevonden voor "${ref}".`);
  return { store, match };
}

export function registerMatchTools(server) {
  server.registerTool('vw_store_info', {
    title: 'Datastore-info',
    description: 'Toont waar de lokale datastore staat en hoeveel spelers en wedstrijden erin zitten.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, handler(async () => {
    const store = await loadStore();
    return ok({
      file: DATA_FILE,
      players: store.players.length,
      matches: store.matches.length,
      teamName: store.teamName,
      updatedAt: store.updatedAt,
    });
  }));

  server.registerTool('vw_import_data', {
    title: 'Data importeren',
    description:
      'Importeert spelers en wedstrijden uit een localStorage-export. Accepteert zowel ' +
      '{"volleyballPlayers":..., "volleyballMatches":...} als {"players":..., "matches":...}, ' +
      'en zowel echte arrays als JSON-strings.',
    inputSchema: {
      json: z.string().describe('De JSON-export als string'),
      merge: z.boolean().default(false).describe(
        'true = voeg samen met wat er al staat (op id); false = overschrijf de datastore'
      ),
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, handler(async ({ json, merge }) => {
    const incoming = normalizeImport(json);
    let next = incoming;

    if (merge) {
      const prev = await loadStore();
      const mergeById = (a, b) => {
        const map = new Map(a.map(x => [String(x.id), x]));
        for (const x of b) map.set(String(x.id), x);
        return [...map.values()];
      };
      next = {
        players: mergeById(prev.players, incoming.players),
        matches: mergeById(prev.matches, incoming.matches),
        teamName: incoming.teamName ?? prev.teamName,
      };
    }

    const saved = await saveStore(next);
    return ok({
      imported: true,
      merge: !!merge,
      players: saved.players.length,
      matches: saved.matches.length,
      teamName: saved.teamName,
      file: DATA_FILE,
    });
  }));

  server.registerTool('vw_list_players', {
    title: 'Spelers tonen',
    description: 'Toont de spelerslijst uit de datastore, met rugnummer en rol.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, handler(async () => {
    const store = await loadStore();
    return ok(store.players.map(p => ({
      id: p.id, name: p.name, number: p.number, role: p.role, isLibero: !!p.isLibero,
    })));
  }));

  server.registerTool('vw_list_matches', {
    title: 'Wedstrijden tonen',
    description: 'Toont alle opgeslagen wedstrijden met eindstand, setstanden en of er Pro-data in zit.',
    inputSchema: {
      opponent: z.string().optional().describe('filter op (deel van) de tegenstandersnaam'),
      limit: z.number().int().positive().max(200).default(50),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, handler(async ({ opponent, limit }) => {
    const store = await loadStore();
    let list = store.matches;
    if (opponent) {
      const q = opponent.toLowerCase();
      list = list.filter(m => (m.opponent || '').toLowerCase().includes(q));
    }
    const sorted = [...list].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, limit);
    return ok({ count: sorted.length, totalInStore: store.matches.length, matches: sorted.map(summarizeMatch) });
  }));

  server.registerTool('vw_match_detail', {
    title: 'Wedstrijddetail',
    description:
      'Detail van een wedstrijd: setstanden, punttype-verdeling met percentages, ' +
      'wissels en het aantal geregistreerde punten.',
    inputSchema: { match: MATCH_REF },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, handler(async ({ match: ref }) => {
    const { match } = await requireMatch(ref);
    return ok({
      ...summarizeMatch(match),
      pointTypes: pointTypeBreakdown(match.pointStats),
      substitutions: match.substitutions || [],
      playerStats: match.playerStats || {},
    });
  }));

  server.registerTool('vw_analyze_match', {
    title: 'Wedstrijd analyseren (Pro)',
    description:
      'Volledige Pro-analyse van een wedstrijd: rendement per rotatie, receptiekwaliteit ' +
      '(totaal en per speler), aanvalsefficientie per speler, servicezones met ace-percentage ' +
      'en scoringsreeksen. Gebruikt exact dezelfde berekening als de Stats-tab in de app.',
    inputSchema: {
      match: MATCH_REF,
      team: z.enum(['home', 'away']).default('home').describe('vanuit welk team de rotatie-analyse rekent'),
      minRunLength: z.number().int().min(2).max(15).default(3).describe('minimale lengte van een scoringsreeks'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, handler(async ({ match: ref, team, minRunLength }) => {
    const { store, match } = await requireMatch(ref);
    const heat = flattenHeatmaps(match);
    const history = flattenScoreHistory(match);

    if (heat.length === 0) {
      throw new Error(`Wedstrijd tegen ${match.opponent} bevat geen puntdata om te analyseren.`);
    }

    const hasPro = heat.some(d => d.rotation != null || d.receptionQuality != null || d.serveZone != null);

    return ok({
      match: summarizeMatch(match),
      hasProData: hasPro,
      note: hasPro ? undefined
        : 'Deze wedstrijd is zonder Pro-modus opgenomen; rotatie-, receptie- en servicezone-cijfers zijn daarom leeg.',
      pointTypes: pointTypeBreakdown(match.pointStats),
      rotations: analyzeRotations(heat, team),
      reception: analyzeReception(heat, store.players),
      attackEfficiency: analyzeAttackEfficiency(heat, store.players),
      serveZones: analyzeServeZones(heat),
      scoringRuns: findScoringRuns(history, minRunLength),
    });
  }));

  server.registerTool('vw_player_report', {
    title: 'Spelersrapport',
    description:
      'Rapport per speler over alle opgeslagen wedstrijden heen: punten per type, ' +
      'aanvalsefficientie en receptiekwaliteit.',
    inputSchema: {
      playerId: z.number().optional().describe('beperk tot een speler-id; leeg = alle spelers'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, handler(async ({ playerId }) => {
    const store = await loadStore();
    if (store.matches.length === 0) throw new Error('Geen wedstrijden in de datastore.');

    const allHeat = store.matches.flatMap(flattenHeatmaps);
    const attack = analyzeAttackEfficiency(allHeat, store.players);
    const reception = analyzeReception(allHeat, store.players).byPlayer;

    const totals = {};
    for (const m of store.matches) {
      for (const [pid, stats] of Object.entries(m.playerStats || {})) {
        totals[pid] = totals[pid] || { direct: 0, sideout: 0, block: 0, attack: 0, error: 0, servicefault: 0 };
        for (const [k, v] of Object.entries(stats)) totals[pid][k] = (totals[pid][k] || 0) + v;
      }
    }

    const ids = playerId != null ? [playerId] : store.players.map(p => p.id);
    const report = ids.map(id => {
      const p = store.players.find(pl => pl.id === id);
      return {
        id,
        name: p?.name || '?',
        number: p?.number ?? '?',
        role: p?.role || '?',
        points: totals[id] || null,
        attack: attack[id] || null,
        reception: reception[id] || null,
      };
    });

    return ok({ matchesAnalyzed: store.matches.length, players: report });
  }));
}
