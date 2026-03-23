import { getRoleLabel } from '../helpers/constants';
import { isDwfAvailable } from '../helpers/dwfImport';

export default function PlayersTab({ players, updatePlayer, addPlayer, setPlayers, homeColor, setHomeColor, awayColor, setAwayColor, setShowDwfImportModal }) {
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ color:'#1e293b', fontWeight:700, fontSize:14 }}>Spelers Beheer</div>
        <div style={{ display:'flex', gap:6 }}>
          {isDwfAvailable() && setShowDwfImportModal && (
            <button onClick={() => setShowDwfImportModal('own')}
              style={{ background:'rgba(220,38,38,0.1)', color:'#dc2626', border:'1px solid rgba(220,38,38,0.3)', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              DWF
            </button>
          )}
          <button onClick={addPlayer}
            style={{ background:'rgba(34,197,94,0.1)', color:'#16a34a', border:'1px solid rgba(34,197,94,0.3)', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            + Toevoegen
          </button>
        </div>
      </div>
      <div style={{ display:'flex', gap:12, marginBottom:12, background:'rgba(0,0,0,0.03)', borderRadius:10, padding:'10px 12px', border:'1px solid rgba(0,0,0,0.06)' }}>
        <label style={{ display:'flex', alignItems:'center', gap:8, flex:1, cursor:'pointer' }}>
          <input type="color" value={homeColor} onChange={e => setHomeColor(e.target.value)}
            style={{ width:32, height:32, border:'none', borderRadius:8, cursor:'pointer', padding:0 }} />
          <span style={{ color:'#1e293b', fontSize:12, fontWeight:600 }}>Thuis</span>
        </label>
        <label style={{ display:'flex', alignItems:'center', gap:8, flex:1, cursor:'pointer' }}>
          <input type="color" value={awayColor} onChange={e => setAwayColor(e.target.value)}
            style={{ width:32, height:32, border:'none', borderRadius:8, cursor:'pointer', padding:0 }} />
          <span style={{ color:'#1e293b', fontSize:12, fontWeight:600 }}>Tegenstander</span>
        </label>
      </div>
      {players.map(p => (
        <div key={p.id} style={{ background:'rgba(0,0,0,0.03)', borderRadius:10, padding:'10px 12px', marginBottom:8, border:'1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ display:'flex', gap:8, marginBottom:6 }}>
            <input value={p.name} onChange={e => updatePlayer(p.id, 'name', e.target.value)}
              style={{ flex:1, background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:7, padding:'5px 8px', color:'#1e293b', fontSize:13 }}/>
            <input type="number" value={p.number ?? ''} onChange={e => updatePlayer(p.id, 'number', e.target.value === '' ? '' : +e.target.value)}
              style={{ width:52, background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:7, padding:'5px 6px', color:'#1e293b', fontSize:13, textAlign:'center' }}/>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <select value={p.role||'outside'} onChange={e => updatePlayer(p.id,'role',e.target.value)} disabled={p.isLibero}
              style={{ flex:1, background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:7, padding:'4px 6px', color:'#1e293b', fontSize:12 }}>
              <option value="setter">Spelverdeler (SPE)</option>
              <option value="outside">Passer/Loper (PL)</option>
              <option value="middle">Midden (MID)</option>
              <option value="opposite">Diagonaal (DIA)</option>
              <option value="libero">Libero (L)</option>
            </select>
            <label style={{ display:'flex', alignItems:'center', gap:4, color:'#6b7280', fontSize:12, cursor:'pointer', whiteSpace:'nowrap' }}>
              <input type="checkbox" checked={!!p.isLibero} onChange={e => updatePlayer(p.id,'isLibero',e.target.checked)} /> L
            </label>
            <button onClick={() => setPlayers(ps => ps.filter(pp => pp.id !== p.id))}
              style={{ background:'rgba(220,38,38,0.1)', color:'#dc2626', border:'1px solid rgba(220,38,38,0.3)', borderRadius:7, padding:'4px 10px', fontSize:12, cursor:'pointer' }}>
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
