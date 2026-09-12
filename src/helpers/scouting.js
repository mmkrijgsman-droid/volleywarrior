/**
 * Scouting / prognose-engine.
 *
 * Werkt op een neutrale "game"-vorm: { date, home, oppName, sets:[{for,against}], won }.
 * Voedt zowel op Nevobo-uitslagen (per-set scores, publiek) als op onze eigen
 * bewaarde wedstrijden. Levert een profiel (set-win% per set, marges, tiebreak,
 * vorm) en een leesbare briefing met concrete tactische hints.
 */

// ── Bronconversies ─────────────────────────────────────────────────────────

/** Nevobo-wedstrijd → game vanuit het perspectief van teamCode (of null als niet gespeeld). */
export function gameFromNevobo(match, teamCode) {
  if (!match || !match.uitslag || !match.setstanden?.length) return null;
  const isHome = match.home.code === teamCode;
  const sets = match.setstanden.map(s => ({ for: isHome ? s.a : s.b, against: isHome ? s.b : s.a }));
  const won = isHome ? match.uitslag.setsA > match.uitslag.setsB : match.uitslag.setsB > match.uitslag.setsA;
  return { date: match.datum, home: isHome, oppName: isHome ? match.away.naam : match.home.naam, sets, won };
}

export function gamesFromNevobo(matches = [], teamCode) {
  return matches.map(m => gameFromNevobo(m, teamCode)).filter(Boolean);
}

/** Onze eigen bewaarde wedstrijden → games (wij spelen altijd als 'home'). */
export function gamesFromSaved(savedMatches = []) {
  return savedMatches
    .map(m => {
      const sets = (m.savedHeatmaps || []).map(hm => {
        const [f, a] = String(hm.finalScore || '0-0').split('-').map(Number);
        return { for: f || 0, against: a || 0 };
      });
      return { date: m.date, home: true, oppName: m.opponent, sets, won: m.winner === 'home' };
    })
    .filter(g => g.sets.length);
}

// ── Analyse ────────────────────────────────────────────────────────────────

export function analyzeGames(games = []) {
  const played = games.length;
  const profile = {
    played, won: 0, lost: 0, winPct: null, setsFor: 0, setsAgainst: 0,
    setWinRate: {}, firstSetWinRate: null,
    blowoutRate: null, closeRate: null, avgMarginWon: null, avgMarginLost: null,
    fifthSet: { played: 0, won: 0 }, form: [],
  };
  if (!played) return profile;

  const ordered = [...games].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const winCount = {}, playCount = {};
  let wonSets = 0, blowoutWonSets = 0, totalSets = 0, closeSets = 0;
  let marginWonSum = 0, marginWonN = 0, marginLostSum = 0, marginLostN = 0;

  for (const g of ordered) {
    if (g.won) profile.won++; else profile.lost++;
    g.sets.forEach((s, i) => {
      const idx = i + 1;
      playCount[idx] = (playCount[idx] || 0) + 1;
      totalSets++;
      const diff = s.for - s.against;
      if (Math.abs(diff) <= 2) closeSets++;
      if (s.for > s.against) {
        winCount[idx] = (winCount[idx] || 0) + 1;
        profile.setsFor++; wonSets++;
        if (diff >= 8) blowoutWonSets++;
        marginWonSum += diff; marginWonN++;
      } else {
        profile.setsAgainst++;
        marginLostSum += -diff; marginLostN++;
      }
    });
    if (g.sets.length >= 5) { profile.fifthSet.played++; if (g.sets[4].for > g.sets[4].against) profile.fifthSet.won++; }
  }

  profile.winPct = Math.round((profile.won / played) * 100);
  for (let i = 1; i <= 5; i++) if (playCount[i]) profile.setWinRate[i] = Math.round((winCount[i] || 0) / playCount[i] * 100);
  profile.firstSetWinRate = profile.setWinRate[1] ?? null;
  profile.blowoutRate = wonSets ? Math.round((blowoutWonSets / wonSets) * 100) : null;
  profile.closeRate = totalSets ? Math.round((closeSets / totalSets) * 100) : null;
  profile.avgMarginWon = marginWonN ? +(marginWonSum / marginWonN).toFixed(1) : null;
  profile.avgMarginLost = marginLostN ? +(marginLostSum / marginLostN).toFixed(1) : null;
  profile.form = ordered.slice(-5).map(g => (g.won ? 'W' : 'L')).reverse(); // nieuwste eerst
  return profile;
}

// ── Briefing (deterministische "prognose") ─────────────────────────────────

const enough = (p) => p && p.played >= 2;

export function buildBriefing(us, opp, oppName = 'de tegenstander') {
  const out = [];

  if (!enough(opp)) {
    out.push({ tone: 'info', text: `Nog te weinig gespeelde wedstrijden van ${oppName} voor een betrouwbaar beeld.` });
  } else {
    if (opp.firstSetWinRate != null && opp.firstSetWinRate >= 65)
      out.push({ tone: 'watch', text: `${oppName} wint set 1 vaak (${opp.firstSetWinRate}%) — begin scherp.` });
    else if (opp.firstSetWinRate != null && opp.firstSetWinRate <= 35)
      out.push({ tone: 'good', text: `${oppName} komt traag op gang (set 1: ${opp.firstSetWinRate}%) — pak de openingsset.` });

    const early = Object.entries(opp.setWinRate).filter(([k]) => +k <= 3);
    if (early.length >= 2) {
      const weakest = early.reduce((m, c) => (c[1] < m[1] ? c : m));
      if (weakest[1] <= 40) out.push({ tone: 'good', text: `Hun zwakste moment is set ${weakest[0]} (${weakest[1]}%) — zet daar extra druk.` });
    }

    if (opp.blowoutRate != null && opp.blowoutRate >= 40)
      out.push({ tone: 'watch', text: `Als ${oppName} wint is het vaak ruim (${opp.blowoutRate}% van hun gewonnen sets met 8+ verschil).` });
    else if (opp.closeRate != null && opp.closeRate >= 45)
      out.push({ tone: 'info', text: `${oppName} speelt veel krappe sets (${opp.closeRate}% beslist met ≤2) — het draait om de details.` });

    if (opp.fifthSet.played >= 2) {
      const r = opp.fifthSet.won / opp.fifthSet.played;
      if (r <= 0.4) out.push({ tone: 'good', text: `Kwetsbaar in de tiebreak (${opp.fifthSet.won}/${opp.fifthSet.played} vijfde sets) — forceer een vijfde set.` });
      else if (r >= 0.7) out.push({ tone: 'watch', text: `Sterk in de tiebreak (${opp.fifthSet.won}/${opp.fifthSet.played}) — maak het liefst in 3-4 sets af.` });
    }

    if (opp.form.length >= 3) out.push({ tone: 'info', text: `Vorm ${oppName} (nieuw→oud): ${opp.form.join(' ')}.` });
  }

  if (enough(us)) {
    const ourEarly = Object.entries(us.setWinRate).filter(([k]) => +k <= 3).sort((a, b) => b[1] - a[1]);
    if (ourEarly[0] && ourEarly[0][1] >= 60) out.push({ tone: 'good', text: `Jullie zijn sterk in set ${ourEarly[0][0]} (${ourEarly[0][1]}%) — bouw daarop.` });
    if (us.fifthSet.played >= 2 && us.fifthSet.won / us.fifthSet.played >= 0.6)
      out.push({ tone: 'good', text: `Jullie zijn goed in de tiebreak (${us.fifthSet.won}/${us.fifthSet.played}) — een vijfde set is jullie kans.` });
  } else {
    out.push({ tone: 'info', text: 'Speel en bewaar eigen wedstrijden voor een sterker eigen profiel.' });
  }

  return out;
}
