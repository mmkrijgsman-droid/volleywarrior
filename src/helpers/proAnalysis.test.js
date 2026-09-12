import { describe, it, expect } from 'vitest';
import {
  analyzeRotations,
  analyzeReception,
  analyzeAttackEfficiency,
  analyzeServeZones,
  findScoringRuns,
} from './proAnalysis.js';

const players = [
  { id: 1, name: 'Anna', number: 4 },
  { id: 2, name: 'Bram', number: 7 },
];

describe('analyzeRotations + inferScoringTeam (block flip)', () => {
  // inferScoringTeam is module-private, so we exercise it through
  // analyzeRotations: a block clicked on `home` must count for `away`.
  const data = [
    // rot 1, home serving, home scores -> break point
    { rotation: 1, team: 'home', type: 'attack', srvTeam: 'home' },
    // rot 1, away serving, home scores -> sideout
    { rotation: 1, team: 'home', type: 'attack', srvTeam: 'away' },
    // rot 1, home serving, clicked home + BLOCK -> away scores (point against)
    { rotation: 1, team: 'home', type: 'block', srvTeam: 'home' },
    // rot 2, away serving, away scores -> point against, sideout chance
    { rotation: 2, team: 'away', type: 'attack', srvTeam: 'away' },
    // entry without rotation is ignored entirely
    { team: 'home', type: 'attack', srvTeam: 'home' },
  ];

  it('counts points for/against, sideouts and breaks per rotation', () => {
    const rot = analyzeRotations(data, 'home');
    expect(rot[1]).toEqual({
      pointsFor: 2,
      pointsAgainst: 1,
      sideouts: 1,
      sideoutChances: 1,
      breaks: 1,
      breakChances: 2,
    });
    expect(rot[2]).toEqual({
      pointsFor: 0,
      pointsAgainst: 1,
      sideouts: 0,
      sideoutChances: 1,
      breaks: 0,
      breakChances: 0,
    });
  });

  it('block flips the scoring team (block on home = point for away)', () => {
    // Same block entry, analyzed from away's perspective -> point FOR away.
    const rotAway = analyzeRotations(
      [{ rotation: 3, team: 'home', type: 'block', srvTeam: 'away' }],
      'away'
    );
    expect(rotAway[3].pointsFor).toBe(1);
    expect(rotAway[3].pointsAgainst).toBe(0);

    const rotHome = analyzeRotations(
      [{ rotation: 3, team: 'home', type: 'block', srvTeam: 'away' }],
      'home'
    );
    expect(rotHome[3].pointsFor).toBe(0);
    expect(rotHome[3].pointsAgainst).toBe(1);
  });

  it('initialises all six rotations even with no data', () => {
    const rot = analyzeRotations([], 'home');
    expect(Object.keys(rot)).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(rot[4]).toEqual({
      pointsFor: 0, pointsAgainst: 0, sideouts: 0,
      sideoutChances: 0, breaks: 0, breakChances: 0,
    });
  });
});

describe('findScoringRuns', () => {
  const scoreHistory = [
    { team: 'home', score: '1-0' },
    { team: 'home', score: '2-0' },
    { team: 'home', score: '3-0' }, // run of 3 (home)
    { team: 'away', score: '3-1' },
    { team: 'home', score: '4-1' },
    { team: 'home', score: '5-1' }, // only 2 home -> not a run
    { team: 'away', score: '5-2' },
    { team: 'away', score: '5-3' },
    { team: 'away', score: '5-4' },
    { team: 'away', score: '5-5' }, // run of 4 (away), at end of array
  ];

  it('detects runs of 3+ including a run that ends the array', () => {
    const runs = findScoringRuns(scoreHistory);
    expect(runs).toHaveLength(2);
    expect(runs[0]).toMatchObject({ team: 'home', length: 3, startScore: '1-0', endScore: '3-0' });
    expect(runs[1]).toMatchObject({ team: 'away', length: 4, startScore: '5-2', endScore: '5-5' });
  });

  it('respects a custom minLength', () => {
    const runs = findScoringRuns(scoreHistory, 4);
    expect(runs).toHaveLength(1);
    expect(runs[0].team).toBe('away');
  });

  it('returns no runs when nothing reaches the threshold', () => {
    const alternating = [
      { team: 'home', score: '1-0' },
      { team: 'away', score: '1-1' },
      { team: 'home', score: '2-1' },
    ];
    expect(findScoringRuns(alternating)).toEqual([]);
    expect(findScoringRuns([])).toEqual([]);
  });
});

describe('analyzeAttackEfficiency', () => {
  const data = [
    { type: 'attack', playerId: 1 },
    { type: 'attack', playerId: 1 },
    { type: 'error', errorSubtype: 'attack', playerId: 1 }, // counts as attack error
    { type: 'attack', playerId: 2 },
    { type: 'error', errorSubtype: 'net', playerId: 2 },     // NOT an attack error -> ignored
    { type: 'attack', playerId: null },                       // no player -> ignored
  ];

  it('computes kills, attack errors and kill percentage', () => {
    const eff = analyzeAttackEfficiency(data, players);

    expect(eff[1]).toMatchObject({ kills: 2, attackErrors: 1, totalAttempts: 3, name: 'Anna', number: 4 });
    expect(eff[1].killPct).toBe(67); // round(2/3 * 100)

    expect(eff[2]).toMatchObject({ kills: 1, attackErrors: 0, totalAttempts: 1 });
    expect(eff[2].killPct).toBe(100);
  });

  it('handles empty input', () => {
    expect(analyzeAttackEfficiency([], players)).toEqual({});
  });
});

describe('analyzeServeZones', () => {
  it('counts serves and aces per zone', () => {
    const data = [
      { serveZone: 1, type: 'direct' }, // ace
      { serveZone: 1, type: 'attack' }, // serve in zone, not ace
      { serveZone: 3, type: 'direct' }, // ace
      { type: 'direct' },                // no zone -> ignored
    ];
    const zones = analyzeServeZones(data);
    expect(zones[1]).toEqual({ total: 2, aces: 1, acePct: 50 });
    expect(zones[3]).toEqual({ total: 1, aces: 1, acePct: 100 });
    expect(zones[2]).toEqual({ total: 0, aces: 0, acePct: 0 });
  });
});

describe('analyzeReception', () => {
  it('aggregates reception quality overall and per player', () => {
    const data = [
      { receptionQuality: 'A', receptionPlayerId: 1 },
      { receptionQuality: 'B', receptionPlayerId: 1 },
      { receptionQuality: 'C' }, // no player id -> only counts in overall
      { type: 'attack' },        // no reception -> ignored
    ];
    const { overall, byPlayer } = analyzeReception(data, players);
    expect(overall).toEqual({ A: 1, B: 1, C: 1, total: 3 });
    expect(byPlayer[1]).toEqual({ A: 1, B: 1, C: 0, total: 2, name: 'Anna', number: 4 });
    expect(byPlayer[2]).toBeUndefined();
  });
});
