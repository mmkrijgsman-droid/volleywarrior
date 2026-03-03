export default function StatsTab({ heatmapData, savedHeatmaps, showHeatmapOverlay, setShowHeatmapOverlay, opponentName, pointStats }) {
  return (
    <div>
      <div style={{ color:'#e5e7eb', fontWeight:700, fontSize:14, marginBottom:10 }}>Heatmap</div>
      <div style={{ color:'#9ca3af', fontSize:12, marginBottom:12 }}>Punten: {heatmapData.length} deze set</div>
      {savedHeatmaps.length > 0 ? savedHeatmaps.map((hm, i) => (
        <div key={i} style={{ marginBottom:12 }}>
          <div
            onClick={() => setShowHeatmapOverlay(showHeatmapOverlay===i ? null : i)}
            style={{ background: showHeatmapOverlay===i ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.05)', border:`1px solid ${showHeatmapOverlay===i ? 'rgba(234,179,8,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius:10, padding:'10px 12px', cursor:'pointer' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ color:'#fff', fontWeight:600, fontSize:13 }}>Set {hm.setNumber}</span>
              <span style={{ color: hm.winner==='home' ? '#4ade80' : '#f87171', fontSize:12 }}>
                {hm.winner==='home' ? '✓ Gewonnen' : '✗ Verloren'} ({hm.finalScore})
              </span>
            </div>
          </div>
          {showHeatmapOverlay===i && (
            <div style={{ marginTop:8, borderRadius:10, overflow:'hidden', border:'1px solid rgba(234,179,8,0.3)', background:'rgba(0,0,0,0.3)' }}>
              <div style={{ position:'relative', width:'100%', paddingBottom:'180%' }}>
                <div style={{ position:'absolute', inset:0 }}>
                  {/* Away half */}
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:'50%', background:'rgba(31,41,55,0.9)', borderBottom:'2px solid #fbbf24', overflow:'hidden' }}>
                    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:'rgba(255,255,255,0.1)' }}>{opponentName||'AWAY'}</div>
                    <div style={{ position:'absolute', bottom:'33%', left:0, right:0, borderBottom:'1px dashed rgba(255,255,255,0.2)' }}/>
                    {hm.data.filter(d=>d.team==='home').map((p,pi) => (
                      <div key={pi} style={{ position:'absolute', left:`${p.x}%`, top:`${p.y}%`, transform:'translate(-50%,-50%)', width:10, height:10, borderRadius:'50%', background:'rgba(239,68,68,0.8)', border:'1px solid #ef4444' }}/>
                    ))}
                  </div>
                  {/* Home half */}
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'50%', background:'rgba(31,41,55,0.9)', borderTop:'2px solid #fbbf24', overflow:'hidden' }}>
                    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:'rgba(255,255,255,0.1)' }}>HOME</div>
                    <div style={{ position:'absolute', top:'33%', left:0, right:0, borderBottom:'1px dashed rgba(255,255,255,0.2)' }}/>
                    {hm.data.filter(d=>d.team==='away').map((p,pi) => (
                      <div key={pi} style={{ position:'absolute', left:`${p.x}%`, top:`${p.y}%`, transform:'translate(-50%,-50%)', width:10, height:10, borderRadius:'50%', background:'rgba(59,130,246,0.8)', border:'1px solid #3b82f6' }}/>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ padding:'6px 10px', display:'flex', justifyContent:'space-between', fontSize:10, color:'#9ca3af' }}>
                <span style={{ color:'#f87171' }}>🔴 {hm.data.filter(d=>d.team==='home').length} punten thuis</span>
                <span style={{ color:'#60a5fa' }}>🔵 {hm.data.filter(d=>d.team==='away').length} punten uit</span>
              </div>
            </div>
          )}
        </div>
      )) : (
        <div style={{ color:'#6b7280', fontSize:12, textAlign:'center', padding:16 }}>Nog geen sets gespeeld</div>
      )}
      <div style={{ color:'#e5e7eb', fontWeight:700, fontSize:14, marginBottom:12, marginTop:16 }}>Statistieken</div>
      {['home','away'].map(team => (
        <div key={team} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
          <div style={{ color: team==='home' ? '#f87171' : '#60a5fa', fontWeight:700, fontSize:13, marginBottom:8 }}>
            {team==='home' ? '🔴 Ons Team' : '🔵 Tegenstander'}
          </div>
          {Object.entries(pointStats[team]).map(([key, val]) => (
            <div key={key} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color:'#9ca3af', fontSize:12 }}>{{ direct:'Ace', sideout:'Sideout', block:'Blok', attack:'Aanval', error:'Fout' }[key]}</span>
              <span style={{ color:'#fff', fontWeight:700, fontSize:12 }}>{val}</span>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', paddingTop:6 }}>
            <span style={{ color:'#e5e7eb', fontWeight:600, fontSize:12 }}>Totaal</span>
            <span style={{ color:'#fff', fontWeight:700, fontSize:12 }}>{Object.values(pointStats[team]).reduce((a,b)=>a+b,0)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
