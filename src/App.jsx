import useMatchState from './hooks/useMatchState';
import { TABS } from './helpers/constants';
import BottomSheet from './components/BottomSheet';
import { renderHomeLineup, renderAwayLineup } from './components/Court';
import Modals from './components/Modals';
import { LOGO_SRC } from './assets/logo';

import PlayersTab from './tabs/PlayersTab';
import LineupTab from './tabs/LineupTab';
import SubsTab from './tabs/SubsTab';
import StatsTab from './tabs/StatsTab';
import MatchesTab from './tabs/MatchesTab';

// ─── VOLLEYBALL TRACKER ───────────────────────────────────────────────────────
export default function VolleyballTracker() {
  const state = useMatchState();
  const {
    isMobile, bottomSheetOpen, setBottomSheetOpen, activeTab, setActiveTab,
    players, setPlayers, updatePlayer, addPlayer,
    homeLineup, awayLineup, updateLineup, confirmLineup,
    homeScore, awayScore, sets, servingTeam,
    scoreHistory, showHistoryDropdown, setShowHistoryDropdown,
    heatmapData, savedHeatmaps, showHeatmapOverlay, setShowHeatmapOverlay,
    substitutionMode, setSubstitutionMode,
    selectedBenchPlayer, setSelectedBenchPlayer, makeSubstitution,
    substitutions, benchPlayers,
    opponentName, setOpponentName,
    savedMatches, loadMatch, setShowNewMatchDialog,
    pointStats, scorePoint, serviceFault, takeTimeout, homeTimeouts, awayTimeouts,
    showPointTypePopup, confetti,
    showAlert,
  } = state;

  const typeLabels = { direct:'⚡', sideout:'🔄', block:'🛡️', attack:'⚔️', error:'❌' };

  const courtProps = {
    players, servingTeam, substitutionMode, selectedBenchPlayer,
    makeSubstitution, showPointTypePopup, scorePoint,
  };

  // ── Tab content ──
  const renderTabContent = () => {
    switch (activeTab) {
      case 'players':
        return <PlayersTab players={players} updatePlayer={updatePlayer} addPlayer={addPlayer} setPlayers={setPlayers} />;
      case 'lineup':
        return <LineupTab players={players} homeLineup={homeLineup} updateLineup={updateLineup} opponentName={opponentName} setOpponentName={setOpponentName} confirmLineup={confirmLineup} />;
      case 'subs':
        return <SubsTab substitutions={substitutions} benchPlayers={benchPlayers} players={players} selectedBenchPlayer={selectedBenchPlayer} setSubstitutionMode={setSubstitutionMode} setSelectedBenchPlayer={setSelectedBenchPlayer} setBottomSheetOpen={setBottomSheetOpen} showAlert={showAlert} />;
      case 'stats':
        return <StatsTab heatmapData={heatmapData} savedHeatmaps={savedHeatmaps} showHeatmapOverlay={showHeatmapOverlay} setShowHeatmapOverlay={setShowHeatmapOverlay} opponentName={opponentName} pointStats={pointStats} />;
      case 'matches':
        return <MatchesTab homeScore={homeScore} awayScore={awayScore} sets={sets} opponentName={opponentName} savedMatches={savedMatches} loadMatch={loadMatch} setShowNewMatchDialog={setShowNewMatchDialog} />;
      default: return null;
    }
  };

  // ── Main UI ──
  return (
    <div style={{ minHeight:'100vh', width:'100%', background:'transparent', position:'relative', color:'#fff', overflow:'hidden', display:'flex', flexDirection:'column', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <img src="/background.svg" alt="" style={{ position:'fixed', top:0, left:0, width:'100vw', height:'100vh', objectFit:'cover', objectPosition:'left top', zIndex:0, pointerEvents:'none' }} />

      <div style={{position:'relative', zIndex:1, flex:1, display:'flex', flexDirection:'column'}}>
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-8px)} }
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(220,38,38,0.4); border-radius:4px; }
        select option { background: #1a1a1a; }
      `}</style>

      {/* Confetti */}
      {confetti.map(c => (
        <div key={c.id} style={{ position:'fixed', left:`${c.left}%`, top:'-10px', width:10, height:10, background:'#fbbf24', borderRadius:'50%', pointerEvents:'none', zIndex:100, animation:`bounce 0.6s ${c.delay}s infinite` }} />
      ))}

      {/* ── TOP BAR ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px', background:'rgba(0,0,0,0.75)', borderBottom:'1px solid rgba(220,38,38,0.4)', backdropFilter:'blur(8px)', flexShrink:0, zIndex:30 }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', flexShrink:0 }}>
          <img src={LOGO_SRC} alt="VCV" style={{ width:36, height:36, borderRadius:'50%', border:'2px solid rgba(220,38,38,0.6)' }} />
        </div>

        {/* Score + laatste punten + dropdown */}
        <div style={{ position:'relative', display:'flex', alignItems:'center', gap:6 }}>

          {/* Laatste 3 punten */}
          <div style={{ display:'flex', gap:3 }}>
            {scoreHistory.slice(-3).map((s,i) => (
              <div key={i} style={{ width:36, background: s.team==='home' ? 'rgba(220,38,38,0.25)' : 'rgba(37,99,235,0.25)', border: `1px solid ${s.team==='home' ? 'rgba(220,38,38,0.5)' : 'rgba(37,99,235,0.5)'}`, borderRadius:5, padding:'2px 3px', textAlign:'center' }}>
                <div style={{ color:'#fff', fontSize:11, fontWeight:800, whiteSpace:'nowrap' }}>{s.score}</div>
              </div>
            ))}
          </div>

          {/* Score knop - klik voor dropdown */}
          <div
            onClick={() => setShowHistoryDropdown(v => !v)}
            style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.08)', borderRadius:12, padding:'5px 12px', border:`1px solid rgba(255,255,255,${showHistoryDropdown ? 0.3 : 0.1})`, cursor:'pointer', userSelect:'none' }}
          >
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
              <span style={{ fontSize:22, fontWeight:900, color:'#f87171', lineHeight:1 }}>{homeScore}</span>
              <span style={{ fontSize:9, color:'#6b7280' }}>VCV</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'0 2px' }}>
              <span style={{ color:'#374151', fontSize:14, fontWeight:700 }}>–</span>
              <span style={{ fontSize:9, color:'#6b7280' }}>{sets.home}:{sets.away}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
              <span style={{ fontSize:22, fontWeight:900, color:'#60a5fa', lineHeight:1 }}>{awayScore}</span>
              <span style={{ fontSize:9, color:'#6b7280' }}>{opponentName||'TEG'}</span>
            </div>
            <span style={{ color:'#6b7280', fontSize:10, marginLeft:2 }}>{showHistoryDropdown ? '▲' : '▼'}</span>
          </div>

          {/* Dropdown verloop */}
          {showHistoryDropdown && (
            <div style={{ position:'absolute', top:'110%', right:0, background:'#111', border:'1px solid rgba(220,38,38,0.4)', borderRadius:12, padding:'10px 8px', zIndex:100, minWidth:200, maxHeight:300, overflowY:'auto', boxShadow:'0 8px 32px rgba(0,0,0,0.8)' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ color:'#9ca3af', fontSize:10, fontWeight:700, textAlign:'center', marginBottom:8, letterSpacing:'0.5px' }}>PUNTENVERLOOP</div>
              {scoreHistory.length === 0
                ? <div style={{ color:'#6b7280', fontSize:12, textAlign:'center', padding:12 }}>Nog geen punten</div>
                : [...scoreHistory].reverse().map((s,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 6px', borderRadius:6, background: s.team==='home' ? 'rgba(220,38,38,0.15)' : 'rgba(37,99,235,0.15)', marginBottom:3, border: `1px solid ${s.team==='home' ? 'rgba(220,38,38,0.3)' : 'rgba(37,99,235,0.3)'}` }}>
                    <span style={{ fontSize:14, fontWeight:800, color:'#fff', minWidth:40 }}>{s.score}</span>
                    <span style={{ fontSize:10, color: s.team==='home' ? '#f87171' : '#60a5fa', fontWeight:600 }}>{s.team==='home' ? 'VCV' : opponentName||'TEG'}</span>
                    <span style={{ fontSize:9, color:'#9ca3af', marginLeft:'auto' }}>{typeLabels[s.type]||'•'}</span>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </div>

      {/* ── COURT ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'8px', position:'relative' }}>
          <div style={{ position:'relative', width:'min(calc(100vw - 24px), calc((100vh - 200px) * 0.55))', height:'min(calc((100vw - 24px) / 0.55), calc(100vh - 200px))', maxHeight:'calc(100vh - 140px)' }}>

            {/* Away half */}
            <div
              onClick={e => {
                if (substitutionMode || showPointTypePopup) return;
                const rect = e.currentTarget.getBoundingClientRect();
                scorePoint('home', ((e.clientX-rect.left)/rect.width)*100, ((e.clientY-rect.top)/rect.height)*100);
              }}
              style={{ position:'absolute', top:0, left:0, right:0, height:'50%', background:'linear-gradient(180deg, rgba(31,41,55,0.85) 0%, rgba(55,65,81,0.85) 100%)', borderRadius:'8px 8px 0 0', cursor:'pointer', border:'2px solid rgba(255,255,255,0.15)', borderBottom:'none', overflow:'hidden' }}
            >
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'clamp(1.5rem,8vw,4rem)', fontWeight:900, color:'rgba(255,255,255,0.08)', pointerEvents:'none', userSelect:'none' }}>
                {opponentName||'AWAY'}
              </div>
              <div style={{ position:'absolute', bottom:'33%', left:0, right:0, borderBottom:'2px dashed rgba(255,255,255,0.2)' }}/>
              {renderAwayLineup({ awayLineup, ...courtProps })}

              {/* Heatmap dots */}
              {heatmapData.filter(d=>d.team==='home').map((p,i) => (
                <div key={i} style={{ position:'absolute', left:`${p.x}%`, top:`${p.y}%`, transform:'translate(-50%,-50%)', width:28, height:28, borderRadius:'50%', background:'rgba(239,68,68,0.5)', pointerEvents:'none', zIndex:10 }}/>
              ))}
              {showHeatmapOverlay!==null && savedHeatmaps[showHeatmapOverlay]?.data.filter(d=>d.team==='home').map((p,i) => (
                <div key={`ov-${i}`} style={{ position:'absolute', left:`${p.x}%`, top:`${p.y}%`, transform:'translate(-50%,-50%)', width:32, height:32, borderRadius:'50%', background:'rgba(251,191,36,0.6)', border:'2px solid #fbbf24', pointerEvents:'none', zIndex:11 }}/>
              ))}

              <button onClick={e=>{e.stopPropagation();takeTimeout('away');}} style={{ position:'absolute', top:6, left:6, background: awayTimeouts.length >= 2 ? 'rgba(100,100,100,0.6)' : 'rgba(234,179,8,0.85)', color: awayTimeouts.length >= 2 ? '#999' : '#000', border:'none', borderRadius:6, padding:'4px 8px', fontSize:11, fontWeight:800, cursor: awayTimeouts.length >= 2 ? 'not-allowed' : 'pointer', zIndex:30, boxShadow:'0 2px 8px rgba(0,0,0,0.4)', display:'flex', alignItems:'center', gap:4 }}>
                TO
                <span style={{ display:'flex', gap:2 }}>
                  {[0,1].map(i => <span key={i} style={{ width:7, height:7, borderRadius:'50%', background: i < awayTimeouts.length ? '#dc2626' : 'rgba(0,0,0,0.25)', border:'1px solid rgba(0,0,0,0.3)' }} />)}
                </span>
              </button>
              <button onClick={e=>{e.stopPropagation();serviceFault('away');}} style={{ position:'absolute', top:6, right:6, background: servingTeam==='away' ? 'rgba(220,38,38,0.85)' : 'rgba(100,100,100,0.5)', color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', fontSize:11, fontWeight:800, cursor: servingTeam==='away' ? 'pointer' : 'not-allowed', zIndex:30, boxShadow:'0 2px 8px rgba(0,0,0,0.4)', opacity: servingTeam==='away' ? 1 : 0.5 }}>Sf</button>
            </div>

            {/* Net */}
            <div style={{ position:'absolute', top:'50%', left:0, right:0, height:6, background:'linear-gradient(90deg, #111 0%, #222 50%, #111 100%)', transform:'translateY(-50%)', zIndex:15, borderTop:'2px solid #fbbf24', borderBottom:'2px solid #fbbf24' }}/>

            {/* Home half */}
            <div
              onClick={e => {
                if (substitutionMode || showPointTypePopup) return;
                const rect = e.currentTarget.getBoundingClientRect();
                scorePoint('away', ((e.clientX-rect.left)/rect.width)*100, ((e.clientY-rect.top)/rect.height)*100);
              }}
              style={{ position:'absolute', bottom:0, left:0, right:0, height:'50%', background:'linear-gradient(0deg, rgba(31,41,55,0.85) 0%, rgba(55,65,81,0.85) 100%)', borderRadius:'0 0 8px 8px', cursor:'pointer', border:'2px solid rgba(255,255,255,0.15)', borderTop:'none', overflow:'hidden' }}
            >
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'clamp(1.5rem,8vw,4rem)', fontWeight:900, color:'rgba(255,255,255,0.08)', pointerEvents:'none', userSelect:'none' }}>VCV</div>
              <div style={{ position:'absolute', top:'33%', left:0, right:0, borderBottom:'2px dashed rgba(255,255,255,0.2)' }}/>
              {renderHomeLineup({ homeLineup, ...courtProps })}

              {/* Heatmap dots */}
              {heatmapData.filter(d=>d.team==='away').map((p,i) => (
                <div key={i} style={{ position:'absolute', left:`${p.x}%`, top:`${p.y}%`, transform:'translate(-50%,-50%)', width:28, height:28, borderRadius:'50%', background:'rgba(59,130,246,0.5)', pointerEvents:'none', zIndex:10 }}/>
              ))}
              {showHeatmapOverlay!==null && savedHeatmaps[showHeatmapOverlay]?.data.filter(d=>d.team==='away').map((p,i) => (
                <div key={`ov-${i}`} style={{ position:'absolute', left:`${p.x}%`, top:`${p.y}%`, transform:'translate(-50%,-50%)', width:32, height:32, borderRadius:'50%', background:'rgba(251,191,36,0.6)', border:'2px solid #fbbf24', pointerEvents:'none', zIndex:11 }}/>
              ))}

              <button onClick={e=>{e.stopPropagation();takeTimeout('home');}} style={{ position:'absolute', bottom:6, left:6, background: homeTimeouts.length >= 2 ? 'rgba(100,100,100,0.6)' : 'rgba(234,179,8,0.85)', color: homeTimeouts.length >= 2 ? '#999' : '#000', border:'none', borderRadius:6, padding:'4px 8px', fontSize:11, fontWeight:800, cursor: homeTimeouts.length >= 2 ? 'not-allowed' : 'pointer', zIndex:30, boxShadow:'0 2px 8px rgba(0,0,0,0.4)', display:'flex', alignItems:'center', gap:4 }}>
                TO
                <span style={{ display:'flex', gap:2 }}>
                  {[0,1].map(i => <span key={i} style={{ width:7, height:7, borderRadius:'50%', background: i < homeTimeouts.length ? '#dc2626' : 'rgba(0,0,0,0.25)', border:'1px solid rgba(0,0,0,0.3)' }} />)}
                </span>
              </button>
              <button onClick={e=>{e.stopPropagation();serviceFault('home');}} style={{ position:'absolute', bottom:6, right:6, background: servingTeam==='home' ? 'rgba(220,38,38,0.85)' : 'rgba(100,100,100,0.5)', color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', fontSize:11, fontWeight:800, cursor: servingTeam==='home' ? 'pointer' : 'not-allowed', zIndex:30, boxShadow:'0 2px 8px rgba(0,0,0,0.4)', opacity: servingTeam==='home' ? 1 : 0.5 }}>Sf</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM NAV (mobile) ── */}
      {isMobile && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, display:'flex', background:'rgba(0,0,0,0.92)', borderTop:'1px solid rgba(220,38,38,0.3)', backdropFilter:'blur(8px)', padding:'6px 8px', gap:6, flexShrink:0, zIndex:55 }}>
          {TABS.map(([id, Icon, label]) => (
            <button key={id}
              onClick={() => { setActiveTab(id); setBottomSheetOpen(true); }}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:'transparent', border:'none', color: activeTab===id&&bottomSheetOpen ? '#f87171' : '#6b7280', cursor:'pointer', padding:'4px 2px', borderRadius:8 }}>
              <Icon />
              <span style={{ fontSize:9, fontWeight:600 }}>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── MOBILE BOTTOMSHEET ── */}
      {isMobile && (
        <BottomSheet
          open={bottomSheetOpen}
          onClose={() => setBottomSheetOpen(false)}
          title={TABS.find(t=>t[0]===activeTab)?.[2] || 'Menu'}
          snapPoints={[0.12, 0.52, 0.92]}
        >
          {renderTabContent()}
        </BottomSheet>
      )}

      {/* ── MODALS ── */}
      <Modals state={state} />

      </div>
    </div>
  );
}
