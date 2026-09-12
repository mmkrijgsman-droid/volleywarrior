import { useEffect, useMemo, useState } from 'react';
import { getTeamConfig } from '../helpers/teamConfig';
import { fetchTeamMatches } from '../helpers/nevoboCompetitie';
import { analyzeGames, buildBriefing, gamesFromNevobo, gamesFromSaved } from '../helpers/scouting';

const card = { background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12, padding: '12px 14px', marginBottom: 12 };
const toneColor = { good: '#16a34a', watch: '#dc2626', info: '#6b7280' };

function SetBar({ pct }) {
  const c = pct >= 60 ? '#16a34a' : pct <= 40 ? '#dc2626' : '#eab308';
  return (
    <div style={{ flex: 1, height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct ?? 0}%`, background: c, opacity: 0.8 }} />
    </div>
  );
}

function ProfileCard({ title, p, color }) {
  if (!p || !p.played) {
    return (
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 14, color: color || '#1e293b', marginBottom: 4 }}>{title}</div>
        <div style={{ color: '#9ca3af', fontSize: 12 }}>Nog geen gespeelde wedstrijden.</div>
      </div>
    );
  }
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: color || '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ fontSize: 12, color: '#6b7280', flexShrink: 0 }}>{p.won}-{p.lost} ({p.winPct}%) · sets {p.setsFor}-{p.setsAgainst}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
        {[1, 2, 3, 4, 5].filter(i => p.setWinRate[i] != null).map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 38, fontSize: 11, color: '#6b7280' }}>Set {i}</span>
            <SetBar pct={p.setWinRate[i]} />
            <span style={{ width: 34, textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#374151' }}>{p.setWinRate[i]}%</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: 11, color: '#6b7280' }}>
        {p.avgMarginWon != null && <span>gem. winst +{p.avgMarginWon}</span>}
        {p.avgMarginLost != null && <span>gem. verlies −{p.avgMarginLost}</span>}
        {p.blowoutRate != null && <span>ruim: {p.blowoutRate}%</span>}
        {p.closeRate != null && <span>krap: {p.closeRate}%</span>}
        {p.fifthSet.played > 0 && <span>5e set: {p.fifthSet.won}/{p.fifthSet.played}</span>}
        {p.form.length > 0 && <span>vorm: {p.form.join(' ')}</span>}
      </div>
    </div>
  );
}

export default function PrognoseTab({ savedMatches = [] }) {
  const cfg = getTeamConfig();
  const ourProfile = useMemo(() => analyzeGames(gamesFromSaved(savedMatches)), [savedMatches]);
  const [fixtures, setFixtures] = useState(cfg.teamCode ? null : []);
  const [opp, setOpp] = useState(null);          // { code, naam }
  const [oppProfile, setOppProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!cfg.teamCode) return;
    let alive = true;
    (async () => {
      try {
        const all = await fetchTeamMatches(cfg.teamCode);
        const today = new Date().toISOString().slice(0, 10);
        const up = all
          .filter(m => (m.datum || '') >= today)
          .sort((a, b) => String(a.datum).localeCompare(String(b.datum)))
          .slice(0, 8);
        if (alive) setFixtures(up);
      } catch (e) {
        if (alive) { setError(e.message || 'Agenda laden mislukt'); setFixtures([]); }
      }
    })();
    return () => { alive = false; };
  }, [cfg.teamCode]);

  const scout = async (fixture) => {
    const home = fixture.home.code === cfg.teamCode;
    const oppCode = home ? fixture.away.code : fixture.home.code;
    const oppNaam = home ? fixture.away.naam : fixture.home.naam;
    if (!oppCode) { setError('Geen teamcode voor deze tegenstander.'); return; }
    setOpp({ code: oppCode, naam: oppNaam }); setOppProfile(null); setError(null); setLoading(true);
    try {
      const matches = await fetchTeamMatches(oppCode);
      setOppProfile(analyzeGames(gamesFromNevobo(matches, oppCode)));
    } catch (e) {
      setError(e.message || 'Scouting mislukt');
    } finally {
      setLoading(false);
    }
  };

  const briefing = useMemo(
    () => (opp && oppProfile ? buildBriefing(ourProfile, oppProfile, opp.naam) : []),
    [ourProfile, oppProfile, opp]
  );

  return (
    <div>
      <div style={{ color: '#1e293b', fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Prognose &amp; scouting</div>

      {!cfg.teamCode && (
        <div style={{ ...card, color: '#6b7280', fontSize: 13 }}>
          Stel eerst je team in bij <b>Instellingen → Mijn team</b>. Dan haal ik je programma op en kun je de volgende tegenstander scouten.
        </div>
      )}

      <ProfileCard title={`Wij · ${cfg.teamName || 'eigen team'}`} p={ourProfile} color="#dc2626" />

      {cfg.teamCode && (
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Scout een tegenstander</div>
          {fixtures === null ? <div style={{ color: '#9ca3af', fontSize: 12 }}>Programma laden…</div>
            : fixtures.length === 0 ? <div style={{ color: '#9ca3af', fontSize: 12 }}>Geen komende wedstrijden gevonden.</div>
              : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {fixtures.map(m => {
                    const home = m.home.code === cfg.teamCode;
                    const naam = home ? m.away.naam : m.home.naam;
                    const code = home ? m.away.code : m.home.code;
                    const active = opp && code === opp.code;
                    return (
                      <button key={m.uuid} onClick={() => scout(m)}
                        style={{ background: active ? 'rgba(37,99,235,0.12)' : '#f3f4f6', color: active ? '#2563eb' : '#374151', border: `1px solid ${active ? 'rgba(37,99,235,0.35)' : '#e5e7eb'}`, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {(m.datum || '').slice(5)} {naam}
                      </button>
                    );
                  })}
                </div>
              )}
        </div>
      )}

      {error && <div style={{ ...card, color: '#dc2626', fontSize: 12 }}>{error}</div>}
      {loading && <div style={{ ...card, color: '#9ca3af', fontSize: 12 }}>Scouten…</div>}

      {opp && oppProfile && <ProfileCard title={`Tegenstander · ${opp.naam}`} p={oppProfile} color="#2563eb" />}

      {opp && oppProfile && (
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', letterSpacing: 0.5, marginBottom: 8 }}>WEDSTRIJD-BRIEFING</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {briefing.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: toneColor[b.tone], marginTop: 5, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.4 }}>{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
