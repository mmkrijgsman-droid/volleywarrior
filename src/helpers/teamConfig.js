/**
 * Eenvoudige opslag van "mijn team" (Nevobo): clubcode + teamcode + naam.
 * Gebruikt door de team-instelling, de fixture-picker en de prognose-tab.
 */
const KEYS = { club: 'vwClubCode', team: 'vwTeamCode', name: 'vwTeamName' };

export function getTeamConfig() {
  try {
    return {
      clubCode: localStorage.getItem(KEYS.club) || '',
      teamCode: localStorage.getItem(KEYS.team) || '',
      teamName: localStorage.getItem(KEYS.name) || '',
    };
  } catch {
    return { clubCode: '', teamCode: '', teamName: '' };
  }
}

export function setTeamConfig({ clubCode, teamCode, teamName }) {
  try {
    if (clubCode != null) localStorage.setItem(KEYS.club, clubCode);
    if (teamCode != null) localStorage.setItem(KEYS.team, teamCode);
    if (teamName != null) localStorage.setItem(KEYS.name, teamName);
  } catch { /* opslag geblokkeerd */ }
}
