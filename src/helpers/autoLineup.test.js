import { describe, it, expect } from 'vitest';
import { suggestLineup } from './autoLineup';

const roster = [
  { id: 1, number: 1, role: 'setter' },
  { id: 2, number: 2, role: 'outside' },
  { id: 3, number: 3, role: 'middle' },
  { id: 4, number: 4, role: 'opposite' },
  { id: 5, number: 5, role: 'outside' },
  { id: 6, number: 6, role: 'middle' },
  { id: 7, number: 7, role: 'libero', isLibero: true },
  { id: 8, number: 8, role: 'outside' },
];

describe('suggestLineup', () => {
  it('vult 5-1 met de juiste rollen op de juiste posities', () => {
    const { lineup } = suggestLineup({ players: roster, scoreById: {}, system: '5-1' });
    expect(lineup[1]).toBe(1);       // spelverdeler op pos 1
    expect(lineup[4]).toBe(4);       // diagonaal op pos 4
    expect(lineup.libero).toBe(7);
    expect([2, 5, 8]).toContain(lineup[2]); // outsides
    expect([2, 5, 8]).toContain(lineup[5]);
    expect([3, 6]).toContain(lineup[3]);    // middens
    expect([3, 6]).toContain(lineup[6]);
  });

  it('zet de best gescoorde speler van een rol vooraan', () => {
    const { lineup } = suggestLineup({ players: roster, scoreById: { 8: 100, 2: 10, 5: 5 }, system: '5-1' });
    expect(lineup[2]).toBe(8); // hoogste outside-score → eerste outside-slot
  });

  it('4-2 kiest twee spelverdelers en geen libero', () => {
    const roster42 = [
      { id: 1, number: 1, role: 'setter' }, { id: 2, number: 2, role: 'setter' },
      { id: 3, number: 3, role: 'outside' }, { id: 4, number: 4, role: 'outside' },
      { id: 5, number: 5, role: 'middle' }, { id: 6, number: 6, role: 'middle' },
    ];
    const { lineup } = suggestLineup({ players: roster42, scoreById: {}, system: '4-2' });
    expect(lineup.libero).toBe(null);
    expect([lineup[1], lineup[4]].sort()).toEqual([1, 2]);
  });

  it('meldt fallback-posities als een rol ontbreekt', () => {
    const thin = [
      { id: 1, number: 1, role: 'setter' },
      { id: 2, number: 2, role: 'outside' },
      { id: 3, number: 3, role: 'outside' },
      { id: 4, number: 4, role: 'outside' },
      { id: 5, number: 5, role: 'outside' },
      { id: 6, number: 6, role: 'outside' },
    ]; // geen midden/diagonaal → sommige slots vallen terug
    const { fallbackPositions } = suggestLineup({ players: thin, scoreById: {}, system: '5-1' });
    expect(fallbackPositions.length).toBeGreaterThan(0);
  });
});
