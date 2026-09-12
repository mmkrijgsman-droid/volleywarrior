import { describe, expect, it } from 'vitest';
import { parseCommand } from './useVoiceScoring';
import { aggregateSeason } from './season';
import { buildMatchReport } from './matchReport';

describe('parseCommand (stem-scoren)', () => {
  it('herkent een thuis-aanval', () => {
    expect(parseCommand('aanval')).toEqual({ action: 'score', team: 'home', type: 'attack' });
  });
  it('herkent een punt voor de tegenstander', () => {
    expect(parseCommand('tegen ace')).toEqual({ action: 'score', team: 'away', type: 'direct' });
  });
  it('herkent blok thuis', () => {
    expect(parseCommand('blok thuis')).toEqual({ action: 'score', team: 'home', type: 'block' });
  });
  it('herkent undo', () => {
    expect(parseCommand('even terug')).toEqual({ action: 'undo' });
  });
  it('geeft null bij onbekende tekst', () => {
    expect(parseCommand('koffie halen')).toBe(null);
  });
});

const fakeMatch = {
  winner: 'home',
  finalScore: { home: 3, away: 1 },
  savedHeatmaps: [
    { stats: { home: { attack: 10, direct: 2, block: 1, sideout: 3, error: 4 }, away: { attack: 5, direct: 1, block: 0, sideout: 2, error: 6 } } },
  ],
  playerStats: {
    2: { attack: 5, direct: 1, block: 0, sideout: 2, error: 1, servicefault: 0 },
    101: { attack: 3, direct: 0, block: 0, sideout: 0, error: 0, servicefault: 0 }, // tegenstander, moet wegvallen
  },
};
const players = [{ id: 2, name: 'Anna', number: 4, role: 'outside' }];

describe('aggregateSeason', () => {
  it('telt record en sets correct', () => {
    const s = aggregateSeason([fakeMatch], players);
    expect(s.record).toMatchObject({ played: 1, won: 1, lost: 0, setsWon: 3, setsLost: 1 });
  });
  it('telt teamtotalen uit savedHeatmaps', () => {
    const s = aggregateSeason([fakeMatch], players);
    expect(s.teamTotals.attack).toBe(10);
    expect(s.oppTotals.attack).toBe(5);
  });
  it('rangschikt alleen eigen spelers, met kill%', () => {
    const s = aggregateSeason([fakeMatch], players);
    expect(s.players).toHaveLength(1);
    expect(s.players[0]).toMatchObject({ id: 2, total: 8, killPct: 83 });
  });
  it('geeft empty bij geen wedstrijden', () => {
    expect(aggregateSeason([], players).empty).toBe(true);
  });
});

describe('buildMatchReport', () => {
  it('produceert een leesbaar verslag met resultaat en topscorer', () => {
    const txt = buildMatchReport({ ...fakeMatch, opponent: 'VC Test', date: '2026-09-01' }, players, 'VCV');
    expect(txt).toContain('VCV — VC Test');
    expect(txt).toContain('Gewonnen met 3-1');
    expect(txt).toContain('Anna');
  });
});
