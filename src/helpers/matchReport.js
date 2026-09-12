/**
 * Bouwt een leesbaar Nederlands wedstrijdverslag uit een opgeslagen wedstrijd —
 * de cijfers uit de app vertaald naar een verhaal dat spelers en ouders lezen.
 */

function collapseBlankLines(lines) {
  return lines.filter((l, i, a) => !(l === '' && a[i - 1] === ''));
}

export function buildMatchReport(match, players = [], teamName = 'Ons team') {
  const opp = match.opponent || 'de tegenstander';
  const fs = match.finalScore || { home: 0, away: 0 };
  const won = match.winner === 'home';
  const lines = [];

  lines.push(`${teamName} — ${opp}`);
  if (match.date) lines.push(match.date);
  lines.push('');
  lines.push(`${won ? 'Gewonnen' : 'Verloren'} met ${fs.home}-${fs.away} in sets.`);

  const setScores = (match.savedHeatmaps || []).map((hm, i) => `set ${hm.setNumber ?? i + 1}: ${hm.finalScore}`);
  if (setScores.length) lines.push(`Setstanden — ${setScores.join(', ')}.`);
  lines.push('');

  // Teamtotalen uit de per-set opgeslagen stats.
  const team = { direct: 0, sideout: 0, block: 0, attack: 0, error: 0 };
  for (const hm of (match.savedHeatmaps || [])) {
    const s = hm.stats?.home || {};
    for (const k of Object.keys(team)) team[k] += s[k] || 0;
  }
  const teamTotal = team.direct + team.sideout + team.block + team.attack;
  if (teamTotal > 0) {
    lines.push(`${teamName} scoorde ${teamTotal} punten: ${team.attack} uit aanval, ${team.direct} ace(s), ${team.block} blokpunt(en) en ${team.sideout} sideout(s), bij ${team.error} eigen fout(en).`);
  }

  // Topscorers uit de cumulatieve speler-statistiek.
  const ranked = Object.entries(match.playerStats || {})
    .map(([id, st]) => {
      const p = players.find(pl => pl.id === Number(id));
      const total = (st.direct || 0) + (st.sideout || 0) + (st.block || 0) + (st.attack || 0);
      return { name: p?.name, isHome: !!p, total, st };
    })
    .filter(r => r.isHome && r.total > 0)
    .sort((a, b) => b.total - a.total);

  if (ranked.length) {
    lines.push('');
    lines.push(`Topscorers: ${ranked.slice(0, 3).map(r => `${r.name} (${r.total})`).join(', ')}.`);
    const best = ranked[0];
    lines.push(`${best.name} was het meest productief met ${best.total} punten (${best.st.attack || 0} aanval, ${best.st.direct || 0} ace, ${best.st.block || 0} blok).`);
  }

  lines.push('');
  lines.push(won ? `Een verdiende overwinning tegen ${opp}.` : `Volgende keer pakken we ${opp} terug.`);

  return collapseBlankLines(lines).join('\n');
}
