import { useEffect, useState } from 'react';
import { fetchTeamMatches } from '../helpers/nevoboCompetitie';
import { getTeamConfig } from '../helpers/teamConfig';

const note = { color: '#6b7280', fontSize: 12, marginBottom: 12, background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 8, padding: '8px 10px' };

/**
 * Kiest de eerstvolgende Nevobo-wedstrijd(en) uit de agenda van je team en
 * vult daarmee tegenstander + datum. Geen team ingesteld of niks gevonden?
 * Dan gewoon handmatig invullen (oefenwedstrijd).
 */
export default function FixturePicker({ onPick }) {
  const cfg = getTeamConfig();
  const [fixtures, setFixtures] = useState(cfg.teamCode ? null : []); // null = laden
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!cfg.teamCode) return;
    let alive = true;
    (async () => {
      try {
        const all = await fetchTeamMatches(cfg.teamCode);
        const today = new Date().toISOString().slice(0, 10);
        const upcoming = all
          .filter(m => m.status !== 'gespeeld' && (m.datum || '') >= today)
          .sort((a, b) => String(a.datum).localeCompare(String(b.datum)))
          .slice(0, 6);
        if (alive) setFixtures(upcoming);
      } catch (e) {
        if (alive) { setError(e.message || 'Ophalen mislukt'); setFixtures([]); }
      }
    })();
    return () => { alive = false; };
  }, [cfg.teamCode]);

  if (!cfg.teamCode) return <div style={note}>Stel je team in bij Instellingen om uit de agenda te kiezen — of vul hieronder handmatig in (oefenwedstrijd).</div>;
  if (fixtures === null) return <div style={note}>Agenda laden…</div>;
  if (error) return <div style={{ ...note, color: '#dc2626' }}>{error} — vul handmatig in.</div>;
  if (!fixtures.length) return <div style={note}>Geen geplande wedstrijden — vul handmatig in (oefenwedstrijd).</div>;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 6 }}>Uit de agenda (of vul hieronder handmatig in):</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto' }}>
        {fixtures.map(m => {
          const home = m.home.code === cfg.teamCode;
          const opp = home ? m.away.naam : m.home.naam;
          return (
            <button key={m.uuid} onClick={() => onPick(opp, m.datum)}
              style={{ textAlign: 'left', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 12 }}>
              <span style={{ color: '#6b7280' }}>{m.datum}</span> — <span style={{ color: '#1e293b', fontWeight: 700 }}>{opp}</span> <span style={{ color: '#9ca3af' }}>({home ? 'thuis' : 'uit'})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
