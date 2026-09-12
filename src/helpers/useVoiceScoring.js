import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Handsfree scoren via spraak.
 *
 * - Native (Android APK): @capacitor-community/speech-recognition (Androids
 *   eigen SpeechRecognizer). Vraagt netjes microfoon-toestemming (RECORD_AUDIO)
 *   en luistert per commando, herstart daarna voor "continu" luisteren.
 * - Web (browser/dev): Web Speech API als fallback (werkt in Chrome).
 *
 * Herkende tekst gaat door parseCommand → scoreDirect/undoLastPoint.
 *
 * Commando's (voorbeelden):
 *   "aanval" / "thuis aanval"   → punt thuis, aanval
 *   "ace" / "blok" / "sideout" / "fout"
 *   "tegen aanval" / "uit ace"  → punt tegenstander
 *   "undo" / "terug"            → laatste punt terug
 */
function getRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

const TYPE_WORDS = [
  { type: 'direct', words: ['ace', 'aas'] },
  { type: 'block', words: ['blok', 'block'] },
  { type: 'attack', words: ['aanval', 'kill', 'smash'] },
  { type: 'sideout', words: ['sideout', 'side-out', 'side out'] },
  { type: 'error', words: ['fout', 'error'] },
];
const AWAY_WORDS = ['tegen', 'uit', 'zij', 'hun', 'tegenstander'];
const UNDO_WORDS = ['undo', 'terug', 'ongedaan', 'annuleer'];

/** Zet een herkende zin om in een score-/undo-commando (of null). */
export function parseCommand(text) {
  const t = (text || '').toLowerCase();
  if (UNDO_WORDS.some(w => t.includes(w))) return { action: 'undo' };
  const match = TYPE_WORDS.find(({ words }) => words.some(w => t.includes(w)));
  if (!match) return null;
  const team = AWAY_WORDS.some(w => t.includes(w)) ? 'away' : 'home';
  return { action: 'score', team, type: match.type };
}

/** Probeer meerdere hypotheses (helpt bij achtergrondgeluid); pak de eerste die parseert. */
function firstCommand(matches) {
  for (const m of matches || []) {
    const cmd = parseCommand(m);
    if (cmd) return { cmd, heard: m };
  }
  return { cmd: null, heard: (matches && matches[0]) || null };
}

export default function useVoiceScoring(state) {
  const isNative = Capacitor.isNativePlatform();
  const [supported] = useState(() => isNative || !!getRecognitionCtor());
  const [listening, setListening] = useState(false);
  const [lastHeard, setLastHeard] = useState(null);
  const [error, setError] = useState(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const activeRef = useRef(false); // stuurt de native luister-lus aan

  const apply = (cmd) => {
    const s = stateRef.current;
    if (cmd.action === 'undo') s.undoLastPoint();
    else if (cmd.action === 'score') s.scoreDirect(cmd.team, cmd.type);
  };

  useEffect(() => {
    if (!supported || !listening) return;

    // ── Native: Capacitor speech-recognition plugin ──────────────────────────
    if (isNative) {
      let cancelled = false;
      activeRef.current = true;

      (async () => {
        let SpeechRecognition;
        try {
          ({ SpeechRecognition } = await import('@capacitor-community/speech-recognition'));
        } catch {
          setError('Spraakherkenning niet beschikbaar op dit toestel.');
          setListening(false);
          return;
        }
        try {
          const perm = await SpeechRecognition.requestPermissions();
          if (perm.speechRecognition !== 'granted') {
            setError('Microfoon-toestemming geweigerd.');
            setListening(false);
            return;
          }
          const { available } = await SpeechRecognition.available();
          if (!available) {
            setError('Geen spraakherkenning-engine op dit toestel.');
            setListening(false);
            return;
          }
          setError(null);

          // Luister-lus: één uiting per keer, daarna herstarten voor continu.
          const loop = async () => {
            if (cancelled || !activeRef.current) return;
            try {
              const res = await SpeechRecognition.start({
                language: 'nl-NL', partialResults: false, popup: false, maxResults: 5,
              });
              const { cmd, heard } = firstCommand(res && res.matches);
              if (heard) setLastHeard(heard);
              if (cmd) apply(cmd);
            } catch {
              /* geen spraak / time-out; gewoon opnieuw proberen */
            }
            if (!cancelled && activeRef.current) setTimeout(loop, 250);
          };
          loop();
        } catch (e) {
          setError(e?.message || 'Spraakfout.');
          setListening(false);
        }
      })();

      return () => {
        cancelled = true;
        activeRef.current = false;
        import('@capacitor-community/speech-recognition')
          .then(({ SpeechRecognition }) => SpeechRecognition.stop().catch(() => {}))
          .catch(() => {});
      };
    }

    // ── Web: Web Speech API fallback ─────────────────────────────────────────
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = 'nl-NL';
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 5;

    rec.onresult = (e) => {
      const res = e.results[e.results.length - 1];
      if (!res || !res.isFinal) return;
      const alts = Array.from(res).map(a => a.transcript);
      const { cmd, heard } = firstCommand(alts);
      if (heard) setLastHeard(heard);
      if (cmd) apply(cmd);
    };
    rec.onend = () => { if (activeRef.current) { try { rec.start(); } catch { /* al gestart */ } } };
    rec.onerror = (ev) => { if (ev?.error === 'not-allowed') { setError('Microfoon-toestemming geweigerd.'); setListening(false); } };

    activeRef.current = true;
    try { rec.start(); } catch { /* al bezig */ }

    return () => {
      activeRef.current = false;
      try { rec.stop(); } catch { /* al gestopt */ }
    };
  }, [supported, listening, isNative]);

  return {
    supported,
    listening,
    lastHeard,
    error,
    toggle: () => { setError(null); setListening(v => !v); },
  };
}
