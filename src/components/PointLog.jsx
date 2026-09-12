import { useState } from 'react';

const TYPE_LABEL = {
  direct: 'Ace', sideout: 'Sideout', block: 'Blok',
  attack: 'Aanval', error: 'Fout', servicefault: 'Servicefout',
};

/**
 * Bewerkbaar puntenlog van de huidige set. Toont elk punt en laat je de
 * toegeschreven speler corrigeren wanneer je courtside de verkeerde speler
 * aantikte. Verandert alleen de speler-statistiek — niet de stand of rotatie.
 * Alleen eigen (thuis)punten zijn bewerkbaar; die passen bij het eigen roster.
 */
export default function PointLog({ scoreHistory = [], players = [], correctPointPlayer }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // index van het punt dat je bewerkt

  if (!scoreHistory.length) return null;

  const nameFor = (id) => {
    if (id == null) return '—';
    const p = players.find(pl => pl.id === id);
    return p ? `${p.number} ${p.name.split(' ')[0]}` : `#${id}`;
  };

  // Nieuwste punt bovenaan; bewaar de echte index voor de correctie.
  const rows = scoreHistory.map((e, i) => ({ e, i })).reverse();

  return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={() => { setOpen(o => !o); setEditing(null); }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>
        <span style={{ color: '#1e293b', fontWeight: 700, fontSize: 13 }}>Puntenlog · deze set ({scoreHistory.length})</span>
        <span style={{ color: '#6b7280', fontSize: 12 }}>{open ? '▲' : '▼'} corrigeer speler</span>
      </button>

      {open && (
        <div style={{ marginTop: 8, border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, overflow: 'hidden' }}>
          {rows.map(({ e, i }, idx) => {
            const editable = e.team === 'home';
            return (
              <div key={i} style={{ borderTop: idx === 0 ? 'none' : '1px solid rgba(0,0,0,0.05)' }}>
                <div onClick={editable ? () => setEditing(editing === i ? null : i) : undefined}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: editable ? 'pointer' : 'default', background: editing === i ? 'rgba(234,179,8,0.08)' : '#fff', opacity: editable ? 1 : 0.6 }}>
                  <span style={{ minWidth: 44, color: '#6b7280', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{e.score}</span>
                  <span style={{ color: e.team === 'home' ? '#dc2626' : '#2563eb', fontSize: 12, fontWeight: 700, minWidth: 70 }}>{TYPE_LABEL[e.type] || e.type}</span>
                  <span style={{ flex: 1, color: '#374151', fontSize: 12, fontWeight: 600, textAlign: 'right' }}>{nameFor(e.playerId)}</span>
                  <span style={{ color: '#9ca3af', fontSize: 11, minWidth: 12 }}>{editable ? '✎' : ''}</span>
                </div>
                {editing === i && editable && (
                  <div style={{ padding: '8px 12px 12px', background: 'rgba(0,0,0,0.015)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {players.map(p => {
                      const active = e.playerId === p.id;
                      return (
                        <button key={p.id} onClick={() => { correctPointPlayer(i, p.id); setEditing(null); }}
                          style={{ background: active ? 'rgba(220,38,38,0.12)' : '#f3f4f6', color: active ? '#dc2626' : '#374151', border: `1px solid ${active ? 'rgba(220,38,38,0.35)' : '#e5e7eb'}`, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          {p.number} {p.name.split(' ')[0]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
