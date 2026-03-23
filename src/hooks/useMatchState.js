import { useState, useEffect } from 'react';

export default function useMatchState() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('players');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  const [players, setPlayers] = useState([
    { id: 1, name: 'Speler 1', number: 1, role: 'setter' },
    { id: 2, name: 'Speler 2', number: 2, role: 'outside' },
    { id: 3, name: 'Speler 3', number: 3, role: 'middle' },
    { id: 4, name: 'Speler 4', number: 4, role: 'opposite' },
    { id: 5, name: 'Speler 5', number: 5, role: 'outside' },
    { id: 6, name: 'Speler 6', number: 6, role: 'middle' },
    { id: 7, name: 'Libero',   number: 7, role: 'libero', isLibero: true },
  ]);

  const [homeLineup, setHomeLineup] = useState({ 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, libero:7 });
  const [awayLineup, setAwayLineup] = useState({ 1:101, 2:102, 3:103, 4:104, 5:105, 6:106 });
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore]  = useState(0);
  const [sets, setSets] = useState({ home:0, away:0 });
  const [homeTimeouts, setHomeTimeouts] = useState([]);
  const [awayTimeouts, setAwayTimeouts] = useState([]);
  const [servingTeam, setServingTeam] = useState('home');
  const [scoreHistory, setScoreHistory] = useState([]);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [heatmapData, setHeatmapData]   = useState([]);
  const [savedHeatmaps, setSavedHeatmaps] = useState([]);
  const [setEnded, setSetEnded] = useState(false);
  const [matchEnded, setMatchEnded] = useState(false);
  const [setWinner, setSetWinner] = useState(null);
  const [matchWinner, setMatchWinner] = useState(null);
  const [showLineupConfirm, setShowLineupConfirm] = useState(false);
  const [substitutions, setSubstitutions] = useState([]);
  const [teamName, setTeamName] = useState('VCV');
  const [opponentName, setOpponentName] = useState('');
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [alertMessage, setAlertMessage] = useState(null);
  const [showServingDialog, setShowServingDialog] = useState(false);
  const [showPointTypePopup, setShowPointTypePopup] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showNewMatchDialog, setShowNewMatchDialog] = useState(false);
  const [savedMatches, setSavedMatches] = useState([]);
  const [pointStats, setPointStats] = useState({
    home: { direct:0, sideout:0, block:0, attack:0, error:0 },
    away: { direct:0, sideout:0, block:0, attack:0, error:0 },
  });
  const [showHeatmapOverlay, setShowHeatmapOverlay] = useState(null);
  const [confetti, setConfetti] = useState([]);
  const [showServiceFaultPopup, setShowServiceFaultPopup] = useState(null);
  const [showPlayerSelectPopup, setShowPlayerSelectPopup] = useState(null);
  const [playerStats, setPlayerStats] = useState({});
  const [substitutionMode, setSubstitutionMode] = useState(false);
  const [selectedBenchPlayer, setSelectedBenchPlayer] = useState(null);
  const [formationSystem, setFormationSystem] = useState('5-1');
  const [trackPlayerStats, setTrackPlayerStats] = useState(true);
  const [trackOpponentStats, setTrackOpponentStats] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAttackLines, setShowAttackLines] = useState(false);
  const [homeColor, setHomeColor] = useState('#dc2626');
  const [awayColor, setAwayColor] = useState('#2563eb');
  const [showDwfImportModal, setShowDwfImportModal] = useState(false); // false | 'own' | 'opponent'
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [opponentPlayers, setOpponentPlayers] = useState([]);
  const [proMode, setProMode] = useState(false);
  const [showProPanel, setShowProPanel] = useState(null);

  // Pro mode: get current rotation (setter position 1-6)
  const getRotation = () => {
    let found = null;
    for (let pos = 1; pos <= 6; pos++) {
      const p = players.find(pl => pl.id === homeLineup[pos]);
      if (p?.role === 'setter') {
        if (found !== null) return null; // 4-2: two setters
        found = pos;
      }
    }
    return found;
  };

  // Pro mode: patch last heatmap entry with Pro data
  const confirmProData = (data) => {
    setHeatmapData(h => {
      if (h.length === 0) return h;
      const updated = [...h];
      updated[updated.length - 1] = { ...updated[updated.length - 1], ...data };
      return updated;
    });
    setShowProPanel(null);
  };

  const skipProPanel = () => setShowProPanel(null);

  const switchFormation = (sys) => {
    setFormationSystem(sys);
    if (sys === '4-2') {
      setHomeLineup(l => ({ ...l, libero: null }));
    }
  };

  // detect mobile / tablet / orientation
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768);
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', () => setTimeout(check, 100));
    return () => { window.removeEventListener('resize', check); window.removeEventListener('orientationchange', check); };
  }, []);

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('volleyballSettings');
    if (stored) {
      try {
        const s = JSON.parse(stored);
        if (s.trackPlayerStats !== undefined) setTrackPlayerStats(s.trackPlayerStats);
        if (s.trackOpponentStats !== undefined) setTrackOpponentStats(s.trackOpponentStats);
        if (s.proMode !== undefined) setProMode(s.proMode);
      } catch (e) {}
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('volleyballSettings', JSON.stringify({ trackPlayerStats, trackOpponentStats, proMode }));
  }, [trackPlayerStats, trackOpponentStats, proMode]);

  // Load team name from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('volleyballTeamName');
    if (stored) setTeamName(stored);
  }, []);

  // Save team name to localStorage
  useEffect(() => {
    localStorage.setItem('volleyballTeamName', teamName);
  }, [teamName]);

  // Load team colors from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('volleyballTeamColors');
    if (stored) {
      try {
        const c = JSON.parse(stored);
        if (c.home) setHomeColor(c.home);
        if (c.away) setAwayColor(c.away);
      } catch (e) {}
    }
  }, []);

  // Save team colors to localStorage
  useEffect(() => {
    localStorage.setItem('volleyballTeamColors', JSON.stringify({ home: homeColor, away: awayColor }));
  }, [homeColor, awayColor]);

  // Load players from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('volleyballPlayers');
    if (stored) {
      try { setPlayers(JSON.parse(stored)); } catch (e) {}
    }
  }, []);

  // Save players to localStorage
  useEffect(() => {
    if (players.length > 0) {
      localStorage.setItem('volleyballPlayers', JSON.stringify(players));
    }
  }, [players]);

  // Load matches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('volleyballMatches');
    if (stored) {
      try { setSavedMatches(JSON.parse(stored)); } catch (e) {}
    }
  }, []);

  // Save matches to localStorage
  useEffect(() => {
    localStorage.setItem('volleyballMatches', JSON.stringify(savedMatches));
  }, [savedMatches]);

  const showAlert = (msg) => { setAlertMessage(msg); setTimeout(() => setAlertMessage(null), 2500); };

  const updatePlayer = (id, field, value) => {
    setPlayers(ps => ps.map(p => p.id !== id ? p : { ...p, [field]: value,
      ...(field==='isLibero' && value ? { role:'libero' } : {}),
      ...(field==='isLibero' && !value && p.role==='libero' ? { role:'outside' } : {}),
    }));
  };

  const addPlayer = () => {
    const newId = Math.max(...players.map(p => p.id), 0) + 1;
    setPlayers(ps => [...ps, { id:newId, name:`Speler ${newId}`, number:newId, role:'outside' }]);
  };

  const updateLineup = (team, pos, val) => {
    if (team === 'home') setHomeLineup(l => ({ ...l, [pos]: val }));
    else setAwayLineup(l => ({ ...l, [pos]: val }));
  };

  const [showRoleMismatchPopup, setShowRoleMismatchPopup] = useState(null);

  const ROLE_ORDER_51 = ['setter', 'outside', 'middle', 'opposite', 'outside', 'middle'];
  const ROLE_ORDER_42 = ['setter', 'outside', 'middle', 'setter', 'outside', 'middle'];

  const getExpectedRoles = (lineup, pls, system) => {
    const order = system === '4-2' ? ROLE_ORDER_42 : ROLE_ORDER_51;
    let setterPos = null;
    for (let pos = 1; pos <= 6; pos++) {
      const p = pls.find(pl => pl.id === lineup[pos]);
      if (p?.role === 'setter') { setterPos = pos; break; }
    }
    if (setterPos === null) return null;
    const expected = {};
    for (let i = 0; i < 6; i++) {
      expected[((setterPos - 1 + i) % 6) + 1] = order[i];
    }
    return expected;
  };

  const confirmLineup = () => {
    // Duplicate check
    const homePositions = [1,2,3,4,5,6].map(p => homeLineup[p]).filter(Boolean);
    const uniqueHome = new Set(homePositions);
    if (uniqueHome.size !== homePositions.length) {
      showAlert('Een speler kan maar op 1 positie staan');
      return;
    }
    if (homeLineup.libero && homePositions.includes(homeLineup.libero)) {
      showAlert('Libero staat al op een veldpositie');
      return;
    }

    // Role-mismatch check
    const expected = getExpectedRoles(homeLineup, players, formationSystem);
    if (expected) {
      const mismatches = [];
      for (let pos = 1; pos <= 6; pos++) {
        const player = players.find(p => p.id === homeLineup[pos]);
        if (player && expected[pos] && player.role !== expected[pos]) {
          mismatches.push({ pos, player, expectedRole: expected[pos], actualRole: player.role });
        }
      }
      if (mismatches.length > 0) {
        setShowRoleMismatchPopup({ mismatches });
        return;
      }
    }

    finalizeLineup();
  };

  const finalizeLineup = () => {
    setShowRoleMismatchPopup(null);
    setBottomSheetOpen(false);
    if (sets.home === 0 && sets.away === 0 && homeScore === 0 && awayScore === 0) {
      setShowServingDialog(true);
    }
  };

  const rotateHome = () => setHomeLineup(l => ({ 1:l[2],2:l[3],3:l[4],4:l[5],5:l[6],6:l[1], libero:l.libero }));
  const rotateAway = () => setAwayLineup(l => ({ 1:l[2],2:l[3],3:l[4],4:l[5],5:l[6],6:l[1] }));
  const reverseRotateHome = () => setHomeLineup(l => ({ 1:l[6],2:l[1],3:l[2],4:l[3],5:l[4],6:l[5], libero:l.libero }));
  const reverseRotateAway = () => setAwayLineup(l => ({ 1:l[6],2:l[1],3:l[2],4:l[3],5:l[4],6:l[5] }));

  const scorePoint = (team, x, y) => {
    if (setEnded || matchEnded) return;
    setShowPointTypePopup({ team, x, y });
  };

  const spawnConfetti = () => {
    setConfetti(Array.from({length:50},(_,i) => ({ id:i, left:Math.random()*100, delay:Math.random()*2 })));
    setTimeout(() => setConfetti([]), 4000);
  };

  const endSet = (winner, actualHome, actualAway) => {
    const ns = winner === 'home' ? { home:sets.home+1, away:sets.away } : { home:sets.home, away:sets.away+1 };
    setSets(ns);
    setSetEnded(true);
    setSetWinner(winner);
    if (heatmapData.length > 0) {
      setSavedHeatmaps(sh => [...sh, { setNumber:sets.home+sets.away+1, data:heatmapData, finalScore:`${actualHome}-${actualAway}`, winner, stats: { home:{...pointStats.home}, away:{...pointStats.away} }, homeTimeouts:[...homeTimeouts], awayTimeouts:[...awayTimeouts], scoreHistory:[...scoreHistory], substitutions:[...substitutions] }]);
    }
    const totalSets = ns.home + ns.away;
    if (totalSets >= 4 && (ns.home >= 3 || ns.away >= 3)) {
      setMatchEnded(true);
      setMatchWinner(ns.home > ns.away ? 'home' : 'away');
      setShowSaveDialog(true);
      if (ns.home > ns.away) spawnConfetti();
    } else {
      setShowLineupConfirm(true);
    }
  };

  const confirmPointType = (type) => {
    const { team: clickedTeam, x, y } = showPointTypePopup;
    const scoringTeam = type === 'block' ? (clickedTeam === 'home' ? 'away' : 'home') : clickedTeam;
    const heatmapY = type === 'block' ? (clickedTeam === 'home' ? 95 : 5) : y;
    setShowPointTypePopup(null);
    if (type === 'direct') {
      const serverId = servingTeam === 'home' ? homeLineup[1] : awayLineup[1];
      processPoint(trackPlayerStats ? serverId : null, { team: clickedTeam, type, x, heatmapY, scoringTeam });
      return;
    }
    // Check if we should show player select popup
    const shouldShowPopup = trackPlayerStats && (scoringTeam === 'home' || trackOpponentStats);
    if (shouldShowPopup) {
      setShowPlayerSelectPopup({ team: clickedTeam, type, x, y, heatmapY, scoringTeam });
    } else {
      processPoint(null, { team: clickedTeam, type, x, heatmapY, scoringTeam });
    }
  };

  const confirmPlayerSelect = (playerId) => {
    processPoint(playerId, showPlayerSelectPopup);
    setShowPlayerSelectPopup(null);
  };

  const findSlot = (pid) => {
    if (pid == null || typeof pid === 'string') return null;
    for (let pos = 1; pos <= 6; pos++) {
      let eid = homeLineup[pos];
      if (homeLineup.libero) {
        const p = players.find(pl => pl.id === homeLineup[pos]);
        if (p?.role === 'middle' && (pos === 5 || pos === 6)) eid = homeLineup.libero;
      }
      if (eid === pid) return pos;
    }
    for (let pos = 1; pos <= 6; pos++) {
      if (awayLineup[pos] === pid) return pos;
    }
    return null;
  };

  const processPoint = (playerId, data) => {
    const { team: clickedTeam, type, x, heatmapY, scoringTeam } = data;
    const playerPos = type === 'direct' ? 1 : findSlot(playerId);
    const rotation = proMode ? getRotation() : undefined;
    setHeatmapData(h => [...h, { team: clickedTeam, x, y: heatmapY, type, playerId, playerPos, srvTeam: servingTeam, ...(rotation != null && { rotation }) }]);
    setPointStats(prev => ({ ...prev, [scoringTeam]: { ...prev[scoringTeam], [type]: prev[scoringTeam][type]+1 } }));
    if (playerId != null) {
      setPlayerStats(prev => {
        const cur = prev[playerId] || { direct:0, sideout:0, block:0, attack:0, error:0, servicefault:0 };
        return { ...prev, [playerId]: { ...cur, [type]: cur[type]+1 } };
      });
    }

    let newHome = homeScore, newAway = awayScore;
    if (scoringTeam === 'home') {
      newHome++;
      setHomeScore(newHome);
      setScoreHistory(h => [...h, { score:`${newHome}-${awayScore}`, team: scoringTeam, type, playerId }]);
    } else {
      newAway++;
      setAwayScore(newAway);
      setScoreHistory(h => [...h, { score:`${homeScore}-${newAway}`, team: scoringTeam, type, playerId }]);
    }

    const isSideout = scoringTeam !== servingTeam;
    if (isSideout) {
      scoringTeam === 'home' ? rotateHome() : rotateAway();
      setServingTeam(scoringTeam);
    }

    const is5th = sets.home === 2 && sets.away === 2;
    const target = is5th ? 15 : 25;
    let setEndedNow = false;
    if (newHome >= target && newHome - newAway >= 2) { endSet('home', newHome, newAway); setEndedNow = true; }
    else if (newAway >= target && newAway - newHome >= 2) { endSet('away', newHome, newAway); setEndedNow = true; }

    // Pro panel: show after point if applicable
    if (proMode && !setEndedNow) {
      const isError = type === 'error';
      if (isSideout || isError) {
        setShowProPanel({ pointType: type, scoringTeam, servingTeam, isSideout, isError });
      }
    }
  };

  const startNewSet = (keepLineup) => {
    setHomeScore(0); setAwayScore(0);
    setScoreHistory([]); setHeatmapData([]);
    setHomeTimeouts([]); setAwayTimeouts([]);
    setSetEnded(false); setSetWinner(null);
    setShowLineupConfirm(false);
    setSubstitutions([]);
    setPointStats({ home:{direct:0,sideout:0,block:0,attack:0,error:0}, away:{direct:0,sideout:0,block:0,attack:0,error:0} });
    setServingTeam('home');
    if (!keepLineup) {
      setActiveTab('lineup');
      setBottomSheetOpen(true);
    }
  };

  const serviceFault = (servingTeamArg) => {
    if (setEnded || matchEnded) return;
    const scoringTeam = servingTeamArg === 'home' ? 'away' : 'home';
    setShowServiceFaultPopup({ scoringTeam });
  };

  const confirmServiceFault = (faultType) => {
    const { scoringTeam } = showServiceFaultPopup;
    setShowServiceFaultPopup(null);
    const serverId = trackPlayerStats ? (servingTeam === 'home' ? homeLineup[1] : awayLineup[1]) : null;
    const rotation = proMode ? getRotation() : undefined;
    setHeatmapData(h => [...h, { team: scoringTeam, x: 50, y: 50, type: 'servicefault', playerId: serverId, playerPos: 1, srvTeam: servingTeam, ...(rotation != null && { rotation }) }]);
    setPointStats(prev => ({ ...prev, [scoringTeam]: { ...prev[scoringTeam], error: prev[scoringTeam].error + 1 } }));
    if (serverId) {
      setPlayerStats(prev => {
        const cur = prev[serverId] || { direct:0, sideout:0, block:0, attack:0, error:0, servicefault:0 };
        return { ...prev, [serverId]: { ...cur, servicefault: cur.servicefault+1 } };
      });
    }

    let newHome = homeScore, newAway = awayScore;
    if (scoringTeam === 'home') {
      newHome++;
      setHomeScore(newHome);
      setScoreHistory(h => [...h, { score:`${newHome}-${awayScore}`, team: scoringTeam, type: 'servicefault', faultType, playerId: serverId }]);
    } else {
      newAway++;
      setAwayScore(newAway);
      setScoreHistory(h => [...h, { score:`${homeScore}-${newAway}`, team: scoringTeam, type: 'servicefault', faultType, playerId: serverId }]);
    }

    const isSideout = scoringTeam !== servingTeam;
    if (isSideout) {
      scoringTeam === 'home' ? rotateHome() : rotateAway();
      setServingTeam(scoringTeam);
    }

    const is5th = sets.home === 2 && sets.away === 2;
    const target = is5th ? 15 : 25;
    if (newHome >= target && newHome - newAway >= 2) endSet('home', newHome, newAway);
    else if (newAway >= target && newAway - newHome >= 2) endSet('away', newHome, newAway);
  };

  const [showTimeoutPopup, setShowTimeoutPopup] = useState(null);

  const takeTimeout = (team) => {
    if (setEnded || matchEnded) return;
    if (team === 'home' && homeTimeouts.length >= 2) { showAlert('⚠️ Max 2 timeouts per set'); return; }
    if (team === 'away' && awayTimeouts.length >= 2) { showAlert('⚠️ Max 2 timeouts per set'); return; }
    setShowTimeoutPopup(team);
  };

  const confirmTimeout = () => {
    const team = showTimeoutPopup;
    const score = `${homeScore}-${awayScore}`;
    if (team === 'home') setHomeTimeouts(t => [...t, score]);
    else setAwayTimeouts(t => [...t, score]);
    setShowTimeoutPopup(null);
  };

  const makeSubstitution = (courtPlayerId) => {
    if (!selectedBenchPlayer) return;
    if (substitutions.length >= 6) { showAlert('⚠️ Max 6 wissels per set'); setSubstitutionMode(false); setSelectedBenchPlayer(null); return; }

    // Check: bench player already on court
    const currentField = [1,2,3,4,5,6].map(p => homeLineup[p]);
    if (currentField.includes(selectedBenchPlayer)) {
      showAlert('Deze speler staat al op het veld');
      setSubstitutionMode(false); setSelectedBenchPlayer(null);
      return;
    }

    // Reverse substitution rule: bench player was subbed out earlier
    const prevOut = substitutions.find(s => s.playerOut === selectedBenchPlayer);
    if (prevOut && prevOut.playerIn !== courtPlayerId) {
      const replacerName = players.find(p => p.id === prevOut.playerIn)?.name || '?';
      showAlert(`Mag alleen terugkomen voor ${replacerName}`);
      setSubstitutionMode(false); setSelectedBenchPlayer(null);
      return;
    }

    // Reverse substitution rule: court player was subbed in earlier
    const prevIn = substitutions.find(s => s.playerIn === courtPlayerId);
    if (prevIn && prevIn.playerOut !== selectedBenchPlayer) {
      const originalName = players.find(p => p.id === prevIn.playerOut)?.name || '?';
      showAlert(`Kan alleen gewisseld worden met ${originalName}`);
      setSubstitutionMode(false); setSelectedBenchPlayer(null);
      return;
    }

    setHomeLineup(l => {
      const pos = Object.entries(l).find(([,v]) => v === courtPlayerId)?.[0];
      if (!pos) return l;
      return { ...l, [pos]: selectedBenchPlayer };
    });
    setSubstitutions(s => [...s, { playerOut:courtPlayerId, playerIn:selectedBenchPlayer }]);
    setSubstitutionMode(false);
    setSelectedBenchPlayer(null);
  };

  const saveMatch = () => {
    if (!opponentName.trim()) { showAlert('⚠️ Vul tegenstander in'); return; }
    const data = {
      id: Date.now(),
      opponent: opponentName,
      date: matchDate,
      finalScore: sets,
      winner: matchWinner,
      savedHeatmaps: savedHeatmaps || [],
      substitutions: substitutions || [],
      pointStats: pointStats || { home:{direct:0,sideout:0,block:0,attack:0,error:0}, away:{direct:0,sideout:0,block:0,attack:0,error:0} },
      playerStats: playerStats || {},
      scoreHistory: scoreHistory || [],
      formationSystem: formationSystem || '5-1'
    };
    const updated = [...savedMatches, data];
    setSavedMatches(updated);
    setShowSaveDialog(false);
    showAlert('✅ Wedstrijd opgeslagen!');
  };

  const deleteMatch = (id) => {
    setSavedMatches(sm => sm.filter(m => m.id !== id));
    showAlert('🗑️ Wedstrijd verwijderd');
  };

  const loadMatch = (match) => {
    setOpponentName(match.opponent);
    setMatchDate(match.date);
    setSets(match.finalScore);
    setMatchWinner(match.winner);
    setSavedHeatmaps(match.savedHeatmaps || []);
    setSubstitutions(match.substitutions || []);
    setPointStats(match.pointStats || { home:{direct:0,sideout:0,block:0,attack:0,error:0}, away:{direct:0,sideout:0,block:0,attack:0,error:0} });
    setPlayerStats(match.playerStats || {});
    setScoreHistory(match.scoreHistory || []);
    setFormationSystem(match.formationSystem || '5-1');
    if (match.scoreHistory && match.scoreHistory.length > 0) {
      const lastEntry = match.scoreHistory[match.scoreHistory.length - 1];
      const [h, a] = lastEntry.score.split('-').map(Number);
      setHomeScore(h);
      setAwayScore(a);
    } else {
      setHomeScore(0);
      setAwayScore(0);
    }
    setMatchEnded(true);
    setSetEnded(true);
    setBottomSheetOpen(false);
    showAlert('📊 Wedstrijd geladen');
  };

  const confirmNewMatch = () => {
    if (!opponentName.trim()) { showAlert('⚠️ Vul tegenstander in'); return; }
    setHomeScore(0); setAwayScore(0); setSets({home:0,away:0});
    setHomeTimeouts([]); setAwayTimeouts([]);
    setScoreHistory([]); setHeatmapData([]); setSavedHeatmaps([]);
    setSubstitutions([]); setSetEnded(false); setMatchEnded(false);
    setSetWinner(null); setMatchWinner(null);
    setPointStats({ home:{direct:0,sideout:0,block:0,attack:0,error:0}, away:{direct:0,sideout:0,block:0,attack:0,error:0} });
    setPlayerStats({});
    setShowNewMatchDialog(false);
    setShowServingDialog(true);
  };

  const forceEndMatch = () => {
    if (matchEnded) return;
    // Save current set data if there are points
    if (heatmapData.length > 0) {
      setSavedHeatmaps(sh => [...sh, { setNumber: sets.home + sets.away + 1, data: heatmapData, finalScore: `${homeScore}-${awayScore}`, winner: homeScore >= awayScore ? 'home' : 'away', stats: { home:{...pointStats.home}, away:{...pointStats.away} }, homeTimeouts:[...homeTimeouts], awayTimeouts:[...awayTimeouts], scoreHistory:[...scoreHistory], substitutions:[...substitutions] }]);
    }
    const winner = sets.home >= sets.away ? 'home' : 'away';
    setMatchEnded(true);
    setSetEnded(true);
    setMatchWinner(winner);
    setShowSaveDialog(true);
  };

  const undoLastPoint = () => {
    if (scoreHistory.length === 0) return;
    setShowProPanel(null);
    // If the last point ended a set, undo set-end state
    if (setEnded) {
      setSets(s => {
        const winner = setWinner;
        return winner === 'home' ? { home: s.home - 1, away: s.away } : { home: s.home, away: s.away - 1 };
      });
      setSavedHeatmaps(sh => sh.slice(0, -1));
      setSetEnded(false);
      setSetWinner(null);
      setShowLineupConfirm(false);
      if (matchEnded) {
        setMatchEnded(false);
        setMatchWinner(null);
        setShowSaveDialog(false);
      }
    }
    // Pop last scoreHistory entry
    const lastScore = scoreHistory[scoreHistory.length - 1];
    const { team: scoringTeam, type, playerId } = lastScore;
    setScoreHistory(h => h.slice(0, -1));
    // Pop last heatmapData entry
    const lastHeatmap = heatmapData[heatmapData.length - 1];
    const srvTeam = lastHeatmap?.srvTeam;
    setHeatmapData(h => h.slice(0, -1));
    // Decrement score
    if (scoringTeam === 'home') setHomeScore(s => s - 1);
    else setAwayScore(s => s - 1);
    // Reverse pointStats
    const statType = type === 'servicefault' ? 'error' : type;
    setPointStats(prev => ({ ...prev, [scoringTeam]: { ...prev[scoringTeam], [statType]: prev[scoringTeam][statType] - 1 } }));
    // Reverse playerStats
    if (playerId != null) {
      const playerStatType = type === 'servicefault' ? 'servicefault' : type;
      setPlayerStats(prev => {
        const cur = prev[playerId];
        if (!cur) return prev;
        return { ...prev, [playerId]: { ...cur, [playerStatType]: cur[playerStatType] - 1 } };
      });
    }
    // Reverse rotation if side-out occurred
    if (srvTeam != null && scoringTeam !== srvTeam) {
      scoringTeam === 'home' ? reverseRotateHome() : reverseRotateAway();
      setServingTeam(srvTeam);
    }
  };

  const fieldPlayers = Object.values(homeLineup).slice(0,6);
  const benchPlayers = players.filter(p => !fieldPlayers.includes(p.id) && p.id !== homeLineup.libero);

  return {
    // UI state
    isMobile, isTablet, isPortrait, bottomSheetOpen, setBottomSheetOpen, activeTab, setActiveTab,
    // Player state
    players, setPlayers, updatePlayer, addPlayer,
    // Lineup state
    homeLineup, setHomeLineup, awayLineup, setAwayLineup, updateLineup, confirmLineup,
    // Match state
    homeScore, awayScore, sets, homeTimeouts, awayTimeouts, servingTeam, setServingTeam,
    scoreHistory, showHistoryDropdown, setShowHistoryDropdown,
    heatmapData, savedHeatmaps, showHeatmapOverlay, setShowHeatmapOverlay,
    setEnded, matchEnded, setWinner, matchWinner,
    // Match actions
    scorePoint, confirmPointType, confirmPlayerSelect, endSet, startNewSet,
    serviceFault, confirmServiceFault, takeTimeout, undoLastPoint,
    // Substitution
    substitutions, substitutionMode, setSubstitutionMode,
    selectedBenchPlayer, setSelectedBenchPlayer, makeSubstitution,
    fieldPlayers, benchPlayers, formationSystem, switchFormation,
    // Match management
    teamName, setTeamName, opponentName, setOpponentName, matchDate, setMatchDate,
    savedMatches, setSavedMatches, saveMatch, loadMatch, confirmNewMatch, forceEndMatch, deleteMatch,
    pointStats, playerStats,
    // Dialogs
    alertMessage, setAlertMessage, showAlert,
    showServingDialog, setShowServingDialog,
    showPointTypePopup, setShowPointTypePopup,
    showSaveDialog, setShowSaveDialog,
    showNewMatchDialog, setShowNewMatchDialog,
    showServiceFaultPopup, setShowServiceFaultPopup,
    showPlayerSelectPopup, setShowPlayerSelectPopup,
    showTimeoutPopup, setShowTimeoutPopup, confirmTimeout,
    showLineupConfirm, setShowLineupConfirm,
    // Settings
    trackPlayerStats, setTrackPlayerStats,
    trackOpponentStats, setTrackOpponentStats,
    showSettingsModal, setShowSettingsModal,
    showAttackLines, setShowAttackLines,
    homeColor, setHomeColor, awayColor, setAwayColor,
    showDwfImportModal, setShowDwfImportModal,
    opponentPlayers, setOpponentPlayers,
    showAboutModal, setShowAboutModal,
    showRoleMismatchPopup, setShowRoleMismatchPopup, finalizeLineup,
    spawnConfetti,
    // Pro mode
    proMode, setProMode,
    showProPanel, confirmProData, skipProPanel, getRotation,
    // Effects
    confetti,
  };
}
