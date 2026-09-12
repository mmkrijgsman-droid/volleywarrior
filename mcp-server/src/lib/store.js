/**
 * Lokale opslag voor de MCP-server.
 *
 * De app zelf bewaart alles in localStorage van de browser. Die is voor een
 * Node-proces niet leesbaar, dus de MCP-server houdt een eigen JSON-bestand bij.
 * Dat bestand wordt gevuld door:
 *   - vw_sync_from_app  (haalt spelers + wedstrijden op via de live-brug)
 *   - vw_import_data    (plakt een localStorage-export)
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = path.resolve(here, '..', '..', '..');

export const DATA_FILE = process.env.VW_DATA_FILE
  ? path.resolve(process.env.VW_DATA_FILE)
  : path.join(APP_ROOT, 'mcp-server', 'data', 'store.json');

const EMPTY = { players: [], matches: [], teamName: null, updatedAt: null };

export async function loadStore() {
  if (!existsSync(DATA_FILE)) return { ...EMPTY };
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...EMPTY, ...parsed };
  } catch (err) {
    throw new Error(`Datastore ${DATA_FILE} kon niet gelezen worden: ${err.message}`);
  }
}

export async function saveStore(data) {
  const next = { ...EMPTY, ...data, updatedAt: new Date().toISOString() };
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

/**
 * Accepteert zowel een kale export ({volleyballPlayers, volleyballMatches}) als
 * het interne formaat ({players, matches}). Strings worden eerst geparsed,
 * want localStorage-waarden zijn zelf ook JSON-strings.
 */
export function normalizeImport(input) {
  const obj = typeof input === 'string' ? JSON.parse(input) : input;
  const pick = (...keys) => {
    for (const k of keys) {
      if (obj[k] == null) continue;
      const v = obj[k];
      return typeof v === 'string' ? JSON.parse(v) : v;
    }
    return null;
  };

  const players = pick('players', 'volleyballPlayers') || [];
  const matches = pick('matches', 'volleyballMatches') || [];
  let teamName = obj.teamName ?? obj.volleyballTeamName ?? null;
  if (typeof teamName === 'string' && teamName.startsWith('"')) {
    try { teamName = JSON.parse(teamName); } catch { /* laat staan zoals het is */ }
  }

  if (!Array.isArray(players)) throw new Error('players/volleyballPlayers is geen array');
  if (!Array.isArray(matches)) throw new Error('matches/volleyballMatches is geen array');

  return { players, matches, teamName };
}

/** Zoekt een wedstrijd op id, of op (deel van) de tegenstandersnaam. */
export function findMatch(matches, ref) {
  if (ref == null || ref === '') return matches[matches.length - 1] || null;
  const byId = matches.find(m => String(m.id) === String(ref));
  if (byId) return byId;
  const q = String(ref).toLowerCase();
  const hits = matches.filter(m => (m.opponent || '').toLowerCase().includes(q));
  if (hits.length === 0) return null;
  // Meerdere treffers: pak de meest recente.
  return hits.sort((a, b) => (b.id || 0) - (a.id || 0))[0];
}
