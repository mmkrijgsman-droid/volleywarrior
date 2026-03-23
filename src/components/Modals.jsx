import { shirtColors, getRoleLabel } from '../helpers/constants';
import { generateMatchPDF } from '../helpers/pdfExport';
import DwfImportModal from './DwfImportModal';
import { LOGO_SRC } from '../assets/logo';

// Shared popup styles — white background, red/grey accents
const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:150 };
const card = { background:'#ffffff', border:'1px solid rgba(220,38,38,0.15)', borderRadius:20, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', maxWidth:300, width:'90%' };
const cardPad = { ...card, padding:'24px 20px' };
const cardPadWide = { ...card, maxWidth:320, padding:'28px 24px' };
const title = { textAlign:'center', fontWeight:800, fontSize:17, color:'#1e293b', marginBottom:4 };
const subtitle = { textAlign:'center', color:'#6b7280', fontSize:13, marginBottom:18 };
const btnCancel = { width:'100%', marginTop:10, background:'#f3f4f6', color:'#6b7280', border:'1px solid #e5e7eb', borderRadius:10, padding:10, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontWeight:600 };

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
    servingTeam,
    showPlayerSelectPopup, setShowPlayerSelectPopup, confirmPlayerSelect,
    homeLineup, awayLineup, players, teamName,
    showSettingsModal, setShowSettingsModal,
    trackPlayerStats, setTrackPlayerStats,
    trackOpponentStats, setTrackOpponentStats,
    proMode, setProMode,
    savedHeatmaps, pointStats, playerStats, substitutions, formationSystem,
    scoreHistory, heatmapData,
    showDwfImportModal, setShowDwfImportModal,
    setPlayers,
  } = state;

  return (
    <>
      {/* Timeout confirmation */}
      {showTimeoutPopup && (
        <div style={overlay}>
          <div style={{ ...cardPad, textAlign:'center' }}>
            <div style={{ marginBottom:8, display:'flex', justifyContent:'center' }}><img src="/icons/timeout.svg" alt="" style={{ width:36, height:36 }} /></div>
            <div style={{ fontWeight:800, fontSize:18, color:'#1e293b', marginBottom:6 }}>Timeout</div>
            <div style={{ color:'#6b7280', fontSize:13, marginBottom:6 }}>
              {showTimeoutPopup==='home' ? <><span style={{color:'#dc2626'}}>●</span> {teamName||'Ons Team'}</> : <><span style={{color:'#3b82f6'}}>●</span> {opponentName||'Tegenstander'}</>}
            </div>
            <div style={{ display:'flex', justifyContent:'center', gap:6, marginBottom:18 }}>
              {[0,1].map(i => {
                const used = showTimeoutPopup==='home' ? homeTimeouts.length : awayTimeouts.length;
                return <div key={i} style={{ width:14, height:14, borderRadius:'50%', background: i < used ? '#dc2626' : i === used ? '#eab308' : '#e5e7eb', border: i === used ? '2px solid #eab308' : '2px solid #d1d5db', transition:'all 0.3s' }} />;
              })}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={confirmTimeout}
                style={{ flex:1, background:'rgba(220,38,38,0.1)', color:'#dc2626', border:'1px solid rgba(220,38,38,0.3)', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer' }}>Ja</button>
              <button onClick={()=>setShowTimeoutPopup(null)}
                style={{ flex:1, background:'#f3f4f6', color:'#6b7280', border:'1px solid #e5e7eb', borderRadius:10, padding:12, cursor:'pointer', fontWeight:600 }}>Nee</button>
            </div>
          </div>
        </div>
      )}

      {/* Alert */}
      {alertMessage && (
        <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'#ffffff', border:'1px solid rgba(220,38,38,0.3)', borderRadius:16, padding:'20px 28px', zIndex:200, textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.3)', minWidth:220 }}>
          <div style={{ color:'#1e293b', fontSize:16, marginBottom:14 }}>{alertMessage}</div>
          <button onClick={()=>setAlertMessage(null)} style={{ background:'rgba(220,38,38,0.1)', color:'#dc2626', border:'1px solid rgba(220,38,38,0.25)', borderRadius:8, padding:'8px 20px', cursor:'pointer', fontWeight:600 }}>OK</button>
        </div>
      )}

      {/* Serving dialog */}
      {showServingDialog && (
        <div style={overlay}>
          <div style={{ ...cardPadWide, textAlign:'center' }}>
            <div style={{ fontSize:20, fontWeight:800, color:'#1e293b', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}><img src="/icons/bal.svg" alt="" style={{ width:28, height:28 }} /> Wie serveert eerst?</div>
            <div style={{ display:'flex', gap:12 }}>
              <button onClick={()=>{setServingTeam('home');setShowServingDialog(false);}}
                style={{ flex:1, background:'rgba(220,38,38,0.08)', color:'#dc2626', border:'1px solid rgba(220,38,38,0.3)', borderRadius:12, padding:'14px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                <span style={{color:'#dc2626'}}>●</span> {teamName||'Ons Team'}
              </button>
              <button onClick={()=>{setServingTeam('away');setShowServingDialog(false);}}
                style={{ flex:1, background:'rgba(37,99,235,0.08)', color:'#3b82f6', border:'1px solid rgba(37,99,235,0.3)', borderRadius:12, padding:'14px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                <span style={{color:'#3b82f6'}}>●</span> {opponentName||'Tegenstander'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Point type popup */}
      {showPointTypePopup && (
        <div style={overlay}>
          <div style={cardPad}>
            <div style={title}>Punt Type</div>
            <div style={subtitle}>
              {showPointTypePopup.team==='home' ? <><span style={{color:'#dc2626'}}>●</span> {teamName||'Ons Team'}</> : <><span style={{color:'#3b82f6'}}>●</span> {opponentName||'Tegenstander'}</>} scoort
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[['direct','Ace','#dc2626','ace'],['sideout','Sideout','#6b7280','sideout'],['block','Blok','#6b7280','blok'],['attack','Aanval','#dc2626','aanval'],['error','Fout','#dc2626','fout']].filter(([t]) => {
                const { team, y } = showPointTypePopup;
                if (t === 'direct') return team === servingTeam;
                if (t === 'block') return team === 'home' ? y >= 90 : y <= 10;
                return true;
              }).map(([t,l,c,icon]) => (
                <button key={t} onClick={()=>confirmPointType(t)}
                  style={{ background: c==='#dc2626' ? 'rgba(220,38,38,0.08)' : '#f3f4f6', color:'#1e293b', border:`1px solid ${c==='#dc2626' ? 'rgba(220,38,38,0.25)' : '#e5e7eb'}`, borderRadius:10, padding:'12px 8px', fontSize:13, fontWeight:600, cursor:'pointer', gridColumn: t==='error'?'span 2':undefined, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  <img src={`/icons/${icon}.svg`} alt="" style={{ width:22, height:22 }} />
                  {l}
                </button>
              ))}
            </div>
            <button onClick={()=>setShowPointTypePopup(null)} style={btnCancel}>
              <img src="/icons/annuleer.svg" alt="" style={{ width:18, height:18 }} /> Annuleer
            </button>
          </div>
        </div>
      )}

      {/* Service fault popup */}
      {showServiceFaultPopup && (
        <div style={overlay}>
          <div style={cardPad}>
            <div style={{ ...title, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><img src="/icons/serve.svg" alt="" style={{ width:24, height:24 }} /> Service Fout</div>
            <div style={{ ...subtitle, marginBottom:20 }}>
              {showServiceFaultPopup.scoringTeam==='home' ? <><span style={{color:'#dc2626'}}>●</span> {teamName||'Ons Team'}</> : <><span style={{color:'#3b82f6'}}>●</span> {opponentName||'Tegenstander'}</>} krijgt het punt
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button onClick={()=>confirmServiceFault('net')}
                style={{ background:'#f3f4f6', color:'#1e293b', border:'1px solid #e5e7eb', borderRadius:12, padding:'14px', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}>
                <img src="/icons/bal.svg" alt="" style={{ width:28, height:28 }} />
                <span>Bal in het Net</span>
              </button>
              <button onClick={()=>confirmServiceFault('out')}
                style={{ background:'#f3f4f6', color:'#1e293b', border:'1px solid #e5e7eb', borderRadius:12, padding:'14px', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}>
                <img src="/icons/shot.svg" alt="" style={{ width:28, height:28 }} />
                <span>Bal Uit</span>
              </button>
              <button onClick={()=>confirmServiceFault('footfault')}
                style={{ background:'#f3f4f6', color:'#1e293b', border:'1px solid #e5e7eb', borderRadius:12, padding:'14px', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}>
                <img src="/icons/touch.svg" alt="" style={{ width:28, height:28 }} />
                <span>Voetfout</span>
              </button>
            </div>
            <button onClick={()=>setShowServiceFaultPopup(null)} style={btnCancel}>
              <img src="/icons/annuleer.svg" alt="" style={{ width:18, height:18 }} /> Annuleer
            </button>
          </div>
        </div>
      )}

      {/* Set ended */}
      {setEnded && !matchEnded && showLineupConfirm && (
        <div style={overlay}>
          <div style={{ ...cardPadWide, textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>{setWinnerState==='home' ? '🎉' : '😢'}</div>
            <div style={{ fontWeight:800, fontSize:20, color:'#1e293b', marginBottom:6 }}>{setWinnerState==='home' ? 'Set Gewonnen!' : 'Set Verloren'}</div>
            <div style={{ color:'#6b7280', marginBottom:20 }}>Stand sets: {sets.home} – {sets.away}</div>
            <div style={{ marginBottom:12, color:'#374151', fontSize:14 }}>Opstelling behouden?</div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>startNewSet(true)}
                style={{ flex:1, background:'rgba(220,38,38,0.1)', color:'#dc2626', border:'1px solid rgba(220,38,38,0.3)', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer' }}>Ja</button>
              <button onClick={()=>startNewSet(false)}
                style={{ flex:1, background:'#f3f4f6', color:'#6b7280', border:'1px solid #e5e7eb', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer' }}>Nee</button>
            </div>
          </div>
        </div>
      )}

      {/* Match ended + save */}
      {showSaveDialog && (
        <div style={overlay}>
          <div style={{ ...card, maxWidth:340, padding:'28px 24px', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>{matchWinner==='home' ? '🏆' : '😢'}</div>
            <div style={{ fontWeight:800, fontSize:20, color:'#1e293b', marginBottom:6 }}>{matchWinner==='home' ? 'Gewonnen!' : 'Verloren'}</div>
            <div style={{ color:'#1e293b', fontSize:22, fontWeight:700, marginBottom:16 }}>{sets.home} – {sets.away}</div>
            <input value={opponentName} onChange={e=>setOpponentName(e.target.value)} placeholder="Tegenstander naam..."
              style={{ width:'100%', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:'9px 12px', color:'#1e293b', fontSize:13, marginBottom:12, boxSizing:'border-box' }}/>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={saveMatch}
                style={{ flex:1, background:'rgba(220,38,38,0.1)', color:'#dc2626', border:'1px solid rgba(220,38,38,0.3)', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer' }}>💾 Opslaan</button>
              <button onClick={()=>{setShowSaveDialog(false);setShowNewMatchDialog(true);}}
                style={{ flex:1, background:'#f3f4f6', color:'#6b7280', border:'1px solid #e5e7eb', borderRadius:10, padding:12, cursor:'pointer', fontWeight:600 }}>Sla over</button>
            </div>
            <button onClick={() => generateMatchPDF({ sets, matchWinner, opponentName, teamName, matchDate, savedHeatmaps, pointStats, playerStats, players, substitutions, formationSystem, trackOpponentStats })}
              style={{ width:'100%', marginTop:10, background:'#f3f4f6', color:'#6b7280', border:'1px solid #e5e7eb', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer', fontSize:14 }}>📄 PDF Downloaden</button>
          </div>
        </div>
      )}

      {/* New match dialog */}
      {showNewMatchDialog && (
        <div style={overlay}>
          <div style={{ ...cardPadWide }}>
            <div style={{ fontWeight:800, fontSize:18, color:'#1e293b', marginBottom:16 }}>Nieuwe Wedstrijd</div>
            <label style={{ color:'#6b7280', fontSize:12, display:'block', marginBottom:4 }}>Tegenstander</label>
            <input value={opponentName} onChange={e=>setOpponentName(e.target.value)} placeholder="Naam tegenstander"
              style={{ width:'100%', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:'9px 12px', color:'#1e293b', fontSize:13, marginBottom:12, boxSizing:'border-box' }}/>
            <label style={{ color:'#6b7280', fontSize:12, display:'block', marginBottom:4 }}>Datum</label>
            <input type="date" value={matchDate} onChange={e=>setMatchDate(e.target.value)}
              style={{ width:'100%', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:'9px 12px', color:'#1e293b', fontSize:13, marginBottom:18, boxSizing:'border-box' }}/>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={confirmNewMatch}
                style={{ flex:1, background:'rgba(220,38,38,0.1)', color:'#dc2626', border:'1px solid rgba(220,38,38,0.3)', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer' }}>▶️ Start</button>
              <button onClick={()=>setShowNewMatchDialog(false)}
                style={{ flex:1, ...btnCancel, width:'auto', marginTop:0 }}>
                <img src="/icons/annuleer.svg" alt="" style={{ width:16, height:16 }} /> Annuleer</button>
            </div>
          </div>
        </div>
      )}

      {/* Substitution mode indicator */}
      {substitutionMode && (
        <div style={{ position:'fixed', top:70, left:'50%', transform:'translateX(-50%)', background:'#ffffff', color:'#1e293b', borderRadius:20, padding:'8px 16px', fontSize:13, fontWeight:700, zIndex:60, boxShadow:'0 4px 20px rgba(0,0,0,0.15)', border:'1px solid rgba(220,38,38,0.2)', display:'flex', alignItems:'center', gap:4 }}>
          Selecteer veldspeler om te wisselen
          <button onClick={()=>{setSubstitutionMode(false);setSelectedBenchPlayer(null);}} style={{ marginLeft:4, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center' }}><img src="/icons/annuleer.svg" alt="" style={{ width:16, height:16 }} /></button>
        </div>
      )}

      {/* Settings modal */}
      {showSettingsModal && (
        <div style={overlay}>
          <div style={{ ...card, maxWidth:340, padding:'28px 24px' }}>
            <div style={{ textAlign:'center', fontWeight:800, fontSize:18, color:'#1e293b', marginBottom:24 }}>Instellingen</div>

            {/* Pro Mode toggle */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ color:'#374151', fontSize:14, fontWeight:600 }}>Pro Modus</span>
              <button onClick={() => setProMode(v => !v)}
                style={{ width:48, height:26, borderRadius:13, background: proMode ? '#dc2626' : '#d1d5db', border:'none', cursor:'pointer', position:'relative', transition:'background 0.2s' }}>
                <div style={{ width:20, height:20, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left: proMode ? 25 : 3, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
            <div style={{ color:'#9ca3af', fontSize:12, marginBottom:16 }}>Receptie, rotatie-analyse, efficiëntie, service zones, momentum</div>

            {/* Divider */}
            <div style={{ borderTop:'1px solid #e5e7eb', marginBottom:16 }} />

            {/* Master toggle */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ color:'#374151', fontSize:14, fontWeight:600 }}>Spelerstats bijhouden</span>
              <button onClick={() => setTrackPlayerStats(v => !v)}
                style={{ width:48, height:26, borderRadius:13, background: trackPlayerStats ? '#dc2626' : '#d1d5db', border:'none', cursor:'pointer', position:'relative', transition:'background 0.2s' }}>
                <div style={{ width:20, height:20, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left: trackPlayerStats ? 25 : 3, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
            <div style={{ color:'#9ca3af', fontSize:12, marginBottom:16 }}>Toon speler-selectie popup bij elk punt</div>

            {/* Sub toggle */}
            {trackPlayerStats && (
              <>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6, paddingLeft:16 }}>
                  <span style={{ color:'#374151', fontSize:14, fontWeight:600 }}>Tegenstander stats</span>
                  <button onClick={() => setTrackOpponentStats(v => !v)}
                    style={{ width:48, height:26, borderRadius:13, background: trackOpponentStats ? '#dc2626' : '#d1d5db', border:'none', cursor:'pointer', position:'relative', transition:'background 0.2s' }}>
                    <div style={{ width:20, height:20, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left: trackOpponentStats ? 25 : 3, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
                  </button>
                </div>
                <div style={{ color:'#9ca3af', fontSize:12, marginBottom:16, paddingLeft:16 }}>Speler-selectie ook voor tegenstander punten</div>
              </>
            )}

            <button onClick={() => setShowSettingsModal(false)}
              style={{ width:'100%', marginTop:8, background:'rgba(220,38,38,0.1)', color:'#dc2626', border:'1px solid rgba(220,38,38,0.25)', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer', fontSize:14 }}>
              Sluiten
            </button>
          </div>
        </div>
      )}

      {/* Role mismatch warning popup */}
      {state.showRoleMismatchPopup && (
        <div style={overlay}>
          <div style={{ ...card, maxWidth:320, padding:'24px 20px' }}>
            <div style={title}>Positie Waarschuwing</div>
            <div style={{ ...subtitle, marginBottom:14 }}>
              De volgende spelers staan niet op hun verwachte positie:
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:18 }}>
              {state.showRoleMismatchPopup.mismatches.map((m, i) => (
                <div key={i} style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 12px', fontSize:12 }}>
                  <span style={{ fontWeight:700, color:'#1e293b' }}>{m.player.name}</span>
                  <span style={{ color:'#6b7280' }}> ({getRoleLabel(m.actualRole)}) op pos {m.pos} </span>
                  <span style={{ color:'#dc2626' }}>— verwacht: {getRoleLabel(m.expectedRole)}</span>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={state.finalizeLineup}
                style={{ flex:1, background:'rgba(220,38,38,0.1)', color:'#dc2626', border:'1px solid rgba(220,38,38,0.3)', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer' }}>
                Ja, doorgaan
              </button>
              <button onClick={() => state.setShowRoleMismatchPopup(null)}
                style={{ flex:1, background:'#f3f4f6', color:'#6b7280', border:'1px solid #e5e7eb', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer' }}>
                Aanpassen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About modal */}
      {state.showAboutModal && (
        <div style={overlay}>
          <div style={{ ...card, maxWidth:320, padding:'24px 20px', textAlign:'center' }}>
            <img src={LOGO_SRC} alt="VolleyWarrior" style={{ width:64, height:64, borderRadius:14, margin:'0 auto 12px', display:'block', boxShadow:'0 4px 16px rgba(0,0,0,0.1)' }} />
            <div style={{ fontWeight:800, fontSize:20, color:'#1e293b', marginBottom:2 }}>VolleyWarrior</div>
            <div style={{ color:'#6b7280', fontSize:12, marginBottom:16 }}>Versie 10</div>

            <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:10, padding:'12px 14px', marginBottom:12, textAlign:'left' }}>
              <div style={{ color:'#374151', fontSize:12, fontWeight:700, marginBottom:6 }}>Databronnen</div>
              <div style={{ color:'#6b7280', fontSize:11, lineHeight:1.6 }}>
                Wedstrijd- en spelersgegevens worden opgehaald via de openbare Nevobo API en het Digitaal Wedstrijd Formulier (DWF). Alle data wordt lokaal op je apparaat opgeslagen.
              </div>
            </div>

            <div style={{ background:'rgba(234,179,8,0.08)', border:'1px solid rgba(234,179,8,0.25)', borderRadius:10, padding:'12px 14px', marginBottom:16, textAlign:'left' }}>
              <div style={{ color:'#92400e', fontSize:12, fontWeight:700, marginBottom:6 }}>Disclaimer</div>
              <div style={{ color:'#a16207', fontSize:11, lineHeight:1.6 }}>
                VolleyWarrior is niet gelieerd aan, goedgekeurd door, of verbonden met de Nevobo. Alle handelsmerken en gegevens zijn eigendom van hun respectievelijke eigenaren.
              </div>
            </div>

            <button onClick={() => state.setShowAboutModal(false)}
              style={{ width:'100%', background:'rgba(220,38,38,0.1)', color:'#dc2626', border:'1px solid rgba(220,38,38,0.25)', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer', fontSize:14 }}>
              Sluiten
            </button>
          </div>
        </div>
      )}

      {/* DWF Import Modal */}
      {showDwfImportModal && (
        <DwfImportModal
          onClose={() => setShowDwfImportModal(false)}
          mode={showDwfImportModal}
          players={players}
          setPlayers={setPlayers}
          setTeamName={state.setTeamName}
          setOpponentName={setOpponentName}
          setOpponentPlayers={state.setOpponentPlayers}
          setAwayLineup={state.setAwayLineup}
        />
      )}

      {/* Player select popup */}
      {showPlayerSelectPopup && (() => {
        const { scoringTeam, type } = showPlayerSelectPopup;
        const isHome = scoringTeam === 'home';
        const ico = (n,s=18) => <img src={`/icons/${n}.svg`} alt="" style={{ width:s, height:s, verticalAlign:'middle', marginRight:4 }} />;
        const typeLabels = { direct:<>{ico('ace')}Ace</>, sideout:<>{ico('sideout')}Sideout</>, block:<>{ico('blok')}Blok</>, attack:<>{ico('aanval')}Aanval</>, error:<>{ico('fout')}Fout</> };

        // Select player on court instead of popup (both teams)
        return null;

        // Legacy role-button popup (unused)
        if (!isHome) {
          const roles = [
            { id:'opp_setter',   role:'setter',   label:'Spelverdeler', short:'SPE', color:'#dc2626' },
            { id:'opp_outside',  role:'outside',   label:'Passerloper',  short:'PL',  color:'#6b7280' },
            { id:'opp_middle',   role:'middle',   label:'Midden',       short:'MID', color:'#6b7280' },
            { id:'opp_opposite', role:'opposite', label:'Diagonaal',    short:'DIA', color:'#6b7280' },
            { id:'opp_libero',   role:'libero',   label:'Libero',       short:'L',   color:'#6b7280' },
          ];
          return (
            <div style={overlay}>
              <div style={cardPad}>
                <div style={title}>Welke positie?</div>
                <div style={subtitle}>
                  {typeLabels[type] || type} — <span style={{color:'#3b82f6'}}>●</span> {opponentName||'Tegenstander'}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {roles.map(r => (
                    <button key={r.id} onClick={() => confirmPlayerSelect(r.id)}
                      style={{ background:'#f3f4f6', border:'1px solid #e5e7eb', borderRadius:12, padding:'12px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{ background:`${r.color}18`, color:r.color, borderRadius:6, padding:'2px 8px', fontSize:13, fontWeight:800, minWidth:36, textAlign:'center' }}>{r.short}</span>
                      <span style={{ color:'#374151', fontSize:14, fontWeight:600 }}>{r.label}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowPlayerSelectPopup(null)} style={btnCancel}>
                  <img src="/icons/annuleer.svg" alt="" style={{ width:16, height:16 }} /> Annuleer
                </button>
              </div>
            </div>
          );
        }

        // Home: show player shirts (existing behavior)
        const lineup = homeLineup;
        const fieldPlayers = [1,2,3,4,5,6].map(pos => {
          let id = lineup[pos];
          if (homeLineup.libero) {
            const pd = players.find(p => p.id === id);
            if (pd?.role === 'middle' && (pos === 5 || pos === 6)) {
              id = homeLineup.libero;
            }
          }
          const player = players.find(p => p.id === id);
          return { pos, id, player };
        });
        return (
          <div style={overlay}>
            <div style={cardPad}>
              <div style={title}>Welke speler?</div>
              <div style={subtitle}>
                {typeLabels[type] || type} — <span style={{color:'#dc2626'}}>●</span> {teamName||'Ons Team'}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                {fieldPlayers.map(({ pos, id, player }) => {
                  const color = player?.isLibero ? shirtColors.libero : (state.homeColor || shirtColors.home);
                  return (
                    <button key={pos} onClick={() => confirmPlayerSelect(id)}
                      style={{ background:'#f3f4f6', border:'1px solid #e5e7eb', borderRadius:12, padding:'10px 4px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                      <svg viewBox="0 0 24 24" style={{ width:40, height:40, filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
                        <path d="M8 3l4 2 4-2 5 3-3 5v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V11L3 6l5-3z" fill={color} stroke="rgba(0,0,0,0.15)" strokeWidth="0.5"/>
                        <text x="12" y="13" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">
                          {player?.number || id}
                        </text>
                        <text x="12" y="19" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="4">
                          {player ? getRoleLabel(player.role) : '?'}
                        </text>
                      </svg>
                      <span style={{ color:'#374151', fontSize:11, fontWeight:600, maxWidth:70, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {player?.name || `#${id}`}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setShowPlayerSelectPopup(null)} style={btnCancel}>
                <img src="/icons/annuleer.svg" alt="" style={{ width:16, height:16 }} /> Annuleer
              </button>
            </div>
          </div>
        );
      })()}
    </>
  );
}
