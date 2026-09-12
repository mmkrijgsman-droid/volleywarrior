import { useState } from 'react';
import { fetchClubTeams } from '../helpers/nevoboCompetitie';
import { getTeamConfig, setTeamConfig } from '../helpers/teamConfig';

const box = { width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box', color: '#1e293b' };

/**
 * Instellingen-sectie: kies je Nevobo-team (clubcode → team). Nodig voor
 * programma, uitslagen en de prognose. Opslag via helpers/teamConfig.
 */
export default function TeamSetup() {
  const cfg = getTeamConfig();
  const [clubCode, setClubCode] = useState(cfg.clubCode || 'CKL9Y5O');
  const [teams, setTeams] = useState([]);
  const [teamCode, setTeamCode] = useState(cfg.teamCode || '');
  const [status, setStatus] = useState(cfg.teamName ? { kind: 'ok', msg: `Huidig: ${cfg.teamName}` } : null);
  const [loading, setLoading] = useState(false);

  const loadTeams = async () => {
    setStatus(null); setLoading(true);
    try {
      const list = await fetchClubTeams(clubCode.trim());
      setTeams(list);
      if (!list.length) setStatus({ kind: 'err', msg: 'Geen teams gevonden voor deze clubcode.' });
    } catch (e) {
      setStatus({ kind: 'err', msg: e.message || 'Ophalen mislukt (offline?).' });
    } finally {
      setLoading(false);
    }
  };

  const save = (code) => {
    const t = teams.find(x => x.code === code);
    setTeamCode(code);
    setTeamConfig({ clubCode: clubCode.trim(), teamCode: code, teamName: t?.naam || '' });
    setStatus({ kind: 'ok', msg: `Opgeslagen: ${t?.naam || code}` });
  };

  return (
    <div>
      <div style={{ borderTop: '1px solid #e5e7eb', margin: '4px 0 16px' }} />
      <div style={{ color: '#374151', fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Mijn team (Nevobo)</div>
      <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 10 }}>Voor programma, uitslagen en de prognose. Clubcode van VCV = CKL9Y5O.</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input value={clubCode} onChange={e => setClubCode(e.target.value)} placeholder="Clubcode" style={{ ...box, flex: 1 }} />
        <button onClick={loadTeams} disabled={loading}
          style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 8, padding: '8px 12px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {loading ? '…' : 'Zoek'}
        </button>
      </div>
      {teams.length > 0 && (
        <select value={teamCode} onChange={e => save(e.target.value)} style={{ ...box, marginBottom: 10 }}>
          <option value="">— kies je team —</option>
          {teams.map(t => <option key={t.code} value={t.code}>{t.naam}</option>)}
        </select>
      )}
      {status && <div style={{ fontSize: 12, fontWeight: 600, color: status.kind === 'ok' ? '#059669' : '#dc2626' }}>{status.msg}</div>}
    </div>
  );
}
