import { useState } from 'react';
import { exportBackup, importBackup } from '../helpers/backup';

const btn = {
  flex: 1, borderRadius: 10, padding: '10px 12px', fontWeight: 700,
  cursor: 'pointer', fontSize: 13, border: '1px solid',
};

/**
 * Instellingen-sectie voor het exporteren en terugzetten van alle app-data.
 * Leest/schrijft localStorage rechtstreeks via helpers/backup.js; herlaadt de
 * app na een succesvol herstel zodat de nieuwe staat wordt ingelezen.
 */
export default function DataBackup() {
  const [importOpen, setImportOpen] = useState(false);
  const [text, setText] = useState('');
  const [status, setStatus] = useState(null); // { kind:'ok'|'err', msg }

  const doExport = async () => {
    setStatus(null);
    try {
      await exportBackup();
      setStatus({ kind: 'ok', msg: 'Back-up geëxporteerd.' });
    } catch (e) {
      setStatus({ kind: 'err', msg: e.message || 'Export mislukt.' });
    }
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ''));
    reader.readAsText(file);
  };

  const doImport = () => {
    setStatus(null);
    if (!text.trim()) {
      setStatus({ kind: 'err', msg: 'Plak eerst een back-up of kies een bestand.' });
      return;
    }
    if (!window.confirm('Dit overschrijft je huidige wedstrijden, spelers en instellingen. Doorgaan?')) return;
    let summary;
    try {
      summary = importBackup(text);
    } catch (e) {
      setStatus({ kind: 'err', msg: e.message || 'Herstel mislukt.' });
      return;
    }
    setStatus({ kind: 'ok', msg: `Hersteld: ${summary.matches} wedstrijden, ${summary.players} spelers. App wordt herladen…` });
    setTimeout(() => window.location.reload(), 900);
  };

  return (
    <div>
      <div style={{ borderTop: '1px solid #e5e7eb', margin: '4px 0 16px' }} />
      <div style={{ color: '#374151', fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Data &amp; back-up</div>
      <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 12 }}>
        Bewaar al je wedstrijden en spelers, of zet ze terug op een ander toestel.
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: importOpen ? 12 : 4 }}>
        <button onClick={doExport}
          style={{ ...btn, background: 'rgba(220,38,38,0.1)', color: '#dc2626', borderColor: 'rgba(220,38,38,0.25)' }}>
          Exporteren
        </button>
        <button onClick={() => { setImportOpen(v => !v); setStatus(null); }}
          style={{ ...btn, background: '#f3f4f6', color: '#374151', borderColor: '#e5e7eb' }}>
          {importOpen ? 'Annuleer herstel' : 'Herstellen'}
        </button>
      </div>

      {importOpen && (
        <div>
          <input type="file" accept="application/json,.json" onChange={onFile}
            style={{ fontSize: 12, marginBottom: 8, width: '100%' }} />
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="…of plak hier de inhoud van een back-up"
            style={{ width: '100%', minHeight: 70, fontSize: 11, fontFamily: 'monospace', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, boxSizing: 'border-box', resize: 'vertical' }} />
          <button onClick={doImport}
            style={{ ...btn, width: '100%', marginTop: 8, background: 'rgba(220,38,38,0.1)', color: '#dc2626', borderColor: 'rgba(220,38,38,0.3)' }}>
            Terugzetten
          </button>
        </div>
      )}

      {status && (
        <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: status.kind === 'ok' ? '#059669' : '#dc2626' }}>
          {status.msg}
        </div>
      )}
    </div>
  );
}
