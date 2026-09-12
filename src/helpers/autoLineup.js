/**
 * Stelt automatisch een opstelling voor op basis van spelersprestatie.
 *
 * Per speelsysteem hoort een vaste rol-volgorde over posities 1..6. We vullen
 * elk rol-slot met de best presterende ongebruikte speler van die rol; is die
 * rol niet (meer) beschikbaar, dan valt het slot terug op de best presterende
 * overige speler. Zo klopt de opstelling meteen rol-technisch (rotatie 1 met de
 * spelverdeler op positie 1) en staat je sterkste speler per rol vooraan.
 */
const ROLE_ORDER = {
  '5-1': ['setter', 'outside', 'middle', 'opposite', 'outside', 'middle'],
  '4-2': ['setter', 'outside', 'middle', 'setter', 'outside', 'middle'],
};

export function suggestLineup({ players = [], scoreById = {}, system = '5-1' }) {
  const order = ROLE_ORDER[system] || ROLE_ORDER['5-1'];
  const fieldCandidates = players.filter(p => !p.isLibero && p.role !== 'libero');
  const liberoCandidates = players.filter(p => p.isLibero || p.role === 'libero');

  const rank = (a, b) => {
    const sa = scoreById[a.id] || 0;
    const sb = scoreById[b.id] || 0;
    if (sb !== sa) return sb - sa;                 // hoogste prestatie eerst
    return (a.number ?? 999) - (b.number ?? 999);  // gelijkspel: laagste rugnummer
  };

  const used = new Set();
  const pick = (role) => {
    const byRole = fieldCandidates.filter(p => p.role === role && !used.has(p.id)).sort(rank);
    if (byRole.length) { used.add(byRole[0].id); return { id: byRole[0].id, fallback: false }; }
    const any = fieldCandidates.filter(p => !used.has(p.id)).sort(rank);
    if (any.length) { used.add(any[0].id); return { id: any[0].id, fallback: true }; }
    return { id: null, fallback: true };
  };

  const lineup = {};
  const fallbackPositions = [];
  order.forEach((role, i) => {
    const { id, fallback } = pick(role);
    lineup[i + 1] = id;
    if (fallback && id != null) fallbackPositions.push(i + 1);
  });

  // Libero alleen bij 5-1; 4-2 speelt standaard zonder.
  lineup.libero = system === '4-2' ? null : (liberoCandidates.slice().sort(rank)[0]?.id ?? null);

  return { lineup, fallbackPositions, hasScores: Object.keys(scoreById).length > 0 };
}
