import { useState } from 'react';
import { buildMatchReport } from '../helpers/matchReport';

export default function MatchesTab({ homeScore, awayScore, sets, opponentName, savedMatches, loadMatch, setShowNewMatchDialog, teamName, players, forceEndMatch, matchEnded, deleteMatch }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [report, setReport] = useState(null);

  const downloadPDF = async (m) => {
    // jspdf + html2canvas lazy laden: alleen bij export, niet in de hoofd-bundle.
    const { generateMatchPDF } = await import('../helpers/pdfExport');
    generateMatchPDF({
      sets: m.finalScore,
      matchWinner: m.winner,
      opponentName: m.opponent,
      teamName: teamName || 'Thuis',
      matchDate: m.date,
      savedHeatmaps: m.savedHeatmaps || [],
      pointStats: m.pointStats,
      playerStats: m.playerStats,
      players: players || [],
      substitutions: m.substitutions || [],
      formationSystem: m.formationSystem || '5-1',
    });
  };

  const hasActiveMatch = (homeScore > 0 || awayScore > 0 || sets.home > 0 || sets.away > 0) && !matchEnded;

  return (
    <div>
      <div style={{ color:'#1e293b', fontWeight:700, fontSize:14, marginBottom:12 }}>Wedstrijden Beheer</div>
      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
        <button onClick={() => setShowNewMatchDialog(true)}
          style={{ flex:1, background:'rgba(34,197,94,0.1)', color:'#16a34a', border:'1px solid rgba(34,197,94,0.3)', borderRadius:10, padding:'11px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
          ➕ Nieuw
        </button>
        {hasActiveMatch && (
          <button onClick={forceEndMatch}
            style={{ flex:1, background:'rgba(220,38,38,0.1)', color:'#dc2626', border:'1px solid rgba(220,38,38,0.3)', borderRadius:10, padding:'11px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            ⏹ Stoppen
          </button>
        )}
      </div>

      <div style={{ background:'rgba(0,0,0,0.03)', borderRadius:10, padding:'10px 12px', marginBottom:12, border:'1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ color:'#6b7280', fontSize:12 }}>Huidige stand:</div>
        <div style={{ color:'#1e293b', fontWeight:700, fontSize:16 }}>{homeScore} – {awayScore}</div>
        <div style={{ color:'#6b7280', fontSize:12 }}>Sets: {sets.home} – {sets.away}</div>
        {opponentName && <div style={{ color:'#6b7280', fontSize:12 }}>vs. {opponentName}</div>}
      </div>
      {savedMatches.length === 0 ? (
        <div style={{ color:'#6b7280', fontSize:12, textAlign:'center', padding:16 }}>Nog geen wedstrijden opgeslagen</div>
      ) : (
        savedMatches.slice().reverse().map(m => (
          <div key={m.id} style={{ background:'rgba(0,0,0,0.02)', border:'1px solid rgba(0,0,0,0.06)', borderRadius:10, padding:'10px 12px', marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
              <span style={{ color:'#1e293b', fontWeight:600, fontSize:13 }}>{m.opponent}</span>
              <span style={{ color: m.winner==='home' ? '#16a34a' : '#dc2626', fontSize:12, fontWeight:700 }}>
                {m.finalScore.home}–{m.finalScore.away}
              </span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ color:'#6b7280', fontSize:11 }}>{new Date(m.date).toLocaleDateString('nl-NL')}</div>
              <div style={{ display:'flex', gap:6 }}>
                <button
                  onClick={() => downloadPDF(m)}
                  style={{ background:'rgba(220,38,38,0.08)', color:'#dc2626', border:'1px solid rgba(220,38,38,0.3)', borderRadius:6, padding:'4px 12px', fontSize:11, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                  <img src="/icons/set.svg" alt="" style={{ width:14, height:14 }} /> PDF
                </button>
                <button
                  onClick={() => setReport(buildMatchReport(m, players, teamName || 'Ons team'))}
                  style={{ background:'rgba(0,0,0,0.03)', color:'#374151', border:'1px solid rgba(0,0,0,0.1)', borderRadius:6, padding:'4px 12px', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                  📝 Verslag
                </button>
                <button
                  onClick={() => loadMatch(m)}
                  style={{ background:'rgba(59,130,246,0.08)', color:'#2563eb', border:'1px solid rgba(59,130,246,0.3)', borderRadius:6, padding:'4px 12px', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                  📊 Bekijk
                </button>
                {confirmDeleteId === m.id ? (
                  <button
                    onClick={() => { deleteMatch(m.id); setConfirmDeleteId(null); }}
                    style={{ background:'rgba(220,38,38,0.15)', color:'#dc2626', border:'1px solid rgba(220,38,38,0.4)', borderRadius:6, padding:'4px 10px', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                    Zeker?
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(m.id)}
                    style={{ background:'rgba(0,0,0,0.03)', color:'#6b7280', border:'1px solid rgba(0,0,0,0.08)', borderRadius:6, padding:'4px 8px', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center' }}>
                    🗑️
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      {report != null && (
        <div onClick={() => setReport(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'#fff', border:'1px solid rgba(220,38,38,0.15)', borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', maxWidth:420, width:'100%', maxHeight:'85vh', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'16px 18px 10px', fontWeight:800, fontSize:15, color:'#1e293b' }}>Wedstrijdverslag</div>
            <div style={{ padding:'0 18px', overflowY:'auto', whiteSpace:'pre-wrap', fontSize:13, lineHeight:1.5, color:'#374151' }}>{report}</div>
            <div style={{ display:'flex', gap:8, padding:16 }}>
              <button onClick={() => { try { navigator.clipboard?.writeText(report); } catch (_) {} }}
                style={{ flex:1, background:'rgba(220,38,38,0.1)', color:'#dc2626', border:'1px solid rgba(220,38,38,0.3)', borderRadius:10, padding:10, fontWeight:700, cursor:'pointer', fontSize:13 }}>
                Kopieer
              </button>
              <button onClick={() => setReport(null)}
                style={{ flex:1, background:'#f3f4f6', color:'#6b7280', border:'1px solid #e5e7eb', borderRadius:10, padding:10, fontWeight:700, cursor:'pointer', fontSize:13 }}>
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
