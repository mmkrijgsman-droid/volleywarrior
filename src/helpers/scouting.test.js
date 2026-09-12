import { describe, it, expect } from 'vitest';
import { analyzeGames, buildBriefing, gameFromNevobo, gamesFromSaved } from './scouting';

const oppGames = [
  { date: '2026-01-01', won: true, sets: [{ for: 25, against: 10 }, { for: 25, against: 12 }, { for: 25, against: 8 }] },       // set1 W, ruim
  { date: '2026-01-08', won: true, sets: [{ for: 20, against: 25 }, { for: 25, against: 20 }, { for: 25, against: 18 }, { for: 25, against: 22 }] }, // set1 L
  { date: '2026-01-15', won: false, sets: [{ for: 25, against: 23 }, { for: 23, against: 25 }, { for: 25, against: 20 }, { for: 20, against: 25 }, { for: 12, against: 15 }] }, // 5 sets, tiebreak verloren
];

describe('analyzeGames', () => {
  const p = analyzeGames(oppGames);
  it('telt gespeeld/gewonnen', () => {
    expect(p.played).toBe(3);
    expect(p.won).toBe(2);
    expect(p.winPct).toBe(67);
  });
  it('berekent set-win% per set', () => {
    expect(p.firstSetWinRate).toBe(67); // 2 van 3
  });
  it('herkent de vijfde set', () => {
    expect(p.fifthSet).toEqual({ played: 1, won: 0 });
  });
  it('vorm staat nieuwste eerst', () => {
    expect(p.form[0]).toBe('L'); // laatste wedstrijd verloren
    expect(p.form).toEqual(['L', 'W', 'W']);
  });
  it('leeg profiel bij geen games', () => {
    expect(analyzeGames([]).played).toBe(0);
  });
});

describe('gameFromNevobo perspectief', () => {
  const match = {
    datum: '2026-02-01',
    uitslag: { setsA: 3, setsB: 1 },
    setstanden: [{ set: 1, a: 25, b: 20 }, { set: 2, a: 25, b: 22 }, { set: 3, a: 20, b: 25 }, { set: 4, a: 25, b: 19 }],
    home: { code: 'X', naam: 'Team X' },
    away: { code: 'Y', naam: 'Team Y' },
  };
  it('thuisploeg wint', () => {
    const g = gameFromNevobo(match, 'X');
    expect(g.won).toBe(true);
    expect(g.sets[0]).toEqual({ for: 25, against: 20 });
    expect(g.oppName).toBe('Team Y');
  });
  it('uitploeg verliest, scores omgedraaid', () => {
    const g = gameFromNevobo(match, 'Y');
    expect(g.won).toBe(false);
    expect(g.sets[0]).toEqual({ for: 20, against: 25 });
  });
  it('niet-gespeelde wedstrijd → null', () => {
    expect(gameFromNevobo({ ...match, uitslag: null }, 'X')).toBe(null);
  });
});

describe('gamesFromSaved', () => {
  it('leest per-set finalScore uit savedHeatmaps', () => {
    const g = gamesFromSaved([{ date: '2026-03-01', opponent: 'Z', winner: 'home', savedHeatmaps: [{ finalScore: '25-20' }, { finalScore: '23-25' }, { finalScore: '25-18' }] }]);
    expect(g).toHaveLength(1);
    expect(g[0].won).toBe(true);
    expect(g[0].sets).toEqual([{ for: 25, against: 20 }, { for: 23, against: 25 }, { for: 25, against: 18 }]);
  });
});

describe('buildBriefing', () => {
  it('waarschuwt als tegenstander set 1 vaak wint', () => {
    const opp = analyzeGames(oppGames);
    const texts = buildBriefing(null, opp, 'VC Test').map(x => x.text).join(' | ');
    expect(texts).toMatch(/set 1 vaak/i);
  });
  it('meldt te weinig data bij lege tegenstander', () => {
    const texts = buildBriefing(null, analyzeGames([]), 'VC Test').map(x => x.text).join(' | ');
    expect(texts).toMatch(/te weinig/i);
  });
});
