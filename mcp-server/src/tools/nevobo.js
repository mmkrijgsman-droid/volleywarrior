/** Tools voor het opzoeken van verenigingen, teams en wedstrijden bij Nevobo. */
import { z } from 'zod';
import { ok, handler } from './_util.js';
import { searchClubs, fetchTeams, fetchMatches } from '../lib/nevobo.js';

export function registerNevoboTools(server) {
  server.registerTool('vw_nevobo_search_clubs', {
    title: 'Vereniging zoeken',
    description:
      'Zoekt verenigingen in de publieke Nevobo-API op naam, plaats of verenigingscode. ' +
      'De eerste aanroep haalt de hele lijst op (kan enkele seconden duren) en cachet die daarna 6 uur.',
    inputSchema: {
      query: z.string().min(2).describe('zoekterm: naam, plaats of code'),
      limit: z.number().int().positive().max(50).default(20),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, handler(async ({ query, limit }) => {
    const clubs = await searchClubs(query, limit);
    if (clubs.length === 0) throw new Error(`Geen vereniging gevonden voor "${query}".`);
    return ok({ query, count: clubs.length, clubs });
  }));

  server.registerTool('vw_nevobo_teams', {
    title: 'Teams van een vereniging',
    description: 'Haalt de teams van een vereniging op. clubCode is de Nevobo-organisatiecode, bijvoorbeeld CKL9Y5O.',
    inputSchema: {
      clubCode: z.string().min(3).describe('Nevobo-organisatiecode van de vereniging'),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, handler(async ({ clubCode }) => {
    const teams = await fetchTeams(clubCode);
    return ok({ clubCode, count: teams.length, teams });
  }));

  server.registerTool('vw_nevobo_matches', {
    title: 'Wedstrijdschema van een team',
    description:
      'Haalt het wedstrijdschema van een team op: datum, tijd, thuis- en uitteam, status en uitslag. ' +
      'teamCode komt uit vw_nevobo_teams.',
    inputSchema: {
      teamCode: z.string().min(3).describe('Nevobo-teamcode'),
      upcomingOnly: z.boolean().default(false).describe('true = alleen wedstrijden vanaf vandaag'),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, handler(async ({ teamCode, upcomingOnly }) => {
    let matches = await fetchMatches(teamCode);
    if (upcomingOnly) {
      const today = new Date().toISOString().slice(0, 10);
      matches = matches.filter(m => (m.datum || '') >= today);
    }
    return ok({ teamCode, upcomingOnly: !!upcomingOnly, count: matches.length, matches });
  }));
}
