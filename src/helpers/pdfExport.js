import { jsPDF } from 'jspdf';
import { SERVE_ZONES } from './constants';
import { analyzeRotations, analyzeReception, analyzeAttackEfficiency, analyzeServeZones, findScoringRuns } from './proAnalysis';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { LOGO_SRC } from '../assets/logo';

// Court position tables (same as StatsTab/App)
const SERVE_POS = { 1:{x:75,y:88}, 2:{x:72,y:15}, 3:{x:48,y:14}, 4:{x:26,y:16}, 5:{x:25,y:72}, 6:{x:52,y:70} };
const RECV_POS = { 1:{x:72,y:58}, 2:{x:70,y:18}, 3:{x:50,y:14}, 4:{x:25,y:20}, 5:{x:24,y:66}, 6:{x:48,y:64} };

function getPlayerTeam(pt) {
  return pt.type === 'block' ? (pt.team === 'home' ? 'away' : 'home') : pt.team;
}
function getPlayerSvg(playerPos, playerTeam, srvTeam) {
  const pos = (playerTeam === srvTeam ? SERVE_POS : RECV_POS)[playerPos];
  if (!pos) return null;
  return playerTeam === 'home' ? { x: pos.x, y: 50 + pos.y * 0.5 } : { x: 100 - pos.x, y: (100 - pos.y) * 0.5 };
}
function getLandingSvg(team, x, y) {
  return team === 'home' ? { x, y: y * 0.5 } : { x, y: 50 + y * 0.5 };
}

const typeLabels = { direct:'Ace', sideout:'Sideout', block:'Blok', attack:'Aanval', error:'Fout', servicefault:'Sf' };

export function generateMatchPDF({ sets, matchWinner, opponentName, teamName, matchDate, savedHeatmaps, pointStats, playerStats, players, substitutions, formationSystem, trackOpponentStats }) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const W = 210, H = 297;
  const ML = 15, MR = 15, MT = 15;
  const CW = W - ML - MR; // content width
  let y = MT;

  const colors = {
    red: [220, 38, 38],
    redLight: [254, 242, 242],
    redBg: [220, 38, 38],
    blue: [37, 99, 235],
    gray: [156, 163, 175],
    darkGray: [75, 85, 99],
    black: [30, 41, 59],
    white: [255, 255, 255],
    lightBg: [248, 250, 252],
  };

  // Helper: ensure page space
  const ensureSpace = (need) => {
    if (y + need > H - 20) {
      doc.addPage();
      y = MT;
    }
  };

  // Helper: section header (red theme)
  const sectionHeader = (text) => {
    ensureSpace(12);
    doc.setFillColor(...colors.redBg);
    doc.roundedRect(ML, y, CW, 8, 2, 2, 'F');
    doc.setTextColor(...colors.white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(text, ML + 4, y + 5.5);
    y += 12;
  };

  // Helper: table row
  const tableRow = (cells, widths, isHeader, rowColor) => {
    const h = 7;
    let x = ML;
    if (isHeader) {
      doc.setFillColor(...colors.black);
      doc.rect(x, y, CW, h, 'F');
      doc.setTextColor(...colors.white);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
    } else {
      if (rowColor) doc.setFillColor(...rowColor);
      else doc.setFillColor(255, 255, 255);
      doc.rect(x, y, CW, h, 'F');
      doc.setDrawColor(230, 230, 230);
      doc.line(x, y + h, x + CW, y + h);
      doc.setTextColor(...colors.black);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
    }
    cells.forEach((cell, i) => {
      const align = i === 0 ? 'left' : 'center';
      const tx = align === 'left' ? x + 2 : x + widths[i] / 2;
      doc.text(String(cell), tx, y + 5, { align });
      x += widths[i];
    });
    y += h;
  };

  // ──────────────────────────────────────────────
  // PAGE 1: Overzicht
  // ──────────────────────────────────────────────

  // Header with logo
  try {
    doc.addImage(LOGO_SRC, 'PNG', ML, y - 2, 18, 18);
  } catch (_) {}

  doc.setTextColor(...colors.red);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('VolleyWarrior', ML + 22, y + 6);

  doc.setTextColor(...colors.darkGray);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${matchDate || ''}  |  Formatie: ${formationSystem || '5-1'}`, ML + 22, y + 12);

  // Red accent line
  y += 18;
  doc.setDrawColor(...colors.red);
  doc.setLineWidth(1);
  doc.line(ML, y, ML + CW, y);
  y += 6;

  // Match result card
  const homeTeam = teamName || 'Thuis';
  const awayTeam = opponentName || 'Tegenstander';

  doc.setFillColor(...colors.redLight);
  doc.roundedRect(ML, y, CW, 24, 3, 3, 'F');
  doc.setDrawColor(...colors.red);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, CW, 24, 3, 3, 'S');

  // Home team
  doc.setTextColor(...colors.red);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(homeTeam, ML + 8, y + 10);

  // Score
  doc.setTextColor(...colors.black);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(`${sets.home} - ${sets.away}`, W / 2, y + 12, { align: 'center' });

  // Away team
  doc.setTextColor(...colors.blue);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(awayTeam, W - MR - 8, y + 10, { align: 'right' });

  // Winner indicator
  const winnerText = matchWinner === 'home' ? `${homeTeam} wint!` : `${awayTeam} wint!`;
  doc.setTextColor(...(matchWinner === 'home' ? colors.red : colors.blue));
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(winnerText, W / 2, y + 20, { align: 'center' });

  y += 30;

  // Set-overzicht
  sectionHeader('Set-overzicht');
  const setCols = [CW * 0.12, CW * 0.22, CW * 0.22, CW * 0.22, CW * 0.22];
  tableRow(['Set', 'Score', 'Winnaar', 'TO Thuis', 'TO Uit'], setCols, true);
  savedHeatmaps.forEach((hm) => {
    const winner = hm.winner === 'home' ? homeTeam : awayTeam;
    const fmtTO = arr => (arr || []).map(t => typeof t === 'string' ? t : (t?.score || JSON.stringify(t))).join(', ') || '-';
    const hTO = fmtTO(hm.homeTimeouts);
    const aTO = fmtTO(hm.awayTimeouts);
    tableRow([hm.setNumber, hm.finalScore, winner, hTO, aTO], setCols, false, hm.setNumber % 2 === 0 ? [245, 247, 250] : null);
  });
  y += 6;

  // ── BESTE SPELERS ──
  if (playerStats && players) {
    const homeScorers = [];
    Object.entries(playerStats).forEach(([id, stats]) => {
      if (String(id).startsWith('opp_')) return;
      const player = players.find(p => p.id === Number(id));
      if (!player) return;
      const scored = (stats.direct||0) + (stats.sideout||0) + (stats.block||0) + (stats.attack||0);
      if (scored > 0) homeScorers.push({ player, scored, stats });
    });
    homeScorers.sort((a,b) => b.scored - a.scored);

    // Beste passer (receptie) — from Pro data in heatmaps
    const allHeatmap = savedHeatmaps.flatMap(h => h.data || []);
    const receptionByPlayer = {};
    allHeatmap.forEach(d => {
      if (!d.receptionQuality || !d.receptionPlayerId) return;
      if (!receptionByPlayer[d.receptionPlayerId]) receptionByPlayer[d.receptionPlayerId] = { A:0, B:0, C:0, total:0 };
      receptionByPlayer[d.receptionPlayerId][d.receptionQuality]++;
      receptionByPlayer[d.receptionPlayerId].total++;
    });
    let bestPasser = null;
    let bestPasserScore = -1;
    Object.entries(receptionByPlayer).forEach(([id, rec]) => {
      if (rec.total < 2) return;
      const score = (rec.A * 3 + rec.B * 1) / rec.total; // weighted score
      if (score > bestPasserScore) {
        bestPasserScore = score;
        const p = players.find(pl => pl.id === Number(id));
        if (p) bestPasser = { player: p, rec };
      }
    });

    if (homeScorers.length > 0 || bestPasser) {
      sectionHeader('Beste Spelers');
      const bpCols = [CW * 0.35, CW * 0.65];

      if (homeScorers.length > 0) {
        const top = homeScorers[0];
        const details = [
          top.stats.direct > 0 ? `${top.stats.direct} ace` : '',
          top.stats.sideout > 0 ? `${top.stats.sideout} sideout` : '',
          top.stats.block > 0 ? `${top.stats.block} blok` : '',
          top.stats.attack > 0 ? `${top.stats.attack} aanval` : '',
        ].filter(Boolean).join(', ');
        tableRow(['Topscorer', `#${top.player.number} ${top.player.name} — ${top.scored} punten (${details})`], bpCols, false, colors.redLight);
      }

      if (bestPasser) {
        const { player: p, rec } = bestPasser;
        const pct = rec.total > 0 ? Math.round(rec.A / rec.total * 100) : 0;
        tableRow(['Beste passer', `#${p.number} ${p.name} — ${pct}% perfect (${rec.A}A / ${rec.B}B / ${rec.C}C, ${rec.total} totaal)`], bpCols, false, [242, 247, 255]);
      } else if (homeScorers.length > 0) {
        tableRow(['Beste passer', 'Geen receptie-data (activeer Pro Modus)'], bpCols, false, [245, 247, 250]);
      }

      y += 6;
    }
  }

  // Totaal puntstatistieken
  sectionHeader('Puntstatistieken (totaal)');
  const allStats = { home: { direct:0, sideout:0, block:0, attack:0, error:0 }, away: { direct:0, sideout:0, block:0, attack:0, error:0 } };
  savedHeatmaps.forEach(hm => {
    if (hm.stats) {
      ['home','away'].forEach(t => {
        Object.keys(allStats[t]).forEach(k => { allStats[t][k] += (hm.stats[t]?.[k] || 0); });
      });
    }
  });
  if (pointStats) {
    ['home','away'].forEach(t => {
      Object.keys(allStats[t]).forEach(k => { allStats[t][k] += (pointStats[t]?.[k] || 0); });
    });
  }

  const statCols = [CW * 0.28, CW * 0.18, CW * 0.18, CW * 0.18, CW * 0.18];
  tableRow(['Type', homeTeam, '%', awayTeam, '%'], statCols, true);
  const homeTotal = Object.values(allStats.home).reduce((a,b) => a+b, 0);
  const awayTotal = Object.values(allStats.away).reduce((a,b) => a+b, 0);
  Object.keys(allStats.home).forEach((k, i) => {
    const hv = allStats.home[k], av = allStats.away[k];
    const hpct = homeTotal ? Math.round(hv/homeTotal*100) + '%' : '-';
    const apct = awayTotal ? Math.round(av/awayTotal*100) + '%' : '-';
    tableRow([typeLabels[k] || k, hv, hpct, av, apct], statCols, false, i % 2 === 0 ? [245, 247, 250] : null);
  });
  tableRow(['Totaal', homeTotal, '100%', awayTotal, '100%'], statCols, false, [230, 235, 240]);
  y += 6;

  // Per-set stats
  if (savedHeatmaps.some(hm => hm.stats)) {
    sectionHeader('Statistieken per set');
    const psTypes = ['direct','sideout','block','attack','error'];
    const psCols = [CW * 0.12, ...psTypes.map(() => CW * 0.176)];
    tableRow(['Set', ...psTypes.map(t => typeLabels[t])], psCols, true);
    savedHeatmaps.forEach((hm) => {
      if (!hm.stats) return;
      const row = [
        `Set ${hm.setNumber}`,
        ...psTypes.map(t => `${hm.stats.home?.[t]||0}-${hm.stats.away?.[t]||0}`)
      ];
      tableRow(row, psCols, false, hm.setNumber % 2 === 0 ? [245, 247, 250] : null);
    });
    y += 6;
  }

  // ──────────────────────────────────────────────
  // PRO MODE SECTIONS (only if Pro data exists)
  // ──────────────────────────────────────────────
  const allHeatmapData = savedHeatmaps.flatMap(hm => hm.data || []);
  const hasProData = allHeatmapData.some(d => d.rotation != null);

  if (hasProData) {
    // Rotation analysis
    const rotations = analyzeRotations(allHeatmapData, 'home');
    const hasRotationData = Object.values(rotations).some(r => r.pointsFor + r.pointsAgainst > 0);
    if (hasRotationData) {
      ensureSpace(60);
      sectionHeader('Rotatie-analyse (PRO)');
      const rotCols = [CW * 0.12, CW * 0.18, CW * 0.18, CW * 0.18, CW * 0.16, CW * 0.18];
      tableRow(['Rot', 'Punten+', 'Punten-', 'Totaal', 'SO%', 'Break%'], rotCols, true);
      for (let r = 1; r <= 6; r++) {
        const d = rotations[r];
        const total = d.pointsFor + d.pointsAgainst;
        if (total === 0) continue;
        const soPct = d.sideoutChances > 0 ? Math.round((d.sideouts / d.sideoutChances) * 100) + '%' : '-';
        const bkPct = d.breakChances > 0 ? Math.round((d.breaks / d.breakChances) * 100) + '%' : '-';
        tableRow([r, d.pointsFor, d.pointsAgainst, total, soPct, bkPct], rotCols, false, r % 2 === 0 ? [245, 247, 250] : null);
      }
      y += 4;
    }

    // Reception stats
    const receptionData = analyzeReception(allHeatmapData, players || []);
    if (receptionData.overall.total > 0) {
      ensureSpace(40);
      sectionHeader('Receptie-statistieken (PRO)');
      const recCols = [CW * 0.28, CW * 0.18, CW * 0.18, CW * 0.18, CW * 0.18];
      tableRow(['Speler', 'A (Perfect)', 'B (OK)', 'C (Slecht)', 'Totaal'], recCols, true);
      // Overall row
      const o = receptionData.overall;
      tableRow(['Totaal team', `${o.A} (${o.total > 0 ? Math.round(o.A/o.total*100) : 0}%)`, `${o.B} (${o.total > 0 ? Math.round(o.B/o.total*100) : 0}%)`, `${o.C} (${o.total > 0 ? Math.round(o.C/o.total*100) : 0}%)`, o.total], recCols, false, [230, 235, 240]);
      // Per player
      Object.entries(receptionData.byPlayer).sort((a,b) => b[1].total - a[1].total).forEach(([id, p], i) => {
        tableRow([`#${p.number} ${p.name}`, p.A, p.B, p.C, p.total], recCols, false, i % 2 === 0 ? [245, 247, 250] : null);
      });
      y += 4;
    }

    // Attack efficiency
    const efficiency = analyzeAttackEfficiency(allHeatmapData, players || []);
    const effEntries = Object.entries(efficiency).filter(([,v]) => v.totalAttempts > 0).sort((a,b) => b[1].killPct - a[1].killPct);
    if (effEntries.length > 0) {
      ensureSpace(30);
      sectionHeader('Aanvals-efficiëntie (PRO)');
      const effCols = [CW * 0.28, CW * 0.18, CW * 0.18, CW * 0.18, CW * 0.18];
      tableRow(['Speler', 'Kills', 'Aanvalsf.', 'Pogingen', 'Kill%'], effCols, true);
      effEntries.forEach(([id, p], i) => {
        tableRow([`#${p.number} ${p.name}`, p.kills, p.attackErrors, p.totalAttempts, `${p.killPct}%`], effCols, false, i % 2 === 0 ? [245, 247, 250] : null);
      });
      y += 4;
    }

    // Serve zones
    const serveZones = analyzeServeZones(allHeatmapData);
    const hasServeData = Object.values(serveZones).some(z => z.total > 0);
    if (hasServeData) {
      ensureSpace(30);
      sectionHeader('Service Zones (PRO)');
      const szCols = [CW * 0.20, CW * 0.20, CW * 0.20, CW * 0.20, CW * 0.20];
      tableRow(['Zone', 'Totaal', 'Aces', 'Ace%', ''], szCols, true);
      SERVE_ZONES.forEach((zone, i) => {
        const z = serveZones[zone];
        if (z.total === 0) return;
        tableRow([`Zone ${zone}`, z.total, z.aces, `${z.acePct}%`, ''], szCols, false, i % 2 === 0 ? [245, 247, 250] : null);
      });
      y += 4;
    }

    // Momentum (scoring runs)
    const allScoreHistories = savedHeatmaps.flatMap(hm => hm.scoreHistory || []);
    const runs = findScoringRuns(allScoreHistories);
    if (runs.length > 0) {
      ensureSpace(30);
      sectionHeader('Momentum — Scoring Runs (PRO)');
      const runCols = [CW * 0.15, CW * 0.25, CW * 0.30, CW * 0.30];
      tableRow(['Lengte', 'Team', 'Van', 'Tot'], runCols, true);
      [...runs].sort((a,b) => b.length - a.length).slice(0, 10).forEach((run, i) => {
        const team = run.team === 'home' ? homeTeam : awayTeam;
        tableRow([`${run.length}x`, team, run.startScore, run.endScore], runCols, false, i % 2 === 0 ? [245, 247, 250] : null);
      });
      y += 4;
    }
  }

  // ──────────────────────────────────────────────
  // PAGE 2: Spelers & Verloop
  // ──────────────────────────────────────────────
  doc.addPage();
  y = MT;

  // Speler statistieken
  if (playerStats && players) {
    const homeEntries = [];
    const awayEntries = [];
    Object.entries(playerStats).forEach(([id, stats]) => {
      const total = Object.values(stats).reduce((a,b) => a+b, 0);
      if (total === 0) return;
      if (String(id).startsWith('opp_')) {
        const roleMap = { opp_setter:'SPE', opp_outside:'PL', opp_middle:'MID', opp_opposite:'DIA', opp_libero:'L' };
        awayEntries.push({ id, stats, total, label: roleMap[id] || id });
      } else {
        const player = players.find(p => p.id === Number(id));
        homeEntries.push({ id: Number(id), player, stats, total });
      }
    });
    homeEntries.sort((a,b) => b.total - a.total);
    awayEntries.sort((a,b) => b.total - a.total);

    if (homeEntries.length > 0) {
      sectionHeader(`Speler Statistieken - ${homeTeam}`);
      const plCols = [CW*0.08, CW*0.22, CW*0.10, CW*0.12, CW*0.10, CW*0.12, CW*0.10, CW*0.08, CW*0.08];
      tableRow(['#', 'Naam', 'Ace', 'Sideout', 'Blok', 'Aanval', 'Fout', 'Sf', 'Tot'], plCols, true);
      homeEntries.forEach((e, i) => {
        tableRow([
          e.player?.number || e.id,
          e.player?.name || `Speler ${e.id}`,
          e.stats.direct || 0,
          e.stats.sideout || 0,
          e.stats.block || 0,
          e.stats.attack || 0,
          e.stats.error || 0,
          e.stats.servicefault || 0,
          e.total
        ], plCols, false, i % 2 === 0 ? [245, 247, 250] : null);
      });
      y += 4;
    }

    if (awayEntries.length > 0) {
      sectionHeader(`Tegenstander per Positie - ${awayTeam}`);
      const opCols = [CW*0.20, CW*0.13, CW*0.13, CW*0.13, CW*0.13, CW*0.13, CW*0.15];
      tableRow(['Positie', 'Ace', 'Sideout', 'Blok', 'Aanval', 'Fout', 'Totaal'], opCols, true);
      awayEntries.forEach((e, i) => {
        tableRow([
          e.label,
          e.stats.direct || 0,
          e.stats.sideout || 0,
          e.stats.block || 0,
          e.stats.attack || 0,
          e.stats.error || 0,
          e.total
        ], opCols, false, i % 2 === 0 ? [245, 247, 250] : null);
      });
      y += 4;
    }
  }

  // Puntenverloop — alle sets naast elkaar in kolommen
  const allSetHistories = savedHeatmaps.filter(hm => hm.scoreHistory && hm.scoreHistory.length > 0);
  if (allSetHistories.length > 0) {
    sectionHeader('Puntenverloop');
    const numSets = allSetHistories.length;
    const gap = 2;
    const colW = (CW - gap * (numSets - 1)) / numSets;
    const rowH = 4.2;
    const headerH = 6;

    const maxRows = Math.max(...allSetHistories.map(hm => hm.scoreHistory.length));

    // Draw column headers
    const drawHeaders = (continued) => {
      allSetHistories.forEach((hm, si) => {
        const cx = ML + si * (colW + gap);
        doc.setFillColor(...colors.black);
        doc.rect(cx, y, colW, headerH, 'F');
        doc.setTextColor(...colors.white);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`Set ${hm.setNumber}${continued ? ' (verv.)' : ''}`, cx + 2, y + 4);
        doc.text(hm.finalScore, cx + colW - 2, y + 4, { align: 'right' });
      });
      y += headerH;
    };

    drawHeaders(false);

    // Draw rows
    for (let r = 0; r < maxRows; r++) {
      if (y + rowH > H - 20) {
        doc.addPage();
        y = MT;
        drawHeaders(true);
      }

      allSetHistories.forEach((hm, si) => {
        const s = hm.scoreHistory[r];
        if (!s) return;
        const cx = ML + si * (colW + gap);
        const isHome = s.team === 'home';

        // Row background — team color coded
        if (isHome) doc.setFillColor(254, 242, 242);
        else doc.setFillColor(239, 246, 255);
        doc.rect(cx, y, colW, rowH, 'F');

        // Bottom border
        doc.setDrawColor(235, 235, 235);
        doc.setLineWidth(0.15);
        doc.line(cx, y + rowH, cx + colW, y + rowH);

        // Score
        doc.setTextColor(...colors.black);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.text(s.score, cx + 2, y + 3);

        // Type label
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...(isHome ? colors.red : colors.blue));
        doc.text(typeLabels[s.type] || s.type, cx + colW - 2, y + 3, { align: 'right' });
      });

      y += rowH;
    }
    y += 4;
  }

  // Wissels
  const allSubs = savedHeatmaps.flatMap((hm, i) =>
    (hm.substitutions || []).map(s => ({ ...s, setNumber: hm.setNumber }))
  );
  if (allSubs.length > 0) {
    sectionHeader('Wissels');
    const subCols = [CW * 0.15, CW * 0.42, CW * 0.43];
    tableRow(['Set', 'Speler Uit', 'Speler In'], subCols, true);
    allSubs.forEach((sub, i) => {
      const pOut = players?.find(p => p.id === sub.playerOut);
      const pIn = players?.find(p => p.id === sub.playerIn);
      tableRow([
        sub.setNumber,
        pOut ? `#${pOut.number} ${pOut.name}` : `#${sub.playerOut}`,
        pIn ? `#${pIn.number} ${pIn.name}` : `#${sub.playerIn}`
      ], subCols, false, i % 2 === 0 ? [245, 247, 250] : null);
    });
    y += 4;
  }

  // ──────────────────────────────────────────────
  // PAGE 3+: Heatmaps & Aanvalslijnen (per set)
  // ──────────────────────────────────────────────
  if (savedHeatmaps.length > 0) {
    savedHeatmaps.forEach((hm) => {
      doc.addPage();
      y = MT;

      // Set header (red themed)
      doc.setFillColor(...colors.redBg);
      doc.roundedRect(ML, y, CW, 10, 2, 2, 'F');
      doc.setTextColor(...colors.white);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Set ${hm.setNumber}`, ML + 4, y + 7);
      doc.setFontSize(9);
      doc.text(`${hm.finalScore}  |  ${hm.winner === 'home' ? homeTeam + ' wint' : awayTeam + ' wint'}`, W - MR - 4, y + 7, { align: 'right' });
      y += 16;

      // Draw two courts side by side (home left, away right)
      const courtW = 75;
      const courtH = 110;
      const gap = 10;
      const startX = ML + (CW - courtW * 2 - gap) / 2;
      const courtLX = startX;
      const courtRX = startX + courtW + gap;
      const courtY = y + 6;

      // Helper: draw one court
      const drawCourt = (cx) => {
        const nY = courtY + courtH / 2;
        // Away half (top)
        doc.setFillColor(220, 225, 235);
        doc.rect(cx, courtY, courtW, courtH / 2, 'F');
        // Home half (bottom)
        doc.setFillColor(210, 218, 230);
        doc.rect(cx, nY, courtW, courtH / 2, 'F');
        // Court border
        doc.setDrawColor(100, 116, 139);
        doc.setLineWidth(0.5);
        doc.rect(cx, courtY, courtW, courtH);
        // Net
        doc.setDrawColor(30, 41, 59);
        doc.setLineWidth(1);
        doc.line(cx, nY, cx + courtW, nY);
        // 3m lines (dashed)
        doc.setDrawColor(150, 160, 175);
        doc.setLineWidth(0.3);
        doc.setLineDashPattern([2, 1.5], 0);
        doc.line(cx, courtY + courtH / 6, cx + courtW, courtY + courtH / 6);
        doc.line(cx, nY + courtH / 3, cx + courtW, nY + courtH / 3);
        doc.setLineDashPattern([], 0);
      };

      // Draw both courts
      drawCourt(courtLX);
      drawCourt(courtRX);

      // Court titles
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(239, 68, 68);
      doc.text(homeTeam, courtLX + courtW / 2, courtY - 2, { align: 'center' });
      doc.setTextColor(59, 130, 246);
      doc.text(awayTeam, courtRX + courtW / 2, courtY - 2, { align: 'center' });

      // Filter data per team
      const homeData = hm.data.filter(pt => pt.team === 'home');
      const awayData = hm.data.filter(pt => pt.team === 'away');

      // Plot dots on left court (home points)
      homeData.forEach(pt => {
        const dotX = courtLX + (pt.x / 100) * courtW;
        const dotY_pct = pt.y * 0.5;
        const dotY = courtY + (dotY_pct / 100) * courtH;
        doc.setFillColor(239, 68, 68);
        doc.circle(dotX, dotY, 1.2, 'F');
      });

      // Plot dots on right court (away points)
      awayData.forEach(pt => {
        const dotX = courtRX + (pt.x / 100) * courtW;
        const dotY_pct = 50 + pt.y * 0.5;
        const dotY = courtY + (dotY_pct / 100) * courtH;
        doc.setFillColor(59, 130, 246);
        doc.circle(dotX, dotY, 1.2, 'F');
      });

      // Plot attack lines per court
      const attackPts = hm.data.filter(d => d.playerPos != null && d.type !== 'servicefault' && d.type !== 'direct');
      attackPts.forEach(pt => {
        const pTeam = getPlayerTeam(pt);
        const start = getPlayerSvg(pt.playerPos, pTeam, pt.srvTeam);
        const end = getLandingSvg(pt.team, pt.x, pt.y);
        if (!start || !end) return;

        const cx = pTeam === 'home' ? courtLX : courtRX;
        const sx = cx + (start.x / 100) * courtW;
        const sy = courtY + (start.y / 100) * courtH;
        const ex = cx + (end.x / 100) * courtW;
        const ey = courtY + (end.y / 100) * courtH;

        doc.setDrawColor(...(pTeam === 'home' ? [239, 68, 68] : [59, 130, 246]));
        doc.setLineWidth(0.2);
        doc.line(sx, sy, ex, ey);
      });

      y = courtY + courtH + 4;

      // Set stats compact
      if (hm.stats) {
        const sCols = [CW * 0.28, CW * 0.36, CW * 0.36];
        tableRow(['', homeTeam, awayTeam], sCols, true);
        ['direct','sideout','block','attack','error'].forEach((k, i) => {
          tableRow([typeLabels[k], hm.stats.home?.[k] || 0, hm.stats.away?.[k] || 0], sCols, false, i % 2 === 0 ? [245, 247, 250] : null);
        });
        const hT = Object.values(hm.stats.home || {}).reduce((a,b) => a+b, 0);
        const aT = Object.values(hm.stats.away || {}).reduce((a,b) => a+b, 0);
        tableRow(['Totaal', hT, aT], sCols, false, [230, 235, 240]);
        y += 4;
      }

      // Timeouts
      if ((hm.homeTimeouts && hm.homeTimeouts.length > 0) || (hm.awayTimeouts && hm.awayTimeouts.length > 0)) {
        ensureSpace(14);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.black);
        doc.text('Timeouts:', ML, y + 4);
        doc.setFont('helvetica', 'normal');
        const toTexts = [];
        const fmtTO2 = arr => (arr || []).map(t => typeof t === 'string' ? t : (t?.score || JSON.stringify(t))).join(', ');
        if (hm.homeTimeouts?.length) toTexts.push(`${homeTeam}: ${fmtTO2(hm.homeTimeouts)}`);
        if (hm.awayTimeouts?.length) toTexts.push(`${awayTeam}: ${fmtTO2(hm.awayTimeouts)}`);
        doc.text(toTexts.join('  |  '), ML + 22, y + 4);
        y += 8;
      }
    });
  }

  // Footer on each page with branding
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Red accent line at bottom
    doc.setDrawColor(...colors.red);
    doc.setLineWidth(0.5);
    doc.line(ML, H - 14, ML + CW, H - 14);
    // Footer text
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.gray);
    doc.text('VolleyWarrior', ML, H - 8);
    doc.text(`${homeTeam} vs ${awayTeam}  |  ${matchDate}`, W / 2, H - 8, { align: 'center' });
    doc.text(`${i} / ${pageCount}`, W - MR, H - 8, { align: 'right' });
  }

  // Save
  const fileName = `VolleyWarrior_${homeTeam}_vs_${awayTeam}_${matchDate || 'match'}.pdf`.replace(/\s+/g, '_');

  if (Capacitor.isNativePlatform()) {
    // Android/iOS: write to cache, then share
    const base64 = doc.output('datauristring').split(',')[1];
    Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache })
      .then(result => Share.share({ title: fileName, url: result.uri, dialogTitle: 'PDF Opslaan / Delen' }))
      .catch(() => {});
  } else {
    // Web browser fallback
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  }
}
