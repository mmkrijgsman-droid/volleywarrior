import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import useMatchState from './useMatchState';

beforeEach(() => localStorage.clear());

// Zet een thuisopstelling met spelverdelers op de gegeven posities (ids = pos*10).
function lineupWithSettersAt(result, setterPositions) {
  const players = [];
  const lineup = { libero: null };
  for (let pos = 1; pos <= 6; pos++) {
    const id = pos * 10;
    players.push({ id, name: `P${id}`, number: pos, role: setterPositions.includes(pos) ? 'setter' : 'outside' });
    lineup[pos] = id;
  }
  act(() => { result.current.setPlayers(players); });
  act(() => { result.current.setHomeLineup(lineup); });
}

describe('getRotation — 4-2 ondersteuning', () => {
  it('geeft de positie van de enige spelverdeler in 5-1', () => {
    const { result } = renderHook(() => useMatchState());
    lineupWithSettersAt(result, [3]);
    expect(result.current.getRotation()).toBe(3);
  });

  it('kiest de achterste spelverdeler in 4-2 (posities 1 & 4 → 1)', () => {
    const { result } = renderHook(() => useMatchState());
    lineupWithSettersAt(result, [1, 4]);
    expect(result.current.getRotation()).toBe(1);
  });

  it('4-2 met setters op 2 & 5 → achterste = 5', () => {
    const { result } = renderHook(() => useMatchState());
    lineupWithSettersAt(result, [2, 5]);
    expect(result.current.getRotation()).toBe(5);
  });

  it('4-2 met setters op 3 & 6 → achterste = 6', () => {
    const { result } = renderHook(() => useMatchState());
    lineupWithSettersAt(result, [3, 6]);
    expect(result.current.getRotation()).toBe(6);
  });

  it('geeft null zonder spelverdeler op het veld', () => {
    const { result } = renderHook(() => useMatchState());
    lineupWithSettersAt(result, []);
    expect(result.current.getRotation()).toBe(null);
  });
});

describe('correctPointPlayer', () => {
  function scoreHomeAttack(result, playerId) {
    act(() => { result.current.scorePoint('home', 50, 50); });
    act(() => { result.current.confirmPointType('attack'); });
    // trackPlayerStats staat standaard aan → speler-selectie
    act(() => { result.current.confirmPlayerSelect(playerId); });
  }

  it('verplaatst de speler-statistiek en laat de stand ongemoeid', () => {
    const { result } = renderHook(() => useMatchState());
    scoreHomeAttack(result, 2);
    expect(result.current.playerStats[2]?.attack).toBe(1);
    expect(result.current.homeScore).toBe(1);

    act(() => { result.current.correctPointPlayer(0, 3); });

    expect(result.current.playerStats[2]?.attack).toBe(0);
    expect(result.current.playerStats[3]?.attack).toBe(1);
    expect(result.current.scoreHistory[0].playerId).toBe(3);
    expect(result.current.homeScore).toBe(1); // stand onveranderd
  });

  it('doet niets bij een onbekende index', () => {
    const { result } = renderHook(() => useMatchState());
    scoreHomeAttack(result, 2);
    act(() => { result.current.correctPointPlayer(99, 3); });
    expect(result.current.playerStats[2]?.attack).toBe(1);
    expect(result.current.scoreHistory[0].playerId).toBe(2);
  });
});
