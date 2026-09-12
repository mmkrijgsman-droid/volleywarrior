import { Capacitor } from '@capacitor/core';

/**
 * Publieke Nevobo-competitieclient (geen login nodig).
 *
 * Native belt rechtstreeks api.nevobo.nl; op web via de Vite-proxy /nevobo-api.
 * Levert teams, wedstrijden (met per-set scores!) en poules — de databron voor
 * het programma, de uitslagen, de stand en de scouting/prognose.
 */
const isNative = Capacitor.isNativePlatform();
const BASE = isNative ? 'https://api.nevobo.nl' : '/nevobo-api';

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Nevobo ${res.status} bij ${path}`);
  return res.json();
}

/** Poulecode zit in het @id-pad, bv. /competitie/wedstrijden/regio-west/.../regio-west-h3j-2/JA/1/1 */
function extractPoule(id) {
  if (!id) return null;
  const seg = id.split('/').find(s => /-\d+$/.test(s) && s.includes('-'));
  return seg || null;
}

/** Alle teams van een vereniging (clubcode, bv. CKL9Y5O = VCV). */
export async function fetchClubTeams(clubCode) {
  const data = await getJson(`/v1/competitie/teams?vereniging=${encodeURIComponent(clubCode)}&limit=50`);
  const items = data._embedded?.items || [];
  return items
    .map(t => ({ code: t.code, naam: t.naam, volgnummer: t.volgnummer, rank: t.sortableRank }))
    .filter(t => t.code);
}

function normalizeMatch(it) {
  const th = it._embedded?.pouleindeling_thuis?._embedded?.team;
  const uit = it._embedded?.pouleindeling_uit?._embedded?.team;
  const u = it.uitslag;
  return {
    uuid: it.uuid,
    datum: it.datum,
    tijd: it.tijd,
    status: it.status,                 // 'gepland' | 'gespeeld' | ...
    dwfUrl: it.dwf_url || null,
    wedstrijdcode: it.wedstrijdcode,
    pouleCode: extractPoule(it['@id']),
    home: { code: th?.code || null, naam: th?.naam || it._embedded?.pouleindeling_thuis?.omschrijving || '' },
    away: { code: uit?.code || null, naam: uit?.naam || it._embedded?.pouleindeling_uit?.omschrijving || '' },
    setstanden: Array.isArray(it.setstanden) ? it.setstanden.map(s => ({ set: s.set, a: s.punten_a, b: s.punten_b })) : [],
    uitslag: u ? { setsA: u.sets_a, setsB: u.sets_b, code: u.code, puntenA: u.punten_a, puntenB: u.punten_b } : null,
  };
}

/** Programma + uitslagen van één team (teamcode, bv. ckl9y5o-hs-4). */
export async function fetchTeamMatches(teamCode) {
  const data = await getJson(`/v1/competitie/wedstrijden?team=${encodeURIComponent(teamCode)}&limit=50`);
  return (data._embedded?.items || []).map(normalizeMatch);
}

/** Alle wedstrijden in een poule (voor de stand). */
export async function fetchPouleMatches(pouleCode) {
  const data = await getJson(`/v1/competitie/wedstrijden?poule=${encodeURIComponent(pouleCode)}&limit=200`);
  return (data._embedded?.items || []).map(normalizeMatch);
}

/** Poule-metadata (klasse, telmethode). */
export async function fetchPoule(pouleCode) {
  const p = await getJson(`/v1/competitie/poules/${encodeURIComponent(pouleCode)}`);
  return { code: p.code, omschrijving: p.omschrijving, standBerekenbaar: p.is_stand_berekenbaar };
}

/**
 * Berekent de stand uit gespeelde poulewedstrijden. De API levert de
 * competitiepunten per wedstrijd (uitslag.puntenA/B), dus die tellen we op —
 * geen aparte telmethode nodig.
 */
export function computeStandings(matches) {
  const table = {};
  const row = (code, naam) => (table[code] ||= { code, naam, played: 0, won: 0, lost: 0, points: 0, setsFor: 0, setsAgainst: 0 });

  for (const m of matches) {
    if (!m.uitslag || !m.home.code || !m.away.code) continue;
    const h = row(m.home.code, m.home.naam);
    const a = row(m.away.code, m.away.naam);
    h.played++; a.played++;
    h.points += m.uitslag.puntenA || 0; a.points += m.uitslag.puntenB || 0;
    h.setsFor += m.uitslag.setsA; h.setsAgainst += m.uitslag.setsB;
    a.setsFor += m.uitslag.setsB; a.setsAgainst += m.uitslag.setsA;
    if (m.uitslag.setsA > m.uitslag.setsB) { h.won++; a.lost++; } else { a.won++; h.lost++; }
  }

  return Object.values(table).sort((x, y) =>
    y.points - x.points ||
    (y.setsFor - y.setsAgainst) - (x.setsFor - x.setsAgainst) ||
    y.setsFor - x.setsFor
  );
}
