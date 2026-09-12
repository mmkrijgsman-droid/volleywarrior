/**
 * Pro Mode analysis functions — shared between StatsTab, LiveDashboard, pdfExport
 */

// In heatmapData, d.team is the clickedTeam, which IS the scoring team for every
// point type except a block (where the opponent of the clicked side scores).
function inferScoringTeam(d) {
  if (d.type === 'block') return d.team === 'home' ? 'away' : 'home';
  return d.team; // for all other types, d.team IS the scoring team
}

/**
 * Analyze performance per rotation (1-6)
 * Returns: { [rotation]: { pointsFor, pointsAgainst, sideouts, sideoutChances, breaks, breakChances } }
 */
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

/**
 * Analyze reception quality
 * Returns: { overall: {A,B,C,total}, byPlayer: { [id]: {A,B,C,total,name,number} } }
 */
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

/**
 * Analyze attack efficiency per player
 * Returns: { [id]: { kills, attackErrors, totalAttempts, killPct, name, number } }
 */
export function analyzeAttackEfficiency(allHeatmapData, players) {
  const byPlayer = {};

  allHeatmapData.forEach(d => {
    if (d.type === 'attack' && d.playerId != null) {
      if (!byPlayer[d.playerId]) {
        const p = players.find(pl => pl.id === d.playerId);
        byPlayer[d.playerId] = { kills: 0, attackErrors: 0, name: p?.name || '?', number: p?.number || '?' };
      }
      byPlayer[d.playerId].kills++;
    }
    if (d.type === 'error' && d.errorSubtype === 'attack' && d.playerId != null) {
      if (!byPlayer[d.playerId]) {
        const p = players.find(pl => pl.id === d.playerId);
        byPlayer[d.playerId] = { kills: 0, attackErrors: 0, name: p?.name || '?', number: p?.number || '?' };
      }
      byPlayer[d.playerId].attackErrors++;
    }
  });

  // Calculate efficiency
  Object.values(byPlayer).forEach(p => {
    p.totalAttempts = p.kills + p.attackErrors;
    p.killPct = p.totalAttempts > 0 ? Math.round((p.kills / p.totalAttempts) * 100) : 0;
  });

  return byPlayer;
}

/**
 * Analyze serve zones
 * Returns: { [zone]: { total, aces, acePct } }
 */
export function analyzeServeZones(allHeatmapData) {
  const zones = {};
  for (let z = 1; z <= 6; z++) {
    zones[z] = { total: 0, aces: 0 };
  }

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

/**
 * Find scoring runs (consecutive points by same team)
 * Returns: [{ team, length, startScore, endScore, startIdx, endIdx }]
 */
export function findScoringRuns(scoreHistory, minLength = 3) {
  const runs = [];
  let currentTeam = null, runStart = 0, runLength = 0;

  scoreHistory.forEach((entry, i) => {
    if (entry.team === currentTeam) {
      runLength++;
    } else {
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
      currentTeam = entry.team;
      runStart = i;
      runLength = 1;
    }
  });

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

  return runs;
}
