export default function LiveDashboard({
  homeScore, awayScore, sets, servingTeam,
  teamName, opponentName,
  pointStats, homeTimeouts, awayTimeouts,
  substitutions, scoreHistory, undoLastPoint,
  homeColor, awayColor,
  playerStats, players,
  proMode, currentRotation,
}) {
  const ico = (name, s = 13) => <img src={`/icons/${name}.svg`} alt="" style={{ width: s, height: s, flexShrink: 0 }} />;
  const typeLabels = { direct: ico('ace'), sideout: ico('sideout'), block: ico('blok'), attack: ico('aanval'), error: ico('fout'), servicefault: ico('serve') };

  // Rank players by total scoring contributions (excl. errors/servicefaults)
  const rankedPlayers = Object.entries(playerStats)
    .map(([id, stats]) => {
      const pid = Number(id);
      const player = players.find(p => p.id === pid);
      if (!player) return null;
      const total = (stats.direct || 0) + (stats.sideout || 0) + (stats.block || 0) + (stats.attack || 0);
      return { ...player, stats, total };
    })
    .filter(p => p && p.total > 0)
    .sort((a, b) => b.total - a.total);

  const statTypes = [
    { key: 'direct', label: 'Ace', icon: 'ace' },
    { key: 'sideout', label: 'Side-out', icon: 'sideout' },
    { key: 'block', label: 'Blok', icon: 'blok' },
    { key: 'attack', label: 'Aanval', icon: 'aanval' },
    { key: 'error', label: 'Fout', icon: 'fout' },
  ];

  const totalHome = Object.values(pointStats.home).reduce((a, b) => a + b, 0);
  const totalAway = Object.values(pointStats.away).reduce((a, b) => a + b, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Compact info bar */}
      <div style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
        {proMode && currentRotation && (
          <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 800, background: 'rgba(220,38,38,0.08)', borderRadius: 4, padding: '1px 6px' }}>ROT {currentRotation}</span>
        )}
        <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>TO {homeTimeouts.length}:{awayTimeouts.length}</span>
        <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>W {substitutions.length}/6</span>
        {scoreHistory.length > 0 && (
          <button onClick={undoLastPoint} style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 5, padding: '2px 7px', cursor: 'pointer', color: '#dc2626', fontSize: 10, fontWeight: 700 }}>↩ Undo</button>
        )}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 20px', display: 'flex', flexDirection: 'column', gap: 16, WebkitOverflowScrolling: 'touch' }}>

        {/* ── MOMENTUM INDICATOR (Pro) ── */}
        {proMode && scoreHistory.length >= 3 && (() => {
          let runTeam = scoreHistory[scoreHistory.length - 1].team;
          let runCount = 0;
          for (let i = scoreHistory.length - 1; i >= 0; i--) {
            if (scoreHistory[i].team !== runTeam) break;
            runCount++;
          }
          if (runCount < 3) return null;
          const isHome = runTeam === 'home';
          return (
            <div style={{ background: isHome ? 'rgba(220,38,38,0.08)' : 'rgba(37,99,235,0.08)', border: `1px solid ${isHome ? 'rgba(220,38,38,0.2)' : 'rgba(37,99,235,0.2)'}`, borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>&#128293;</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: isHome ? '#dc2626' : '#2563eb' }}>{runCount} op rij</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>{isHome ? (teamName || 'Thuis') : (opponentName || 'Uit')}</div>
              </div>
            </div>
          );
        })()}

        {/* ── BESTE SPELERS ── */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Beste Spelers</div>
          {rankedPlayers.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 12, fontStyle: 'italic' }}>Nog geen punten gescoord</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {rankedPlayers.slice(0, 6).map((p, idx) => {
                const maxTotal = rankedPlayers[0]?.total || 1;
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 8, background: idx === 0 ? 'rgba(220,38,38,0.06)' : 'transparent', border: idx === 0 ? '1px solid rgba(220,38,38,0.12)' : '1px solid transparent' }}>
                    {/* Rank */}
                    <span style={{ fontSize: 12, fontWeight: 800, color: idx < 3 ? '#dc2626' : '#9ca3af', width: 16, textAlign: 'center' }}>{idx + 1}</span>
                    {/* Shirt number */}
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: homeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>{p.number}</span>
                    </div>
                    {/* Name + bar */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', marginLeft: 6 }}>{p.total}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: homeColor, opacity: 0.7, width: `${(p.total / maxTotal) * 100}%`, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                    {/* Breakdown mini-badges */}
                    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                      {p.stats.direct > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 9, color: '#6b7280' }}>{ico('ace', 10)}{p.stats.direct}</span>}
                      {p.stats.attack > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 9, color: '#6b7280' }}>{ico('aanval', 10)}{p.stats.attack}</span>}
                      {p.stats.block > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 9, color: '#6b7280' }}>{ico('blok', 10)}{p.stats.block}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── SCORINGSSTATISTIEKEN ── */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Scoringsstatistieken</div>

          {/* Team headers */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6, padding: '0 4px' }}>
            <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: homeColor }}>{teamName || 'THUIS'} ({totalHome})</span>
            <span style={{ width: 50 }} />
            <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: awayColor, textAlign: 'right' }}>{opponentName || 'TEG'} ({totalAway})</span>
          </div>

          {/* Stat bars — mirrored */}
          {statTypes.map(({ key, label, icon }) => {
            const hVal = pointStats.home[key] || 0;
            const aVal = pointStats.away[key] || 0;
            const max = Math.max(hVal, aVal, 1);
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5, padding: '0 4px' }}>
                {/* Home bar (right-aligned) */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: hVal > aVal ? homeColor : '#9ca3af' }}>{hVal}</span>
                  <div style={{ width: 80, height: 10, borderRadius: 3, background: 'rgba(0,0,0,0.04)', overflow: 'hidden', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: homeColor, opacity: 0.7, width: `${(hVal / max) * 100}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>
                {/* Label center */}
                <div style={{ width: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                  {ico(icon, 12)}
                  <span style={{ fontSize: 9, fontWeight: 600, color: '#6b7280' }}>{label}</span>
                </div>
                {/* Away bar (left-aligned) */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 80, height: 10, borderRadius: 3, background: 'rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: awayColor, opacity: 0.7, width: `${(aVal / max) * 100}%`, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: aVal > hVal ? awayColor : '#9ca3af' }}>{aVal}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── PUNTENVERLOOP ── */}
        {scoreHistory.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Puntenverloop</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {[...scoreHistory].reverse().map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '4px 8px', borderRadius: 6,
                  background: s.team === 'home' ? 'rgba(220,38,38,0.06)' : 'rgba(37,99,235,0.06)',
                  border: `1px solid ${s.team === 'home' ? 'rgba(220,38,38,0.15)' : 'rgba(37,99,235,0.15)'}`,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', minWidth: 42 }}>{s.score}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: s.team === 'home' ? homeColor : awayColor }}>{s.team === 'home' ? (teamName || 'THUIS') : (opponentName || 'TEG')}</span>
                  <span style={{ fontSize: 12, marginLeft: 'auto' }}>{typeLabels[s.type] || '•'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
