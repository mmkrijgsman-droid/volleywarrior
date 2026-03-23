import { useState, useEffect } from 'react';
import useMatchState from './hooks/useMatchState';
import { TABS } from './helpers/constants';
import BottomSheet from './components/BottomSheet';
import { renderHomeLineup, renderAwayLineup } from './components/Court';
import Modals from './components/Modals';
import ProPanel from './components/ProPanel';
import LiveDashboard from './components/LiveDashboard';
import PinchZoomCourt from './components/PinchZoomCourt';
import { LOGO_SRC } from './assets/logo';

import PlayersTab from './tabs/PlayersTab';
import LineupTab from './tabs/LineupTab';
import SubsTab from './tabs/SubsTab';
import StatsTab from './tabs/StatsTab';
import MatchesTab from './tabs/MatchesTab';

// ─── VOLLEYBALL TRACKER ───────────────────────────────────────────────────────
export default function VolleyballTracker() {
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashFading(true), 1600);
    const hideTimer = setTimeout(() => setSplashVisible(false), 2200);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);
  const state = useMatchState();
  const {
    isMobile, isTablet, isPortrait, bottomSheetOpen, setBottomSheetOpen, activeTab, setActiveTab,
    players, setPlayers, updatePlayer, addPlayer,
    homeLineup, awayLineup, updateLineup, confirmLineup,
    homeScore, awayScore, sets, servingTeam,
    scoreHistory, showHistoryDropdown, setShowHistoryDropdown,
    heatmapData, savedHeatmaps, showHeatmapOverlay, setShowHeatmapOverlay,
    substitutionMode, setSubstitutionMode,
    selectedBenchPlayer, setSelectedBenchPlayer, makeSubstitution,
    substitutions, benchPlayers, formationSystem, switchFormation,
    teamName, setTeamName, opponentName, setOpponentName,
    savedMatches, loadMatch, setShowNewMatchDialog,
    pointStats, scorePoint, serviceFault, takeTimeout, homeTimeouts, awayTimeouts,
    showPointTypePopup, confetti,
    showAlert, undoLastPoint,
    showAttackLines, setShowAttackLines,
    homeColor, setHomeColor, awayColor, setAwayColor,
  } = state;

  const isTabletLandscape = isTablet && !isPortrait;
  const isTabletPortrait = isTablet && isPortrait;

  const ico = (name, s=16) => <img src={`/icons/${name}.svg`} alt="" style={{ width:s, height:s }} />;
  const typeLabels = { direct:ico('ace'), sideout:ico('sideout'), block:ico('blok'), attack:ico('aanval'), error:ico('fout'), servicefault:ico('serve') };

  const courtProps = {
    players, servingTeam, substitutionMode, selectedBenchPlayer,
    makeSubstitution, showPointTypePopup, scorePoint,
    showPlayerSelectPopup: state.showPlayerSelectPopup, confirmPlayerSelect: state.confirmPlayerSelect,
    homeColor, awayColor,
    opponentPlayers: state.opponentPlayers,
  };

  // ── Tab content ──
  const renderTabContent = () => {
    switch (activeTab) {
      case 'players':
        return <PlayersTab players={players} updatePlayer={updatePlayer} addPlayer={addPlayer} setPlayers={setPlayers} homeColor={homeColor} setHomeColor={setHomeColor} awayColor={awayColor} setAwayColor={setAwayColor} setShowDwfImportModal={state.setShowDwfImportModal} />;
      case 'lineup':
        return <LineupTab players={players} homeLineup={homeLineup} awayLineup={awayLineup} updateLineup={updateLineup} teamName={teamName} setTeamName={setTeamName} opponentName={opponentName} setOpponentName={setOpponentName} confirmLineup={confirmLineup} formationSystem={formationSystem} switchFormation={switchFormation} opponentPlayers={state.opponentPlayers} setShowDwfImportModal={state.setShowDwfImportModal} />;
      case 'subs':
        return <SubsTab substitutions={substitutions} benchPlayers={benchPlayers} players={players} selectedBenchPlayer={selectedBenchPlayer} setSubstitutionMode={setSubstitutionMode} setSelectedBenchPlayer={setSelectedBenchPlayer} setBottomSheetOpen={setBottomSheetOpen} showAlert={showAlert} />;
      case 'stats':
        return <StatsTab heatmapData={heatmapData} savedHeatmaps={savedHeatmaps} showHeatmapOverlay={showHeatmapOverlay} setShowHeatmapOverlay={setShowHeatmapOverlay} opponentName={opponentName} teamName={teamName} pointStats={pointStats} playerStats={state.playerStats} players={players} setShowSettingsModal={state.setShowSettingsModal} trackOpponentStats={state.trackOpponentStats} proMode={state.proMode} scoreHistory={scoreHistory} />;
      case 'matches':
        return <MatchesTab homeScore={homeScore} awayScore={awayScore} sets={sets} opponentName={opponentName} savedMatches={savedMatches} loadMatch={loadMatch} setShowNewMatchDialog={setShowNewMatchDialog} teamName={teamName} players={players} forceEndMatch={state.forceEndMatch} matchEnded={state.matchEnded} deleteMatch={state.deleteMatch} />;
      default: return null;
    }
  };

  // ── Main UI ──
  return (
    <div style={{ minHeight:'100vh', width:'100%', background:'transparent', position:'relative', color:'#fff', overflow:'hidden', display:'flex', flexDirection:'column', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <img src="/background.svg" alt="" style={{ position:'fixed', top:0, left:0, width:'100vw', height:'100vh', objectFit:'cover', objectPosition:'left top', zIndex:0, pointerEvents:'none' }} />

      <div style={{position:'relative', zIndex:1, flex:1, display:'flex', flexDirection:'column'}}>
      <style>{`
        @keyframes playerPulse { 0%,100%{transform:translate(-50%,-50%) scale(1.05)} 50%{transform:translate(-50%,-50%) scale(1.35)} }
        @keyframes bannerPulse { 0%,100%{opacity:1;transform:translateX(-50%) scale(1)} 50%{opacity:0.85;transform:translateX(-50%) scale(1.05)} }
        @keyframes shirtAppear { 0%{opacity:0;transform:translate(-50%,-50%) scale(0.3)} 100%{opacity:1;transform:translate(-50%,-50%) scale(1)} }
        @keyframes bounce { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-8px)} }
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(220,38,38,0.4); border-radius:4px; }
        select option { background: #1a1a1a; }
      `}</style>

      {/* Info button — next to VolleyWarrior logo in red header */}
      <button onClick={e => { e.stopPropagation(); state.setShowAboutModal(true); }}
        style={{ position:'fixed', top:0, left:170, zIndex:100, background:'none', border:'none', padding:4, cursor:'pointer', color:'#fff', fontSize:14, fontWeight:700, lineHeight:1, opacity:0.85 }}>
        i
      </button>


      {/* Confetti */}
      {confetti.map(c => (
        <div key={c.id} style={{ position:'fixed', left:`${c.left}%`, top:'-10px', width:10, height:10, background:'#fbbf24', borderRadius:'50%', pointerEvents:'none', zIndex:100, animation:`bounce 0.6s ${c.delay}s infinite` }} />
      ))}

      {/* ── SCORE BAR ── */}
      <div style={{ flexShrink:0, zIndex:60, position:'relative' }}>
        {/* Score — bovenste rij */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', padding:'6px 10px 2px', gap:8 }}>
          {/* Pro Mode toggle */}
          <button
            onClick={() => state.setProMode(v => !v)}
            style={{ background: state.proMode ? '#dc2626' : 'rgba(255,255,255,0.85)', border: `1.5px solid ${state.proMode ? '#dc2626' : 'rgba(255,255,255,0.9)'}`, borderRadius:8, padding:'4px 10px', cursor:'pointer', color: state.proMode ? '#fff' : '#dc2626', fontSize:10, fontWeight:800, letterSpacing:0.5, transition:'all 0.2s', flexShrink:0, boxShadow:'0 1px 4px rgba(0,0,0,0.15)' }}
          >
            PRO
          </button>
          <div style={{ position:'relative' }}>
            <div
              onClick={() => setShowHistoryDropdown(v => !v)}
              style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.08)', borderRadius:12, padding:'5px 12px', border:`1px solid rgba(255,255,255,${showHistoryDropdown ? 0.3 : 0.1})`, cursor:'pointer', userSelect:'none' }}
            >
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <span style={{ fontSize:22, fontWeight:900, color:'#f87171', lineHeight:1 }}>{homeScore}</span>
                <span style={{ fontSize:9, color:'#6b7280' }}>{teamName||'THUIS'}</span>
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
              <div style={{ position:'absolute', top:'110%', right:0, background:'rgba(255,255,255,0.6)', backdropFilter:'blur(24px) saturate(180%)', WebkitBackdropFilter:'blur(24px) saturate(180%)', border:'1px solid rgba(0,0,0,0.08)', borderRadius:12, padding:'10px 8px', zIndex:100, minWidth:200, maxHeight:300, overflowY:'auto', boxShadow:'0 8px 32px rgba(0,0,0,0.12)' }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ color:'#6b7280', fontSize:10, fontWeight:700, textAlign:'center', marginBottom:8, letterSpacing:'0.5px' }}>PUNTENVERLOOP</div>
                {scoreHistory.length === 0
                  ? <div style={{ color:'#6b7280', fontSize:12, textAlign:'center', padding:12 }}>Nog geen punten</div>
                  : [...scoreHistory].reverse().map((s,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 6px', borderRadius:6, background: s.team==='home' ? 'rgba(220,38,38,0.06)' : 'rgba(37,99,235,0.06)', marginBottom:3, border: `1px solid ${s.team==='home' ? 'rgba(220,38,38,0.15)' : 'rgba(37,99,235,0.15)'}` }}>
                      <span style={{ fontSize:14, fontWeight:800, color:'#1e293b', minWidth:40 }}>{s.score}</span>
                      <span style={{ fontSize:10, color: s.team==='home' ? '#dc2626' : '#2563eb', fontWeight:600 }}>{s.team==='home' ? (teamName||'THUIS') : (opponentName||'TEG')}</span>
                      <span style={{ fontSize:12, marginLeft:'auto' }}>{typeLabels[s.type]||'•'}</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div style={{ flex:1, display:'flex', flexDirection: isTabletLandscape ? 'row' : 'column', overflow:'hidden', position:'relative' }}>

        {/* ── COURT ── */}
        <div style={{ flex: isTabletLandscape ? '0 0 60%' : (isTabletPortrait ? '0 0 auto' : 1), display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
          {/* Vorige punten + undo — zwevend over speelveld (niet in landscape tablet) */}
          {!isTabletLandscape && scoreHistory.length > 0 && (
            <div style={{ position:'absolute', top:8, right:8, zIndex:55, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
              <div style={{ display:'flex', flexDirection:'row', gap:3 }}>
                {scoreHistory.slice(-3).map((s,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:4, background: s.team==='home' ? 'rgba(220,38,38,0.15)' : 'rgba(37,99,235,0.15)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', border: `1px solid ${s.team==='home' ? 'rgba(220,38,38,0.3)' : 'rgba(37,99,235,0.3)'}`, borderRadius:6, padding:'2px 7px' }}>
                    <span style={{ color: s.team==='home' ? '#f87171' : '#60a5fa', fontSize:11, fontWeight:800 }}>{s.score}</span>
                    <span style={{ fontSize:11 }}>{typeLabels[s.type]}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={undoLastPoint}
                style={{ background:'rgba(220,38,38,0.15)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:6, padding:'2px 8px', cursor:'pointer', color:'#dc2626', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', gap:3 }}
              >↩ Undo</button>
            </div>
          )}
          <PinchZoomCourt>
            <div style={{ position:'relative', width: isTabletLandscape ? 'min(calc(60vw - 16px), calc((100vh - 200px) * 0.55))' : 'min(calc(100vw - 8px), calc((100vh - 200px) * 0.55))', height: isTabletLandscape ? 'min(calc((60vw - 16px) / 0.55), calc(100vh - 200px))' : isTabletPortrait ? 'min(calc((100vw - 8px) / 0.55), calc(60vh - 100px))' : 'min(calc((100vw - 8px) / 0.55), calc(100vh - 200px))', maxHeight: isTabletPortrait ? 'calc(60vh - 60px)' : 'calc(100vh - 140px)' }}>

              {/* Attack lines toggle */}
              {heatmapData.some(d => d.playerPos != null && d.type !== 'direct' && d.type !== 'servicefault') && (
                <button
                  onClick={() => setShowAttackLines(v => !v)}
                  style={{ position:'absolute', top:-22, left:0, zIndex:50, background: showAttackLines ? 'rgba(220,38,38,0.85)' : 'rgba(220,38,38,0.35)', border: `1px solid ${showAttackLines ? 'rgba(220,38,38,0.9)' : 'rgba(220,38,38,0.5)'}`, borderRadius:6, padding:'3px 8px', cursor:'pointer', color:'#fff', fontSize:10, fontWeight:700 }}
                >
                  {showAttackLines ? '✦ Lijnen aan' : '✧ Lijnen'}
                </button>
              )}

              {/* Player select banner */}
              {state.showPlayerSelectPopup && (
                <div style={{ position:'absolute', top:-22, left:'50%', transform:'translateX(-50%)', zIndex:55, background:'rgba(220,38,38,0.9)', borderRadius:6, padding:'3px 14px', color:'#fff', fontSize:11, fontWeight:700, whiteSpace:'nowrap', boxShadow:'0 2px 12px rgba(220,38,38,0.5)', animation:'bannerPulse 1.2s ease-in-out infinite' }}>
                  👆 Tik op speler
                </div>
              )}

              {/* Away half */}
              <div
                onClick={e => {
                  if (substitutionMode || showPointTypePopup) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  scorePoint('home', ((e.clientX-rect.left)/rect.width)*100, ((e.clientY-rect.top)/rect.height)*100);
                }}
                style={{ position:'absolute', top:0, left:0, right:0, height:'50%', background:'transparent', borderRadius:'8px 8px 0 0', cursor:'pointer', border:'2px solid rgba(0,0,0,0.25)', borderBottom:'none', overflow:'hidden' }}
              >
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'clamp(1.5rem,8vw,4rem)', fontWeight:900, color:'rgba(0,0,0,0.12)', pointerEvents:'none', userSelect:'none' }}>
                  {opponentName||'AWAY'}
                </div>
                <div style={{ position:'absolute', bottom:'33%', left:0, right:0, borderBottom:'2px dashed rgba(0,0,0,0.35)' }}/>
                {!splashVisible && renderAwayLineup({ awayLineup, ...courtProps })}

                {/* Heatmap dots */}
                {heatmapData.filter(d=>d.team==='home').map((p,i) => (
                  <div key={i} style={{ position:'absolute', left:`${p.x}%`, top:`${p.y}%`, transform:'translate(-50%,-50%)', width:28, height:28, borderRadius:'50%', background:'rgba(239,68,68,0.5)', pointerEvents:'none', zIndex:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
                    {typeLabels[p.type]||'•'}
                  </div>
                ))}
                {showHeatmapOverlay!==null && savedHeatmaps[showHeatmapOverlay]?.data.filter(d=>d.team==='home').map((p,i) => (
                  <div key={`ov-${i}`} style={{ position:'absolute', left:`${p.x}%`, top:`${p.y}%`, transform:'translate(-50%,-50%)', width:32, height:32, borderRadius:'50%', background:'rgba(251,191,36,0.6)', border:'2px solid #fbbf24', pointerEvents:'none', zIndex:11, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
                    {typeLabels[p.type]||'•'}
                  </div>
                ))}

                <button onClick={e=>{e.stopPropagation();takeTimeout('away');}} style={{ position:'absolute', top:6, left:6, background: awayTimeouts.length >= 2 ? 'rgba(100,100,100,0.5)' : 'rgba(220,38,38,0.85)', color:'#fff', border:'none', borderRadius:8, padding:'4px 8px', fontSize:11, fontWeight:800, cursor: awayTimeouts.length >= 2 ? 'not-allowed' : 'pointer', zIndex:30, boxShadow:'0 2px 8px rgba(0,0,0,0.4)', display:'flex', alignItems:'center', gap:4 }}>
                  <img src="/icons/timeout.svg" alt="TO" style={{ width:18, height:18, opacity: awayTimeouts.length >= 2 ? 0.4 : 1 }} />
                  TO
                  <span style={{ display:'flex', gap:3 }}>
                    {[0,1].map(i => <span key={i} style={{ width:8, height:8, borderRadius:'50%', background: i < awayTimeouts.length ? '#fff' : 'rgba(255,255,255,0.3)', border:'1px solid rgba(255,255,255,0.5)', transition:'all 0.3s' }} />)}
                  </span>
                </button>
                <button onClick={e=>{e.stopPropagation();serviceFault('away');}} style={{ position:'absolute', top:6, right:6, background: servingTeam==='away' ? 'rgba(220,38,38,0.85)' : 'rgba(100,100,100,0.5)', color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', fontSize:11, fontWeight:800, cursor: servingTeam==='away' ? 'pointer' : 'not-allowed', zIndex:30, boxShadow:'0 2px 8px rgba(0,0,0,0.4)', opacity: servingTeam==='away' ? 1 : 0.5 }}>Sf</button>
              </div>

              {/* Net */}
              <div style={{ position:'absolute', top:'50%', left:0, right:0, height:4, background:'rgba(0,0,0,0.8)', transform:'translateY(-50%)', zIndex:15, boxShadow:'0 1px 4px rgba(0,0,0,0.15)' }}/>

              {/* Home half */}
              <div
                onClick={e => {
                  if (substitutionMode || showPointTypePopup) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  scorePoint('away', ((e.clientX-rect.left)/rect.width)*100, ((e.clientY-rect.top)/rect.height)*100);
                }}
                style={{ position:'absolute', bottom:0, left:0, right:0, height:'50%', background:'transparent', borderRadius:'0 0 8px 8px', cursor:'pointer', border:'2px solid rgba(0,0,0,0.25)', borderTop:'none', overflow:'hidden' }}
              >
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'clamp(1.5rem,8vw,4rem)', fontWeight:900, color:'rgba(0,0,0,0.12)', pointerEvents:'none', userSelect:'none' }}>{teamName||'THUIS'}</div>
                <div style={{ position:'absolute', top:'33%', left:0, right:0, borderBottom:'2px dashed rgba(0,0,0,0.35)' }}/>
                {!splashVisible && renderHomeLineup({ homeLineup, ...courtProps })}

                {/* Heatmap dots */}
                {heatmapData.filter(d=>d.team==='away').map((p,i) => (
                  <div key={i} style={{ position:'absolute', left:`${p.x}%`, top:`${p.y}%`, transform:'translate(-50%,-50%)', width:28, height:28, borderRadius:'50%', background:'rgba(59,130,246,0.5)', pointerEvents:'none', zIndex:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
                    {typeLabels[p.type]||'•'}
                  </div>
                ))}
                {showHeatmapOverlay!==null && savedHeatmaps[showHeatmapOverlay]?.data.filter(d=>d.team==='away').map((p,i) => (
                  <div key={`ov-${i}`} style={{ position:'absolute', left:`${p.x}%`, top:`${p.y}%`, transform:'translate(-50%,-50%)', width:32, height:32, borderRadius:'50%', background:'rgba(251,191,36,0.6)', border:'2px solid #fbbf24', pointerEvents:'none', zIndex:11, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
                    {typeLabels[p.type]||'•'}
                  </div>
                ))}

                <button onClick={e=>{e.stopPropagation();takeTimeout('home');}} style={{ position:'absolute', bottom:6, left:6, background: homeTimeouts.length >= 2 ? 'rgba(100,100,100,0.5)' : 'rgba(220,38,38,0.85)', color:'#fff', border:'none', borderRadius:8, padding:'4px 8px', fontSize:11, fontWeight:800, cursor: homeTimeouts.length >= 2 ? 'not-allowed' : 'pointer', zIndex:30, boxShadow:'0 2px 8px rgba(0,0,0,0.4)', display:'flex', alignItems:'center', gap:4 }}>
                  <img src="/icons/timeout.svg" alt="TO" style={{ width:18, height:18, opacity: homeTimeouts.length >= 2 ? 0.4 : 1 }} />
                  TO
                  <span style={{ display:'flex', gap:3 }}>
                    {[0,1].map(i => <span key={i} style={{ width:8, height:8, borderRadius:'50%', background: i < homeTimeouts.length ? '#fff' : 'rgba(255,255,255,0.3)', border:'1px solid rgba(255,255,255,0.5)', transition:'all 0.3s' }} />)}
                  </span>
                </button>
                <button onClick={e=>{e.stopPropagation();serviceFault('home');}} style={{ position:'absolute', bottom:6, right:6, background: servingTeam==='home' ? 'rgba(220,38,38,0.85)' : 'rgba(100,100,100,0.5)', color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', fontSize:11, fontWeight:800, cursor: servingTeam==='home' ? 'pointer' : 'not-allowed', zIndex:30, boxShadow:'0 2px 8px rgba(0,0,0,0.4)', opacity: servingTeam==='home' ? 1 : 0.5 }}>Sf</button>
              </div>

              {/* Attack lines SVG overlay */}
              {showAttackLines && (() => {
                const SRV = { 1:{x:75,y:88}, 2:{x:72,y:15}, 3:{x:48,y:14}, 4:{x:26,y:16}, 5:{x:25,y:72}, 6:{x:52,y:70} };
                const RCV = { 1:{x:72,y:58}, 2:{x:70,y:18}, 3:{x:50,y:14}, 4:{x:25,y:20}, 5:{x:24,y:66}, 6:{x:48,y:64} };
                const bothTeams = state.trackOpponentStats;
                const pts = heatmapData.filter(d => d.playerPos != null && d.type !== 'servicefault' && d.type !== 'direct');
                if (pts.length === 0) return null;
                return (
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:12, borderRadius:8 }}>
                    {!bothTeams && <defs><marker id="ah" markerWidth="4" markerHeight="3" refX="3.5" refY="1.5" orient="auto"><path d="M0,0 L4,1.5 L0,3" fill="#ef4444" opacity="0.7"/></marker></defs>}
                    {pts.map((pt, i) => {
                      const pTeam = pt.type === 'block' ? (pt.team === 'home' ? 'away' : 'home') : pt.team;
                      const pos = (pTeam === pt.srvTeam ? SRV : RCV)[pt.playerPos];
                      if (!pos) return null;
                      const sx = pTeam === 'home' ? pos.x : 100 - pos.x;
                      const sy = pTeam === 'home' ? 50 + pos.y * 0.5 : (100 - pos.y) * 0.5;
                      const ex = pt.x;
                      const ey = pt.team === 'home' ? pt.y * 0.5 : 50 + pt.y * 0.5;
                      const clr = bothTeams ? (pTeam === 'home' ? '#ef4444' : '#3b82f6') : '#ef4444';
                      return (
                        <g key={i}>
                          <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={clr} strokeWidth="0.4" opacity="0.55" markerEnd={!bothTeams ? 'url(#ah)' : undefined} />
                          <circle cx={ex} cy={ey} r="0.8" fill={clr} opacity="0.8" />
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>
          </PinchZoomCourt>
        </div>

        {/* ── TABLET PORTRAIT LIVE DASHBOARD ── */}
        {isTabletPortrait && (
          <div style={{ flex:1, overflowY:'auto', background:'rgba(255,255,255,0.85)', backdropFilter:'blur(20px) saturate(180%)', WebkitBackdropFilter:'blur(20px) saturate(180%)', borderTop:'1px solid rgba(0,0,0,0.08)' }}>
            <LiveDashboard
              homeScore={homeScore} awayScore={awayScore} sets={sets} servingTeam={servingTeam}
              teamName={teamName} opponentName={opponentName}
              pointStats={pointStats} homeTimeouts={homeTimeouts} awayTimeouts={awayTimeouts}
              substitutions={substitutions} scoreHistory={scoreHistory} undoLastPoint={undoLastPoint}
              homeColor={homeColor} awayColor={awayColor}
              playerStats={state.playerStats} players={players}
              proMode={state.proMode} currentRotation={state.getRotation()}
            />
          </div>
        )}

        {/* ── TABLET LANDSCAPE SIDEBAR ── */}
        {isTabletLandscape && (
          <div style={{ flex:'0 0 40%', display:'flex', flexDirection:'column', height:'100%', background:'rgba(255,255,255,0.85)', backdropFilter:'blur(20px) saturate(180%)', WebkitBackdropFilter:'blur(20px) saturate(180%)', borderLeft:'1px solid rgba(0,0,0,0.08)', overflow:'hidden' }}>
            <LiveDashboard
              homeScore={homeScore} awayScore={awayScore} sets={sets} servingTeam={servingTeam}
              teamName={teamName} opponentName={opponentName}
              pointStats={pointStats} homeTimeouts={homeTimeouts} awayTimeouts={awayTimeouts}
              substitutions={substitutions} scoreHistory={scoreHistory} undoLastPoint={undoLastPoint}
              homeColor={homeColor} awayColor={awayColor}
              playerStats={state.playerStats} players={players}
              proMode={state.proMode} currentRotation={state.getRotation()}
            />
          </div>
        )}

      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, display:'flex', background: bottomSheetOpen ? 'rgba(255,255,255,0.9)' : 'transparent', borderTop: bottomSheetOpen ? '1px solid rgba(0,0,0,0.06)' : 'none', backdropFilter: bottomSheetOpen ? 'blur(12px)' : 'none', transition:'background 0.3s, border-top 0.3s', padding:'6px 8px', gap:6, flexShrink:0, zIndex:55 }}>
        {TABS.map(([id, Icon, label]) => (
          <button key={id}
            onClick={() => { if (activeTab === id && bottomSheetOpen) { setBottomSheetOpen(false); } else { setActiveTab(id); setBottomSheetOpen(true); } }}
            style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:'transparent', border:'none', color: activeTab===id&&bottomSheetOpen ? '#dc2626' : bottomSheetOpen ? '#6b7280' : '#1e293b', cursor:'pointer', padding:'4px 2px', borderRadius:8, transition:'color 0.3s' }}>
            <Icon />
            <span style={{ fontSize:9, fontWeight:600 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* ── BOTTOMSHEET ── */}
      <BottomSheet
          open={bottomSheetOpen}
          onClose={() => setBottomSheetOpen(false)}
          title={TABS.find(t=>t[0]===activeTab)?.[2] || 'Menu'}
          snapPoints={[0.12, 0.52, 0.92]}
          onSwipeLeft={() => { const ids = TABS.map(t=>t[0]); const i = ids.indexOf(activeTab); if (i < ids.length - 1) setActiveTab(ids[i+1]); }}
          onSwipeRight={() => { const ids = TABS.map(t=>t[0]); const i = ids.indexOf(activeTab); if (i > 0) setActiveTab(ids[i-1]); }}
        >
          {renderTabContent()}
        </BottomSheet>

      {/* ── MODALS ── */}
      <Modals state={state} />
      <ProPanel state={state} />

      {/* ── SPLASH OVERLAY ── */}
      {splashVisible && (
        <div style={{
          position:'fixed', inset:0, zIndex:9999,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          transition:'opacity 0.6s ease-out',
          opacity: splashFading ? 0 : 1,
          pointerEvents: splashFading ? 'none' : 'auto',
        }}>
          <div style={{ position:'absolute', inset:0, background:'#ffffff' }} />
          <img src={LOGO_SRC} alt="VolleyWarrior" style={{ position:'relative', width:120, height:120, borderRadius:24, boxShadow:'0 8px 40px rgba(0,0,0,0.1)', marginBottom:16 }} />
          <span style={{ position:'relative', color:'#1e293b', fontSize:22, fontWeight:800, letterSpacing:1 }}>VolleyWarrior</span>
        </div>
      )}

      </div>
    </div>
  );
}
