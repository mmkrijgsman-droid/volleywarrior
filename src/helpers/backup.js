import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Back-up en herstel van alle VolleyWarrior-gegevens.
 *
 * Alles staat client-side in localStorage; er is geen server. Deze module
 * bundelt die sleutels in één versioned JSON-bestand, zodat een heel seizoen
 * aan wedstrijden te bewaren en naar een ander toestel te verhuizen is.
 */

export const SCHEMA_VERSION = 1;

// Alle localStorage-sleutels die samen de app-staat vormen.
export const BACKUP_KEYS = [
  'volleyballMatches',
  'volleyballPlayers',
  'volleyballSettings',
  'volleyballTeamName',
  'volleyballTeamColors',
  'vwClubCode',
  'vwTeamCode',
  'vwTeamName',
];

function readKey(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    try { return JSON.parse(raw); } catch { return raw; } // rauwe string-waarde (bv. teamnaam)
  } catch {
    return null;
  }
}

/** Bouwt het back-up-object (envelope + data). */
export function buildBackup() {
  const data = {};
  for (const key of BACKUP_KEYS) {
    const val = readKey(key);
    if (val != null) data[key] = val;
  }
  return {
    app: 'VolleyWarrior',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

/** Korte samenvatting voor de UI: hoeveel wedstrijden/spelers zitten erin. */
export function summarize(backup) {
  const d = backup?.data || {};
  return {
    matches: Array.isArray(d.volleyballMatches) ? d.volleyballMatches.length : 0,
    players: Array.isArray(d.volleyballPlayers) ? d.volleyballPlayers.length : 0,
    teamName: typeof d.volleyballTeamName === 'string' ? d.volleyballTeamName : null,
  };
}

function backupFileName() {
  const stamp = new Date().toISOString().slice(0, 10);
  return `VolleyWarrior_backup_${stamp}.json`;
}

/**
 * Exporteert een back-up. Op native: schrijf naar cache + deel-dialoog.
 * Op web: download het bestand. Geeft de JSON-string terug (handig om ook
 * naar het klembord te kopiëren).
 */
export async function exportBackup() {
  const json = JSON.stringify(buildBackup(), null, 2);
  const fileName = backupFileName();

  if (Capacitor.isNativePlatform()) {
    const result = await Filesystem.writeFile({
      path: fileName,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    try {
      await Share.share({ title: fileName, url: result.uri, dialogTitle: 'Back-up opslaan / delen' });
    } catch { /* gebruiker annuleerde de deel-dialoog */ }
  } else {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  }
  return json;
}

/** Migreert een back-up-envelope naar het huidige schema. v1 = identiteit. */
function migrate(backup) {
  const b = backup;
  // Toekomstige migraties, bijvoorbeeld:
  //   if (b.schemaVersion < 2) { ...transformeer b.data...; b.schemaVersion = 2; }
  return b;
}

/**
 * Herstelt een back-up uit een JSON-string. Overschrijft de betrokken
 * localStorage-sleutels. Gooit bij ongeldige invoer. De aanroeper moet daarna
 * de app herladen zodat de nieuwe staat wordt ingelezen.
 */
export function importBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Ongeldige back-up: geen geldige JSON.');
  }
  if (!parsed || parsed.app !== 'VolleyWarrior' ||
      typeof parsed.schemaVersion !== 'number' ||
      typeof parsed.data !== 'object' || parsed.data == null) {
    throw new Error('Dit lijkt geen VolleyWarrior-back-up te zijn.');
  }
  if (parsed.schemaVersion > SCHEMA_VERSION) {
    throw new Error(`Back-up komt van een nieuwere versie (v${parsed.schemaVersion}). Werk de app bij.`);
  }

  const backup = migrate(parsed);
  const written = [];
  for (const key of BACKUP_KEYS) {
    if (key in backup.data) {
      const v = backup.data[key];
      localStorage.setItem(key, typeof v === 'string' ? v : JSON.stringify(v));
      written.push(key);
    }
  }
  localStorage.setItem('volleyballSchemaVersion', String(SCHEMA_VERSION));
  return { ...summarize(backup), written };
}
