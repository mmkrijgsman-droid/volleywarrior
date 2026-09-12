/** Tools die via de WebSocket-brug met de draaiende app praten. */
import { z } from 'zod';
import { ok, handler } from './_util.js';
import { loadStore, saveStore } from '../lib/store.js';

const TEAM = z.enum(['home', 'away']);
const POINT_TYPE = z.enum(['direct', 'sideout', 'block', 'attack', 'error']);

export function registerLiveTools(server, bridge) {
  server.registerTool('vw_live_status', {
    title: 'Live-brug status',
    description:
      'Toont of de VolleyWarrior-app verbonden is met de MCP-brug, op welke poort, ' +
      'sinds wanneer, en wanneer de laatste state-update binnenkwam. Vereist geen app.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, handler(async () => ok(bridge.status())));

  server.registerTool('vw_live_state', {
    title: 'Live wedstrijdstand',
    description:
      'Haalt de actuele wedstrijdstate op uit de draaiende app: stand, sets, opstelling, ' +
      'servicebeurt, timeouts, rotatie (Pro-modus), spelers op het veld en op de bank.',
    inputSchema: {
      cached: z.boolean().optional().describe(
        'true = gebruik de laatst gepushte state zonder de app te bevragen (sneller, kan iets verouderd zijn)'
      ),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, handler(async ({ cached }) => {
    if (cached) {
      if (!bridge.lastState) throw new Error('Nog geen state ontvangen van de app.');
      return ok({ state: bridge.lastState, receivedAt: bridge.lastStateAt, cached: true });
    }
    return ok({ state: await bridge.request('getState'), cached: false });
  }));

  server.registerTool('vw_live_score_point', {
    title: 'Punt registreren',
    description:
      'Registreert een punt in de draaiende app, alsof je op het veld tikt. ' +
      'team = de veldhelft waarop getikt wordt (bij type "block" scoort de tegenpartij, ' +
      'net als in de app). x/y zijn percentages 0-100 op het speelveld.',
    inputSchema: {
      team: TEAM.describe('veldhelft waarop getikt wordt'),
      type: POINT_TYPE.describe('punttype: direct (ace), sideout, block, attack of error'),
      x: z.number().min(0).max(100).default(50).describe('x-positie in procenten'),
      y: z.number().min(0).max(100).default(50).describe('y-positie in procenten'),
      playerId: z.number().optional().describe('speler-id voor de spelerstatistiek (optioneel)'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  }, handler(async (args) => ok(await bridge.request('scorePoint', args))));

  server.registerTool('vw_live_undo', {
    title: 'Laatste punt terugdraaien',
    description: 'Draait het laatst geregistreerde punt terug (zelfde als de ↩-knop in de app).',
    inputSchema: {},
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
  }, handler(async () => ok(await bridge.request('undo'))));

  server.registerTool('vw_live_timeout', {
    title: 'Timeout nemen',
    description: 'Neemt een timeout voor het opgegeven team.',
    inputSchema: { team: TEAM },
    annotations: { readOnlyHint: false, destructiveHint: false },
  }, handler(async ({ team }) => ok(await bridge.request('timeout', { team }))));

  server.registerTool('vw_live_substitute', {
    title: 'Wissel doorvoeren',
    description:
      'Wisselt een speler op het veld om voor een speler van de bank. ' +
      'De app past dezelfde validatie toe als handmatig wisselen (terugwissel-regel, dubbele opstelling).',
    inputSchema: {
      courtPlayerId: z.number().describe('id van de speler die eruit gaat'),
      benchPlayerId: z.number().describe('id van de speler die erin komt'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  }, handler(async (args) => ok(await bridge.request('substitute', args))));

  server.registerTool('vw_live_set_serving', {
    title: 'Serverend team zetten',
    description: 'Zet welk team serveert. Handig bij de start van een set.',
    inputSchema: { team: TEAM },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  }, handler(async ({ team }) => ok(await bridge.request('setServing', { team }))));

  server.registerTool('vw_live_new_set', {
    title: 'Nieuwe set starten',
    description: 'Start een nieuwe set in de app.',
    inputSchema: {
      keepLineup: z.boolean().default(true).describe('true = huidige opstelling behouden'),
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, handler(async ({ keepLineup }) => ok(await bridge.request('startNewSet', { keepLineup }))));

  server.registerTool('vw_sync_from_app', {
    title: 'Data ophalen uit de app',
    description:
      'Haalt de spelerslijst en alle opgeslagen wedstrijden uit de draaiende app op en ' +
      'schrijft ze naar de lokale datastore, zodat de analyse-tools ermee kunnen werken.',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  }, handler(async () => {
    const [players, matches, teamName] = await Promise.all([
      bridge.request('getPlayers'),
      bridge.request('getMatches'),
      bridge.request('getTeamName').catch(() => null),
    ]);
    const prev = await loadStore();
    const saved = await saveStore({ players, matches, teamName: teamName ?? prev.teamName });
    return ok({
      synced: true,
      players: saved.players.length,
      matches: saved.matches.length,
      teamName: saved.teamName,
      updatedAt: saved.updatedAt,
    });
  }));
}
