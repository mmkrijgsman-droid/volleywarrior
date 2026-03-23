import { useState, useEffect } from 'react';
import { RECEPTION_QUALITY, RECEPTION_LABELS, ERROR_SUBTYPES, SERVE_ZONES } from '../helpers/constants';

const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:150 };

export default function ProPanel({ state }) {
  const { showProPanel, confirmProData, skipProPanel, homeLineup, players, homeColor } = state;
  const [receptionQuality, setReceptionQuality] = useState(null);
  const [receptionPlayerId, setReceptionPlayerId] = useState(null);
  const [errorSubtype, setErrorSubtype] = useState(null);
  const [serveZone, setServeZone] = useState(null);

  // Reset state when panel opens
  useEffect(() => {
    if (showProPanel) {
      setReceptionQuality(null);
      setReceptionPlayerId(null);
      setErrorSubtype(null);
      setServeZone(null);
    }
  }, [showProPanel]);

  if (!showProPanel) return null;

  const { isSideout, isError } = showProPanel;

  // Get on-court players for reception selection
  const onCourtPlayers = [1,2,3,4,5,6].map(pos => {
    let id = homeLineup[pos];
    if (homeLineup.libero) {
      const p = players.find(pl => pl.id === homeLineup[pos]);
      if (p?.role === 'middle' && (pos === 5 || pos === 6)) id = homeLineup.libero;
    }
    return players.find(p => p.id === id);
  }).filter(Boolean);

  const handleSave = () => {
    const data = {};
    if (receptionQuality) data.receptionQuality = receptionQuality;
    if (receptionPlayerId) data.receptionPlayerId = receptionPlayerId;
    if (errorSubtype) data.errorSubtype = errorSubtype;
    if (serveZone) data.serveZone = serveZone;
    confirmProData(data);
  };

  const btnStyle = (active, color = '#dc2626') => ({
    background: active ? `${color}18` : '#f3f4f6',
    color: active ? color : '#6b7280',
    border: `2px solid ${active ? color : '#e5e7eb'}`,
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <div style={overlay} onClick={skipProPanel}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#ffffff', border:'1px solid rgba(220,38,38,0.15)', borderRadius:20, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', maxWidth:320, width:'90%', padding:'20px 20px 16px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ background:'#dc2626', color:'#fff', borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:800, letterSpacing:1 }}>PRO</span>
            <span style={{ color:'#1e293b', fontSize:15, fontWeight:800 }}>Extra Data</span>
          </div>
          <button onClick={skipProPanel} style={{ background:'#f3f4f6', color:'#6b7280', border:'1px solid #e5e7eb', borderRadius:8, padding:'4px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            Sla over
          </button>
        </div>

        {/* Reception section — only for sideout */}
        {isSideout && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>Receptie kwaliteit</div>
            <div style={{ display:'flex', gap:8, marginBottom:10 }}>
              {RECEPTION_QUALITY.map(q => (
                <button key={q} onClick={() => setReceptionQuality(q)} style={{ ...btnStyle(receptionQuality === q), flex:1, textAlign:'center' }}>
                  <div style={{ fontSize:20, fontWeight:800 }}>{q}</div>
                  <div style={{ fontSize:10, fontWeight:500, marginTop:2 }}>{RECEPTION_LABELS[q]}</div>
                </button>
              ))}
            </div>

            <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>Ontvanger</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {onCourtPlayers.map(p => (
                <button key={p.id} onClick={() => setReceptionPlayerId(p.id)}
                  style={{ display:'flex', alignItems:'center', gap:4, background: receptionPlayerId === p.id ? `${homeColor}18` : '#f3f4f6', color: receptionPlayerId === p.id ? homeColor : '#374151', border: `2px solid ${receptionPlayerId === p.id ? homeColor : '#e5e7eb'}`, borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:12, fontWeight:700, transition:'all 0.15s' }}>
                  <span style={{ background: homeColor, color:'#fff', borderRadius:4, width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800 }}>{p.number}</span>
                  {p.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error subtype — only for errors */}
        {isError && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>Fouttype</div>
            <div style={{ display:'flex', gap:6 }}>
              {ERROR_SUBTYPES.map(({ key, label }) => (
                <button key={key} onClick={() => setErrorSubtype(key)} style={{ ...btnStyle(errorSubtype === key), flex:1, fontSize:12, padding:'10px 6px', textAlign:'center' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Serve zone — always shown, optional */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>Service zone <span style={{ color:'#9ca3af', fontWeight:500 }}>(optioneel)</span></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4, maxWidth:200, margin:'0 auto' }}>
            {SERVE_ZONES.map(zone => (
              <button key={zone} onClick={() => setServeZone(serveZone === zone ? null : zone)}
                style={{ ...btnStyle(serveZone === zone, '#2563eb'), padding:'12px 8px', textAlign:'center', fontSize:16, fontWeight:800 }}>
                {zone}
              </button>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button onClick={handleSave}
          style={{ width:'100%', background:'rgba(220,38,38,0.1)', color:'#dc2626', border:'1px solid rgba(220,38,38,0.3)', borderRadius:10, padding:12, fontWeight:700, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          Opslaan
        </button>
      </div>
    </div>
  );
}
