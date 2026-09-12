/**
 * Analyse-functies voor VolleyWarrior-wedstrijddata.
 *
 * De vier Pro-functies zijn een 1-op-1 port van src/helpers/proAnalysis.js in de
 * app, zodat de MCP-server exact dezelfde cijfers geeft als de Stats-tab en de
 * PDF-export. Wijzig ze alleen samen met dat bestand.
 */

// Voor alle punttypes behalve 'block' is d.team het scorende team; bij een blok
// scoort de tegenpartij van het aangeklikte team.
function inferScoringTeam(d) {
  if (d.type === 'block') return d.team === 'home' ? 'away' : 'home';
  return d.team;
}

/** Prestatie per rotatie (1-6). */
export function analyzeRotations(allHeatmapData, team = 'home') {
  const rotations = {};
  for (let r = 1; r <= 6; r++) {
    rotations[r] = { pointsFor: 0, pointsAgainst: 0, sideouts: 0, sideoutChances: 0, breaks: 0, breakChances: 0 };
  }

  allHeatmapData.forEach(d => {
    if (d.rotation == null) return;
    const rot = rotations[d.rotation];
    if (!rot) return;

    const scoringTeam = inferScoringTeam(d);
    const weServed = d.srvTeam === team;

    if (scoringTeam === team) {
      rot.pointsFor++;
      if (weServed) { rot.breaks++; rot.breakChances++; }
      else { rot.sideouts++; rot.sideoutChances++; }
    } else {
      rot.pointsAgainst++;
      if (weServed) rot.breakChances++;
      else rot.sideoutChances++;
    }
  });

  return rotations;
}

/** Receptiekwaliteit, totaal en per speler. */
export function analyzeReception(allHeatmapData, players) {
  const overall = { A: 0, B: 0, C: 0, total: 0 };
  const byPlayer = {};

  allHeatmapData.forEach(d => {
    if (!d.receptionQuality) return;
    overall[d.receptionQuality]++;
    overall.total++;

    if (d.receptionPlayerId) {
      if (!byPlayer[d.receptionPlayerId]) {
        const p = players.find(pl => pl.id === d.receptionPlayerId);
        byPlayer[d.receptionPlayerId] = { A: 0, B: 0, C: 0, total: 0, name: p?.name || '?', number: p?.number || '?' };
      }
      byPlayer[d.receptionPlayerId][d.receptionQuality]++;
      byPlayer[d.receptionPlayerId].total++;
    }
  });

  return { overall, byPlayer };
}

/** Aanvalsefficiëntie per speler. */
export function analyzeAttackEfficiency(allHeatmapData, players) {
  const byPlayer = {};
  const ensure = (id) => {
    if (!byPlayer[id]) {
      const p = players.find(pl => pl.id === id);
      byPlayer[id] = { kills: 0, attackErrors: 0, name: p?.name || '?', number: p?.number || '?' };
    }
    return byPlayer[id];
  };

  allHeatmapData.forEach(d => {
    if (d.type === 'attack' && d.playerId != null) ensure(d.playerId).kills++;
    if (d.type === 'error' && d.errorSubtype === 'attack' && d.playerId != null) ensure(d.playerId).attackErrors++;
  });

  Object.values(byPlayer).forEach(p => {
    p.totalAttempts = p.kills + p.attackErrors;
    p.killPct = p.totalAttempts > 0 ? Math.round((p.kills / p.totalAttempts) * 100) : 0;
  });

  return byPlayer;
}

/** Servicezones 1-6 met aces. */
export function analyzeServeZones(allHeatmapData) {
  const zones = {};
  for (let z = 1; z <= 6; z++) zones[z] = { total: 0, aces: 0 };

  allHeatmapData.forEach(d => {
    if (d.serveZone == null) return;
    const z = zones[d.serveZone];
    if (!z) return;
    z.total++;
    if (d.type === 'direct') z.aces++;
  });

  Object.values(zones).forEach(z => {
    z.acePct = z.total > 0 ? Math.round((z.aces / z.total) * 100) : 0;
  });

  return zones;
}

/** Reeksen van opeenvolgende punten door hetzelfde team. */
export function findScoringRuns(scoreHistory, minLength = 3) {
  const runs = [];
  let currentTeam = null, runStart = 0, runLength = 0;

  const push = () => {
    if (runLength >= minLength) {
      runs.push({
        team: currentTeam,
        length: runLength,
        startScore: scoreHistory[runStart].score,
        endScore: scoreHistory[runStart + runLength - 1].score,
        startIdx: runStart,
        endIdx: runStart + runLength - 1,
      });
    }
  };

  scoreHistory.forEach((entry, i) => {
    if (entry.team === currentTeam) {
      runLength++;
    } else {
      push();
      currentTeam = entry.team;
      runStart = i;
      runLength = 1;
    }
  });
  push();

  return runs;
}

// ---------------------------------------------------------------------------
// Aanvullende helpers, alleen voor de MCP-server
// ---------------------------------------------------------------------------

/** Alle heatmap-punten van een wedstrijd, over alle sets heen. */
export function flattenHeatmaps(match) {
  return (match.savedHeatmaps || []).flatMap(s => s.data || []);
}

/** Alle scoreHistory-entries van een wedstrijd, over alle sets heen. */
export function flattenScoreHistory(match) {
  const perSet = (match.savedHeatmaps || []).flatMap(s => s.scoreHistory || []);
  return perSet.length > 0 ? perSet : (match.scoreHistory || []);
}

/** Compacte samenvatting van één wedstrijd. */
export function summarizeMatch(match) {
  const sets = (match.savedHeatmaps || []).map(s => ({
    set: s.setNumber,
    score: s.finalScore,
    winner: s.winner,
  }));
  return {
    id: match.id,
    opponent: match.opponent,
    date: match.date,
    finalScore: match.finalScore,
    winner: match.winner,
    formationSystem: match.formationSystem || '5-1',
    setsPlayed: sets.length,
    sets,
    pointStats: match.pointStats,
    totalPoints: flattenHeatmaps(match).length,
    hasProData: flattenHeatmaps(match).some(d => d.rotation != null || d.receptionQuality != null || d.serveZone != null),
  };
}

/** Punttype-verdeling omgezet naar percentages per team. */
export function pointTypeBreakdown(pointStats) {
  const out = {};
  for (const team of ['home', 'away']) {
    const s = pointStats?.[team] || {};
    const total = Object.values(s).reduce((a, b) => a + (b || 0), 0);
    out[team] = { total, ...s, pct: {} };
    for (const [k, v] of Object.entries(s)) {
      out[team].pct[k] = total > 0 ? Math.round(((v || 0) / total) * 100) : 0;
    }
  }
  return out;
}
