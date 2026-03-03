import { getRoleLabel } from '../helpers/constants';

export default function SubsTab({ substitutions, benchPlayers, players, selectedBenchPlayer, setSubstitutionMode, setSelectedBenchPlayer, setBottomSheetOpen, showAlert }) {
  return (
    <div>
      <div style={{ color:'#e5e7eb', fontWeight:700, fontSize:14, marginBottom:10 }}>Wissels ({substitutions.length}/6)</div>
      <div style={{ color:'#9ca3af', fontSize:12, marginBottom:12 }}>
        Klik een bankspeler aan → dan een veldspeler om te wisselen.
      </div>
      <div style={{ color:'#f87171', fontWeight:600, fontSize:12, marginBottom:8 }}>Bank</div>
      {benchPlayers.length === 0 && (
        <div style={{ color:'#6b7280', fontSize:12, textAlign:'center', padding:16 }}>Alle spelers staan op het veld</div>
      )}
      {benchPlayers.map(p => (
        <div key={p.id}
          onClick={() => { setSubstitutionMode(true); setSelectedBenchPlayer(p.id); setBottomSheetOpen(false); showAlert(`Selecteer veldspeler voor ${p.name}`); }}
          style={{ background: selectedBenchPlayer===p.id ? 'rgba(220,38,38,0.25)' : 'rgba(255,255,255,0.05)', border:`1px solid ${selectedBenchPlayer===p.id ? 'rgba(220,38,38,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius:10, padding:'10px 12px', marginBottom:8, display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, color:'#fff', flexShrink:0 }}>{p.number}</div>
          <div>
            <div style={{ color:'#fff', fontWeight:600, fontSize:13 }}>{p.name}</div>
            <div style={{ color:'#9ca3af', fontSize:11 }}>{getRoleLabel(p.role)}</div>
          </div>
        </div>
      ))}
      {substitutions.length > 0 && (
        <>
          <div style={{ color:'#f87171', fontWeight:600, fontSize:12, marginTop:12, marginBottom:8 }}>Gedane Wissels</div>
          {substitutions.map((s,i) => {
            const pIn = players.find(p=>p.id===s.playerIn);
            const pOut = players.find(p=>p.id===s.playerOut);
            return (
              <div key={i} style={{ color:'#9ca3af', fontSize:12, padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color:'#4ade80' }}>{pIn?.name||'?'} #{pIn?.number}</span>
                <span style={{ margin:'0 6px' }}>↔</span>
                <span style={{ color:'#f87171' }}>{pOut?.name||'?'} #{pOut?.number}</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
