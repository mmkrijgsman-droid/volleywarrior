import { useState, useMemo } from 'react';
import { SettingsIcon } from '../components/Icons';
import { SERVE_ZONES, RECEPTION_LABELS } from '../helpers/constants';
import { analyzeRotations, analyzeReception, analyzeAttackEfficiency, analyzeServeZones, findScoringRuns } from '../helpers/proAnalysis';

// Simplified court positions for attack line overlay (home-half coords: y=0 net, y=100 baseline)
const SERVE_POS = { 1:{x:75,y:88}, 2:{x:72,y:15}, 3:{x:48,y:14}, 4:{x:26,y:16}, 5:{x:25,y:72}, 6:{x:52,y:70} };
const RECV_POS = { 1:{x:72,y:58}, 2:{x:70,y:18}, 3:{x:50,y:14}, 4:{x:25,y:20}, 5:{x:24,y:66}, 6:{x:48,y:64} };

function getPlayerTeam(pt) {
  return pt.type === 'block' ? (pt.team === 'home' ? 'away' : 'home') : pt.team;
}
function getPlayerSvg(playerPos, playerTeam, srvTeam) {
  const pos = (playerTeam === srvTeam ? SERVE_POS : RECV_POS)[playerPos];
  if (!pos) return null;
  return playerTeam === 'home' ? { x: pos.x, y: 50 + pos.y * 0.5 } : { x: 100 - pos.x, y: (100 - pos.y) * 0.5 };
}
function getLandingSvg(team, x, y) {
  return team === 'home' ? { x, y: y * 0.5 } : { x, y: 50 + y * 0.5 };
}

export default function StatsTab({ heatmapData, savedHeatmaps, showHeatmapOverlay, setShowHeatmapOverlay, opponentName, teamName, pointStats, playerStats, players, setShowSettingsModal, trackOpponentStats, proMode, scoreHistory }) {
  const [attackLineSet, setAttackLineSet] = useState(null);
  const [attackLinePlayer, setAttackLinePlayer] = useState(null);

  // Pro mode: combine all heatmap data for analysis
  const allProData = useMemo(() => {
    if (!proMode) return [];
    return [...savedHeatmaps.flatMap(hm => hm.data || []), ...heatmapData];
  }, [proMode, savedHeatmaps, heatmapData]);

  const allScoreHistory = useMemo(() => {
    if (!proMode) return [];
    return [...savedHeatmaps.flatMap(hm => hm.scoreHistory || []), ...(scoreHistory || [])];
  }, [proMode, savedHeatmaps, scoreHistory]);

  return (
    <div>
      {/* === Heatmap === */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ color:'#1e293b', fontWeight:700, fontSize:14 }}>Heatmap</div>
        <button onClick={() => setShowSettingsModal(true)} style={{ background:'rgba(0,0,0,0.04)', border:'1px solid rgba(0,0,0,0.08)', borderRadius:8, padding:'4px 8px', cursor:'pointer', color:'#6b7280', display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600 }}>
          <SettingsIcon size={14} />
          <span>Tracking</span>
        </button>
      </div>
      <div style={{ color:'#6b7280', fontSize:12, marginBottom:12 }}>Punten: {heatmapData.length} deze set</div>
      {savedHeatmaps.length > 0 ? savedHeatmaps.map((hm, i) => (
        <div key={i} style={{ marginBottom:12 }}>
          <div
            onClick={() => setShowHeatmapOverlay(showHeatmapOverlay===i ? null : i)}
            style={{ background: showHeatmapOverlay===i ? 'rgba(234,179,8,0.1)' : 'rgba(0,0,0,0.02)', border:`1px solid ${showHeatmapOverlay===i ? 'rgba(234,179,8,0.4)' : 'rgba(0,0,0,0.06)'}`, borderRadius:10, padding:'10px 12px', cursor:'pointer' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ color:'#1e293b', fontWeight:600, fontSize:13 }}>Set {hm.setNumber}</span>
              <span style={{ color: hm.winner==='home' ? '#16a34a' : '#dc2626', fontSize:12 }}>
                {hm.winner==='home' ? '✓ Gewonnen' : '✗ Verloren'} ({hm.finalScore})
              </span>
            </div>
          </div>
          {showHeatmapOverlay===i && (
            <div style={{ marginTop:8, borderRadius:10, overflow:'hidden', border:'1px solid rgba(234,179,8,0.3)', background:'rgba(0,0,0,0.03)' }}>
              <div style={{ position:'relative', width:'100%', paddingBottom:'180%' }}>
                <div style={{ position:'absolute', inset:0 }}>
                  {/* Away half */}
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:'50%', background:'rgba(31,41,55,0.9)', borderBottom:'2px solid #1e293b', overflow:'hidden' }}>
                    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:'rgba(255,255,255,0.1)' }}>{opponentName||'AWAY'}</div>
                    <div style={{ position:'absolute', bottom:'33%', left:0, right:0, borderBottom:'1px dashed rgba(255,255,255,0.2)' }}/>
                    {hm.data.filter(d=>d.team==='home').map((p,pi) => (
                      <div key={pi} style={{ position:'absolute', left:`${p.x}%`, top:`${p.y}%`, transform:'translate(-50%,-50%)', width:10, height:10, borderRadius:'50%', background:'rgba(239,68,68,0.8)', border:'1px solid #ef4444' }}/>
                    ))}
                  </div>
                  {/* Home half */}
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'50%', background:'rgba(31,41,55,0.9)', borderTop:'2px solid #1e293b', overflow:'hidden' }}>
                    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:'rgba(255,255,255,0.1)' }}>HOME</div>
                    <div style={{ position:'absolute', top:'33%', left:0, right:0, borderBottom:'1px dashed rgba(255,255,255,0.2)' }}/>
                    {hm.data.filter(d=>d.team==='away').map((p,pi) => (
                      <div key={pi} style={{ position:'absolute', left:`${p.x}%`, top:`${p.y}%`, transform:'translate(-50%,-50%)', width:10, height:10, borderRadius:'50%', background:'rgba(59,130,246,0.8)', border:'1px solid #3b82f6' }}/>
                    ))}
                  </div>
                  {/* Attack lines SVG overlay */}
                  {attackLineSet === i && (() => {
                    const bothTeams = trackOpponentStats;
                    const pts = hm.data.filter(d => d.playerPos != null && d.type !== 'servicefault' && d.type !== 'direct' && (!attackLinePlayer || d.playerId === attackLinePlayer));
                    if (pts.length === 0) return null;
                    return (
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:10 }}>
                        {!bothTeams && <defs><marker id={`ah-${i}`} markerWidth="4" markerHeight="3" refX="3.5" refY="1.5" orient="auto"><path d="M0,0 L4,1.5 L0,3" fill="#ef4444" opacity="0.7"/></marker></defs>}
                        {pts.map((pt, pi) => {
                          const pTeam = getPlayerTeam(pt);
                          const start = getPlayerSvg(pt.playerPos, pTeam, pt.srvTeam);
                          const end = getLandingSvg(pt.team, pt.x, pt.y);
                          if (!start || !end) return null;
                          const clr = bothTeams ? (pTeam === 'home' ? '#ef4444' : '#3b82f6') : '#ef4444';
                          return (
                            <g key={pi}>
                              <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={clr} strokeWidth="0.5" opacity="0.6" markerEnd={!bothTeams ? `url(#ah-${i})` : undefined} />
                              <circle cx={end.x} cy={end.y} r="1" fill={clr} opacity="0.8" />
                            </g>
                          );
                        })}
                      </svg>
                    );
                  })()}
                </div>
              </div>
              <div style={{ padding:'6px 10px', display:'flex', justifyContent:'space-between', fontSize:10, color:'#6b7280' }}>
                <span style={{ color:'#dc2626' }}>🔴 {hm.data.filter(d=>d.team==='home').length} punten thuis</span>
                <span style={{ color:'#2563eb' }}>🔵 {hm.data.filter(d=>d.team==='away').length} punten uit</span>
              </div>
              {/* Attack lines toggle */}
              {hm.data.some(d => d.playerPos != null) && (
                <div style={{ padding:'6px 10px' }}>
                  <button
                    onClick={() => { if (attackLineSet === i) { setAttackLineSet(null); setAttackLinePlayer(null); } else { setAttackLineSet(i); setAttackLinePlayer(null); } }}
                    style={{ background: attackLineSet === i ? 'rgba(234,179,8,0.1)' : 'rgba(0,0,0,0.03)', border: `1px solid ${attackLineSet === i ? 'rgba(234,179,8,0.4)' : 'rgba(0,0,0,0.08)'}`, borderRadius:8, padding:'5px 10px', cursor:'pointer', color: attackLineSet === i ? '#a16207' : '#6b7280', fontSize:11, fontWeight:600 }}
                  >
                    {attackLineSet === i ? '✦ Aanvalslijnen aan' : '✧ Aanvalslijnen'}
                  </button>
                </div>
              )}
              {/* Set stats */}
              {hm.stats && (
                <div style={{ padding:'6px 10px', display:'flex', gap:8 }}>
                  {['home','away'].map(team => {
                    const s = hm.stats[team];
                    if (!s) return null;
                    const total = Object.values(s).reduce((a,b) => a+b, 0);
                    if (total === 0) return null;
                    const labels = { direct:'Ace', sideout:'Sideout', block:'Blok', attack:'Aanval', error:'Fout' };
                    return (
                      <div key={team} style={{ flex:1, background:'rgba(0,0,0,0.02)', borderRadius:8, padding:'6px 8px', border:`1px solid ${team==='home' ? 'rgba(220,38,38,0.15)' : 'rgba(59,130,246,0.15)'}` }}>
                        <div style={{ color: team==='home' ? '#dc2626' : '#2563eb', fontSize:10, fontWeight:700, marginBottom:4 }}>
                          {team==='home' ? (teamName||'Thuis') : (opponentName||'Uit')}
                        </div>
                        {Object.entries(s).filter(([,v]) => v > 0).map(([k,v]) => (
                          <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#374151', padding:'1px 0' }}>
                            <span>{labels[k]||k}</span><span style={{ fontWeight:700 }}>{v}</span>
                          </div>
                        ))}
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#1e293b', fontWeight:700, borderTop:'1px solid rgba(0,0,0,0.06)', marginTop:2, paddingTop:2 }}>
                          <span>Totaal</span><span>{total}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {attackLineSet === i && (() => {
                const seen = new Set();
                const chipPlayers = hm.data
                  .filter(d => d.playerPos != null && d.playerId != null && d.type !== 'servicefault')
                  .filter(d => { if (seen.has(d.playerId)) return false; seen.add(d.playerId); return true; })
                  .map(d => {
                    const pTeam = getPlayerTeam(d);
                    const isHome = pTeam === 'home';
                    const player = isHome ? players.find(p => p.id === d.playerId) : null;
                    const label = player ? `#${player.number}` : (typeof d.playerId === 'string' ? d.playerId.replace('opp_','').substring(0,3).toUpperCase() : `#${d.playerId}`);
                    return { id: d.playerId, label, isHome };
                  });
                if (chipPlayers.length === 0) return null;
                return (
                  <div style={{ padding:'4px 10px 8px', display:'flex', flexWrap:'wrap', gap:4 }}>
                    {chipPlayers.map(cp => (
                      <button key={cp.id}
                        onClick={() => setAttackLinePlayer(attackLinePlayer === cp.id ? null : cp.id)}
                        style={{
                          background: attackLinePlayer === cp.id ? (cp.isHome ? 'rgba(220,38,38,0.15)' : 'rgba(59,130,246,0.15)') : 'rgba(0,0,0,0.03)',
                          border: `1px solid ${attackLinePlayer === cp.id ? (cp.isHome ? '#dc2626' : '#2563eb') : 'rgba(0,0,0,0.08)'}`,
                          borderRadius:6, padding:'3px 8px', cursor:'pointer',
                          color: cp.isHome ? '#dc2626' : '#2563eb', fontSize:10, fontWeight:700
                        }}
                      >
                        {cp.label}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )) : (
        <div style={{ color:'#6b7280', fontSize:12, textAlign:'center', padding:16 }}>Nog geen sets gespeeld</div>
      )}

      {/* === Statistieken === */}
      <div style={{ color:'#1e293b', fontWeight:700, fontSize:14, marginBottom:12, marginTop:16 }}>Statistieken</div>
      {['home','away'].map(team => (
        <div key={team} style={{ background:'rgba(0,0,0,0.02)', border:'1px solid rgba(0,0,0,0.06)', borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
          <div style={{ color: team==='home' ? '#dc2626' : '#2563eb', fontWeight:700, fontSize:13, marginBottom:8 }}>
            {team==='home' ? `🔴 ${teamName||'Ons Team'}` : `🔵 ${opponentName||'Tegenstander'}`}
          </div>
          {Object.entries(pointStats[team]).map(([key, val]) => (
            <div key={key} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
              <span style={{ color:'#6b7280', fontSize:12 }}>{{ direct:'Ace', sideout:'Sideout', block:'Blok', attack:'Aanval', error:'Fout' }[key]}</span>
              <span style={{ color:'#1e293b', fontWeight:700, fontSize:12 }}>{val}</span>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', paddingTop:6 }}>
            <span style={{ color:'#374151', fontWeight:600, fontSize:12 }}>Totaal</span>
            <span style={{ color:'#1e293b', fontWeight:700, fontSize:12 }}>{Object.values(pointStats[team]).reduce((a,b)=>a+b,0)}</span>
          </div>
        </div>
      ))}

      {/* === Puntverdeling (donut charts) === */}
      {(() => {
        const homeTotal = Object.values(pointStats.home).reduce((a,b) => a+b, 0);
        const awayTotal = Object.values(pointStats.away).reduce((a,b) => a+b, 0);
        if (homeTotal === 0 && awayTotal === 0) return null;
        const typeColors = { direct:'#2563eb', sideout:'#16a34a', block:'#7c3aed', attack:'#ea580c', error:'#dc2626' };
        const typeLabels = { direct:'Ace', sideout:'Sideout', block:'Blok', attack:'Aanval', error:'Fout' };
        const R = 40, C = 2 * Math.PI * R;
        const renderDonut = (data, total, label, accent) => {
          if (total === 0) return <div style={{ flex:1 }} />;
          let cum = 0;
          const segs = Object.entries(data).filter(([,v]) => v > 0);
          return (
            <div style={{ textAlign:'center', flex:1 }}>
              <svg width="110" height="110" viewBox="0 0 100 100">
                {segs.map(([key, value]) => {
                  const pct = value / total;
                  const da = `${pct * C} ${(1 - pct) * C}`;
                  const off = -cum * C;
                  cum += pct;
                  return <circle key={key} cx="50" cy="50" r={R} fill="none" stroke={typeColors[key]} strokeWidth={12} strokeDasharray={da} strokeDashoffset={off} transform="rotate(-90 50 50)" />;
                })}
                <text x="50" y="50" textAnchor="middle" dominantBaseline="central" style={{ fill:'#1e293b', fontSize:16, fontWeight:800 }}>{total}</text>
              </svg>
              <div style={{ color:accent, fontWeight:700, fontSize:12, marginTop:4 }}>{label}</div>
            </div>
          );
        };
        return (
          <>
            <div style={{ color:'#1e293b', fontWeight:700, fontSize:14, marginBottom:12, marginTop:16 }}>Puntverdeling</div>
            <div style={{ display:'flex', justifyContent:'center', gap:16, marginBottom:12 }}>
              {renderDonut(pointStats.home, homeTotal, teamName||'Ons Team', '#dc2626')}
              {renderDonut(pointStats.away, awayTotal, opponentName||'Tegenstander', '#2563eb')}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:8, marginBottom:16 }}>
              {Object.entries(typeColors).map(([key, color]) => (
                <div key={key} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:color }} />
                  <span style={{ color:'#6b7280', fontSize:11 }}>{typeLabels[key]}</span>
                </div>
              ))}
            </div>
          </>
        );
      })()}

      {/* === Team Vergelijking (bar chart) === */}
      {(() => {
        const homeTotal = Object.values(pointStats.home).reduce((a,b) => a+b, 0);
        const awayTotal = Object.values(pointStats.away).reduce((a,b) => a+b, 0);
        if (homeTotal === 0 && awayTotal === 0) return null;
        const typeLabels = { direct:'Ace', sideout:'Sideout', block:'Blok', attack:'Aanval', error:'Fout' };
        const types = ['direct','sideout','block','attack','error'];
        const maxVal = Math.max(...types.map(t => Math.max(pointStats.home[t]||0, pointStats.away[t]||0)), 1);
        return (
          <>
            <div style={{ color:'#1e293b', fontWeight:700, fontSize:14, marginBottom:12, marginTop:16 }}>Team Vergelijking</div>
            <div style={{ background:'rgba(0,0,0,0.02)', border:'1px solid rgba(0,0,0,0.06)', borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
              {types.map(type => {
                const hv = pointStats.home[type]||0, av = pointStats.away[type]||0;
                if (hv === 0 && av === 0) return null;
                return (
                  <div key={type} style={{ marginBottom:10 }}>
                    <div style={{ color:'#6b7280', fontSize:11, fontWeight:600, marginBottom:4 }}>{typeLabels[type]}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                      <div style={{ width:24, fontSize:10, color:'#dc2626', fontWeight:700, textAlign:'right' }}>{hv}</div>
                      <div style={{ flex:1, height:14, background:'rgba(0,0,0,0.04)', borderRadius:4, overflow:'hidden' }}>
                        <div style={{ width:`${(hv/maxVal)*100}%`, height:'100%', background:'rgba(220,38,38,0.5)', borderRadius:4, transition:'width 0.3s' }} />
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:24, fontSize:10, color:'#2563eb', fontWeight:700, textAlign:'right' }}>{av}</div>
                      <div style={{ flex:1, height:14, background:'rgba(0,0,0,0.04)', borderRadius:4, overflow:'hidden' }}>
                        <div style={{ width:`${(av/maxVal)*100}%`, height:'100%', background:'rgba(37,99,235,0.5)', borderRadius:4, transition:'width 0.3s' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}

      {/* === Player Statistics + Speler Efficiëntie + Tegenstander per Positie === */}
      {playerStats && players && (() => {
        const typeLabels = { direct:'Ace', sideout:'Sideout', block:'Blok', attack:'Aanval', error:'Fout', servicefault:'Sf' };
        const oppRoleLabels = { opp_setter:'Spelverdeler', opp_outside:'Passerloper', opp_middle:'Midden', opp_opposite:'Diagonaal', opp_libero:'Libero' };
        const oppRoleShort = { opp_setter:'SPE', opp_outside:'PL', opp_middle:'MID', opp_opposite:'DIA', opp_libero:'L' };

        const homeEntries = [];
        const awayEntries = [];
        Object.entries(playerStats).forEach(([id, stats]) => {
          const total = Object.values(stats).reduce((a,b) => a+b, 0);
          if (total === 0) return;
          if (String(id).startsWith('opp_')) {
            awayEntries.push({ id, stats, total, label: oppRoleLabels[id] || id, short: oppRoleShort[id] || '?' });
          } else {
            const player = players.find(p => p.id === Number(id));
            homeEntries.push({ id: Number(id), player, stats, total });
          }
        });
        homeEntries.sort((a,b) => b.total - a.total);
        awayEntries.sort((a,b) => b.total - a.total);

        if (homeEntries.length === 0 && awayEntries.length === 0) return null;
        return (
          <>
            {/* Speler Statistieken */}
            {homeEntries.length > 0 && (
              <>
                <div style={{ color:'#1e293b', fontWeight:700, fontSize:14, marginBottom:12, marginTop:16 }}>Speler Statistieken</div>
                {homeEntries.map(({ id, player, stats, total }) => (
                  <div key={id} style={{ background:'rgba(0,0,0,0.02)', border:'1px solid rgba(0,0,0,0.06)', borderRadius:12, padding:'12px 14px', marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ background:'rgba(220,38,38,0.1)', color:'#dc2626', borderRadius:6, padding:'2px 8px', fontSize:13, fontWeight:800 }}>
                          #{player?.number || id}
                        </span>
                        <span style={{ color:'#1e293b', fontWeight:700, fontSize:13 }}>{player?.name || `Speler ${id}`}</span>
                      </div>
                      <span style={{ color:'#6b7280', fontSize:12, fontWeight:600 }}>{total} totaal</span>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {Object.entries(stats).filter(([,v]) => v > 0).map(([key, val]) => (
                        <div key={key} style={{ background:'rgba(0,0,0,0.03)', border:'1px solid rgba(0,0,0,0.06)', borderRadius:6, padding:'3px 8px', fontSize:11, color:'#374151' }}>
                          {typeLabels[key] || key}: <span style={{ fontWeight:700, color:'#1e293b' }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Speler Efficiëntie */}
            {(() => {
              const effEntries = homeEntries
                .filter(e => e.total >= 3)
                .map(e => {
                  const pos = (e.stats.attack||0) + (e.stats.direct||0) + (e.stats.sideout||0) + (e.stats.block||0);
                  const eff = Math.round((pos / e.total) * 100);
                  return { ...e, eff };
                })
                .sort((a, b) => b.eff - a.eff);
              if (effEntries.length === 0) return null;
              return (
                <>
                  <div style={{ color:'#1e293b', fontWeight:700, fontSize:14, marginBottom:12, marginTop:16 }}>Speler Efficiëntie</div>
                  <div style={{ background:'rgba(0,0,0,0.02)', border:'1px solid rgba(0,0,0,0.06)', borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
                    {effEntries.map(({ id, player, eff }) => {
                      const hue = (eff / 100) * 120;
                      const clr = `hsl(${hue}, 70%, 45%)`;
                      return (
                        <div key={id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                          <div style={{ width:80, display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                            <span style={{ color:'#6b7280', fontSize:11, fontWeight:700 }}>#{player?.number||id}</span>
                            <span style={{ color:'#374151', fontSize:11, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{player?.name||`Speler ${id}`}</span>
                          </div>
                          <div style={{ flex:1, height:16, background:'rgba(0,0,0,0.04)', borderRadius:4, overflow:'hidden' }}>
                            <div style={{ width:`${eff}%`, height:'100%', background:clr, borderRadius:4, transition:'width 0.3s' }} />
                          </div>
                          <span style={{ color:clr, fontSize:12, fontWeight:700, width:36, textAlign:'right' }}>{eff}%</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}

            {/* Tegenstander per Positie */}
            {awayEntries.length > 0 && (
              <>
                <div style={{ color:'#1e293b', fontWeight:700, fontSize:14, marginBottom:12, marginTop:16 }}>Tegenstander per Positie</div>
                {awayEntries.map(({ id, label, short, stats, total }) => (
                  <div key={id} style={{ background:'rgba(0,0,0,0.02)', border:'1px solid rgba(0,0,0,0.06)', borderRadius:12, padding:'12px 14px', marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ background:'rgba(37,99,235,0.1)', color:'#2563eb', borderRadius:6, padding:'2px 8px', fontSize:13, fontWeight:800 }}>
                          {short}
                        </span>
                        <span style={{ color:'#1e293b', fontWeight:700, fontSize:13 }}>{label}</span>
                      </div>
                      <span style={{ color:'#6b7280', fontSize:12, fontWeight:600 }}>{total} totaal</span>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {Object.entries(stats).filter(([,v]) => v > 0).map(([key, val]) => (
                        <div key={key} style={{ background:'rgba(0,0,0,0.03)', border:'1px solid rgba(0,0,0,0.06)', borderRadius:6, padding:'3px 8px', fontSize:11, color:'#374151' }}>
                          {typeLabels[key] || key}: <span style={{ fontWeight:700, color:'#1e293b' }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        );
      })()}

      {/* ══════════ PRO MODE SECTIONS ══════════ */}
      {proMode && allProData.some(d => d.rotation != null) && (() => {
        const rotations = analyzeRotations(allProData, 'home');
        return (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:20, marginBottom:12 }}>
              <span style={{ background:'#dc2626', color:'#fff', borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:800, letterSpacing:1 }}>PRO</span>
              <span style={{ color:'#1e293b', fontWeight:700, fontSize:14 }}>Rotatie-analyse</span>
            </div>
            <div style={{ background:'rgba(0,0,0,0.02)', border:'1px solid rgba(0,0,0,0.06)', borderRadius:12, padding:'10px 12px', marginBottom:12 }}>
              {/* Header */}
              <div style={{ display:'flex', padding:'4px 0 8px', borderBottom:'1px solid rgba(0,0,0,0.08)' }}>
                {['Rot', 'Punten+', 'Punten-', 'SO%', 'Break%'].map(h => (
                  <div key={h} style={{ flex: h === 'Rot' ? '0 0 40px' : 1, fontSize:10, fontWeight:700, color:'#6b7280', textAlign: h === 'Rot' ? 'left' : 'center' }}>{h}</div>
                ))}
              </div>
              {[1,2,3,4,5,6].map(r => {
                const d = rotations[r];
                const soPct = d.sideoutChances > 0 ? Math.round((d.sideouts / d.sideoutChances) * 100) : '-';
                const bkPct = d.breakChances > 0 ? Math.round((d.breaks / d.breakChances) * 100) : '-';
                const total = d.pointsFor + d.pointsAgainst;
                if (total === 0) return null;
                return (
                  <div key={r} style={{ display:'flex', alignItems:'center', padding:'6px 0', borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
                    <div style={{ flex:'0 0 40px', fontSize:14, fontWeight:800, color:'#dc2626' }}>{r}</div>
                    <div style={{ flex:1, textAlign:'center', fontSize:12, fontWeight:700, color:'#16a34a' }}>{d.pointsFor}</div>
                    <div style={{ flex:1, textAlign:'center', fontSize:12, fontWeight:700, color:'#dc2626' }}>{d.pointsAgainst}</div>
                    <div style={{ flex:1, textAlign:'center', fontSize:12, fontWeight:700, color: soPct !== '-' && soPct >= 50 ? '#16a34a' : '#6b7280' }}>{soPct !== '-' ? `${soPct}%` : '-'}</div>
                    <div style={{ flex:1, textAlign:'center', fontSize:12, fontWeight:700, color: bkPct !== '-' && bkPct >= 30 ? '#16a34a' : '#6b7280' }}>{bkPct !== '-' ? `${bkPct}%` : '-'}</div>
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}

      {proMode && allProData.some(d => d.receptionQuality) && (() => {
        const reception = analyzeReception(allProData, players);
        const { overall, byPlayer } = reception;
        if (overall.total === 0) return null;
        return (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:16, marginBottom:12 }}>
              <span style={{ background:'#dc2626', color:'#fff', borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:800, letterSpacing:1 }}>PRO</span>
              <span style={{ color:'#1e293b', fontWeight:700, fontSize:14 }}>Receptie-statistieken</span>
            </div>
            {/* Overall bar */}
            <div style={{ background:'rgba(0,0,0,0.02)', border:'1px solid rgba(0,0,0,0.06)', borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>Totaal ({overall.total} recepties)</div>
              <div style={{ display:'flex', height:24, borderRadius:6, overflow:'hidden', marginBottom:8 }}>
                {['A','B','C'].map(q => {
                  const pct = overall.total > 0 ? (overall[q] / overall.total) * 100 : 0;
                  if (pct === 0) return null;
                  const colors = { A: '#16a34a', B: '#eab308', C: '#dc2626' };
                  return (
                    <div key={q} style={{ width:`${pct}%`, background:colors[q], display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:800, minWidth: pct > 8 ? 'auto' : 0 }}>
                      {pct > 8 ? `${q} ${Math.round(pct)}%` : ''}
                    </div>
                  );
                })}
              </div>
              <div style={{ display:'flex', gap:12 }}>
                {['A','B','C'].map(q => (
                  <div key={q} style={{ fontSize:11, color:'#6b7280' }}>
                    <span style={{ fontWeight:700, color: { A:'#16a34a', B:'#eab308', C:'#dc2626' }[q] }}>{q}</span> {RECEPTION_LABELS[q]}: {overall[q]}
                  </div>
                ))}
              </div>
            </div>
            {/* Per player */}
            {Object.keys(byPlayer).length > 0 && (
              <div style={{ background:'rgba(0,0,0,0.02)', border:'1px solid rgba(0,0,0,0.06)', borderRadius:12, padding:'10px 12px', marginBottom:12 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>Per speler</div>
                {Object.entries(byPlayer).sort((a,b) => b[1].total - a[1].total).map(([id, p]) => (
                  <div key={id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <div style={{ width:70, fontSize:11, fontWeight:700, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>#{p.number} {p.name.split(' ')[0]}</div>
                    <div style={{ flex:1, display:'flex', height:16, borderRadius:4, overflow:'hidden' }}>
                      {['A','B','C'].map(q => {
                        const pct = p.total > 0 ? (p[q] / p.total) * 100 : 0;
                        if (pct === 0) return null;
                        return <div key={q} style={{ width:`${pct}%`, background:{ A:'#16a34a', B:'#eab308', C:'#dc2626' }[q] }} />;
                      })}
                    </div>
                    <div style={{ width:50, fontSize:10, color:'#6b7280', textAlign:'right' }}>{p.A}/{p.B}/{p.C}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        );
      })()}

      {proMode && allProData.some(d => d.type === 'attack' || d.errorSubtype === 'attack') && (() => {
        const efficiency = analyzeAttackEfficiency(allProData, players);
        const entries = Object.entries(efficiency).filter(([,v]) => v.totalAttempts > 0).sort((a,b) => b[1].killPct - a[1].killPct);
        if (entries.length === 0) return null;
        return (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:16, marginBottom:12 }}>
              <span style={{ background:'#dc2626', color:'#fff', borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:800, letterSpacing:1 }}>PRO</span>
              <span style={{ color:'#1e293b', fontWeight:700, fontSize:14 }}>Aanvals-efficiëntie</span>
            </div>
            <div style={{ background:'rgba(0,0,0,0.02)', border:'1px solid rgba(0,0,0,0.06)', borderRadius:12, padding:'10px 12px', marginBottom:12 }}>
              {entries.map(([id, p]) => {
                const hue = (p.killPct / 100) * 120;
                const clr = `hsl(${hue}, 70%, 45%)`;
                return (
                  <div key={id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <div style={{ width:80, fontSize:11, fontWeight:700, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>#{p.number} {p.name.split(' ')[0]}</div>
                    <div style={{ flex:1, height:18, background:'rgba(0,0,0,0.04)', borderRadius:4, overflow:'hidden', position:'relative' }}>
                      <div style={{ width:`${p.killPct}%`, height:'100%', background:clr, borderRadius:4, transition:'width 0.3s' }} />
                    </div>
                    <div style={{ width:70, fontSize:10, color:'#6b7280', textAlign:'right' }}>
                      <span style={{ fontWeight:800, color:clr }}>{p.killPct}%</span> ({p.kills}/{p.totalAttempts})
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}

      {proMode && allProData.some(d => d.serveZone != null) && (() => {
        const zones = analyzeServeZones(allProData);
        const maxZone = Math.max(...Object.values(zones).map(z => z.total), 1);
        return (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:16, marginBottom:12 }}>
              <span style={{ background:'#dc2626', color:'#fff', borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:800, letterSpacing:1 }}>PRO</span>
              <span style={{ color:'#1e293b', fontWeight:700, fontSize:14 }}>Service Zones</span>
            </div>
            <div style={{ background:'rgba(0,0,0,0.02)', border:'1px solid rgba(0,0,0,0.06)', borderRadius:12, padding:'14px', marginBottom:12 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, maxWidth:240, margin:'0 auto' }}>
                {SERVE_ZONES.map(zone => {
                  const z = zones[zone];
                  const intensity = z.total > 0 ? Math.max(0.15, z.total / maxZone) : 0.05;
                  return (
                    <div key={zone} style={{ background:`rgba(37,99,235,${intensity})`, border:'1px solid rgba(37,99,235,0.2)', borderRadius:8, padding:'10px 6px', textAlign:'center' }}>
                      <div style={{ fontSize:18, fontWeight:800, color:'#1e293b' }}>{zone}</div>
                      <div style={{ fontSize:11, fontWeight:700, color:'#2563eb' }}>{z.total}x</div>
                      {z.aces > 0 && <div style={{ fontSize:10, color:'#16a34a', fontWeight:600 }}>{z.aces} ace{z.aces > 1 ? 's' : ''}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        );
      })()}

      {proMode && allScoreHistory.length > 0 && (() => {
        const runs = findScoringRuns(allScoreHistory);
        if (runs.length === 0) return null;
        const sortedRuns = [...runs].sort((a,b) => b.length - a.length).slice(0, 8);
        return (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:16, marginBottom:12 }}>
              <span style={{ background:'#dc2626', color:'#fff', borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:800, letterSpacing:1 }}>PRO</span>
              <span style={{ color:'#1e293b', fontWeight:700, fontSize:14 }}>Momentum (runs 3+)</span>
            </div>
            <div style={{ background:'rgba(0,0,0,0.02)', border:'1px solid rgba(0,0,0,0.06)', borderRadius:12, padding:'10px 12px', marginBottom:12 }}>
              {sortedRuns.map((run, i) => {
                const isHome = run.team === 'home';
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', marginBottom:4, borderRadius:8, background: isHome ? 'rgba(220,38,38,0.06)' : 'rgba(37,99,235,0.06)', border:`1px solid ${isHome ? 'rgba(220,38,38,0.15)' : 'rgba(37,99,235,0.15)'}` }}>
                    <span style={{ fontSize:18, fontWeight:900, color: isHome ? '#dc2626' : '#2563eb', width:30, textAlign:'center' }}>{run.length}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'#1e293b' }}>{isHome ? (teamName || 'Thuis') : (opponentName || 'Uit')} — {run.length} op rij</div>
                      <div style={{ fontSize:10, color:'#6b7280' }}>{run.startScore} → {run.endScore}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}
    </div>
  );
}
