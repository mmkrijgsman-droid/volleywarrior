import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const NEVOBO_API = isNative ? 'https://api.nevobo.nl' : '/nevobo-api';
const DWF_API = isNative ? 'https://dwf.nevobo.nl' : '/dwf-api';

/**
 * Check if DWF import is available (only on native Android)
 */
export function isDwfAvailable() {
  return isNative;
}

/**
 * Search clubs from the public Nevobo API.
 * Fetches all pages and filters by name. Caches results for subsequent searches.
 */
let clubsCache = null;

export async function searchClubs(query) {
  if (!clubsCache) {
    clubsCache = await fetchAllClubs();
  }
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return clubsCache.filter(c =>
    c.naam.toLowerCase().includes(q) ||
    c.code.toLowerCase().includes(q) ||
    c.plaats.toLowerCase().includes(q)
  ).slice(0, 20);
}

async function fetchAllClubs() {
  // Fetch first page to get total count
  const firstRes = await fetch(`${NEVOBO_API}/relatiebeheer/verenigingen?page=1`);
  if (!firstRes.ok) throw new Error(`Verenigingen ophalen mislukt (${firstRes.status})`);
  const firstData = await firstRes.json();

  const totalItems = firstData['hydra:totalItems'] || 0;
  const perPage = 30;
  const totalPages = Math.ceil(totalItems / perPage);

  // Parse first page
  const clubs = parseClubPage(firstData);

  // Fetch remaining pages in batches of 10
  for (let batch = 0; batch < Math.ceil((totalPages - 1) / 10); batch++) {
    const start = batch * 10 + 2; // page 2 onwards
    const end = Math.min(start + 10, totalPages + 1);
    const promises = [];
    for (let page = start; page < end; page++) {
      promises.push(
        fetch(`${NEVOBO_API}/relatiebeheer/verenigingen?page=${page}`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      );
    }
    const results = await Promise.all(promises);
    for (const data of results) {
      if (data) clubs.push(...parseClubPage(data));
    }
  }

  return clubs;
}

function parseClubPage(data) {
  const members = data['hydra:member'] || [];
  return members.map(m => ({
    code: m.organisatiecode || '',
    naam: m.naam || m.officielenaam || '',
    plaats: m.vestigingsplaats || '',
  }));
}

/**
 * Fetch teams for a club from the public Nevobo v1 API
 */
export async function fetchTeams(clubCode) {
  const code = clubCode.toLowerCase();
  const url = `${NEVOBO_API}/v1/competitie/teams?vereniging=${encodeURIComponent(code)}&limit=50`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Teams ophalen mislukt (${res.status})`);
  const data = await res.json();

  const items = data._embedded?.items || data.items || [];
  const teams = items.map(t => ({
    name: t.naam || '',
    teamId: t.code || '',
  }));

  if (teams.length === 0) throw new Error('Geen teams gevonden voor deze vereniging');
  return teams;
}

/**
 * Fetch match schedule for a team from the public Nevobo API
 */
export async function fetchMatches(teamCode) {
  const url = `${NEVOBO_API}/v1/competitie/wedstrijden?team=${encodeURIComponent(teamCode)}&limit=50`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wedstrijden ophalen mislukt (${res.status})`);
  const data = await res.json();
  const items = data._embedded?.items || [];
  return items.map(m => ({
    uuid: m.uuid,
    code: m.code,
    datum: m.datum,
    tijd: m.tijd,
    status: m.status,
    homeTeam: { code: m._embedded?.pouleindeling_thuis?.team?.code || '', name: m._embedded?.pouleindeling_thuis?.team?.naam || '' },
    awayTeam: { code: m._embedded?.pouleindeling_uit?.team?.code || '', name: m._embedded?.pouleindeling_uit?.team?.naam || '' },
    uitslag: m.uitslag,
  }));
}

/**
 * Open DWF login in WebView, wait for auth cookies, return accessToken.
 * Uses dynamic import so web dev mode doesn't break.
 */
export async function openDwfLogin() {
  const { InAppBrowser } = await import('@capgo/inappbrowser');

  return new Promise((resolve, reject) => {
    let resolved = false;
    let pollInterval = null;

    const cleanup = async () => {
      if (pollInterval) clearInterval(pollInterval);
      try { await InAppBrowser.close(); } catch (_) {}
    };

    // Timeout after 5 minutes
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error('Login timeout — probeer opnieuw'));
      }
    }, 5 * 60 * 1000);

    const checkCookies = async () => {
      try {
        const result = await InAppBrowser.getCookies({ url: 'https://dwf.nevobo.nl' });
        const cookies = result.cookies || result;

        let accessToken = null;

        if (Array.isArray(cookies)) {
          for (const c of cookies) {
            if (c.name === 'accessToken' || c.key === 'accessToken') accessToken = c.value;
          }
        } else if (typeof cookies === 'object') {
          accessToken = cookies.accessToken;
        }

        if (accessToken && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          if (pollInterval) clearInterval(pollInterval);
          await InAppBrowser.close();
          resolve(accessToken);
        }
      } catch (_) {
        // Cookie read may fail while page is loading — ignore
      }
    };

    // Close event = user cancelled
    InAppBrowser.addListener('closeEvent', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        if (pollInterval) clearInterval(pollInterval);
        reject(new Error('cancelled'));
      }
    });

    // Open WebView
    InAppBrowser.openWebView({
      url: 'https://dwf.nevobo.nl',
      title: 'Nevobo Login',
      toolbarColor: '#dc2626',
      closeModal: true,
      closeModalTitle: 'Sluiten',
      closeModalDescription: 'Wil je het inloggen annuleren?',
      closeModalOk: 'Ja',
      closeModalCancel: 'Nee',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
      },
    }).then(() => {
      pollInterval = setInterval(checkCookies, 2000);
    }).catch(err => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
  });
}

/**
 * Fetch team players via DWF GraphQL
 */
export async function fetchTeamPlayers(teamId, accessToken) {
  const query = `
    query findTeam($teamId: String!) {
      findTeam(teamId: $teamId) {
        players {
          person { name }
          number
          isLibero
          isCaptain
        }
      }
    }
  `;

  const res = await fetch(`${DWF_API}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query,
      variables: { teamId },
    }),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHENTICATED');
    throw new Error(`Spelers ophalen mislukt (${res.status})`);
  }

  const json = await res.json();

  if (json.errors) {
    const msg = json.errors[0]?.message || '';
    if (msg.includes('UNAUTHENTICATED') || msg.includes('Unauthorized')) {
      throw new Error('UNAUTHENTICATED');
    }
    throw new Error(msg || 'GraphQL fout');
  }

  const players = json.data?.findTeam?.players || [];
  return players.map(p => ({
    name: p.person?.name || 'Onbekend',
    number: p.number || 0,
    isLibero: !!p.isLibero,
    isCaptain: !!p.isCaptain,
  }));
}

/**
 * Map DWF players to app player format
 */
export function mapToAppPlayers(dwfPlayers, existingPlayers) {
  const maxId = existingPlayers.length > 0
    ? Math.max(...existingPlayers.map(p => p.id))
    : 0;

  return dwfPlayers.map((p, index) => ({
    id: maxId + index + 1,
    name: p.name,
    number: p.number,
    role: p.isLibero ? 'libero' : 'outside',
    isLibero: p.isLibero || undefined,
  }));
}

/**
 * Map DWF players to opponent player format (IDs starting at 101)
 */
export function mapToOpponentPlayers(dwfPlayers) {
  return dwfPlayers.map((p, index) => ({
    id: 101 + index,
    name: p.name,
    number: p.number,
  }));
}
