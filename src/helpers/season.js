/**
 * Seizoensaggregatie: vat alle opgeslagen wedstrijden samen tot trends over
 * het seizoen — teamresultaat, punttype-verdeling en spelertotalen.
 *
 * Opmerkingen over de databronnen per wedstrijd (zie useMatchState.saveMatch):
 *  - `playerStats` is cumulatief over de hele wedstrijd (wordt niet per set gewist).
 *  - `pointStats` is alléén de laatste set; teamtotalen halen we daarom uit
 *    `savedHeatmaps[].stats` (per set opgeslagen).
 *  - `finalScore` is het setresultaat { home, away } vanuit ons (thuis) perspectief.
 */

const STAT_KEYS = ['direct', 'sideout', 'block', 'attack', 'error'];

function emptyTeam() {
  return { direct: 0, sideout: 0, block: 0, attack: 0, error: 0 };
}

export function aggregateSeason(matches = [], players = []) {
  const record = { played: matches.length, won: 0, lost: 0, setsWon: 0, setsLost: 0 };
  const teamTotals = emptyTeam();
  const oppTotals = emptyTeam();
  const playerTotals = {}; // id -> totals

  for (const m of matches) {
    if (m.winner === 'home') record.won++;
    else if (m.winner === 'away') record.lost++;

    const fs = m.finalScore || { home: 0, away: 0 };
    record.setsWon += fs.home || 0;
    record.setsLost += fs.away || 0;

    for (const hm of (m.savedHeatmaps || [])) {
      const s = hm.stats || {};
      for (const k of STAT_KEYS) {
        teamTotals[k] += s.home?.[k] || 0;
        oppTotals[k] += s.away?.[k] || 0;
      }
    }

    const ps = m.playerStats || {};
    for (const [id, st] of Object.entries(ps)) {
      const cur = playerTotals[id] || { direct: 0, sideout: 0, block: 0, attack: 0, error: 0, servicefault: 0, matches: 0 };
      for (const k of ['direct', 'sideout', 'block', 'attack', 'error', 'servicefault']) cur[k] += st[k] || 0;
      cur.matches += 1;
      playerTotals[id] = cur;
    }
  }

  const rankedPlayers = Object.entries(playerTotals)
    .map(([id, st]) => {
      const p = players.find(pl => pl.id === Number(id));
      if (!p) return null; // alleen eigen roster (uit-ID's 101+ vallen af)
      const total = st.direct + st.sideout + st.block + st.attack;
      const attempts = st.attack + st.error;
      return {
        id: Number(id), name: p.name, number: p.number,
        ...st, total,
        killPct: attempts > 0 ? Math.round((st.attack / attempts) * 100) : null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.total - a.total);

  const teamPoints = teamTotals.direct + teamTotals.sideout + teamTotals.block + teamTotals.attack;
  const oppPoints = oppTotals.direct + oppTotals.sideout + oppTotals.block + oppTotals.attack;

  return {
    empty: matches.length === 0,
    record,
    teamTotals, oppTotals, teamPoints, oppPoints,
    players: rankedPlayers,
  };
}
