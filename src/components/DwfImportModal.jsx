import { useState, useRef } from 'react';
import { searchClubs, fetchTeams, fetchMatches, openDwfLogin, fetchTeamPlayers, mapToAppPlayers, mapToOpponentPlayers } from '../helpers/dwfImport';

const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:150 };
const card = { background:'#ffffff', border:'1px solid rgba(220,38,38,0.15)', borderRadius:20, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', maxWidth:340, width:'90%', padding:'28px 24px' };
const btnPrimary = { width:'100%', background:'rgba(220,38,38,0.1)', color:'#dc2626', border:'1px solid rgba(220,38,38,0.3)', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer', fontSize:14 };
const btnCancel = { width:'100%', marginTop:10, background:'#f3f4f6', color:'#6b7280', border:'1px solid #e5e7eb', borderRadius:10, padding:10, fontSize:13, cursor:'pointer', fontWeight:600 };

const MONTHS = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
const formatDate = (s) => { if (!s) return ''; const d = new Date(s); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };

export default function DwfImportModal({ onClose, mode, players, setPlayers, setTeamName, setOpponentName, setOpponentPlayers, setAwayLineup }) {
  const isOpponent = mode === 'opponent';

  // Steps: club, teams, matches, login, loading, preview, match-preview, confirm, match-confirm
  const [step, setStep] = useState('club');
  const [error, setError] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState('');

  // Club search
  const [clubQuery, setClubQuery] = useState('');
  const [clubResults, setClubResults] = useState([]);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [selectedClub, setSelectedClub] = useState(null);
  const searchTimer = useRef(null);

  // Teams
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Matches
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Auth
  const [accessToken, setAccessToken] = useState(null);

  // Players (team mode)
  const [dwfPlayers, setDwfPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());
  const [importMode, setImportMode] = useState(null);

  // Players (match mode)
  const [matchHomePlayers, setMatchHomePlayers] = useState([]);
  const [matchAwayPlayers, setMatchAwayPlayers] = useState([]);

  // ── Club search with debounce ──
  const handleClubSearch = (query) => {
    setClubQuery(query);
    setError(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.trim().length < 2) { setClubResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setClubsLoading(true);
      try { setClubResults(await searchClubs(query)); }
      catch (err) { setError(err.message); }
      setClubsLoading(false);
    }, 400);
  };

  // ── Select club → fetch teams ──
  const handleSelectClub = async (club) => {
    setSelectedClub(club);
    setStep('loading'); setLoadingMsg('Teams ophalen...'); setError(null);
    try {
      setTeams(await fetchTeams(club.code));
      setStep('teams');
    } catch (err) { setError(err.message); setStep('club'); }
  };

  // ── Select team → fetch matches ──
  const handleSelectTeam = async (team) => {
    setSelectedTeam(team);
    setStep('loading'); setLoadingMsg('Wedstrijden ophalen...'); setError(null);
    try {
      setMatches(await fetchMatches(team.teamId));
      setStep('matches');
    } catch (err) {
      // If matches fail, fall back to team players flow
      setError(null);
      if (accessToken) { await loadPlayers(team, accessToken); }
      else { setStep('login'); }
    }
  };

  // ── "Alle teamspelers" (team mode) ──
  const handleAllTeamPlayers = () => {
    setSelectedMatch(null);
    if (accessToken) { loadPlayers(selectedTeam, accessToken); }
    else { setStep('login'); }
  };

  // ── Select match ──
  const handleSelectMatch = (match) => {
    setSelectedMatch(match);
    if (accessToken) { loadMatchPlayers(match, accessToken); }
    else { setStep('login'); }
  };

  // ── DWF login ──
  const handleLogin = async () => {
    setStep('loading'); setLoadingMsg('Wachten op inloggen...'); setError(null);
    try {
      const token = await openDwfLogin();
      setAccessToken(token);
      if (selectedMatch) { await loadMatchPlayers(selectedMatch, token); }
      else { await loadPlayers(selectedTeam, token); }
    } catch (err) {
      if (err.message === 'cancelled') { setStep(selectedMatch ? 'matches' : 'matches'); return; }
      setError(err.message); setStep('login');
    }
  };

  // ── Load team players (existing flow) ──
  const loadPlayers = async (team, token) => {
    setStep('loading'); setLoadingMsg('Spelers ophalen...');
    try {
      const playerList = await fetchTeamPlayers(team.teamId, token);
      setDwfPlayers(playerList);
      setSelectedPlayers(new Set(playerList.map((_, i) => i)));
      setStep('preview');
    } catch (err) {
      if (err.message === 'UNAUTHENTICATED') { setAccessToken(null); setError('Sessie verlopen — log opnieuw in'); setStep('login'); return; }
      setError(err.message); setStep('matches');
    }
  };

  // ── Load match players (both teams) ──
  const loadMatchPlayers = async (match, token) => {
    setStep('loading'); setLoadingMsg('Spelers ophalen voor beide teams...');
    try {
      const [home, away] = await Promise.all([
        fetchTeamPlayers(match.homeTeam.code, token).catch(() => []),
        fetchTeamPlayers(match.awayTeam.code, token).catch(() => []),
      ]);
      setMatchHomePlayers(home);
      setMatchAwayPlayers(away);
      if (home.length === 0 && away.length === 0) {
        setError('Geen spelers gevonden voor deze wedstrijd');
        setStep('matches');
        return;
      }
      setStep('match-preview');
    } catch (err) {
      if (err.message === 'UNAUTHENTICATED') { setAccessToken(null); setError('Sessie verlopen — log opnieuw in'); setStep('login'); return; }
      setError(err.message); setStep('matches');
    }
  };

  // ── Toggle helpers (team mode) ──
  const togglePlayer = (idx) => {
    setSelectedPlayers(prev => { const next = new Set(prev); next.has(idx) ? next.delete(idx) : next.add(idx); return next; });
  };
  const toggleAll = () => {
    setSelectedPlayers(selectedPlayers.size === dwfPlayers.length ? new Set() : new Set(dwfPlayers.map((_, i) => i)));
  };

  // ── Team mode import ──
  const handleImport = (m) => { setImportMode(m); setStep('confirm'); };
  const confirmImport = () => {
    const chosen = dwfPlayers.filter((_, i) => selectedPlayers.has(i));
    if (isOpponent) {
      const mapped = mapToOpponentPlayers(chosen);
      setOpponentPlayers(mapped);
      setOpponentName(selectedTeam?.name || '');
      autoSetAwayLineup(mapped);
    } else {
      if (importMode === 'replace') { setPlayers(mapToAppPlayers(chosen, [])); }
      else { setPlayers(prev => [...prev, ...mapToAppPlayers(chosen, players)]); }
      if (setTeamName) setTeamName(selectedTeam?.name || '');
    }
    onClose();
  };

  // ── Match mode import ──
  const confirmMatchImport = () => {
    const selectedIsHome = selectedTeam?.teamId === selectedMatch?.homeTeam?.code;
    // In 'own' mode: selectedTeam = our team. In 'opponent' mode: selectedTeam = their team.
    const isOurTeamHome = isOpponent ? !selectedIsHome : selectedIsHome;

    const ourDwfPlayers = isOurTeamHome ? matchHomePlayers : matchAwayPlayers;
    const theirDwfPlayers = isOurTeamHome ? matchAwayPlayers : matchHomePlayers;
    const theirTeamName = isOurTeamHome ? selectedMatch?.awayTeam?.name : selectedMatch?.homeTeam?.name;

    // Import our team
    if (ourDwfPlayers.length > 0) {
      setPlayers(mapToAppPlayers(ourDwfPlayers, []));
      const ourTeamName = isOurTeamHome ? selectedMatch?.homeTeam?.name : selectedMatch?.awayTeam?.name;
      if (setTeamName) setTeamName(ourTeamName || '');
    }

    // Import opponent team
    if (theirDwfPlayers.length > 0) {
      const mapped = mapToOpponentPlayers(theirDwfPlayers);
      setOpponentPlayers(mapped);
      setOpponentName(theirTeamName || '');
      autoSetAwayLineup(mapped);
    }

    onClose();
  };

  const autoSetAwayLineup = (mapped) => {
    if (mapped.length >= 6) {
      setAwayLineup({ 1: mapped[0].id, 2: mapped[1].id, 3: mapped[2].id, 4: mapped[3].id, 5: mapped[4].id, 6: mapped[5].id });
    } else {
      const lineup = {};
      mapped.forEach((p, i) => { lineup[i + 1] = p.id; });
      for (let i = mapped.length; i < 6; i++) { lineup[i + 1] = 101 + i; }
      setAwayLineup(lineup);
    }
  };

  // ── Match mode: determine team labels ──
  const getMatchTeams = () => {
    if (!selectedMatch || !selectedTeam) return { ourName: '', theirName: '', ourPlayers: [], theirPlayers: [] };
    const selectedIsHome = selectedTeam?.teamId === selectedMatch?.homeTeam?.code;
    const isOurTeamHome = isOpponent ? !selectedIsHome : selectedIsHome;
    return {
      ourName: isOurTeamHome ? selectedMatch.homeTeam.name : selectedMatch.awayTeam.name,
      theirName: isOurTeamHome ? selectedMatch.awayTeam.name : selectedMatch.homeTeam.name,
      ourPlayers: isOurTeamHome ? matchHomePlayers : matchAwayPlayers,
      theirPlayers: isOurTeamHome ? matchAwayPlayers : matchHomePlayers,
    };
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={e => e.stopPropagation()}>

        {/* ═══ Club zoeken ═══ */}
        {step === 'club' && (
          <>
            <div style={{ textAlign:'center', fontWeight:800, fontSize:18, color:'#1e293b', marginBottom:6 }}>
              {isOpponent ? 'Tegenstander Importeren' : 'DWF Import'}
            </div>
            <div style={{ textAlign:'center', color:'#6b7280', fontSize:13, marginBottom:16, lineHeight:1.5 }}>
              {isOpponent ? 'Zoek de vereniging van de tegenstander' : 'Zoek je vereniging om spelers te importeren'}
            </div>
            {error && <div style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:8, padding:'8px 12px', color:'#dc2626', fontSize:12, marginBottom:12, textAlign:'center' }}>{error}</div>}
            <input value={clubQuery} onChange={e => handleClubSearch(e.target.value)} placeholder="Zoek op naam of plaats..." autoFocus
              style={{ width:'100%', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:'10px 12px', color:'#1e293b', fontSize:14, marginBottom:8, boxSizing:'border-box' }} />
            {clubsLoading && <div style={{ textAlign:'center', color:'#6b7280', fontSize:12, padding:8 }}>Zoeken...</div>}
            <div style={{ maxHeight:220, overflowY:'auto' }}>
              {clubResults.map((c, i) => (
                <button key={i} onClick={() => handleSelectClub(c)}
                  style={{ width:'100%', background:'#f3f4f6', border:'1px solid #e5e7eb', borderRadius:8, padding:'10px 12px', cursor:'pointer', textAlign:'left', marginBottom:4, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ color:'#1e293b', fontSize:14, fontWeight:600 }}>{c.naam}</span>
                  <span style={{ color:'#9ca3af', fontSize:11 }}>{c.plaats}</span>
                </button>
              ))}
              {clubQuery.trim().length >= 2 && !clubsLoading && clubResults.length === 0 && (
                <div style={{ textAlign:'center', color:'#9ca3af', fontSize:12, padding:12 }}>Geen resultaten</div>
              )}
            </div>
            <button onClick={onClose} style={btnCancel}>Annuleer</button>
          </>
        )}

        {/* ═══ Loading ═══ */}
        {step === 'loading' && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:32, marginBottom:12, animation:'spin 1s linear infinite' }}>⏳</div>
            <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
            <div style={{ color:'#1e293b', fontWeight:700, fontSize:15 }}>{loadingMsg}</div>
            <div style={{ color:'#6b7280', fontSize:12, marginTop:6 }}>Even geduld...</div>
          </div>
        )}

        {/* ═══ Team selecteren ═══ */}
        {step === 'teams' && (
          <>
            <div style={{ textAlign:'center', fontWeight:800, fontSize:18, color:'#1e293b', marginBottom:4 }}>{selectedClub?.naam}</div>
            <div style={{ textAlign:'center', color:'#6b7280', fontSize:13, marginBottom:16 }}>Selecteer een team</div>
            {error && <div style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:8, padding:'8px 12px', color:'#dc2626', fontSize:12, marginBottom:12, textAlign:'center' }}>{error}</div>}
            <div style={{ maxHeight:250, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
              {teams.map((t, i) => (
                <button key={i} onClick={() => handleSelectTeam(t)}
                  style={{ background:'#f3f4f6', border:'1px solid #e5e7eb', borderRadius:10, padding:'12px 14px', cursor:'pointer', textAlign:'left', color:'#1e293b', fontSize:14, fontWeight:600 }}>
                  {t.name}
                </button>
              ))}
            </div>
            <button onClick={() => { setStep('club'); setError(null); }} style={btnCancel}>← Terug</button>
          </>
        )}

        {/* ═══ Wedstrijden ═══ */}
        {step === 'matches' && (
          <>
            <div style={{ textAlign:'center', fontWeight:800, fontSize:18, color:'#1e293b', marginBottom:4 }}>{selectedTeam?.name}</div>
            {error && <div style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:8, padding:'8px 12px', color:'#dc2626', fontSize:12, marginBottom:12, textAlign:'center' }}>{error}</div>}
            <button onClick={handleAllTeamPlayers}
              style={{ ...btnPrimary, marginBottom:12 }}>
              Alle teamspelers importeren
            </button>
            <div style={{ textAlign:'center', color:'#9ca3af', fontSize:11, marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ flex:1, height:1, background:'#e5e7eb' }} />
              <span>of selecteer een wedstrijd</span>
              <div style={{ flex:1, height:1, background:'#e5e7eb' }} />
            </div>
            <div style={{ maxHeight:220, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
              {matches.length === 0 && (
                <div style={{ textAlign:'center', color:'#9ca3af', fontSize:12, padding:12 }}>Geen wedstrijden gevonden</div>
              )}
              {matches.map((m, i) => {
                const isHome = m.homeTeam.code === selectedTeam?.teamId;
                const opponent = isHome ? m.awayTeam.name : m.homeTeam.name;
                const prefix = isHome ? 'vs' : '@';
                return (
                  <button key={i} onClick={() => handleSelectMatch(m)}
                    style={{ background:'#f3f4f6', border:'1px solid #e5e7eb', borderRadius:8, padding:'10px 12px', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ color:'#6b7280', fontSize:11, fontWeight:600, minWidth:42 }}>{formatDate(m.datum)}</span>
                    <span style={{ color:'#1e293b', fontSize:13, fontWeight:600, flex:1 }}>{prefix} {opponent}</span>
                    {m.uitslag ? (
                      <span style={{ color: (isHome ? m.uitslag.sets_a > m.uitslag.sets_b : m.uitslag.sets_b > m.uitslag.sets_a) ? '#16a34a' : '#dc2626', fontSize:12, fontWeight:800, minWidth:28, textAlign:'right' }}>
                        {m.uitslag.code}
                      </span>
                    ) : (
                      <span style={{ color:'#9ca3af', fontSize:10, fontWeight:600 }}>gepland</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button onClick={() => { setStep('teams'); setError(null); }} style={btnCancel}>← Terug</button>
          </>
        )}

        {/* ═══ DWF Login ═══ */}
        {step === 'login' && (
          <>
            <div style={{ textAlign:'center', fontWeight:800, fontSize:18, color:'#1e293b', marginBottom:6 }}>Inloggen bij DWF</div>
            <div style={{ textAlign:'center', color:'#6b7280', fontSize:13, marginBottom:6, lineHeight:1.5 }}>
              Om spelers op te halen moet je inloggen met je Nevobo account.
            </div>
            {error && <div style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:8, padding:'8px 12px', color:'#dc2626', fontSize:12, marginBottom:12, textAlign:'center' }}>{error}</div>}
            <button onClick={handleLogin} style={{ ...btnPrimary, marginTop:12 }}>Inloggen bij Nevobo</button>
            <button onClick={() => { setStep('matches'); setError(null); }} style={btnCancel}>← Terug</button>
          </>
        )}

        {/* ═══ Team spelers preview (existing flow) ═══ */}
        {step === 'preview' && (
          <>
            <div style={{ textAlign:'center', fontWeight:800, fontSize:18, color:'#1e293b', marginBottom:4 }}>{selectedTeam?.name}</div>
            <div style={{ textAlign:'center', color:'#6b7280', fontSize:12, marginBottom:12 }}>{dwfPlayers.length} spelers gevonden</div>
            <button onClick={toggleAll}
              style={{ width:'100%', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 10px', fontSize:12, color:'#6b7280', cursor:'pointer', marginBottom:8, fontWeight:600 }}>
              {selectedPlayers.size === dwfPlayers.length ? 'Deselecteer alles' : 'Selecteer alles'}
            </button>
            <div style={{ maxHeight:220, overflowY:'auto', marginBottom:12 }}>
              {dwfPlayers.map((p, i) => (
                <label key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 8px', borderRadius:8, cursor:'pointer', background: selectedPlayers.has(i) ? (isOpponent ? 'rgba(37,99,235,0.04)' : 'rgba(220,38,38,0.04)') : 'transparent', marginBottom:2 }}>
                  <input type="checkbox" checked={selectedPlayers.has(i)} onChange={() => togglePlayer(i)} style={{ accentColor: isOpponent ? '#2563eb' : '#dc2626' }} />
                  <span style={{ background: isOpponent ? 'rgba(37,99,235,0.1)' : 'rgba(220,38,38,0.1)', color: isOpponent ? '#2563eb' : '#dc2626', borderRadius:6, padding:'2px 8px', fontSize:13, fontWeight:800, minWidth:32, textAlign:'center' }}>{p.number}</span>
                  <span style={{ color:'#1e293b', fontSize:13, fontWeight:600, flex:1 }}>{p.name}</span>
                  {p.isLibero && <span style={{ background:'rgba(234,179,8,0.15)', color:'#ca8a04', borderRadius:4, padding:'1px 6px', fontSize:10, fontWeight:700 }}>L</span>}
                  {p.isCaptain && <span style={{ background:'rgba(37,99,235,0.1)', color:'#2563eb', borderRadius:4, padding:'1px 6px', fontSize:10, fontWeight:700 }}>C</span>}
                </label>
              ))}
            </div>
            {isOpponent ? (
              <button onClick={() => handleImport('opponent')} style={btnPrimary}>Importeer als tegenstander</button>
            ) : (
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => handleImport('replace')} style={{ flex:1, ...btnPrimary, width:'auto' }}>Vervangen</button>
                <button onClick={() => handleImport('add')} style={{ flex:1, background:'#f3f4f6', color:'#1e293b', border:'1px solid #e5e7eb', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer', fontSize:14 }}>Toevoegen</button>
              </div>
            )}
            <button onClick={() => setStep('matches')} style={btnCancel}>← Terug</button>
          </>
        )}

        {/* ═══ Wedstrijd spelers preview (match flow) ═══ */}
        {step === 'match-preview' && (() => {
          const { ourName, theirName, ourPlayers, theirPlayers } = getMatchTeams();
          return (
            <>
              <div style={{ textAlign:'center', fontWeight:800, fontSize:16, color:'#1e293b', marginBottom:4 }}>
                {selectedMatch?.homeTeam?.name} — {selectedMatch?.awayTeam?.name}
              </div>
              <div style={{ textAlign:'center', color:'#6b7280', fontSize:12, marginBottom:12 }}>
                {formatDate(selectedMatch?.datum)} {selectedMatch?.uitslag ? `• ${selectedMatch.uitslag.code}` : ''}
              </div>
              <div style={{ maxHeight:280, overflowY:'auto', marginBottom:12 }}>
                {/* Our team */}
                <div style={{ color:'#dc2626', fontWeight:700, fontSize:12, marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ color:'#dc2626' }}>●</span> {ourName} <span style={{ color:'#9ca3af', fontWeight:400 }}>({ourPlayers.length} spelers)</span>
                </div>
                {ourPlayers.length === 0 && <div style={{ color:'#9ca3af', fontSize:12, padding:'4px 8px', marginBottom:8 }}>Geen spelers gevonden</div>}
                {ourPlayers.map((p, i) => (
                  <div key={`h-${i}`} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', borderRadius:6, background:'rgba(220,38,38,0.03)', marginBottom:2 }}>
                    <span style={{ background:'rgba(220,38,38,0.1)', color:'#dc2626', borderRadius:5, padding:'1px 7px', fontSize:12, fontWeight:800, minWidth:28, textAlign:'center' }}>{p.number}</span>
                    <span style={{ color:'#1e293b', fontSize:12, fontWeight:600, flex:1 }}>{p.name}</span>
                    {p.isLibero && <span style={{ background:'rgba(234,179,8,0.15)', color:'#ca8a04', borderRadius:4, padding:'1px 5px', fontSize:9, fontWeight:700 }}>L</span>}
                    {p.isCaptain && <span style={{ background:'rgba(37,99,235,0.1)', color:'#2563eb', borderRadius:4, padding:'1px 5px', fontSize:9, fontWeight:700 }}>C</span>}
                  </div>
                ))}
                {/* Opponent team */}
                <div style={{ color:'#2563eb', fontWeight:700, fontSize:12, marginTop:10, marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ color:'#2563eb' }}>●</span> {theirName} <span style={{ color:'#9ca3af', fontWeight:400 }}>({theirPlayers.length} spelers)</span>
                </div>
                {theirPlayers.length === 0 && <div style={{ color:'#9ca3af', fontSize:12, padding:'4px 8px' }}>Geen spelers gevonden</div>}
                {theirPlayers.map((p, i) => (
                  <div key={`a-${i}`} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', borderRadius:6, background:'rgba(37,99,235,0.03)', marginBottom:2 }}>
                    <span style={{ background:'rgba(37,99,235,0.1)', color:'#2563eb', borderRadius:5, padding:'1px 7px', fontSize:12, fontWeight:800, minWidth:28, textAlign:'center' }}>{p.number}</span>
                    <span style={{ color:'#1e293b', fontSize:12, fontWeight:600, flex:1 }}>{p.name}</span>
                    {p.isLibero && <span style={{ background:'rgba(234,179,8,0.15)', color:'#ca8a04', borderRadius:4, padding:'1px 5px', fontSize:9, fontWeight:700 }}>L</span>}
                    {p.isCaptain && <span style={{ background:'rgba(37,99,235,0.1)', color:'#2563eb', borderRadius:4, padding:'1px 5px', fontSize:9, fontWeight:700 }}>C</span>}
                  </div>
                ))}
              </div>
              <button onClick={() => setStep('match-confirm')} style={btnPrimary}>Importeer beide teams</button>
              <button onClick={() => setStep('matches')} style={btnCancel}>← Terug</button>
            </>
          );
        })()}

        {/* ═══ Bevestig: team mode ═══ */}
        {step === 'confirm' && (
          <>
            <div style={{ textAlign:'center', fontWeight:800, fontSize:18, color:'#1e293b', marginBottom:12 }}>Bevestig import</div>
            <div style={{ textAlign:'center', color:'#374151', fontSize:14, marginBottom:8 }}>
              {isOpponent
                ? <>{selectedPlayers.size} speler{selectedPlayers.size !== 1 ? 's' : ''} importeren als tegenstander?</>
                : <>{selectedPlayers.size} speler{selectedPlayers.size !== 1 ? 's' : ''} {importMode === 'replace' ? 'vervangen' : 'toevoegen'}?</>}
            </div>
            {isOpponent && (
              <div style={{ background:'rgba(37,99,235,0.08)', border:'1px solid rgba(37,99,235,0.2)', borderRadius:8, padding:'8px 12px', color:'#1e40af', fontSize:12, marginBottom:16, textAlign:'center' }}>
                Teamnaam "{selectedTeam?.name}" wordt automatisch ingevuld
              </div>
            )}
            {!isOpponent && importMode === 'replace' && (
              <div style={{ background:'rgba(234,179,8,0.1)', border:'1px solid rgba(234,179,8,0.3)', borderRadius:8, padding:'8px 12px', color:'#92400e', fontSize:12, marginBottom:16, textAlign:'center' }}>
                Let op: alle huidige spelers worden vervangen!
              </div>
            )}
            <button onClick={confirmImport} style={btnPrimary}>
              {isOpponent ? 'Importeer' : (importMode === 'replace' ? 'Vervangen' : 'Toevoegen')}
            </button>
            <button onClick={() => setStep('preview')} style={btnCancel}>← Terug</button>
          </>
        )}

        {/* ═══ Bevestig: match mode ═══ */}
        {step === 'match-confirm' && (() => {
          const { ourName, theirName, ourPlayers, theirPlayers } = getMatchTeams();
          return (
            <>
              <div style={{ textAlign:'center', fontWeight:800, fontSize:18, color:'#1e293b', marginBottom:12 }}>Bevestig import</div>
              <div style={{ textAlign:'center', color:'#374151', fontSize:14, marginBottom:12, lineHeight:1.6 }}>
                <span style={{ color:'#dc2626' }}>●</span> {ourName}: {ourPlayers.length} spelers → eigen team<br/>
                <span style={{ color:'#2563eb' }}>●</span> {theirName}: {theirPlayers.length} spelers → tegenstander
              </div>
              <div style={{ background:'rgba(234,179,8,0.1)', border:'1px solid rgba(234,179,8,0.3)', borderRadius:8, padding:'8px 12px', color:'#92400e', fontSize:12, marginBottom:16, textAlign:'center' }}>
                Huidige spelers worden vervangen door de wedstrijd-selectie
              </div>
              <button onClick={confirmMatchImport} style={btnPrimary}>Importeer</button>
              <button onClick={() => setStep('match-preview')} style={btnCancel}>← Terug</button>
            </>
          );
        })()}

        <div style={{ color:'#9ca3af', fontSize:10, textAlign:'center', marginTop:12, lineHeight:1.5 }}>
          Data via Nevobo API — VolleyWarrior is niet gelieerd aan de Nevobo
        </div>
      </div>
    </div>
  );
}
