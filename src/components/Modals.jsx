export default function Modals({ state }) {
  const {
    alertMessage, setAlertMessage,
    showServingDialog, setServingTeam, setShowServingDialog,
    showPointTypePopup, setShowPointTypePopup, confirmPointType,
    showServiceFaultPopup, setShowServiceFaultPopup, confirmServiceFault,
    showTimeoutPopup, setShowTimeoutPopup, confirmTimeout, homeTimeouts, awayTimeouts,
    setEnded, matchEnded, showLineupConfirm, setWinner: setWinnerState, sets, startNewSet,
    showSaveDialog, matchWinner, opponentName, setOpponentName, saveMatch, setShowSaveDialog, setShowNewMatchDialog,
    showNewMatchDialog, matchDate, setMatchDate, confirmNewMatch,
    substitutionMode, setSubstitutionMode, setSelectedBenchPlayer,
  } = state;

  return (
    <>
      {/* Timeout confirmation */}
      {showTimeoutPopup && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:150 }}>
          <div style={{ background:'#1a1a1a', border:'1px solid rgba(234,179,8,0.4)', borderRadius:20, padding:'24px 20px', maxWidth:300, width:'90%', textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>⏱️</div>
            <div style={{ fontWeight:800, fontSize:18, marginBottom:6 }}>Timeout</div>
            <div style={{ color:'#9ca3af', fontSize:13, marginBottom:6 }}>
              {showTimeoutPopup==='home' ? '🔴 Ons Team' : '🔵 Tegenstander'}
            </div>
            <div style={{ display:'flex', justifyContent:'center', gap:6, marginBottom:18 }}>
              {[0,1].map(i => {
                const used = showTimeoutPopup==='home' ? homeTimeouts.length : awayTimeouts.length;
                return <div key={i} style={{ width:14, height:14, borderRadius:'50%', background: i < used ? '#dc2626' : i === used ? '#eab308' : 'rgba(255,255,255,0.15)', border: i === used ? '2px solid #eab308' : '2px solid rgba(255,255,255,0.1)', transition:'all 0.3s' }} />;
              })}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={confirmTimeout}
                style={{ flex:1, background:'rgba(234,179,8,0.2)', color:'#eab308', border:'1px solid rgba(234,179,8,0.4)', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer' }}>Ja</button>
              <button onClick={()=>setShowTimeoutPopup(null)}
                style={{ flex:1, background:'rgba(255,255,255,0.05)', color:'#9ca3af', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:12, cursor:'pointer' }}>Nee</button>
            </div>
          </div>
        </div>
      )}

      {/* Alert */}
      {alertMessage && (
        <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'#1a1a1a', border:'1px solid rgba(220,38,38,0.4)', borderRadius:16, padding:'20px 28px', zIndex:200, textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.8)', minWidth:220 }}>
          <div style={{ color:'#fff', fontSize:16, marginBottom:14 }}>{alertMessage}</div>
          <button onClick={()=>setAlertMessage(null)} style={{ background:'rgba(220,38,38,0.2)', color:'#f87171', border:'1px solid rgba(220,38,38,0.3)', borderRadius:8, padding:'8px 20px', cursor:'pointer', fontWeight:600 }}>OK</button>
        </div>
      )}

      {/* Serving dialog */}
      {showServingDialog && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:150 }}>
          <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'28px 24px', maxWidth:320, width:'90%', textAlign:'center' }}>
            <div style={{ fontSize:20, fontWeight:800, marginBottom:20 }}>🏐 Wie serveert eerst?</div>
            <div style={{ display:'flex', gap:12 }}>
              <button onClick={()=>{setServingTeam('home');setShowServingDialog(false);}}
                style={{ flex:1, background:'rgba(220,38,38,0.2)', color:'#f87171', border:'1px solid rgba(220,38,38,0.4)', borderRadius:12, padding:'14px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                🔴 Ons Team
              </button>
              <button onClick={()=>{setServingTeam('away');setShowServingDialog(false);}}
                style={{ flex:1, background:'rgba(37,99,235,0.2)', color:'#60a5fa', border:'1px solid rgba(37,99,235,0.4)', borderRadius:12, padding:'14px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                🔵 Tegenstander
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Point type popup */}
      {showPointTypePopup && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:150 }}>
          <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'24px 20px', maxWidth:300, width:'90%' }}>
            <div style={{ textAlign:'center', fontWeight:800, fontSize:17, marginBottom:4 }}>Punt Type</div>
            <div style={{ textAlign:'center', color:'#9ca3af', fontSize:13, marginBottom:18 }}>
              {showPointTypePopup.team==='home' ? '🔴 Ons Team' : '🔵 Tegenstander'} scoort
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[['direct','⚡ Ace','#2563eb'],['sideout','🔄 Sideout','#16a34a'],['block','🛡️ Blok','#7c3aed'],['attack','⚔️ Aanval','#ea580c'],['error','❌ Fout','#dc2626']].map(([t,l,c]) => (
                <button key={t} onClick={()=>confirmPointType(t)}
                  style={{ background:`${c}22`, color:'#fff', border:`1px solid ${c}55`, borderRadius:10, padding:'12px 8px', fontSize:13, fontWeight:600, cursor:'pointer', gridColumn: t==='error'?'span 2':undefined }}>
                  {l}
                </button>
              ))}
            </div>
            <button onClick={()=>setShowPointTypePopup(null)}
              style={{ width:'100%', marginTop:10, background:'rgba(255,255,255,0.05)', color:'#9ca3af', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:10, fontSize:13, cursor:'pointer' }}>
              Annuleer
            </button>
          </div>
        </div>
      )}

      {/* Service fault popup */}
      {showServiceFaultPopup && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:150 }}>
          <div style={{ background:'#1a1a1a', border:'1px solid rgba(220,38,38,0.3)', borderRadius:20, padding:'24px 20px', maxWidth:300, width:'90%' }}>
            <div style={{ textAlign:'center', fontWeight:800, fontSize:17, marginBottom:4 }}>⚠️ Service Fout</div>
            <div style={{ textAlign:'center', color:'#9ca3af', fontSize:13, marginBottom:20 }}>
              {showServiceFaultPopup.scoringTeam==='home' ? '🔴 Ons Team' : '🔵 Tegenstander'} krijgt het punt
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button onClick={()=>confirmServiceFault('net')}
                style={{ background:'rgba(37,99,235,0.15)', color:'#fff', border:'1px solid rgba(37,99,235,0.35)', borderRadius:12, padding:'14px', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:24 }}>🥅</span>
                <span>Bal in het Net</span>
              </button>
              <button onClick={()=>confirmServiceFault('out')}
                style={{ background:'rgba(234,179,8,0.15)', color:'#fff', border:'1px solid rgba(234,179,8,0.35)', borderRadius:12, padding:'14px', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:24 }}>↗️</span>
                <span>Bal Uit</span>
              </button>
              <button onClick={()=>confirmServiceFault('footfault')}
                style={{ background:'rgba(139,92,246,0.15)', color:'#fff', border:'1px solid rgba(139,92,246,0.35)', borderRadius:12, padding:'14px', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:24 }}>👟</span>
                <span>Voetfout</span>
              </button>
            </div>
            <button onClick={()=>setShowServiceFaultPopup(null)}
              style={{ width:'100%', marginTop:12, background:'rgba(255,255,255,0.05)', color:'#9ca3af', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:10, fontSize:13, cursor:'pointer' }}>
              Annuleer
            </button>
          </div>
        </div>
      )}

      {/* Set ended */}
      {setEnded && !matchEnded && showLineupConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:150 }}>
          <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'28px 24px', maxWidth:320, width:'90%', textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>{setWinnerState==='home' ? '🎉' : '😢'}</div>
            <div style={{ fontWeight:800, fontSize:20, marginBottom:6 }}>{setWinnerState==='home' ? 'Set Gewonnen!' : 'Set Verloren'}</div>
            <div style={{ color:'#9ca3af', marginBottom:20 }}>Stand sets: {sets.home} – {sets.away}</div>
            <div style={{ marginBottom:12, color:'#e5e7eb', fontSize:14 }}>Opstelling behouden?</div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>startNewSet(true)}
                style={{ flex:1, background:'rgba(34,197,94,0.2)', color:'#4ade80', border:'1px solid rgba(34,197,94,0.4)', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer' }}>Ja</button>
              <button onClick={()=>startNewSet(false)}
                style={{ flex:1, background:'rgba(59,130,246,0.2)', color:'#60a5fa', border:'1px solid rgba(59,130,246,0.4)', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer' }}>Nee</button>
            </div>
          </div>
        </div>
      )}

      {/* Match ended + save */}
      {showSaveDialog && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:150 }}>
          <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'28px 24px', maxWidth:340, width:'90%', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>{matchWinner==='home' ? '🏆' : '😢'}</div>
            <div style={{ fontWeight:800, fontSize:20, marginBottom:6 }}>{matchWinner==='home' ? 'Gewonnen!' : 'Verloren'}</div>
            <div style={{ color:'#fff', fontSize:22, fontWeight:700, marginBottom:16 }}>{sets.home} – {sets.away}</div>
            {!opponentName && (
              <input value={opponentName} onChange={e=>setOpponentName(e.target.value)} placeholder="Tegenstander naam..."
                style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, padding:'9px 12px', color:'#fff', fontSize:13, marginBottom:12, boxSizing:'border-box' }}/>
            )}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={saveMatch}
                style={{ flex:1, background:'rgba(34,197,94,0.2)', color:'#4ade80', border:'1px solid rgba(34,197,94,0.4)', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer' }}>💾 Opslaan</button>
              <button onClick={()=>{setShowSaveDialog(false);setShowNewMatchDialog(true);}}
                style={{ flex:1, background:'rgba(255,255,255,0.05)', color:'#9ca3af', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:12, cursor:'pointer' }}>Sla over</button>
            </div>
          </div>
        </div>
      )}

      {/* New match dialog */}
      {showNewMatchDialog && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:150 }}>
          <div style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'24px 20px', maxWidth:320, width:'90%' }}>
            <div style={{ fontWeight:800, fontSize:18, marginBottom:16 }}>Nieuwe Wedstrijd</div>
            <label style={{ color:'#9ca3af', fontSize:12, display:'block', marginBottom:4 }}>Tegenstander</label>
            <input value={opponentName} onChange={e=>setOpponentName(e.target.value)} placeholder="Naam tegenstander"
              style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'9px 12px', color:'#fff', fontSize:13, marginBottom:12, boxSizing:'border-box' }}/>
            <label style={{ color:'#9ca3af', fontSize:12, display:'block', marginBottom:4 }}>Datum</label>
            <input type="date" value={matchDate} onChange={e=>setMatchDate(e.target.value)}
              style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'9px 12px', color:'#fff', fontSize:13, marginBottom:18, boxSizing:'border-box' }}/>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={confirmNewMatch}
                style={{ flex:1, background:'rgba(34,197,94,0.2)', color:'#4ade80', border:'1px solid rgba(34,197,94,0.4)', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer' }}>▶️ Start</button>
              <button onClick={()=>setShowNewMatchDialog(false)}
                style={{ flex:1, background:'rgba(255,255,255,0.05)', color:'#9ca3af', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:12, cursor:'pointer' }}>Annuleer</button>
            </div>
          </div>
        </div>
      )}

      {/* Substitution mode indicator */}
      {substitutionMode && (
        <div style={{ position:'fixed', top:70, left:'50%', transform:'translateX(-50%)', background:'rgba(234,179,8,0.9)', color:'#000', borderRadius:20, padding:'8px 16px', fontSize:13, fontWeight:700, zIndex:60, backdropFilter:'blur(4px)', boxShadow:'0 4px 20px rgba(234,179,8,0.4)' }}>
          Selecteer veldspeler om te wisselen
          <button onClick={()=>{setSubstitutionMode(false);setSelectedBenchPlayer(null);}} style={{ marginLeft:8, background:'none', border:'none', cursor:'pointer', fontSize:14 }}>✕</button>
        </div>
      )}
    </>
  );
}
