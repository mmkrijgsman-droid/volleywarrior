import { getRoleLabel, shirtColors } from '../helpers/constants';

// Away player roles by ID (tied to player, not position)
const awayPlayerRoles = { 101:'SPE', 102:'PL', 103:'MID', 104:'DIA', 105:'PL', 106:'MID' };

// Away setter is always player 101
const AWAY_SETTER_ID = 101;

// Find setter's rotational position (1-6). Returns null if not exactly 1 setter (e.g. 4-2).
function findSetterPos(lineup, players) {
  let found = null;
  for (let pos = 1; pos <= 6; pos++) {
    const player = players?.find(p => p.id === lineup[pos]);
    if (player?.role === 'setter') {
      if (found !== null) return null;
      found = pos;
    }
  }
  return found;
}

function findAwaySetterPos(lineup) {
  for (let pos = 1; pos <= 6; pos++) {
    if (lineup[pos] === AWAY_SETTER_ID) return pos;
  }
  return null;
}

// Mirror home-half coordinates to away-half
function mirror(p) {
  return { left: (100 - parseFloat(p.left)) + '%', top: (100 - parseFloat(p.top)) + '%' };
}

// ── Tactical serve-receive positions (home half: top 0%=net, 100%=baseline) ──
// Per rotation (keyed by setter position), all 6 court positions.
// Legal constraints respected: front row in front of back row, left-right order maintained.
const receivePositions = {
  1: { // S@1  OH@2  M@3  O@4  OH@5  M/L@6
    1:{left:'78%',top:'48%'}, 2:{left:'65%',top:'32%'}, 3:{left:'45%',top:'10%'},
    4:{left:'22%',top:'14%'}, 5:{left:'22%',top:'68%'}, 6:{left:'48%',top:'68%'},
  },
  2: { // M/L@1  S@2  OH@3  M@4  O@5  OH@6
    1:{left:'70%',top:'62%'}, 2:{left:'78%',top:'10%'}, 3:{left:'48%',top:'28%'},
    4:{left:'25%',top:'10%'}, 5:{left:'22%',top:'62%'}, 6:{left:'50%',top:'58%'},
  },
  3: { // OH@1  M@2  S@3  OH@4  M/L@5  O@6
    1:{left:'68%',top:'58%'}, 2:{left:'72%',top:'10%'}, 3:{left:'55%',top:'14%'},
    4:{left:'28%',top:'28%'}, 5:{left:'25%',top:'65%'}, 6:{left:'48%',top:'62%'},
  },
  4: { // O@1  OH@2  M@3  S@4  OH@5  M/L@6
    1:{left:'72%',top:'62%'}, 2:{left:'68%',top:'28%'}, 3:{left:'48%',top:'10%'},
    4:{left:'30%',top:'14%'}, 5:{left:'22%',top:'65%'}, 6:{left:'48%',top:'68%'},
  },
  5: { // M/L@1  O@2  OH@3  M@4  S@5  OH@6
    1:{left:'72%',top:'62%'}, 2:{left:'72%',top:'14%'}, 3:{left:'48%',top:'28%'},
    4:{left:'28%',top:'10%'}, 5:{left:'28%',top:'42%'}, 6:{left:'50%',top:'65%'},
  },
  6: { // OH@1  M@2  O@3  OH@4  M/L@5  S@6
    1:{left:'72%',top:'62%'}, 2:{left:'70%',top:'10%'}, 3:{left:'42%',top:'14%'},
    4:{left:'22%',top:'28%'}, 5:{left:'22%',top:'68%'}, 6:{left:'55%',top:'42%'},
  },
};

// ── Tactical serving positions (pos 1 serves from baseline) ──
const servePositions = {
  1: { // S@1 serves
    1:{left:'78%',top:'88%'}, 2:{left:'72%',top:'18%'}, 3:{left:'48%',top:'12%'},
    4:{left:'25%',top:'18%'}, 5:{left:'25%',top:'72%'}, 6:{left:'50%',top:'72%'},
  },
  2: { // M@1 serves
    1:{left:'75%',top:'88%'}, 2:{left:'78%',top:'12%'}, 3:{left:'48%',top:'18%'},
    4:{left:'25%',top:'12%'}, 5:{left:'25%',top:'72%'}, 6:{left:'55%',top:'68%'},
  },
  3: { // OH@1 serves
    1:{left:'75%',top:'88%'}, 2:{left:'72%',top:'12%'}, 3:{left:'55%',top:'15%'},
    4:{left:'25%',top:'22%'}, 5:{left:'25%',top:'72%'}, 6:{left:'50%',top:'72%'},
  },
  4: { // O@1 serves
    1:{left:'75%',top:'88%'}, 2:{left:'68%',top:'22%'}, 3:{left:'48%',top:'12%'},
    4:{left:'30%',top:'15%'}, 5:{left:'25%',top:'72%'}, 6:{left:'50%',top:'72%'},
  },
  5: { // M@1 serves
    1:{left:'75%',top:'88%'}, 2:{left:'72%',top:'14%'}, 3:{left:'48%',top:'18%'},
    4:{left:'25%',top:'12%'}, 5:{left:'30%',top:'55%'}, 6:{left:'55%',top:'68%'},
  },
  6: { // OH@1 serves
    1:{left:'75%',top:'88%'}, 2:{left:'72%',top:'14%'}, 3:{left:'45%',top:'14%'},
    4:{left:'25%',top:'18%'}, 5:{left:'25%',top:'72%'}, 6:{left:'60%',top:'68%'},
  },
};

export function getPositionStyle(pos, isAway, servingTeam, players, playerId = null, lineup = null) {
  const isServingTeam = isAway ? servingTeam === 'away' : servingTeam === 'home';

  // Tactical positions when lineup is known
  if (lineup) {
    const setterPos = isAway ? findAwaySetterPos(lineup) : findSetterPos(lineup, players);
    if (setterPos) {
      const table = isServingTeam ? servePositions : receivePositions;
      const positions = table[setterPos];
      if (positions?.[pos]) {
        const base = isAway ? mirror(positions[pos]) : positions[pos];
        return { position: 'absolute', ...base, transform: 'translate(-50%, -50%)' };
      }
    }
  }

  // Fallback: simple grid (4-2 or unknown lineup)
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

export function renderPlayer({ playerId, position, isAway, players, servingTeam, substitutionMode, selectedBenchPlayer, makeSubstitution, showPointTypePopup, scorePoint, lineup, showPlayerSelectPopup, confirmPlayerSelect, homeColor, awayColor, opponentPlayers }) {
  const player = players.find(p => p.id === playerId);
  const opponentPlayer = isAway ? opponentPlayers?.find(p => p.id === playerId) : null;
  const isServing = position === 1 && ((isAway && servingTeam==='away') || (!isAway && servingTeam==='home'));
  const color = player?.isLibero ? shirtColors.libero : (isAway ? (awayColor || shirtColors.away) : (homeColor || shirtColors.home));
  const isSelectMode = showPlayerSelectPopup && (
    showPlayerSelectPopup.type === 'error' ||
    (!isAway && showPlayerSelectPopup.scoringTeam === 'home') ||
    (isAway && showPlayerSelectPopup.scoringTeam === 'away')
  );

  const handleClick = (e) => {
    e.stopPropagation();
    if (isSelectMode) {
      confirmPlayerSelect(playerId);
    } else if (!isAway && substitutionMode && selectedBenchPlayer) {
      makeSubstitution(playerId);
    } else if (!substitutionMode && !showPointTypePopup) {
      const style = getPositionStyle(position, isAway, servingTeam, players, playerId, lineup);
      const x = parseFloat(style.left || 50);
      const y = parseFloat(style.top || 50);
      scorePoint(isAway ? 'home' : 'away', x, y);
    }
  };

  return (
    <div
      key={`${position}-${isAway}`}
      style={{ ...getPositionStyle(position, isAway, servingTeam, players, playerId, lineup), zIndex: isSelectMode ? 25 : 20, cursor:'pointer', transition: isSelectMode ? 'none' : 'left 0.5s cubic-bezier(0.34,1.56,0.64,1), top 0.5s cubic-bezier(0.34,1.56,0.64,1)', width:50, height:50, ...(isSelectMode ? { animation: 'playerPulse 0.8s ease-in-out infinite', filter:`drop-shadow(0 0 12px rgba(255,255,255,0.9)) drop-shadow(0 0 24px ${color}99)` } : {}) }}
      onClick={handleClick}
    >
      <svg viewBox="0 0 24 24" style={{ width:'100%', height:'100%', filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.6))' }}>
        <path d="M8 3l4 2 4-2 5 3-3 5v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V11L3 6l5-3z" fill={color} stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/>
        <text x="12" y="13" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">
          {player?.number || opponentPlayer?.number || playerId}
        </text>
        <text x="12" y="19" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="4">
          {player ? getRoleLabel(player.role) : (awayPlayerRoles[playerId] || '?')}
        </text>
      </svg>
      {isServing && (
        <div style={{ position:'absolute', top:'-22px', left:'50%', transform:'translateX(-50%)' }}>
          <img src="/volleybal.png" alt="🏐" style={{ width:33, height:33, animation:'bounce 1s infinite', filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
        </div>
      )}
    </div>
  );
}

export function renderHomeLineup({ homeLineup, players, servingTeam, substitutionMode, selectedBenchPlayer, makeSubstitution, showPointTypePopup, scorePoint, showPlayerSelectPopup, confirmPlayerSelect, homeColor, awayColor, opponentPlayers }) {
  return [1,2,3,4,5,6].map(pos => {
    let id = homeLineup[pos];
    const playerData = players.find(p => p.id === id);
    if (homeLineup.libero && playerData?.role === 'middle' && (pos === 5 || pos === 6)) {
      id = homeLineup.libero;
    }
    return id ? renderPlayer({ playerId: id, position: pos, isAway: false, players, servingTeam, substitutionMode, selectedBenchPlayer, makeSubstitution, showPointTypePopup, scorePoint, lineup: homeLineup, showPlayerSelectPopup, confirmPlayerSelect, homeColor, awayColor, opponentPlayers }) : null;
  });
}

export function renderAwayLineup({ awayLineup, players, servingTeam, substitutionMode, selectedBenchPlayer, makeSubstitution, showPointTypePopup, scorePoint, showPlayerSelectPopup, confirmPlayerSelect, homeColor, awayColor, opponentPlayers }) {
  return [1,2,3,4,5,6].map(pos =>
    awayLineup[pos] ? renderPlayer({ playerId: awayLineup[pos], position: pos, isAway: true, players, servingTeam, substitutionMode, selectedBenchPlayer, makeSubstitution, showPointTypePopup, scorePoint, lineup: awayLineup, showPlayerSelectPopup, confirmPlayerSelect, homeColor, awayColor, opponentPlayers }) : null
  );
}
