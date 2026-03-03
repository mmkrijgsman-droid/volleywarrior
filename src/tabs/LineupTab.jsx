import { getRoleLabel } from '../helpers/constants';

export default function LineupTab({ players, homeLineup, updateLineup, opponentName, setOpponentName, confirmLineup }) {
  return (
    <div>
      <div style={{ color:'#e5e7eb', fontWeight:700, fontSize:14, marginBottom:10 }}>Opstelling Invoeren</div>
      <div style={{ marginBottom:12 }}>
        <label style={{ color:'#9ca3af', fontSize:12, display:'block', marginBottom:4 }}>Tegenstander</label>
        <input value={opponentName} onChange={e => setOpponentName(e.target.value)} placeholder="Naam tegenstander"
          style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 10px', color:'#fff', fontSize:13, boxSizing:'border-box' }}/>
      </div>
      <div style={{ color:'#f87171', fontWeight:600, fontSize:13, marginBottom:8 }}>Ons Team</div>
      {[1,2,3,4,5,6].map(pos => (
        <div key={pos} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <span style={{ color:'#6b7280', fontSize:12, width:35, flexShrink:0 }}>Pos {pos}</span>
          <select value={homeLineup[pos]||''} onChange={e => updateLineup('home', pos, +e.target.value)}
            style={{ flex:1, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'6px 8px', color:'#fff', fontSize:12 }}>
            <option value="">—</option>
            {players.filter(p=>!p.isLibero).map(p => <option key={p.id} value={p.id}>{p.name} #{p.number} ({getRoleLabel(p.role)})</option>)}
          </select>
        </div>
      ))}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <span style={{ color:'#6b7280', fontSize:12, width:35, flexShrink:0 }}>Libero</span>
        <select value={homeLineup.libero||''} onChange={e => updateLineup('home','libero',+e.target.value)}
          style={{ flex:1, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'6px 8px', color:'#fff', fontSize:12 }}>
          <option value="">—</option>
          {players.filter(p=>p.isLibero).map(p => <option key={p.id} value={p.id}>{p.name} #{p.number}</option>)}
        </select>
      </div>
      <button onClick={confirmLineup}
        style={{ width:'100%', background:'rgba(34,197,94,0.2)', color:'#4ade80', border:'1px solid rgba(34,197,94,0.4)', borderRadius:10, padding:'12px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
        ✓ Bevestig Opstelling
      </button>
    </div>
  );
}
