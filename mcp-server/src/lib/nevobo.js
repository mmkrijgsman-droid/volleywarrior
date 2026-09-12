/**
 * Nevobo-API client voor Node.
 *
 * De app praat in de browser via een Vite-proxy (/nevobo-api). In Node bestaat
 * die proxy niet en is CORS niet van toepassing, dus we bellen api.nevobo.nl
 * rechtstreeks. De responseshapes zijn identiek aan src/helpers/dwfImport.js.
 */
const NEVOBO_API = process.env.VW_NEVOBO_API || 'https://api.nevobo.nl';
const UA = 'VolleyWarrior-MCP/1.0';

const TIMEOUT_MS = Number(process.env.VW_NEVOBO_TIMEOUT || 15000);

async function getJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} bij ${url}`);
  return res.json();
}

/**
 * Nevobo levert /relatiebeheer/verenigingen tegenwoordig als kale JSON-array;
 * vroeger was het een Hydra-collectie met 'hydra:member'. We accepteren beide,
 * zodat een terugdraai aan hun kant ons niet breekt.
 */
function parseClubPage(data) {
  const members = Array.isArray(data) ? data : (data['hydra:member'] || data.member || []);
  return members.map(m => ({
    code: m.organisatiecode || '',
    naam: m.naam || m.officielenaam || '',
    plaats: m.vestigingsplaats || '',
  }));
}

let clubsCache = null;
let clubsCachedAt = 0;
const CLUBS_TTL_MS = 6 * 60 * 60 * 1000; // verenigingenlijst verandert zelden

const PAGE_BATCH = 10;
const MAX_PAGES = 200; // vangnet: stoppen kan alleen op een lege pagina

/**
 * Haalt alle verenigingspagina's op. De API geeft geen totaalaantal meer terug
 * (geen 'hydra:totalItems', geen count-header), dus we lezen in blokken door
 * tot er een lege pagina langskomt.
 */
async function fetchAllClubs() {
  const clubs = [];

  for (let start = 1; start <= MAX_PAGES; start += PAGE_BATCH) {
    const pages = [];
    for (let page = start; page < start + PAGE_BATCH && page <= MAX_PAGES; page++) {
      pages.push(
        getJson(`${NEVOBO_API}/relatiebeheer/verenigingen?page=${page}`)
          .then(parseClubPage)
          .catch(() => null)
      );
    }

    const batch = await Promise.all(pages);
    let sawEmpty = false;
    for (const parsed of batch) {
      if (parsed == null) continue;      // pagina mislukt: overslaan, niet stoppen
      if (parsed.length === 0) { sawEmpty = true; continue; }
      clubs.push(...parsed);
    }
    if (sawEmpty) break; // voorbij het einde van de lijst
  }

  if (clubs.length === 0) {
    throw new Error('Nevobo gaf geen verenigingen terug — mogelijk is het API-formaat opnieuw gewijzigd.');
  }
  return clubs;
}

export async function searchClubs(query, limit = 20) {
  const fresh = clubsCache && Date.now() - clubsCachedAt < CLUBS_TTL_MS;
  if (!fresh) {
    clubsCache = await fetchAllClubs();
    clubsCachedAt = Date.now();
  }
  const q = String(query || '').toLowerCase().trim();
  if (!q) return [];
  return clubsCache.filter(c =>
    c.naam.toLowerCase().includes(q) ||
    c.code.toLowerCase().includes(q) ||
    c.plaats.toLowerCase().includes(q)
  ).slice(0, limit);
}

export async function fetchTeams(clubCode) {
  const code = String(clubCode).toLowerCase();
  const data = await getJson(`${NEVOBO_API}/v1/competitie/teams?vereniging=${encodeURIComponent(code)}&limit=50`);
  const items = data._embedded?.items || data.items || [];
  const teams = items.map(t => ({ name: t.naam || '', teamId: t.code || '' }));
  if (teams.length === 0) throw new Error(`Geen teams gevonden voor vereniging ${clubCode}`);
  return teams;
}

export async function fetchMatches(teamCode) {
  const data = await getJson(`${NEVOBO_API}/v1/competitie/wedstrijden?team=${encodeURIComponent(teamCode)}&limit=50`);
  const items = data._embedded?.items || [];
  return items.map(m => ({
    uuid: m.uuid,
    code: m.code,
    datum: m.datum,
    tijd: m.tijd,
    status: m.status,
    homeTeam: {
      code: m._embedded?.pouleindeling_thuis?.team?.code || '',
      name: m._embedded?.pouleindeling_thuis?.team?.naam || '',
    },
    awayTeam: {
      code: m._embedded?.pouleindeling_uit?.team?.code || '',
      name: m._embedded?.pouleindeling_uit?.team?.naam || '',
    },
    uitslag: m.uitslag,
  }));
}
