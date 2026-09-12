import { useMemo } from 'react';
import { aggregateSeason } from '../helpers/season';

const STAT_ROWS = [
  { key: 'attack', label: 'Aanval' },
  { key: 'direct', label: 'Ace' },
  { key: 'block', label: 'Blok' },
  { key: 'sideout', label: 'Sideout' },
  { key: 'error', label: 'Fout' },
];

function Stat({ label, value, color = '#1e293b' }) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>{label}</div>
    </div>
  );
}

export default function SeasonTab({ savedMatches = [], players = [], teamName }) {
  const season = useMemo(() => aggregateSeason(savedMatches, players), [savedMatches, players]);

  if (season.empty) {
    return (
      <div>
        <div style={{ color: '#1e293b', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Seizoensoverzicht</div>
        <div style={{ color: '#6b7280', fontSize: 13 }}>Nog geen opgeslagen wedstrijden. Speel en bewaar een wedstrijd om hier je seizoenstrends te zien.</div>
      </div>
    );
  }

  const { record, teamTotals, oppTotals } = season;
  const card = { background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12, padding: '12px 14px', marginBottom: 12 };

  return (
    <div>
      <div style={{ color: '#1e293b', fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Seizoensoverzicht · {teamName || 'Ons team'}</div>

      {/* Record */}
      <div style={{ ...card, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        <Stat label="Gespeeld" value={record.played} />
        <Stat label="Gewonnen" value={record.won} color="#16a34a" />
        <Stat label="Verloren" value={record.lost} color="#dc2626" />
        <Stat label="Sets" value={`${record.setsWon}-${record.setsLost}`} />
      </div>

      {/* Punttype-verdeling team vs tegenstanders */}
      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Punten per type — {teamName || 'wij'} vs tegenstanders</div>
        {STAT_ROWS.map(({ key, label }) => {
          const us = teamTotals[key] || 0;
          const them = oppTotals[key] || 0;
          const max = Math.max(us, them, 1);
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 56, fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{label}</span>
              <span style={{ width: 22, textAlign: 'right', fontSize: 11, fontWeight: 800, color: '#dc2626' }}>{us}</span>
              <div style={{ flex: 1, height: 8, background: 'rgba(0,0,0,0.05)', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: `${(us / max) * 50}%`, background: '#dc2626', opacity: 0.7, transform: 'translateX(-100%)' }} />
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: `${(them / max) * 50}%`, background: '#2563eb', opacity: 0.7 }} />
              </div>
              <span style={{ width: 22, fontSize: 11, fontWeight: 800, color: '#2563eb' }}>{them}</span>
            </div>
          );
        })}
      </div>

      {/* Spelertotalen over het seizoen */}
      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Spelers · totaal over {record.played} wedstrijd(en)</div>
        {season.players.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: 12 }}>Nog geen spelerpunten geregistreerd.</div>
        ) : season.players.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(0,0,0,0.05)' }}>
            <span style={{ width: 16, fontSize: 12, fontWeight: 800, color: i < 3 ? '#dc2626' : '#9ca3af', textAlign: 'center' }}>{i + 1}</span>
            <span style={{ width: 22, height: 22, borderRadius: 5, background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{p.number}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            <span style={{ fontSize: 10, color: '#9ca3af' }}>{p.attack}a · {p.direct}ac · {p.block}b</span>
            {p.killPct != null && <span style={{ fontSize: 11, color: '#6b7280', width: 40, textAlign: 'right' }}>{p.killPct}%</span>}
            <span style={{ fontSize: 13, fontWeight: 800, color: '#dc2626', width: 26, textAlign: 'right' }}>{p.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
