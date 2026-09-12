import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useMatchState from './useMatchState.js';

// useMatchState reads players/matches/settings from localStorage on mount, so
// clear it between tests to keep each hook instance at its documented defaults.
beforeEach(() => {
  localStorage.clear();
});

/**
 * Register one full point the way the app's popup flow does it:
 *   scorePoint -> confirmPointType -> (confirmPlayerSelect) -> (skipProPanel).
 * Each step runs in its own act() because the next step reads state the
 * previous one just set (mirrors mcpBridge's one-step-per-render machine).
 */
function score(result, team, type = 'direct', playerId = null) {
  act(() => { result.current.scorePoint(team, 50, 50); });
  // scorePoint refuses (no popup) once the set/match has ended.
  if (!result.current.showPointTypePopup) return;
  act(() => { result.current.confirmPointType(type); });
  if (result.current.showPlayerSelectPopup) {
    act(() => { result.current.confirmPlayerSelect(playerId); });
  }
  if (result.current.showProPanel) {
    act(() => { result.current.skipProPanel(); });
  }
}

function scoreMany(result, team, n) {
  for (let i = 0; i < n; i++) score(result, team, 'direct');
}

describe('scoring', () => {
  it('raises the correct team score', () => {
    const { result } = renderHook(() => useMatchState());

    score(result, 'home', 'direct');
    expect(result.current.homeScore).toBe(1);
    expect(result.current.awayScore).toBe(0);

    score(result, 'away', 'direct');
    expect(result.current.homeScore).toBe(1);
    expect(result.current.awayScore).toBe(1);
  });

  it('does not register a point once the set has ended', () => {
    const { result } = renderHook(() => useMatchState());
    scoreMany(result, 'home', 25); // 25-0 ends the set
    expect(result.current.setEnded).toBe(true);
    const before = result.current.homeScore;
    score(result, 'home', 'direct');
    expect(result.current.homeScore).toBe(before);
  });
});

describe('set end conditions', () => {
  it('ends the set at 25 only with a 2-point margin', () => {
    const { result } = renderHook(() => useMatchState());

    scoreMany(result, 'home', 24);
    scoreMany(result, 'away', 24); // 24-24
    expect(result.current.setEnded).toBe(false);

    score(result, 'home', 'direct'); // 25-24 -> margin 1, NOT ended
    expect(result.current.homeScore).toBe(25);
    expect(result.current.awayScore).toBe(24);
    expect(result.current.setEnded).toBe(false);
    expect(result.current.sets).toEqual({ home: 0, away: 0 });

    score(result, 'home', 'direct'); // 26-24 -> margin 2, ended
    expect(result.current.setEnded).toBe(true);
    expect(result.current.setWinner).toBe('home');
    expect(result.current.sets).toEqual({ home: 1, away: 0 });
  });

  it('plays the 5th set to 15, not 25', () => {
    const { result } = renderHook(() => useMatchState());

    // Win sets 1-4 alternately to reach 2-2 (each set 25-0).
    const winSet = (team) => {
      scoreMany(result, team, 25);
      act(() => { result.current.startNewSet(true); }); // keep lineup
    };
    winSet('home'); // 1-0
    winSet('away'); // 1-1
    winSet('home'); // 2-1
    winSet('away'); // 2-2
    expect(result.current.sets).toEqual({ home: 2, away: 2 });

    scoreMany(result, 'home', 14); // 14-0 in the deciding set
    expect(result.current.setEnded).toBe(false);

    score(result, 'home', 'direct'); // 15-0 ends the deciding set (target 15)
    expect(result.current.setEnded).toBe(true);
    expect(result.current.sets).toEqual({ home: 3, away: 2 });
    expect(result.current.matchEnded).toBe(true);
    expect(result.current.matchWinner).toBe('home');
  });
});

describe('rotation on sideout', () => {
  it('rotates the scoring team and hands them the serve only on a sideout', () => {
    const { result } = renderHook(() => useMatchState());
    // Home serves first (default). Home scoring is NOT a sideout -> no rotation.
    const homeLineupStart = { ...result.current.homeLineup };
    const awayLineupStart = { ...result.current.awayLineup };

    score(result, 'home', 'direct');
    expect(result.current.servingTeam).toBe('home');
    expect(result.current.homeLineup).toEqual(homeLineupStart);

    // Away scores while home serves -> sideout: away rotates + takes serve.
    score(result, 'away', 'direct');
    expect(result.current.servingTeam).toBe('away');
    expect(result.current.awayLineup).toEqual({
      1: 102, 2: 103, 3: 104, 4: 105, 5: 106, 6: 101,
    });
    expect(result.current.awayLineup).not.toEqual(awayLineupStart);

    // Home scores while away serves -> sideout: home rotates + takes serve back.
    score(result, 'home', 'direct');
    expect(result.current.servingTeam).toBe('home');
    expect(result.current.homeLineup).toMatchObject({
      1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 1,
    });
  });
});

describe('undo', () => {
  it('fully reverts a plain point (score only)', () => {
    const { result } = renderHook(() => useMatchState());
    score(result, 'home', 'direct');
    expect(result.current.homeScore).toBe(1);

    act(() => { result.current.undoLastPoint(); });
    expect(result.current.homeScore).toBe(0);
    expect(result.current.scoreHistory).toHaveLength(0);
    expect(result.current.servingTeam).toBe('home');
  });

  it('reverts score, rotation and serve after a sideout', () => {
    const { result } = renderHook(() => useMatchState());
    const awayLineupStart = { ...result.current.awayLineup };

    score(result, 'away', 'direct'); // sideout: away rotates + serves
    expect(result.current.servingTeam).toBe('away');
    expect(result.current.awayLineup).not.toEqual(awayLineupStart);

    act(() => { result.current.undoLastPoint(); });
    expect(result.current.awayScore).toBe(0);
    expect(result.current.servingTeam).toBe('home');
    expect(result.current.awayLineup).toEqual(awayLineupStart); // reverse-rotated back
    expect(result.current.scoreHistory).toHaveLength(0);
  });

  it('undoes a set-ending point (restores set count and set-ended state)', () => {
    const { result } = renderHook(() => useMatchState());
    scoreMany(result, 'home', 25); // 25-0 ends set 1
    expect(result.current.setEnded).toBe(true);
    expect(result.current.sets).toEqual({ home: 1, away: 0 });

    act(() => { result.current.undoLastPoint(); });
    expect(result.current.setEnded).toBe(false);
    expect(result.current.setWinner).toBe(null);
    expect(result.current.sets).toEqual({ home: 0, away: 0 });
    expect(result.current.homeScore).toBe(24);
  });
});

describe('substitution rules', () => {
  // Add bench players (default roster fills all 6 field slots + libero).
  const withBench = () => {
    const { result } = renderHook(() => useMatchState());
    act(() => {
      result.current.setPlayers([
        { id: 1, name: 'Speler 1', number: 1, role: 'setter' },
        { id: 2, name: 'Speler 2', number: 2, role: 'outside' },
        { id: 3, name: 'Speler 3', number: 3, role: 'middle' },
        { id: 4, name: 'Speler 4', number: 4, role: 'opposite' },
        { id: 5, name: 'Speler 5', number: 5, role: 'outside' },
        { id: 6, name: 'Speler 6', number: 6, role: 'middle' },
        { id: 7, name: 'Libero', number: 7, role: 'libero', isLibero: true },
        { id: 8, name: 'Bank 8', number: 8, role: 'outside' },
        { id: 9, name: 'Bank 9', number: 9, role: 'middle' },
        { id: 10, name: 'Bank 10', number: 10, role: 'opposite' },
        { id: 11, name: 'Bank 11', number: 11, role: 'outside' },
        { id: 12, name: 'Bank 12', number: 12, role: 'middle' },
        { id: 13, name: 'Bank 13', number: 13, role: 'opposite' },
        { id: 14, name: 'Bank 14', number: 14, role: 'outside' },
      ]);
    });
    return result;
  };

  const sub = (result, benchId, courtId) => {
    act(() => { result.current.setSelectedBenchPlayer(benchId); });
    act(() => { result.current.makeSubstitution(courtId); });
  };

  it('performs a legal substitution', () => {
    const result = withBench();
    sub(result, 8, 1); // bring 8 in for court player 1
    expect(result.current.substitutions).toEqual([{ playerOut: 1, playerIn: 8 }]);
    expect(result.current.homeLineup[1]).toBe(8);
  });

  it('rejects a bench player who is already on court', () => {
    const result = withBench();
    // court player 2 is on the field; try to "sub in" 2 again.
    act(() => { result.current.setSelectedBenchPlayer(2); });
    act(() => { result.current.makeSubstitution(1); });
    expect(result.current.substitutions).toHaveLength(0);
    expect(result.current.alertMessage).toBe('Deze speler staat al op het veld');
  });

  it('enforces the reverse-substitution rule', () => {
    const result = withBench();
    sub(result, 8, 1); // 8 in for 1  (1 now benched)
    expect(result.current.homeLineup[1]).toBe(8);

    // Player 1 may only return for player 8. Returning for 2 must be refused.
    act(() => { result.current.setSelectedBenchPlayer(1); });
    act(() => { result.current.makeSubstitution(2); });
    expect(result.current.substitutions).toHaveLength(1);
    expect(result.current.alertMessage).toContain('Mag alleen terugkomen voor');

    // Returning 1 for 8 (the correct partner) is allowed.
    act(() => { result.current.setSelectedBenchPlayer(1); });
    act(() => { result.current.makeSubstitution(8); });
    expect(result.current.substitutions).toHaveLength(2);
    expect(result.current.homeLineup[1]).toBe(1);
  });

  it('allows at most 6 substitutions per set', () => {
    const result = withBench();
    // Six distinct legal subs: bench 8..13 in for court 1..6.
    sub(result, 8, 1);
    sub(result, 9, 2);
    sub(result, 10, 3);
    sub(result, 11, 4);
    sub(result, 12, 5);
    sub(result, 13, 6);
    expect(result.current.substitutions).toHaveLength(6);

    // Seventh attempt must be blocked.
    act(() => { result.current.setSelectedBenchPlayer(14); });
    act(() => { result.current.makeSubstitution(8); });
    expect(result.current.substitutions).toHaveLength(6);
    expect(result.current.alertMessage).toContain('Max 6 wissels');
  });
});
