export default function MatchesTab({ homeScore, awayScore, sets, opponentName, savedMatches, loadMatch, setShowNewMatchDialog }) {
  return (
    <div>
      <div style={{ color:'#e5e7eb', fontWeight:700, fontSize:14, marginBottom:12 }}>Wedstrijden Beheer</div>
      <button onClick={() => setShowNewMatchDialog(true)}
        style={{ width:'100%', background:'rgba(34,197,94,0.15)', color:'#4ade80', border:'1px solid rgba(34,197,94,0.3)', borderRadius:10, padding:'11px', fontSize:13, fontWeight:600, cursor:'pointer', marginBottom:8 }}>
        ➕ Nieuwe Wedstrijd
      </button>

      <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'10px 12px', marginBottom:12 }}>
        <div style={{ color:'#9ca3af', fontSize:12 }}>Huidige stand:</div>
        <div style={{ color:'#fff', fontWeight:700, fontSize:16 }}>{homeScore} – {awayScore}</div>
        <div style={{ color:'#9ca3af', fontSize:12 }}>Sets: {sets.home} – {sets.away}</div>
        {opponentName && <div style={{ color:'#9ca3af', fontSize:12 }}>vs. {opponentName}</div>}
      </div>
      {savedMatches.length === 0 ? (
        <div style={{ color:'#6b7280', fontSize:12, textAlign:'center', padding:16 }}>Nog geen wedstrijden opgeslagen</div>
      ) : (
        savedMatches.slice().reverse().map(m => (
          <div key={m.id} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'10px 12px', marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
              <span style={{ color:'#fff', fontWeight:600, fontSize:13 }}>{m.opponent}</span>
              <span style={{ color: m.winner==='home' ? '#4ade80' : '#f87171', fontSize:12, fontWeight:700 }}>
                {m.finalScore.home}–{m.finalScore.away}
              </span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ color:'#6b7280', fontSize:11 }}>{new Date(m.date).toLocaleDateString('nl-NL')}</div>
              <button
                onClick={() => loadMatch(m)}
                style={{ background:'rgba(59,130,246,0.2)', color:'#60a5fa', border:'1px solid rgba(59,130,246,0.4)', borderRadius:6, padding:'4px 12px', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                📊 Bekijk
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
