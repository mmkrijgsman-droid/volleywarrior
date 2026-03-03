import { getRoleLabel, shirtColors } from '../helpers/constants';

export function getPositionStyle(pos, isAway, servingTeam, players, playerId = null) {
  const isServingTeam = isAway ? servingTeam === 'away' : servingTeam === 'home';
  const player = playerId ? players.find(p => p.id === playerId) : null;
  const isSetter = player?.role === 'setter';

  const frontRowTop = (isServingTeam || isSetter) ? '12%' : '33%';
  const frontRowBottom = (isServingTeam || isSetter) ? '88%' : '67%';

  const homePositions = {
    1: { left: '75%', top: '78%' },
    2: { left: '75%', top: frontRowTop },
    3: { left: '50%', top: frontRowTop },
    4: { left: '25%', top: frontRowTop },
    5: { left: '25%', top: '78%' },
    6: { left: '50%', top: '78%' },
  };
  const awayPositions = {
    1: { left: '25%', top: '22%' },
    2: { left: '25%', top: frontRowBottom },
    3: { left: '50%', top: frontRowBottom },
    4: { left: '75%', top: frontRowBottom },
    5: { left: '75%', top: '22%' },
    6: { left: '50%', top: '22%' },
  };
  const positions = isAway ? awayPositions : homePositions;
  const base = positions[pos] || { left: '50%', top: '50%' };
  return { position: 'absolute', ...base, transform: 'translate(-50%, -50%)' };
}

export function renderPlayer({ playerId, position, isAway, players, servingTeam, substitutionMode, selectedBenchPlayer, makeSubstitution, showPointTypePopup, scorePoint }) {
  const player = players.find(p => p.id === playerId);
  const isServing = position === 1 && ((isAway && servingTeam==='away') || (!isAway && servingTeam==='home'));
  const color = player?.isLibero ? shirtColors.libero : (isAway ? shirtColors.away : shirtColors.home);

  const handleClick = (e) => {
    e.stopPropagation();
    if (!isAway && substitutionMode && selectedBenchPlayer) {
      makeSubstitution(playerId);
    } else if (!substitutionMode && !showPointTypePopup) {
      const style = getPositionStyle(position, isAway, servingTeam, players, playerId);
      const x = parseFloat(style.left || 50);
      const y = parseFloat(style.top || 50);
      scorePoint(isAway ? 'home' : 'away', x, y);
    }
  };

  return (
    <div
      key={`${position}-${isAway}`}
      style={{ ...getPositionStyle(position, isAway, servingTeam, players, playerId), zIndex:20, cursor:'pointer', transition:'all 0.5s cubic-bezier(0.34,1.56,0.64,1)', width:50, height:50 }}
      onClick={handleClick}
    >
      <svg viewBox="0 0 24 24" style={{ width:'100%', height:'100%', filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.6))' }}>
        <path d="M8 3l4 2 4-2 5 3-3 5v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V11L3 6l5-3z" fill={color} stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/>
        <text x="12" y="13" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">
          {player?.number || playerId}
        </text>
        <text x="12" y="19" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="4">
          {player ? getRoleLabel(player.role) : '?'}
        </text>
      </svg>
      {isServing && (
        <div style={{ position:'absolute', top:'-22px', left:'50%', transform:'translateX(-50%)' }}>
          <svg viewBox="0 0 100 100" style={{ width:22, height:22, animation:'bounce 1s infinite' }}>
            <defs>
              <radialGradient id="bg" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#fff"/>
                <stop offset="100%" stopColor="#fbbf24"/>
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#bg)" stroke="#f59e0b" strokeWidth="2"/>
            <path d="M20 30Q15 50,20 70Q35 75,50 70Q35 50,50 30Q35 25,20 30Z" fill="none" stroke="#d97706" strokeWidth="2.5" opacity="0.8"/>
            <path d="M80 30Q85 50,80 70Q65 75,50 70Q65 50,50 30Q65 25,80 30Z" fill="none" stroke="#d97706" strokeWidth="2.5" opacity="0.8"/>
          </svg>
        </div>
      )}
    </div>
  );
}

export function renderHomeLineup({ homeLineup, players, servingTeam, substitutionMode, selectedBenchPlayer, makeSubstitution, showPointTypePopup, scorePoint }) {
  return [1,2,3,4,5,6].map(pos => {
    let id = homeLineup[pos];
    const playerData = players.find(p => p.id === id);
    if (homeLineup.libero && playerData?.role === 'middle' && (pos === 5 || pos === 6)) {
      id = homeLineup.libero;
    }
    return id ? renderPlayer({ playerId: id, position: pos, isAway: false, players, servingTeam, substitutionMode, selectedBenchPlayer, makeSubstitution, showPointTypePopup, scorePoint }) : null;
  });
}

export function renderAwayLineup({ awayLineup, players, servingTeam, substitutionMode, selectedBenchPlayer, makeSubstitution, showPointTypePopup, scorePoint }) {
  return [1,2,3,4,5,6].map(pos =>
    awayLineup[pos] ? renderPlayer({ playerId: awayLineup[pos], position: pos, isAway: true, players, servingTeam, substitutionMode, selectedBenchPlayer, makeSubstitution, showPointTypePopup, scorePoint }) : null
  );
}
