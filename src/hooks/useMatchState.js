import { useState, useEffect } from 'react';

export default function useMatchState() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('players');
  const [isMobile, setIsMobile] = useState(false);

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
  const [substitutionMode, setSubstitutionMode] = useState(false);
  const [selectedBenchPlayer, setSelectedBenchPlayer] = useState(null);

  // detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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

  const confirmLineup = () => {
    setBottomSheetOpen(false);
    if (sets.home === 0 && sets.away === 0 && homeScore === 0 && awayScore === 0) {
      setShowServingDialog(true);
    }
  };

  const rotateHome = () => setHomeLineup(l => ({ 1:l[2],2:l[3],3:l[4],4:l[5],5:l[6],6:l[1], libero:l.libero }));
  const rotateAway = () => setAwayLineup(l => ({ 1:l[2],2:l[3],3:l[4],4:l[5],5:l[6],6:l[1] }));

  const scorePoint = (team, x, y) => {
    if (setEnded || matchEnded) return;
    setShowPointTypePopup({ team, x, y });
  };

  const spawnConfetti = () => {
    setConfetti(Array.from({length:50},(_,i) => ({ id:i, left:Math.random()*100, delay:Math.random()*2 })));
    setTimeout(() => setConfetti([]), 4000);
  };

  const endSet = (winner) => {
    const ns = winner === 'home' ? { home:sets.home+1, away:sets.away } : { home:sets.home, away:sets.away+1 };
    setSets(ns);
    setSetEnded(true);
    setSetWinner(winner);
    if (heatmapData.length > 0) {
      setSavedHeatmaps(sh => [...sh, { setNumber:sets.home+sets.away+1, data:heatmapData, finalScore:`${homeScore}-${awayScore}`, winner }]);
    }
    if (ns.home === 3 || ns.away === 3) {
      setMatchEnded(true);
      setMatchWinner(ns.home === 3 ? 'home' : 'away');
      setShowSaveDialog(true);
      if (winner === 'home') spawnConfetti();
    } else {
      setShowLineupConfirm(true);
    }
  };

  const confirmPointType = (type) => {
    const { team, x, y } = showPointTypePopup;
    setHeatmapData(h => [...h, { team, x, y, type }]);
    setPointStats(prev => ({ ...prev, [team]: { ...prev[team], [type]: prev[team][type]+1 } }));

    let newHome = homeScore, newAway = awayScore;
    if (team === 'home') {
      newHome++;
      setHomeScore(newHome);
      setScoreHistory(h => [...h, { score:`${newHome}-${awayScore}`, team, type }]);
    } else {
      newAway++;
      setAwayScore(newAway);
      setScoreHistory(h => [...h, { score:`${homeScore}-${newAway}`, team, type }]);
    }

    if (team !== servingTeam) {
      team === 'home' ? rotateHome() : rotateAway();
      setServingTeam(team);
    }

    const is5th = sets.home === 2 && sets.away === 2;
    const target = is5th ? 15 : 25;
    if (newHome >= target && newHome - newAway >= 2) endSet('home');
    else if (newAway >= target && newAway - newHome >= 2) endSet('away');

    setShowPointTypePopup(null);
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
    setHeatmapData(h => [...h, { team: scoringTeam, x: 50, y: 50, type: 'servicefault' }]);
    setPointStats(prev => ({ ...prev, [scoringTeam]: { ...prev[scoringTeam], error: prev[scoringTeam].error + 1 } }));

    let newHome = homeScore, newAway = awayScore;
    if (scoringTeam === 'home') {
      newHome++;
      setHomeScore(newHome);
      setScoreHistory(h => [...h, { score:`${newHome}-${awayScore}`, team: scoringTeam, type: 'servicefault', faultType }]);
    } else {
      newAway++;
      setAwayScore(newAway);
      setScoreHistory(h => [...h, { score:`${homeScore}-${newAway}`, team: scoringTeam, type: 'servicefault', faultType }]);
    }

    if (scoringTeam !== servingTeam) {
      scoringTeam === 'home' ? rotateHome() : rotateAway();
      setServingTeam(scoringTeam);
    }

    const is5th = sets.home === 2 && sets.away === 2;
    const target = is5th ? 15 : 25;
    if (newHome >= target && newHome - newAway >= 2) endSet('home');
    else if (newAway >= target && newAway - newHome >= 2) endSet('away');
  };

  const [showTimeoutPopup, setShowTimeoutPopup] = useState(null);

  const takeTimeout = (team) => {
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
      scoreHistory: scoreHistory || []
    };
    const updated = [...savedMatches, data];
    setSavedMatches(updated);
    setShowSaveDialog(false);
    showAlert('✅ Wedstrijd opgeslagen!');
  };

  const loadMatch = (match) => {
    setOpponentName(match.opponent);
    setMatchDate(match.date);
    setSets(match.finalScore);
    setMatchWinner(match.winner);
    setSavedHeatmaps(match.savedHeatmaps || []);
    setSubstitutions(match.substitutions || []);
    setPointStats(match.pointStats || { home:{direct:0,sideout:0,block:0,attack:0,error:0}, away:{direct:0,sideout:0,block:0,attack:0,error:0} });
    setScoreHistory(match.scoreHistory || []);
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
    setShowNewMatchDialog(false);
    setShowServingDialog(true);
  };

  const fieldPlayers = Object.values(homeLineup).slice(0,6);
  const benchPlayers = players.filter(p => !fieldPlayers.includes(p.id) && p.id !== homeLineup.libero);

  return {
    // UI state
    isMobile, bottomSheetOpen, setBottomSheetOpen, activeTab, setActiveTab,
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
    scorePoint, confirmPointType, endSet, startNewSet,
    serviceFault, confirmServiceFault, takeTimeout,
    spawnConfetti,
    // Substitution
    substitutions, substitutionMode, setSubstitutionMode,
    selectedBenchPlayer, setSelectedBenchPlayer, makeSubstitution,
    fieldPlayers, benchPlayers,
    // Match management
    opponentName, setOpponentName, matchDate, setMatchDate,
    savedMatches, setSavedMatches, saveMatch, loadMatch, confirmNewMatch,
    pointStats,
    // Dialogs
    alertMessage, setAlertMessage, showAlert,
    showServingDialog, setShowServingDialog,
    showPointTypePopup, setShowPointTypePopup,
    showSaveDialog, setShowSaveDialog,
    showNewMatchDialog, setShowNewMatchDialog,
    showServiceFaultPopup, setShowServiceFaultPopup,
    showTimeoutPopup, setShowTimeoutPopup, confirmTimeout,
    showLineupConfirm, setShowLineupConfirm,
    // Effects
    confetti,
  };
}
