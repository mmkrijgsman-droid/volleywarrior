import { useState } from 'react';
import { getRoleLabel } from '../helpers/constants';
import { isDwfAvailable } from '../helpers/dwfImport';
import { aggregateSeason } from '../helpers/season';
import { suggestLineup } from '../helpers/autoLineup';

export default function LineupTab({ players, homeLineup, awayLineup, updateLineup, setHomeLineup, savedMatches = [], teamName, setTeamName, opponentName, setOpponentName, confirmLineup, formationSystem, switchFormation, opponentPlayers, setShowDwfImportModal }) {
  const [showLibero42, setShowLibero42] = useState(false);
  const [autoNote, setAutoNote] = useState(null);

  const applyAutoLineup = () => {
    const season = aggregateSeason(savedMatches, players);
    const scoreById = {};
    for (const p of season.players) scoreById[p.id] = p.total;
    const { lineup, fallbackPositions, hasScores } = suggestLineup({ players, scoreById, system: formationSystem });
    setHomeLineup(l => ({ ...l, ...lineup }));
    const base = hasScores
      ? 'Opstelling op basis van seizoensprestatie.'
      : 'Nog geen seizoensdata — opstelling op rol en rugnummer.';
    setAutoNote(fallbackPositions.length
      ? `${base} Let op: te weinig spelers voor sommige rollen (pos ${fallbackPositions.join(', ')}) — check even.`
      : base);
  };

  return (
    <div>
      <div style={{ color:'#1e293b', fontWeight:700, fontSize:14, marginBottom:10 }}>Opstelling Invoeren</div>

      {/* Formation toggle */}
      <div style={{ display:'flex', gap:6, marginBottom:12 }}>
        {['5-1','4-2'].map(sys => (
          <button key={sys} onClick={() => switchFormation(sys)}
            style={{ flex:1, padding:'8px 0', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', border: formationSystem === sys ? '1px solid rgba(220,38,38,0.5)' : '1px solid #e5e7eb', background: formationSystem === sys ? 'rgba(220,38,38,0.1)' : '#f9fafb', color: formationSystem === sys ? '#dc2626' : '#6b7280', transition:'all 0.2s' }}>
            {sys}
          </button>
        ))}
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <div style={{ flex:1 }}>
          <label style={{ color:'#6b7280', fontSize:12, display:'block', marginBottom:4 }}>Ons team</label>
          <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Teamnaam"
            style={{ width:'100%', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 10px', color:'#1e293b', fontSize:13, boxSizing:'border-box' }}/>
        </div>
        <div style={{ flex:1 }}>
          <label style={{ color:'#6b7280', fontSize:12, display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
            Tegenstander
            {isDwfAvailable() && setShowDwfImportModal && (
              <button onClick={() => setShowDwfImportModal('opponent')}
                style={{ background:'rgba(37,99,235,0.1)', color:'#2563eb', border:'1px solid rgba(37,99,235,0.3)', borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:700, cursor:'pointer', lineHeight:1.4 }}>
                DWF
              </button>
            )}
          </label>
          <input value={opponentName} onChange={e => setOpponentName(e.target.value)} placeholder="Naam tegenstander"
            style={{ width:'100%', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 10px', color:'#1e293b', fontSize:13, boxSizing:'border-box' }}/>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ color:'#dc2626', fontWeight:600, fontSize:13 }}>Ons Team</div>
        <button onClick={applyAutoLineup}
          style={{ background:'rgba(234,179,8,0.12)', color:'#a16207', border:'1px solid rgba(234,179,8,0.35)', borderRadius:8, padding:'5px 10px', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
          ⚡ Auto-opstelling
        </button>
      </div>
      {autoNote && (
        <div style={{ background:'rgba(234,179,8,0.06)', border:'1px solid rgba(234,179,8,0.25)', borderRadius:8, padding:'6px 10px', marginBottom:8, fontSize:11, color:'#92400e' }}>{autoNote}</div>
      )}
      {[1,2,3,4,5,6].map(pos => (
        <div key={pos} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <span style={{ color:'#6b7280', fontSize:12, width:35, flexShrink:0 }}>Pos {pos}</span>
          <select value={homeLineup[pos]||''} onChange={e => updateLineup('home', pos, +e.target.value)}
            style={{ flex:1, background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 8px', color:'#1e293b', fontSize:12 }}>
            <option value="">—</option>
            {players.filter(p => !p.isLibero && (homeLineup[pos] === p.id || ![1,2,3,4,5,6].filter(pp => pp !== pos).some(pp => homeLineup[pp] === p.id))).map(p => <option key={p.id} value={p.id}>{p.name} #{p.number} ({getRoleLabel(p.role)})</option>)}
          </select>
        </div>
      ))}

      {/* Libero: always visible for 5-1, collapsible for 4-2 */}
      {formationSystem === '5-1' ? (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <span style={{ color:'#6b7280', fontSize:12, width:35, flexShrink:0 }}>Libero</span>
          <select value={homeLineup.libero||''} onChange={e => updateLineup('home','libero',+e.target.value)}
            style={{ flex:1, background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 8px', color:'#1e293b', fontSize:12 }}>
            <option value="">—</option>
            {players.filter(p=>p.isLibero).map(p => <option key={p.id} value={p.id}>{p.name} #{p.number}</option>)}
          </select>
        </div>
      ) : (
        <div style={{ marginBottom:12 }}>
          <button onClick={() => setShowLibero42(v => !v)}
            style={{ background:'none', border:'none', color:'#6b7280', fontSize:12, cursor:'pointer', padding:'4px 0', display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ fontSize:10 }}>{showLibero42 ? '▼' : '▶'}</span>
            Libero toevoegen (optioneel)
          </button>
          {showLibero42 && (
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
              <span style={{ color:'#6b7280', fontSize:12, width:35, flexShrink:0 }}>Libero</span>
              <select value={homeLineup.libero||''} onChange={e => updateLineup('home','libero',+e.target.value)}
                style={{ flex:1, background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 8px', color:'#1e293b', fontSize:12 }}>
                <option value="">—</option>
                {players.filter(p=>p.isLibero).map(p => <option key={p.id} value={p.id}>{p.name} #{p.number}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Tip for 4-2 */}
      {formationSystem === '4-2' && (
        <div style={{ background:'rgba(234,179,8,0.08)', border:'1px solid rgba(234,179,8,0.3)', borderRadius:8, padding:'8px 10px', marginBottom:12, fontSize:12, color:'#a16207' }}>
          Tip: Plaats de twee spelverdelers tegenover elkaar (bijv. positie 1 en 4)
        </div>
      )}

      {/* Opponent lineup — only shown when opponent players are imported */}
      {opponentPlayers && opponentPlayers.length > 0 && (
        <>
          <div style={{ color:'#2563eb', fontWeight:600, fontSize:13, marginBottom:8, marginTop:4 }}>Tegenstander Opstelling</div>
          {[1,2,3,4,5,6].map(pos => (
            <div key={`away-${pos}`} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <span style={{ color:'#6b7280', fontSize:12, width:35, flexShrink:0 }}>Pos {pos}</span>
              <select value={awayLineup[pos]||''} onChange={e => updateLineup('away', pos, +e.target.value)}
                style={{ flex:1, background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 8px', color:'#1e293b', fontSize:12 }}>
                <option value="">—</option>
                {opponentPlayers.map(p => <option key={p.id} value={p.id}>{p.name} #{p.number}</option>)}
              </select>
            </div>
          ))}
        </>
      )}

      <button onClick={confirmLineup}
        style={{ width:'100%', background:'rgba(34,197,94,0.1)', color:'#16a34a', border:'1px solid rgba(34,197,94,0.3)', borderRadius:10, padding:'12px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
        ✓ Bevestig Opstelling
      </button>
    </div>
  );
}
