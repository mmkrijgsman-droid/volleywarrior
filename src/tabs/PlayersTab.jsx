import { getRoleLabel } from '../helpers/constants';

export default function PlayersTab({ players, updatePlayer, addPlayer, setPlayers }) {
  return (
    <div>
      <div style={{ color:'#e5e7eb', fontWeight:700, fontSize:14, marginBottom:10 }}>Spelers Beheer</div>
      {players.map(p => (
        <div key={p.id} style={{ background:'rgba(255,255,255,0.05)', borderRadius:10, padding:'10px 12px', marginBottom:8, border:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display:'flex', gap:8, marginBottom:6 }}>
            <input value={p.name} onChange={e => updatePlayer(p.id, 'name', e.target.value)}
              style={{ flex:1, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:7, padding:'5px 8px', color:'#fff', fontSize:13 }}/>
            <input type="number" value={p.number} onChange={e => updatePlayer(p.id, 'number', +e.target.value)}
              style={{ width:52, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:7, padding:'5px 6px', color:'#fff', fontSize:13, textAlign:'center' }}/>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <select value={p.role||'outside'} onChange={e => updatePlayer(p.id,'role',e.target.value)} disabled={p.isLibero}
              style={{ flex:1, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:7, padding:'4px 6px', color:'#fff', fontSize:12 }}>
              <option value="setter">Spelverdeler (SPE)</option>
              <option value="outside">Passer/Loper (PL)</option>
              <option value="middle">Midden (MID)</option>
              <option value="opposite">Diagonaal (DIA)</option>
              <option value="libero">Libero (L)</option>
            </select>
            <label style={{ display:'flex', alignItems:'center', gap:4, color:'#9ca3af', fontSize:12, cursor:'pointer', whiteSpace:'nowrap' }}>
              <input type="checkbox" checked={!!p.isLibero} onChange={e => updatePlayer(p.id,'isLibero',e.target.checked)} /> L
            </label>
            <button onClick={() => setPlayers(ps => ps.filter(pp => pp.id !== p.id))}
              style={{ background:'rgba(220,38,38,0.3)', color:'#f87171', border:'1px solid rgba(220,38,38,0.4)', borderRadius:7, padding:'4px 10px', fontSize:12, cursor:'pointer' }}>
              ✕
            </button>
          </div>
        </div>
      ))}
      <button onClick={addPlayer}
        style={{ width:'100%', background:'rgba(34,197,94,0.15)', color:'#4ade80', border:'1px solid rgba(34,197,94,0.3)', borderRadius:10, padding:'10px', fontSize:13, fontWeight:600, cursor:'pointer', marginTop:4 }}>
        + Speler Toevoegen
      </button>
    </div>
  );
}
