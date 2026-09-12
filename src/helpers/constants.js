import { UsersIcon, GridIcon, RefreshIcon, TrendingIcon, SeasonIcon, TargetIcon } from '../components/Icons';

export const getRoleLabel = (role) => {
  const map = { setter:'SPE', outside:'PL', middle:'MID', opposite:'DIA', libero:'L' };
  return map[role] || role?.toUpperCase().slice(0,3) || '?';
};

export const TABS = [
  ['players', UsersIcon, 'Spelers'],
  ['lineup', GridIcon, 'Opstelling'],
  ['subs', RefreshIcon, 'Wissels'],
  ['stats', TrendingIcon, 'Stats'],
  ['matches', GridIcon, 'Wedstrijden'],
  ['season', SeasonIcon, 'Seizoen'],
  ['prognose', TargetIcon, 'Prognose'],
];

export const shirtColors = { home:'#dc2626', away:'#2563eb', libero:'#475569' };

// Pro Mode constants
export const RECEPTION_QUALITY = ['A', 'B', 'C'];
export const RECEPTION_LABELS = { A: 'Perfect', B: 'OK', C: 'Slecht' };
export const ERROR_SUBTYPES = [
  { key: 'attack', label: 'Aanvalsfout' },
  { key: 'reception', label: 'Receptiefout' },
  { key: 'other', label: 'Overig' },
];
export const SERVE_ZONES = [5, 6, 1, 4, 3, 2]; // display order (top-left to bottom-right)
